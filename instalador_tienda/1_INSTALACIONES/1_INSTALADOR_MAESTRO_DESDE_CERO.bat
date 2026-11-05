@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion y Despliegue Maestro - Sistema POS Llanomio

cd /d "%~dp0..\.."
call "%CD%\INSTALADOR_MAESTRO_UNICO_POS.bat" %*
exit /b %errorlevel%
