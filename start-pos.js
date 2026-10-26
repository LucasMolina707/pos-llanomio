// Script de arranque oficial de Next.js para PM2 con puerto dinamico
const path = require("path");
const fs = require("fs");

function cargarVariablesEnv() {
  const rutaEnv = path.join(__dirname, ".env");
  const env = {};
  if (fs.existsSync(rutaEnv)) {
    const contenido = fs.readFileSync(rutaEnv, "utf-8");
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

const envConfig = cargarVariablesEnv();
const puerto = process.env.PORT || envConfig.PORT || "3000";

process.env.NODE_ENV = "production";
process.env.PORT = String(puerto);
process.env.HOSTNAME = "0.0.0.0";

// Reconfigurar process.argv para pasar argumentos dinámicos a Next.js start
const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");
process.argv = [process.argv[0], nextBin, "start", "-H", "0.0.0.0", "-p", String(puerto)];

require(nextBin);
