import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import {
  generarExcelPlantillaInventario,
  generarExcelExportacionInventario,
  extraerFilaInventario,
} from "@/lib/excel-plantillas";

export const dynamic = "force-dynamic";

/**
 * GET /api/inventario/excel
 * Parámetro: ?modo=plantilla | exportar
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modo = searchParams.get("modo") || "plantilla";

    if (modo === "exportar") {
      const productos = await prisma.producto.findMany({
        orderBy: [{ tipo: "asc" }, { codigo: "asc" }],
      });

      const buffer = generarExcelExportacionInventario(productos);
      const hoy = new Date().toISOString().split("T")[0];
      const filename = `Respaldo_Inventario_${hoy}.xlsx`;

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Modo Plantilla por defecto
    const buffer = generarExcelPlantillaInventario();
    const filename = "Plantilla_Regleta_Inventario.xlsx";

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error al generar Excel de inventario:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error al procesar archivo Excel de inventario" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventario/excel
 * Recibe FormData con el archivo Excel en 'file'
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No se proporcionó ningún archivo Excel para importar" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { ok: false, error: "El archivo Excel no contiene hojas de cálculo legibles" },
        { status: 400 }
      );
    }

    // Buscar la hoja "INVENTARIO" o tomar la primera hoja
    let sheetName = workbook.SheetNames.find(
      (name) => name.trim().toUpperCase() === "INVENTARIO"
    );
    if (!sheetName) {
      sheetName = workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
      raw: false,
    });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "La hoja de cálculo está vacía o no tiene registros" },
        { status: 400 }
      );
    }

    let creados = 0;
    let actualizados = 0;
    let fallidos = 0;
    const errores: string[] = [];

    // Procesar fila a fila con validación atómica
    for (let i = 0; i < rawRows.length; i++) {
      const filaNum = i + 2; // +2 por encabezado y base 1
      const filaRaw = rawRows[i];

      const item = extraerFilaInventario(filaRaw);
      if (!item) {
        // Fila en blanco ignorada silenciosamente
        continue;
      }

      // Validaciones de obligatoriedad
      if (!item.codigo) {
        fallidos++;
        errores.push(`Fila ${filaNum}: Falta el 'CODIGO_REFERENCIA' obligatorio.`);
        continue;
      }

      if (!item.nombre) {
        fallidos++;
        errores.push(`Fila ${filaNum} [${item.codigo}]: Falta el 'NOMBRE_PRODUCTO' obligatorio.`);
        continue;
      }

      if (item.precioBase <= 0) {
        fallidos++;
        errores.push(`Fila ${filaNum} [${item.codigo}]: El 'PRECIO_BASE' debe ser un valor numérico mayor a 0.`);
        continue;
      }

      try {
        const existente = await prisma.producto.findUnique({
          where: { codigo: item.codigo },
          select: { id: true },
        });

        const precioVenta = item.tipo === "VENTA" ? item.precioBase : 0;
        const precioAlquiler = item.tipo === "ALQUILER" ? item.precioBase : 0;
        const tarifaMora = item.tarifaMoraPorDia > 0 ? item.tarifaMoraPorDia : item.tarifaMoraPorHora;
        const unidadMora = item.tarifaMoraPorDia > 0 ? "DIA" : item.tarifaMoraPorHora > 0 ? "HORA" : "DIA";
        const activo = item.estadoPrenda !== "INACTIVO";

        if (existente) {
          await prisma.producto.update({
            where: { codigo: item.codigo },
            data: {
              nombre: item.nombre,
              tipo: item.tipo,
              categoria: item.categoria,
              talla: item.talla,
              color: item.color,
              stockActual: item.stockActual,
              estado: item.estadoPrenda,
              estadoPrenda: item.estadoPrenda,
              precioBase: item.precioBase,
              precioVenta,
              precioAlquilerBase: precioAlquiler,
              tarifaMora,
              unidadMora,
              tarifaMoraPorDia: item.tarifaMoraPorDia,
              tarifaMoraPorHora: item.tarifaMoraPorHora,
              activo,
            },
          });
          actualizados++;
        } else {
          await prisma.producto.create({
            data: {
              codigo: item.codigo,
              nombre: item.nombre,
              tipo: item.tipo,
              categoria: item.categoria,
              talla: item.talla,
              color: item.color,
              stockActual: item.stockActual,
              estado: item.estadoPrenda,
              estadoPrenda: item.estadoPrenda,
              precioBase: item.precioBase,
              precioVenta,
              precioAlquilerBase: precioAlquiler,
              tarifaMora,
              unidadMora,
              tarifaMoraPorDia: item.tarifaMoraPorDia,
              tarifaMoraPorHora: item.tarifaMoraPorHora,
              activo,
            },
          });
          creados++;
        }
      } catch (errDb: any) {
        fallidos++;
        errores.push(`Fila ${filaNum} [${item.codigo}]: Error al persistir en base de datos: ${errDb?.message || "Error desconocido"}`);
      }
    }

    const totalLeidos = rawRows.length;
    const validos = creados + actualizados;

    return NextResponse.json({
      ok: true,
      mensaje: `Proceso completado. ${creados} creados, ${actualizados} actualizados, ${fallidos} con error.`,
      resumen: {
        totalLeidos,
        validos,
        creados,
        actualizados,
        fallidos,
      },
      errores,
    });
  } catch (error: any) {
    console.error("Error al importar Excel de inventario:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno al procesar el archivo Excel" },
      { status: 500 }
    );
  }
}
