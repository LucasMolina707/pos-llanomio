// Script de arranque oficial de Next.js en el puerto 3000 para PM2
const path = require("path");

process.env.NODE_ENV = "production";
process.env.PORT = "3000";
process.env.HOSTNAME = "0.0.0.0";

// Reconfigurar process.argv para simular: next start -H 0.0.0.0 -p 3000
const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");
process.argv = [process.argv[0], nextBin, "start", "-H", "0.0.0.0", "-p", "3000"];

require(nextBin);
