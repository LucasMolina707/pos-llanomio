@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Restablecer Base de Datos de Fabrica - POS Llanomio
cd /d "%~dp0"

echo ===============================================================================
echo        RESTABLECER BASE DE DATOS DE FABRICA Y ARCHIVADO HISTORICO
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo ADVERTENCIA: Esta operacion restaurara la base de datos a su estado original
echo de fabrica (Admin: admin/admin123) y reubicara todas las copias de seguridad
echo anteriores en una carpeta historica protegida.
echo.
set /p CONFIRMAR="Desea continuar con el restablecimiento de fabrica? (S/N): "
if /i not "!CONFIRMAR!"=="S" (
    echo Operacion cancelada por el usuario.
    pause
    exit /b 0
)

echo.
echo [1/2] Liberando procesos y conexiones en el puerto 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

echo [2/2] Ejecutando restablecimiento y archivado historico...
node "%~dp0scripts\restablecer-db-fabrica.js"

echo.
echo Presione una tecla para salir...
pause >nul
exit /b 0
