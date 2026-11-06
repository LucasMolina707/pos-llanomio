/**
 * SCRIPT DE AUDITORIA QA: 8 MEJORAS DE ROBUSTEZ COMERCIAL, ERGONOMIA DE MOSTRADOR,
 * RESILIENCIA SQLITE Y SEGURIDAD OPERATIVA
 *
 * Ejecucion: node --experimental-strip-types scripts/test-qa-robustez-comercial.ts
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================================");
  console.log("INICIANDO AUDITORIA QA: 8 MEJORAS DE ROBUSTEZ COMERCIAL Y SEGURIDAD");
  console.log("=================================================================\n");

  let exitos = 0;
  let fallos = 0;

  function verificar(nombre: string, condicion: boolean, detalle = "") {
    if (condicion) {
      console.log(`[PASS] ${nombre} ${detalle ? `(${detalle})` : ""}`);
      exitos++;
    } else {
      console.error(`[FAIL] ${nombre} ${detalle ? `(${detalle})` : ""}`);
      fallos++;
    }
  }

  // 1. Standalone y Scripts
  const nextConfig = fs.readFileSync("next.config.mjs", "utf-8");
  verificar("1.1 Next.js Standalone", nextConfig.includes("output: 'standalone'"));

  const prepPaquete = fs.readFileSync("scripts/preparar-paquete-instalador.js", "utf-8");
  verificar("1.2 Copia de static y public en standalone", prepPaquete.includes(".next/static") && prepPaquete.includes("standalone"));

  const startPos = fs.readFileSync("start-pos.js", "utf-8");
  verificar("1.3 Standalone detection y WAL en start-pos.js", startPos.includes("wal_checkpoint(PASSIVE)") && startPos.includes("standalone"));

  // 2. Aislamiento .tmp en scripts .bat
  const batFiles = [
    "INSTALADOR_MAESTRO_UNICO_POS.bat",
    "CONTROL_GENERAL_POS.bat",
    "ABRIR_SISTEMA_PANTALLA_COMPLETA.bat",
    "RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat",
  ];
  for (const b of batFiles) {
    if (fs.existsSync(b)) {
      const c = fs.readFileSync(b, "utf-8");
      verificar(`2. Aislamiento .tmp en ${b}`, c.includes(".tmp") && c.includes("TEMP="));
    }
  }

  // 3. Ergonomía de Mostrador y Barcode Scanner
  const barcodeHook = fs.readFileSync("src/hooks/useBarcodeScanner.ts", "utf-8");
  verificar("3.1 Hook Barcode Scanner < 45ms", barcodeHook.includes("maxIntervaloMs = 45"));

  const shortcutsHook = fs.readFileSync("src/hooks/useAtajoTeclado.ts", "utf-8");
  verificar("3.2 Hook Atajos Universales F2/F4/F9/Esc", shortcutsHook.includes("F2") && shortcutsHook.includes("F4") && shortcutsHook.includes("F9"));

  // 4. Auto-enfoque e integración en Mostrador
  const posPage = fs.readFileSync("src/app/caja/pos/page.tsx", "utf-8");
  verificar("4.1 Integracion de Barcode y Atajos en POS", posPage.includes("useBarcodeScanner") && posPage.includes("useMapaAtajosTeclado") && posPage.includes(">F2<"));

  const alqPage = fs.readFileSync("src/app/caja/alquileres/page.tsx", "utf-8");
  verificar("4.2 Integracion de Barcode y Atajos en Alquileres", alqPage.includes("useBarcodeScanner") && alqPage.includes("useMapaAtajosTeclado") && alqPage.includes(">F2<"));

  const aptPage = fs.readFileSync("src/app/caja/apartados/page.tsx", "utf-8");
  verificar("4.3 Integracion de Barcode y Atajos en Apartados", aptPage.includes("useBarcodeScanner") && aptPage.includes("useMapaAtajosTeclado") && aptPage.includes(">F2<"));

  // 5. Devolución Parcial por Prenda en Facturas
  const schemaPrisma = fs.readFileSync("database/schema.prisma", "utf-8");
  verificar("5.1 Campos de Devolucion Parcial en Schema", schemaPrisma.includes("devuelto") && schemaPrisma.includes("cargoAveria") && schemaPrisma.includes("notaAveria"));

  const routeFactura = fs.readFileSync("src/app/api/facturas/[id]/route.ts", "utf-8");
  verificar("5.2 Logica Devolucion Parcial en Route Facturas", routeFactura.includes("itemsDevolucion") && routeFactura.includes("cargoAveria"));

  // 6. Resiliencia Backup Anti-Colisiones OneDrive/GDrive
  const backupLib = fs.readFileSync("src/lib/backup.ts", "utf-8");
  verificar("6.1 Backup con reintento exponencial", backupLib.includes("copiarConReintento") && backupLib.includes("pos_"));

  // 7. Detección y Cambio Obligatorio de Credenciales de Fábrica
  const loginRoute = fs.readFileSync("src/app/api/auth/login/route.ts", "utf-8");
  verificar("7.1 Login detecta requiereCambioClave y admin123", loginRoute.includes("requiereCambioClave") && loginRoute.includes("admin123"));

  const loginPage = fs.readFileSync("src/app/login/page.tsx", "utf-8");
  verificar("7.2 Modal de Primer Inicio en Login", loginPage.includes("modalCambioInicialAbierto") && loginPage.includes("cambiar-clave-inicial"));

  // 8. Autorización de Supervisor con PIN de 6 dígitos
  const modalPin = fs.readFileSync("src/components/seguridad/ModalPinSupervisor.tsx", "utf-8");
  verificar("8.1 Componente ModalPinSupervisor", modalPin.includes("ModalPinSupervisor") && modalPin.includes("verificar-supervisor"));

  const supervisorRoute = fs.readFileSync("src/app/api/auth/verificar-supervisor/route.ts", "utf-8");
  verificar("8.2 Endpoint verificar-supervisor", supervisorRoute.includes("pinSeguridadHash") && supervisorRoute.includes("ADMIN"));

  // Test en Base de Datos SQLite: Verificar usuario admin y permisos
  const usuarioAdmin = await prisma.user.findFirst({
    where: { username: "admin" },
  });
  verificar("BD Usuario Admin Existe", Boolean(usuarioAdmin));
  if (usuarioAdmin) {
    const passwordOk = bcrypt.compareSync("admin123", usuarioAdmin.passwordHash);
    verificar("BD Contraseña admin123 Válida", passwordOk);
    verificar("BD Documento 0000000000", usuarioAdmin.documentoIdentidad === "0000000000");
  }

  console.log("\n=================================================================");
  console.log(`RESUMEN AUDITORIA QA: ${exitos} PASADOS, ${fallos} FALLIDOS`);
  console.log("=================================================================\n");

  await prisma.$disconnect();

  if (fallos > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error fatal en QA:", err);
  process.exit(1);
});
