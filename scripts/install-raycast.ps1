$REPO = "kurojs/Takoba"
$installDir = "$env:APPDATA\Raycast\extensions\takoba"

Write-Host "=== Installing Takoba for Raycast ===" -ForegroundColor Cyan
Write-Host ""

# Try Scoop first
if (Get-Command scoop -ErrorAction SilentlyContinue) {
  scoop bucket add kurojs https://github.com/kurojs/scoop-bucket 2>$null
  scoop install takoba
  exit
}

Write-Host "Downloading latest release..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest"
$zipUrl = "https://github.com/$REPO/releases/download/$($release.tag_name)/takoba-raycast.zip"
$zipPath = "$env:TEMP\takoba-raycast.zip"
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

if (-not (Test-Path $installDir)) {
  New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}
Expand-Archive -Path $zipPath -DestinationPath $installDir -Force
Remove-Item $zipPath

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Takoba installed at:" -ForegroundColor Green
Write-Host "   $installDir" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host " Register it:" -ForegroundColor Green
Write-Host "   cd $installDir && npx ray develop" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
