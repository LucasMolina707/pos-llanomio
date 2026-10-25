@echo off
setlocal EnableDelayedExpansion
title LLANOMIO POS - Apertura de Firewall y Habilitacion de Red LAN

:: -----------------------------------------------------------------------------
:: Verificacion y Auto-Elevacion a Permisos de Administrador (UAC)
:: -----------------------------------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo =========================================================================
    echo   SOLICITANDO PERMISOS DE ADMINISTRADOR DE WINDOWS...
    echo =========================================================================
    echo Este script requiere permisos elevados para configurar el Firewall de Windows
    echo y permitir que celulares y tablets se conecten al sistema POS.
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: Cambiar directorio a la raiz del proyecto
cd /d "%~dp0.."

cls
echo =========================================================================
echo       LLANOMIO POS - CONFIGURACION DE FIREWALL Y CONECTIVIDAD LAN
echo =========================================================================
echo.
echo Configurando el Firewall de Windows para permitir trafico entrante desde:
echo  - Celulares y Tablets de Empleados (Android, iOS)
echo  - Computadores secundarios de la tienda
echo.

:: -----------------------------------------------------------------------------
:: 1. Eliminar reglas previas de LLANOMIO para evitar duplicados
:: -----------------------------------------------------------------------------
echo [1/4] Limpiando reglas anteriores del Firewall...
netsh advfirewall firewall delete rule name="LLANOMIO_POS_WEB_LAN" >nul 2>&1
netsh advfirewall firewall delete rule name="LLANOMIO_POS_MDNS" >nul 2>&1
netsh advfirewall firewall delete rule name="LLANOMIO_NODE_APP" >nul 2>&1

:: -----------------------------------------------------------------------------
:: 2. Regla Entrante TCP: Puertos 80 y 3000 (HTTP y Servidor Web Next.js)
:: -----------------------------------------------------------------------------
echo [2/4] Abriendo puertos TCP 80 y 3000 (Servidor Web POS)...
netsh advfirewall firewall add rule name="LLANOMIO_POS_WEB_LAN" dir=in action=allow protocol=TCP localport=80,3000 profile=any description="Permite acceso web a LLANOMIO POS desde la red local LAN"
if %errorlevel% equ 0 (
    echo       [OK] Regla TCP 80,3000 creada exitosamente en perfiles Privado y Publico.
) else (
    echo       [ADVERTENCIA] No se pudo crear la regla TCP 80,3000.
)

:: -----------------------------------------------------------------------------
:: 3. Regla Entrante UDP: Puerto 5353 (mDNS / Bonjour para llanomio.local)
:: -----------------------------------------------------------------------------
echo [3/4] Abriendo puerto UDP 5353 (Servicio mDNS / llanomio.local)...
netsh advfirewall firewall add rule name="LLANOMIO_POS_MDNS" dir=in action=allow protocol=UDP localport=5353 profile=any description="Permite resolucion de nombres llanomio.local por mDNS"
if %errorlevel% equ 0 (
    echo       [OK] Regla UDP 5353 creada exitosamente en perfiles Privado y Publico.
) else (
    echo       [ADVERTENCIA] No se pudo crear la regla UDP 5353.
)

:: -----------------------------------------------------------------------------
:: 4. Regla para el ejecutable Node.js
:: -----------------------------------------------------------------------------
echo [4/4] Autorizando ejecutable Node.js en el Firewall...
set "NODE_BIN="
for /f "delims=" %%I in ('where node.exe 2^>nul') do (
    if not defined NODE_BIN set "NODE_BIN=%%I"
)

if not defined NODE_BIN (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_BIN=C:\Program Files\nodejs\node.exe"
    )
)

if defined NODE_BIN (
    echo       Ruta detectada de Node.js: "%NODE_BIN%"
    netsh advfirewall firewall add rule name="LLANOMIO_NODE_APP" dir=in action=allow program="%NODE_BIN%" enable=yes profile=any description="Permite a Node.js recibir conexiones LAN de tienda"
    if %errorlevel% equ 0 (
        echo       [OK] Node.js autorizado para recibir conexiones LAN.
    )
) else (
    echo       [ADVERTENCIA] No se detecto la ruta de node.exe; las reglas de puerto garantizan la conexion.
)

echo.
echo =========================================================================
echo                    RESUMEN DE CONFIGURACION LAN
echo =========================================================================
echo - Puertos autorizados: TCP 80 (HTTP) y TCP 3000 (Next.js)
echo - Servicio mDNS: UDP 5353 (http://llanomio.local)
echo - Perfiles de Red: Habilitado para redes Privadas y Publicas
echo.
echo Los dispositivos conectados al mismo Wi-Fi de la tienda ya pueden
echo ingresar sin bloqueos del Firewall de Windows.
echo =========================================================================
echo.
pause
