/**
 * SEMBRADOR OFICIAL DE VITRINA COMERCIAL: AURORA POS
 *
 * Inicializa una base de datos completamente limpia con identidad Aurora POS:
 * - 1 Configuración de empresa comercial ("Aurora POS" + logo /iconos/aurora.png)
 * - 2 Usuarios demostrativos: admin (ADMIN) y cajero (CAJERO)
 * - 5 Productos de VENTA + 5 Productos de ALQUILER
 * - 4 Clientes demostrativos (Mostrador, Persona Natural, Crédito Natural y Empresa NIT/IVA)
 * - 9 Categorías base de gastos operativos y secuencia de facturación en 1000
 *
 * Modos de uso:
 * - Por defecto (idempotente en arranque Docker): solo siembra si la base está vacía.
 * - Con flag --reset: limpia todos los movimientos y deja la vitrina recién instalada.
 */

const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// Resolver ruta canonica de SQLite igual que start-pos.js
const rawDbUrl = process.env.DATABASE_URL || "file:./aurorapos.db";
const cleanDbTarget = rawDbUrl.replace(/^file:/, "");
const canonicalDbPath = path.isAbsolute(cleanDbTarget)
  ? cleanDbTarget
  : path.resolve(__dirname, "..", "database", path.basename(cleanDbTarget));
process.env.DATABASE_URL = `file:${canonicalDbPath.replace(/\\/g, "/")}`;

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

const PERMISOS_ADMIN = {
  pos_facturar: true,
  pos_cobrar_cartera: true,
  caja_abrir_cerrar: true,
  inventario_crear_rapido: true,
  pos_editar_precios: true,
};

const PERMISOS_CAJERO = {
  pos_facturar: true,
  pos_cobrar_cartera: true,
  caja_abrir_cerrar: true,
  inventario_crear_rapido: false,
  pos_editar_precios: false,
};

const CATEGORIAS_GASTO_BASE = [
  { nombre: "Compra a Proveedores", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Gasto Administrativo", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Pago de Nómina", requiereEmpleado: true, esPredeterminada: true },
  { nombre: "Gasto de Empleados", requiereEmpleado: true, esPredeterminada: true },
  { nombre: "Reposición de Bienes del Almacén", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Herramientas y Equipos", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Insumos Operativos y Lavandería", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Arriendo Comercial", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Servicios Públicos", requiereEmpleado: false, esPredeterminada: true },
];

const PRODUCTOS_VITRINA = [
  // 5 PRODUCTOS DE VENTA
  {
    codigo: "VTA-001",
    nombre: "Camisa Oxford Ejecutiva Slim Fit",
    tipo: "VENTA",
    categoria: "Camisería Ejecutiva",
    talla: "M",
    color: "Blanca",
    stockActual: 15,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 55000,
    precioVenta: 89000,
    precioAlquilerBase: 0,
    activo: true,
  },
  {
    codigo: "VTA-002",
    nombre: "Pantalón Drill Clásico Corporativo",
    tipo: "VENTA",
    categoria: "Pantalones",
    talla: "32",
    color: "Azul Oscuro",
    stockActual: 12,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 72000,
    precioVenta: 119000,
    precioAlquilerBase: 0,
    activo: true,
  },
  {
    codigo: "VTA-003",
    nombre: "Cinturón en Cuero Genuino Doble Faz",
    tipo: "VENTA",
    categoria: "Accesorios",
    talla: "Única",
    color: "Negro / Café",
    stockActual: 20,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 38000,
    precioVenta: 65000,
    precioAlquilerBase: 0,
    activo: true,
  },
  {
    codigo: "VTA-004",
    nombre: "Corbata Seda Italiana Edición Gala",
    tipo: "VENTA",
    categoria: "Accesorios",
    talla: "Única",
    color: "Vino Tinto",
    stockActual: 18,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 28000,
    precioVenta: 49000,
    precioAlquilerBase: 0,
    activo: true,
  },
  {
    codigo: "VTA-005",
    nombre: "Kit de Cuidado y Limpieza Textil Premium",
    tipo: "VENTA",
    categoria: "Cuidado Textil",
    talla: "Única",
    color: "Neutro",
    stockActual: 25,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 22000,
    precioVenta: 39000,
    precioAlquilerBase: 0,
    activo: true,
  },
  // 5 PRODUCTOS DE ALQUILER
  {
    codigo: "ALQ-001",
    nombre: "Smoking Clásico de Gala Completo",
    tipo: "ALQUILER",
    categoria: "Trajes de Gala",
    talla: "L",
    color: "Negro",
    stockActual: 4,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 140000,
    precioVenta: 0,
    precioAlquilerBase: 160000,
    tiempoAlquilerBaseHoras: 48,
    tarifaMora: 20000,
    unidadMora: "DIA",
    tarifaMoraPorDia: 20000,
    tarifaMoraPorHora: 3000,
    activo: true,
  },
  {
    codigo: "ALQ-002",
    nombre: "Vestido Largo de Noche Corte Imperial",
    tipo: "ALQUILER",
    categoria: "Vestidos de Fiesta",
    talla: "S",
    color: "Azul Rey",
    stockActual: 3,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 160000,
    precioVenta: 0,
    precioAlquilerBase: 185000,
    tiempoAlquilerBaseHoras: 48,
    tarifaMora: 25000,
    unidadMora: "DIA",
    tarifaMoraPorDia: 25000,
    tarifaMoraPorHora: 3500,
    activo: true,
  },
  {
    codigo: "ALQ-003",
    nombre: "Traje Formal Ejecutivo Tres Piezas",
    tipo: "ALQUILER",
    categoria: "Trajes Ejecutivos",
    talla: "M",
    color: "Gris Grafito",
    stockActual: 5,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 115000,
    precioVenta: 0,
    precioAlquilerBase: 135000,
    tiempoAlquilerBaseHoras: 24,
    tarifaMora: 15000,
    unidadMora: "DIA",
    tarifaMoraPorDia: 15000,
    tarifaMoraPorHora: 2500,
    activo: true,
  },
  {
    codigo: "ALQ-004",
    nombre: "Vestido de Cóctel Edición Especial",
    tipo: "ALQUILER",
    categoria: "Vestidos de Fiesta",
    talla: "M",
    color: "Verde Esmeralda",
    stockActual: 3,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 120000,
    precioVenta: 0,
    precioAlquilerBase: 145000,
    tiempoAlquilerBaseHoras: 48,
    tarifaMora: 18000,
    unidadMora: "DIA",
    tarifaMoraPorDia: 18000,
    tarifaMoraPorHora: 2800,
    activo: true,
  },
  {
    codigo: "ALQ-005",
    nombre: "Blazer Smoking Terciopelo Premium",
    tipo: "ALQUILER",
    categoria: "Chaquetas de Gala",
    talla: "L",
    color: "Azul Medianoche",
    stockActual: 2,
    estado: "DISPONIBLE",
    estadoPrenda: "DISPONIBLE",
    precioBase: 95000,
    precioVenta: 0,
    precioAlquilerBase: 115000,
    tiempoAlquilerBaseHoras: 24,
    tarifaMora: 15000,
    unidadMora: "DIA",
    tarifaMoraPorDia: 15000,
    tarifaMoraPorHora: 2500,
    activo: true,
  },
];

const CLIENTES_VITRINA = [
  {
    documento: "222222222222",
    nombre: "Consumidor Final",
    telefono: "3000000000",
    email: "mostrador@aurorapos.com",
    direccion: "Venta directa en mostrador",
    notas: "Cliente genérico predeterminado para ventas rápidas de mostrador.",
    esResponsableIVA: false,
    tipoIdentificacion: "CONSUMIDOR_FINAL",
    digitoVerificacion: null,
    razonSocial: null,
    responsabilidadFiscal: "R-99-PN",
    municipio: "Bogotá D.C.",
    codigoDaneMunicipio: "11001",
    creditoHabilitado: false,
    cupoCredito: 0,
    diasCredito: 0,
  },
  {
    documento: "1020456789",
    nombre: "Carlos Andrés Gómez",
    telefono: "3104567890",
    telefonoSecundario: "3209876543",
    email: "carlos.gomez@cliente.com",
    direccion: "Calle 85 # 15-24 Oficina 302",
    notas: "Cliente frecuente para pruebas de venta y alquiler.",
    esResponsableIVA: false,
    tipoIdentificacion: "CC",
    digitoVerificacion: null,
    razonSocial: null,
    responsabilidadFiscal: "R-99-PN",
    municipio: "Bogotá D.C.",
    codigoDaneMunicipio: "11001",
    creditoHabilitado: false,
    cupoCredito: 0,
    diasCredito: 0,
  },
  {
    documento: "1032987654",
    nombre: "María Fernanda Rojas",
    telefono: "3157894561",
    email: "mrojas@cliente.com",
    direccion: "Carrera 11 # 93-46 Apto 501",
    notas: "Cliente con cupo de cartera aprobado para demostración de ventas a crédito.",
    esResponsableIVA: false,
    tipoIdentificacion: "CC",
    digitoVerificacion: null,
    razonSocial: null,
    responsabilidadFiscal: "R-99-PN",
    municipio: "Bogotá D.C.",
    codigoDaneMunicipio: "11001",
    creditoHabilitado: true,
    cupoCredito: 500000,
    diasCredito: 30,
  },
  {
    documento: "901456789",
    nombre: "Eventos y Producciones Aurora S.A.S.",
    telefono: "6017458900",
    telefonoSecundario: "3186543210",
    email: "facturacion@eventosaurora.com",
    direccion: "Avenida El Dorado # 68C-61 Torre Central",
    notas: "Cliente corporativo Responsable de IVA con línea de crédito empresarial activa.",
    esResponsableIVA: true,
    tipoIdentificacion: "NIT",
    digitoVerificacion: "4",
    razonSocial: "Eventos y Producciones Aurora S.A.S.",
    responsabilidadFiscal: "O-48",
    municipio: "Bogotá D.C.",
    codigoDaneMunicipio: "11001",
    creditoHabilitado: true,
    cupoCredito: 1500000,
    diasCredito: 30,
  },
];

async function ejecutarSemillaVitrina() {
  const modoReset = process.argv.includes("--reset");
  const totalUsuarios = await prisma.user.count();
  const totalProductos = await prisma.producto.count();

  if (!modoReset && totalUsuarios > 0 && totalProductos > 0) {
    console.log(
      `[AURORA VITRINA] Base de datos existente detectada (${totalUsuarios} usuarios, ${totalProductos} productos). Se conserva intacta.`
    );
    return;
  }

  console.log("=================================================================");
  console.log(
    modoReset
      ? "[AURORA VITRINA] REINICIANDO VITRINA COMERCIAL A ESTADO LIMPIO..."
      : "[AURORA VITRINA] INICIALIZANDO BASE DE DATOS NUEVA DE AURORA POS..."
  );
  console.log("=================================================================");

  if (modoReset) {
    await prisma.abono.deleteMany({});
    await prisma.detalleFactura.deleteMany({});
    await prisma.movimientoCartera.deleteMany({});
    await prisma.factura.deleteMany({});
    await prisma.turnoCaja.deleteMany({});
    await prisma.cierreCaja.deleteMany({});
    await prisma.gasto.deleteMany({});
    await prisma.subcategoriaGasto.deleteMany({});
    await prisma.categoriaGasto.deleteMany({});
    await prisma.empleadoGasto.deleteMany({});
    await prisma.auditoriaSesion.deleteMany({});
    await prisma.producto.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.configuracionEmpresa.deleteMany({});
    await prisma.user.deleteMany({});
  }

  // 1. Configuración de Empresa Aurora POS
  const rutaRespaldo =
    process.env.POS_BACKUP_DIR ||
    (process.platform === "win32" ? "C:\\POS_BACKUPS" : "/app/backups");

  await prisma.configuracionEmpresa.deleteMany({});
  await prisma.configuracionEmpresa.create({
    data: {
      nombreTienda: "Aurora POS",
      nombreComercial: "Aurora POS",
      eslogan: "Sistema Inteligente de Ventas, Alquileres y Control de Caja",
      nit: "901.450.890-1",
      regimenFiscal: "Responsable de IVA",
      direccion: "Centro Empresarial Aurora - Local 101",
      ciudad: "Bogotá D.C. - Colombia",
      telefono: "300 123 4567",
      email: "contacto@aurorapos.com",
      logoUrl: "/iconos/aurora.png",
      encabezadoFactura: "Comprobante Comercial de Operación",
      mostrarVendedorFactura: true,
      politicasFactura:
        "1. Todo alquiler requiere depósito o documento de respaldo vigente.\n2. Los artículos en alquiler deben devolverse en la fecha pactada para evitar recargos por mora.\n3. Conserve este comprobante para entregas, cambios o garantías.",
      piePaginaFactura: "Gracias por preferir Aurora POS - Plataforma Comercial Inteligente",
      formatoPredeterminado: "MEDIA_CARTA_DOBLE",
      formatoImpresionDefault: "MEDIA_CARTA_DOBLE",
      rutaCarpetaRespaldo: rutaRespaldo,
      tarifaMoraDiariaDefault: 15000,
      ultimoAbonoAlquiler: 50000,
      ultimoAbonoApartado: 30000,
      abrirCajonAutoEfectivo: true,
      pinCajon: 0,
      nombreImpresoraPos: "",
    },
  });

  // 2. Usuarios Admin y Cajero
  const adminUser = process.env.AURORA_ADMIN_USER || "admin";
  const adminPass = process.env.AURORA_ADMIN_PASSWORD || "admin123";
  const cajeroPass = process.env.AURORA_CAJERO_PASSWORD || "cajero123";

  const adminPassHash = bcrypt.hashSync(adminPass, 10);
  const cajeroPassHash = bcrypt.hashSync(cajeroPass, 10);
  const pinHash = bcrypt.hashSync("000000", 10);
  const respHash = bcrypt.hashSync("aurora", 10);

  await prisma.user.upsert({
    where: { username: adminUser },
    update: {
      nombre: "Administrador Aurora POS",
      passwordHash: adminPassHash,
      rol: "ADMIN",
      activo: true,
      permisos: JSON.stringify(PERMISOS_ADMIN),
      requiereCambioClave: false,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
    create: {
      username: adminUser,
      nombre: "Administrador Aurora POS",
      passwordHash: adminPassHash,
      rol: "ADMIN",
      activo: true,
      permisos: JSON.stringify(PERMISOS_ADMIN),
      documentoIdentidad: "0000000000",
      pinSeguridadHash: pinHash,
      preguntaSeguridad: "¿Cuál es el nombre del sistema POS?",
      respuestaSeguridadHash: respHash,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      requiereCambioClave: false,
    },
  });

  await prisma.user.upsert({
    where: { username: "cajero" },
    update: {
      nombre: "Cajero Mostrador Demo",
      passwordHash: cajeroPassHash,
      rol: "CAJERO",
      activo: true,
      permisos: JSON.stringify(PERMISOS_CAJERO),
      requiereCambioClave: false,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
    create: {
      username: "cajero",
      nombre: "Cajero Mostrador Demo",
      passwordHash: cajeroPassHash,
      rol: "CAJERO",
      activo: true,
      permisos: JSON.stringify(PERMISOS_CAJERO),
      documentoIdentidad: "1111111111",
      pinSeguridadHash: pinHash,
      preguntaSeguridad: "¿Cuál es el nombre del sistema POS?",
      respuestaSeguridadHash: respHash,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      requiereCambioClave: false,
    },
  });

  // 3. Secuencia de Facturas en 1000
  await prisma.secuenciaFactura.upsert({
    where: { id: "FACTURA_SECUENCIA" },
    update: { ultimoFolio: 1000 },
    create: { id: "FACTURA_SECUENCIA", ultimoFolio: 1000 },
  });

  // 4. Categorías de Gasto
  for (const cat of CATEGORIAS_GASTO_BASE) {
    await prisma.categoriaGasto.upsert({
      where: { nombre: cat.nombre },
      update: { requiereEmpleado: cat.requiereEmpleado, activa: true },
      create: {
        nombre: cat.nombre,
        requiereEmpleado: cat.requiereEmpleado,
        esPredeterminada: cat.esPredeterminada,
        activa: true,
      },
    });
  }

  // 5. Sembrar los 10 Productos Vitrina (5 Venta + 5 Alquiler)
  for (const prod of PRODUCTOS_VITRINA) {
    await prisma.producto.upsert({
      where: { codigo: prod.codigo },
      update: prod,
      create: prod,
    });
  }

  // 6. Sembrar los 4 Clientes Demostrativos
  for (const cli of CLIENTES_VITRINA) {
    await prisma.cliente.upsert({
      where: { documento: cli.documento },
      update: cli,
      create: cli,
    });
  }

  console.log("[AURORA VITRINA] Sembrado completado con exito:");
  console.log("  - Identidad: Aurora POS (/iconos/aurora.png)");
  console.log("  - Productos: 5 de Venta + 5 de Alquiler (10 total)");
  console.log("  - Clientes:  4 perfiles demostrativos");
  console.log(`  - Usuarios:  @${adminUser} (ADMIN) y @cajero (CAJERO)`);
  console.log("=================================================================");
}

ejecutarSemillaVitrina()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[AURORA VITRINA ERROR]", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
