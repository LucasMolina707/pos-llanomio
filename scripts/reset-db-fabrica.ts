/**
 * SCRIPT DE RESTABLECIMIENTO DE FÁBRICA / FACTORY RESET TOTAL
 * POS LLANOMIO
 * 
 * Propósito:
 * Purga de raíz todos los datos operativos, facturas, clientes, prendas y auditorías,
 * reinicia las secuencias de SQLite (sqlite_sequence), compacta el archivo físico
 * con VACUUM y deja el sistema virgen con un único usuario administrador inicial.
 */

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./llanomio.db";
} else if (process.env.DATABASE_URL.startsWith("file:./database/")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace("file:./database/", "file:./");
}

import { PrismaClient } from "@prisma/client";
import { seedBaseDeDatos } from "../database/seed";

const prisma = new PrismaClient();

async function resetearBaseDeDatosAFabrica() {
  console.log("=================================================================");
  console.log("INICIANDO RESTABLECIMIENTO TOTAL DE FÁBRICA (FACTORY RESET)...");
  console.log("=================================================================\n");

  try {
    // 1. Borrado relacional en orden estricto de dependencias foráneas
    console.log("1. Purgando tablas de transacciones y registros contables...");
    const abonos = await prisma.abono.deleteMany({});
    console.log(`   -> Abonos eliminados: ${abonos.count}`);

    const detalles = await prisma.detalleFactura.deleteMany({});
    console.log(`   -> Detalles de factura eliminados: ${detalles.count}`);

    const facturas = await prisma.factura.deleteMany({});
    console.log(`   -> Facturas eliminadas: ${facturas.count}`);

    const turnos = await prisma.turnoCaja.deleteMany({});
    console.log(`   -> Turnos de caja eliminados: ${turnos.count}`);

    const cierres = await prisma.cierreCaja.deleteMany({});
    console.log(`   -> Cierres de caja eliminados: ${cierres.count}`);

    const auditorias = await prisma.auditoriaSesion.deleteMany({});
    console.log(`   -> Auditorías de sesión eliminadas: ${auditorias.count}`);

    console.log("\n2. Purgando catálogos de clientes y productos/prendas...");
    const productos = await prisma.producto.deleteMany({});
    console.log(`   -> Productos/Prendas eliminados: ${productos.count}`);

    const clientes = await prisma.cliente.deleteMany({});
    console.log(`   -> Clientes eliminados: ${clientes.count}`);

    console.log("\n3. Purgando usuarios y configuración previa...");
    const usuarios = await prisma.user.deleteMany({});
    console.log(`   -> Usuarios eliminados: ${usuarios.count}`);

    const configs = await prisma.configuracionEmpresa.deleteMany({});
    console.log(`   -> Configuraciones empresariales eliminadas: ${configs.count}`);

    // 2. Reiniciar contadores de autoincrementales en SQLite
    console.log("\n4. Reiniciando secuencias de autoincrementales en SQLite...");
    try {
      await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence;");
      console.log("   -> [OK] sqlite_sequence reiniciada exitosamente a 0.");
    } catch (err) {
      console.log("   -> [INFO] sqlite_sequence vacía o no requerida.");
    }

    // 3. Sembrar datos limpios de fábrica
    console.log("\n5. Sembrando registros neutros de fábrica...");
    await seedBaseDeDatos(prisma);

    // 4. Compactar y desfragmentar el archivo SQLite en disco
    console.log("\n6. Ejecutando VACUUM para compactación física de database/llanomio.db...");
    await prisma.$executeRawUnsafe("VACUUM;");
    console.log("   -> [OK] Archivo de base de datos compactado a su tamaño mínimo de fábrica.");

    // 5. Verificación final de conteos en SQLite
    console.log("\n=================================================================");
    console.log("VERIFICACIÓN DE ESTADO VIRGEN DE LA BASE DE DATOS (QA):");
    console.log("=================================================================");
    const conteoClientes = await prisma.cliente.count();
    const conteoProductos = await prisma.producto.count();
    const conteoFacturas = await prisma.factura.count();
    const conteoDetalles = await prisma.detalleFactura.count();
    const conteoAbonos = await prisma.abono.count();
    const conteoTurnos = await prisma.turnoCaja.count();
    const conteoCierres = await prisma.cierreCaja.count();
    const conteoUsuarios = await prisma.user.count();
    const conteoConfig = await prisma.configuracionEmpresa.count();

    console.log(`- Clientes:                ${conteoClientes} (Esperado: 0)`);
    console.log(`- Productos / Prendas:     ${conteoProductos} (Esperado: 0)`);
    console.log(`- Facturas:                ${conteoFacturas} (Esperado: 0)`);
    console.log(`- Detalles de Factura:     ${conteoDetalles} (Esperado: 0)`);
    console.log(`- Abonos:                  ${conteoAbonos} (Esperado: 0)`);
    console.log(`- Turnos de Caja:          ${conteoTurnos} (Esperado: 0)`);
    console.log(`- Cierres de Caja:         ${conteoCierres} (Esperado: 0)`);
    console.log(`- Usuarios (Admin):        ${conteoUsuarios} (Esperado: 1)`);
    console.log(`- Configuración Empresa:   ${conteoConfig} (Esperado: 1)`);

    const estadoOk =
      conteoClientes === 0 &&
      conteoProductos === 0 &&
      conteoFacturas === 0 &&
      conteoDetalles === 0 &&
      conteoAbonos === 0 &&
      conteoTurnos === 0 &&
      conteoCierres === 0 &&
      conteoUsuarios === 1 &&
      conteoConfig === 1;

    if (estadoOk) {
      console.log("\n[EXITO TOTAL] La base de datos ha quedado 100% LIMPIA Y LISTA DE FABRICA.");
    } else {
      console.warn("\n[ADVERTENCIA] Algunos conteos no coinciden con los valores esperados de fábrica.");
    }
  } catch (error) {
    console.error("Error fatal durante el restablecimiento de fábrica:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetearBaseDeDatosAFabrica();
