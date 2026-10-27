@echo off
setlocal EnableDelayedExpansion
title LLANOMIO POS - Apertura de Firewall y Habilitacion de Red LAN
color 0B

:: -----------------------------------------------------------------------------
:: Verificacion y Auto-Elevacion a Permisos de Administrador (UAC)
:: -----------------------------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ===============================================================================
    echo         SOLICITANDO PERMISOS DE ADMINISTRADOR DE WINDOWS...
    echo ===============================================================================
    echo Este script requiere permisos elevados para configurar el Firewall de Windows
    echo y permitir que celulares y tablets se conecten al sistema POS.
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: Cambiar directorio a la raiz del proyecto
cd /d "%~dp0..\.."

cls
echo ===============================================================================
echo       LLANOMIO POS - CONFIGURACION DE FIREWALL Y CONECTIVIDAD LAN
echo ===============================================================================
echo.
echo Configurando el Firewall de Windows para permitir trafico entrante desde:
echo  - Celulares y Tablets de Empleados (Android, iOS)
echo  - Computadores secundarios de la tienda
echo.

:: 1. Eliminar reglas previas de LLANOMIO para evitar duplicados
echo [1/4] Limpiando reglas anteriores del Firewall...
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
netsh advfirewall firewall delete rule name="LLANOMIO_POS_WEB_LAN" >nul 2>&1
netsh advfirewall firewall delete rule name="LLANOMIO_POS_MDNS" >nul 2>&1
netsh advfirewall firewall delete rule name="LLANOMIO_NODE_APP" >nul 2>&1

:: 2. Leer puertos configurados desde .env y abrir regla TCP
set "PORT_NEXT=3000"
set "PORT_HTTP=80"
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set "PORT_NEXT=%%B"
        if "%%A"=="HTTP_PORT" set "PORT_HTTP=%%B"
        if "%%A"=="PORT_PROXY" set "PORT_HTTP=%%B"
    )
)

echo [2/4] Abriendo puertos TCP !PORT_HTTP! y !PORT_NEXT! (Servidor Web POS)...
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=!PORT_HTTP!,!PORT_NEXT! profile=any description="Permite acceso web a LLANOMIO POS desde la red local LAN"
if %errorlevel% equ 0 (
    echo       [OK] Regla TCP !PORT_HTTP!,!PORT_NEXT! creada exitosamente en perfiles Privado y Publico.
) else (
    echo       [ADVERTENCIA] No se pudo crear la regla TCP !PORT_HTTP!,!PORT_NEXT!.
)

:: 3. Abrir puerto UDP 5353 para mDNS / Bonjour
echo [3/4] Abriendo puerto UDP 5353 (Servicio mDNS / Bonjour para llanomio.local)...
netsh advfirewall firewall add rule name="LLANOMIO_POS_MDNS" dir=in action=allow protocol=UDP localport=5353 profile=any description="Permite resolucion de nombre llanomio.local via mDNS"
if %errorlevel% equ 0 (
    echo       [OK] Regla UDP 5353 creada exitosamente.
) else (
    echo       [ADVERTENCIA] No se pudo crear la regla UDP 5353.
)

:: 4. Regla para el binario Node.js completo
echo [4/4] Autorizando ejecutable Node.js en el Firewall...
for /f "tokens=*" %%i in ('where node 2^>nul') do set "NODE_PATH=%%i"
if defined NODE_PATH (
    netsh advfirewall firewall add rule name="LLANOMIO_NODE_APP" dir=in action=allow program="!NODE_PATH!" enable=yes profile=any description="Permite comunicacion a Node.js para LLANOMIO POS" >nul 2>&1
    echo       [OK] Permiso de red concedido a: !NODE_PATH!
) else (
    echo       [ADVERTENCIA] No se encontro la ruta de node.exe en el sistema.
)

echo.
echo ===============================================================================
echo                 FIREWALL DE WINDOWS CONFIGURADO EXITOSAMENTE
echo ===============================================================================
echo Cualquier dispositivo en la red Wi-Fi o cableada puede conectarse a este servidor.
echo ===============================================================================
echo.
pause
