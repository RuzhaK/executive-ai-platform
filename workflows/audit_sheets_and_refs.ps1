$curPath = Join-Path $PSScriptRoot 'Executive-Job-CRM-v1.1-DEV.json'
$cur = Get-Content -Raw -Path $curPath | ConvertFrom-Json
$headJson = git -C (Split-Path $PSScriptRoot -Parent) show HEAD:workflows/Executive-Job-CRM-v1.1-DEV.json 2>$null
if (-not $headJson) { Write-Host 'HEAD unavailable'; exit 1 }
$head = $headJson | ConvertFrom-Json

function Get-AppendCols($wf) {
  $n = $wf.nodes | Where-Object { $_.name -eq 'Append to Google Sheets' } | Select-Object -First 1
  return @($n.parameters.columns.value.PSObject.Properties.Name | Sort-Object)
}

$curCols = Get-AppendCols $cur
$headCols = Get-AppendCols $head
$onlyCur = Compare-Object $headCols $curCols | Where-Object { $_.SideIndicator -eq '=>' }
$onlyHead = Compare-Object $headCols $curCols | Where-Object { $_.SideIndicator -eq '<=' }

Write-Host "HEAD columns: $($headCols.Count)"
Write-Host "CUR columns: $($curCols.Count)"
Write-Host "Added: $(if ($onlyCur) { ($onlyCur.InputObject) -join ', ' } else { 'none' })"
Write-Host "Removed: $(if ($onlyHead) { ($onlyHead.InputObject) -join ', ' } else { 'none' })"

# Check $('NodeName') references in jsCode
$allNames = [System.Collections.Generic.HashSet[string]]::new([string[]]($cur.nodes | ForEach-Object { $_.name }))
$dangling = @()
foreach ($n in $cur.nodes) {
  $code = ''
  if ($n.parameters.jsCode) { $code = $n.parameters.jsCode }
  if ($n.parameters.responses) { $code += ($n.parameters.responses | ConvertTo-Json -Compress) }
  $matches = [regex]::Matches($code, "\$\('([^']+)'\)")
  foreach ($m in $matches) {
    $ref = $m.Groups[1].Value
    if (-not $allNames.Contains($ref)) { $dangling += "$($n.name) -> $ref" }
  }
}
Write-Host "Dangling `$('Node') refs: $(if ($dangling) { ($dangling | Sort-Object -Unique) -join '; ' } else { 'none' })"

# Pre-PF reject uses auto_reject_reason from gate
$prePfReject = ($cur.nodes | Where-Object { $_.name -eq 'Build Pre-PF Eligibility Reject Record' }).parameters.jsCode
Write-Host "Pre-PF reject uses gate auto_reject_reason: $($prePfReject -match 'auto_reject_reason.*PrePfEligibilityGate')"

# Mandatory language post-PF still has Check Mandatory Language IF - risk: could still reject if MandatoryLanguageBlocked true
# But Mandatory Language Gate sets blocked false - Check Mandatory Language reads MandatoryLanguageBlocked from item
$checkML = $cur.nodes | Where-Object { $_.name -eq 'Check Mandatory Language' } | Select-Object -First 1
Write-Host "Check Mandatory Language IF: $($checkML.parameters.conditions.conditions[0].leftValue)"

$headNorm = ($head.nodes | Where-Object { $_.name -eq 'Normalize Output Record' }).parameters.jsCode
$curNorm = ($cur.nodes | Where-Object { $_.name -eq 'Normalize Output Record' }).parameters.jsCode
Write-Host "Normalize code identical to HEAD: $($headNorm -eq $curNorm)"
if ($headNorm -ne $curNorm) {
  Write-Host "Normalize length HEAD=$($headNorm.Length) CUR=$($curNorm.Length)"
  $added = @('WORK_AUTHORIZATION_REQUIRED','COUNTRY_RESIDENCY_REQUIRED','COUNTRY_REMOTE_ONLY')
  foreach ($a in $added) {
    Write-Host "  $a in CUR terminal list: $($curNorm.Contains($a))"
    Write-Host "  $a in HEAD terminal list: $($headNorm.Contains($a))"
  }
}

# Success path BFS from AI-PF FALSE to Verified AI
$out = @{}
foreach ($prop in $cur.connections.PSObject.Properties) {
  $src = $prop.Name
  $out[$src] = @()
  $main = $prop.Value.main
  if ($main) {
    for ($i=0; $i -lt $main.Count; $i++) {
      foreach ($e in $main[$i]) { $out[$src] += [pscustomobject]@{ b=$i; t=$e.node } }
    }
  }
}
function Walk-SuccessFromPf($start) {
  $path = @($start)
  $cur = $start
  for ($i=0; $i -lt 25; $i++) {
    $edges = @($out[$cur])
    if (-not $edges -or $edges.Count -eq 0) { break }
    $pick = $null
    if ($cur -like 'Check *') {
      $pick = $edges | Where-Object { $_.b -eq 1 } | Select-Object -First 1
    }
    if (-not $pick) { $pick = $edges | Where-Object { $_.b -eq 0 } | Select-Object -First 1 }
    if (-not $pick -or -not $pick.t) { break }
    $cur = $pick.t
    if ($path -contains $cur) { break }
    $path += $cur
  }
  return $path
}
$successPf = Walk-SuccessFromPf 'AI - Professional Fit'
Write-Host "Success PF path (FALSE branches where applicable): $($successPf -join ' -> ')"
Write-Host "Reaches AI - Verified Review: $($successPf -contains 'AI - Verified Review')"

