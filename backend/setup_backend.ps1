Set-Location $PSScriptRoot
Write-Host "Setting up Python Virtual Environment for TubeIntel AI..." -ForegroundColor Green
if (-not (Test-Path venv)) {
    py -m venv venv
}
Write-Host "Activating virtual environment..." -ForegroundColor Green
.\venv\Scripts\Activate.ps1
Write-Host "Installing backend dependencies from requirements.txt..." -ForegroundColor Green
py -m pip install -r requirements.txt
Write-Host "Setup completed! Run './venv/Scripts/python run.py' to start the server." -ForegroundColor Green
