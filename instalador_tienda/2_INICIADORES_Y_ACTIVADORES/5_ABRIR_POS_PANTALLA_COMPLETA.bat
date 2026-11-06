@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 5. Abrir Terminal POS Pantalla Completa - POS Llanomio
color 05

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

:: Cargar puerto
set "PORT=3000"
if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
    )
)

:: 1. Verificar si el servidor está activo (timeout 3s)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:%PORT%/login' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

if %errorlevel% neq 0 (
    echo [INFO] El servidor POS no responde. Levantando en segundo plano...
    call "%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat" --silencioso
    ping 127.0.0.1 -n 3 >nul
)

:: 2. Localizar navegador en modo aplicacion nativa (Edge o Chrome)
set "APP_URL=http://localhost:%PORT%/login"
set "BROWSER_EXE="

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    goto :lanzar_app
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    goto :lanzar_app
)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
    goto :lanzar_app
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    goto :lanzar_app
)

where msedge >nul 2>&1
if %errorlevel% equ 0 (
    set "BROWSER_EXE=msedge"
    goto :lanzar_app
)

where chrome >nul 2>&1
if %errorlevel% equ 0 (
    set "BROWSER_EXE=chrome"
    goto :lanzar_app
)

start %APP_URL%
exit /b 0

:lanzar_app
start "" "!BROWSER_EXE!" --app=%APP_URL% --start-fullscreen --start-maximized
exit /b 0

