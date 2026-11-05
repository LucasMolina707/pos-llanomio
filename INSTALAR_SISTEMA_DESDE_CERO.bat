@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion y Despliegue Maestro - POS Llanomio

cd /d "%~dp0"
call "%~dp0INSTALAR_Y_CONFIGURAR_DESDE_AQUI.bat" %*
exit /b %errorlevel%
