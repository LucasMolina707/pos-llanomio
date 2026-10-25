import { PrismaClient, RolUsuario, FormatoImpresion } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando sembrado inicial de base de datos (Seed)...");

  // 1. Crear o verificar la configuración base de la empresa
  const configExistente = await prisma.configuracionEmpresa.findFirst();

  if (!configExistente) {
    await prisma.configuracionEmpresa.create({
      data: {
        nombreComercial: "LLANOMIO",
        nit: "900.123.456-7",
        direccion: "Calle Principal #10-20, Villavicencio, Meta",
        telefono: "3101234567",
        logoUrl: null,
        politicasFactura:
          "Terminos y Condiciones: Las prendas en alquiler deben devolverse en las mismas condiciones recibidas. El retraso en la entrega genera recargo por mora segun la tarifa establecida. Cuide su comprobante de pago.",
        formatoImpresionDefault: FormatoImpresion.TIRILLA,
        rutaCarpetaRespaldo: "C:\\POS_LLANOMIO_BACKUPS",
      },
    });
    console.log("Configuracion base de LLANOMIO creada exitosamente.");
  } else {
    console.log("Configuracion de empresa ya existente, se omite creacion.");
  }

  // 2. Crear o actualizar el Administrador General por defecto
  const passwordAdmin = "admin123";
  const passwordHash = await bcrypt.hash(passwordAdmin, 10);

  const adminUser = await prisma.usuario.upsert({
    where: { usuario: "admin" },
    update: {
      nombre: "Administrador General",
      rol: RolUsuario.ADMIN_GENERAL,
      activo: true,
    },
    create: {
      nombre: "Administrador General",
      usuario: "admin",
      passwordHash: passwordHash,
      rol: RolUsuario.ADMIN_GENERAL,
      activo: true,
    },
  });

  console.log(`Usuario administrador verificado: ${adminUser.usuario} (Rol: ${adminUser.rol})`);
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
