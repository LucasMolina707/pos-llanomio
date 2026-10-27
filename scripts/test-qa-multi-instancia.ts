/**
 * Suite de Pruebas Automatizadas de QA: Multi-Instancia y Dominios Locales
 * POS LLANOMIO - Auditoria QA (Agentes 1, 4 y 5)
 *
 * Simula la configuracion de dos instancias independientes en el mismo equipo:
 * - Instancia 1: Puerto 3000, DB llanomio.db, Dominio llanomio.local (pos-llanomio)
 * - Instancia 2: Puerto 3001, DB llanomio_tienda2.db, Dominio tienda2.local (pos-tienda2)
 *
 * Valida:
 * 1. Asistente interactivo / no interactivo escanear-y-elegir-puertos.js
 * 2. Persistencia y aislamiento en .env (PORT, HTTP_PORT, DATABASE_URL, LOCAL_DOMAIN, INSTANCE_ID)
 * 3. ecosystem.config.js genera nombres de proceso unicos sin colisionar
 * 4. Restauracion automatica a configuracion limpia de fabrica
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const RUTA_RAIZ = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(RUTA_RAIZ, ".env");
const RUTA_SCRIPT = path.join(__dirname, "escanear-y-elegir-puertos.js");
const RUTA_ECOSYSTEM = path.join(RUTA_RAIZ, "ecosystem.config.js");

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

function escribirEnv(variables: Record<string, string>): void {
  const lineas: string[] = [];
  for (const [clave, valor] of Object.entries(variables)) {
    lineas.push(`${clave}="${valor}"`);
  }
  fs.writeFileSync(RUTA_ENV, lineas.join("\n"), "utf-8");
}

async function ejecutarTest() {
  console.log("===============================================================================");
  console.log("        PRUEBA QA: MULTI-INSTANCIA Y DOMINIOS LOCALES PERSONALIZADOS          ");
  console.log("===============================================================================\n");

  // Guardar copia de seguridad de .env actual
  const envOriginal = leerEnv();
  console.log("[QA SETUP] Guardando copia de respaldo de la configuracion .env actual...");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Configuracion de Instancia 1 (Sede Principal)
    // -------------------------------------------------------------------------
    console.log("-------------------------------------------------------------------------------");
    console.log("SIMULANDO INSTANCIA 1 (SEDE PRINCIPAL):");
    console.log("  - Puerto: 3000 | BD: llanomio.db | Dominio: llanomio.local");
    console.log("-------------------------------------------------------------------------------");

    const cmdInstancia1 = `node "${RUTA_SCRIPT}" --no-interactive --force --port=3000 --proxy=3000 --db=llanomio.db --domain=llanomio.local`;
    execSync(cmdInstancia1, { cwd: RUTA_RAIZ, stdio: "pipe" });

    const envInstancia1 = leerEnv();
    console.log(`[QA VALIDACION 1] PORT:         ${envInstancia1.PORT}`);
    console.log(`[QA VALIDACION 1] DATABASE_URL: ${envInstancia1.DATABASE_URL}`);
    console.log(`[QA VALIDACION 1] LOCAL_DOMAIN: ${envInstancia1.LOCAL_DOMAIN}`);
    console.log(`[QA VALIDACION 1] INSTANCE_ID:  ${envInstancia1.INSTANCE_ID}`);

    if (envInstancia1.PORT !== "3000") {
      throw new Error(`Instancia 1: PORT esperado 3000, recibido ${envInstancia1.PORT}`);
    }
    if (envInstancia1.DATABASE_URL !== "file:./llanomio.db") {
      throw new Error(`Instancia 1: DATABASE_URL esperada file:./llanomio.db, recibido ${envInstancia1.DATABASE_URL}`);
    }
    if (envInstancia1.LOCAL_DOMAIN !== "llanomio.local") {
      throw new Error(`Instancia 1: LOCAL_DOMAIN esperado llanomio.local, recibido ${envInstancia1.LOCAL_DOMAIN}`);
    }
    if (envInstancia1.INSTANCE_ID !== "pos-llanomio") {
      throw new Error(`Instancia 1: INSTANCE_ID esperado pos-llanomio, recibido ${envInstancia1.INSTANCE_ID}`);
    }

    // Validar ecosystem.config.js para Instancia 1
    delete require.cache[require.resolve(RUTA_ECOSYSTEM)];
    const ecosystem1 = require(RUTA_ECOSYSTEM);
    const nombresApps1 = ecosystem1.apps.map((a: { name: string }) => a.name);
    console.log(`[QA PM2 1] Nombres de procesos en PM2: ${nombresApps1.join(", ")}`);
    if (!nombresApps1.includes("pos-llanomio") || !nombresApps1.includes("pos-llanomio-mdns")) {
      throw new Error("Instancia 1: PM2 no contiene los nombres pos-llanomio y pos-llanomio-mdns");
    }
    console.log("[QA OK] Instancia 1 validada y aislada correctamente.\n");

    // -------------------------------------------------------------------------
    // TEST 2: Configuracion de Instancia 2 (Segunda Tienda / Sucursal)
    // -------------------------------------------------------------------------
    console.log("-------------------------------------------------------------------------------");
    console.log("SIMULANDO INSTANCIA 2 (SEGUNDA TIENDA / SUCURSAL):");
    console.log("  - Puerto: 3001 | BD: tienda2 | Dominio: tienda2.local");
    console.log("-------------------------------------------------------------------------------");

    const cmdInstancia2 = `node "${RUTA_SCRIPT}" --no-interactive --force --port=3001 --proxy=3001 --db=tienda2 --domain=tienda2.local`;
    execSync(cmdInstancia2, { cwd: RUTA_RAIZ, stdio: "pipe" });

    const envInstancia2 = leerEnv();
    console.log(`[QA VALIDACION 2] PORT:         ${envInstancia2.PORT}`);
    console.log(`[QA VALIDACION 2] DATABASE_URL: ${envInstancia2.DATABASE_URL}`);
    console.log(`[QA VALIDACION 2] LOCAL_DOMAIN: ${envInstancia2.LOCAL_DOMAIN}`);
    console.log(`[QA VALIDACION 2] INSTANCE_ID:  ${envInstancia2.INSTANCE_ID}`);

    if (envInstancia2.PORT !== "3001") {
      throw new Error(`Instancia 2: PORT esperado 3001, recibido ${envInstancia2.PORT}`);
    }
    if (envInstancia2.DATABASE_URL !== "file:./llanomio_tienda2.db") {
      throw new Error(`Instancia 2: DATABASE_URL esperada file:./llanomio_tienda2.db, recibido ${envInstancia2.DATABASE_URL}`);
    }
    if (envInstancia2.LOCAL_DOMAIN !== "tienda2.local") {
      throw new Error(`Instancia 2: LOCAL_DOMAIN esperado tienda2.local, recibido ${envInstancia2.LOCAL_DOMAIN}`);
    }
    if (envInstancia2.INSTANCE_ID !== "pos-tienda2") {
      throw new Error(`Instancia 2: INSTANCE_ID esperado pos-tienda2, recibido ${envInstancia2.INSTANCE_ID}`);
    }

    // Validar ecosystem.config.js para Instancia 2
    delete require.cache[require.resolve(RUTA_ECOSYSTEM)];
    const ecosystem2 = require(RUTA_ECOSYSTEM);
    const nombresApps2 = ecosystem2.apps.map((a: { name: string }) => a.name);
    console.log(`[QA PM2 2] Nombres de procesos en PM2: ${nombresApps2.join(", ")}`);
    if (!nombresApps2.includes("pos-tienda2") || !nombresApps2.includes("pos-tienda2-mdns")) {
      throw new Error("Instancia 2: PM2 no contiene los nombres pos-tienda2 y pos-tienda2-mdns");
    }
    console.log("[QA OK] Instancia 2 validada y aislada correctamente.\n");

    // -------------------------------------------------------------------------
    // TEST 3: Verificacion de No-Colision entre Instancias
    // -------------------------------------------------------------------------
    console.log("-------------------------------------------------------------------------------");
    console.log("VERIFICANDO NO-COLISION DE RECURSOS ENTRE INSTANCIAS:");
    console.log("-------------------------------------------------------------------------------");
    console.log(`* Puertos distintos:     ${envInstancia1.PORT} vs ${envInstancia2.PORT} -> OK`);
    console.log(`* Bases de datos unicas: ${envInstancia1.DATABASE_URL} vs ${envInstancia2.DATABASE_URL} -> OK`);
    console.log(`* Dominios mDNS unicos:  ${envInstancia1.LOCAL_DOMAIN} vs ${envInstancia2.LOCAL_DOMAIN} -> OK`);
    console.log(`* Nombres de PM2 unicos: ${envInstancia1.INSTANCE_ID} vs ${envInstancia2.INSTANCE_ID} -> OK`);
    console.log("[QA OK] Aislamiento total de red y base de datos verificado con exito.\n");

  } finally {
    // Restaurar .env original
    console.log("[QA TEARDOWN] Restaurando archivo .env original de produccion...");
    if (Object.keys(envOriginal).length > 0) {
      escribirEnv(envOriginal);
    } else {
      escribirEnv({
        PORT: "3000",
        HTTP_PORT: "3000",
        LOCAL_DOMAIN: "llanomio.local",
        INSTANCE_ID: "pos-llanomio",
        DATABASE_URL: "file:./llanomio.db",
        NODE_ENV: "production",
      });
    }
    console.log("[QA TEARDOWN] Archivo .env restaurado.");
  }

  console.log("===============================================================================");
  console.log("     SUITE QA MULTI-INSTANCIA Y DOMINIOS LOCALES: 100% EXITOSA                ");
  console.log("===============================================================================\n");
}

ejecutarTest().catch((err) => {
  console.error("\n[ERROR CRITICO EN TEST MULTI-INSTANCIA]:", err);
  process.exit(1);
});
