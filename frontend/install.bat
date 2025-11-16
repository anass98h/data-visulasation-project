@echo off
echo Installing dependencies for CS2 Clustering Visualization...
echo.

cd /d "%~dp0"

if not exist "package.json" (
    echo Error: package.json not found!
    echo Please run this script from the frontend directory.
    pause
    exit /b 1
)

echo Running npm install...
echo.

npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Dependencies installed successfully!
    echo.
    echo You can now run the development server with: npm run dev
    echo.
) else (
    echo.
    echo ✗ Installation failed. Please check the errors above.
    echo.
    echo If you see PowerShell execution policy errors, try:
    echo 1. Using Command Prompt instead of PowerShell
    echo 2. Or run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    echo.
)

pause
