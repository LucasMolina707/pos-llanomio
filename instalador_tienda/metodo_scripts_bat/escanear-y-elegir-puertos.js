/**
 * Asistente Interactivo de Escaneo y Seleccion de Puertos de Red
 * POS LLANOMIO - Automatizacion de Infraestructura Windows (Agentes 1, 4 y 5)
 *
 * NOTA DE ARQUITECTURA:
 * Este script utiliza EXCLUSIVAMENTE modulos nativos de Node.js (net, readline, fs, path, os, child_process)
 * para garantizar ejecucion inmediata antes o despues de 'npm install'.
 * CERO emojis en codigo, mensajes o salidas de terminal.
 */

const net = require("net");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const { execSync } = require("child_process");

/**
 * Localiza la raiz del proyecto de forma dinamica buscando package.json
 */
function localizarRaizProyecto() {
  let dir = __dirname;
  while (dir && dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const RUTA_RAIZ = localizarRaizProyecto();
const RUTA_ENV = path.join(RUTA_RAIZ, ".env");

// Puertos candidatos para aplicacion web y servicios de red
const PUERTOS_CANDIDATOS_APP = [
  3000, 3001, 3002, 3005, 3010, 3020, 4000, 4040, 5000, 5050, 7000, 8000, 8080, 8081, 8888, 9000,
];
const PUERTOS_CANDIDATOS_PROXY = [80, 81, 8080, 8888];

/**
 * Obtiene la direccion IPv4 local del equipo en la red LAN/Wi-Fi
 */
function obtenerIpLocal() {
  const interfaces = os.networkInterfaces();
  let ipCandidata = "127.0.0.1";

  for (const nombre of Object.keys(interfaces)) {
    const lista = interfaces[nombre];
    if (!lista) continue;
    for (const iface of lista) {
      if (iface.family === "IPv4" && !iface.internal) {
        // Priorizar rangos tipicos de LAN de tienda (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (
          iface.address.startsWith("192.168.") ||
          iface.address.startsWith("10.") ||
          iface.address.startsWith("172.")
        ) {
          return iface.address;
        }
        ipCandidata = iface.address;
      }
    }
  }
  return ipCandidata;
}

/**
 * Comprueba si un puerto TCP especifico esta libre para escuchar en 0.0.0.0 y 127.0.0.1
 */
function verificarPuertoDisponible(puerto) {
  return new Promise((resolve) => {
    if (puerto < 1 || puerto > 65535) {
      return resolve(false);
    }

    const srv = net.createServer();
    srv.once("error", () => {
      resolve(false);
    });

    srv.once("listening", () => {
      srv.close(() => {
        resolve(true);
      });
    });

    try {
      srv.listen(puerto, "0.0.0.0");
    } catch {
      resolve(false);
    }
  });
}

/**
 * Obtiene informacion del proceso que ocupa un puerto en Windows (PID y Nombre)
 */
function obtenerInfoProcesoEnPuerto(puerto) {
  try {
    const salidaNetstat = execSync("netstat -ano -p tcp", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const lineas = salidaNetstat.split(/\r?\n/);
    const regex = new RegExp(`[:.]${puerto}\\s+.*LISTENING\\s+(\\d+)`, "i");

    for (const linea of lineas) {
      const match = linea.match(regex);
      if (match && match[1]) {
        const pid = match[1].trim();
        let proceso = "Proceso del Sistema / Desconocido";
        try {
          const salidaTasklist = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
          });
          const partes = salidaTasklist.trim().split(",");
          if (partes.length > 0 && partes[0]) {
            proceso = partes[0].replace(/"/g, "").trim();
          }
        } catch {
          // Si tasklist no responde
        }
        return { pid, proceso };
      }
    }
  } catch {
    // Si netstat falla en entornos restringidos
  }
  return null;
}

/**
 * Intenta terminar un proceso por su PID para liberar el puerto
 */
function intentarLiberarProceso(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Escanea un listado de puertos y retorna listas clasificadas (libres y ocupados)
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
        proceso: info ? info.proceso : "En uso",
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
      '# Configuracion de Entorno POS LLANOMIO\nDATABASE_URL="file:./llanomio.db"\nNODE_ENV="production"\n';
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
 * Crea una interfaz readline para interactuar con el usuario
 */
function crearPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function preguntar(rl, texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta.trim());
    });
  });
}

/**
 * Flujo Principal del Asistente
 */
async function main() {
  const args = process.argv.slice(2);
  const esNoInteractivo = args.includes("--no-interactive");
  const argPuertoParam = args.find((a) => a.startsWith("--port="));
  const argPuertoForzado = argPuertoParam ? parseInt(argPuertoParam.split("=")[1], 10) : null;

  console.log("===============================================================================");
  console.log("        SISTEMA POS LLANOMIO - ASISTENTE DE ESCANEO Y CONFIGURACION DE PUERTOS ");
  console.log("===============================================================================");
  console.log("");

  const ipLocal = obtenerIpLocal();
  console.log(`[RED LOCAL] Direccion IP LAN detectada en este equipo: ${ipLocal}`);
  console.log("[SISTEMA]   Escaneando puertos en el sistema operativo Windows...");
  console.log("");

  // Combinar y deduplicar puertos de prueba
  const listaCandidatos = Array.from(
    new Set([...PUERTOS_CANDIDATOS_APP, ...PUERTOS_CANDIDATOS_PROXY])
  ).sort((a, b) => a - b);

  const { ocupados, libres } = await escanearPuertos(listaCandidatos);

  // Presentar Puertos Ocupados
  console.log("-------------------------------------------------------------------------------");
  console.log("PUERTOS DETECTADOS COMO OCUPADOS EN ESTE EQUIPO (NO UTILIZAR SIN LIBERAR):");
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
  console.log("PUERTOS 100% LIBRES Y VERIFICADOS DISPONIBLES EN ESTE EQUIPO:");
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
  const puertoEnvActual = envActual.PORT ? parseInt(envActual.PORT, 10) : null;
  const proxyEnvActual = envActual.HTTP_PORT ? parseInt(envActual.HTTP_PORT, 10) : null;

  if (puertoEnvActual) {
    console.log(`[CONFIGURACION ACTUAL .ENV] Puerto Principal configurado previamente: ${puertoEnvActual}`);
    if (proxyEnvActual) {
      console.log(`[CONFIGURACION ACTUAL .ENV] Puerto Secundario/Proxy configurado previamente: ${proxyEnvActual}`);
    }
    console.log("");
  }

  let puertoSeleccionado = null;
  let puertoProxySeleccionado = null;

  // Si se ejecuta en modo forzado no interactivo (ej. tests automatizados)
  if (esNoInteractivo && argPuertoForzado) {
    const estaLibre = await verificarPuertoDisponible(argPuertoForzado);
    if (!estaLibre) {
      console.error(`[ERROR] El puerto forzado ${argPuertoForzado} no esta disponible.`);
      process.exit(1);
    }
    puertoSeleccionado = argPuertoForzado;
    puertoProxySeleccionado = argPuertoForzado;
  } else {
    const rl = crearPrompt();

    // Bucle interactivo para el PUERTO PRINCIPAL NEXT.JS
    while (!puertoSeleccionado) {
      console.log("Por favor indique el puerto que desea asignar.");
      const respuesta = await preguntar(
        rl,
        ">> Escriba el NUMERO DE PUERTO para el Servidor POS (ej. uno de los libres mostrados): "
      );

      const num = parseInt(respuesta, 10);
      if (isNaN(num) || num < 1 || num > 65535) {
        console.log(`[ERROR] "${respuesta}" no es un numero de puerto TCP valido (1 a 65535). Intente de nuevo.\n`);
        continue;
      }

      console.log(`[COMPROBANDO] Verificando disponibilidad inmediata del puerto TCP ${num}...`);
      const libre = await verificarPuertoDisponible(num);

      if (libre) {
        console.log(`[OK] El puerto TCP ${num} esta 100% LIBRE y confirmado para el servidor.\n`);
        puertoSeleccionado = num;
      } else {
        const info = obtenerInfoProcesoEnPuerto(num);
        console.log(`[CONFIRMADO OCUPADO] El puerto TCP ${num} esta actualmente en uso en este computador.`);
        if (info) {
          console.log(`                     PID: ${info.pid} | Proceso: ${info.proceso}`);
        }

        if (info && info.pid && info.pid !== "N/D" && info.proceso.toLowerCase().includes("node")) {
          const respLiberar = await preguntar(
            rl,
            `>> El proceso es Node.js (PID ${info.pid}). Desea forzar su cierre para liberar el puerto? (s/n): `
          );
          if (respLiberar.toLowerCase() === "s" || respLiberar.toLowerCase() === "si") {
            const liberado = intentarLiberarProceso(info.pid);
            if (liberado) {
              await new Promise((r) => setTimeout(r, 1000));
              const vuelveAVerificar = await verificarPuertoDisponible(num);
              if (vuelveAVerificar) {
                console.log(`[EXITO] El proceso fue finalizado y el puerto ${num} ahora esta LIBRE.\n`);
                puertoSeleccionado = num;
                continue;
              }
            }
            console.log(`[AVISO] No se pudo liberar el puerto ${num}. Por favor elija otro puerto libre.\n`);
          }
        } else {
          console.log("Por favor seleccione otro puerto libre de la lista anterior.\n");
        }
      }
    }

    // Bucle interactivo para el PUERTO SECUNDARIO / PROXY HTTP
    console.log("-------------------------------------------------------------------------------");
    console.log("CONFIGURACION DE SALIDA LOCAL / PROXY HTTP SECUNDARIO:");
    console.log("-------------------------------------------------------------------------------");
    console.log("Puede habilitar un puerto secundario de entrada (por ejemplo el puerto 80 para entrar");
    console.log("sin escribir ':puerto' en el navegador, o el puerto 8080) o usar solo el puerto principal.");
    console.log("");

    while (puertoProxySeleccionado === null) {
      const respProxy = await preguntar(
        rl,
        `>> Ingrese puerto secundario / Proxy HTTP o presione ENTER para usar solo el puerto principal [${puertoSeleccionado}]: `
      );

      if (!respProxy || respProxy === "") {
        console.log(`[SELECCION] Se utilizara directamente el puerto principal ${puertoSeleccionado} para todo el trafico.\n`);
        puertoProxySeleccionado = puertoSeleccionado;
        break;
      }

      const numProxy = parseInt(respProxy, 10);
      if (isNaN(numProxy) || numProxy < 1 || numProxy > 65535) {
        console.log(`[ERROR] "${respProxy}" no es un numero de puerto valido. Ingrese un numero o ENTER para omitir.\n`);
        continue;
      }

      if (numProxy === puertoSeleccionado) {
        console.log(`[SELECCION] Coincide con el puerto principal. Se utilizara modo directo en puerto ${puertoSeleccionado}.\n`);
        puertoProxySeleccionado = puertoSeleccionado;
        break;
      }

      console.log(`[COMPROBANDO] Verificando disponibilidad del puerto secundario TCP ${numProxy}...`);
      const libreProxy = await verificarPuertoDisponible(numProxy);

      if (libreProxy) {
        console.log(`[OK] El puerto secundario TCP ${numProxy} esta 100% LIBRE y confirmado.\n`);
        puertoProxySeleccionado = numProxy;
      } else {
        const infoProxy = obtenerInfoProcesoEnPuerto(numProxy);
        console.log(`[CONFIRMADO OCUPADO] El puerto ${numProxy} esta en uso.`);
        if (infoProxy) {
          console.log(`                     PID: ${infoProxy.pid} | Proceso: ${infoProxy.proceso}`);
        }
        console.log("Por favor elija otro puerto secundario o presione ENTER para omitir.\n");
      }
    }

    rl.close();
  }

  // Guardar en .env
  console.log("-------------------------------------------------------------------------------");
  console.log("APLICANDO Y GUARDANDO CONFIGURACION EN .ENV...");
  console.log("-------------------------------------------------------------------------------");

  const nuevasVariables = {
    PORT: String(puertoSeleccionado),
    HTTP_PORT: String(puertoProxySeleccionado),
    PORT_PROXY: String(puertoProxySeleccionado),
    NEXT_PUBLIC_PORT: String(puertoSeleccionado),
    HOSTNAME: "0.0.0.0",
  };

  guardarVariablesEnv(nuevasVariables);
  console.log(`[GUARDADO] Variables actualizadas en: ${RUTA_ENV}`);
  console.log(`           - PORT = ${puertoSeleccionado}`);
  console.log(`           - HTTP_PORT = ${puertoProxySeleccionado}`);
  console.log(`           - NEXT_PUBLIC_PORT = ${puertoSeleccionado}`);
  console.log(`           - HOSTNAME = 0.0.0.0`);
  console.log("");

  // Resumen visual de accesos
  console.log("===============================================================================");
  console.log("        CONFIGURACION DE PUERTOS COMPLETADA EXITOSAMENTE");
  console.log("===============================================================================");
  console.log("");
  console.log("DIRECCIONES DE ACCESO AL SISTEMA POS:");
  console.log("");
  console.log("1. Desde este computador (Servidor Local):");
  if (puertoProxySeleccionado === 80) {
    console.log("   - http://localhost");
    console.log(`   - http://localhost:${puertoSeleccionado}`);
  } else if (puertoProxySeleccionado !== puertoSeleccionado) {
    console.log(`   - http://localhost:${puertoProxySeleccionado}`);
    console.log(`   - http://localhost:${puertoSeleccionado}`);
  } else {
    console.log(`   - http://localhost:${puertoSeleccionado}`);
  }
  console.log("");
  console.log("2. Desde celulares, tablets o terminales en la misma red Wi-Fi / Ethernet:");
  if (puertoProxySeleccionado === 80) {
    console.log(`   - http://${ipLocal}`);
    console.log(`   - http://${ipLocal}:${puertoSeleccionado}`);
    console.log("   - http://llanomio.local");
  } else if (puertoProxySeleccionado !== puertoSeleccionado) {
    console.log(`   - http://${ipLocal}:${puertoProxySeleccionado}`);
    console.log(`   - http://${ipLocal}:${puertoSeleccionado}`);
    console.log(`   - http://llanomio.local:${puertoProxySeleccionado}`);
  } else {
    console.log(`   - http://${ipLocal}:${puertoSeleccionado}`);
    console.log(`   - http://llanomio.local:${puertoSeleccionado}`);
  }
  console.log("===============================================================================");
  console.log("");

  // Retornar codigo 0 de exito
  process.exit(0);
}

main().catch((err) => {
  console.error("\n[ERROR FATAL EN ASISTENTE DE PUERTOS]:", err.message);
  process.exit(1);
});
