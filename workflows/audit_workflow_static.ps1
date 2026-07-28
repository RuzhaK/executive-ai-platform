$ErrorActionPreference = 'Stop'
$path = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'Executive-Job-CRM-v1.1-DEV.json'
$wf = Get-Content -Raw -Path $path | ConvertFrom-Json

$nodeNames = @()
$nodeIds = @()
$idToName = @{}
$nameToId = @{}
foreach ($n in $wf.nodes) {
  $nodeNames += $n.name
  $nodeIds += $n.id
  $idToName[$n.id] = $n.name
  $nameToId[$n.name] = $n.id
}

$dupNames = $nodeNames | Group-Object | Where-Object { $_.Count -gt 1 }
$dupIds = $nodeIds | Group-Object | Where-Object { $_.Count -gt 1 }

$allNodeNames = [System.Collections.Generic.HashSet[string]]::new([string[]]$nodeNames)
$referenced = [System.Collections.Generic.HashSet[string]]::new()
$outgoing = @{}
$incoming = @{}

foreach ($name in $nodeNames) {
  $outgoing[$name] = @()
  $incoming[$name] = @()
}

$connObj = $wf.connections
if ($connObj -is [hashtable]) {
  $connProps = $connObj.GetEnumerator()
} else {
  $connProps = $connObj.PSObject.Properties
}

foreach ($prop in $connProps) {
  $source = $prop.Name
  if (-not $source) { continue }
  [void]$referenced.Add($source)
  $main = $prop.Value.main
  if (-not $main) { continue }
  for ($bi = 0; $bi -lt $main.Count; $bi++) {
    $branch = $main[$bi]
    if (-not $branch) { continue }
    foreach ($edge in $branch) {
      $target = $edge.node
      [void]$referenced.Add($target)
      $outgoing[$source] += [pscustomobject]@{ branch = $bi; target = $target; index = $edge.index }
      $incoming[$target] += [pscustomobject]@{ branch = $bi; source = $source; index = $edge.index }
    }
  }
}

$missingRefs = @()
foreach ($prop in $connProps) {
  $main = $prop.Value.main
  if (-not $main) { continue }
  foreach ($branch in $main) {
    if (-not $branch) { continue }
    foreach ($edge in $branch) {
      if ($edge.node -and -not $allNodeNames.Contains($edge.node)) {
        $missingRefs += $edge.node
      }
    }
  }
}

$triggers = @('Gmail - Job Alerts Trigger')
$reachable = [System.Collections.Generic.HashSet[string]]::new()
$queue = [System.Collections.Generic.Queue[string]]::new()
foreach ($t in $triggers) { $queue.Enqueue($t) }
while ($queue.Count -gt 0) {
  $cur = $queue.Dequeue()
  if (-not $reachable.Add($cur)) { continue }
  foreach ($e in $outgoing[$cur]) {
    if ($e.target) { $queue.Enqueue($e.target) }
  }
}

$unreachable = $nodeNames | Where-Object { -not $reachable.Contains($_) }

$orphans = @()
foreach ($name in $nodeNames) {
  $hasIn = ($incoming[$name].Count -gt 0)
  $hasOut = ($outgoing[$name].Count -gt 0)
  $isTrigger = $triggers -contains $name
  if (-not $hasIn -and -not $hasOut -and -not $isTrigger) { $orphans += $name }
  elseif (-not $hasIn -and -not $isTrigger -and $name -ne 'Merge Final Records') {
    # nodes with only outgoing are OK if reachable; flag if no incoming and not trigger
  }
}

# nodes in graph but never targeted and never source except listed
$noIncomingNonTrigger = $nodeNames | Where-Object {
  $incoming[$_].Count -eq 0 -and $triggers -notcontains $_
}

$noOutgoing = $nodeNames | Where-Object { $outgoing[$_].Count -eq 0 }

# Specific path checks
function Get-Targets($source, $branch) {
  return @($outgoing[$source] | Where-Object { $_.branch -eq $branch } | ForEach-Object { $_.target })
}

$pathChecks = @{}
$pathChecks['Extract->CheckPostingClosed'] = (Get-Targets 'Extract LinkedIn Job Description' 0) -contains 'Check Posting Closed'
$pathChecks['ClosedTRUE->BuildClosedReject'] = (Get-Targets 'Check Posting Closed' 0) -contains 'Build Closed Posting Reject Record'
$pathChecks['ClosedFALSE->PrePF'] = (Get-Targets 'Check Posting Closed' 1) -contains 'Pre-PF Eligibility Gate'
$pathChecks['PrePF->CheckPrePF'] = (Get-Targets 'Pre-PF Eligibility Gate' 0) -contains 'Check Pre-PF Eligibility'
$pathChecks['PrePFTRUE->BuildPrePFReject'] = (Get-Targets 'Check Pre-PF Eligibility' 0) -contains 'Build Pre-PF Eligibility Reject Record'
$pathChecks['PrePFFALSE->AI-PF'] = (Get-Targets 'Check Pre-PF Eligibility' 1) -contains 'AI - Professional Fit'
$pathChecks['BuildClosedReject->Merge'] = (Get-Targets 'Build Closed Posting Reject Record' 0) -contains 'Merge Final Records'
$pathChecks['BuildPrePFReject->Merge'] = (Get-Targets 'Build Pre-PF Eligibility Reject Record' 0) -contains 'Merge Final Records'
$pathChecks['AI-PF->NormalizePF'] = (Get-Targets 'AI - Professional Fit' 0) -contains 'Normalize Professional Fit'
$pathChecks['NormalizePF->MandatoryTravel'] = (Get-Targets 'Normalize Professional Fit' 0) -contains 'Mandatory Travel Gate'
$pathChecks['NormalizeVerified->VerifiedAI'] = $false
$pathChecks['VerifiedAI exists'] = $nodeNames -contains 'AI - Verified Review'

# trace PF to Verified AI
$pfChain = @()
$cur = 'AI - Professional Fit'
$seen = @{}
for ($i = 0; $i -lt 20; $i++) {
  $pfChain += $cur
  $seen[$cur] = $true
  $next = (Get-Targets $cur 0 | Select-Object -First 1)
  if (-not $next -or $seen.ContainsKey($next)) { break }
  $cur = $next
}
$pathChecks['PF chain reaches Verified AI'] = ($pfChain -contains 'AI - Verified Review') -or ($pfChain -contains 'Normalize Verified Review')

# Merge -> Normalize -> Gate -> Append
$pathChecks['Merge->NormalizeOutput'] = (Get-Targets 'Merge Final Records' 0) -contains 'Normalize Output Record'
$pathChecks['NormalizeOutput->GateAppend'] = (Get-Targets 'Normalize Output Record' 0) -contains 'Gate Append to CRM Sheet'
$pathChecks['GateAppend->Append'] = (Get-Targets 'Gate Append to CRM Sheet' 0) -contains 'Append to Google Sheets'

# Reject paths to Merge
$rejectBuilders = @(
  'Build Language Title Reject Record',
  'Build Preview Reject Record',
  'Build Reject Record',
  'Build Verified Score Reject Record',
  'Build No Job Card Record',
  'Build Closed Posting Reject Record',
  'Build Mandatory Travel Reject Record',
  'Build Mandatory Domain Reject Record',
  'Build Mandatory Language Reject Record',
  'Build No URL Preview Only Record',
  'Build Country List Remote Reject Record',
  'Build Pre-PF Eligibility Reject Record'
)
$rejectToMerge = @{}
foreach ($rb in $rejectBuilders) {
  $rejectToMerge[$rb] = (Get-Targets $rb 0) -contains 'Merge Final Records'
}

# IF nodes branch termination
$ifNodes = $wf.nodes | Where-Object { $_.type -like '*if*' }
$ifBranchIssues = @()
foreach ($ifn in $ifNodes) {
  $outs = $outgoing[$ifn.name]
  $br0 = @($outs | Where-Object { $_.branch -eq 0 })
  $br1 = @($outs | Where-Object { $_.branch -eq 1 })
  if ($br0.Count -eq 0) { $ifBranchIssues += "$($ifn.name): TRUE branch empty" }
  if ($br1.Count -eq 0) { $ifBranchIssues += "$($ifn.name): FALSE branch empty" }
}

# Expression audit
$badExprs = @()
$prePfIf = $wf.nodes | Where-Object { $_.name -eq 'Check Pre-PF Eligibility' } | Select-Object -First 1
if ($prePfIf) {
  $lv = $prePfIf.parameters.conditions.conditions[0].leftValue
  if ($lv -ne '={{$json.PrePfEligibilityBlocked}}') {
    $badExprs += "Check Pre-PF Eligibility leftValue=$lv"
  }
}
foreach ($n in $wf.nodes) {
  $raw = ($n | ConvertTo-Json -Depth 20 -Compress)
  if ($raw -match '\{\{\.PrePfEligibilityBlocked\}\}') {
    $badExprs += "$($n.name): dangling .PrePfEligibilityBlocked"
  }
  if ($raw -match '\$\(\s*''[^'']+''\s*\)' ) { }
}

# Normalize output reason codes
$normNode = $wf.nodes | Where-Object { $_.name -eq 'Normalize Output Record' } | Select-Object -First 1
$normCode = $normNode.parameters.jsCode
$expectedReasons = @('CLOSED_POSTING','MANDATORY_LANGUAGE','WORK_AUTHORIZATION_REQUIRED','COUNTRY_RESIDENCY_REQUIRED','COUNTRY_REMOTE_ONLY')
$reasonChecks = @{}
foreach ($r in $expectedReasons) {
  $reasonChecks[$r] = $normCode.Contains($r)
}

# Build reject record auto_reject_reason
$rejectNodes = @{
  'Build Closed Posting Reject Record' = 'CLOSED_POSTING'
  'Build Pre-PF Eligibility Reject Record' = 'WORK_AUTHORIZATION_REQUIRED'
  'Build Mandatory Language Reject Record' = 'MANDATORY_LANGUAGE'
}
$rejectCodeChecks = @{}
foreach ($k in $rejectNodes.Keys) {
  $rn = $wf.nodes | Where-Object { $_.name -eq $k } | Select-Object -First 1
  if ($rn) { $rejectCodeChecks[$k] = $rn.parameters.jsCode }
}

# Pre-PF new nodes connection count
$newNodes = @('Pre-PF Eligibility Gate','Check Pre-PF Eligibility','Build Pre-PF Eligibility Reject Record')
$newNodeConn = @{}
foreach ($nn in $newNodes) {
  $newNodeConn[$nn] = [pscustomobject]@{
    incoming = $incoming[$nn].Count
    outgoing = $outgoing[$nn].Count
    inFrom = ($incoming[$nn] | ForEach-Object { $_.source }) -join ','
    outTo = ($outgoing[$nn] | ForEach-Object { "$($_.target)[b$($_.branch)]" }) -join ','
  }
}

# Append sheet mapping - check node exists and has column mappings
$appendNode = $wf.nodes | Where-Object { $_.name -eq 'Append to Google Sheets' } | Select-Object -First 1
$appendCols = @()
if ($appendNode.parameters.columns) {
  $appendCols = @($appendNode.parameters.columns.value.PSObject.Properties.Name)
}

Write-Host '=== STATIC WORKFLOW AUDIT ==='
Write-Host "Nodes: $($nodeNames.Count)"
Write-Host "Duplicate names: $(if ($dupNames) { ($dupNames | ForEach-Object { $_.Name }) -join ', ' } else { 'none' })"
Write-Host "Duplicate IDs: $(if ($dupIds) { ($dupIds | ForEach-Object { $_.Name }) -join ', ' } else { 'none' })"
Write-Host "Missing node refs: $(if ($missingRefs) { ($missingRefs | Sort-Object -Unique) -join ', ' } else { 'none' })"
Write-Host "Orphans (no in/out): $(if ($orphans) { $orphans -join ', ' } else { 'none' })"
Write-Host "Unreachable from trigger: $(if ($unreachable) { $unreachable -join ', ' } else { 'none' })"
Write-Host "No incoming (non-trigger): $(($noIncomingNonTrigger | Sort-Object) -join ', ')"
Write-Host "No outgoing (terminals): $(($noOutgoing | Sort-Object) -join ', ')"
Write-Host ''
Write-Host '--- Path checks ---'
foreach ($k in $pathChecks.Keys | Sort-Object) {
  Write-Host "$k : $($pathChecks[$k])"
}
Write-Host "PF chain: $($pfChain -join ' -> ')"
Write-Host ''
Write-Host '--- Reject -> Merge ---'
foreach ($k in $rejectToMerge.Keys | Sort-Object) {
  Write-Host "$k : $($rejectToMerge[$k])"
}
Write-Host ''
Write-Host '--- IF branch issues ---'
if ($ifBranchIssues) { $ifBranchIssues | ForEach-Object { Write-Host $_ } } else { Write-Host 'none' }
Write-Host ''
Write-Host '--- Expressions ---'
if ($badExprs) { $badExprs | ForEach-Object { Write-Host $_ } } else { Write-Host 'none flagged' }
Write-Host ''
Write-Host '--- Normalize reason codes present ---'
foreach ($k in $reasonChecks.Keys | Sort-Object) { Write-Host "$k : $($reasonChecks[$k])" }
Write-Host ''
Write-Host '--- New node connections ---'
foreach ($k in $newNodes) {
  $c = $newNodeConn[$k]
  Write-Host "$k : in=$($c.incoming) out=$($c.outgoing) | from=$($c.inFrom) | to=$($c.outTo)"
}
Write-Host ''
Write-Host "Append to Google Sheets column count: $($appendCols.Count)"
Write-Host "Append has auto_reject_reason mapping: $($appendCols -contains 'auto_reject_reason')"
