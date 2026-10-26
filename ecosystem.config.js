const path = require("path");
const fs = require("fs");

/**
 * Carga variables de entorno desde .env sin dependencias externas
 */
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
const puertoNext = process.env.PORT || envConfig.PORT || "3000";
const puertoProxy =
  process.env.HTTP_PORT ||
  process.env.PORT_PROXY ||
  envConfig.HTTP_PORT ||
  envConfig.PORT_PROXY ||
  "80";

module.exports = {
  apps: [
    {
      name: "pos-llanomio",
      script: path.join(__dirname, "start-pos.js"),
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: String(puertoNext),
        HOSTNAME: "0.0.0.0",
      },
    },
    {
      name: "pos-mdns-proxy",
      script: path.join(__dirname, "server-mdns.js"),
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        PORT_PROXY: String(puertoProxy),
        PORT_NEXT: String(puertoNext),
      },
    },
  ],
};
