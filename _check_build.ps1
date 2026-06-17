$ErrorActionPreference = 'SilentlyContinue'
$procs = Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'next build' -or $_.CommandLine -match 'next-build' }
if ($procs) {
    foreach ($p in $procs) { Write-Output ("BUILD_RUNNING PID=" + $p.ProcessId) }
} else {
    Write-Output "NO_BUILD_RUNNING"
}
Write-Output "---NEWEST---"
Get-ChildItem -File *.log,*.txt | Sort-Object LastWriteTime -Descending | Select-Object -First 6 | ForEach-Object { Write-Output ($_.LastWriteTime.ToString('s') + "  " + $_.Length + "  " + $_.Name) }
