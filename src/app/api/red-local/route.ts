import { NextRequest, NextResponse } from "next/server";
import os from "os";
import net from "net";

export interface InfoInterfazRed {
  nombre: string;
  ip: string;
  urlPuerto80: string;
  urlPuerto3000: string;
  urlRecomendada: string;
  esWifi: boolean;
  esFisica: boolean;
  mac?: string;
}

export interface DiagnosticoLAN {
  puerto80Activo: boolean;
  puertoNextActivo: boolean;
  puertoNext: number;
  interfacesDescartadas: string[];
  totalInterfacesFisicas: number;
  advertenciaFirewall: boolean;
}

export interface RespuestaRedLocal {
  ok: boolean;
  hostname: string;
  mdnsUrl: string;
  mdnsUrlPort: string;
  puertoProxy: number;
  puertoNext: number;
  puerto80Activo: boolean;
  ipPrincipal: string;
  urlPredeterminada: string;
  urlPrincipal80: string;
  urlPrincipal3000: string;
  interfaces: InfoInterfazRed[];
  diagnostico?: DiagnosticoLAN;
}

/**
 * Palabras clave para detectar y filtrar interfaces de red virtuales
 */
const PATRONES_INTERFACES_VIRTUALES = [
  "vethernet",
  "wsl",
  "docker",
  "virtualbox",
  "vmware",
  "loopback",
  "tailscale",
  "vboxnet",
  "hyper-v",
  "teredo",
  "npcap",
  "host-only",
  "bluetooth",
];

/**
 * Determina si una interfaz de red es virtual (WSL, Docker, VirtualBox, etc.)
 */
function esInterfazVirtual(nombre: string, ip: string, mac?: string): boolean {
  const nombreMin = nombre.toLowerCase();
  for (const patron of PATRONES_INTERFACES_VIRTUALES) {
    if (nombreMin.includes(patron)) return true;
  }
  // Rango 192.168.56.x es el asignado por defecto a adaptadores VirtualBox Host-Only
  if (ip.startsWith("192.168.56.")) return true;
  // MAC 0a:00:27 pertenece a Oracle / VirtualBox
  if (mac && mac.toLowerCase().startsWith("0a:00:27")) return true;
  return false;
}

/**
 * Calcula una puntuación para ordenar interfaces de red dando prioridad a Wi-Fi y LAN real
 */
function calcularPuntuacionInterfaz(ip: string, esWifi: boolean, esVirtual: boolean): number {
  if (esVirtual) return -100;
  let puntos = 0;

  // Gran preferencia para conexiones Wi-Fi o redes inalámbricas de tienda
  if (esWifi) puntos += 60;

  // Prioridad 1: Rangos 192.168.x.x (estándar de routers comerciales)
  if (ip.startsWith("192.168.")) {
    if (ip.startsWith("192.168.1.") || ip.startsWith("192.168.0.")) {
      puntos += 40;
    } else {
      puntos += 30;
    }
  }
  // Prioridad 2: Rangos 10.x.x.x (redes empresariales grandes)
  else if (ip.startsWith("10.")) {
    puntos += 20;
  }
  // Prioridad 3: Rangos 172.16.x.x - 172.31.x.x
  else if (ip.startsWith("172.")) {
    puntos += 10;
  }

  return puntos;
}

/**
 * Comprueba de forma no bloqueante si un puerto TCP está respondiendo en localhost
 */
async function testPuertoTcp(puerto: number, host = "127.0.0.1", timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let finalizado = false;

    const terminar = (resultado: boolean) => {
      if (!finalizado) {
        finalizado = true;
        socket.destroy();
        resolve(resultado);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => terminar(true));
    socket.on("timeout", () => terminar(false));
    socket.on("error", () => terminar(false));

    try {
      socket.connect(puerto, host);
    } catch {
      terminar(false);
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const interfaces = os.networkInterfaces();
    const hostname = os.hostname();

    // Detectar puerto activo de Next.js desde variable de entorno o header 'host'
    let puertoNext = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const hostHeader = req.headers.get("host") || "";
    if (hostHeader.includes(":")) {
      const portFromHeader = parseInt(hostHeader.split(":")[1], 10);
      if (!isNaN(portFromHeader) && portFromHeader > 0) {
        puertoNext = portFromHeader;
      }
    }

    const PUERTO_PROXY = process.env.PORT_PROXY
      ? parseInt(process.env.PORT_PROXY, 10)
      : (process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 80);

    // Verificar en tiempo real si el puerto 80 y el puerto Next están respondiendo
    const [puerto80Activo, puertoNextActivo] = await Promise.all([
      testPuertoTcp(PUERTO_PROXY, "127.0.0.1", 200),
      testPuertoTcp(puertoNext, "127.0.0.1", 200),
    ]);

    const listaInterfacesFisicas: InfoInterfazRed[] = [];
    const interfacesDescartadas: string[] = [];

    for (const nombre of Object.keys(interfaces)) {
      const ifaceList = interfaces[nombre];
      if (!ifaceList) continue;

      for (const iface of ifaceList) {
        // Filtrar únicamente direcciones IPv4 no internas (descartar 127.0.0.1)
        if (iface.family === "IPv4" && !iface.internal) {
          const esVirtual = esInterfazVirtual(nombre, iface.address, iface.mac);

          if (esVirtual) {
            interfacesDescartadas.push(`${nombre} (${iface.address})`);
            continue;
          }

          const nombreMin = nombre.toLowerCase();
          const esWifi =
            nombreMin.includes("wi-fi") ||
            nombreMin.includes("wifi") ||
            nombreMin.includes("wlan") ||
            nombreMin.includes("wireless");

          const urlPuerto80 =
            PUERTO_PROXY === 80
              ? `http://${iface.address}`
              : `http://${iface.address}:${PUERTO_PROXY}`;
          const urlPuerto3000 = `http://${iface.address}:${puertoNext}`;
          // Si el puerto proxy responde, la recomendada puede ser proxy o directo a Next.js.
          // Priorizamos la que garantice conexión universal en celulares.
          const urlRecomendada = puerto80Activo ? urlPuerto80 : urlPuerto3000;

          listaInterfacesFisicas.push({
            nombre,
            ip: iface.address,
            urlPuerto80,
            urlPuerto3000,
            urlRecomendada,
            esWifi,
            esFisica: true,
            mac: iface.mac,
          });
        }
      }
    }

    // Ordenar interfaces dando prioridad a Wi-Fi y rangos 192.168.x.x
    listaInterfacesFisicas.sort((a, b) => {
      const puntosA = calcularPuntuacionInterfaz(a.ip, a.esWifi, false);
      const puntosB = calcularPuntuacionInterfaz(b.ip, b.esWifi, false);
      return puntosB - puntosA;
    });

    const ipPrincipal = listaInterfacesFisicas.length > 0 ? listaInterfacesFisicas[0].ip : "127.0.0.1";
    const urlHttpPrincipal =
      PUERTO_PROXY === 80 ? `http://${ipPrincipal}` : `http://${ipPrincipal}:${PUERTO_PROXY}`;

    // Si el puerto HTTP/Proxy no está activo, la URL predeterminada DEBE ser con el puerto activo (ej: :3000)
    // para evitar fallos de conexión en celulares
    const urlPredeterminada = puerto80Activo
      ? urlHttpPrincipal
      : `http://${ipPrincipal}:${puertoNext}`;

    const respuesta: RespuestaRedLocal = {
      ok: true,
      hostname,
      mdnsUrl: PUERTO_PROXY === 80 ? "http://pos-local.local" : `http://pos-local.local:${PUERTO_PROXY}`,
      mdnsUrlPort: `http://pos-local.local:${puertoNext}`,
      puertoProxy: PUERTO_PROXY,
      puertoNext,
      puerto80Activo,
      ipPrincipal,
      urlPredeterminada,
      urlPrincipal80: urlHttpPrincipal,
      urlPrincipal3000: `http://${ipPrincipal}:${puertoNext}`,
      interfaces: listaInterfacesFisicas,
      diagnostico: {
        puerto80Activo,
        puertoNextActivo,
        puertoNext,
        interfacesDescartadas,
        totalInterfacesFisicas: listaInterfacesFisicas.length,
        advertenciaFirewall: !puerto80Activo && !puertoNextActivo,
      },
    };

    return NextResponse.json(respuesta);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido al inspeccionar red";
    console.error("[ERROR API RED LOCAL]", errorMsg);

    return NextResponse.json(
      {
        ok: false,
        error: errorMsg,
        hostname: "localhost",
        mdnsUrl: "http://pos-local.local",
        mdnsUrlPort: "http://pos-local.local:3000",
        puertoProxy: 80,
        puertoNext: 3000,
        puerto80Activo: false,
        ipPrincipal: "127.0.0.1",
        urlPredeterminada: "http://127.0.0.1:3000",
        urlPrincipal80: "http://127.0.0.1",
        urlPrincipal3000: "http://127.0.0.1:3000",
        interfaces: [],
      },
      { status: 500 }
    );
  }
}
