/**
 * SCRIPT DE RESTABLECIMIENTO TOTAL DE FÁBRICA / FACTORY RESET COMERCIAL
 * POS LLANOMIO
 * 
 * Propósito:
 * Purga de raíz todas las transacciones, facturas, clientes, prendas, gastos,
 * auditorías y turnos de caja. Compacta físicamente la base de datos SQLite
 * y siembra la configuración neutra de fábrica lista para un comercio nuevo.
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

    const gastos = await prisma.gasto.deleteMany({});
    console.log(`   -> Gastos operativos eliminados: ${gastos.count}`);

    const empleados = await prisma.empleadoGasto.deleteMany({});
    console.log(`   -> Empleados de nómina eliminados: ${empleados.count}`);

    const categoriasGasto = await prisma.categoriaGasto.deleteMany({});
    console.log(`   -> Categorías de gasto eliminadas: ${categoriasGasto.count}`);

    const facturas = await prisma.factura.deleteMany({});
    console.log(`   -> Facturas eliminadas: ${facturas.count}`);

    const cierres = await prisma.cierreCaja.deleteMany({});
    console.log(`   -> Cierres de caja eliminados: ${cierres.count}`);

    const turnos = await prisma.turnoCaja.deleteMany({});
    console.log(`   -> Turnos de caja eliminados: ${turnos.count}`);

    const auditorias = await prisma.auditoriaSesion.deleteMany({});
    console.log(`   -> Auditorías de sesión eliminadas: ${auditorias.count}`);

    console.log("\n2. Purgando catálogos de clientes y productos/prendas...");
    const productos = await prisma.producto.deleteMany({});
    console.log(`   -> Productos/Prendas eliminados: ${productos.count}`);

    const clientes = await prisma.cliente.deleteMany({});
    console.log(`   -> Clientes eliminados: ${clientes.count}`);

    console.log("\n3. Purgando usuarios, configuración previa y secuencias...");
    const usuarios = await prisma.user.deleteMany({});
    console.log(`   -> Usuarios eliminados: ${usuarios.count}`);

    const configs = await prisma.configuracionEmpresa.deleteMany({});
    console.log(`   -> Configuraciones empresariales eliminadas: ${configs.count}`);

    const secuencias = await prisma.secuenciaFactura.deleteMany({});
    console.log(`   -> Secuencias eliminadas: ${secuencias.count}`);

    // 2. Reiniciar contadores de autoincrementales en SQLite
    console.log("\n4. Reiniciando secuencias de autoincrementales en SQLite...");
    try {
      await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence;");
      console.log("   -> [OK] sqlite_sequence reiniciada exitosamente a 0.");
    } catch {
      console.log("   -> [INFO] sqlite_sequence vacía o no requerida.");
    }

    // 3. Sembrar datos limpios de fábrica
    console.log("\n5. Sembrando registros neutros de fábrica...");
    await seedBaseDeDatos(prisma);

    // 4. Truncar WAL y compactar físicamente el archivo SQLite en disco
    console.log("\n6. Ejecutando PRAGMA wal_checkpoint(TRUNCATE) y VACUUM...");
    try {
      await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {}
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
    const conteoGastos = await prisma.gasto.count();
    const conteoEmpleados = await prisma.empleadoGasto.count();
    const conteoCatGasto = await prisma.categoriaGasto.count();
    const conteoUsuarios = await prisma.user.count();
    const conteoConfig = await prisma.configuracionEmpresa.count();
    const secuencia = await prisma.secuenciaFactura.findUnique({ where: { id: "FACTURA_SECUENCIA" } });

    console.log(`- Clientes:                ${conteoClientes} (Esperado: 0)`);
    console.log(`- Productos / Prendas:     ${conteoProductos} (Esperado: 0)`);
    console.log(`- Facturas:                ${conteoFacturas} (Esperado: 0)`);
    console.log(`- Detalles de Factura:     ${conteoDetalles} (Esperado: 0)`);
    console.log(`- Abonos:                  ${conteoAbonos} (Esperado: 0)`);
    console.log(`- Turnos de Caja:          ${conteoTurnos} (Esperado: 0)`);
    console.log(`- Cierres de Caja:         ${conteoCierres} (Esperado: 0)`);
    console.log(`- Gastos:                  ${conteoGastos} (Esperado: 0)`);
    console.log(`- Empleados de Nómina:     ${conteoEmpleados} (Esperado: 0)`);
    console.log(`- Categorías de Gastos:    ${conteoCatGasto} (Esperado: 9)`);
    console.log(`- Usuarios (Admin):        ${conteoUsuarios} (Esperado: 1)`);
    console.log(`- Configuración Empresa:   ${conteoConfig} (Esperado: 1)`);
    console.log(`- Secuencia Facturas:      ${secuencia?.ultimoFolio} (Esperado: 1000 -> próxima N° 1001)`);

    const estadoOk =
      conteoClientes === 0 &&
      conteoProductos === 0 &&
      conteoFacturas === 0 &&
      conteoDetalles === 0 &&
      conteoAbonos === 0 &&
      conteoTurnos === 0 &&
      conteoCierres === 0 &&
      conteoGastos === 0 &&
      conteoEmpleados === 0 &&
      conteoCatGasto === 9 &&
      conteoUsuarios === 1 &&
      conteoConfig === 1 &&
      secuencia?.ultimoFolio === 1000;

    if (estadoOk) {
      console.log("\n[EXITO TOTAL] La base de datos ha quedado 100% LIMPIA, VIRGEN Y EN ESTADO PURO DE FABRICA.");
      console.log("- Credencial Administrador Inicial: Usuario 'admin' / Contraseña 'admin123' (Rol ADMIN)");
      console.log("- Protocolo de Recuperacion: 3 Factores (Doc: 0000000000, PIN: 000000, Pregunta/Respuesta: admin)");
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
