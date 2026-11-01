import * as fs from "fs";
import * as path from "path";
import prisma from "./prisma";

export interface ResultadoRespaldo {
  success: boolean;
  timestamp: string;
  rutaUltimo: string;
  rutaHistorial: string;
  tamanioBytes: number;
  mensaje: string;
  error?: string;
}

/**
 * Obtiene la fecha y hora actual en formato YYYYMMDD_HHMMSS
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
 * Purga los respaldos fechados excedentes en un directorio, conservando únicamente
 * los últimos N archivos más recientes según su fecha de modificación (mtime).
 * NUNCA elimina 'llanomio_ULTIMO.db', 'llanomio.db' ni '.gitkeep'.
 */
export function purgarRespaldosExcedentes(directorio: string, limiteMaximo = 15): number {
  if (!fs.existsSync(directorio)) return 0;
  try {
    const archivos = fs
      .readdirSync(directorio)
      .filter((f) => f.endsWith(".db") && f !== "llanomio_ULTIMO.db" && f !== "llanomio.db" && f !== ".gitkeep")
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
  const carpetaPrincipal = "C:\\POS_LLANOMIO_BACKUPS";
  const carpetaHistorial = path.join(carpetaPrincipal, "historial");
  const carpetaLocal = path.join(process.cwd(), "database", "backups_locales");

  const rutaUltimo = path.join(carpetaPrincipal, "llanomio_ULTIMO.db");
  const rutaHistorial = path.join(carpetaHistorial, `llanomio_${timestamp}.db`);
  const rutaLocal = path.join(carpetaLocal, `llanomio_${timestamp}.db`);

  try {
    // 1. Asegurar la existencia de los directorios de destino
    if (!fs.existsSync(carpetaPrincipal)) {
      fs.mkdirSync(carpetaPrincipal, { recursive: true });
    }
    if (!fs.existsSync(carpetaHistorial)) {
      fs.mkdirSync(carpetaHistorial, { recursive: true });
    }
    if (!fs.existsSync(carpetaLocal)) {
      fs.mkdirSync(carpetaLocal, { recursive: true });
    }

    // 2. Si llanomio_ULTIMO.db ya existe, eliminarlo antes de VACUUM INTO
    // En SQLite, VACUUM INTO falla si el archivo de salida ya existe previamente.
    if (fs.existsSync(rutaUltimo)) {
      fs.unlinkSync(rutaUltimo);
    }

    // 3. Normalizar la ruta con barras diagonales (/) para compatibilidad con la sintaxis SQL de SQLite
    const sqlSafePath = rutaUltimo.replace(/\\/g, "/");

    // 4. Ejecutar el comando SQLite nativo VACUUM INTO
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlSafePath}'`);

    // 5. Verificar que el archivo se haya creado correctamente y copiar al historial
    if (!fs.existsSync(rutaUltimo)) {
      throw new Error(`El archivo de respaldo no fue generado en: ${rutaUltimo}`);
    }

    const stat = fs.statSync(rutaUltimo);
    if (stat.size === 0) {
      throw new Error("El archivo de respaldo generado tiene tamaño de 0 bytes.");
    }

    // 6. Copiar a la subcarpeta de historial fechado y a la carpeta local del proyecto
    fs.copyFileSync(rutaUltimo, rutaHistorial);
    fs.copyFileSync(rutaUltimo, rutaLocal);

    // 7. Rotación y retención automática: conservar únicamente los últimos 15 respaldos
    const eliminadosLocal = purgarRespaldosExcedentes(carpetaLocal, 15);
    const eliminadosHistorial = purgarRespaldosExcedentes(carpetaHistorial, 15);

    console.log(
      `[RESPALDO EXITOSO] Motivo: ${motivo} | Bytes: ${stat.size} | Archivo: ${rutaUltimo} | Historial: ${rutaHistorial} | Purgados Local/Ext: ${eliminadosLocal}/${eliminadosHistorial}`
    );

    return {
      success: true,
      timestamp,
      rutaUltimo,
      rutaHistorial,
      tamanioBytes: stat.size,
      mensaje: `Respaldo en caliente completado con éxito (${stat.size} bytes).`,
    };
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR EN RESPALDO SQLite] Fallo durante respaldo (${motivo}):`, errorMensaje);

    return {
      success: false,
      timestamp,
      rutaUltimo,
      rutaHistorial,
      tamanioBytes: 0,
      mensaje: `No se pudo completar el respaldo en caliente: ${errorMensaje}`,
      error: errorMensaje,
    };
  }
}
