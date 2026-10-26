@echo off
chcp 65001 > nul
title POS LLANOMIO - Configuracion de Puertos de Red y Servidor Web
color 0B

cd /d "%~dp0\.."

echo ======================================================================
echo           SISTEMA POS LOCAL LLANOMIO - CONFIGURACION DE RED
echo ======================================================================
echo.

:: 1. Ejecutar el asistente interactivo de puertos
call node scripts/verificar-puertos.js --interactivo

:: 2. Si PM2 está activo, reiniciar los servicios para aplicar los nuevos puertos
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo [PM2] Aplicando nuevos puertos a los servicios activos...
    call pm2 restart ecosystem.config.js >nul 2>nul
    call pm2 save >nul 2>nul
    echo [OK] Servicios reiniciados con los nuevos puertos.
)

echo.
echo Presione cualquier tecla para salir...
pause >nul
