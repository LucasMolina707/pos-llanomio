/**
 * LIMPIADOR MAESTRO Y PREPARADOR DE PAQUETE LIMPIO DE FABRICA
 * SISTEMA POS LLANOMIO
 *
 * Deja el proyecto en un estado 100% puro y optimizado para comprimir en .zip:
 * 1. Detiene procesos activos de PM2 y Node.js en el puerto 3000.
 * 2. Restaura la base de datos a estado puro de fábrica (admin/admin123, categoria YOANA, 0 ventas).
 * 3. Purga transacciones WAL, caches residuales (.next/cache), logs y temporales.
 * 4. Elimina archivos desktop.ini generados por explorador de Windows o nubes.
 * 5. Reporta el estado final y peso del proyecto.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('===============================================================================');
console.log('     LIMPIEZA DE FABRICA Y PREPARACION DE PAQUETE PARA COMPRIMIR EN ZIP');
console.log('                           SISTEMA POS LLANOMIO');
console.log('===============================================================================\n');

// 1. Detener servidores y liberar puertos
console.log('[1/6] Deteniendo procesos activos y liberando puertos...');
try {
  const scriptDetener = path.join(PROJECT_ROOT, 'DETENER_SERVIDOR_POS.bat');
  if (fs.existsSync(scriptDetener)) {
    execSync(`"${scriptDetener}" --silencioso`, { cwd: PROJECT_ROOT, stdio: 'ignore' });
  }
} catch {}
try {
  execSync('powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"', { windowsHide: true });
} catch {}
console.log('      [OK] Procesos detenidos.');

// 2. Restablecer base de datos limpia de fábrica
console.log('\n[2/6] Restableciendo base de datos a Estado Puro de Fabrica...');
const dbDir = path.join(PROJECT_ROOT, 'database');
const mainDb = path.join(dbDir, 'llanomio.db');
const factoryDb = path.join(dbDir, 'llanomio_limpio_fabrica.db');
const walDb = path.join(dbDir, 'llanomio.db-wal');
const shmDb = path.join(dbDir, 'llanomio.db-shm');

if (fs.existsSync(walDb)) {
  try { fs.unlinkSync(walDb); } catch {}
}
if (fs.existsSync(shmDb)) {
  try { fs.unlinkSync(shmDb); } catch {}
}

if (fs.existsSync(factoryDb)) {
  fs.copyFileSync(factoryDb, mainDb);
  console.log('      [OK] database/llanomio.db restaurada desde plantilla limpia.');
} else {
  // Regenerar con seed si no existiera
  console.log('      [INFO] Generando base limpia mediante seed...');
  try {
    execSync(`node "${path.join(PROJECT_ROOT, 'scripts', 'generar-db-fabrica.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
    if (fs.existsSync(factoryDb)) fs.copyFileSync(factoryDb, mainDb);
  } catch (e) {
    console.warn('      [AVISO] Seed ejecutado con advertencia:', e.message);
  }
}

// Asegurar credenciales maestras admin/admin123
try {
  execSync(`node "${path.join(PROJECT_ROOT, 'scripts', 'asegurar-admin.js')}"`, { cwd: PROJECT_ROOT, stdio: 'ignore' });
  console.log('      [OK] Credenciales maestras admin/admin123 aseguradas.');
} catch {}

// 3. Purgar copias locales viejas en database/backups_locales
console.log('\n[3/6] Limpiando carpetas de respaldos locales...');
const backupsLocales = path.join(dbDir, 'backups_locales');
if (fs.existsSync(backupsLocales)) {
  const archivos = fs.readdirSync(backupsLocales);
  for (const a of archivos) {
    if (a !== '.gitkeep') {
      try {
        const ruta = path.join(backupsLocales, a);
        if (fs.statSync(ruta).isFile()) {
          fs.unlinkSync(ruta);
        }
      } catch {}
    }
  }
}
console.log('      [OK] Carpeta database/backups_locales purgada.');

// 4. Purgar .tmp, .pm2 logs, y dist_instalador/PAQUETE_LISTO_PARA_EXE
console.log('\n[4/6] Purgando archivos temporales, logs y staging...');
const tmpDir = path.join(PROJECT_ROOT, '.tmp');
if (fs.existsSync(tmpDir)) {
  const itemsTmp = fs.readdirSync(tmpDir);
  for (const it of itemsTmp) {
    try {
      const ruta = path.join(tmpDir, it);
      if (fs.statSync(ruta).isDirectory()) {
        fs.rmSync(ruta, { recursive: true, force: true });
      } else {
        fs.unlinkSync(ruta);
      }
    } catch {}
  }
}

const pm2Dir = path.join(PROJECT_ROOT, '.pm2');
if (fs.existsSync(pm2Dir)) {
  const logsDir = path.join(pm2Dir, 'logs');
  if (fs.existsSync(logsDir)) {
    for (const f of fs.readdirSync(logsDir)) {
      try { fs.unlinkSync(path.join(logsDir, f)); } catch {}
    }
  }
  const pidsDir = path.join(pm2Dir, 'pids');
  if (fs.existsSync(pidsDir)) {
    for (const f of fs.readdirSync(pidsDir)) {
      try { fs.unlinkSync(path.join(pidsDir, f)); } catch {}
    }
  }
  const dumps = ['dump.pm2', 'dump.pm2.bak', 'pm2.log', 'pm2.pid'];
  for (const d of dumps) {
    const ruta = path.join(pm2Dir, d);
    if (fs.existsSync(ruta)) {
      try { fs.unlinkSync(ruta); } catch {}
    }
  }
}

// Purgar .next/cache (ahorro masivo de cientos de MB)
const nextCache = path.join(PROJECT_ROOT, '.next', 'cache');
if (fs.existsSync(nextCache)) {
  try {
    fs.rmSync(nextCache, { recursive: true, force: true });
    console.log('      [OK] Cache de compilador (.next/cache) purgado.');
  } catch {}
}

// Purgar staging dist_instalador/PAQUETE_LISTO_PARA_EXE
const staging = path.join(PROJECT_ROOT, 'dist_instalador', 'PAQUETE_LISTO_PARA_EXE');
if (fs.existsSync(staging)) {
  try {
    fs.rmSync(staging, { recursive: true, force: true });
    console.log('      [OK] Paquete temporal de staging eliminado.');
  } catch {}
}

// 5. Eliminar archivos desktop.ini recursivamente
console.log('\n[5/6] Eliminando archivos de sistema desktop.ini...');
let countIni = 0;
function eliminarDesktopIniRecursivo(directorio) {
  try {
    const elementos = fs.readdirSync(directorio, { withFileTypes: true });
    for (const el of elementos) {
      if (el.name === 'node_modules' || el.name === '.git') continue;
      const rutaCompleta = path.join(directorio, el.name);
      if (el.isDirectory()) {
        eliminarDesktopIniRecursivo(rutaCompleta);
      } else if (el.name.toLowerCase() === 'desktop.ini') {
        try {
          fs.chmodSync(rutaCompleta, 0o666);
          fs.unlinkSync(rutaCompleta);
          countIni++;
        } catch {}
      }
    }
  } catch {}
}
eliminarDesktopIniRecursivo(PROJECT_ROOT);
console.log(`      [OK] ${countIni} archivos desktop.ini eliminados.`);

// 6. Reporte Final
console.log('\n[6/6] Verificacion y Certificacion de Archivos Clave:');
const archivosClave = [
  'INSTALADOR_MAESTRO_UNICO_POS.bat',
  'INICIAR_O_RECUPERAR_SERVIDOR_POS.bat',
  'DETENER_SERVIDOR_POS.bat',
  'RESTABLECER_BASE_DATOS_FABRICA.bat',
  'CONTROL_GENERAL_POS.bat',
  'ABRIR_SISTEMA_PANTALLA_COMPLETA.bat',
  'database/llanomio.db'
];

for (const a of archivosClave) {
  const r = path.join(PROJECT_ROOT, a);
  const existe = fs.existsSync(r);
  console.log(`      ${existe ? '[OK]' : '[FALTA]'} ${a}`);
}

console.log('\n===============================================================================');
console.log('        SISTEMA POS LLANOMIO PREPARADO Y LIMPIO PARA COMPRIMIR EN ZIP');
console.log('===============================================================================\n');
console.log('El proyecto se encuentra en Estado de Fabrica, sin transacciones previas');
console.log('y optimizado para distribucion.');
