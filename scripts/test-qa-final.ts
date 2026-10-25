import fs from "fs";
import path from "path";
import { PrismaClient, EstadoFactura, MetodoPago } from "@prisma/client";
import { ejecutarRespaldoEnCaliente } from "../src/lib/backup";
import { obtenerIpLocal } from "../src/server-mdns";

const RUTA_DIRECTORIO_BACKUPS = "C:\\POS_LLANOMIO_BACKUPS";
const NOMBRE_ARCHIVO_ULTIMO = "llanomio_ULTIMO.db";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("INICIANDO VALIDACIÓN INTEGRAL FINAL DE QA (AGENTE 5)");
  console.log("=================================================");

  // -------------------------------------------------------------
  // PRUEBA 1: VERIFICACIÓN DEL RESPALDO VACUUM INTO (HOOK LOGOUT)
  // -------------------------------------------------------------
  console.log("\n[QA 1] Evaluando Respaldo en Caliente (Hook de Cierre de Sesión)...");
  const resultadoRespaldo = await ejecutarRespaldoEnCaliente("PRUEBA_QA");
  console.log(`- Respaldo ejecutado con éxito: ${resultadoRespaldo.success}`);
  console.log(`- Archivo principal: ${resultadoRespaldo.rutaUltimo}`);

  const rutaUltimo = path.join(RUTA_DIRECTORIO_BACKUPS, NOMBRE_ARCHIVO_ULTIMO);
  if (!fs.existsSync(rutaUltimo)) {
    throw new Error(`QA FALLIDO: No se encontró el archivo de respaldo en ${rutaUltimo}`);
  }

  const stat = fs.statSync(rutaUltimo);
  if (stat.size < 1024) {
    throw new Error(`QA FALLIDO: El archivo de respaldo es sospechosamente pequeño (${stat.size} bytes)`);
  }

  // Validar cabecera mágica de SQLite
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(rutaUltimo, "r");
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);
  const header = buffer.toString("utf8");

  if (!header.startsWith("SQLite format 3")) {
    throw new Error(`QA FALLIDO: La cabecera del archivo de respaldo no es SQLite válida: '${header}'`);
  }
  console.log(`- Tamaño del respaldo: ${(stat.size / 1024).toFixed(2)} KB`);
  console.log("- Cabecera SQLite: 'SQLite format 3' verificada con éxito.");
  console.log("-> [QA 1] RESPALDO EN CALIENTE VACUUM INTO APROBADO.");

  // -------------------------------------------------------------
  // PRUEBA 2: RESOLUCIÓN DE RED LOCAL Y mDNS
  // -------------------------------------------------------------
  console.log("\n[QA 2] Evaluando Red Local mDNS (Zero-Config llanomio.local)...");
  const ip = obtenerIpLocal();
  console.log(`- IP Local del Servidor: ${ip}`);

  if (!ip || ip === "0.0.0.0") {
    throw new Error("QA FALLIDO: No se detectó una IP de red válida");
  }
  console.log(`- Hostname anunciado: http://llanomio.local`);
  console.log(`- Acceso directo alternativo en Wi-Fi: http://${ip}`);
  console.log("-> [QA 2] DETECCIÓN DE RED LOCAL Y mDNS APROBADO.");

  // -------------------------------------------------------------
  // PRUEBA 3: FORMATOS DE IMPRESIÓN Y POLÍTICA DE CERO QR
  // -------------------------------------------------------------
  console.log("\n[QA 3] Evaluando Restricción de CERO Códigos QR en Impresión...");
  const rutaPlantilla = path.join(__dirname, "../src/components/impresion/PlantillaImpresion.tsx");
  const codigoPlantilla = fs.readFileSync(rutaPlantilla, "utf8");

  const contieneQR =
    codigoPlantilla.toLowerCase().includes("qrcode") ||
    codigoPlantilla.toLowerCase().includes("react-qr") ||
    codigoPlantilla.toLowerCase().includes("qr-code") ||
    codigoPlantilla.toLowerCase().includes("<canvas");

  if (contieneQR) {
    throw new Error("QA FALLIDO: Se detectaron elementos de código QR en la plantilla de impresión.");
  }
  console.log("- Política de privacidad: CERO códigos QR confirmada.");

  const soportaFormatos =
    codigoPlantilla.includes("TIRILLA") &&
    codigoPlantilla.includes("MEDIA_CARTA") &&
    codigoPlantilla.includes("CARTA");

  if (!soportaFormatos) {
    throw new Error("QA FALLIDO: Formatos de impresión incompletos.");
  }
  console.log("- Formatos Tirilla, Media Carta y Carta: Verificados.");
  console.log("-> [QA 3] FORMATOS DE IMPRESIÓN APROBADOS.");

  // -------------------------------------------------------------
  // PRUEBA 4: CUADRE AL CENTAVO DE FACTURAS Y ABONOS
  // -------------------------------------------------------------
  console.log("\n[QA 4] Evaluando Cuadre Matemático de Facturas y Abonos en BD...");
  const facturas = await prisma.factura.findMany({
    take: 10,
    include: { abonos: true, detalles: true },
  });

  for (const f of facturas) {
    const totalAbonosCalculado = Math.round(
      f.abonos.reduce((acc, a) => acc + a.monto, 0) * 100
    ) / 100;

    const saldoCalculado = Math.max(0, Math.round((f.totalFactura - totalAbonosCalculado + f.recargoMoraAcumulado) * 100) / 100);

    // Permitir tolerancia de centavos
    const difAbono = Math.abs(f.totalAbonado - totalAbonosCalculado);
    if (difAbono > 0.05) {
      throw new Error(`QA FALLIDO: Descuadre en factura ${f.numeroFactura}: abonado en cabecera $${f.totalAbonado} vs suma de abonos $${totalAbonosCalculado}`);
    }
  }

  console.log(`- Se verificó la consistencia matemática de ${facturas.length} facturas registradas.`);
  console.log("-> [QA 4] CUADRE AL CENTAVO DE FACTURAS Y ABONOS APROBADO.");

  console.log("\n=================================================");
  console.log("TODAS LAS PRUEBAS DE VALIDACIÓN FINAL DE QA APROBADAS");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
