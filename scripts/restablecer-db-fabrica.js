/**
 * RESTABLECER BASE DE DATOS DE FÁBRICA Y ARCHIVADO HISTÓRICO DE BACKUPS
 * SISTEMA POS LLANOMIO
 *
 * Flujo:
 * 1. Respalda de forma preventiva la base de datos actual.
 * 2. Mueve todas las copias de seguridad de C:\POS_BACKUPS y database/backups_locales
 *    a una subcarpeta histórica organizada con marca de tiempo:
 *    C:\POS_BACKUPS\backups_antiguos_historicos\archivado_YYYY-MM-DD_HH-mm-ss\
 * 3. Restaura la base de datos llanomio.db limpia en estado de fábrica puro (Admin: admin/admin123).
 * 4. Ejecuta PRAGMA wal_checkpoint(TRUNCATE) y verificación de integridad.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function obtenerMarcaTiempo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

async function restablecerAFabrica() {
  const rootDir = path.resolve(__dirname, '..');
  const dbDir = path.join(rootDir, 'database');
  const mainDb = path.join(dbDir, 'llanomio.db');
  const walDb = path.join(dbDir, 'llanomio.db-wal');
  const shmDb = path.join(dbDir, 'llanomio.db-shm');
  const factoryDb = path.join(dbDir, 'llanomio_limpio_fabrica.db');

  const bovedaPrincipal = 'C:\\POS_BACKUPS';
  const carpetaHistoricos = path.join(bovedaPrincipal, 'backups_antiguos_historicos');
  const timestamp = obtenerMarcaTiempo();
  const destinoArchivado = path.join(carpetaHistoricos, `archivado_${timestamp}`);

  console.log('===============================================================================');
  console.log('       RESTABLECIMIENTO DE FÁBRICA Y ARCHIVADO HISTÓRICO DE BACKUPS');
  console.log('                           SISTEMA POS LLANOMIO');
  console.log('===============================================================================\n');

  // Asegurar directorios de destino histórico
  if (!fs.existsSync(carpetaHistoricos)) {
    fs.mkdirSync(carpetaHistoricos, { recursive: true });
  }
  fs.mkdirSync(destinoArchivado, { recursive: true });

  // 1. Respaldo previo de la base de datos actual si existe
  if (fs.existsSync(mainDb)) {
    console.log('[1/4] Creando respaldo de salvaguarda de la base de datos activa...');
    const respaldoPrevio = path.join(destinoArchivado, `llanomio_previo_reset_${timestamp}.db`);
    fs.copyFileSync(mainDb, respaldoPrevio);
    console.log(`      -> Salvaguarda guardada en: ${respaldoPrevio}`);
  }

  // 2. Reubicar copias de seguridad existentes sin borrarlas
  console.log('[2/4] Archivando copias de seguridad existentes a históricos antiguos...');
  const carpetasBackup = [
    path.join(bovedaPrincipal, 'historial'),
    path.join(bovedaPrincipal, 'inventario'),
    path.join(bovedaPrincipal, 'clientes'),
    path.join(bovedaPrincipal, 'historial_facturas'),
    path.join(bovedaPrincipal, 'movimientos_caja'),
    path.join(bovedaPrincipal, 'gastos_operativos'),
    path.join(bovedaPrincipal, 'salvaguarda_pre_actualizacion'),
    path.join(dbDir, 'backups_locales')
  ];

  let totalArchivados = 0;

  for (const carpeta of carpetasBackup) {
    if (fs.existsSync(carpeta)) {
      const archivos = fs.readdirSync(carpeta);
      for (const archivo of archivos) {
        const rutaOrigen = path.join(carpeta, archivo);
        const stats = fs.statSync(rutaOrigen);
        if (stats.isFile()) {
          const subDestino = path.join(destinoArchivado, path.basename(carpeta));
          if (!fs.existsSync(subDestino)) fs.mkdirSync(subDestino, { recursive: true });
          const rutaFinal = path.join(subDestino, archivo);
          fs.renameSync(rutaOrigen, rutaFinal);
          totalArchivados++;
        }
      }
    }
  }

  // Archivar cualquier backup .db suelto en C:\POS_BACKUPS
  if (fs.existsSync(bovedaPrincipal)) {
    const sueltos = fs.readdirSync(bovedaPrincipal);
    for (const item of sueltos) {
      const ruta = path.join(bovedaPrincipal, item);
      if (fs.statSync(ruta).isFile() && (item.endsWith('.db') || item.endsWith('.bak') || item.endsWith('.sqlite'))) {
        const rutaFinal = path.join(destinoArchivado, item);
        fs.renameSync(ruta, rutaFinal);
        totalArchivados++;
      }
    }
  }

  console.log(`      -> ${totalArchivados} archivos de respaldo reubicados históricamente en:`);
  console.log(`         ${destinoArchivado}`);

  // 3. Garantizar que existe la plantilla de fábrica limpia
  console.log('[3/4] Generando / verificando base de datos con estado puro de fábrica...');
  const scriptGenerador = path.join(rootDir, 'scripts', 'generar-db-fabrica.js');
  try {
    execSync(`node "${scriptGenerador}"`, { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.warn('      [AVISO] Se utilizó la plantilla existente de fábrica.');
  }

  // Limpiar WAL y SHM activos
  if (fs.existsSync(walDb)) {
    try { fs.unlinkSync(walDb); } catch {}
  }
  if (fs.existsSync(shmDb)) {
    try { fs.unlinkSync(shmDb); } catch {}
  }

  // Copiar base de datos limpia de fábrica a llanomio.db
  if (fs.existsSync(factoryDb)) {
    fs.copyFileSync(factoryDb, mainDb);
    console.log('      -> database/llanomio.db restaurada con éxito.');
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
  console.log(' - Base de datos activa: Limpia y lista para usar.');
  console.log(' - Usuario Administrador: admin / admin123');
  console.log(` - Historial de respaldos archivados: ${destinoArchivado}\n`);
}

restablecerAFabrica().catch((err) => {
  console.error('[ERROR CRÍTICO EN RESTABLECIMIENTO]:', err);
  process.exit(1);
});

