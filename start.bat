@echo off
title QuickMark Launcher

echo ==============================
echo   QuickMark Quick Start
echo ==============================
echo.

set MYSQL_PATH=D:\mysql\mysql-8.0.31-winx64\bin
set DB_USER=root
set DB_PASS=ayf147852369

:: Check if MySQL is already running
"%MYSQL_PATH%\mysql" -u%DB_USER% -p%DB_PASS% -e "SELECT 1" >nul 2>&1
if %errorlevel% equ 0 goto mysql_ready

:: Start MySQL in a separate window
echo [1/2] Starting MySQL (minimized)...
start /MIN "" "%MYSQL_PATH%\mysqld" --console

:: Wait up to 20 seconds
set wait_count=0
:wait_mysql
timeout /t 1 /nobreak >nul
set /a wait_count+=1
"%MYSQL_PATH%\mysql" -u%DB_USER% -p%DB_PASS% -e "SELECT 1" >nul 2>&1
if %errorlevel% equ 0 goto mysql_ready
if %wait_count% geq 20 (
    echo Failed to start MySQL. Is it installed at %MYSQL_PATH%?
    pause
    exit /b 1
)
goto wait_mysql

:mysql_ready
echo MySQL OK.

:: Start QuickMark frontend (Vite dev server)
echo [2/2] Starting QuickMark...
cd /d "d:\vibeCoding\quickmark"
start "QuickMark" cmd /c "npm run dev"

echo.
echo ==============================
echo   QuickMark is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo ==============================
echo.
echo Close this window to stop the frontend server.
echo MySQL runs in its own window (minimized).
pause
