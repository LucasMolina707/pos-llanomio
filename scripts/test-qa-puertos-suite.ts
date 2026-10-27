/**
 * Suite de Pruebas Automatizadas de QA: Escaneo y Asignacion de Puertos
 * POS LLANOMIO - Auditoria QA (Agente 5)
 */

import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { spawn } from "child_process";

const RUTA_RAIZ = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(RUTA_RAIZ, ".env");
const RUTA_SCRIPT = path.join(__dirname, "escanear-y-elegir-puertos.js");

function leerEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (fs.existsSync(RUTA_ENV)) {
    const raw = fs.readFileSync(RUTA_ENV, "utf-8");
    for (const linea of raw.split(/\r?\n/)) {
      const limpia = linea.trim();
      if (limpia && !limpia.startsWith("#") && limpia.includes("=")) {
        const [clave, ...resto] = limpia.split("=");
        env[clave.trim()] = resto.join("=").replace(/^["']|["']$/g, "").trim();
      }
    }
  }
  return env;
}

function verificarPuerto(puerto: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(puerto, "0.0.0.0");
  });
}

async function ejecutarTest() {
  console.log("===============================================================================");
  console.log("       PRUEBA QA: ASISTENTE DE ESCANEO Y ASIGNACION DE PUERTOS EN TIEMPO REAL ");
  console.log("===============================================================================\n");

  // 1. Obtener puerto efímero dinámico del SO para ocuparlo
  const serverOcupado = net.createServer();
  await new Promise<void>((resolve, reject) => {
    serverOcupado.listen(0, "0.0.0.0", () => resolve());
    serverOcupado.on("error", reject);
  });

  const address = serverOcupado.address() as net.AddressInfo;
  const PUERTO_OCUPADO_TEST = address.port;

  // Buscar un puerto libre garantizado
  let PUERTO_LIBRE_TEST = 3200;
  while (!(await verificarPuerto(PUERTO_LIBRE_TEST))) {
    PUERTO_LIBRE_TEST++;
  }

  console.log(`[QA SETUP] Servidor dummy escuchando en puerto ${PUERTO_OCUPADO_TEST} (simulando conflicto).`);
  console.log(`[QA SETUP] Puerto alternativo confirmado libre: ${PUERTO_LIBRE_TEST}`);

  try {
    console.log("[QA TEST] Lanzando asistente escanear-y-elegir-puertos.js...");

    const proceso = spawn("node", [RUTA_SCRIPT], {
      cwd: RUTA_RAIZ,
      stdio: ["pipe", "inherit", "inherit"],
    });

    // 1. Enviar puerto ocupado tras dar tiempo al escaneo inicial
    setTimeout(() => {
      console.log(`\n[QA SIMULACION] 1. Enviando puerto OCUPADO: ${PUERTO_OCUPADO_TEST}`);
      proceso.stdin.write(`${PUERTO_OCUPADO_TEST}\r\n`);
    }, 1500);

    // 2. Responder 'n' a la oferta de matar el proceso Node
    setTimeout(() => {
      console.log(`[QA SIMULACION] 2. Rechazando matar proceso con 'n'`);
      proceso.stdin.write(`n\r\n`);
    }, 3000);

    // 3. Enviar puerto libre
    setTimeout(() => {
      console.log(`[QA SIMULACION] 3. Enviando puerto LIBRE: ${PUERTO_LIBRE_TEST}`);
      proceso.stdin.write(`${PUERTO_LIBRE_TEST}\r\n`);
    }, 4500);

    // 4. Confirmar puerto secundario con ENTER
    setTimeout(() => {
      console.log("[QA SIMULACION] 4. Confirmando puerto secundario con ENTER");
      proceso.stdin.write("\r\n");
      proceso.stdin.end();
    }, 6000);

    const codigoSalida = await new Promise<number>((resolve) => {
      proceso.on("exit", (code) => resolve(code ?? 0));
    });

    console.log(`\n[QA TEST] Proceso finalizo con codigo de salida: ${codigoSalida}`);

    if (codigoSalida !== 0) {
      throw new Error(`El asistente de puertos finalizo con error (codigo ${codigoSalida})`);
    }

    // Verificar .env
    const envFinal = leerEnv();
    if (envFinal.PORT !== String(PUERTO_LIBRE_TEST)) {
      throw new Error(`PORT en .env es ${envFinal.PORT}, se esperaba ${PUERTO_LIBRE_TEST}`);
    }
    console.log(`[QA OK] Verificacion exitosa: PORT en .env quedo en ${envFinal.PORT}`);

    console.log("\n===============================================================================");
    console.log("       PRUEBAS QA DE ESCANEO Y ASIGNACION DE PUERTOS: 100% EXITOSAS           ");
    console.log("===============================================================================\n");
  } finally {
    serverOcupado.close();
  }
}

ejecutarTest().catch((err) => {
  console.error("\n[FALLO QA EN TEST DE PUERTOS]:", err);
  process.exit(1);
});
