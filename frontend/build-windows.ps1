# HomeMe Windows Build Script (PowerShell)
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "    HomeMe Windows Build Script     " -ForegroundColor Cyan  
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[✓] Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[✗] Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Yarn is installed
try {
    $yarnVersion = yarn --version
    Write-Host "[✓] Yarn detected: $yarnVersion" -ForegroundColor Green
} catch {
    Write-Host "[!] Yarn not found. Installing Yarn..." -ForegroundColor Yellow
    npm install -g yarn
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[✗] Failed to install Yarn" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "[1/4] Installing dependencies..." -ForegroundColor Blue
yarn install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Building React application..." -ForegroundColor Blue
yarn build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Failed to build React app" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3/4] Creating Windows installer..." -ForegroundColor Blue
yarn electron-dist
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Failed to create Windows installer" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[4/4] Build completed successfully! 🎉" -ForegroundColor Green
Write-Host ""
Write-Host "Your Windows installer is ready:" -ForegroundColor Cyan
Write-Host "Location: dist\HomeMe Setup 1.0.0.exe" -ForegroundColor Yellow
Write-Host ""
Write-Host "Installer features:" -ForegroundColor White
Write-Host "• Professional installation wizard" -ForegroundColor Gray
Write-Host "• Desktop shortcut creation" -ForegroundColor Gray
Write-Host "• Start menu integration" -ForegroundColor Gray
Write-Host "• Automatic uninstaller" -ForegroundColor Gray
Write-Host ""
Write-Host "You can now distribute this installer to users!" -ForegroundColor Green
Write-Host ""

# Ask if user wants to open the dist folder
$openFolder = Read-Host "Open dist folder? (y/n)"
if ($openFolder -eq "y" -or $openFolder -eq "Y") {
    if (Test-Path "dist") {
        explorer.exe "dist"
    }
}

Read-Host "Press Enter to exit"