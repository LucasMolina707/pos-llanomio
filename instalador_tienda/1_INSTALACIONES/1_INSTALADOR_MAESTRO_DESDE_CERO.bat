@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion y Despliegue Maestro - Sistema POS Llanomio

cd /d "%~dp0..\.."
call "%CD%\INSTALAR_Y_CONFIGURAR_DESDE_AQUI.bat" %*
exit /b %errorlevel%
