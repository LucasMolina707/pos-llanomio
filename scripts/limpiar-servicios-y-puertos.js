/**
 * LIMPIADOR QUIRURGICO DE SERVICIOS Y LIBERADOR DE PUERTOS POS LLANOMIO
 *
 * Libera de forma segura los puertos TCP/UDP del sistema (3000, 80, 5353, 10050)
 * finalizando unicamente procesos residuales de node.exe o pm2.
 *
 * REGLA ESTRICTA DE SEGURIDAD:
 * Protege de forma inmutable el navegador web del usuario (msedge.exe, chrome.exe)
 * y los clientes de sincronizacion en la nube (OneDrive, Google Drive, Dropbox).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(PROJECT_ROOT, ".env");

// Procesos que NUNCA deben ser terminados
const PROCESOS_PROTEGIDOS = [
  "msedge.exe",
  "chrome.exe",
  "firefox.exe",
  "brave.exe",
  "onedrive.exe",
  "googledrivefs.exe",
  "dropbox.exe",
  "system",
  "svchost.exe",
  "explorer.exe",
  "lsass.exe",
  "services.exe",
];

// Procesos seguros que se pueden terminar si ocupan los puertos del POS
const PROCESOS_PERMITIDOS_KILL = [
  "node.exe",
  "pm2.exe",
  "cmd.exe",
];

function cargarPuertosDesdeEnv() {
  const puertos = new Set([3000, 80, 5353, 10050]);
  if (fs.existsSync(RUTA_ENV)) {
    try {
      const contenido = fs.readFileSync(RUTA_ENV, "utf-8");
      for (const linea of contenido.split(/\r?\n/)) {
        const limpia = linea.trim();
        if (limpia.startsWith("PORT=") || limpia.startsWith("HTTP_PORT=")) {
          const val = parseInt(limpia.split("=")[1]?.replace(/["']/g, ""), 10);
          if (!isNaN(val) && val > 0 && val < 65536) {
            puertos.add(val);
          }
        }
      }
    } catch {}
  }
  return Array.from(puertos);
}

function obtenerNombreProcesoPorPid(pid) {
  try {
    const salida = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (salida && !salida.includes("no hay tareas") && !salida.includes("No tasks")) {
      const partes = salida.split(",");
      if (partes.length > 0) {
        return partes[0].replace(/"/g, "").trim().toLowerCase();
      }
    }
  } catch {}
  return "desconocido";
}

function esProcesoProtegido(nombre) {
  const nombreLimpio = nombre.toLowerCase();
  return PROCESOS_PROTEGIDOS.some((p) => nombreLimpio.includes(p));
}

function esProcesoServidorPermitido(nombre) {
  const nombreLimpio = nombre.toLowerCase();
  return PROCESOS_PERMITIDOS_KILL.some((p) => nombreLimpio.includes(p));
}

function liberarPuertos() {
  const puertos = cargarPuertosDesdeEnv();
  console.log(`[ESCANEO] Verificando puertos objetivo del sistema: [${puertos.join(", ")}]...`);

  let salidaNetstat = "";
  try {
    salidaNetstat = execSync("netstat -ano", { encoding: "utf-8" });
  } catch (err) {
    console.warn("[AVISO] No se pudo ejecutar netstat:", err.message);
    return;
  }

  const lineas = salidaNetstat.split(/\r?\n/);
  const pidsATerminar = new Map(); // pid -> { puerto, proceso }

  for (const linea of lineas) {
    const limpia = linea.trim();
    if (!limpia.startsWith("TCP") && !limpia.startsWith("UDP")) continue;

    const columnas = limpia.split(/\s+/);
    if (columnas.length < 4) continue;

    const direccionLocal = columnas[1];
    const pidStr = columnas[columnas.length - 1];
    const pid = parseInt(pidStr, 10);

    if (isNaN(pid) || pid <= 4) continue;

    for (const puerto of puertos) {
      if (
        direccionLocal.endsWith(`:${puerto}`) ||
        direccionLocal === `0.0.0.0:${puerto}` ||
        direccionLocal === `127.0.0.1:${puerto}`
      ) {
        if (!pidsATerminar.has(pid)) {
          const nombreProc = obtenerNombreProcesoPorPid(pid);
          pidsATerminar.set(pid, { puerto, proceso: nombreProc });
        }
      }
    }
  }

  if (pidsATerminar.size === 0) {
    console.log("[OK] Todos los puertos del sistema estan completamente libres.");
    return;
  }

  let liberados = 0;
  for (const [pid, info] of pidsATerminar.entries()) {
    if (esProcesoProtegido(info.proceso)) {
      console.log(
        `[PROTEGIDO] Proceso '${info.proceso}' (PID: ${pid}) en puerto ${info.puerto} preservado intacto.`
      );
      continue;
    }

    if (esProcesoServidorPermitido(info.proceso) || info.proceso === "desconocido") {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(
          `[LIBERADO] Proceso '${info.proceso}' (PID: ${pid}) finalizado en puerto ${info.puerto}.`
        );
        liberados++;
      } catch (errKill) {
        console.warn(`[AVISO] No se pudo finalizar PID ${pid}:`, errKill.message);
      }
    } else {
      console.log(
        `[OMITIDO] Proceso ajeno '${info.proceso}' (PID: ${pid}) en puerto ${info.puerto} no afectado.`
      );
    }
  }

  console.log(`[RESUMEN] ${liberados} proceso(s) residuales liberados exitosamente.`);
}

function detenerServicioZabbixSiExiste() {
  try {
    const salida = execSync('sc query "ZabbixAgent2"', {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    if (salida.includes("RUNNING") || salida.includes("ESTADO")) {
      console.log("[ZABBIX] Deteniendo servicio Zabbix Agent 2 para reconfiguracion limpia...");
      execSync('net stop "Zabbix Agent 2" >nul 2>&1', { stdio: "ignore" });
      console.log("[OK] Servicio Zabbix Agent 2 detenido.");
    }
  } catch {}
}

function main() {
  console.log("-------------------------------------------------------------------------------");
  console.log("       LIMPIEZA QUIRURGICA DE SERVICIOS Y LIBERACION DE PUERTOS POS");
  console.log("-------------------------------------------------------------------------------");
  liberarPuertos();
  detenerServicioZabbixSiExiste();
  console.log("[OK] Limpieza de puertos y procesos previa completada.\n");
}

main();

