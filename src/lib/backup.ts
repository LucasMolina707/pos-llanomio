import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
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
 * Copia segura con reintentos para evitar colisiones EBUSY/EPERM con OneDrive o Google Drive
 */
async function copiarConReintento(
  origen: string,
  destino: string,
  maxIntentos = 3,
  esperaMs = 800
): Promise<boolean> {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      if (fs.existsSync(destino)) {
        try {
          fs.unlinkSync(destino);
        } catch {
          // Continuar e intentar sobrescritura directa
        }
      }
      fs.copyFileSync(origen, destino);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (intento === maxIntentos) {
        console.warn(
          `[BACKUP NUBE AVISO] Archivo '${path.basename(destino)}' retenido temporalmente por sincronizador cloud (OneDrive/Drive). El respaldo fechado unico permanece 100% seguro: ${msg}`
        );
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }
  return false;
}

/**
 * Obtiene la fecha y hora actual en formato YYYYMMDD_HHmmss_SSS (con precisión a milisegundos).
 */
export function obtenerTimestamp(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");
  const ms = String(ahora.getMilliseconds()).padStart(3, "0");
  return `${anio}${mes}${dia}_${horas}${minutos}${segundos}_${ms}`;
}

/**
 * Genera el nombre descriptivo del archivo según el motivo del respaldo.
 */
export function generarNombreArchivoRespaldo(motivo: string, timestamp: string): string {
  const motivoUpper = motivo.toUpperCase();
  if (motivoUpper.includes("CIERRE")) {
    return `pos_CIERRE_CAJA_${timestamp}.db`;
  }
  if (motivoUpper.includes("GERENCIAL") || motivoUpper === "MANUAL" || motivoUpper.includes("ADMIN")) {
    return `pos_RESPALDO_GERENCIAL_${timestamp}.db`;
  }
  const limpio = motivoUpper.replace(/[^A-Z0-9_]/g, "_");
  return `pos_${limpio}_${timestamp}.db`;
}

/**
 * Purga los respaldos fechados excedentes en un directorio, conservando únicamente
 * los últimos N archivos más recientes según su fecha de modificación (mtime).
 * NUNCA elimina 'pos_ULTIMO.db', 'llanomio.db', '.gitkeep' ni respaldos de emergencia.
 */
export function purgarRespaldosExcedentes(directorio: string, limiteMaximo = 15): number {
  if (!fs.existsSync(directorio)) return 0;
  try {
    const archivos = fs
      .readdirSync(directorio)
      .filter(
        (f) =>
          f.endsWith(".db") &&
          f !== "pos_ULTIMO.db" &&
          f !== "llanomio.db" &&
          f !== ".gitkeep" &&
          !f.startsWith("pos_EMERGENCIA")
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
 * Purga archivos excedentes según su extensión (ej. .json) en un directorio,
 * conservando los últimos N más recientes y protegiendo un archivo maestro.
 */
export function purgarRespaldosExcedentesPorExtension(
  directorio: string,
  extension = ".json",
  limiteMaximo = 15,
  archivoProtegido = ""
): number {
  if (!fs.existsSync(directorio)) return 0;
  try {
    const archivos = fs
      .readdirSync(directorio)
      .filter((f) => f.endsWith(extension) && f !== archivoProtegido)
      .map((nombre) => {
        const rutaCompleta = path.join(directorio, nombre);
        const stats = fs.statSync(rutaCompleta);
        return { nombre, rutaCompleta, mtime: stats.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    const excedentes = archivos.slice(limiteMaximo);
    let eliminados = 0;
    for (const archivo of excedentes) {
      try {
        fs.unlinkSync(archivo.rutaCompleta);
        eliminados++;
      } catch {}
    }
    return eliminados;
  } catch {
    return 0;
  }
}

/**
 * Genera volcados estructurados por carpetas para auditoría e inspección humana:
 * - inventario/ (catálogo de productos, precios y stock)
 * - clientes/ (directorio de clientes y datos fiscales)
 * - historial_facturas/ (últimas facturas, abonos y detalles)
 * - movimientos_caja/ (arqueos, turnos y cierres consolidados)
 */
export async function generarVolcadosEstructurados(
  directorioRaiz: string,
  timestamp: string
): Promise<void> {
  if (!fs.existsSync(directorioRaiz)) {
    try {
      fs.mkdirSync(directorioRaiz, { recursive: true });
    } catch {
      return;
    }
  }

  const subcarpetas = [
    "inventario",
    "clientes",
    "historial_facturas",
    "movimientos_caja",
    "gastos_operativos",
  ];

  for (const sub of subcarpetas) {
    const dir = path.join(directorioRaiz, sub);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  }

  try {
    // 1. Inventario
    const productos = await prisma.producto.findMany({
      orderBy: { nombre: "asc" },
    });
    const dirInventario = path.join(directorioRaiz, "inventario");
    fs.writeFileSync(
      path.join(dirInventario, "inventario_ULTIMO.json"),
      JSON.stringify(productos, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(dirInventario, `inventario_${timestamp}.json`),
      JSON.stringify(productos, null, 2),
      "utf-8"
    );
    purgarRespaldosExcedentesPorExtension(dirInventario, ".json", 15, "inventario_ULTIMO.json");

    // 2. Clientes
    const clientes = await prisma.cliente.findMany({
      orderBy: { nombre: "asc" },
    });
    const dirClientes = path.join(directorioRaiz, "clientes");
    fs.writeFileSync(
      path.join(dirClientes, "clientes_ULTIMO.json"),
      JSON.stringify(clientes, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(dirClientes, `clientes_${timestamp}.json`),
      JSON.stringify(clientes, null, 2),
      "utf-8"
    );
    purgarRespaldosExcedentesPorExtension(dirClientes, ".json", 15, "clientes_ULTIMO.json");

    // 3. Historial Facturas (con abonos y prendas de alquiler)
    const facturas = await prisma.factura.findMany({
      take: 500,
      orderBy: { fechaCreacion: "desc" },
      include: {
        detalles: true,
        abonos: true,
        cliente: {
          select: { id: true, nombre: true, documento: true, telefono: true, telefonoSecundario: true },
        },
      },
    });
    const dirFacturas = path.join(directorioRaiz, "historial_facturas");
    fs.writeFileSync(
      path.join(dirFacturas, "facturas_ULTIMO.json"),
      JSON.stringify(facturas, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(dirFacturas, `facturas_${timestamp}.json`),
      JSON.stringify(facturas, null, 2),
      "utf-8"
    );
    purgarRespaldosExcedentesPorExtension(dirFacturas, ".json", 15, "facturas_ULTIMO.json");

    // 4. Movimientos Caja (turnos y cierres consolidados)
    const cierres = await prisma.cierreCaja.findMany({
      take: 100,
      orderBy: { fechaFin: "desc" },
    });
    const turnos = await prisma.turnoCaja.findMany({
      take: 100,
      orderBy: { fechaApertura: "desc" },
    });
    const movimientos = { cierres, turnos };
    const dirCaja = path.join(directorioRaiz, "movimientos_caja");
    fs.writeFileSync(
      path.join(dirCaja, "movimientos_caja_ULTIMO.json"),
      JSON.stringify(movimientos, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(dirCaja, `movimientos_caja_${timestamp}.json`),
      JSON.stringify(movimientos, null, 2),
      "utf-8"
    );
    purgarRespaldosExcedentesPorExtension(dirCaja, ".json", 15, "movimientos_caja_ULTIMO.json");

    // 5. Gastos Operativos y Nómina
    const gastos = await prisma.gasto.findMany({
      take: 500,
      orderBy: { fecha: "desc" },
      include: { categoria: true },
    });
    const categoriasGasto = await prisma.categoriaGasto.findMany({
      orderBy: { nombre: "asc" },
    });
    const empleadosGasto = await prisma.empleadoGasto.findMany({
      orderBy: { nombreCompleto: "asc" },
    });
    const datosGastos = { gastos, categoriasGasto, empleadosGasto };
    const dirGastos = path.join(directorioRaiz, "gastos_operativos");
    fs.writeFileSync(
      path.join(dirGastos, "gastos_ULTIMO.json"),
      JSON.stringify(datosGastos, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(dirGastos, `gastos_${timestamp}.json`),
      JSON.stringify(datosGastos, null, 2),
      "utf-8"
    );
    purgarRespaldosExcedentesPorExtension(dirGastos, ".json", 15, "gastos_ULTIMO.json");
  } catch (errDump) {
    console.warn("[BACKUP ESTRUCTURADO] Advertencia al generar volcados estructurados:", errDump);
  }
}

/**
 * Abre la carpeta de respaldos en el Explorador de Windows en el servidor local.
 */
export function abrirCarpetaEnExplorador(ruta?: string): { ok: boolean; mensaje: string; ruta: string } {
  const rutaDestino = ruta || "C:\\POS_BACKUPS";
  try {
    if (!fs.existsSync(rutaDestino)) {
      fs.mkdirSync(rutaDestino, { recursive: true });
    }
    exec(`explorer.exe "${rutaDestino}"`, (err) => {
      if (err) {
        console.warn("[EXPLORER] Advertencia al ejecutar explorer.exe:", err);
      }
    });
    return {
      ok: true,
      mensaje: `Carpeta de respaldos abierta en el Explorador de Windows: ${rutaDestino}`,
      ruta: rutaDestino,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      mensaje: `No se pudo abrir la carpeta en el Explorador: ${msg}`,
      ruta: rutaDestino,
    };
  }
}

/**
 * Ejecuta un respaldo en caliente de la base de datos SQLite utilizando VACUUM INTO.
 * Garantiza consistencia atómica sin bloquear ni corromper las transacciones activas.
 */
export async function ejecutarRespaldoEnCaliente(motivo: string = "MANUAL"): Promise<ResultadoRespaldo> {
  const timestamp = obtenerTimestamp();
  const nombreArchivo = generarNombreArchivoRespaldo(motivo, timestamp);

  const carpetaPrincipal = "C:\\POS_BACKUPS";
  const carpetaHistorial = path.join(carpetaPrincipal, "historial");
  const carpetaLocal = path.join(process.cwd(), "database", "backups_locales");

  // Resolver carpeta de sincronización en la nube (Google Drive / OneDrive / Dropbox)
  let carpetaNube: string | null = process.env.CLOUD_BACKUP_PATH || null;
  if (!carpetaNube) {
    try {
      const config = await prisma.configuracionEmpresa.findFirst({
        select: { rutaCarpetaRespaldo: true },
      });
      if (
        config?.rutaCarpetaRespaldo &&
        config.rutaCarpetaRespaldo !== carpetaPrincipal &&
        fs.existsSync(path.dirname(config.rutaCarpetaRespaldo))
      ) {
        carpetaNube = config.rutaCarpetaRespaldo;
      }
    } catch {}
  }

  const rutaUltimo = path.join(carpetaPrincipal, "llanomio_ULTIMO.db");
  const rutaUltimoCompat = path.join(carpetaPrincipal, "pos_ULTIMO.db");
  const rutaLocalUltimo = path.join(carpetaLocal, "llanomio_ULTIMO.db");
  const rutaHistorial = path.join(carpetaHistorial, nombreArchivo);
  const rutaLocal = path.join(carpetaLocal, nombreArchivo);

  try {
    // 1. Asegurar la existencia de los directorios de destino
    if (!fs.existsSync(carpetaPrincipal)) {
      try {
        fs.mkdirSync(carpetaPrincipal, { recursive: true });
      } catch (errDir) {
        console.warn("[BACKUP] No se pudo crear directorio externo C:\\POS_BACKUPS:", errDir);
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

    if (carpetaNube && !fs.existsSync(carpetaNube)) {
      try {
        fs.mkdirSync(carpetaNube, { recursive: true });
      } catch (errNube) {
        console.warn("[BACKUP NUBE] No se pudo crear directorio de nube:", errNube);
      }
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

    // 6. Actualizar copia local maestra llanomio_ULTIMO.db en database/backups_locales
    await copiarConReintento(rutaDestinoInicial, rutaLocalUltimo);

    // 7. Replicar a la bóveda local C:\POS_BACKUPS (llanomio_ULTIMO.db, pos_ULTIMO.db y subcarpeta historial)
    try {
      if (fs.existsSync(carpetaPrincipal)) {
        await copiarConReintento(rutaDestinoInicial, rutaUltimo);
        await copiarConReintento(rutaDestinoInicial, rutaUltimoCompat);

        if (fs.existsSync(carpetaHistorial)) {
          fs.copyFileSync(rutaDestinoInicial, rutaHistorial);
        }
      }
    } catch (errCopiaExterna) {
      console.warn("[BACKUP] Advertencia al replicar en almacenamiento externo C:\\POS_BACKUPS:", errCopiaExterna);
    }

    // 8. Replicar en la carpeta compartida con la NUBE (Google Drive / OneDrive / Dropbox)
    if (carpetaNube && fs.existsSync(carpetaNube)) {
      try {
        const rutaNubeUltimo = path.join(carpetaNube, "llanomio_ULTIMO.db");
        const rutaNubeUltimoCompat = path.join(carpetaNube, "pos_ULTIMO.db");
        const carpetaNubeHistorial = path.join(carpetaNube, "historial");

        if (!fs.existsSync(carpetaNubeHistorial)) {
          fs.mkdirSync(carpetaNubeHistorial, { recursive: true });
        }

        await copiarConReintento(rutaDestinoInicial, rutaNubeUltimo);
        await copiarConReintento(rutaDestinoInicial, rutaNubeUltimoCompat);

        fs.copyFileSync(rutaDestinoInicial, path.join(carpetaNubeHistorial, nombreArchivo));

        // Respaldo de configuración de entorno (.env.backup)
        const rutaEnv = path.join(process.cwd(), ".env");
        if (fs.existsSync(rutaEnv)) {
          fs.copyFileSync(rutaEnv, path.join(carpetaNube, ".env.backup"));
        }

        purgarRespaldosExcedentes(carpetaNubeHistorial, 15);
      } catch (errCloudCopy) {
        console.warn("[BACKUP NUBE] Advertencia al replicar en carpeta compartida con la nube:", errCloudCopy);
      }
    }

    // 9. Generar volcados estructurados por carpetas (inventario, clientes, facturas, caja, gastos)
    try {
      await generarVolcadosEstructurados(carpetaLocal, timestamp);
      if (fs.existsSync(carpetaPrincipal)) {
        await generarVolcadosEstructurados(carpetaPrincipal, timestamp);
      }
      if (carpetaNube && fs.existsSync(carpetaNube)) {
        await generarVolcadosEstructurados(carpetaNube, timestamp);
      }
    } catch (errDump) {
      console.warn("[BACKUP] Advertencia al generar volcados estructurados:", errDump);
    }

    // 10. Rotación y retención automática: conservar únicamente los últimos 15 respaldos
    const eliminadosLocal = purgarRespaldosExcedentes(carpetaLocal, 15);
    const eliminadosHistorial = fs.existsSync(carpetaHistorial)
      ? purgarRespaldosExcedentes(carpetaHistorial, 15)
      : 0;

    console.log(
      `[RESPALDO EXITOSO - TRIPLE ESPEJO] Motivo: ${motivo} | Bytes: ${stat.size} | Archivo: ${nombreArchivo} | Nube: ${carpetaNube || "No configurada"}`
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
 * 3. Comprueba que contenga las tablas esenciales del sistema POS.
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
        error: `El archivo SQLite no corresponde a una base de datos del POS (tablas esenciales no encontradas en el esquema).`,
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
  const carpetaPrincipal = "C:\\POS_BACKUPS";

  const rutaEmergenciaLocal = path.join(
    carpetaBackupsLocales,
    `pos_EMERGENCIA_PRE_RESTAURACION_${timestamp}.db`
  );
  const rutaEmergenciaExterna = path.join(
    carpetaPrincipal,
    `pos_EMERGENCIA_PRE_RESTAURACION_${timestamp}.db`
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
        const rutaEmergenciaFija = path.join(carpetaPrincipal, "pos_EMERGENCIA_PRE_RESTAURACION.db");
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
