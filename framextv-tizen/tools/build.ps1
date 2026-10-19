param(
    [Parameter(Mandatory=$true)][string]$Profile,
    [ValidateSet('1080p','2160p')][string]$Resolution = '1080p'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $projectRoot '.output\project'
$output = Join-Path $projectRoot '.output\packages'
if (-not (Get-Command tizen -ErrorAction SilentlyContinue)) {
    throw 'Tizen CLI not found. Add Tizen Studio tools\ide\bin to PATH.'
}
# Only recreate this script's generated staging directory; source files are untouched.
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage,$output | Out-Null
Get-ChildItem $output -Filter '*.wgt' | Remove-Item -Force
Copy-Item -Recurse (Join-Path $projectRoot 'app\*') $stage
[xml]$config = Get-Content -Raw (Join-Path $stage 'config.xml')
$ns = New-Object System.Xml.XmlNamespaceManager($config.NameTable)
$ns.AddNamespace('t','http://tizen.org/ns/widgets')
$meta = $config.SelectSingleNode('//t:metadata[@key="http://samsung.com/tv/metadata/screen.size"]',$ns)
$meta.SetAttribute('value', $(if ($Resolution -eq '2160p') { '3840x2160' } else { '1920x1080' }))
$config.Save((Join-Path $stage 'config.xml'))
& tizen build-web -- $stage
if ($LASTEXITCODE -ne 0) { throw 'Tizen Web build failed.' }
& tizen package -t wgt -s $Profile -o $output -- (Join-Path $stage '.buildResult')
if ($LASTEXITCODE -ne 0) { throw 'Signed WGT packaging failed. Check your Samsung TV certificate profile.' }
$packages = @(Get-ChildItem $output -Filter '*.wgt')
if ($packages.Count -eq 0) { throw 'Tizen CLI reported success but no WGT was produced.' }
$packages | Select-Object FullName,Length,LastWriteTime
Write-Host 'Signed package generated. Install the reported WGT on your authorized development TV using SDB/Tizen CLI.'
