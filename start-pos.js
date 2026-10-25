// Script de arranque oficial de Next.js en el puerto 3000 para PM2
const path = require("path");

process.env.NODE_ENV = "production";
process.env.PORT = "3000";

// Reconfigurar process.argv para simular: next start -p 3000 -H 127.0.0.1
const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");
process.argv = [process.argv[0], nextBin, "start", "-p", "3000", "-H", "127.0.0.1"];

require(nextBin);
