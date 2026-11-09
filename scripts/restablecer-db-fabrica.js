/**
 * RESTABLECER BASE DE DATOS DE FÁBRICA Y ARCHIVADO HISTÓRICO DE BACKUPS
 * SISTEMA POS LLANOMIO
 *
 * Flujo de Resiliencia:
 * 1. Detiene cualquier proceso Node o servidor activo que mantenga bloqueada la base de datos.
 * 2. Determina la ruta de archivo histórico: si C:\POS_BACKUPS no tiene permisos de escritura,
 *    utiliza automáticamente como respaldo la ruta local del proyecto: database/backups_antiguos_historicos/.
 * 3. Copia la base de datos activa a la carpeta histórica.
 * 4. Mueve las copias de seguridad de carpetas locales y externas hacia el archivo histórico.
 * 5. Restaura llanomio.db limpia en estado de fábrica con admin/admin123.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function obtenerMarcaTiempo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function asegurarDirectorioSeguro(rutaPrincipal, rutaFallback) {
  try {
    if (!fs.existsSync(rutaPrincipal)) {
      fs.mkdirSync(rutaPrincipal, { recursive: true });
    }
    // Probar escritura
    const testFile = path.join(rutaPrincipal, `.test_write_${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return rutaPrincipal;
  } catch (err) {
    if (!fs.existsSync(rutaFallback)) {
      fs.mkdirSync(rutaFallback, { recursive: true });
    }
    return rutaFallback;
  }
}

async function restablecerAFabrica() {
  const rootDir = path.resolve(__dirname, '..');
  const dbDir = path.join(rootDir, 'database');
  const mainDb = path.join(dbDir, 'llanomio.db');
  const walDb = path.join(dbDir, 'llanomio.db-wal');
  const shmDb = path.join(dbDir, 'llanomio.db-shm');
  const factoryDb = path.join(dbDir, 'llanomio_limpio_fabrica.db');

  console.log('===============================================================================');
  console.log('       RESTABLECIMIENTO DE FÁBRICA Y ARCHIVADO HISTÓRICO DE BACKUPS');
  console.log('                           SISTEMA POS LLANOMIO');
  console.log('===============================================================================\n');

  // Liberar cualquier bloqueo en el puerto 3000 o SQLite
  try {
    execSync('powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"', { windowsHide: true });
  } catch {}

  const timestamp = obtenerMarcaTiempo();
  const rutaPrincipal = 'C:\\POS_BACKUPS\\backups_antiguos_historicos';
  const rutaFallback = path.join(dbDir, 'backups_antiguos_historicos');
  const carpetaHistoricos = asegurarDirectorioSeguro(rutaPrincipal, rutaFallback);
  const destinoArchivado = path.join(carpetaHistoricos, `archivado_${timestamp}`);
  fs.mkdirSync(destinoArchivado, { recursive: true });

  console.log(`[HISTÓRICO] Carpeta de resguardo asignada: ${destinoArchivado}`);

  // 1. Respaldo previo de la base de datos actual si existe
  if (fs.existsSync(mainDb)) {
    console.log('[1/4] Creando respaldo de salvaguarda de la base de datos activa...');
    const respaldoPrevio = path.join(destinoArchivado, `llanomio_previo_reset_${timestamp}.db`);
    try {
      fs.copyFileSync(mainDb, respaldoPrevio);
      console.log(`      -> Salvaguarda guardada en: ${respaldoPrevio}`);
    } catch (e) {
      console.warn('      [AVISO] No se pudo copiar archivo principal:', e.message);
    }
  }

  // 2. Reubicar copias de seguridad existentes sin borrarlas
  console.log('[2/4] Archivando copias de seguridad anteriores...');
  const carpetasBackup = [
    'C:\\POS_BACKUPS\\historial',
    'C:\\POS_BACKUPS\\inventario',
    'C:\\POS_BACKUPS\\clientes',
    'C:\\POS_BACKUPS\\historial_facturas',
    'C:\\POS_BACKUPS\\movimientos_caja',
    'C:\\POS_BACKUPS\\gastos_operativos',
    'C:\\POS_BACKUPS\\salvaguarda_pre_actualizacion',
    path.join(dbDir, 'backups_locales')
  ];

  let totalArchivados = 0;

  for (const carpeta of carpetasBackup) {
    if (fs.existsSync(carpeta)) {
      try {
        const archivos = fs.readdirSync(carpeta);
        for (const archivo of archivos) {
          const rutaOrigen = path.join(carpeta, archivo);
          try {
            const stats = fs.statSync(rutaOrigen);
            if (stats.isFile()) {
              const subDestino = path.join(destinoArchivado, path.basename(carpeta));
              if (!fs.existsSync(subDestino)) fs.mkdirSync(subDestino, { recursive: true });
              const rutaFinal = path.join(subDestino, archivo);
              fs.renameSync(rutaOrigen, rutaFinal);
              totalArchivados++;
            }
          } catch {}
        }
      } catch {}
    }
  }

  console.log(`      -> ${totalArchivados} archivos archivados históricamente.`);

  // 3. Garantizar plantilla de fábrica limpia
  console.log('[3/4] Generando / verificando base de datos con estado puro de fábrica...');
  const scriptGenerador = path.join(rootDir, 'scripts', 'generar-db-fabrica.js');
  try {
    execSync(`node "${scriptGenerador}"`, { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.warn('      [AVISO] Se utilizó la plantilla existente de fábrica.');
  }

  // Limpiar WAL y SHM
  if (fs.existsSync(walDb)) {
    try { fs.unlinkSync(walDb); } catch {}
  }
  if (fs.existsSync(shmDb)) {
    try { fs.unlinkSync(shmDb); } catch {}
  }

  // Restaurar base de datos
  if (fs.existsSync(factoryDb)) {
    fs.copyFileSync(factoryDb, mainDb);
    console.log('      -> database/llanomio.db restaurada con éxito en estado de fábrica.');
  } else {
    throw new Error('No se encontró llanomio_limpio_fabrica.db');
  }

  // 4. Asegurar usuario Administrador maestro
  console.log('[4/4] Verificando credenciales maestras y estructura inicial...');
  const scriptAdmin = path.join(rootDir, 'scripts', 'asegurar-admin.js');
  try {
    execSync(`node "${scriptAdmin}"`, { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.error('      [ERROR] No se pudo verificar usuario administrador:', err.message);
  }

  console.log('\n===============================================================================');
  console.log('           RESTABLECIMIENTO COMPLETADO CON ÉXITO');
  console.log('===============================================================================');
  console.log(' - Base de datos activa: Limpia y lista para usar de fábrica.');
  console.log(' - Usuario Administrador: admin / admin123');
  console.log(` - Historial de respaldos archivados: ${destinoArchivado}\n`);
}

restablecerAFabrica().catch((err) => {
  console.error('[ERROR CRÍTICO EN RESTABLECIMIENTO]:', err);
  process.exit(1);
});
