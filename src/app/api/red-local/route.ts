import { NextResponse } from "next/server";
import os from "os";

export interface InfoInterfazRed {
  nombre: string;
  ip: string;
  urlPuerto80: string;
  urlPuerto3000: string;
  esWifi: boolean;
  mac?: string;
}

export interface RespuestaRedLocal {
  ok: boolean;
  hostname: string;
  mdnsUrl: string;
  mdnsUrlPort: string;
  puertoProxy: number;
  puertoNext: number;
  ipPrincipal: string;
  urlPrincipal80: string;
  urlPrincipal3000: string;
  interfaces: InfoInterfazRed[];
}

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const hostname = os.hostname();
    const listaInterfaces: InfoInterfazRed[] = [];

    const PUERTO_PROXY = 80;
    const PUERTO_NEXT = 3000;

    for (const nombre of Object.keys(interfaces)) {
      const ifaceList = interfaces[nombre];
      if (ifaceList) {
        for (const iface of ifaceList) {
          // Filtrar únicamente IPv4 que no sean loopback (127.0.0.1)
          if (iface.family === "IPv4" && !iface.internal) {
            const nombreMin = nombre.toLowerCase();
            const esWifi =
              nombreMin.includes("wi-fi") ||
              nombreMin.includes("wifi") ||
              nombreMin.includes("wlan") ||
              nombreMin.includes("wireless");

            listaInterfaces.push({
              nombre,
              ip: iface.address,
              urlPuerto80: `http://${iface.address}`,
              urlPuerto3000: `http://${iface.address}:${PUERTO_NEXT}`,
              esWifi,
              mac: iface.mac,
            });
          }
        }
      }
    }

    // Ordenar priorizando interfaces Wi-Fi o Ethernet reales
    listaInterfaces.sort((a, b) => {
      if (a.esWifi && !b.esWifi) return -1;
      if (!a.esWifi && b.esWifi) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    const ipPrincipal = listaInterfaces.length > 0 ? listaInterfaces[0].ip : "127.0.0.1";

    const respuesta: RespuestaRedLocal = {
      ok: true,
      hostname,
      mdnsUrl: "http://llanomio.local",
      mdnsUrlPort: `http://llanomio.local:${PUERTO_NEXT}`,
      puertoProxy: PUERTO_PROXY,
      puertoNext: PUERTO_NEXT,
      ipPrincipal,
      urlPrincipal80: `http://${ipPrincipal}`,
      urlPrincipal3000: `http://${ipPrincipal}:${PUERTO_NEXT}`,
      interfaces: listaInterfaces,
    };

    return NextResponse.json(respuesta);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido al inspeccionar red";
    return NextResponse.json(
      {
        ok: false,
        error: errorMsg,
        hostname: "localhost",
        mdnsUrl: "http://llanomio.local",
        mdnsUrlPort: "http://llanomio.local:3000",
        puertoProxy: 80,
        puertoNext: 3000,
        ipPrincipal: "127.0.0.1",
        urlPrincipal80: "http://127.0.0.1",
        urlPrincipal3000: "http://127.0.0.1:3000",
        interfaces: [],
      },
      { status: 500 }
    );
  }
}
