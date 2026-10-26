/**
 * Script de Verificación y Configuración Interactiva de Puertos de Red
 * POS LLANOMIO - Automatización de Infraestructura Windows (Agente 4)
 *
 * Funciones:
 * 1. Comprueba si los puertos estándar (Next.js 3000 y Proxy HTTP 80) están en uso.
 * 2. Identifica el PID y nombre del proceso que ocupa el puerto en Windows.
 * 3. Si hay conflicto o en modo interactivo, solicita al usuario ingresar puertos libres.
 * 4. Ofrece opción de liberar el proceso si es un proceso Node / huérfano.
 * 5. Valida en tiempo real que los nuevos puertos ingresados estén disponibles.
 * 6. Actualiza el archivo .env de forma persistente (PORT, HTTP_PORT, PORT_PROXY).
 */

const net = require("net");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

const RUTA_RAIZ = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(RUTA_RAIZ, ".env");

/**
 * Lee las variables del archivo .env preservando estructura
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
 * Guarda o actualiza variables en el archivo .env sin borrar comentarios existentes
 */
function guardarVariablesEnv(nuevasVars) {
  let contenido = "";
  if (fs.existsSync(RUTA_ENV)) {
    contenido = fs.readFileSync(RUTA_ENV, "utf-8");
  } else {
    contenido =
      '# Configuracion de Base de Datos SQLite Local para POS LLANOMIO\nDATABASE_URL="file:./llanomio.db"\nNODE_ENV="production"\n';
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

  // Agregar claves nuevas que no estaban en el archivo
  for (const [clave, valor] of Object.entries(nuevasVars)) {
    if (!clavesModificadas.has(clave)) {
      lineasActualizadas.push(`${clave}=${valor}`);
    }
  }

  fs.writeFileSync(RUTA_ENV, lineasActualizadas.join("\n"), "utf-8");
}

/**
 * Comprueba mediante socket TCP si un puerto está libre para escuchar
 */
function verificarPuertoDisponible(puerto, host = "0.0.0.0") {
  return new Promise((resolve) => {
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
      srv.listen(puerto, host);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Obtiene el PID y el nombre del ejecutable que tiene ocupado un puerto en Windows
 */
function obtenerInfoProcesoEnPuerto(puerto) {
  try {
    const salidaNetstat = execSync(`netstat -ano -p tcp`, { encoding: "utf-8" });
    const lineas = salidaNetstat.split("\n");
    const regex = new RegExp(`[:.]${puerto}\\s+.*LISTENING\\s+(\\d+)`, "i");

    for (const linea of lineas) {
      const match = linea.match(regex);
      if (match && match[1]) {
        const pid = match[1].trim();
        let proceso = "Proceso de Windows";
        try {
          const salidaTasklist = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: "utf-8" });
          const partes = salidaTasklist.trim().split(",");
          if (partes.length > 0) {
            proceso = partes[0].replace(/"/g, "").trim();
          }
        } catch {
          // Ignorar fallo al consultar tasklist
        }
        return { pid, proceso };
      }
    }
  } catch {
    // Si netstat falla
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
 * Busca el siguiente puerto consecutivo disponible
 */
async function buscarPuertoSiguienteLibre(puertoInicio, maxIntentos = 30) {
  for (let p = puertoInicio; p < puertoInicio + maxIntentos; p++) {
    if (await verificarPuertoDisponible(p)) {
      return p;
    }
  }
  return puertoInicio + 1;
}

/**
 * Crea lector interactivo compatible tanto con TTY (consola) como con entrada entubada (pipes/scripts)
 */
function crearLectorLineas() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY),
  });

  const bufferLineas = [];
  let resolverSiguiente = null;

  rl.on("line", (linea) => {
    if (resolverSiguiente) {
      const resolver = resolverSiguiente;
      resolverSiguiente = null;
      resolver(linea.trim());
    } else {
      bufferLineas.push(linea.trim());
    }
  });

  return {
    preguntar: (texto) => {
      process.stdout.write(texto);
      if (bufferLineas.length > 0) {
        return Promise.resolve(bufferLineas.shift());
      }
      return new Promise((resolve) => {
        resolverSiguiente = resolve;
      });
    },
    cerrar: () => rl.close(),
  };
}

/**
 * Flujo principal de verificación y configuración interactiva
 */
async function main() {
  const args = process.argv.slice(2);
  const modoCheckOnly = args.includes("--check") || args.includes("--verificar-solo");
  const modoInteractivoForzado = args.includes("--interactivo") || args.includes("-i");

  const envActual = leerVariablesEnv();
  // Normalizar puertos de fábrica: Next.js en 3000 y HTTP Proxy en 80
  let puertoNextActual = parseInt(envActual.PORT || "3000", 10);
  let puertoHttpActual = parseInt(envActual.HTTP_PORT || envActual.PORT_PROXY || "80", 10);
  if (puertoNextActual === 80 && !envActual.HTTP_PORT) {
    puertoNextActual = 3000;
    puertoHttpActual = 80;
  }

  console.log("======================================================================");
  console.log("        VERIFICADOR DE PUERTOS DE RED Y CONECTIVIDAD LOCAL            ");
  console.log("                 SISTEMA POS LOCAL LLANOMIO                           ");
  console.log("======================================================================");
  console.log(`[ANALISIS] Comprobando disponibilidad de puertos de red:`);
  console.log(`  - Puerto Next.js (Aplicacion Web): ${puertoNextActual}`);
  console.log(`  - Puerto HTTP / mDNS (Proxy LAN):  ${puertoHttpActual}`);
  console.log("----------------------------------------------------------------------");

  let libreNext = await verificarPuertoDisponible(puertoNextActual);
  let libreHttp = await verificarPuertoDisponible(puertoHttpActual);

  let infoNext = libreNext ? null : obtenerInfoProcesoEnPuerto(puertoNextActual);
  let infoHttp = libreHttp ? null : obtenerInfoProcesoEnPuerto(puertoHttpActual);

  if (libreNext) {
    console.log(`[OK] Puerto Next.js ${puertoNextActual} esta disponible.`);
  } else {
    const detalle = infoNext ? `${infoNext.proceso} (PID: ${infoNext.pid})` : "Proceso activo";
    console.log(`[CONFLICTO] El puerto ${puertoNextActual} esta OCUPADO por: ${detalle}`);
  }

  if (libreHttp) {
    console.log(`[OK] Puerto HTTP ${puertoHttpActual} esta disponible.`);
  } else {
    const detalle = infoHttp ? `${infoHttp.proceso} (PID: ${infoHttp.pid})` : "Proceso activo";
    console.log(`[CONFLICTO] El puerto ${puertoHttpActual} esta OCUPADO por: ${detalle}`);
  }

  if (modoCheckOnly) {
    if (libreNext && libreHttp) {
      console.log("\n[RESULTADO] Todos los puertos verificados se encuentran libres.");
      process.exit(0);
    } else {
      console.log("\n[RESULTADO] Se encontraron puertos ocupados en el sistema.");
      process.exit(1);
    }
  }

  // Si ambos están libres y no se forzó interactivo, persistir y terminar
  if (libreNext && libreHttp && !modoInteractivoForzado) {
    guardarVariablesEnv({
      PORT: String(puertoNextActual),
      HTTP_PORT: String(puertoHttpActual),
      PORT_PROXY: String(puertoHttpActual),
    });
    console.log("----------------------------------------------------------------------");
    console.log(`[EXITO] Puertos confirmados en .env:`);
    console.log(`  - PORT=${puertoNextActual}`);
    console.log(`  - HTTP_PORT=${puertoHttpActual}`);
    console.log(`  - PORT_PROXY=${puertoHttpActual}`);
    console.log("======================================================================\n");
    process.exit(0);
  }

  // Si hay conflicto o se solicitó interactivo, abrir interfaz de consola
  console.log("\n======================================================================");
  console.log("        CONFIGURACION INTERACTIVA DE PUERTOS DE TIENDA                ");
  console.log("======================================================================");
  console.log("El instalador le permite asignar puertos alternativos libres para");
  console.log("garantizar que el sistema opere sin colisiones con otros programas.");
  console.log("----------------------------------------------------------------------");

  const lector = crearLectorLineas();

  let puertoNextFinal = puertoNextActual;
  let puertoHttpFinal = puertoHttpActual;

  // Opción de liberar procesos si están en conflicto
  if (!libreNext && infoNext && infoNext.pid) {
    const resp = await lector.preguntar(
      `¿Desea intentar liberar el puerto ${puertoNextActual} cerrando ${infoNext.proceso} (PID ${infoNext.pid})? [s/N]: \n`
    );
    if (resp.toLowerCase() === "s" || resp.toLowerCase() === "si") {
      intentarLiberarProceso(infoNext.pid);
      await new Promise((r) => setTimeout(r, 800));
      libreNext = await verificarPuertoDisponible(puertoNextActual);
      if (libreNext) {
        console.log(`[LIBERADO] El puerto ${puertoNextActual} fue liberado con exito.`);
      }
    }
  }

  if (!libreHttp && infoHttp && infoHttp.pid) {
    const resp = await lector.preguntar(
      `¿Desea intentar liberar el puerto ${puertoHttpActual} cerrando ${infoHttp.proceso} (PID ${infoHttp.pid})? [s/N]: \n`
    );
    if (resp.toLowerCase() === "s" || resp.toLowerCase() === "si") {
      intentarLiberarProceso(infoHttp.pid);
      await new Promise((r) => setTimeout(r, 800));
      libreHttp = await verificarPuertoDisponible(puertoHttpActual);
      if (libreHttp) {
        console.log(`[LIBERADO] El puerto ${puertoHttpActual} fue liberado con exito.`);
      }
    }
  }

  // 1. Resolver Puerto de Next.js
  let nextResuelto = libreNext && !modoInteractivoForzado;
  while (!nextResuelto) {
    const sugeridoNext = libreNext ? puertoNextActual : await buscarPuertoSiguienteLibre(3001);
    const entrada = await lector.preguntar(
      `Ingrese el puerto web deseado para Next.js [Por defecto ${puertoNextActual}]: \n`
    );

    const puertoCandidato = entrada ? parseInt(entrada, 10) : puertoNextActual;

    if (isNaN(puertoCandidato) || puertoCandidato < 1 || puertoCandidato > 65535) {
      console.log("[ERROR] Ingrese un numero de puerto valido entre 1 y 65535.");
      continue;
    }

    const estaLibre = await verificarPuertoDisponible(puertoCandidato);
    if (!estaLibre) {
      const info = obtenerInfoProcesoEnPuerto(puertoCandidato);
      const detalle = info ? `${info.proceso} (PID: ${info.pid})` : "En uso";
      console.log(
        `[ADVERTENCIA] El puerto ${puertoCandidato} ya esta ocupado (${detalle}). Puerto sugerido libre: ${sugeridoNext}`
      );
    } else {
      puertoNextFinal = puertoCandidato;
      nextResuelto = true;
      console.log(`[CONFIRMADO] Puerto Next.js asignado: ${puertoNextFinal}`);
    }
  }

  // 2. Resolver Puerto HTTP Local / Proxy mDNS
  let httpResuelto = libreHttp && !modoInteractivoForzado;
  while (!httpResuelto) {
    const sugeridoHttp = libreHttp ? puertoHttpActual : await buscarPuertoSiguienteLibre(8080);
    const entrada = await lector.preguntar(
      `Ingrese el puerto HTTP local [Por defecto ${puertoHttpActual}]: \n`
    );

    const puertoCandidato = entrada ? parseInt(entrada, 10) : puertoHttpActual;

    if (isNaN(puertoCandidato) || puertoCandidato < 1 || puertoCandidato > 65535) {
      console.log("[ERROR] Ingrese un numero de puerto valido entre 1 y 65535.");
      continue;
    }

    if (puertoCandidato === puertoNextFinal) {
      console.log("[ERROR] El puerto HTTP del proxy no puede ser identico al puerto interno de Next.js.");
      continue;
    }

    const estaLibre = await verificarPuertoDisponible(puertoCandidato);
    if (!estaLibre) {
      const info = obtenerInfoProcesoEnPuerto(puertoCandidato);
      const detalle = info ? `${info.proceso} (PID: ${info.pid})` : "En uso";
      console.log(
        `[ADVERTENCIA] El puerto ${puertoCandidato} ya esta ocupado (${detalle}). Puerto sugerido libre: ${sugeridoHttp}`
      );
    } else {
      puertoHttpFinal = puertoCandidato;
      httpResuelto = true;
      console.log(`[CONFIRMADO] Puerto HTTP asignado: ${puertoHttpFinal}`);
    }
  }

  lector.cerrar();

  // 3. Guardar en .env
  guardarVariablesEnv({
    PORT: String(puertoNextFinal),
    HTTP_PORT: String(puertoHttpFinal),
    PORT_PROXY: String(puertoHttpFinal),
  });

  console.log("\n======================================================================");
  console.log("        CONFIGURACION DE RED ACTUALIZADA EXITOSAMENTE                 ");
  console.log("======================================================================");
  console.log(`Se guardaron las siguientes variables en el archivo .env:`);
  console.log(`  * PORT=${puertoNextFinal}        (Motor Next.js)`);
  console.log(`  * HTTP_PORT=${puertoHttpFinal}   (Acceso Web LAN / Proxy mDNS)`);
  console.log(`  * PORT_PROXY=${puertoHttpFinal}  (Compatibilidad de servicios)`);
  console.log("");
  console.log("Direcciones resultantes para esta tienda:");
  if (puertoHttpFinal === 80) {
    console.log("  - Acceso directo local:   http://localhost");
    console.log("  - Dispositivos en Wi-Fi:  http://llanomio.local");
  } else {
    console.log(`  - Acceso directo local:   http://localhost:${puertoHttpFinal}`);
    console.log(`  - Dispositivos en Wi-Fi:  http://llanomio.local:${puertoHttpFinal}`);
  }
  console.log("======================================================================\n");

  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[ERROR CRITICO EN VERIFICADOR DE PUERTOS]", err);
    process.exit(1);
  });
}

module.exports = {
  verificarPuertoDisponible,
  obtenerInfoProcesoEnPuerto,
  buscarPuertoSiguienteLibre,
  leerVariablesEnv,
  guardarVariablesEnv,
};
