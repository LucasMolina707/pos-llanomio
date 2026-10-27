@echo off
chcp 65001 > nul
title POS LLANOMIO - Mantenimiento y Optimizacion SQLite
color 0A

cd /d "%~dp0..\.."

echo ===============================================================================
echo        SISTEMA POS LOCAL LLANOMIO - MANTENIMIENTO Y VACUUM DE SQLITE
echo ===============================================================================
echo.
echo Ejecutando verificacion de integridad fisica, optimizacion de WAL y compactacion...
echo.

call npm run db:vacuum

echo.
pause
