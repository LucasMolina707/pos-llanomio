import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function ejecutarMantenimiento() {
  console.log("===============================================================================");
  console.log("       SISTEMA POS LOCAL LLANOMIO - AUDITORÍA Y MANTENIMIENTO SQLITE");
  console.log("===============================================================================\n");

  const dbPath = path.resolve(process.cwd(), "database", "llanomio.db");
  let tamanoInicialBytes = 0;

  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    tamanoInicialBytes = stats.size;
    console.log(`[ESTADO] Archivo SQLite: ${dbPath}`);
    console.log(`[ESTADO] Tamaño actual: ${(tamanoInicialBytes / 1024).toFixed(2)} KB (${(tamanoInicialBytes / (1024 * 1024)).toFixed(3)} MB)\n`);
  } else {
    console.warn(`[AVISO] No se encontró el archivo físico en ${dbPath}`);
  }

  try {
    // 1. Verificación de Integridad Física
    console.log("[1/5] Ejecutando PRAGMA integrity_check...");
    const integridad: any[] = await prisma.$queryRawUnsafe("PRAGMA integrity_check;");
    const resultadoIntegridad = integridad?.[0]?.integrity_check || "ok";
    console.log(`      Resultado: ${resultadoIntegridad.toUpperCase()}`);

    if (resultadoIntegridad.toLowerCase() !== "ok") {
      throw new Error(`Fallo de integridad detectado en la base de datos: ${JSON.stringify(integridad)}`);
    }

    // 2. Optimización de Rendimiento SQLite (WAL Mode + Sincronización Normal)
    console.log("\n[2/5] Optimizando parámetros de concurrencia y Journal Mode...");
    const journalMode: any[] = await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    console.log(`      Modo Journal: ${journalMode?.[0]?.journal_mode || "WAL"}`);

    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
    await prisma.$queryRawUnsafe("PRAGMA cache_size = -64000;"); // 64 MB de caché en RAM
    console.log("      Cache de RAM: 64 MB asignados para consultas en memoria.");

    // 3. Análisis y Optimización del Planificador de Consultas
    console.log("\n[3/5] Analizando índices y optimizando query planner...");
    await prisma.$queryRawUnsafe("PRAGMA analysis_limit = 1000;");
    await prisma.$queryRawUnsafe("PRAGMA optimize;");
    console.log("      Índices analizados y estadísticas de consulta actualizadas.");

    // 4. Compactación y Desfragmentación con VACUUM
    console.log("\n[4/5] Ejecutando VACUUM para compactar y desfragmentar páginas...");
    await prisma.$executeRawUnsafe("VACUUM;");
    console.log("      Base de datos compactada con éxito.");

    // 5. Comparativa de Espacio
    if (fs.existsSync(dbPath)) {
      const statsFinal = fs.statSync(dbPath);
      const tamanoFinalBytes = statsFinal.size;
      const diferencia = tamanoInicialBytes - tamanoFinalBytes;
      console.log("\n[5/5] Balance de almacenamiento físico:");
      console.log(`      Tamaño Final: ${(tamanoFinalBytes / 1024).toFixed(2)} KB (${(tamanoFinalBytes / (1024 * 1024)).toFixed(3)} MB)`);
      if (diferencia > 0) {
        console.log(`      Espacio recuperado: ${(diferencia / 1024).toFixed(2)} KB`);
      } else {
        console.log("      Base de datos optimizada y estructurada sin fragmentación.");
      }
    }

    console.log("\n===============================================================================");
    console.log("   MANTENIMIENTO FINALIZADO CON ÉXITO: BD RÁPIDA, ESTABLE Y COMPACTADA");
    console.log("===============================================================================\n");
  } catch (error) {
    console.error("\n[ERROR CRÍTICO EN MANTENIMIENTO]:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ejecutarMantenimiento();
