/**
 * Script Principal de Migración Masiva de Datos desde Archivos Excel
 * Lee archivos de Clientes e Inventario, normaliza campos, elimina duplicados
 * e inyecta los datos atómicamente en SQLite mediante transacciones de Prisma.
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import prisma from "../lib/prisma";
import {
  sanitizarDocumento,
  normalizarNombre,
  normalizarTelefonoColombia,
  sanitizarTexto,
  parsearNumeroPositivo,
  normalizarCategoria,
  normalizarEstadoPrenda,
  desduplicarPorClave,
} from "./utils-limpieza";
import { CategoriaProducto, EstadoPrenda } from "@prisma/client";

interface FilaClienteRaw {
  [key: string]: unknown;
}

interface FilaPrendaRaw {
  [key: string]: unknown;
}

interface ClienteNormalizado {
  documento: string;
  nombre: string;
  telefono: string;
  direccion: string;
  notas: string;
  origen: string;
}

interface PrendaNormalizada {
  codigo: string;
  nombre: string;
  categoria: CategoriaProducto;
  talla: string;
  color: string;
  stockActual: number;
  estadoPrenda: EstadoPrenda;
  precioVenta: number;
  precioAlquilerBase: number;
  tiempoAlquilerBaseHoras: number;
  tarifaMoraPorDia: number;
  tarifaMoraPorHora: number;
  origen: string;
}

/**
 * Obtiene el valor de una fila buscando entre posibles variaciones de nombres de columna
 */
function buscarValorColumna(fila: Record<string, unknown>, posiblesNombres: string[]): unknown {
  const llavesFila = Object.keys(fila);
  for (const posible of posiblesNombres) {
    const llaveEncontrada = llavesFila.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/gi, "") === posible.toLowerCase().replace(/[^a-z0-9]/gi, "")
    );
    if (llaveEncontrada !== undefined && fila[llaveEncontrada] !== undefined) {
      return fila[llaveEncontrada];
    }
  }
  return undefined;
}

/**
 * Procesa las hojas de un archivo Excel de Clientes
 */
function extraerClientesDeArchivo(rutaArchivo: string): ClienteNormalizado[] {
  const clientes: ClienteNormalizado[] = [];
  const workbook = XLSX.readFile(rutaArchivo, { cellDates: true });

  for (const nombreHoja of workbook.SheetNames) {
    const hoja = workbook.Sheets[nombreHoja];
    const filas: FilaClienteRaw[] = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    for (const fila of filas) {
      const documentoRaw = buscarValorColumna(fila, [
        "identificacion",
        "documento",
        "cedula",
        "nit",
        "doc",
        "id_cliente",
        "cc",
      ]);
      const nombreRaw = buscarValorColumna(fila, [
        "nombre",
        "nombre completo",
        "nombres",
        "cliente",
        "razon social",
      ]);
      const telefonoRaw = buscarValorColumna(fila, [
        "telefono",
        "celular",
        "tel",
        "contacto",
        "movil",
      ]);
      const direccionRaw = buscarValorColumna(fila, [
        "direccion",
        "dir",
        "ubicacion",
        "domicilio",
      ]);
      const notasRaw = buscarValorColumna(fila, [
        "notas",
        "observaciones",
        "nota",
        "comentarios",
        "detalle",
      ]);

      const documento = sanitizarDocumento(documentoRaw);
      const nombre = normalizarNombre(nombreRaw);

      // Descartar filas sin documento o sin nombre
      if (!documento || !nombre) continue;

      clientes.push({
        documento,
        nombre,
        telefono: normalizarTelefonoColombia(telefonoRaw),
        direccion: sanitizarTexto(direccionRaw),
        notas: sanitizarTexto(notasRaw),
        origen: `${path.basename(rutaArchivo)} - Hoja: ${nombreHoja}`,
      });
    }
  }

  return clientes;
}

/**
 * Procesa las hojas de un archivo Excel de Inventario
 */
function extraerPrendasDeArchivo(rutaArchivo: string): PrendaNormalizada[] {
  const prendas: PrendaNormalizada[] = [];
  const workbook = XLSX.readFile(rutaArchivo, { cellDates: true });

  for (const nombreHoja of workbook.SheetNames) {
    const hoja = workbook.Sheets[nombreHoja];
    const filas: FilaPrendaRaw[] = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    for (const fila of filas) {
      const codigoRaw = buscarValorColumna(fila, [
        "codigo",
        "referencia",
        "ref",
        "id_prenda",
        "cod",
        "codigo_prenda",
      ]);
      const nombreRaw = buscarValorColumna(fila, [
        "descripcion",
        "nombre",
        "prenda",
        "articulo",
        "detalle",
        "producto",
      ]);
      const categoriaRaw = buscarValorColumna(fila, [
        "categoria",
        "tipo",
        "operacion",
        "clasificacion",
      ]);
      const tallaRaw = buscarValorColumna(fila, [
        "talla",
        "size",
        "medida",
        "tamano",
      ]);
      const colorRaw = buscarValorColumna(fila, [
        "color",
        "tono",
      ]);
      const stockRaw = buscarValorColumna(fila, [
        "stock",
        "cantidad",
        "cant",
        "existencias",
        "unidades",
      ]);
      const estadoRaw = buscarValorColumna(fila, [
        "estado",
        "condicion",
        "estado_prenda",
      ]);
      const precioVentaRaw = buscarValorColumna(fila, [
        "precio venta",
        "venta",
        "precio_venta",
        "valor venta",
      ]);
      const precioAlquilerRaw = buscarValorColumna(fila, [
        "precio alquiler",
        "alquiler",
        "precio_alquiler",
        "valor alquiler",
        "precio base",
      ]);
      const moraDiaRaw = buscarValorColumna(fila, [
        "tarifa mora dia",
        "mora dia",
        "recargo dia",
        "tarifa_mora_dia",
      ]);
      const moraHoraRaw = buscarValorColumna(fila, [
        "tarifa mora hora",
        "mora hora",
        "recargo hora",
        "tarifa_mora_hora",
      ]);

      const codigo = sanitizarTexto(codigoRaw).toUpperCase();
      const nombre = sanitizarTexto(nombreRaw);

      // Descartar filas sin código o sin descripción
      if (!codigo || !nombre) continue;

      const categoria = normalizarCategoria(categoriaRaw);
      const stock = Math.max(1, Math.floor(parsearNumeroPositivo(stockRaw, 1)));
      const precioVenta = parsearNumeroPositivo(precioVentaRaw, 0);
      const precioAlquilerBase = parsearNumeroPositivo(precioAlquilerRaw, 0);
      const tarifaMoraPorDia = parsearNumeroPositivo(moraDiaRaw, 0);
      const tarifaMoraPorHora = parsearNumeroPositivo(moraHoraRaw, 0);

      prendas.push({
        codigo,
        nombre,
        categoria,
        talla: sanitizarTexto(tallaRaw),
        color: sanitizarTexto(colorRaw),
        stockActual: stock,
        estadoPrenda: normalizarEstadoPrenda(estadoRaw),
        precioVenta,
        precioAlquilerBase,
        tiempoAlquilerBaseHoras: 24,
        tarifaMoraPorDia,
        tarifaMoraPorHora,
        origen: `${path.basename(rutaArchivo)} - Hoja: ${nombreHoja}`,
      });
    }
  }

  return prendas;
}

/**
 * Función principal que orquesta la lectura, limpieza y volcado en SQLite
 */
export async function ejecutarMigracionMasiva(directorioFuente?: string) {
  console.log("======================================================================");
  console.log("       SISTEMA POS LLANOMIO - MIGRACION MASIVA DE EXCEL A SQLITE      ");
  console.log("======================================================================");

  // 1. Determinar directorios de origen
  const carpetaOrigen =
    directorioFuente ||
    (fs.existsSync(path.join(process.cwd(), "migracion_excel", "origen"))
      ? path.join(process.cwd(), "migracion_excel", "origen")
      : path.join(process.cwd(), "migracion_excel", "excel_fuente"));

  console.log(`Buscando archivos fuente en: ${carpetaOrigen}`);

  if (!fs.existsSync(carpetaOrigen)) {
    throw new Error(`El directorio fuente no existe: ${carpetaOrigen}`);
  }

  const archivos = fs
    .readdirSync(carpetaOrigen)
    .filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls") || f.endsWith(".csv"));

  if (archivos.length === 0) {
    console.log("No se encontraron archivos .xlsx, .xls o .csv para procesar.");
    return {
      clientesInsertados: 0,
      prendasInsertadas: 0,
      duplicadosClientes: 0,
      duplicadosPrendas: 0,
    };
  }

  console.log(`Archivos detectados (${archivos.length}):`, archivos);

  const todosLosClientes: ClienteNormalizado[] = [];
  const todasLasPrendas: PrendaNormalizada[] = [];

  // 2. Extraer información según el contenido de cada archivo
  for (const archivo of archivos) {
    const rutaCompleta = path.join(carpetaOrigen, archivo);
    const nombreMin = archivo.toLowerCase();

    if (nombreMin.includes("cliente")) {
      console.log(`Procesando archivo de Clientes: ${archivo}...`);
      const extraidos = extraerClientesDeArchivo(rutaCompleta);
      todosLosClientes.push(...extraidos);
    } else if (
      nombreMin.includes("prenda") ||
      nombreMin.includes("inventario") ||
      nombreMin.includes("disfraz") ||
      nombreMin.includes("traje")
    ) {
      console.log(`Procesando archivo de Inventario / Prendas: ${archivo}...`);
      const extraidas = extraerPrendasDeArchivo(rutaCompleta);
      todasLasPrendas.push(...extraidas);
    } else {
      // Si el nombre no es explícito, intentar extraer de ambas categorías
      const clientesTest = extraerClientesDeArchivo(rutaCompleta);
      const prendasTest = extraerPrendasDeArchivo(rutaCompleta);
      if (clientesTest.length > 0) todosLosClientes.push(...clientesTest);
      if (prendasTest.length > 0) todasLasPrendas.push(...prendasTest);
    }
  }

  // 3. Limpieza y Deduplicación
  console.log("\nEjecutando proceso de limpieza y deduplicación...");

  // Deduplicar clientes basándose estrictamente en el número de documento
  const { registrosUnicos: clientesUnicos, duplicadosOmitidos: duplicadosClientes } =
    desduplicarPorClave(todosLosClientes, (c) => c.documento);

  // Deduplicar prendas basándose en el código
  const { registrosUnicos: prendasUnicas, duplicadosOmitidos: duplicadosPrendas } =
    desduplicarPorClave(todasLasPrendas, (p) => p.codigo);

  console.log(` - Total clientes leidos: ${todosLosClientes.length} | Unicos: ${clientesUnicos.length} | Duplicados omitidos: ${duplicadosClientes}`);
  console.log(` - Total prendas leidas:   ${todasLasPrendas.length} | Unicas: ${prendasUnicas.length} | Duplicados omitidos: ${duplicadosPrendas}`);

  // 4. Inyección Atómica en SQLite Vía Prisma Transaction
  console.log("\nIniciando inyección atómica en SQLite con prisma.$transaction...");

  let clientesAfectados = 0;
  let prendasAfectadas = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        // 4.1 Inyectar Clientes
        for (const c of clientesUnicos) {
          try {
            await tx.cliente.upsert({
              where: { documento: c.documento },
              update: {
                nombre: c.nombre,
                telefono: c.telefono || null,
                direccion: c.direccion || null,
                notas: c.notas || null,
              },
              create: {
                documento: c.documento,
                nombre: c.nombre,
                telefono: c.telefono || null,
                direccion: c.direccion || null,
                notas: c.notas || null,
              },
            });
            clientesAfectados++;
          } catch (errFila) {
            console.error(`[FALLO EN FILA CLIENTE] Documento: ${c.documento} - Nombre: ${c.nombre}`);
            throw errFila; // Provoca rollback atómico de la transacción
          }
        }

        // 4.2 Inyectar Prendas / Inventario
        for (const p of prendasUnicas) {
          try {
            await tx.producto.upsert({
              where: { codigo: p.codigo },
              update: {
                nombre: p.nombre,
                categoria: p.categoria,
                talla: p.talla || null,
                color: p.color || null,
                stockActual: p.stockActual,
                estadoPrenda: p.estadoPrenda,
                precioVenta: p.precioVenta,
                precioAlquilerBase: p.precioAlquilerBase,
                tiempoAlquilerBaseHoras: p.tiempoAlquilerBaseHoras,
                tarifaMoraPorDia: p.tarifaMoraPorDia,
                tarifaMoraPorHora: p.tarifaMoraPorHora,
                activo: true,
              },
              create: {
                codigo: p.codigo,
                nombre: p.nombre,
                categoria: p.categoria,
                talla: p.talla || null,
                color: p.color || null,
                stockActual: p.stockActual,
                estadoPrenda: p.estadoPrenda,
                precioVenta: p.precioVenta,
                precioAlquilerBase: p.precioAlquilerBase,
                tiempoAlquilerBaseHoras: p.tiempoAlquilerBaseHoras,
                tarifaMoraPorDia: p.tarifaMoraPorDia,
                tarifaMoraPorHora: p.tarifaMoraPorHora,
                activo: true,
              },
            });
            prendasAfectadas++;
          } catch (errFila) {
            console.error(`[FALLO EN FILA PRENDA] Código: ${p.codigo} - Descripción: ${p.nombre}`);
            throw errFila; // Provoca rollback atómico de la transacción
          }
        }
      },
      {
        timeout: 60000, // 60 segundos de tiempo límite para operaciones masivas
      }
    );

    console.log("Transacción de Prisma confirmada exitosamente (COMMIT).");
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("\n[ERROR CRITICO EN TRANSACCION] Se realizo ROLLBACK completo.");
    console.error("Causa:", errorMsg);
    throw error;
  }

  // 5. Muestra de Resumen y Verificación de Caracteres Especiales
  console.log("\n======================================================================");
  console.log("                      RESUMEN DE MIGRACION EXITOSA                    ");
  console.log("======================================================================");
  console.log(`- Total de Clientes insertados/actualizados: ${clientesAfectados}`);
  console.log(`- Total de Prendas migradas con éxito:       ${prendasAfectadas}`);
  console.log(`- Registros duplicados de Clientes omitidos: ${duplicadosClientes}`);
  console.log(`- Registros duplicados de Prendas omitidos:  ${duplicadosPrendas}`);
  console.log("======================================================================\n");

  return {
    clientesInsertados: clientesAfectados,
    prendasInsertadas: prendasAfectadas,
    duplicadosClientes,
    duplicadosPrendas,
  };
}

if (require.main === module) {
  ejecutarMigracionMasiva()
    .then(() => {
      console.log("Proceso de migración finalizado.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fallo durante la ejecución de la migración:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
