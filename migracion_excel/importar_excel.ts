/**
 * Script de migracion inicial de inventario y clientes desde hojas Excel
 * Ubicacion de los archivos fuente: /migracion_excel/excel_fuente/
 */

import { PrismaClient, CategoriaProducto, EstadoPrenda } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function ejecutarMigracion() {
  console.log("Iniciando proceso de verificacion de archivos Excel para migracion...");

  const rutaCarpetaFuente = path.join(__dirname, "excel_fuente");

  if (!fs.existsSync(rutaCarpetaFuente)) {
    console.log(`Creando carpeta fuente en: ${rutaCarpetaFuente}`);
    fs.mkdirSync(rutaCarpetaFuente, { recursive: true });
  }

  const archivos = fs.readdirSync(rutaCarpetaFuente).filter(f => f.endsWith(".xlsx") || f.endsWith(".xls") || f.endsWith(".csv"));

  if (archivos.length === 0) {
    console.log("No se encontraron archivos Excel (.xlsx, .xls) o CSV en migracion_excel/excel_fuente/");
    console.log("Deposite los archivos de inventario o clientes en dicha carpeta para su procesamiento.");
    return;
  }

  console.log(`Se detectaron ${archivos.length} archivos fuente para procesar:`, archivos);
  // Los parsers especificos de columnas se procesaran segun la estructura de las hojas del cliente
}

if (require.main === module) {
  ejecutarMigracion()
    .catch((err) => {
      console.error("Error durante la migracion:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { ejecutarMigracion };
