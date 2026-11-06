/**
 * Servicio Ligero de Red Local mDNS (Bonjour) y Proxy Inverso HTTP
 * POS LOCAL - Automatizacion de Red LAN (Agentes 1 y 4)
 *
 * Funciones:
 * 1. Lee dinamicamente PORT y HTTP_PORT / PORT_PROXY desde el archivo .env.
 * 2. Anuncia el nombre local 'pos-local.local' en toda la red Wi-Fi / Ethernet mediante Bonjour / mDNS.
 * 3. Si HTTP_PORT es diferente a PORT (ej. 80 frente a 3000), actua como proxy HTTP inverso
 *    para permitir acceso directo sin escribir el numero de puerto en el navegador.
 * 4. CERO emojis en codigo, logs o salidas.
 */

const http = require("http");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { Bonjour } = require("bonjour-service");

const RUTA_RAIZ = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(RUTA_RAIZ, ".env");

/**
 * Lee variables del archivo .env de forma nativa sin librerias externas
 */
function cargarVariablesEnv() {
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
 * Obtiene la direccion IPv4 local del servidor en la red LAN
 */
function obtenerIpLocal() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === "IPv4" && !iface.internal) {
          if (
            iface.address.startsWith("192.168.") ||
            iface.address.startsWith("10.") ||
            iface.address.startsWith("172.")
          ) {
            return iface.address;
          }
        }
      }
    }
  }
  return "127.0.0.1";
}

const configEnv = cargarVariablesEnv();
const PUERTO_DESTINO = parseInt(process.env.PORT || configEnv.PORT || "3000", 10);
const PUERTO_PROXY = parseInt(
  process.env.HTTP_PORT ||
  process.env.PORT_PROXY ||
  configEnv.HTTP_PORT ||
  configEnv.PORT_PROXY ||
  "80",
  10
);
const PUERTO_HTTPS = parseInt(
  process.env.HTTPS_PORT ||
  configEnv.HTTPS_PORT ||
  "3443",
  10
);
const DOMINIO_LOCAL = process.env.LOCAL_DOMAIN || configEnv.LOCAL_DOMAIN || "llanomio.local";
const INSTANCIA_ID = process.env.INSTANCE_ID || configEnv.INSTANCE_ID || "pos-llanomio";
const nombreServicioBonjour = DOMINIO_LOCAL.replace(/\.local$/i, "");
const ipLocal = obtenerIpLocal();

console.log("===============================================================================");
console.log("      INICIANDO SERVICIO mDNS (BONJOUR) Y ENLACE DE RED LAN - POS LOCAL     ");
console.log("===============================================================================");
console.log(`[RED]   IP Local detectada en red:         ${ipLocal}`);
console.log(`[RED]   Dominio Local mDNS (Bonjour):      ${DOMINIO_LOCAL}`);
console.log(`[RED]   Identificador de Instancia:        ${INSTANCIA_ID}`);
console.log(`[RED]   Puerto Servidor Next.js (Destino): ${PUERTO_DESTINO}`);
console.log(`[RED]   Puerto de Salida Proxy HTTP:       ${PUERTO_PROXY}`);

// 1. Inicializar Bonjour / mDNS
let bonjourInstance = null;
try {
  bonjourInstance = new Bonjour();
  const servicioMdns = bonjourInstance.publish({
    name: nombreServicioBonjour,
    type: "http",
    port: PUERTO_PROXY,
    host: DOMINIO_LOCAL,
    txt: {
      app: INSTANCIA_ID,
      version: "1.0.0",
      description: `Punto de Venta Local ${nombreServicioBonjour}`,
    },
  });

  servicioMdns.on("up", () => {
    console.log(`[mDNS]  Anuncio de red activo: http://${DOMINIO_LOCAL}${PUERTO_PROXY === 80 ? "" : ":" + PUERTO_PROXY}`);
    console.log(`[mDNS]  Cualquier dispositivo en la red Wi-Fi puede acceder por nombre de dominio local.`);
  });

  servicioMdns.on("error", (err) => {
    console.warn("[mDNS]  Aviso en servicio Bonjour:", err.message || err);
  });
} catch (errBonjour) {
  console.warn("[mDNS]  No se pudo inicializar Bonjour mDNS:", errBonjour.message || errBonjour);
}

// 2. Servidor Proxy HTTP inverso si los puertos son diferentes
if (PUERTO_PROXY !== PUERTO_DESTINO) {
  const proxy = http.createServer((req, res) => {
    const opcionesReenvio = {
      hostname: "127.0.0.1",
      port: PUERTO_DESTINO,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: req.headers.host || `${DOMINIO_LOCAL}:${PUERTO_PROXY}`,
        "x-forwarded-for": req.socket.remoteAddress || "",
        "x-forwarded-host": req.headers.host || DOMINIO_LOCAL,
        "x-forwarded-proto": "http",
      },
    };

    const peticionDestino = http.request(opcionesReenvio, (respuestaDestino) => {
      res.writeHead(respuestaDestino.statusCode || 200, respuestaDestino.headers);
      respuestaDestino.pipe(res);
    });

    peticionDestino.on("error", (err) => {
      console.error(`[PROXY ERROR] Fallo al reenviar a Next.js (puerto ${PUERTO_DESTINO}):`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "2",
        });
        res.end(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="refresh" content="2">
            <title>LLANOMIO POS - Inicializando</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
              .card { background: white; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e2e8f0; }
              h2 { color: #d97706; margin-top: 0; font-size: 1.5rem; }
              p { color: #64748b; line-height: 1.5; font-size: 0.95rem; }
              .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #d97706; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="spinner"></div>
              <h2>LLANOMIO POS - Conectando al Sistema</h2>
              <p>El motor del servidor se esta inicializando en segundo plano.</p>
              <p>Esta pagina se actualizara automaticamente en un instante...</p>
            </div>
            <script>
              setTimeout(() => { window.location.reload(); }, 2000);
            </script>
          </body>
          </html>
        `);
      }
    });

    req.pipe(peticionDestino);
  });

  proxy.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[PROXY] El puerto ${PUERTO_PROXY} ya esta en uso por otro proceso.`);
    } else {
      console.error(`[PROXY] Error en servidor proxy puerto ${PUERTO_PROXY}:`, err);
    }
  });

  proxy.listen(PUERTO_PROXY, "0.0.0.0", () => {
    console.log(`[PROXY] Escuchando en 0.0.0.0:${PUERTO_PROXY} -> Reenviando a 127.0.0.1:${PUERTO_DESTINO}`);
    console.log(`[URL]   Acceso local: http://localhost${PUERTO_PROXY === 80 ? "" : ":" + PUERTO_PROXY}`);
    console.log(`[URL]   Acceso Wi-Fi: http://${ipLocal}${PUERTO_PROXY === 80 ? "" : ":" + PUERTO_PROXY}`);
    console.log(`[URL]   Dominio LAN:  http://${DOMINIO_LOCAL}${PUERTO_PROXY === 80 ? "" : ":" + PUERTO_PROXY}`);
    console.log("===============================================================================");
  });
} else {
  console.log(`[MODO NATIVO] El servidor opera directamente en el puerto ${PUERTO_DESTINO}.`);
  console.log(`[URL]         Acceso local: http://localhost:${PUERTO_DESTINO}`);
  console.log(`[URL]         Acceso Wi-Fi: http://${ipLocal}:${PUERTO_DESTINO}`);
  console.log(`[URL]         Dominio LAN:  http://${DOMINIO_LOCAL}:${PUERTO_DESTINO}`);
  console.log("===============================================================================");
}

// 3. Cierre limpio
const cerrarServicios = () => {
  console.log("\n[CIERRE] Deteniendo servicio mDNS y liberando enlaces...");
  if (bonjourInstance) {
    try {
      bonjourInstance.destroy();
    } catch {
      // Ignorar error al destruir
    }
  }
  process.exit(0);
};

process.on("SIGINT", cerrarServicios);
process.on("SIGTERM", cerrarServicios);
