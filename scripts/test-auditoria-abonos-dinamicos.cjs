const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTests() {
  console.log("=== INICIO AUDITORIA ABONOS Y DEPOSITOS DINAMICOS ===");
  let exitCode = 0;

  try {
    // 1. Verificar existencia y defaults en ConfiguracionEmpresa
    const config = await prisma.configuracionEmpresa.findFirst();
    console.log("[1] Registro ConfiguracionEmpresa encontrado:", Boolean(config));
    if (!config) {
      throw new Error("No existe registro en ConfiguracionEmpresa");
    }

    console.log(`    - ultimoAbonoAlquiler: $${config.ultimoAbonoAlquiler}`);
    console.log(`    - ultimoAbonoApartado: $${config.ultimoAbonoApartado}`);

    if (typeof config.ultimoAbonoAlquiler !== "number" || typeof config.ultimoAbonoApartado !== "number") {
      throw new Error("Los campos ultimoAbonoAlquiler o ultimoAbonoApartado no son numéricos");
    }

    // 2. Probar actualización atómica de ultimoAbonoAlquiler
    const valorPruebaAlquiler = 55000;
    await prisma.configuracionEmpresa.updateMany({
      data: { ultimoAbonoAlquiler: valorPruebaAlquiler },
    });
    const configCheck1 = await prisma.configuracionEmpresa.findFirst();
    if (configCheck1.ultimoAbonoAlquiler !== valorPruebaAlquiler) {
      throw new Error(`Fallo actualizando ultimoAbonoAlquiler. Esperado: ${valorPruebaAlquiler}, obtenido: ${configCheck1.ultimoAbonoAlquiler}`);
    }
    console.log("    OK: Actualizacion de ultimoAbonoAlquiler verificada correctamente ($55.000)");

    // 3. Probar actualización atómica de ultimoAbonoApartado
    const valorPruebaApartado = 65000;
    await prisma.configuracionEmpresa.updateMany({
      data: { ultimoAbonoApartado: valorPruebaApartado },
    });
    const configCheck2 = await prisma.configuracionEmpresa.findFirst();
    if (configCheck2.ultimoAbonoApartado !== valorPruebaApartado) {
      throw new Error(`Fallo actualizando ultimoAbonoApartado. Esperado: ${valorPruebaApartado}, obtenido: ${configCheck2.ultimoAbonoApartado}`);
    }
    console.log("    OK: Actualizacion de ultimoAbonoApartado verificada correctamente ($65.000)");

    // 4. Restaurar a los valores por defecto o estándar $20.000 para producción
    await prisma.configuracionEmpresa.updateMany({
      data: {
        ultimoAbonoAlquiler: 20000,
        ultimoAbonoApartado: 20000,
      },
    });
    console.log("    OK: Valores restablecidos con exito a $20.000 por defecto.");

    console.log("=== AUDITORIA FINALIZADA EXITOSAMENTE (TODAS LAS PRUEBAS PASARON) ===");
  } catch (error) {
    console.error("ERROR EN AUDITORIA:", error);
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(exitCode);
  }
}

runTests();

