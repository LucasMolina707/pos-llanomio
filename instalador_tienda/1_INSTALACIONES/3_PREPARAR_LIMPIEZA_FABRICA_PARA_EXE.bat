@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Preparar Limpieza de Fabrica para Empaquetado EXE - POS Llanomio

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

color 0C
cls
echo ===============================================================================
echo         PREPARACION Y LIMPIEZA DE FABRICA PARA EMPAQUETADO (.EXE)
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo [ADVERTENCIA CRITICA]
echo Este proceso esta disenado EXCLUSIVAMENTE para el Desarrollador o Distribuidor.
echo Al ejecutar esta operacion:
echo.
echo   1. Se purgaran respaldos temporales, logs y archivos de migracion de prueba.
echo   2. La base de datos SQLite sera restablecida a ESTADO VIRGEN DE FABRICA:
echo      - 0 clientes, 0 productos, 0 facturas, 0 abonos, 0 turnos de caja.
echo      - 1 usuario administrador inicial: 'admin' / 'admin123'
echo      - 1 empresa neutra de configuracion: 'MI EMPRESA POS' (NIT: 000000000-0)
echo   3. Se compilara el proyecto con Next.js ('npm run build') para produccion.
echo.
echo Si este computador es de un cliente en produccion, NO ejecute este proceso
echo a menos que desee eliminar todos los datos de prueba antes de entregar.
echo.
echo ===============================================================================
echo.

set /p CONFIRMACION="Escriba EXACTAMENTE 'CONFIRMAR' para continuar: "
if "!CONFIRMACION!" NEQ "CONFIRMAR" (
    echo.
    echo [OPERACION CANCELADA] No se realizo ningun cambio en los datos ni en el sistema.
    pause
    exit /b 0
)

color 0A
echo.
echo [1/3] Detectando runtime Node.js...
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "NODE_EXE=node"
)

where %NODE_EXE% >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] No se detecto el motor Node.js.
    pause
    exit /b 1
)

echo.
echo [2/3] Ejecutando purga integral y reseteo de base de datos a estado de fabrica...
call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\preparar-paquete-instalador.js"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ocurrio un fallo durante la preparacion del paquete.
    pause
    exit /b 1
)

echo.
echo [3/3] Compilando produccion Next.js (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ADVERTENCIA] La compilacion finalizo con advertencias o error. Revise la consola.
) else (
    echo [OK] Compilacion de produccion generada exitosamente en .next/
)

echo.
echo ===============================================================================
echo                SISTEMA LISTO PARA EMPAQUETADO EN INSTALADOR
echo ===============================================================================
echo.
echo La carpeta raiz se encuentra en estado limpio y listo para ser apuntada
echo por Smart Install Maker o Inno Setup para generar el instalador 'setup.exe'.
echo.
echo Credenciales de fabrica para el primer acceso:
echo   - Usuario: admin
echo   - Clave:   admin123
echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b 0
