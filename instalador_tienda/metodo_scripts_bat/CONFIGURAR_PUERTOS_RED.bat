@echo off
chcp 65001 > nul
title POS LLANOMIO - Configuracion y Seleccion de Puertos de Red
color 0B

cd /d "%~dp0..\.."

echo ===============================================================================
echo        SISTEMA POS LOCAL LLANOMIO - ESCANEO Y CONFIGURACION DE PUERTOS
echo ===============================================================================
echo.

:: 1. Ejecutar el asistente interactivo de puertos
if exist "scripts\escanear-y-elegir-puertos.js" (
    call node scripts\escanear-y-elegir-puertos.js
) else (
    call node "%~dp0escanear-y-elegir-puertos.js"
)

:: 2. Si PM2 esta activo, reiniciar los servicios para aplicar los nuevos puertos
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo.
    echo [PM2] Aplicando nuevos puertos a los servicios activos...
    call pm2 restart ecosystem.config.js >nul 2>nul
    call pm2 save >nul 2>nul
    echo [OK] Servicios reiniciados con los nuevos puertos en segundo plano.
)

echo.
echo Presione cualquier tecla para salir...
pause > nul
