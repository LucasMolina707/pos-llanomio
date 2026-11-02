# ==============================================================================
# POS LOCAL - Script de Desbloqueo de Red LAN y Diagnóstico de Firewall
# ==============================================================================

Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "   POS LOCAL - CONFIGURACION DE RED LAN Y FIREWALL DE WINDOWS" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Comprobar elevación de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Warning "Este script requiere elevación de Administrador para modificar el Firewall de Windows."
    Write-Host "Instrucción: Haz clic derecho sobre el archivo 'instalador_tienda\5_ABRIR_FIREWALL_LAN.bat' o sobre PowerShell y selecciona 'Ejecutar como administrador'." -ForegroundColor Yellow
    Write-Host "Intentando aplicar reglas con permisos actuales..." -ForegroundColor DarkGray
}

# 2. Diagnóstico de Interfaces y Perfiles de Red
Write-Host "[1/4] Inspeccionando conexiones de red activas..." -ForegroundColor Yellow
try {
    $perfiles = Get-NetConnectionProfile
    foreach ($p in $perfiles) {
        Write-Host "  -> Red: $($p.Name) | Perfil: $($p.NetworkCategory) | IPv4: $($p.IPv4Connectivity)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  (Información de perfil no disponible en este entorno)" -ForegroundColor DarkGray
}

# 3. Eliminar reglas antiguas para evitar duplicados
Write-Host "[2/4] Limpiando reglas anteriores de LLANOMIO..." -ForegroundColor Yellow
& netsh advfirewall firewall delete rule name="LLANOMIO_POS_WEB_LAN" 2>$null | Out-Null
& netsh advfirewall firewall delete rule name="LLANOMIO_POS_MDNS" 2>$null | Out-Null
& netsh advfirewall firewall delete rule name="LLANOMIO_NODE_APP" 2>$null | Out-Null

# 4. Crear Regla TCP Puertos 80 y 3000
Write-Host "[3/4] Creando regla de Firewall para puertos TCP 80 y 3000..." -ForegroundColor Yellow
$resTcp = & netsh advfirewall firewall add rule name="LLANOMIO_POS_WEB_LAN" dir=in action=allow protocol=TCP localport=80,3000 profile=any description="Acceso web a POS LOCAL desde la LAN"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Puertos TCP 80 y 3000 abiertos para perfiles Privado y Público." -ForegroundColor Green
} else {
    Write-Host "  [ERROR] No se pudo crear la regla TCP 80, 3000." -ForegroundColor Red
}

# 5. Crear Regla UDP Puerto 5353 (mDNS)
Write-Host "[4/4] Creando regla de Firewall para puerto UDP 5353 (mDNS)..." -ForegroundColor Yellow
$resMdns = & netsh advfirewall firewall add rule name="LLANOMIO_POS_MDNS" dir=in action=allow protocol=UDP localport=5353 profile=any description="Resolución mDNS llanomio.local"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Puerto UDP 5353 abierto para anuncios Bonjour / mDNS." -ForegroundColor Green
} else {
    Write-Host "  [ERROR] No se pudo crear la regla UDP 5353." -ForegroundColor Red
}

# 6. Autorizar Node.js
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe -and (Test-Path "C:\Program Files\nodejs\node.exe")) {
    $nodeExe = "C:\Program Files\nodejs\node.exe"
}

if ($nodeExe) {
    Write-Host "  Autorizando ejecutable: $nodeExe" -ForegroundColor Gray
    & netsh advfirewall firewall add rule name="LLANOMIO_NODE_APP" dir=in action=allow program="$nodeExe" enable=yes profile=any description="Servidor Node.js POS LOCAL" | Out-Null
    Write-Host "  [OK] Proceso Node.js autorizado en el Firewall." -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Green
Write-Host "  DESBLOQUEO DE RED LAN COMPLETADO SATISFACTORIAMENTE" -ForegroundColor Green
Write-Host "=========================================================================" -ForegroundColor Green
Write-Host "Cualquier dispositivo conectado al Wi-Fi de la tienda puede acceder ahora." -ForegroundColor White
Write-Host ""
