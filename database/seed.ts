import { PrismaClient, RolUsuario, FormatoImpresion } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  PERMISOS_DEFAULT_ADMIN,
  sincronizarArchivoCredencialesMaestras,
} from "../src/lib/usuarios-sync";

const prisma = new PrismaClient();

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

/**
 * SEMBRADO DE FÁBRICA COMERCIAL VIRGEN (CLEAN SLATE)
 * Deja la base de datos en estado 100% puro para nuevas tiendas o instalaciones comerciales:
 * - 1 Usuario Administrador General inicial.
 * - 1 Registro neutro y limpio de ConfiguracionEmpresa.
 * - 9 Categorías base limpias de Gastos Operativos y Nómina.
 * - 1 Secuencia de Facturación inicial en folio 1000 (primer comprobante: N° 1001).
 * - CERO clientes, CERO productos/prendas, CERO cajeros secundarios y CERO facturas.
 */
export async function seedBaseDeDatos(prismaClient: PrismaClient = prisma) {
  console.log("Iniciando sembrado neutro de fábrica en SQLite (Seed Limpio Comercial)...");

  // 1. Registro Neutro de Empresa (ConfiguracionEmpresa)
  await prismaClient.configuracionEmpresa.deleteMany({});
  await prismaClient.configuracionEmpresa.create({
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
        "Configure aquí los requisitos, políticas y condiciones de su negocio desde el panel de Configuración de Empresa.",
      piePaginaFactura: "¡Gracias por su compra y confianza!",
      formatoPredeterminado: "MEDIA_CARTA_DOBLE",
      formatoImpresionDefault: FormatoImpresion.MEDIA_CARTA_DOBLE,
      rutaCarpetaRespaldo: "C:\\POS_BACKUPS",
      tarifaMoraDiariaDefault: 3000,
      ultimoAbonoAlquiler: 20000,
      ultimoAbonoApartado: 20000,
      abrirCajonAutoEfectivo: true,
      pinCajon: 0,
      nombreImpresoraPos: "",
    },
  });
  console.log("-> [OK] Configuración empresarial neutra de fábrica creada.");

  // 2. Cuenta Única de Administrador Inicial (admin / admin123)
  const passwordAdminHash = await bcrypt.hash("admin123", 10);
  const pinInicialHash = await bcrypt.hash("000000", 10);
  const respuestaInicialHash = await bcrypt.hash("admin", 10);

  await prismaClient.user.deleteMany({});
  const adminUser = await prismaClient.user.create({
    data: {
      username: "admin",
      nombre: "Administrador Principal",
      passwordHash: passwordAdminHash,
      rol: RolUsuario.ADMIN,
      activo: true,
      permisos: JSON.stringify(PERMISOS_DEFAULT_ADMIN),
      documentoIdentidad: "0000000000",
      pinSeguridadHash: pinInicialHash,
      preguntaSeguridad: "¿Cuál es la clave de seguridad de recuperación del sistema?",
      respuestaSeguridadHash: respuestaInicialHash,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      requiereCambioClave: true,
    },
  });
  console.log(`-> [OK] Administrador inicial configurado: @${adminUser.username} (Rol: ${adminUser.rol})`);

  // 3. Reiniciar Secuencia de Facturación a 1000 (Primera factura será N° 1001)
  await prismaClient.secuenciaFactura.upsert({
    where: { id: "FACTURA_SECUENCIA" },
    update: { ultimoFolio: 1000 },
    create: {
      id: "FACTURA_SECUENCIA",
      ultimoFolio: 1000,
    },
  });
  console.log("-> [OK] Secuencia de facturas reiniciada a 1000 (Próxima factura: N° 1001).");

  // 4. Sembrado de las 9 Categorías Base de Gastos
  await prismaClient.gasto.deleteMany({});
  await prismaClient.empleadoGasto.deleteMany({});
  await prismaClient.categoriaGasto.deleteMany({});

  for (const cat of CATEGORIAS_GASTO_BASE) {
    await prismaClient.categoriaGasto.create({
      data: {
        nombre: cat.nombre,
        requiereEmpleado: cat.requiereEmpleado,
        esPredeterminada: cat.esPredeterminada,
        activa: true,
      },
    });
  }
  console.log("-> [OK] 9 Categorías base de gastos y nómina sembradas exitosamente.");

  // 5. Sincronizar directorio de USUARIOS_Y_CREDENCIALES_MAESTRAS.md
  await sincronizarArchivoCredencialesMaestras(prismaClient);
  console.log("-> [OK] Archivo maestro de credenciales sincronizado.");

  console.log("Sembrado neutro de fábrica completado exitosamente.");
}

// Ejecución directa si se invoca desde la consola
if (require.main === module) {
  seedBaseDeDatos()
    .catch((e) => {
      console.error("Error durante el seed de fábrica:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
