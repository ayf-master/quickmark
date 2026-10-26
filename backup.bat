@echo off
title QuickMark 数据库备份

set MYSQL_PATH=D:\mysql\mysql-8.0.31-winx64\bin
set DB_USER=root
:: 密码从项目 .env 读取，不硬编码（.env 已在 .gitignore，不会进仓库）
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
set DB_NAME=quickmark

:: 备份目录（在项目外面，防止项目被删时备份也没了）
set BACKUP_DIR=D:\quickmark-backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: 文件名带日期
set FILENAME=quickmark_%date:~0,4%%date:~5,2%%date:~8,2%.sql

echo ==============================
echo   QuickMark 数据库备份
echo   备份到: %BACKUP_DIR%\%FILENAME%
echo ==============================

"%MYSQL_PATH%\mysqldump" -u%DB_USER% -p%DB_PASS% %DB_NAME% > "%BACKUP_DIR%\%FILENAME%"

if %errorlevel% equ 0 (
    echo ✓ 备份成功！文件：%BACKUP_DIR%\%FILENAME%
    echo   文件大小：
    dir "%BACKUP_DIR%\%FILENAME%" | findstr "%FILENAME%"
) else (
    echo ✗ 备份失败
)

echo.
echo 历史备份文件：
dir /b /o-d "%BACKUP_DIR%\*.sql" 2>nul
echo.
pause
