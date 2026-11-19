import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function obtenerRangoFecha(fechaStr: string) {
  const [anio, mes, dia] = fechaStr.split("-").map(Number);
  const inicio = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  const fin = new Date(anio, mes - 1, dia, 23, 59, 59, 999);
  return { inicio, fin };
}

function obtenerRangoMes(anio: number, mes: number) {
  const inicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const fin = new Date(anio, mes, 0, 23, 59, 59, 999);
  return { inicio, fin };
}

/**
 * GET /api/gastos/johana/excel
 * Genera y descarga un libro .xlsx profesional exclusivo con exceljs para los Gastos de Johana,
 * filtrable por Día o por Mes, con sumatoria total y desglose por subcategoría.
 */
export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Acceso denegado: Se requieren credenciales de Administrador." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo") || "MES";
    const fechaParam = searchParams.get("fecha");
    const mesParam = searchParams.get("mes");
    const anioParam = searchParams.get("anio");
    const subcategoriaParam = searchParams.get("subcategoria")?.trim();

    const ahora = new Date();
    const anioActual = anioParam ? parseInt(anioParam, 10) : ahora.getFullYear();
    const mesActual = mesParam ? parseInt(mesParam, 10) : ahora.getMonth() + 1;
    const fechaHoyStr = fechaParam || ahora.toISOString().split("T")[0];

    const where: any = {
      categoriaNombre: { in: ["JOHANA", "YOANA"] },
    };

    let fechaFiltroInicio: Date;
    let fechaFiltroFin: Date;
    let subtituloPeriodo = "";

    if (periodo === "DIA") {
      const r = obtenerRangoFecha(fechaHoyStr);
      fechaFiltroInicio = r.inicio;
      fechaFiltroFin = r.fin;
      subtituloPeriodo = `Día: ${fechaHoyStr}`;
    } else {
      const r = obtenerRangoMes(anioActual, mesActual);
      fechaFiltroInicio = r.inicio;
      fechaFiltroFin = r.fin;
      subtituloPeriodo = `Mes: ${NOMBRES_MESES[mesActual - 1]} de ${anioActual}`;
    }

    where.fecha = {
      gte: fechaFiltroInicio,
      lte: fechaFiltroFin,
    };

    if (subcategoriaParam && subcategoriaParam !== "TODAS") {
      where.subcategoria = subcategoriaParam;
      subtituloPeriodo += ` | Subcategoría: ${subcategoriaParam}`;
    }

    const gastos = await prisma.gasto.findMany({
      where,
      orderBy: { fecha: "desc" },
    });

    const totalGastos = gastos.reduce((sum, g) => sum + g.valor, 0);

    // Desglose por subcategoría
    const mapaSubcategorias: Record<string, { total: number; cantidad: number }> = {};
    for (const g of gastos) {
      const sub = g.subcategoria?.trim() || "Otros / General";
      if (!mapaSubcategorias[sub]) {
        mapaSubcategorias[sub] = { total: 0, cantidad: 0 };
      }
      mapaSubcategorias[sub].total += g.valor;
      mapaSubcategorias[sub].cantidad += 1;
    }

    // =========================================================================
    // CONSTRUCCIÓN DEL LIBRO CON EXCELJS
    // =========================================================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema POS Llanomio";
    workbook.lastModifiedBy = sesion.username || "Administrador";
    workbook.created = new Date();
    workbook.modified = new Date();

    // -------------------------------------------------------------------------
    // HOJA 1: Gastos Detallados
    // -------------------------------------------------------------------------
    const hojaDetalle = workbook.addWorksheet("Gastos Johana Detallado", {
      views: [{ showGridLines: true }],
    });

    hojaDetalle.columns = [
      { key: "num", width: 8 },
      { key: "fecha", width: 14 },
      { key: "hora", width: 12 },
      { key: "subcategoria", width: 26 },
      { key: "descripcion", width: 42 },
      { key: "registradoPor", width: 22 },
      { key: "valor", width: 22 },
    ];

    // Fila 1: Título Principal
    hojaDetalle.mergeCells("A1:G1");
    const celdaTitulo = hojaDetalle.getCell("A1");
    celdaTitulo.value = "SISTEMA POS LLANOMIO - REPORTE EXCLUSIVO DE GASTOS: JOHANA";
    celdaTitulo.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    celdaTitulo.alignment = { horizontal: "center", vertical: "middle" };
    celdaTitulo.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Slate 800
    };
    hojaDetalle.getRow(1).height = 34;

    // Fila 2: Subtítulo
    hojaDetalle.mergeCells("A2:G2");
    const celdaSubtitulo = hojaDetalle.getCell("A2");
    celdaSubtitulo.value = `Filtro: ${subtituloPeriodo}  |  Total Gastos: $${totalGastos.toLocaleString("es-CO")} COP  |  Registros: ${gastos.length}  |  Generado: ${ahora.toLocaleString("es-CO")}`;
    celdaSubtitulo.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF334155" } };
    celdaSubtitulo.alignment = { horizontal: "center", vertical: "middle" };
    celdaSubtitulo.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" }, // Slate 100
    };
    hojaDetalle.getRow(2).height = 22;

    // Fila 3: Espacio
    hojaDetalle.getRow(3).height = 10;

    // Fila 4: Encabezados de Tabla
    const encabezados = [
      "#",
      "Fecha",
      "Hora",
      "Subcategoría",
      "Descripción / Detalle",
      "Registrado Por",
      "Valor ($ COP)",
    ];
    const filaEncabezados = hojaDetalle.getRow(4);
    filaEncabezados.values = encabezados;
    filaEncabezados.height = 26;

    for (let c = 1; c <= 7; c++) {
      const celda = filaEncabezados.getCell(c);
      celda.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      celda.alignment = {
        horizontal: c === 1 || c === 2 || c === 3 || c === 6 ? "center" : c === 7 ? "right" : "left",
        vertical: "middle",
      };
      celda.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4338CA" }, // Indigo 700
      };
      celda.border = {
        top: { style: "thin", color: { argb: "FF312E81" } },
        bottom: { style: "medium", color: { argb: "FF312E81" } },
        left: { style: "thin", color: { argb: "FF312E81" } },
        right: { style: "thin", color: { argb: "FF312E81" } },
      };
    }

    // Filas de Datos
    let indexFila = 5;
    gastos.forEach((g, idx) => {
      const d = new Date(g.fecha);
      const fechaStr = d.toISOString().split("T")[0];
      const horaStr = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

      const fila = hojaDetalle.getRow(indexFila);
      fila.values = [
        idx + 1,
        fechaStr,
        horaStr,
        g.subcategoria || "Otros / General",
        g.descripcion,
        g.registradoPorNombre || "Administrador",
        g.valor,
      ];
      fila.height = 20;

      const esPar = idx % 2 === 0;
      const colorFondo = esPar ? "FFFFFFFF" : "FFF8FAFC";

      for (let c = 1; c <= 7; c++) {
        const celda = fila.getCell(c);
        celda.font = { name: "Arial", size: 9, color: { argb: "FF0F172A" } };
        celda.alignment = {
          horizontal: c === 1 || c === 2 || c === 3 || c === 6 ? "center" : c === 7 ? "right" : "left",
          vertical: "middle",
        };
        celda.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorFondo },
        };
        celda.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (c === 7) {
          celda.numFmt = '"$"#,##0';
          celda.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF1E1B4B" } };
        }
      }
      indexFila++;
    });

    // Fila Total
    const filaTotal = hojaDetalle.getRow(indexFila);
    hojaDetalle.mergeCells(`A${indexFila}:F${indexFila}`);
    const celdaTextoTotal = hojaDetalle.getCell(`A${indexFila}`);
    celdaTextoTotal.value = "TOTAL GENERAL GASTOS JOHANA:";
    celdaTextoTotal.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E1B4B" } };
    celdaTextoTotal.alignment = { horizontal: "right", vertical: "middle" };
    celdaTextoTotal.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF2FF" }, // Indigo 50
    };

    const celdaValorTotal = hojaDetalle.getCell(`G${indexFila}`);
    celdaValorTotal.value = totalGastos;
    celdaValorTotal.numFmt = '"$"#,##0';
    celdaValorTotal.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF312E81" } };
    celdaValorTotal.alignment = { horizontal: "right", vertical: "middle" };
    celdaValorTotal.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF2FF" },
    };

    for (let c = 1; c <= 7; c++) {
      const celda = filaTotal.getCell(c);
      celda.border = {
        top: { style: "medium", color: { argb: "FF4338CA" } },
        bottom: { style: "double", color: { argb: "FF4338CA" } },
        left: { style: "thin", color: { argb: "FFC7D2FE" } },
        right: { style: "thin", color: { argb: "FFC7D2FE" } },
      };
    }
    filaTotal.height = 24;

    // -------------------------------------------------------------------------
    // HOJA 2: Resumen Consolidado por Subcategoría
    // -------------------------------------------------------------------------
    const hojaResumen = workbook.addWorksheet("Resumen por Subcategoría", {
      views: [{ showGridLines: true }],
    });

    hojaResumen.columns = [
      { key: "num", width: 8 },
      { key: "subcategoria", width: 32 },
      { key: "cantidad", width: 20 },
      { key: "total", width: 24 },
      { key: "porcentaje", width: 20 },
    ];

    hojaResumen.mergeCells("A1:E1");
    const celdaTitulo2 = hojaResumen.getCell("A1");
    celdaTitulo2.value = "DESGLOSE CONSOLIDADO POR SUBCATEGORÍA - JOHANA";
    celdaTitulo2.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    celdaTitulo2.alignment = { horizontal: "center", vertical: "middle" };
    celdaTitulo2.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    hojaResumen.getRow(1).height = 32;

    hojaResumen.mergeCells("A2:E2");
    const celdaSub2 = hojaResumen.getCell("A2");
    celdaSub2.value = `Período: ${subtituloPeriodo}  |  Total Gastado: $${totalGastos.toLocaleString("es-CO")} COP`;
    celdaSub2.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF334155" } };
    celdaSub2.alignment = { horizontal: "center", vertical: "middle" };
    celdaSub2.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    hojaResumen.getRow(2).height = 20;

    hojaResumen.getRow(3).height = 10;

    const filaEnc2 = hojaResumen.getRow(4);
    filaEnc2.values = [
      "#",
      "Subcategoría",
      "Cantidad de Gastos",
      "Total Invertido ($ COP)",
      "Participación (%)",
    ];
    filaEnc2.height = 24;

    for (let c = 1; c <= 5; c++) {
      const celda = filaEnc2.getCell(c);
      celda.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      celda.alignment = {
        horizontal: c === 1 || c === 3 ? "center" : c === 4 || c === 5 ? "right" : "left",
        vertical: "middle",
      };
      celda.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4338CA" },
      };
      celda.border = {
        top: { style: "thin", color: { argb: "FF312E81" } },
        bottom: { style: "medium", color: { argb: "FF312E81" } },
        left: { style: "thin", color: { argb: "FF312E81" } },
        right: { style: "thin", color: { argb: "FF312E81" } },
      };
    }

    let rIndex = 5;
    const listaSub = Object.entries(mapaSubcategorias).sort((a, b) => b[1].total - a[1].total);

    listaSub.forEach(([subNombre, datosSub], idx) => {
      const fila = hojaResumen.getRow(rIndex);
      const porcentaje = totalGastos > 0 ? (datosSub.total / totalGastos) : 0;

      fila.values = [
        idx + 1,
        subNombre,
        datosSub.cantidad,
        datosSub.total,
        porcentaje,
      ];
      fila.height = 20;

      const esPar = idx % 2 === 0;
      const colorFondo = esPar ? "FFFFFFFF" : "FFF8FAFC";

      for (let c = 1; c <= 5; c++) {
        const celda = fila.getCell(c);
        celda.font = { name: "Arial", size: 9, color: { argb: "FF0F172A" } };
        celda.alignment = {
          horizontal: c === 1 || c === 3 ? "center" : c === 4 || c === 5 ? "right" : "left",
          vertical: "middle",
        };
        celda.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorFondo },
        };
        celda.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (c === 4) {
          celda.numFmt = '"$"#,##0';
          celda.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF1E1B4B" } };
        }
        if (c === 5) {
          celda.numFmt = "0.0%";
          celda.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF4338CA" } };
        }
      }
      rIndex++;
    });

    // Fila Total Resumen
    const filaTotalRes = hojaResumen.getRow(rIndex);
    hojaResumen.mergeCells(`A${rIndex}:B${rIndex}`);
    const celdaTotSub = hojaResumen.getCell(`A${rIndex}`);
    celdaTotSub.value = "TOTAL GENERAL:";
    celdaTotSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E1B4B" } };
    celdaTotSub.alignment = { horizontal: "right", vertical: "middle" };
    celdaTotSub.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF2FF" },
    };

    const celdaCantTotal = hojaResumen.getCell(`C${rIndex}`);
    celdaCantTotal.value = gastos.length;
    celdaCantTotal.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E1B4B" } };
    celdaCantTotal.alignment = { horizontal: "center", vertical: "middle" };
    celdaCantTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

    const celdaMontoTotal = hojaResumen.getCell(`D${rIndex}`);
    celdaMontoTotal.value = totalGastos;
    celdaMontoTotal.numFmt = '"$"#,##0';
    celdaMontoTotal.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF312E81" } };
    celdaMontoTotal.alignment = { horizontal: "right", vertical: "middle" };
    celdaMontoTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

    const celdaPorcTotal = hojaResumen.getCell(`E${rIndex}`);
    celdaPorcTotal.value = 1;
    celdaPorcTotal.numFmt = "0.0%";
    celdaPorcTotal.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF4338CA" } };
    celdaPorcTotal.alignment = { horizontal: "right", vertical: "middle" };
    celdaPorcTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

    for (let c = 1; c <= 5; c++) {
      const celda = filaTotalRes.getCell(c);
      celda.border = {
        top: { style: "medium", color: { argb: "FF4338CA" } },
        bottom: { style: "double", color: { argb: "FF4338CA" } },
        left: { style: "thin", color: { argb: "FFC7D2FE" } },
        right: { style: "thin", color: { argb: "FFC7D2FE" } },
      };
    }
    filaTotalRes.height = 24;

    const buffer = await workbook.xlsx.writeBuffer();
    const sufijoArchivo = periodo === "DIA" ? fechaHoyStr : `${NOMBRES_MESES[mesActual - 1]}_${anioActual}`;
    const filename = `Reporte_Gastos_Johana_${sufijoArchivo}.xlsx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Error al exportar reporte Excel de Johana:", error);
    const mensaje = error instanceof Error ? error.message : "Error al exportar reporte de Johana";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
