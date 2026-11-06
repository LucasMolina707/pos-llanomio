@echo off
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
setlocal EnableExtensions EnableDelayedExpansion
title Terminal POS - Pantalla Completa
cd /d "%~dp0"
call "%~dp0instalador_tienda\2_INICIADORES_Y_ACTIVADORES\5_ABRIR_POS_PANTALLA_COMPLETA.bat"
exit /b 0
