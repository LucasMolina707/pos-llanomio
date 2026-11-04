/**
 * SCRIPT DE SEMBRADO Y PRESERVACIÓN DE DATOS DEMO OFICIALES
 * POS LLANOMIO
 * 
 * Ejecución:
 *   npx tsx scripts/sembrar-datos-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import { sembrarDatosDemoPermanentes } from "../src/lib/datos-demo";

const prisma = new PrismaClient();

async function main() {
  console.log("===============================================================================");
  console.log("    SEMBRANDO Y PRESERVANDO DATOS DEMO PERMANENTES (CLIENTE + PRODUCTOS)");
  console.log("===============================================================================\n");

  try {
    const res = await sembrarDatosDemoPermanentes(prisma);

    console.log("[OK] Cliente Demo registrado / actualizado:");
    console.log(`     - Nombre:    ${res.cliente.nombre}`);
    console.log(`     - Documento: ${res.cliente.documento}`);
    console.log(`     - Teléfonos: ${res.cliente.telefono} | ${res.cliente.telefonoSecundario}\n`);

    console.log("[OK] Productos Demo de Alquiler registrados (2 ítems):");
    for (const a of res.alquiler) {
      console.log(`     - [${a.codigo}] ${a.nombre} (Canon: $${a.precioAlquilerBase.toLocaleString("es-CO")}, Mora: $${a.tarifaMoraPorDia.toLocaleString("es-CO")}/día, Stock: ${a.stockActual})`);
    }

    console.log("\n[OK] Productos Demo de Venta registrados (2 ítems):");
    for (const v of res.venta) {
      console.log(`     - [${v.codigo}] ${v.nombre} (Precio: $${v.precioVenta.toLocaleString("es-CO")}, Stock: ${v.stockActual})`);
    }

    console.log("\n===============================================================================");
    console.log("     DATOS DEMO LISTOS PARA OPERAR EN CAJA, ALQUILERES E INVENTARIO");
    console.log("===============================================================================\n");
  } catch (error) {
    console.error("Error al sembrar datos demo:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

