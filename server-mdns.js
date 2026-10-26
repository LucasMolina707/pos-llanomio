const http = require("http");
const os = require("os");
const { Bonjour } = require("bonjour-service");

/**
 * Obtiene la direccion IPv4 local del servidor en la red LAN (Wi-Fi o Ethernet)
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

const PUERTO_PROXY = parseInt(process.env.PORT_PROXY || process.env.HTTP_PORT || "80", 10);
const PUERTO_DESTINO = parseInt(process.env.PORT_NEXT || process.env.PORT || "3000", 10);
const ipLocal = obtenerIpLocal();

console.log("=============================================================");
console.log("  INICIANDO SERVICIO mDNS (BONJOUR) Y PROXY LAN - LLANOMIO  ");
console.log("=============================================================");
console.log(`[mDNS] IP Local detectada en red: ${ipLocal}`);

// 1. Inicializar Bonjour / mDNS
const bonjour = new Bonjour();

try {
  const servicioMdns = bonjour.publish({
    name: "llanomio",
    type: "http",
    port: PUERTO_PROXY,
    host: "llanomio.local",
    txt: {
      app: "pos-llanomio",
      version: "1.0.0",
      description: "Punto de Venta Local LLANOMIO",
    },
  });

  servicioMdns.on("up", () => {
    console.log(`[mDNS] Anuncio Zero-Config activo: http://llanomio.local:${PUERTO_PROXY}`);
    console.log(`[mDNS] Cualquier celular o tablet en el Wi-Fi puede ingresar a: http://llanomio.local`);
  });

  servicioMdns.on("error", (err) => {
    console.error("[mDNS] Advertencia en servicio Bonjour:", err);
  });
} catch (errMdns) {
  console.error("[mDNS] Error al inicializar Bonjour:", errMdns);
}

// 2. Servidor Proxy HTTP inverso en Puerto 80 hacia Next.js en Puerto 3000
if (PUERTO_PROXY !== PUERTO_DESTINO) {
  const proxy = http.createServer((req, res) => {
    const opcionesReenvio = {
      hostname: "127.0.0.1",
      port: PUERTO_DESTINO,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: req.headers.host || `llanomio.local:${PUERTO_PROXY}`,
        "x-forwarded-for": req.socket.remoteAddress || "",
        "x-forwarded-host": req.headers.host || "llanomio.local",
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
              <p>El motor de la tienda se esta inicializando en segundo plano.</p>
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

  // Manejo de errores en el puerto 80 (por ejemplo si ya está en uso)
  proxy.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[PROXY] El puerto ${PUERTO_PROXY} ya esta en uso por otro proceso.`);
    } else {
      console.error(`[PROXY] Error en servidor proxy puerto ${PUERTO_PROXY}:`, err);
    }
  });

  proxy.listen(PUERTO_PROXY, "0.0.0.0", () => {
    console.log(`[PROXY] Escuchando en puerto ${PUERTO_PROXY} (0.0.0.0) -> Reenviando a Next.js (127.0.0.1:${PUERTO_DESTINO})`);
    console.log(`[ACCESO] Desde esta maquina: http://localhost o http://llanomio.local`);
    console.log(`[ACCESO] Desde celulares en Wi-Fi: http://llanomio.local o http://${ipLocal}`);
  });
} else {
  console.log(`[MODO NATIVO] Next.js configurado directamente en el puerto ${PUERTO_DESTINO}.`);
  console.log(`[ACCESO] Celulares y tablets: http://llanomio.local o http://${ipLocal}`);
}

// 3. Manejo de senales de terminacion
const cerrarServicios = () => {
  console.log("\n[mDNS] Deteniendo anuncios mDNS y liberando puertos...");
  bonjour.destroy();
  process.exit(0);
};

process.on("SIGINT", cerrarServicios);
process.on("SIGTERM", cerrarServicios);
