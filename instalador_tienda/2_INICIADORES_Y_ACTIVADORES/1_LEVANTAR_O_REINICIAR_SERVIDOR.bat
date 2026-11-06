@echo off
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
setlocal EnableExtensions EnableDelayedExpansion
title Levantar o Reiniciar Servidor POS - POS Llanomio

cd /d "%~dp0..\.."
call "%CD%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat" %*
exit /b %errorlevel%
