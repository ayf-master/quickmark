@echo off
title QuickMark Stopper

echo Stopping QuickMark...
taskkill /f /fi "WINDOWTITLE eq QuickMark" >nul 2>&1
echo QuickMark stopped.

echo Stopping MySQL...
taskkill /f /im mysqld.exe >nul 2>&1
echo MySQL stopped.

echo.
echo All stopped.
pause
