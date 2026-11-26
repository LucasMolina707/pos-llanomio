@echo off
setlocal EnableDelayedExpansion
title INSTALADOR PORTABLE - POS LLANOMIO

call "%~dp0portable-windows\Instalar_Servicio_Automatico.bat" %*
exit /b %errorlevel%
