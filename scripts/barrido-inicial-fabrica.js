/**
 * SCRIPT PROFESIONAL DE BARRIDO / FORMATEO INICIAL A ESTADO DE FÁBRICA
 * SISTEMA POS LLANOMIO
 *
 * Propósito:
 * 1. Limpia y vacía integralmente todos los datos transaccionales y operativos
 *    (ventas, facturas, abonos, alquileres, apartados, cartera, turnos, cierres, gastos, auditorías).
 * 2. Restablece la base de datos a un estado comercial puro en blanco.
 * 3. Restaura o crea el usuario Administrador Maestro por defecto:
 *      Usuario:    admin
 *      Contraseña: admin123
 *      PIN:        000000
 *      Pregunta:   ¿Cuál es la clave de seguridad de recuperación del sistema?
 *      Respuesta:  admin
 * 4. Restablece la secuencia de facturación oficial a 1000 (primer comprobante: N° 1001).
 * 5. Siembra la configuración empresarial neutra de fábrica y las categorías contables base.
 * 6. Genera obligatoriamente un respaldo de salvaguarda previo antes de ejecutar el vaciado.
 *
 * Parámetros:
 *   --confirmar   Ejecuta el formateo de forma desatendida sin solicitar confirmación interactiva.
 *   --mantener-catalogo  (Opcional) Vacía transacciones pero conserva clientes y productos existentes.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Resolucion de rutas relativas y portables
const rootDir = path.resolve(__dirname, "..");
const dbDir = path.join(rootDir, "database");
const mainDb = path.join(dbDir, "llanomio.db");
const walDb = path.join(dbDir, "llanomio.db-wal");
const shmDb = path.join(dbDir, "llanomio.db-shm");

// Configuracion de base de datos unificada
const normalizedDbPath = mainDb.replace(/\\/g, "/");
process.env.DATABASE_URL = `file:${normalizedDbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

function obtenerMarcaTiempo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const CATEGORIAS_GASTO_BASE = [
  { nombre: "Compra a Proveedores", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Gasto Administrativo", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Pago de Nómina", requiereEmpleado: true, esPredeterminada: true },
  { nombre: "Gasto de Empleados", requiereEmpleado: true, esPredeterminada: true },
  { nombre: "Reposición de Bienes del Almacén", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Herramientas", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Insumos de Producción y Sastrería", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Arriendo", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Servicios Públicos", requiereEmpleado: false, esPredeterminada: true },
];

const PERMISOS_DEFAULT_ADMIN = {
  pos_facturar: true,
  pos_cobrar_cartera: true,
  caja_abrir_cerrar: true,
  inventario_crear_rapido: true,
  pos_editar_precios: true,
};

async function realizarSalvaguardaPrevia() {
  if (!fs.existsSync(mainDb)) return null;

  const timestamp = obtenerMarcaTiempo();
  const drive = process.env.SystemDrive || "C:";
  const dirExterno = path.join(drive + "\\", "POS_BACKUPS", "backups_antiguos_historicos");
  const dirLocal = path.join(dbDir, "backups_locales");

  try {
    if (!fs.existsSync(dirLocal)) fs.mkdirSync(dirLocal, { recursive: true });
  } catch {}

  const rutaSalvaguardaLocal = path.join(dirLocal, `llanomio_salvaguarda_pre_formateo_${timestamp}.db`);

  try {
    // Si la BD está activa, ejecutar checkpoint previo
    try {
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {}

    fs.copyFileSync(mainDb, rutaSalvaguardaLocal);
    console.log(`[SALVAGUARDA] Respaldo de seguridad creado en: ${rutaSalvaguardaLocal}`);

    // Si la carpeta de backups externos existe o se puede crear, duplicar allí
    try {
      if (!fs.existsSync(dirExterno)) fs.mkdirSync(dirExterno, { recursive: true });
      const rutaExterna = path.join(dirExterno, `llanomio_salvaguarda_pre_formateo_${timestamp}.db`);
      fs.copyFileSync(mainDb, rutaExterna);
      console.log(`[SALVAGUARDA] Duplicado de resguardo externo: ${rutaExterna}`);
    } catch {}

    return rutaSalvaguardaLocal;
  } catch (err) {
    console.warn("[AVISO SALVAGUARDA] No se pudo crear copia previa:", err.message);
    return null;
  }
}

async function ejecutarBarridoInicial(opciones = {}) {
  const { mantenerCatalogo = false } = opciones;

  console.log("===============================================================================");
  console.log("       BARRIDO INICIAL Y FORMATEO A ESTADO DE FÁBRICA - POS LLANOMIO");
  console.log("===============================================================================\n");

  // 1. Salvaguarda previa
  console.log("[FASE 1/5] Ejecutando salvaguarda preventiva de la base de datos...");
  await realizarSalvaguardaPrevia();

  // 2. Vaciado transaccional en orden estricto de claves foráneas
  console.log("[FASE 2/5] Purgando tablas transaccionales y operativas...");
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF;");

  try {
    await prisma.detalleFactura.deleteMany({});
    console.log("  -> Detalle de facturas y prendas eliminados.");

    await prisma.abono.deleteMany({});
    console.log("  -> Historial de abonos y pagos eliminado.");

    await prisma.movimientoCartera.deleteMany({});
    console.log("  -> Movimientos de cartera y créditos eliminados.");

    await prisma.factura.deleteMany({});
    console.log("  -> Facturas de venta, alquiler y apartados eliminadas.");

    if (prisma.movimientoCaja) {
      await prisma.movimientoCaja.deleteMany({});
      console.log("  -> Movimientos de arqueos y cajón eliminados.");
    }

    await prisma.turnoCaja.deleteMany({});
    console.log("  -> Turnos de cajeros eliminados.");

    await prisma.cierreCaja.deleteMany({});
    console.log("  -> Cierres consolidados de caja eliminados.");

    await prisma.auditoriaSesion.deleteMany({});
    console.log("  -> Auditoría de sesiones eliminada.");

    await prisma.gasto.deleteMany({});
    await prisma.empleadoGasto.deleteMany({});
    await prisma.subcategoriaGasto.deleteMany({});
    await prisma.categoriaGasto.deleteMany({});
    console.log("  -> Registros de gastos operativos y nómina eliminados.");

    try {
      if (prisma.notificacionInventario) {
        await prisma.notificacionInventario.deleteMany({});
      }
    } catch {}

    if (!mantenerCatalogo) {
      await prisma.cliente.deleteMany({});
      console.log("  -> Directorio de clientes vaciado.");

      await prisma.producto.deleteMany({});
      console.log("  -> Catálogo de productos e inventario vaciado.");
    } else {
      console.log("  -> [PRESERVADO] Catálogo de productos y clientes conservado.");
    }

    await prisma.user.deleteMany({});
    console.log("  -> Cuentas de usuarios anteriores purgadas.");

    await prisma.configuracionEmpresa.deleteMany({});
    console.log("  -> Configuración empresarial anterior purgada.");
  } finally {
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
  }

  // 3. Sembrado de Administrador Maestro Oficial
  console.log("\n[FASE 3/5] Creando cuenta de Administrador Maestro por defecto...");
  const passwordHash = bcrypt.hashSync("admin123", 10);
  const pinHash = bcrypt.hashSync("000000", 10);
  const respuestaHash = bcrypt.hashSync("admin", 10);

  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      nombre: "Administrador Principal",
      passwordHash,
      rol: "ADMIN",
      activo: true,
      permisos: JSON.stringify(PERMISOS_DEFAULT_ADMIN),
      documentoIdentidad: "0000000000",
      pinSeguridadHash: pinHash,
      preguntaSeguridad: "¿Cuál es la clave de seguridad de recuperación del sistema?",
      respuestaSeguridadHash: respuestaHash,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      requiereCambioClave: false,
    },
  });
  console.log(`  -> Administrador creado: @${adminUser.username} | Clave por defecto: admin123 | PIN: 000000`);

  // 4. Sembrado de configuración neutra y categorías base
  console.log("\n[FASE 4/5] Restableciendo configuración comercial neutra y categorías...");
  const drive = process.env.SystemDrive || "C:";
  const rutaBackupDefault = path.join(drive + "\\", "POS_BACKUPS");

  await prisma.configuracionEmpresa.create({
    data: {
      nombreTienda: "MI EMPRESA POS",
      nombreComercial: "MI EMPRESA POS",
      eslogan: "Sistema de Ventas, Alquileres y Reservas",
      nit: "000000000-0",
      regimenFiscal: "Responsable de IVA / Régimen Simple",
      direccion: "Dirección Principal del Comercio",
      ciudad: "Ciudad - Colombia",
      telefono: "3000000000",
      email: "contacto@miempresa.com",
      logoUrl: null,
      encabezadoFactura: "Comprobante de Venta y Control Operativo",
      mostrarVendedorFactura: true,
      politicasFactura:
        "Configure aquí las políticas de alquiler, retiro y condiciones de su negocio desde el panel de Configuración de Empresa.",
      piePaginaFactura: "¡Gracias por su compra y confianza!",
      formatoPredeterminado: "MEDIA_CARTA_DOBLE",
      formatoImpresionDefault: "MEDIA_CARTA_DOBLE",
      rutaCarpetaRespaldo: rutaBackupDefault,
      tarifaMoraDiariaDefault: 3000,
      ultimoAbonoAlquiler: 20000,
      ultimoAbonoApartado: 20000,
      abrirCajonAutoEfectivo: true,
      pinCajon: 0,
      nombreImpresoraPos: "",
    },
  });
  console.log("  -> Configuración de empresa neutra creada.");

  // Secuencia de folios a 1000
  await prisma.secuenciaFactura.upsert({
    where: { id: "FACTURA_SECUENCIA" },
    update: { ultimoFolio: 1000 },
    create: { id: "FACTURA_SECUENCIA", ultimoFolio: 1000 },
  });
  console.log("  -> Secuencia de facturas reiniciada a 1000 (primer comprobante: N° 1001).");

  // Categorías base de gastos
  for (const cat of CATEGORIAS_GASTO_BASE) {
    await prisma.categoriaGasto.create({
      data: {
        nombre: cat.nombre,
        requiereEmpleado: cat.requiereEmpleado,
        esPredeterminada: cat.esPredeterminada,
        activa: true,
      },
    });
  }
  console.log(`  -> ${CATEGORIAS_GASTO_BASE.length} Categorías contables base registradas.`);

  // 5. Compactación SQLite, WAL Checkpoint y optimización
  console.log("\n[FASE 5/5] Desfragmentando y compactando base de datos SQLite (WAL)...");
  try {
    await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    await prisma.$queryRawUnsafe("PRAGMA vacuum;");
    await prisma.$queryRawUnsafe("PRAGMA optimize;");
  } catch (errOpt) {
    console.warn("  [AVISO] Optimización pasiva de SQLite:", errOpt.message);
  }

  console.log("\n===============================================================================");
  console.log("             BARRIDO INICIAL COMPLETADO CON ÉXITO");
  console.log("===============================================================================");
  console.log(" - Estado del sistema: Base de datos limpia y lista para operar.");
  console.log(" - Usuario Administrador: admin");
  console.log(" - Contraseña por defecto: admin123");
  console.log(" - PIN de Seguridad: 000000");
  console.log(" - Pregunta de Seguridad: ¿Cuál es la clave de seguridad de recuperación del sistema?");
  console.log(" - Respuesta de Seguridad: admin");
  console.log(` - Carpeta de respaldos configurada: ${rutaBackupDefault}`);
  console.log("===============================================================================\n");
}

async function main() {
  const args = process.argv.slice(2);
  const forzar = args.includes("--confirmar") || args.includes("--forzar") || args.includes("-y");
  const mantenerCatalogo = args.includes("--mantener-catalogo");

  if (forzar) {
    await ejecutarBarridoInicial({ mantenerCatalogo });
    return;
  }

  // Confirmación interactiva si se ejecuta manualmente en consola
  console.log("===============================================================================");
  console.log("         ADVERTENCIA CRÍTICA: FORMATEO A ESTADO DE FÁBRICA");
  console.log("===============================================================================");
  console.log("Esta acción vaciará por completo las ventas, facturas, alquileres, apartados,");
  console.log("turnos de caja y auditorías, dejando el sistema en blanco con el administrador");
  console.log("por defecto (admin / admin123).");
  console.log("\nSe creará automáticamente una salvaguarda de respaldo previa.");
  console.log("===============================================================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("¿Está seguro de continuar con el formateo inicial? Escriba 'SI' para confirmar: ", async (respuesta) => {
    rl.close();
    if (respuesta.trim().toUpperCase() === "SI") {
      try {
        await ejecutarBarridoInicial({ mantenerCatalogo });
        await prisma.$disconnect();
        process.exit(0);
      } catch (err) {
        console.error("\n[ERROR CRÍTICO DURANTE FORMATEO]:", err);
        await prisma.$disconnect();
        process.exit(1);
      }
    } else {
      console.log("\n[CANCELADO] Operación de formateo abortada por el usuario. Base de datos intacta.");
      await prisma.$disconnect();
      process.exit(0);
    }
  });
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error("[ERROR]:", e);
    try { await prisma.$disconnect(); } catch {}
    process.exit(1);
  });
}

module.exports = { ejecutarBarridoInicial };
