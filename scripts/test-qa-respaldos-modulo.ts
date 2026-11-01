import * as fs from "fs";
import * as path from "path";
import {
  ejecutarRespaldoEnCaliente,
  validarIntegridadSqlite,
  restaurarBaseDeDatosDesdeBuffer,
} from "../src/lib/backup";
import prisma from "../src/lib/prisma";

async function ejecutarPruebasQA() {
  console.log("=================================================================");
  console.log("   SUITE DE CONTROL DE CALIDAD (QA) - AGENTE 5: MÓDULO RESPALDOS");
  console.log("=================================================================\n");

  let exitos = 0;
  let fallos = 0;

  // ---------------------------------------------------------------------------
  // PRUEBA 1: Respaldo Gerencial en Caliente (VACUUM INTO)
  // ---------------------------------------------------------------------------
  console.log(">> PRUEBA 1: Verificando 'ejecutarRespaldoEnCaliente(\"GERENCIAL\")'...");
  try {
    const resGerencial = await ejecutarRespaldoEnCaliente("GERENCIAL");
    if (!resGerencial.success) {
      throw new Error(`Respaldo gerencial falló: ${resGerencial.error}`);
    }
    if (!resGerencial.nombreArchivo.startsWith("llanomio_RESPALDO_GERENCIAL_")) {
      throw new Error(`Nombre de archivo incorrecto: ${resGerencial.nombreArchivo}`);
    }
    if (resGerencial.tamanioBytes < 20480) {
      throw new Error(`Tamaño de archivo insuficiente (<20KB): ${resGerencial.tamanioBytes} bytes`);
    }
    if (!fs.existsSync(resGerencial.rutaLocal)) {
      throw new Error(`El archivo local no existe: ${resGerencial.rutaLocal}`);
    }
    console.log(`   [OK] Respaldo gerencial generado: ${resGerencial.nombreArchivo} (${Math.round(resGerencial.tamanioBytes / 1024)} KB)`);
    exitos++;
  } catch (err: unknown) {
    console.error("   [ERROR] Prueba 1 falló:", err);
    fallos++;
  }

  // ---------------------------------------------------------------------------
  // PRUEBA 2: Respaldo Automático Post-Cierre de Caja
  // ---------------------------------------------------------------------------
  console.log("\n>> PRUEBA 2: Verificando 'ejecutarRespaldoEnCaliente(\"CIERRE_CAJA\")'...");
  try {
    const resCierre = await ejecutarRespaldoEnCaliente("CIERRE_CAJA");
    if (!resCierre.success) {
      throw new Error(`Respaldo de cierre falló: ${resCierre.error}`);
    }
    if (!resCierre.nombreArchivo.startsWith("llanomio_CIERRE_CAJA_")) {
      throw new Error(`Nombre de archivo de cierre incorrecto: ${resCierre.nombreArchivo}`);
    }
    if (resCierre.tamanioBytes < 20480) {
      throw new Error(`Tamaño insuficiente (<20KB): ${resCierre.tamanioBytes} bytes`);
    }

    const rutaUltimo = path.join("C:\\POS_LLANOMIO_BACKUPS", "llanomio_ULTIMO.db");
    if (fs.existsSync(rutaUltimo)) {
      const statUltimo = fs.statSync(rutaUltimo);
      console.log(`   [OK] Archivo maestro sincronizable llanomio_ULTIMO.db verificado (${Math.round(statUltimo.size / 1024)} KB).`);
    }

    console.log(`   [OK] Respaldo post-cierre generado: ${resCierre.nombreArchivo} (${Math.round(resCierre.tamanioBytes / 1024)} KB)`);
    exitos++;
  } catch (err: unknown) {
    console.error("   [ERROR] Prueba 2 falló:", err);
    fallos++;
  }

  // ---------------------------------------------------------------------------
  // PRUEBA 3: Validación Defensiva de Integridad SQLite
  // ---------------------------------------------------------------------------
  console.log("\n>> PRUEBA 3: Verificando 'validarIntegridadSqlite' (Archivos válidos vs corruptos)...");
  try {
    const rutaDbOriginal = path.join(process.cwd(), "database", "llanomio.db");
    const valOriginal = await validarIntegridadSqlite(rutaDbOriginal);
    if (!valOriginal.valido) {
      throw new Error(`La base de datos original no superó la verificación: ${valOriginal.error}`);
    }
    console.log(`   [OK] Base de datos original válida con tablas: ${valOriginal.tablasDetectadas?.join(", ")}`);

    // Probar con archivo inválido (texto plano falso)
    const rutaFalso = path.join(process.cwd(), "database", "temp_falso.db");
    fs.writeFileSync(rutaFalso, "ESTE NO ES UN ARCHIVO SQLITE VALIDO");
    const valFalso = await validarIntegridadSqlite(rutaFalso);
    if (fs.existsSync(rutaFalso)) fs.unlinkSync(rutaFalso);

    if (valFalso.valido) {
      throw new Error("El archivo falso fue aceptado incorrectamente como válido.");
    }
    console.log(`   [OK] Archivo corrupto rechazado correctamente: "${valFalso.error}"`);
    exitos++;
  } catch (err: unknown) {
    console.error("   [ERROR] Prueba 3 falló:", err);
    fallos++;
  }

  // ---------------------------------------------------------------------------
  // PRUEBA 4: Restauración y Salvaguarda de Emergencia
  // ---------------------------------------------------------------------------
  console.log("\n>> PRUEBA 4: Verificando 'restaurarBaseDeDatosDesdeBuffer' con respaldo de emergencia...");
  try {
    const rutaDbOriginal = path.join(process.cwd(), "database", "llanomio.db");
    const bufferOriginal = fs.readFileSync(rutaDbOriginal);

    const resRestauracion = await restaurarBaseDeDatosDesdeBuffer(bufferOriginal);
    if (!resRestauracion.ok) {
      throw new Error(`Restauración falló: ${resRestauracion.error}`);
    }

    if (!resRestauracion.rutaEmergencia || !fs.existsSync(resRestauracion.rutaEmergencia)) {
      throw new Error("No se localizó la copia de seguridad de emergencia generada.");
    }

    // Verificar que Prisma responde tras reconexión
    const usuarios = await prisma.user.findMany({ select: { username: true, rol: true } });
    if (usuarios.length === 0) {
      throw new Error("No se encontraron usuarios tras la restauración.");
    }

    console.log(`   [OK] Base de datos restaurada exitosamente. Respaldo de emergencia en: ${resRestauracion.rutaEmergencia}`);
    console.log(`   [OK] Conexión de Prisma verificada activa. Usuarios cargados: ${usuarios.map((u) => u.username).join(", ")}`);
    exitos++;
  } catch (err: unknown) {
    console.error("   [ERROR] Prueba 4 falló:", err);
    fallos++;
  }

  // ---------------------------------------------------------------------------
  // RESUMEN FINAL
  // ---------------------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`   RESUMEN QA: ${exitos} PRUEBAS EXITOSAS | ${fallos} FALLOS`);
  console.log("=================================================================\n");

  await prisma.$disconnect();
  process.exit(fallos > 0 ? 1 : 0);
}

ejecutarPruebasQA();

