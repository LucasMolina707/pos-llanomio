/**
 * ASISTENTE DE CONFIGURACION INTERACTIVA DE PUERTOS Y MULTI-INSTANCIA
 * POS Local - Next.js 15 + SQLite
 *
 * Ejecuta el escaneo de puertos TCP libres, solicita la configuracion
 * interactiva en orden y actualiza el archivo .env.
 */

const net = require("net");
const os = require("os");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(PROJECT_ROOT, ".env");
const DIR_DATABASE = path.join(PROJECT_ROOT, "database");

// Puertos candidatos para la aplicacion
const PUERTOS_CANDIDATOS_APP = [
  3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009,
  3010, 4000, 4001, 5000, 5001, 8000, 8080, 8081,
];

// Puertos candidatos para proxy HTTP / LAN
const PUERTOS_CANDIDATOS_PROXY = [80, 8080, 8081, 8000, 3000, 3001, 8888];

/**
 * Obtiene la direccion IPv4 local del servidor en la red LAN
 */
function obtenerIpLocal() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return "127.0.0.1";
}

/**
 * Comprueba de forma no bloqueante si un puerto TCP esta disponible
 */
function verificarPuertoDisponible(puerto, host = "0.0.0.0", timeoutMs = 400) {
  return new Promise((resolve) => {
    const server = net.createServer();
    let resuelto = false;

    const terminar = (resultado) => {
      if (!resuelto) {
        resuelto = true;
        try {
          server.close();
        } catch {}
        resolve(resultado);
      }
    };

    server.once("error", () => terminar(false));
    server.once("listening", () => terminar(true));

    try {
      server.listen(puerto, host);
    } catch {
      terminar(false);
    }

    setTimeout(() => terminar(false), timeoutMs);
  });
}

/**
 * Obtiene informacion del proceso que ocupa un puerto en Windows
 */
function obtenerInfoProcesoEnPuerto(puerto) {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr /R /C:":${puerto} "`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const lineas = out.trim().split("\n");
    for (const linea of lineas) {
      const tokens = linea.trim().split(/\s+/);
      if (tokens.length >= 5 && tokens[3] === "LISTENING") {
        const pid = tokens[4];
        let nombreProceso = "Desconocido";
        try {
          const taskOut = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
          });
          const match = taskOut.trim().match(/^"([^"]+)"/);
          if (match) nombreProceso = match[1];
        } catch {}
        return { pid, proceso: nombreProceso };
      }
    }
  } catch {}
  return null;
}

/**
 * Escanea un listado de puertos
 */
async function escanearPuertos(listaPuertos) {
  const ocupados = [];
  const libres = [];

  for (const puerto of listaPuertos) {
    const disponible = await verificarPuertoDisponible(puerto);
    if (disponible) {
      libres.push(puerto);
    } else {
      const info = obtenerInfoProcesoEnPuerto(puerto);
      ocupados.push({
        puerto,
        pid: info ? info.pid : "N/D",
        proceso: info ? info.proceso : "Desconocido",
      });
    }
  }
  return { ocupados, libres };
}

/**
 * Lee las variables actuales del archivo .env preservando estructura
 */
function leerVariablesEnv() {
  const env = {};
  if (fs.existsSync(RUTA_ENV)) {
    const contenido = fs.readFileSync(RUTA_ENV, "utf-8");
    for (const linea of contenido.split(/\r?\n/)) {
      const limpia = linea.trim();
      if (limpia && !limpia.startsWith("#") && limpia.includes("=")) {
        const [clave, ...resto] = limpia.split("=");
        env[clave.trim()] = resto.join("=").replace(/^["']|["']$/g, "").trim();
      }
    }
  }
  return env;
}

/**
 * Guarda o actualiza variables en el archivo .env sin borrar valores existentes
 */
function guardarVariablesEnv(nuevasVars) {
  let contenido = "";
  if (fs.existsSync(RUTA_ENV)) {
    contenido = fs.readFileSync(RUTA_ENV, "utf-8");
  } else {
    contenido =
      '# Configuracion Oficial POS Local\nDATABASE_URL="file:./llanomio.db"\nNODE_ENV="production"\n';
  }

  const lineas = contenido.split(/\r?\n/);
  const clavesModificadas = new Set();

  const lineasActualizadas = lineas.map((linea) => {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) {
      return linea;
    }
    const [clave] = limpia.split("=");
    const claveTrim = clave.trim();
    if (Object.prototype.hasOwnProperty.call(nuevasVars, claveTrim)) {
      clavesModificadas.add(claveTrim);
      return `${claveTrim}=${nuevasVars[claveTrim]}`;
    }
    return linea;
  });

  for (const [clave, valor] of Object.entries(nuevasVars)) {
    if (!clavesModificadas.has(clave)) {
      lineasActualizadas.push(`${clave}=${valor}`);
    }
  }

  fs.writeFileSync(RUTA_ENV, lineasActualizadas.join("\n"), "utf-8");
}

/**
 * Normaliza el identificador de instancia para PM2
 */
function normalizarIdentificadorInstancia(input) {
  if (!input || input.trim() === "") {
    return "pos-llanomio";
  }
  let str = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  if (!str) return "pos-llanomio";
  if (!str.startsWith("pos-")) {
    str = `pos-${str}`;
  }
  return str;
}

/**
 * Normaliza el nombre del archivo de base de datos SQLite
 */
function normalizarNombreBd(input) {
  if (!input || input.trim() === "") {
    return "llanomio.db";
  }
  let str = input.trim().toLowerCase();
  if (str.endsWith(".db")) {
    str = str.slice(0, -3);
  }
  let limpio = str.replace(/[^a-z0-9_-]/g, "_").replace(/^_+|_+$/g, "");
  if (!limpio) {
    return "llanomio.db";
  }
  return `${limpio}.db`;
}

/**
 * Normaliza el nombre de dominio local mDNS (.local)
 */
function normalizarDominioLocal(input) {
  if (!input || input.trim() === "") {
    return "llanomio.local";
  }
  let str = input.trim().toLowerCase();
  if (str.endsWith(".local")) {
    str = str.slice(0, -6);
  }
  let limpio = str.replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  if (!limpio) return "llanomio.local";
  return `${limpio}.local`;
}

/**
 * Crea una interfaz readline para interactuar con el usuario
 */
function crearPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function preguntar(rl, pregunta) {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const esNoInteractivo = args.includes("--non-interactive") || args.includes("-y");
  const esForzado = args.includes("--force");

  const argPuertoParam = args.find((a) => a.startsWith("--port="));
  const argPuertoForzado = argPuertoParam ? parseInt(argPuertoParam.split("=")[1], 10) : null;

  const argProxyParam = args.find((a) => a.startsWith("--proxy="));
  const argProxyForzado = argProxyParam ? parseInt(argProxyParam.split("=")[1], 10) : null;

  const argInstanceParam = args.find((a) => a.startsWith("--instance="));
  const argInstanceForzado = argInstanceParam ? argInstanceParam.split("=")[1] : null;

  const argDbParam = args.find((a) => a.startsWith("--db="));
  const argDbForzado = argDbParam ? argDbParam.split("=")[1] : null;

  const argDomainParam = args.find((a) => a.startsWith("--domain="));
  const argDomainForzado = argDomainParam ? argDomainParam.split("=")[1] : null;

  console.log("===============================================================================");
  console.log("   SISTEMA POS LOCAL - ASISTENTE DE PARAMETRIZACION Y PUERTOS DE RED");
  console.log("===============================================================================");
  console.log("");

  const ipLocal = obtenerIpLocal();
  console.log(`[RED LOCAL] Direccion IP LAN detectada en este equipo: ${ipLocal}`);
  console.log("[SISTEMA]   Escaneando disponibilidad de puertos TCP en Windows...");
  console.log("");

  const listaCandidatos = Array.from(
    new Set([...PUERTOS_CANDIDATOS_APP, ...PUERTOS_CANDIDATOS_PROXY])
  ).sort((a, b) => a - b);

  const { ocupados, libres } = await escanearPuertos(listaCandidatos);

  // Presentar Puertos Ocupados
  console.log("-------------------------------------------------------------------------------");
  console.log("PUERTOS DETECTADOS COMO OCUPADOS EN ESTE EQUIPO:");
  console.log("-------------------------------------------------------------------------------");
  if (ocupados.length === 0) {
    console.log("  (Ninguno de los puertos comunes analizados esta ocupado actualmente)");
  } else {
    for (const item of ocupados) {
      console.log(
        `  * Puerto ${String(item.puerto).padEnd(6)} | PID: ${String(item.pid).padEnd(8)} | Proceso: ${item.proceso}`
      );
    }
  }
  console.log("");

  // Presentar Puertos Libres Verificados
  console.log("-------------------------------------------------------------------------------");
  console.log("PUERTOS 100% LIBRES Y VERIFICADOS DISPONIBLES:");
  console.log("-------------------------------------------------------------------------------");
  if (libres.length === 0) {
    console.log("  [AVISO] No se detectaron puertos libres en el rango analizado.");
  } else {
    const bloques = [];
    for (let i = 0; i < libres.length; i += 8) {
      bloques.push(libres.slice(i, i + 8).join(", "));
    }
    for (const b of bloques) {
      console.log(`  [ ${b} ]`);
    }
  }
  console.log("-------------------------------------------------------------------------------");
  console.log("");

  const envActual = leerVariablesEnv();
  const instanceEnvActual = envActual.INSTANCE_ID || "pos-llanomio";
  const puertoEnvActual = envActual.PORT ? parseInt(envActual.PORT, 10) : 3000;
  const proxyEnvActual = envActual.HTTP_PORT ? parseInt(envActual.HTTP_PORT, 10) : 3000;
  const dbEnvActual = envActual.DATABASE_URL
    ? envActual.DATABASE_URL.replace(/file:\.\/database\/|file:\.\/|file:/g, "")
    : "llanomio.db";
  const domainEnvActual = envActual.LOCAL_DOMAIN || "llanomio.local";

  let instanceIdSeleccionado = null;
  let puertoSeleccionado = null;
  let puertoProxySeleccionado = null;
  let dominioLocalSeleccionado = null;
  let nombreBdSeleccionada = null;

  // Si se ejecuta en modo no interactivo
  if (esNoInteractivo && argPuertoForzado) {
    instanceIdSeleccionado = normalizarIdentificadorInstancia(argInstanceForzado || instanceEnvActual);
    puertoSeleccionado = argPuertoForzado;
    puertoProxySeleccionado = argProxyForzado || argPuertoForzado;
    dominioLocalSeleccionado = normalizarDominioLocal(argDomainForzado || domainEnvActual);
    nombreBdSeleccionada = normalizarNombreBd(argDbForzado || dbEnvActual);
  } else {
    const rl = crearPrompt();

    // 1. IDENTIFICADOR DE INSTANCIA PM2
    console.log("-------------------------------------------------------------------------------");
    console.log("1. IDENTIFICADOR DE INSTANCIA DE SERVICIO (PM2):");
    console.log("-------------------------------------------------------------------------------");
    console.log("Nombre del proceso en el gestor PM2 para aislar multiples tiendas en este equipo.");
    console.log(`Valor por defecto: '${instanceEnvActual}'`);
    console.log("");
    const respInstance = await preguntar(
      rl,
      `>> Ingrese IDENTIFICADOR PM2 [Enter para '${instanceEnvActual}']: `
    );
    instanceIdSeleccionado = respInstance && respInstance !== ""
      ? normalizarIdentificadorInstancia(respInstance)
      : instanceEnvActual;
    console.log(`[SELECCION] Identificador PM2 asignado: ${instanceIdSeleccionado}\n`);

    // 2. PUERTO PRINCIPAL NEXT.JS
    console.log("-------------------------------------------------------------------------------");
    console.log("2. PUERTO PRINCIPAL DEL SERVIDOR WEB (NEXT.JS):");
    console.log("-------------------------------------------------------------------------------");
    const sugerenciaPuerto = libres.includes(puertoEnvActual)
      ? puertoEnvActual
      : (libres.length > 0 ? libres[0] : 3000);
    console.log(`Puerto sugerido libre: ${sugerenciaPuerto}`);
    console.log("");

    while (!puertoSeleccionado) {
      const respPuerto = await preguntar(
        rl,
        `>> Ingrese NUMERO DE PUERTO [Enter para ${sugerenciaPuerto}]: `
      );

      if (!respPuerto || respPuerto === "") {
        puertoSeleccionado = sugerenciaPuerto;
        console.log(`[SELECCION] Puerto asignado: ${puertoSeleccionado}\n`);
        break;
      }

      const num = parseInt(respPuerto, 10);
      if (isNaN(num) || num < 1 || num > 65535) {
        console.log(`[ERROR] "${respPuerto}" no es un numero de puerto TCP valido (1 a 65535). Intente de nuevo.\n`);
        continue;
      }

      const libre = await verificarPuertoDisponible(num);
      if (libre) {
        puertoSeleccionado = num;
        console.log(`[SELECCION] Puerto TCP ${num} confirmado libre.\n`);
      } else {
        console.log(`[ADVERTENCIA] El puerto TCP ${num} esta ocupado por otro proceso.`);
        const respForzar = await preguntar(rl, "Desea asignarlo de todos modos? (s/n) [n]: ");
        if (respForzar.toLowerCase() === "s" || respForzar.toLowerCase() === "si") {
          puertoSeleccionado = num;
        } else {
          console.log("Por favor elija otro puerto libre.\n");
        }
      }
    }

    // 3. PUERTO DE RED / PROXY HTTP
    console.log("-------------------------------------------------------------------------------");
    console.log("3. PUERTO DE RED LOCAL / PROXY HTTP (OPCIONAL):");
    console.log("-------------------------------------------------------------------------------");
    console.log("Puerto secundario para la red local (ejemplo 80 para entrar sin escribir :puerto).");
    console.log(`Presione ENTER para usar el mismo puerto principal [${puertoSeleccionado}].`);
    console.log("");

    while (puertoProxySeleccionado === null) {
      const respProxy = await preguntar(
        rl,
        `>> Ingrese PUERTO RED/PROXY [Enter para ${puertoSeleccionado}]: `
      );

      if (!respProxy || respProxy === "") {
        puertoProxySeleccionado = puertoSeleccionado;
        console.log(`[SELECCION] Puerto red asignado: ${puertoProxySeleccionado}\n`);
        break;
      }

      const numProxy = parseInt(respProxy, 10);
      if (isNaN(numProxy) || numProxy < 1 || numProxy > 65535) {
        console.log(`[ERROR] "${respProxy}" no es un numero valido.\n`);
        continue;
      }

      puertoProxySeleccionado = numProxy;
      console.log(`[SELECCION] Puerto red/proxy asignado: ${puertoProxySeleccionado}\n`);
      break;
    }

    // 4. DOMINIO LOCAL mDNS (BONJOUR)
    console.log("-------------------------------------------------------------------------------");
    console.log("4. DOMINIO LOCAL EN RED WI-FI (mDNS / BONJOUR):");
    console.log("-------------------------------------------------------------------------------");
    console.log("Permite que celulares y tablets ingresen por nombre (ej. http://llanomio.local).");
    console.log(`Valor por defecto: '${domainEnvActual}'`);
    console.log("");

    const respDomain = await preguntar(
      rl,
      `>> Ingrese DOMINIO LOCAL mDNS [Enter para '${domainEnvActual}']: `
    );
    dominioLocalSeleccionado = respDomain && respDomain !== ""
      ? normalizarDominioLocal(respDomain)
      : domainEnvActual;
    console.log(`[SELECCION] Dominio local asignado: http://${dominioLocalSeleccionado}\n`);

    // 5. NOMBRE DE BASE DE DATOS SQLITE
    console.log("-------------------------------------------------------------------------------");
    console.log("5. NOMBRE DEL ARCHIVO DE BASE DE DATOS SQLITE:");
    console.log("-------------------------------------------------------------------------------");
    console.log("Permite separar los datos contables de distintas tiendas o sedes.");
    console.log(`Valor por defecto: '${dbEnvActual}'`);
    console.log("");

    const respBd = await preguntar(
      rl,
      `>> Ingrese NOMBRE DE ARCHIVO BD [Enter para '${dbEnvActual}']: `
    );
    nombreBdSeleccionada = respBd && respBd !== ""
      ? normalizarNombreBd(respBd)
      : dbEnvActual;
    console.log(`[SELECCION] Archivo de Base de Datos: database/${nombreBdSeleccionada}\n`);

    rl.close();
  }

  // 6. Gestionar archivo SQLite si se eligio un nombre nuevo
  const rutaBdBase = path.join(DIR_DATABASE, "llanomio.db");
  const rutaBdDestino = path.join(DIR_DATABASE, nombreBdSeleccionada);

  if (!fs.existsSync(DIR_DATABASE)) {
    fs.mkdirSync(DIR_DATABASE, { recursive: true });
  }

  if (!fs.existsSync(rutaBdDestino)) {
    if (fs.existsSync(rutaBdBase)) {
      try {
        fs.copyFileSync(rutaBdBase, rutaBdDestino);
        console.log(`[DATABASE] Se inicializo 'database/${nombreBdSeleccionada}' copiando la base limpia de fabrica.`);
      } catch (errCopyDb) {
        console.warn(`[DATABASE] Advertencia al copiar base limpia:`, errCopyDb.message);
      }
    } else {
      console.log(`[DATABASE] Base de datos 'database/${nombreBdSeleccionada}' sera generada por Prisma.`);
    }
  }

  // Guardar en .env
  console.log("-------------------------------------------------------------------------------");
  console.log("GUARDANDO CONFIGURACION EN .ENV...");
  console.log("-------------------------------------------------------------------------------");

  const nuevasVariables = {
    PORT: String(puertoSeleccionado),
    HTTP_PORT: String(puertoProxySeleccionado),
    PORT_PROXY: String(puertoProxySeleccionado),
    NEXT_PUBLIC_PORT: String(puertoSeleccionado),
    DATABASE_URL: `file:./${nombreBdSeleccionada}`,
    LOCAL_DOMAIN: dominioLocalSeleccionado,
    INSTANCE_ID: instanceIdSeleccionado,
    HOSTNAME: "0.0.0.0",
  };

  guardarVariablesEnv(nuevasVariables);
  console.log(`[OK] Variables actualizadas en: ${RUTA_ENV}`);
  console.log(`     - INSTANCE_ID = ${instanceIdSeleccionado}`);
  console.log(`     - PORT = ${puertoSeleccionado}`);
  console.log(`     - HTTP_PORT = ${puertoProxySeleccionado}`);
  console.log(`     - LOCAL_DOMAIN = ${dominioLocalSeleccionado}`);
  console.log(`     - DATABASE_URL = file:./${nombreBdSeleccionada}`);
  console.log(`     - HOSTNAME = 0.0.0.0`);
  console.log("");

  // Resumen visual de accesos
  console.log("===============================================================================");
  console.log("        PARAMETRIZACION DE RED Y SERVICIOS COMPLETADA");
  console.log("===============================================================================");
  console.log("");
  console.log(`ID Instancia Servidor (PM2): ${instanceIdSeleccionado}`);
  console.log(`Archivo de Base de Datos:    database/${nombreBdSeleccionada}`);
  console.log("");
  console.log("Direcciones de Acceso al Sistema POS:");
  console.log(`  - Desde este equipo:       http://localhost:${puertoSeleccionado}`);
  if (puertoProxySeleccionado !== puertoSeleccionado) {
    console.log(`  - Acceso Proxy Local:      http://localhost:${puertoProxySeleccionado}`);
  }
  console.log(`  - Desde celulares en Wi-Fi: http://${ipLocal}:${puertoProxySeleccionado}`);
  console.log(`  - Dominio mDNS LAN:        http://${dominioLocalSeleccionado}:${puertoProxySeleccionado}`);
  console.log("===============================================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n[ERROR FATAL EN ASISTENTE DE PUERTOS]:", err.message);
  process.exit(1);
});
