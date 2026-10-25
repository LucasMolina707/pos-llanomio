@echo off
chcp 65001 > nul
title POS LLANOMIO - Mantenimiento y Optimizacion de Base de Datos
color 0A

echo ======================================================================
echo           SISTEMA POS LOCAL LLANOMIO - MANTENIMIENTO SQLITE
echo ======================================================================
echo.
echo Esta utilidad ejecutara:
echo   1. Verificacion de integridad fisica (PRAGMA integrity_check)
echo   2. Activacion de modo de alta concurrencia WAL (Write-Ahead Logging)
echo   3. Optimizacion de indices y planificador (PRAGMA optimize)
echo   4. Desfragmentacion y recuperacion de espacio (VACUUM)
echo.

cd /d "%~dp0\.."

npx tsx scripts/mantenimiento_db.ts

echo.
pause
