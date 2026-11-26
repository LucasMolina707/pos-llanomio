# ==============================================================================
# SCRIPT DE DESPLIEGUE Y ACTUALIZACIÓN CONTINUA: AURORA POS -> SERVIDOR INGLUCAS
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/desplegar-aurora-ssh.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/desplegar-aurora-ssh.ps1 -ResetVitrina
# ==============================================================================

param(
  [string]$SshHost = "seshat-server",
  [string]$RemoteDir = "/home/luki/aurorapos",
  [switch]$ResetVitrina = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "================================================================="
Write-Host "[AURORA DEPLOY] Empaquetando codigo fuente limpio..."
Write-Host "================================================================="

$TempTar = Join-Path $env:TEMP "aurorapos_deploy.tar.gz"
if (Test-Path $TempTar) { Remove-Item $TempTar -Force }

tar.exe -czf $TempTar `
  --exclude="node_modules" `
  --exclude=".next" `
  --exclude=".git" `
  --exclude=".tmp" `
  --exclude=".pm2*" `
  --exclude="data" `
  --exclude="portable-windows" `
  --exclude="runtime" `
  --exclude="actualizaciones" `
  --exclude="dist_instalador" `
  --exclude="dist_actualizaciones" `
  --exclude="instalador_tienda" `
  --exclude="*.exe" `
  --exclude="*.db" `
  --exclude="*.db-wal" `
  --exclude="*.db-shm" `
  --exclude=".env" `
  --exclude="database/backups_locales/*" `
  .

Write-Host "[AURORA DEPLOY] Preparando estructura remota en $SshHost ($RemoteDir)..."
ssh $SshHost "mkdir -p $RemoteDir/app $RemoteDir/data/database $RemoteDir/data/backups"

Write-Host "[AURORA DEPLOY] Transfiriendo paquete comprimido por SSH..."
scp $TempTar "${SshHost}:${RemoteDir}/aurorapos_deploy.tar.gz"
Remove-Item $TempTar -Force

$RemoteScript = @"
set -e
cd $RemoteDir

# Respaldo preventivo de la base de datos de vitrina si ya existe
if [ -f "$RemoteDir/data/database/aurorapos.db" ]; then
  TS=`$(date +%Y%m%d_%H%M%S)
  cp "$RemoteDir/data/database/aurorapos.db" "$RemoteDir/data/backups/aurorapos_PRE_DEPLOY_`$TS.db"
  echo "[AURORA REMOTO] Respaldo preventivo creado: aurorapos_PRE_DEPLOY_`$TS.db"
fi

# Generar .env de produccion unico si aun no existe en el servidor
if [ ! -f "$RemoteDir/.env" ]; then
  JWT_RND=`$(openssl rand -hex 32)
  cat > "$RemoteDir/.env" <<EOF
JWT_SECRET=`$JWT_RND
MASTER_RECOVERY_KEY=AURORA-POS-2026
AURORA_ADMIN_USER=admin
AURORA_ADMIN_PASSWORD=admin123
AURORA_CAJERO_PASSWORD=cajero123
EOF
  chmod 600 "$RemoteDir/.env"
  echo "[AURORA REMOTO] Archivo .env de produccion generado con JWT_SECRET criptografico."
fi

# Extraer codigo limpio normalizando permisos Windows -> Linux
chmod -R u+rwX "$RemoteDir/app" 2>/dev/null || true
rm -rf "$RemoteDir/app"
mkdir -p "$RemoteDir/app"
python3 -c 'import tarfile; tf=tarfile.open("aurorapos_deploy.tar.gz","r:gz"); [setattr(m,"mode",0o755 if m.isdir() else 0o644) or tf.extract(m,"./app") for m in tf.getmembers()]; tf.close()'
chmod +x "$RemoteDir/app/scripts/docker-entrypoint.sh"
rm -f aurorapos_deploy.tar.gz
cp "$RemoteDir/app/docker-compose.yml" "$RemoteDir/docker-compose.yml"
sed -i 's|context: \.|context: ./app|g' "$RemoteDir/docker-compose.yml"

echo "[AURORA REMOTO] Construyendo y desplegando contenedor Docker..."
docker compose -f "$RemoteDir/docker-compose.yml" --env-file "$RemoteDir/.env" up -d --build
"@

$RemoteScriptUnix = $RemoteScript -replace "`r`n", "`n"
$RemoteScriptUnix | ssh $SshHost "bash -s"

if ($ResetVitrina) {
  Write-Host "[AURORA DEPLOY] Reiniciando base de datos de vitrina a estado limpio..."
  ssh $SshHost "docker exec aurora-pos node /app/scripts/seed-aurora-vitrina.js --reset"
}

Write-Host "================================================================="
Write-Host "[AURORA DEPLOY] Despliegue completado exitosamente en $SshHost"
Write-Host "================================================================="
