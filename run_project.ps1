Set-Location $PSScriptRoot

# Start backend
Write-Host "Starting TubeIntel AI Backend (FastAPI on Port 8000)..." -ForegroundColor Green
$pythonPath = ".\venv\Scripts\python"
if (Test-Path ".\backend\venv\Scripts\python.exe") {
    $pythonPath = ".\backend\venv\Scripts\python"
}

# Start backend in a background process
Start-Process -FilePath $pythonPath -ArgumentList "backend/run.py" -WorkingDirectory $PSScriptRoot

# Start frontend
Write-Host "Starting TubeIntel AI Frontend (Next.js)..." -ForegroundColor Green
Set-Location .\frontend
npm run dev
