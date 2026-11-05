@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Levantar o Reiniciar Servidor POS - POS Llanomio

cd /d "%~dp0..\.."
call "%CD%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat" %*
exit /b %errorlevel%
