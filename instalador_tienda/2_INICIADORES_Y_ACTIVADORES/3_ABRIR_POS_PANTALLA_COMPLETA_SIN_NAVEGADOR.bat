@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Terminal POS - Modo Pantalla Completa

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

:: Cargar puerto desde .env
set "PORT=3000"
if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
    )
)

:: 1. Comprobar si el servidor esta activo
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

if %errorlevel% neq 0 (
    echo [INFO] El servidor POS no responde. Levantando proceso en segundo plano...
    where pm2 >nul 2>&1
    if %errorlevel% equ 0 (
        call pm2 start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    ) else (
        if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
            call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
        ) else (
            if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
                start "Servidor_POS" /min "%PROJECT_ROOT%\runtime\node\node.exe" "%PROJECT_ROOT%\start-pos.js"
            ) else (
                start "Servidor_POS" /min node "%PROJECT_ROOT%\start-pos.js"
            )
        )
    )

    :: Esperar hasta 10 segundos
    for /L %%i in (1,1,10) do (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 goto :servidor_listo_para_abrir
        timeout /t 1 >nul
    )
)

:servidor_listo_para_abrir

:: 2. Localizar navegador en modo aplicacion nativa (Edge o Chrome)
set "APP_URL=http://localhost:!PORT!/login"
set "BROWSER_EXE="

:: Buscar Microsoft Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    goto :lanzar_app
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    goto :lanzar_app
)

:: Buscar Google Chrome
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

:: Si no se detectan navegadores compatibles con --app, abrir en el navegador predeterminado
start %APP_URL%
exit /b 0

:lanzar_app
start "" "!BROWSER_EXE!" --app=%APP_URL% --start-maximized
exit /b 0
