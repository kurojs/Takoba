$installDir = "$HOME\.local\share\raycast\extensions\takoba"

Write-Host "=== Installing Takoba for Raycast ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
  node --version | Out-Null
} catch {
  Write-Host "ERROR: Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
  exit 1
}

# Check git
try {
  git --version | Out-Null
} catch {
  Write-Host "ERROR: git is required." -ForegroundColor Red
  exit 1
}

if (Test-Path $installDir) {
  Write-Host "Updating existing installation..."
  Set-Location $installDir
  git pull --rebase
} else {
  Write-Host "Cloning Takoba..."
  New-Item -ItemType Directory -Path (Split-Path $installDir -Parent) -Force | Out-Null
  git clone https://github.com/kurojs/Takoba.git $installDir
  Set-Location $installDir
}

Write-Host ""
Write-Host "Installing dependencies..."
npm install

Write-Host ""
Write-Host "Building extension for Raycast..."
npm run build:raycast

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Takoba is installed at:" -ForegroundColor Green
Write-Host "   $installDir" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host " To register with Raycast, run:" -ForegroundColor Green
Write-Host "   cd $installDir && npx ray develop" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host " Or open Raycast -> 'Import Extension' ->" -ForegroundColor Green
Write-Host "   Select: $installDir" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
