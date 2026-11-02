import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function seedSeguridad() {
  console.log("Configurando protocolo de 3 factores en SQLite para admin...");

  const pinHash = await bcrypt.hash("123456", 10);
  const respuestaHash = await bcrypt.hash("pos2026", 10);

  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (admin) {
    await prisma.user.update({
      where: { username: "admin" },
      data: {
        documentoIdentidad: admin.documentoIdentidad || "900123456",
        pinSeguridadHash: admin.pinSeguridadHash || pinHash,
        preguntaSeguridad: admin.preguntaSeguridad || "¿Cuál es la clave de seguridad institucional de LLANOMIO?",
        respuestaSeguridadHash: admin.respuestaSeguridadHash || respuestaHash,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
    });
    console.log("-> [OK] Usuario admin configurado con verificación de 3 factores.");
  }

  // Asegurar que cajeros tengan documento por defecto si no lo tienen
  const cajero = await prisma.user.findUnique({ where: { username: "cajero" } });
  if (cajero) {
    await prisma.user.update({
      where: { username: "cajero" },
      data: {
        documentoIdentidad: cajero.documentoIdentidad || "1121890001",
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
    });
    console.log("-> [OK] Usuario cajero configurado con documento de identidad.");
  }
}

seedSeguridad()
  .catch((e) => {
    console.error("Error al configurar 3 factores:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
