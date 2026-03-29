@echo off
echo.
echo  HireIQ - AI Interview Platform
echo  ================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.11+ from python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

:: Backend
echo Setting up backend...
cd backend

if not exist ".env" (
    copy .env.example .env
    echo.
    echo  Please edit backend\.env and add your GROQ_API_KEY
    echo  Get a free key at: https://console.groq.com
    echo.
    pause
)

if not exist "venv" (
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -q -r requirements.txt
echo Backend dependencies installed

:: Start backend in new window
start "HireIQ Backend" cmd /k "venv\Scripts\activate && uvicorn main:app --port 8000 --reload"
echo Backend starting on http://localhost:8000

cd ..\frontend

:: Frontend
echo.
echo Setting up frontend...
if not exist "node_modules" (
    call npm install --silent
)
echo Frontend dependencies installed

echo.
echo Starting HireIQ at http://localhost:3000
echo.
call npm start
