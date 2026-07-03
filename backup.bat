@echo off
title QuickMark 数据库备份

set MYSQL_PATH=D:\mysql\mysql-8.0.31-winx64\bin
set DB_USER=root
set DB_PASS=ayf147852369
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
