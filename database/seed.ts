import { PrismaClient, RolUsuario, FormatoImpresion } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  PERMISOS_DEFAULT_ADMIN,
  sincronizarArchivoCredencialesMaestras,
} from "../src/lib/usuarios-sync";

const prisma = new PrismaClient();

/**
 * SEMBRADO DE FÁBRICA / FACTORY SEED (CLEAN SLATE)
 * Deja la base de datos en estado virgen para nuevas tiendas o instalaciones desde cero:
 * - 1 Usuario Administrador General inicial.
 * - 1 Registro neutro y limpio de ConfiguracionEmpresa.
 * - CERO clientes, CERO productos/prendas, CERO cajeros secundarios y CERO facturas.
 */
export async function seedBaseDeDatos(prismaClient: PrismaClient = prisma) {
  console.log("Iniciando sembrado neutro de fábrica en SQLite (Seed Limpio)...");

  // 1. Registro Neutro de Empresa (ConfiguracionEmpresa)
  const configExistente = await prismaClient.configuracionEmpresa.findFirst();

  if (!configExistente) {
    await prismaClient.configuracionEmpresa.create({
      data: {
        nombreTienda: "MI EMPRESA POS",
        nombreComercial: "MI EMPRESA POS",
        eslogan: "Sistema de Control POS y Facturación Local",
        nit: "000000000-0",
        regimenFiscal: "No Responsable de IVA",
        direccion: "Dirección Principal",
        ciudad: "Ciudad Comercial",
        telefono: "3000000000",
        email: "contacto@miempresa.com",
        logoUrl: null,
        encabezadoFactura: "Comprobante de Venta y Control Operativo",
        mostrarVendedorFactura: true,
        politicasFactura:
          "Configure aquí los requisitos, políticas y condiciones de su negocio desde el panel de Configuración de Empresa.",
        piePaginaFactura: "¡Gracias por su compra y confianza!",
        formatoPredeterminado: "MEDIA_CARTA",
        formatoImpresionDefault: FormatoImpresion.MEDIA_CARTA,
        rutaCarpetaRespaldo: "C:\\POS_BACKUPS",
      },
    });
    console.log("-> [OK] Configuración empresarial neutra de fábrica creada.");
  } else {
    console.log("-> [OK] Configuración empresarial ya presente.");
  }

  // 2. Cuenta Única de Administrador Inicial (admin / admin123)
  const passwordAdminHash = await bcrypt.hash("admin123", 10);
  const pinInicialHash = await bcrypt.hash("000000", 10);
  const respuestaInicialHash = await bcrypt.hash("pos2026", 10);

  const adminUser = await prismaClient.user.upsert({
    where: { username: "admin" },
    update: {
      nombre: "Administrador Principal",
      rol: RolUsuario.ADMIN,
      activo: true,
      permisos: JSON.stringify(PERMISOS_DEFAULT_ADMIN),
    },
    create: {
      username: "admin",
      nombre: "Administrador Principal",
      passwordHash: passwordAdminHash,
      rol: RolUsuario.ADMIN,
      activo: true,
      permisos: JSON.stringify(PERMISOS_DEFAULT_ADMIN),
      documentoIdentidad: "0000000000",
      pinSeguridadHash: pinInicialHash,
      preguntaSeguridad: "¿Cuál es tu código o palabra secreta de recuperación inicial?",
      respuestaSeguridadHash: respuestaInicialHash,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });

  console.log(`-> [OK] Administrador inicial configurado: @${adminUser.username} (Rol: ${adminUser.rol})`);

  // 3. Sincronizar directorio de USUARIOS_Y_CREDENCIALES_MAESTRAS.md
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
