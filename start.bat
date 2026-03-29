@echo off
title MediHelper — Smart Medicine Assistant
color 0B

echo.
echo  ============================================
echo    MediHelper — Smart Medicine Assistant
echo  ============================================
echo.

:: ─────────────────────────────────────────────
:: CHECK PREREQUISITES
:: ─────────────────────────────────────────────

echo  [1/6] Checking prerequisites...
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ERROR: Node.js is not installed!
    echo  Download it from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo    Node.js  : %NODE_VER%

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ERROR: npm is not installed!
    echo  It should come with Node.js. Reinstall Node.js.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo    npm      : v%NPM_VER%

:: Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ERROR: Python is not installed!
    echo  Download it from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do set PY_VER=%%v
echo    Python   : %PY_VER%

:: Check pip
where pip >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ERROR: pip is not installed!
    echo  It should come with Python. Reinstall Python and check "Add to PATH".
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('pip --version') do set PIP_VER=%%v
echo    pip      : %PIP_VER%

echo.
echo    All prerequisites found!
echo.

:: ─────────────────────────────────────────────
:: INSTALL BACKEND DEPENDENCIES
:: ─────────────────────────────────────────────

echo  [2/6] Installing backend dependencies...
echo.

cd /d "%~dp0backend"
pip install -r requirements.txt --quiet
if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo  ERROR: Failed to install Python dependencies!
    echo  Try running manually: cd backend ^& pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo    Backend dependencies installed!
echo.

:: ─────────────────────────────────────────────
:: SETUP ENVIRONMENT FILE
:: ─────────────────────────────────────────────

echo  [3/6] Checking environment config...

if not exist "%~dp0backend\.env" (
    echo    .env not found — creating from template...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    echo    Created backend\.env (using defaults^)
    echo.
    echo  ┌──────────────────────────────────────────────┐
    echo  │  NOTE: If you have MySQL, edit backend\.env  │
    echo  │  and set your MYSQL_PASSWORD.                │
    echo  │  Otherwise, SQLite will be used (no setup).  │
    echo  └──────────────────────────────────────────────┘
    echo.
) else (
    echo    backend\.env already exists — using existing config.
    echo.
)

:: ─────────────────────────────────────────────
:: INSTALL FRONTEND DEPENDENCIES
:: ─────────────────────────────────────────────

echo  [4/6] Installing frontend dependencies...
echo.

cd /d "%~dp0"
call npm install --silent
if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo  ERROR: Failed to install Node dependencies!
    echo  Try running manually: npm install
    echo.
    pause
    exit /b 1
)

echo.
echo    Frontend dependencies installed!
echo.

:: ─────────────────────────────────────────────
:: START BACKEND SERVER
:: ─────────────────────────────────────────────

echo  [5/6] Starting backend server...
echo.

cd /d "%~dp0backend"
start "MediHelper Backend" cmd /k "title MediHelper Backend (Flask) & color 0A & python app.py"

:: Wait for backend to initialize
echo    Waiting for backend to start...
timeout /t 4 /nobreak >nul

echo    Backend running at http://localhost:5000
echo.

:: ─────────────────────────────────────────────
:: START FRONTEND SERVER
:: ─────────────────────────────────────────────

echo  [6/6] Starting frontend server...
echo.

cd /d "%~dp0"
start "MediHelper Frontend" cmd /k "title MediHelper Frontend (Vite) & color 0E & npm run dev"

:: Wait for Vite to start
timeout /t 3 /nobreak >nul

echo    Frontend running at http://localhost:5173
echo.

:: ─────────────────────────────────────────────
:: OPEN BROWSER
:: ─────────────────────────────────────────────

timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

:: ─────────────────────────────────────────────
:: DONE
:: ─────────────────────────────────────────────

echo.
echo  ============================================
echo    MediHelper is running!
echo  ============================================
echo.
echo    Frontend : http://localhost:5173
echo    Backend  : http://localhost:5000
echo    Health   : http://localhost:5000/api/health
echo.
echo    Test Accounts (password: password123):
echo    Patient  : margaret@test.com
echo    Pharmacy : pharmacy@test.com
echo    Delivery : delivery@test.com
echo.
echo    Two server windows have been opened.
echo    Close them to stop the application.
echo.
echo  ============================================
echo.
pause
