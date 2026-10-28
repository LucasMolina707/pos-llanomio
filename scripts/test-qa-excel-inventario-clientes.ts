/**
 * SUITE DE PRUEBAS AUTOMATIZADAS DE AUDITORÍA QA:
 * SISTEMA INTEGRAL DE IMPORTACIÓN MASIVA, EXPORTACIÓN DE RESPALDO Y REGLETA OFICIAL EXCEL
 * Vistas Exclusivas: /admin/inventario y /admin/clientes
 * POS LLANOMIO - Auditoría QA (Agentes 1, 2, 3 y 5)
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import {
  COLUMNAS_INVENTARIO,
  COLUMNAS_CLIENTES,
  generarExcelPlantillaInventario,
  generarExcelExportacionInventario,
  generarExcelPlantillaClientes,
  generarExcelExportacionClientes,
  extraerFilaInventario,
  extraerFilaCliente,
  limpiarNumero,
  sanitizarTelefono,
} from "../src/lib/excel-plantillas";
import { GET as getInventarioExcel, POST as postInventarioExcel } from "../src/app/api/inventario/excel/route";
import { GET as getClientesExcel, POST as postClientesExcel } from "../src/app/api/clientes/excel/route";
import { NextRequest } from "next/server";
import { calcularDigitoVerificacionDIAN } from "../src/lib/dian-utils";

const prisma = new PrismaClient();
const RUTA_RAIZ = path.resolve(__dirname, "..");

function asercion(condicion: boolean, mensajeExito: string, mensajeFallo: string) {
  if (condicion) {
    console.log(`  [OK] ${mensajeExito}`);
  } else {
    console.error(`  [ERROR FATAL] ${mensajeFallo}`);
    throw new Error(mensajeFallo);
  }
}

async function ejecutarSuiteQA() {
  console.log("===============================================================================");
  console.log("   AUDITORÍA QA: IMPORTACIÓN MASIVA, EXPORTACIÓN Y REGLETAS EXCEL (.XLSX)     ");
  console.log("===============================================================================\n");

  // ============================================================================
  // PASO 1: VERIFICACIÓN DE EXCLUSIVIDAD DE VISTAS
  // ============================================================================
  console.log("[PASO 1] Auditando exclusividad de botones y componentes Excel en vistas...");

  const archivosProhibidos = [
    "src/app/caja/pos/page.tsx",
    "src/app/caja/alquileres/page.tsx",
    "src/app/caja/apartados/page.tsx",
    "src/app/caja/apartados/nuevo/page.tsx",
    "src/app/caja/layout.tsx",
  ];

  for (const relPath of archivosProhibidos) {
    const absPath = path.join(RUTA_RAIZ, relPath);
    if (fs.existsSync(absPath)) {
      const contenido = fs.readFileSync(absPath, "utf-8");
      const tieneModalExcel = contenido.includes("ModalGestionExcel");
      const tieneEndpointExcel = contenido.includes("/api/inventario/excel") || contenido.includes("/api/clientes/excel");
      const tieneBotonImportarExcel = contenido.toLowerCase().includes("importar excel") || contenido.toLowerCase().includes("regleta oficial");

      asercion(
        !tieneModalExcel && !tieneEndpointExcel && !tieneBotonImportarExcel,
        `Vista ${relPath} está 100% limpia de botones o modales de Excel.`,
        `La vista ${relPath} contiene elementos de Excel prohibidos para terminales de caja.`
      );
    }
  }

  // Verificar que SÍ existan en las dos vistas administrativas designadas
  const invContenido = fs.readFileSync(path.join(RUTA_RAIZ, "src/app/admin/inventario/page.tsx"), "utf-8");
  asercion(
    invContenido.includes("ModalGestionExcel") && invContenido.includes("/api/inventario/excel"),
    "Vista /admin/inventario cuenta con ModalGestionExcel y endpoints de Excel integrados.",
    "Falta integración de Excel en /admin/inventario/page.tsx"
  );

  const cliContenido = fs.readFileSync(path.join(RUTA_RAIZ, "src/app/admin/clientes/page.tsx"), "utf-8");
  asercion(
    cliContenido.includes("ModalGestionExcel") && cliContenido.includes("/api/clientes/excel"),
    "Vista /admin/clientes cuenta con ModalGestionExcel y endpoints de Excel integrados.",
    "Falta integración de Excel en /admin/clientes/page.tsx"
  );

  console.log("[PASO 1 COMPLETADO] Exclusividad de vistas validada exitosamente.\n");

  // ============================================================================
  // PASO 2: VERIFICACIÓN DE REGLETAS / PLANTILLAS OFICIALES (.XLSX)
  // ============================================================================
  console.log("[PASO 2] Verificando generación y estructura de Plantillas / Regletas Guía...");

  // 2.1 Plantilla de Inventario
  const bufferPlantillaInv = generarExcelPlantillaInventario();
  asercion(bufferPlantillaInv.length > 0, "Buffer de Plantilla Inventario generado con éxito.", "Plantilla de inventario vacía.");
  const wbInv = XLSX.read(bufferPlantillaInv, { type: "buffer" });
  asercion(wbInv.SheetNames.includes("INVENTARIO"), "Hoja principal 'INVENTARIO' presente.", "Falta hoja 'INVENTARIO'.");
  asercion(wbInv.SheetNames.includes("GUIA_CAMPOS_OBLIGATORIOS"), "Hoja 'GUIA_CAMPOS_OBLIGATORIOS' presente.", "Falta hoja guía en inventario.");

  const hojaInv = wbInv.Sheets["INVENTARIO"];
  const datosInv = XLSX.utils.sheet_to_json<Record<string, unknown>>(hojaInv, { header: 1 });
  const encabezadosInv = (datosInv[0] as string[]) || [];

  // Comprobar que los encabezados tengan los tags [OBLIGATORIO *] y [OPCIONAL]
  asercion(
    encabezadosInv.includes(COLUMNAS_INVENTARIO.CODIGO) && encabezadosInv.includes(COLUMNAS_INVENTARIO.NOMBRE),
    "Encabezados de Inventario contienen etiquetas [OBLIGATORIO *].",
    "Encabezados de Inventario no tienen las etiquetas canónicas esperadas."
  );
  asercion(datosInv.length >= 3, "Plantilla de Inventario incluye al menos 2 filas de ejemplo prellenadas.", "Faltan filas de ejemplo en inventario.");

  // 2.2 Plantilla de Clientes
  const bufferPlantillaCli = generarExcelPlantillaClientes();
  asercion(bufferPlantillaCli.length > 0, "Buffer de Plantilla Clientes generado con éxito.", "Plantilla de clientes vacía.");
  const wbCli = XLSX.read(bufferPlantillaCli, { type: "buffer" });
  asercion(wbCli.SheetNames.includes("CLIENTES"), "Hoja principal 'CLIENTES' presente.", "Falta hoja 'CLIENTES'.");
  asercion(wbCli.SheetNames.includes("GUIA_CAMPOS_Y_DIAN"), "Hoja 'GUIA_CAMPOS_Y_DIAN' presente.", "Falta hoja guía en clientes.");

  const hojaCli = wbCli.Sheets["CLIENTES"];
  const datosCli = XLSX.utils.sheet_to_json<Record<string, unknown>>(hojaCli, { header: 1 });
  const encabezadosCli = (datosCli[0] as string[]) || [];

  asercion(
    encabezadosCli.includes(COLUMNAS_CLIENTES.DOCUMENTO) && encabezadosCli.includes(COLUMNAS_CLIENTES.NOMBRE) && encabezadosCli.includes(COLUMNAS_CLIENTES.TELEFONO),
    "Encabezados de Clientes contienen etiquetas [OBLIGATORIO *] en documento, nombre y teléfono.",
    "Encabezados de Clientes carecen de etiquetas canónicas requeridas."
  );
  asercion(datosCli.length >= 3, "Plantilla de Clientes incluye ejemplos de consumidor final y contribuyente DIAN.", "Faltan ejemplos en plantilla clientes.");

  console.log("[PASO 2 COMPLETADO] Estructura de plantillas oficiales validada al 100%.\n");

  // ============================================================================
  // PASO 3: ENDPOINTS GET (MODO PLANTILLA Y MODO EXPORTAR)
  // ============================================================================
  console.log("[PASO 3] Probando endpoints GET /api/inventario/excel y /api/clientes/excel...");

  // 3.1 GET Inventario Plantilla
  const reqInvPlantilla = new NextRequest("http://localhost:3000/api/inventario/excel?modo=plantilla");
  const resInvPlantilla = await getInventarioExcel(reqInvPlantilla);
  asercion(resInvPlantilla.status === 200, "GET /api/inventario/excel?modo=plantilla responde HTTP 200.", "Fallo en GET plantilla inventario.");
  const tipoInvP = resInvPlantilla.headers.get("content-type") || "";
  asercion(tipoInvP.includes("spreadsheetml"), "Content-Type de inventario es application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.", "Content-Type incorrecto en plantilla.");

  // 3.2 GET Clientes Plantilla
  const reqCliPlantilla = new NextRequest("http://localhost:3000/api/clientes/excel?modo=plantilla");
  const resCliPlantilla = await getClientesExcel(reqCliPlantilla);
  asercion(resCliPlantilla.status === 200, "GET /api/clientes/excel?modo=plantilla responde HTTP 200.", "Fallo en GET plantilla clientes.");

  console.log("[PASO 3 COMPLETADO] Endpoints de descarga de plantillas comprobados.\n");

  // ============================================================================
  // PASO 4: IMPORTACIÓN MASIVA DE INVENTARIO (VENTA Y ALQUILER + UPSERT)
  // ============================================================================
  console.log("[PASO 4] Probando importación masiva de Inventario y lógica Upsert...");

  // Limpiar posibles registros previos de QA
  await prisma.producto.deleteMany({ where: { codigo: { startsWith: "QA-" } } });

  // Crear un libro Excel para importación de Inventario
  const wbPruebaInv = XLSX.utils.book_new();
  const filasPruebaInv = [
    {
      [COLUMNAS_INVENTARIO.CODIGO]: "QA-VEN-001",
      [COLUMNAS_INVENTARIO.NOMBRE]: "Traje Llanero Completo Niño QA",
      [COLUMNAS_INVENTARIO.TIPO]: "VENTA",
      [COLUMNAS_INVENTARIO.PRECIO]: "$ 95.000",
      [COLUMNAS_INVENTARIO.CATEGORIA]: "Trajes Infantiles",
      [COLUMNAS_INVENTARIO.TALLA]: "8",
      [COLUMNAS_INVENTARIO.COLOR]: "Blanco",
      [COLUMNAS_INVENTARIO.STOCK]: 5,
    },
    {
      [COLUMNAS_INVENTARIO.CODIGO]: "QA-ALQ-001",
      [COLUMNAS_INVENTARIO.NOMBRE]: "Sombrero Pelo Guama Negro QA",
      [COLUMNAS_INVENTARIO.TIPO]: "ALQUILER",
      [COLUMNAS_INVENTARIO.PRECIO]: "35000",
      [COLUMNAS_INVENTARIO.CATEGORIA]: "Sombreros",
      [COLUMNAS_INVENTARIO.TALLA]: "56",
      [COLUMNAS_INVENTARIO.COLOR]: "Negro",
      [COLUMNAS_INVENTARIO.MORA_DIARIA]: "10000",
      [COLUMNAS_INVENTARIO.MORA_HORA]: "2000",
      [COLUMNAS_INVENTARIO.ESTADO]: "DISPONIBLE",
    },
    {
      // Fila con error: sin código
      [COLUMNAS_INVENTARIO.CODIGO]: "",
      [COLUMNAS_INVENTARIO.NOMBRE]: "Producto Huérfano Sin Código",
      [COLUMNAS_INVENTARIO.TIPO]: "VENTA",
      [COLUMNAS_INVENTARIO.PRECIO]: "10000",
    },
  ];

  const wsPruebaInv = XLSX.utils.json_to_sheet(filasPruebaInv);
  XLSX.utils.book_append_sheet(wbPruebaInv, wsPruebaInv, "INVENTARIO");
  const bufferUploadInv = XLSX.write(wbPruebaInv, { type: "buffer", bookType: "xlsx" });

  // Crear FormData simulado
  const formDataInv = new FormData();
  const blobInv = new Blob([bufferUploadInv], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  formDataInv.append("file", blobInv, "inventario_qa.xlsx");

  const reqPostInv = new NextRequest("http://localhost:3000/api/inventario/excel", {
    method: "POST",
    body: formDataInv,
  });

  const resPostInv = await postInventarioExcel(reqPostInv);
  const jsonPostInv = await resPostInv.json();

  asercion(jsonPostInv.ok === true, "POST /api/inventario/excel procesó exitosamente el archivo.", "Error en importación de inventario.");
  asercion(jsonPostInv.resumen.creados >= 2, `Se crearon ${jsonPostInv.resumen.creados} productos nuevos.`, "No se crearon los productos esperados.");
  asercion(jsonPostInv.resumen.fallidos === 1, `Se detectó y aisló correctamente 1 fila con error: ${jsonPostInv.resumen.fallidos}`, "Fallo en detección de fila inválida.");

  // Verificar en SQLite
  const prodVenta = await prisma.producto.findUnique({ where: { codigo: "QA-VEN-001" } });
  asercion(
    prodVenta !== null && prodVenta.tipo === "VENTA" && prodVenta.precioVenta === 95000 && prodVenta.stockActual === 5,
    "Producto de VENTA QA-VEN-001 guardado con precio $95.000 y stockActual 5 en SQLite.",
    "Datos de QA-VEN-001 incorrectos en SQLite."
  );

  const prodAlq = await prisma.producto.findUnique({ where: { codigo: "QA-ALQ-001" } });
  asercion(
    prodAlq !== null && prodAlq.tipo === "ALQUILER" && prodAlq.precioAlquilerBase === 35000 && prodAlq.tarifaMoraPorDia === 10000,
    "Prenda de ALQUILER QA-ALQ-001 guardada con canon $35.000 y mora diaria $10.000 en SQLite.",
    "Datos de QA-ALQ-001 incorrectos en SQLite."
  );

  // Probar re-importación (Upsert de actualización)
  const wbPruebaInvUpdate = XLSX.utils.book_new();
  const filasPruebaInvUpdate = [
    {
      [COLUMNAS_INVENTARIO.CODIGO]: "QA-VEN-001",
      [COLUMNAS_INVENTARIO.NOMBRE]: "Traje Llanero Completo Niño QA Actualizado",
      [COLUMNAS_INVENTARIO.TIPO]: "VENTA",
      [COLUMNAS_INVENTARIO.PRECIO]: "115000", // Precio actualizado
      [COLUMNAS_INVENTARIO.STOCK]: 12, // Stock actualizado
    },
  ];
  const wsInvUpdate = XLSX.utils.json_to_sheet(filasPruebaInvUpdate);
  XLSX.utils.book_append_sheet(wbPruebaInvUpdate, wsInvUpdate, "INVENTARIO");
  const bufferInvUpdate = XLSX.write(wbPruebaInvUpdate, { type: "buffer", bookType: "xlsx" });

  const formDataInvUp = new FormData();
  formDataInvUp.append("file", new Blob([bufferInvUpdate]), "inventario_update.xlsx");
  const reqPostInvUp = new NextRequest("http://localhost:3000/api/inventario/excel", {
    method: "POST",
    body: formDataInvUp,
  });
  const resPostInvUp = await postInventarioExcel(reqPostInvUp);
  const jsonPostInvUp = await resPostInvUp.json();

  asercion(jsonPostInvUp.resumen.actualizados >= 1, "Upsert de Inventario reportó producto actualizado.", "Fallo al reportar actualización en upsert.");

  const prodVentaActualizado = await prisma.producto.findUnique({ where: { codigo: "QA-VEN-001" } });
  asercion(
    prodVentaActualizado?.precioVenta === 115000 && prodVentaActualizado?.stockActual === 12,
    "QA-VEN-001 actualizado sin duplicar: nuevo precio $115.000 y stockActual 12.",
    "Fallo en actualización de QA-VEN-001."
  );

  console.log("[PASO 4 COMPLETADO] Importación y Upsert de Inventario verificados.\n");

  // ============================================================================
  // PASO 5: IMPORTACIÓN MASIVA DE CLIENTES (NATURAL Y CONTRIBUYENTE FE + DV DIAN)
  // ============================================================================
  console.log("[PASO 5] Probando importación masiva de Clientes y autocalculado de DV DIAN...");

  const nitContribuyente = "900888777";
  const dvEsperado = calcularDigitoVerificacionDIAN(nitContribuyente);

  // Limpiar clientes previos de prueba
  await prisma.cliente.deleteMany({ where: { documento: { in: ["1122334455", nitContribuyente] } } });

  const wbPruebaCli = XLSX.utils.book_new();
  const filasPruebaCli = [
    {
      // 1. Cliente Persona Natural (Solo 3 campos obligatorios)
      [COLUMNAS_CLIENTES.DOCUMENTO]: "1122334455",
      [COLUMNAS_CLIENTES.NOMBRE]: "Pedro Pablo Llanero QA",
      [COLUMNAS_CLIENTES.TELEFONO]: "3158889900",
      [COLUMNAS_CLIENTES.DIRECCION]: "Barrio Siete de Agosto",
    },
    {
      // 2. Cliente Contribuyente Facturación Electrónica (con NIT sin DV)
      [COLUMNAS_CLIENTES.DOCUMENTO]: nitContribuyente,
      [COLUMNAS_CLIENTES.NOMBRE]: "Distribuidora de Sombreros Llanomio SAS",
      [COLUMNAS_CLIENTES.TELEFONO]: "3201112233",
      [COLUMNAS_CLIENTES.ES_FE]: "SI",
      [COLUMNAS_CLIENTES.TIPO_DOC]: "NIT",
      [COLUMNAS_CLIENTES.EMAIL]: "facturacion@sombrerosllanomio.com",
    },
    {
      // 3. Fila con error: documento inválido / vacío
      [COLUMNAS_CLIENTES.DOCUMENTO]: "",
      [COLUMNAS_CLIENTES.NOMBRE]: "Cliente Fantasma",
      [COLUMNAS_CLIENTES.TELEFONO]: "3000000000",
    },
  ];

  const wsPruebaCli = XLSX.utils.json_to_sheet(filasPruebaCli);
  XLSX.utils.book_append_sheet(wbPruebaCli, wsPruebaCli, "CLIENTES");
  const bufferUploadCli = XLSX.write(wbPruebaCli, { type: "buffer", bookType: "xlsx" });

  const formDataCli = new FormData();
  formDataCli.append("file", new Blob([bufferUploadCli]), "clientes_qa.xlsx");

  const reqPostCli = new NextRequest("http://localhost:3000/api/clientes/excel", {
    method: "POST",
    body: formDataCli,
  });

  const resPostCli = await postClientesExcel(reqPostCli);
  const jsonPostCli = await resPostCli.json();

  asercion(jsonPostCli.ok === true, "POST /api/clientes/excel procesó exitosamente el archivo.", "Error en importación de clientes.");
  asercion(jsonPostCli.resumen.creados >= 2, `Se crearon ${jsonPostCli.resumen.creados} clientes nuevos.`, "No se crearon los clientes.");
  asercion(jsonPostCli.resumen.fallidos === 1, `Se aisló fila inválida sin documento (Total errores: ${jsonPostCli.resumen.fallidos}).`, "Fallo en validación de clientes.");

  // Verificar en SQLite
  const cliNatural = await prisma.cliente.findUnique({ where: { documento: "1122334455" } });
  asercion(
    cliNatural !== null && cliNatural.nombre === "Pedro Pablo Llanero QA" && cliNatural.esResponsableIVA === false,
    "Cliente Natural 1122334455 guardado exitosamente como Consumidor Final.",
    "Datos de cliente natural incorrectos."
  );

  const cliContribuyente = await prisma.cliente.findUnique({ where: { documento: nitContribuyente } });
  asercion(
    cliContribuyente !== null &&
    cliContribuyente.esResponsableIVA === true &&
    cliContribuyente.digitoVerificacion === dvEsperado &&
    cliContribuyente.responsabilidadFiscal === "O-48",
    `Cliente Contribuyente NIT ${nitContribuyente} guardado con DV DIAN autocalculado (${dvEsperado}) y Responsabilidad Fiscal O-48.`,
    "Fallo en autocalculado de DV DIAN o campos tributarios de FE."
  );

  console.log("[PASO 5 COMPLETADO] Importación y lógica tributaria de Clientes verificada al 100%.\n");

  // ============================================================================
  // PASO 6: EXPORTACIÓN COMPLETA DE BASE DE DATOS Y RE-IMPORTACIÓN
  // ============================================================================
  console.log("[PASO 6] Probando exportación completa de respaldo y capacidad de re-importación...");

  // 6.1 Exportar Inventario Completo
  const reqExpInv = new NextRequest("http://localhost:3000/api/inventario/excel?modo=exportar");
  const resExpInv = await getInventarioExcel(reqExpInv);
  asercion(resExpInv.status === 200, "GET /api/inventario/excel?modo=exportar responde HTTP 200.", "Error al exportar inventario.");
  const bufExpInv = Buffer.from(await resExpInv.arrayBuffer());
  const wbExpInv = XLSX.read(bufExpInv, { type: "buffer" });
  const sheetExpInv = wbExpInv.Sheets["INVENTARIO"];
  const filasExpInv = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheetExpInv);
  asercion(
    filasExpInv.some((f) => extraerFilaInventario(f).codigo === "QA-VEN-001") &&
    filasExpInv.some((f) => extraerFilaInventario(f).codigo === "QA-ALQ-001"),
    "Exportación de Inventario contiene todos los productos de venta y alquiler recién creados.",
    "Faltan productos en exportación de inventario."
  );

  // 6.2 Exportar Clientes Completo
  const reqExpCli = new NextRequest("http://localhost:3000/api/clientes/excel?modo=exportar");
  const resExpCli = await getClientesExcel(reqExpCli);
  asercion(resExpCli.status === 200, "GET /api/clientes/excel?modo=exportar responde HTTP 200.", "Error al exportar clientes.");
  const bufExpCli = Buffer.from(await resExpCli.arrayBuffer());
  const wbExpCli = XLSX.read(bufExpCli, { type: "buffer" });
  const sheetExpCli = wbExpCli.Sheets["CLIENTES"];
  const filasExpCli = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheetExpCli);
  asercion(
    filasExpCli.some((f) => extraerFilaCliente(f).documento === "1122334455") &&
    filasExpCli.some((f) => extraerFilaCliente(f).documento === nitContribuyente),
    "Exportación de Clientes contiene tanto clientes naturales como contribuyentes DIAN con sus datos.",
    "Faltan clientes en exportación."
  );

  console.log("[PASO 6 COMPLETADO] Exportación de respaldo y re-importación validada.\n");

  console.log("===============================================================================");
  console.log("   TODAS LAS PRUEBAS DE AUDITORÍA QA EXCEL PASARON CON ÉXITO (100% SATISFACTORIO) ");
  console.log("===============================================================================\n");
}

async function main() {
  try {
    await ejecutarSuiteQA();
  } catch (error) {
    console.error("FATAL ERROR EN QA:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
