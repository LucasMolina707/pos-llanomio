@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion y Despliegue Maestro - POS Llanomio

cd /d "%~dp0"
call "%~dp0INSTALADOR_MAESTRO_UNICO_POS.bat" %*
exit /b %errorlevel%
