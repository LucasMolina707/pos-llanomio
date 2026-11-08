const path = require('path');
const targetDb = path.resolve('database/llanomio_limpio_fabrica.db');
process.env.DATABASE_URL = 'file:' + targetDb.replace(/\\/g, '/');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const seed = require('../database/seed.js');

async function run() {
  if (typeof seed === 'function') {
    await seed(prisma);
  } else if (seed.seedBaseDeDatos) {
    await seed.seedBaseDeDatos(prisma);
  }
  const users = await prisma.user.count();
  const configs = await prisma.configuracionEmpresa.count();
  const sec = await prisma.secuenciaFactura.findUnique({ where: { id: "FACTURA_SECUENCIA" } });
  console.log('RESULTADO_DB_LIMPIA:', { users, configs, ultimoFolio: sec ? sec.ultimoFolio : null });
  await prisma.$disconnect();
}

run().catch(err => {
  console.error("ERROR EN RUN:", err);
  process.exit(1);
});
