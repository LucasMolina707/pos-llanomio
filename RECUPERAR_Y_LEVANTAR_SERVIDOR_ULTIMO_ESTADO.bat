@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Recuperar y Levantar Servidor en Ultimo Estado - POS Llanomio
cd /d "%~dp0"
call "%~dp0INICIAR_O_RECUPERAR_SERVIDOR_POS.bat" %*
exit /b %errorlevel%
