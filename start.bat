@echo off
title QuickMark Launcher

echo ==============================
echo   QuickMark Quick Start
echo ==============================
echo.

set MYSQL_PATH=D:\mysql\mysql-8.0.31-winx64\bin
set DB_USER=root
:: 密码从项目 .env 读取，不硬编码（.env 已在 .gitignore，不会进仓库）
cd /d "%~dp0"
if not exist ".env" (
    echo 错误: 找不到 .env 文件，请先在项目根目录创建（可参考 .env.example）
    pause
    exit /b 1
)
for /f "tokens=2 delims==" %%a in ('findstr /b "DB_PASSWORD=" .env') do set DB_PASS=%%a
if "%DB_PASS%"=="" (
    echo 错误: .env 里没有 DB_PASSWORD
    pause
    exit /b 1
)

:: Check if MySQL is already running
"%MYSQL_PATH%\mysql" -u%DB_USER% -p%DB_PASS% -e "SELECT 1" >nul 2>&1
if %errorlevel% equ 0 goto mysql_ready

:: Start MySQL in a separate window
echo [1/3] Starting MySQL (minimized)...
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

:: Start QuickMark backend (Express API on port 3000)
echo [2/3] Starting QuickMark backend...
cd /d "d:\vibeCoding\quickmark"
start "QuickMark-API" cmd /c "node server.js"

:: Wait 3 seconds for backend to init
timeout /t 3 /nobreak >nul

:: Start QuickMark frontend (Vite dev server on port 5173)
echo [3/3] Starting QuickMark frontend...
start "QuickMark" cmd /c "npm run dev"

echo.
echo ==============================
echo   QuickMark is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo ==============================
echo.
echo Close this window to stop both servers.
echo MySQL runs in its own window (minimized).
pause
