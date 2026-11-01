import * as fs from "fs";
import * as path from "path";
import prisma from "./prisma";

export interface ResultadoRespaldo {
  success: boolean;
  timestamp: string;
  nombreArchivo: string;
  rutaUltimo: string;
  rutaHistorial: string;
  rutaLocal: string;
  tamanioBytes: number;
  mensaje: string;
  error?: string;
}

export interface ResultadoValidacionIntegridad {
  valido: boolean;
  tablasDetectadas?: string[];
  error?: string;
}

export interface ResultadoRestauracion {
  ok: boolean;
  mensaje: string;
  rutaEmergencia?: string;
  error?: string;
}

/**
 * Obtiene la fecha y hora actual en formato YYYYMMDD_HHmmss (hora local de Colombia/servidor).
 */
export function obtenerTimestamp(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");
  return `${anio}${mes}${dia}_${horas}${minutos}${segundos}`;
}

/**
 * Genera el nombre descriptivo del archivo según el motivo del respaldo.
 */
export function generarNombreArchivoRespaldo(motivo: string, timestamp: string): string {
  const motivoUpper = motivo.toUpperCase();
  if (motivoUpper.includes("CIERRE")) {
    return `llanomio_CIERRE_CAJA_${timestamp}.db`;
  }
  if (motivoUpper.includes("GERENCIAL") || motivoUpper === "MANUAL" || motivoUpper.includes("ADMIN")) {
    return `llanomio_RESPALDO_GERENCIAL_${timestamp}.db`;
  }
  const limpio = motivoUpper.replace(/[^A-Z0-9_]/g, "_");
  return `llanomio_${limpio}_${timestamp}.db`;
}

/**
 * Purga los respaldos fechados excedentes en un directorio, conservando únicamente
 * los últimos N archivos más recientes según su fecha de modificación (mtime).
 * NUNCA elimina 'llanomio_ULTIMO.db', 'llanomio.db', '.gitkeep' ni respaldos de emergencia.
 */
export function purgarRespaldosExcedentes(directorio: string, limiteMaximo = 15): number {
  if (!fs.existsSync(directorio)) return 0;
  try {
    const archivos = fs
      .readdirSync(directorio)
      .filter(
        (f) =>
          f.endsWith(".db") &&
          f !== "llanomio_ULTIMO.db" &&
          f !== "llanomio.db" &&
          f !== ".gitkeep" &&
          !f.startsWith("llanomio_EMERGENCIA")
      )
      .map((nombre) => {
        const rutaCompleta = path.join(directorio, nombre);
        const stats = fs.statSync(rutaCompleta);
        return { nombre, rutaCompleta, mtime: stats.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime); // Más recientes primero

    const excedentes = archivos.slice(limiteMaximo);
    let eliminados = 0;
    for (const archivo of excedentes) {
      try {
        fs.unlinkSync(archivo.rutaCompleta);
        eliminados++;
      } catch (errUnlink) {
        console.warn(`[ROTACION RESPALDOS] No se pudo eliminar ${archivo.nombre}:`, errUnlink);
      }
    }
    if (eliminados > 0) {
      console.log(`[ROTACION RESPALDOS] Se purgaron ${eliminados} respaldos antiguos en ${directorio}.`);
    }
    return eliminados;
  } catch (err) {
    console.warn(`[ROTACION RESPALDOS] Error durante purga en ${directorio}:`, err);
    return 0;
  }
}

/**
 * Ejecuta un respaldo en caliente de la base de datos SQLite utilizando VACUUM INTO.
 * Garantiza consistencia atómica sin bloquear ni corromper las transacciones activas.
 */
export async function ejecutarRespaldoEnCaliente(motivo: string = "MANUAL"): Promise<ResultadoRespaldo> {
  const timestamp = obtenerTimestamp();
  const nombreArchivo = generarNombreArchivoRespaldo(motivo, timestamp);

  const carpetaPrincipal = "C:\\POS_LLANOMIO_BACKUPS";
  const carpetaHistorial = path.join(carpetaPrincipal, "historial");
  const carpetaLocal = path.join(process.cwd(), "database", "backups_locales");

  const rutaUltimo = path.join(carpetaPrincipal, "llanomio_ULTIMO.db");
  const rutaHistorial = path.join(carpetaHistorial, nombreArchivo);
  const rutaLocal = path.join(carpetaLocal, nombreArchivo);

  try {
    // 1. Asegurar la existencia de los directorios de destino
    if (!fs.existsSync(carpetaPrincipal)) {
      try {
        fs.mkdirSync(carpetaPrincipal, { recursive: true });
      } catch (errDir) {
        console.warn("[BACKUP] No se pudo crear directorio externo C:\\POS_LLANOMIO_BACKUPS:", errDir);
      }
    }
    if (fs.existsSync(carpetaPrincipal) && !fs.existsSync(carpetaHistorial)) {
      try {
        fs.mkdirSync(carpetaHistorial, { recursive: true });
      } catch (errHist) {
        console.warn("[BACKUP] No se pudo crear subcarpeta historial externa:", errHist);
      }
    }
    if (!fs.existsSync(carpetaLocal)) {
      fs.mkdirSync(carpetaLocal, { recursive: true });
    }

    // 2. Definir archivo de salida para VACUUM INTO
    // En SQLite, VACUUM INTO falla si el archivo de salida ya existe previamente.
    const rutaDestinoInicial = rutaLocal;
    if (fs.existsSync(rutaDestinoInicial)) {
      fs.unlinkSync(rutaDestinoInicial);
    }

    // 3. Normalizar la ruta con barras diagonales (/) para compatibilidad SQL SQLite
    const sqlSafePath = rutaDestinoInicial.replace(/\\/g, "/");

    // 4. Ejecutar el comando SQLite nativo VACUUM INTO sobre la base local
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlSafePath}'`);

    // 5. Verificar que el archivo se haya creado correctamente
    if (!fs.existsSync(rutaDestinoInicial)) {
      throw new Error(`El archivo de respaldo no fue generado en: ${rutaDestinoInicial}`);
    }

    const stat = fs.statSync(rutaDestinoInicial);
    if (stat.size === 0) {
      throw new Error("El archivo de respaldo generado tiene tamaño de 0 bytes.");
    }

    // 6. Replicar a la carpeta externa (llanomio_ULTIMO.db y subcarpeta historial)
    try {
      if (fs.existsSync(carpetaPrincipal)) {
        // Actualizar el archivo maestro de sincronización con la nube
        if (fs.existsSync(rutaUltimo)) {
          fs.unlinkSync(rutaUltimo);
        }
        fs.copyFileSync(rutaDestinoInicial, rutaUltimo);

        // Copiar en el historial externo si la subcarpeta existe
        if (fs.existsSync(carpetaHistorial)) {
          fs.copyFileSync(rutaDestinoInicial, rutaHistorial);
        }
      }
    } catch (errCopiaExterna) {
      console.warn("[BACKUP] Advertencia al replicar en almacenamiento externo C:\\POS_LLANOMIO_BACKUPS:", errCopiaExterna);
    }

    // 7. Rotación y retención automática: conservar únicamente los últimos 15 respaldos
    const eliminadosLocal = purgarRespaldosExcedentes(carpetaLocal, 15);
    const eliminadosHistorial = fs.existsSync(carpetaHistorial)
      ? purgarRespaldosExcedentes(carpetaHistorial, 15)
      : 0;

    console.log(
      `[RESPALDO EXITOSO] Motivo: ${motivo} | Bytes: ${stat.size} | Archivo: ${nombreArchivo} | Purgados Local/Ext: ${eliminadosLocal}/${eliminadosHistorial}`
    );

    return {
      success: true,
      timestamp,
      nombreArchivo,
      rutaUltimo,
      rutaHistorial,
      rutaLocal,
      tamanioBytes: stat.size,
      mensaje: `Respaldo en caliente completado con éxito (${stat.size} bytes).`,
    };
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR EN RESPALDO SQLite] Fallo durante respaldo (${motivo}):`, errorMensaje);

    return {
      success: false,
      timestamp,
      nombreArchivo,
      rutaUltimo,
      rutaHistorial,
      rutaLocal,
      tamanioBytes: 0,
      mensaje: `No se pudo completar el respaldo en caliente: ${errorMensaje}`,
      error: errorMensaje,
    };
  }
}

/**
 * Valida la integridad física y lógica de un archivo SQLite antes de usarlo.
 * 1. Verifica la cabecera mágica "SQLite format 3\0".
 * 2. Ejecuta PRAGMA integrity_check mediante conexión temporal ATTACH DATABASE.
 * 3. Comprueba que contenga las tablas esenciales del sistema POS Llanomio.
 */
export async function validarIntegridadSqlite(
  rutaArchivoTemporal: string
): Promise<ResultadoValidacionIntegridad> {
  if (!fs.existsSync(rutaArchivoTemporal)) {
    return { valido: false, error: "El archivo temporal de base de datos no existe." };
  }

  const stat = fs.statSync(rutaArchivoTemporal);
  if (stat.size < 100) {
    return { valido: false, error: "El archivo está vacío o es demasiado pequeño para ser una base de datos SQLite." };
  }

  // 1. Validar cabecera mágica SQLite (primeros 16 bytes: "SQLite format 3\0")
  const bufferEncabezado = Buffer.alloc(16);
  const fd = fs.openSync(rutaArchivoTemporal, "r");
  fs.readSync(fd, bufferEncabezado, 0, 16, 0);
  fs.closeSync(fd);

  const encabezadoMagico = bufferEncabezado.toString("utf8");
  if (!encabezadoMagico.startsWith("SQLite format 3")) {
    return {
      valido: false,
      error: "El archivo subido no contiene la cabecera mágica oficial de SQLite. No es un archivo .db válido.",
    };
  }

  // 2. Validar estructura lógica con ATTACH DATABASE y PRAGMA integrity_check
  const sqlSafePath = rutaArchivoTemporal.replace(/\\/g, "/");
  const aliasTemp = "verif_db";

  try {
    await prisma.$executeRawUnsafe(`ATTACH DATABASE '${sqlSafePath}' AS ${aliasTemp};`);

    // Comprobar integridad física
    const filasIntegridad: Array<Record<string, unknown>> = await prisma.$queryRawUnsafe(
      `PRAGMA ${aliasTemp}.integrity_check;`
    );

    const esIntegro =
      Array.isArray(filasIntegridad) &&
      filasIntegridad.length > 0 &&
      Object.values(filasIntegridad[0]).some((val) => String(val).toLowerCase() === "ok");

    if (!esIntegro) {
      await prisma.$executeRawUnsafe(`DETACH DATABASE ${aliasTemp};`);
      return {
        valido: false,
        error: "El archivo presenta inconsistencias estructurales o corrupción interna según PRAGMA integrity_check.",
      };
    }

    // 3. Comprobar existencia de tablas clave del sistema POS (admitiendo nombres físicos en minúsculas y PascalCase)
    const tablasEncontradas: Array<{ name: string }> = await prisma.$queryRawUnsafe(
      `SELECT name FROM ${aliasTemp}.sqlite_master WHERE type='table';`
    );

    const nombresTablas = tablasEncontradas.map((t) => t.name.toLowerCase());
    const tieneUsuarios = nombresTablas.includes("usuarios") || nombresTablas.includes("usuario");
    const tieneFacturas = nombresTablas.includes("facturas") || nombresTablas.includes("factura");
    const tieneProductos = nombresTablas.includes("productos") || nombresTablas.includes("producto");
    const tieneConfig = nombresTablas.includes("configuracion_empresa") || nombresTablas.includes("configuracionempresa");

    await prisma.$executeRawUnsafe(`DETACH DATABASE ${aliasTemp};`);

    if (!tieneUsuarios || (!tieneFacturas && !tieneProductos)) {
      return {
        valido: false,
        tablasDetectadas: tablasEncontradas.map((t) => t.name),
        error: `El archivo SQLite no corresponde a una base de datos del POS Llanomio (tablas esenciales no encontradas en el esquema).`,
      };
    }

    return {
      valido: true,
      tablasDetectadas: tablasEncontradas.map((t) => t.name),
    };
  } catch (error: unknown) {
    try {
      await prisma.$executeRawUnsafe(`DETACH DATABASE ${aliasTemp};`);
    } catch {
      // Ignorar si ya no estaba adjunta
    }
    const msg = error instanceof Error ? error.message : String(error);
    return {
      valido: false,
      error: `Error al verificar la estructura de la base de datos: ${msg}`,
    };
  }
}

/**
 * Restaura la base de datos activa del sistema a partir de un Buffer de archivo .db.
 * Protocolo defensivo:
 * 1. Guarda en archivo temporal y verifica integridad física y lógica.
 * 2. Genera una copia de seguridad de emergencia de la base de datos actual.
 * 3. Ejecuta checkpoint de WAL y desconecta Prisma Client.
 * 4. Sobrescribe 'database/llanomio.db' y purga archivos temporales WAL/SHM.
 * 5. Reconecta Prisma Client y restablece los PRAGMAs de alto rendimiento.
 */
export async function restaurarBaseDeDatosDesdeBuffer(
  buffer: Buffer
): Promise<ResultadoRestauracion> {
  const timestamp = obtenerTimestamp();
  const carpetaDatabase = path.join(process.cwd(), "database");
  const rutaDbActiva = path.join(carpetaDatabase, "llanomio.db");
  const rutaDbWal = path.join(carpetaDatabase, "llanomio.db-wal");
  const rutaDbShm = path.join(carpetaDatabase, "llanomio.db-shm");

  const rutaTemp = path.join(carpetaDatabase, `temp_restauracion_${timestamp}.db`);
  const carpetaBackupsLocales = path.join(carpetaDatabase, "backups_locales");
  const carpetaPrincipal = "C:\\POS_LLANOMIO_BACKUPS";

  const rutaEmergenciaLocal = path.join(
    carpetaBackupsLocales,
    `llanomio_EMERGENCIA_PRE_RESTAURACION_${timestamp}.db`
  );
  const rutaEmergenciaExterna = path.join(
    carpetaPrincipal,
    `llanomio_EMERGENCIA_PRE_RESTAURACION_${timestamp}.db`
  );

  try {
    // 1. Guardar buffer en archivo temporal
    fs.writeFileSync(rutaTemp, buffer);

    // 2. Validar integridad estricta del archivo temporal
    const validacion = await validarIntegridadSqlite(rutaTemp);
    if (!validacion.valido) {
      if (fs.existsSync(rutaTemp)) {
        fs.unlinkSync(rutaTemp);
      }
      return {
        ok: false,
        mensaje: validacion.error || "El archivo proporcionado no superó la validación de integridad.",
        error: validacion.error,
      };
    }

    // 3. Crear copia de seguridad de emergencia de la base de datos activa actual
    if (!fs.existsSync(carpetaBackupsLocales)) {
      fs.mkdirSync(carpetaBackupsLocales, { recursive: true });
    }
    if (fs.existsSync(rutaDbActiva)) {
      fs.copyFileSync(rutaDbActiva, rutaEmergenciaLocal);
      try {
        if (!fs.existsSync(carpetaPrincipal)) {
          fs.mkdirSync(carpetaPrincipal, { recursive: true });
        }
        fs.copyFileSync(rutaDbActiva, rutaEmergenciaExterna);
        // También actualizar el archivo estático de emergencia
        const rutaEmergenciaFija = path.join(carpetaPrincipal, "llanomio_EMERGENCIA_PRE_RESTAURACION.db");
        fs.copyFileSync(rutaDbActiva, rutaEmergenciaFija);
      } catch (errExt) {
        console.warn("[RESTAURACION] Advertencia al copiar respaldo de emergencia externo:", errExt);
      }
    }

    // 4. Vaciar y cerrar conexiones activas de SQLite en Prisma
    try {
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch (errWal) {
      console.warn("[RESTAURACION] Checkpoint WAL preventivo:", errWal);
    }

    await prisma.$disconnect();

    // 5. Sobrescribir el archivo de base de datos activa con el archivo validado
    fs.copyFileSync(rutaTemp, rutaDbActiva);

    // 6. Si es posible, truncar o limpiar archivos WAL y SHM residuales
    if (fs.existsSync(rutaDbWal)) {
      try {
        fs.unlinkSync(rutaDbWal);
      } catch {
        // En Windows el proceso puede mantener el lock del archivo WAL; el checkpoint ya lo truncó
      }
    }
    if (fs.existsSync(rutaDbShm)) {
      try {
        fs.unlinkSync(rutaDbShm);
      } catch {
        // Ignorar si está retenido temporalmente
      }
    }

    // 7. Eliminar archivo temporal de verificación
    if (fs.existsSync(rutaTemp)) {
      fs.unlinkSync(rutaTemp);
    }

    // 8. Reconectar Prisma y restablecer PRAGMAs optimizados
    await prisma.$connect();
    await Promise.all([
      prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;"),
      prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"),
      prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;"),
    ]);

    console.log(
      `[RESTAURACION EXITOSA] Base de datos restaurada correctamente. Respaldo de emergencia en: ${rutaEmergenciaLocal}`
    );

    return {
      ok: true,
      mensaje: "Base de datos restaurada y migrada exitosamente. Recargue la página.",
      rutaEmergencia: rutaEmergenciaLocal,
    };
  } catch (error: unknown) {
    if (fs.existsSync(rutaTemp)) {
      try {
        fs.unlinkSync(rutaTemp);
      } catch {}
    }
    // Asegurar reconexión si algo falló
    try {
      await prisma.$connect();
    } catch {}

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[ERROR EN RESTAURACION SQLite]:", errorMsg);

    return {
      ok: false,
      mensaje: `Fallo durante la restauración de la base de datos: ${errorMsg}`,
      error: errorMsg,
    };
  }
}
