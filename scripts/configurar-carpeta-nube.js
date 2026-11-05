/**
 * ASISTENTE DE CONFIGURACION DE CARPETA DE RESPALDO COMPARTIDA CON LA NUBE
 * POS Local LLANOMIO
 *
 * Detecta automaticamente servicios de sincronizacion en la nube (OneDrive,
 * Google Drive Desktop, Dropbox) y configura el directorio de replica externa
 * tanto en .env (CLOUD_BACKUP_PATH) como en SQLite (ConfiguracionEmpresa).
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(PROJECT_ROOT, ".env");

/**
 * Escanea el sistema de archivos buscando directorios base de servicios Cloud sincronizados
 */
function detectarCarpetasNubeCandidatas() {
  const candidatas = [];
  const userProfile = process.env.USERPROFILE || "";
  const oneDriveEnv = process.env.OneDrive || "";

  // 1. Microsoft OneDrive
  const rutasOneDrive = [
    oneDriveEnv ? path.join(oneDriveEnv, "POS_LLANOMIO_BACKUPS_NUBE") : null,
    userProfile ? path.join(userProfile, "OneDrive", "POS_LLANOMIO_BACKUPS_NUBE") : null,
  ].filter(Boolean);

  for (const ruta of rutasOneDrive) {
    const carpetaPadre = path.dirname(ruta);
    if (fs.existsSync(carpetaPadre) && !candidatas.some((c) => c.ruta === ruta)) {
      candidatas.push({
        proveedor: "Microsoft OneDrive",
        ruta,
        carpetaPadre,
        existePadre: true,
      });
      break;
    }
  }

  // 2. Google Drive Desktop
  const rutasGoogleDrive = [
    userProfile ? path.join(userProfile, "Google Drive", "POS_LLANOMIO_BACKUPS_NUBE") : null,
    "G:\\Mi unidad\\POS_LLANOMIO_BACKUPS_NUBE",
    "G:\\My Drive\\POS_LLANOMIO_BACKUPS_NUBE",
  ].filter(Boolean);

  for (const ruta of rutasGoogleDrive) {
    const carpetaPadre = path.dirname(ruta);
    if (fs.existsSync(carpetaPadre) && !candidatas.some((c) => c.ruta === ruta)) {
      candidatas.push({
        proveedor: "Google Drive Desktop",
        ruta,
        carpetaPadre,
        existePadre: true,
      });
      break;
    }
  }

  // 3. Dropbox
  const rutasDropbox = [
    userProfile ? path.join(userProfile, "Dropbox", "POS_LLANOMIO_BACKUPS_NUBE") : null,
  ].filter(Boolean);

  for (const ruta of rutasDropbox) {
    const carpetaPadre = path.dirname(ruta);
    if (fs.existsSync(carpetaPadre) && !candidatas.some((c) => c.ruta === ruta)) {
      candidatas.push({
        proveedor: "Dropbox",
        ruta,
        carpetaPadre,
        existePadre: true,
      });
      break;
    }
  }

  return candidatas;
}

/**
 * Actualiza la variable CLOUD_BACKUP_PATH en el archivo .env de forma segura
 */
function guardarRutaEnEnv(rutaNube) {
  let contenido = "";
  if (fs.existsSync(RUTA_ENV)) {
    contenido = fs.readFileSync(RUTA_ENV, "utf-8");
  }

  const lineas = contenido.split(/\r?\n/);
  let encontrada = false;
  const nuevasLineas = lineas.map((linea) => {
    if (linea.trim().startsWith("CLOUD_BACKUP_PATH=")) {
      encontrada = true;
      return `CLOUD_BACKUP_PATH="${rutaNube}"`;
    }
    return linea;
  });

  if (!encontrada) {
    nuevasLineas.push(`CLOUD_BACKUP_PATH="${rutaNube}"`);
  }

  fs.writeFileSync(RUTA_ENV, nuevasLineas.join("\n").trim() + "\n", "utf-8");
  process.env.CLOUD_BACKUP_PATH = rutaNube;
}

/**
 * Actualiza rutaCarpetaRespaldo en ConfiguracionEmpresa si Prisma esta disponible
 */
async function actualizarRutaEnBaseDatos(rutaNube) {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    const config = await prisma.configuracionEmpresa.findFirst();
    if (config) {
      await prisma.configuracionEmpresa.update({
        where: { id: config.id },
        data: { rutaCarpetaRespaldo: rutaNube },
      });
    }
    await prisma.$disconnect();
    return true;
  } catch (err) {
    // Si la base aun no esta migrada o se ejecuta en etapa previa, no interrumpe el flujo
    return false;
  }
}

/**
 * Crea la carpeta de respaldo y sus subcarpetas de estructura
 */
function asegurarEstructuraCarpetaNube(rutaDestino) {
  if (!fs.existsSync(rutaDestino)) {
    fs.mkdirSync(rutaDestino, { recursive: true });
  }
  const subcarpetas = [
    "historial",
    "inventario",
    "clientes",
    "historial_facturas",
    "movimientos_caja",
    "gastos_operativos",
  ];
  for (const sub of subcarpetas) {
    const dir = path.join(rutaDestino, sub);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Continuar si la carpeta esta protegida o no permite creacion directa
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const esModoAuto = args.includes("--auto") || args.includes("--silencioso");

  console.log("===============================================================================");
  console.log("      CONFIGURACION DE CARPETA DE RESPALDOS COMPARTIDA CON LA NUBE");
  console.log("                           SISTEMA POS LLANOMIO");
  console.log("===============================================================================\n");

  const candidatas = detectarCarpetasNubeCandidatas();

  if (esModoAuto) {
    let rutaElegida = "C:\\POS_BACKUPS";
    if (candidatas.length > 0) {
      rutaElegida = candidatas[0].ruta;
      console.log(`[AUTO-DETECCION] Servicio detectado: ${candidatas[0].proveedor}`);
    } else {
      console.log("[AUTO-DETECCION] No se detectaron carpetas cloud; usando ruta por defecto.");
    }
    asegurarEstructuraCarpetaNube(rutaElegida);
    guardarRutaEnEnv(rutaElegida);
    await actualizarRutaEnBaseDatos(rutaElegida);
    console.log(`[OK] Carpeta configurada: ${rutaElegida}`);
    process.exit(0);
  }

  console.log("Servicios de almacenamiento en la nube detectados en este equipo:\n");

  let opcionIdx = 1;
  const mapaOpciones = {};

  for (const c of candidatas) {
    console.log(`  [${opcionIdx}] ${c.proveedor}:`);
    console.log(`      -> ${c.ruta}`);
    mapaOpciones[String(opcionIdx)] = c.ruta;
    opcionIdx++;
  }

  const optPersonalizada = String(opcionIdx);
  console.log(`  [${optPersonalizada}] Especificar otra ruta de carpeta en la nube manualmente`);
  opcionIdx++;

  const optLocal = String(opcionIdx);
  console.log(`  [${optLocal}] Omitir sincronizacion cloud (utilizar solo local C:\\POS_BACKUPS)`);

  console.log("\n===============================================================================");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const preguntar = (pregunta) => new Promise((resolve) => rl.question(pregunta, resolve));

  const seleccion = (await preguntar(`>> Seleccione una opcion [1-${optLocal}, Enter = 1]: `)).trim() || "1";

  let rutaFinal = "C:\\POS_BACKUPS";

  if (mapaOpciones[seleccion]) {
    rutaFinal = mapaOpciones[seleccion];
  } else if (seleccion === optPersonalizada) {
    const rutaManual = (await preguntar(">> Ingrese la ruta completa de la carpeta sincronizada: ")).trim();
    if (rutaManual) {
      rutaFinal = path.isAbsolute(rutaManual) ? rutaManual : path.resolve(PROJECT_ROOT, rutaManual);
    }
  } else if (seleccion === optLocal) {
    rutaFinal = "C:\\POS_BACKUPS";
  } else if (candidatas.length > 0) {
    rutaFinal = candidatas[0].ruta;
  }

  rl.close();

  console.log("\n[PROCESANDO] Configurando directorios y permisos de replicacion...");
  try {
    asegurarEstructuraCarpetaNube(rutaFinal);
    guardarRutaEnEnv(rutaFinal);
    await actualizarRutaEnBaseDatos(rutaFinal);

    console.log("[OK] Carpeta de nube registrada exitosamente.");
    console.log(`  - Ruta configurada: ${rutaFinal}`);
    console.log("  - Triple espejo activado: Base interna + Boveda C:\\POS_BACKUPS + Nube Compartida.");
  } catch (err) {
    console.error("[ERROR] No se pudo configurar la carpeta de nube:", err.message);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[ERROR CRITICO]", err);
    process.exit(1);
  });
}

module.exports = {
  detectarCarpetasNubeCandidatas,
  guardarRutaEnEnv,
  asegurarEstructuraCarpetaNube,
};

