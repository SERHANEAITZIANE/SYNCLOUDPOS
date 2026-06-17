Set-Location "C:\Users\tre\Documents\SYNCLOUDPOS"
$ErrorActionPreference = 'Continue'
& cmd /c "npm run build > build_run_check.log 2>&1"
$code = $LASTEXITCODE
Add-Content -Path "build_run_check.log" -Value ("BUILD_EXIT_CODE=" + $code)
if ($code -eq 0) { Write-Output "RESULT=SUCCESS" } else { Write-Output ("RESULT=FAIL EXIT=" + $code) }
