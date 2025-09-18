@echo off
echo ===================================
echo    HomeMe Windows Build Script
echo ===================================
echo.

echo [1/4] Installing dependencies...
call yarn install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building React application...
call yarn build
if errorlevel 1 (
    echo ERROR: Failed to build React app
    pause
    exit /b 1
)

echo.
echo [3/4] Creating Windows installer...
call yarn electron-dist
if errorlevel 1 (
    echo ERROR: Failed to create Windows installer
    pause
    exit /b 1
)

echo.
echo [4/4] Build completed successfully!
echo.
echo Your Windows installer is ready:
echo Location: dist\HomeMe Setup 1.0.0.exe
echo.
echo You can now distribute this installer to users.
echo Double-click the installer to test installation.
echo.
pause