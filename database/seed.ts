import { PrismaClient, RolUsuario, FormatoImpresion } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando sembrado inicial de base de datos (Seed)...");

  // 1. Crear o verificar la configuración base de la empresa LLANOMIO
  const configExistente = await prisma.configuracionEmpresa.findFirst();

  if (!configExistente) {
    await prisma.configuracionEmpresa.create({
      data: {
        nombreTienda: "LLANOMIO",
        nombreComercial: "LLANOMIO",
        nit: "900.123.456-7",
        direccion: "Calle Principal #10-20, Villavicencio, Meta",
        telefono: "3101234567",
        logoUrl: null,
        politicasFactura:
          "Términos y Condiciones: Las prendas en alquiler deben devolverse en las mismas condiciones recibidas. El retraso en la entrega genera recargo por mora según la tarifa establecida. Cuide su comprobante de pago.",
        formatoImpresionDefault: FormatoImpresion.TIRILLA,
        rutaCarpetaRespaldo: "C:\\POS_LLANOMIO_BACKUPS",
      },
    });
    console.log("Configuracion base de LLANOMIO creada exitosamente.");
  } else {
    // Asegurar que nombreTienda esté asignado si venía de versión previa
    if (!configExistente.nombreTienda) {
      await prisma.configuracionEmpresa.update({
        where: { id: configExistente.id },
        data: { nombreTienda: configExistente.nombreComercial || "LLANOMIO" },
      });
    }
    console.log("Configuracion de empresa verificada.");
  }

  // 2. Crear o actualizar el Administrador General (admin / admin123)
  const passwordAdminHash = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      nombre: "Administrador General",
      rol: RolUsuario.ADMIN,
      activo: true,
    },
    create: {
      username: "admin",
      nombre: "Administrador General",
      passwordHash: passwordAdminHash,
      rol: RolUsuario.ADMIN,
      activo: true,
    },
  });
  console.log(`Usuario administrador listo: ${adminUser.username} (Rol: ${adminUser.rol})`);

  // 3. Crear o actualizar un Cajero de prueba inicial (cajero / cajero123)
  const passwordCajeroHash = await bcrypt.hash("cajero123", 10);
  const cajeroUser = await prisma.user.upsert({
    where: { username: "cajero" },
    update: {
      nombre: "Cajero Principal",
      rol: RolUsuario.CAJERO,
      activo: true,
    },
    create: {
      username: "cajero",
      nombre: "Cajero Principal",
      passwordHash: passwordCajeroHash,
      rol: RolUsuario.CAJERO,
      activo: true,
    },
  });
  console.log(`Usuario cajero listo: ${cajeroUser.username} (Rol: ${cajeroUser.rol})`);

  console.log("Proceso de Seed completado con exito.");
}

main()
  .catch((e) => {
    console.error("Error durante el seed de la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
