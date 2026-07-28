$wf = Get-Content (Join-Path $PSScriptRoot 'Executive-Job-CRM-v1.1-DEV.json') -Raw | ConvertFrom-Json
$code = ($wf.nodes | Where-Object { $_.name -eq 'Normalize Output Record' }).parameters.jsCode
$idx = $code.IndexOf('MANDATORY_TRAVEL')
Write-Host $code.Substring([Math]::Max(0,$idx-120), [Math]::Min(800, $code.Length - [Math]::Max(0,$idx-120)))
