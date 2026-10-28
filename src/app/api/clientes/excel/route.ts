import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import {
  generarExcelPlantillaClientes,
  generarExcelExportacionClientes,
  extraerFilaCliente,
} from "@/lib/excel-plantillas";

export const dynamic = "force-dynamic";

/**
 * GET /api/clientes/excel
 * Parámetro: ?modo=plantilla | exportar
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modo = searchParams.get("modo") || "plantilla";

    if (modo === "exportar") {
      const clientes = await prisma.cliente.findMany({
        orderBy: { nombre: "asc" },
      });

      const buffer = generarExcelExportacionClientes(clientes);
      const hoy = new Date().toISOString().split("T")[0];
      const filename = `Respaldo_Clientes_Llanomio_${hoy}.xlsx`;

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
    const buffer = generarExcelPlantillaClientes();
    const filename = "Plantilla_Regleta_Clientes_Llanomio.xlsx";

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error al generar Excel de clientes:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error al procesar archivo Excel de clientes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clientes/excel
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

    // Buscar la hoja "CLIENTES" o tomar la primera hoja
    let sheetName = workbook.SheetNames.find(
      (name) => name.trim().toUpperCase() === "CLIENTES"
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
      const filaNum = i + 2;
      const filaRaw = rawRows[i];

      const item = extraerFilaCliente(filaRaw);
      if (!item) {
        // Fila en blanco
        continue;
      }

      // 1. Validar DOCUMENTO_O_NIT [OBLIGATORIO *]
      if (!item.documento || item.documento.length < 3) {
        fallidos++;
        errores.push(`Fila ${filaNum}: Falta el 'DOCUMENTO_O_NIT' o tiene menos de 3 caracteres.`);
        continue;
      }

      // 2. Validar NOMBRE_COMPLETO [OBLIGATORIO *]
      if (!item.nombre || item.nombre.length < 2) {
        fallidos++;
        errores.push(`Fila ${filaNum} [Doc: ${item.documento}]: Falta el 'NOMBRE_COMPLETO' o es demasiado corto.`);
        continue;
      }

      // 3. Validar TELEFONO_PRIMARIO [OBLIGATORIO *] (mínimo 7 dígitos)
      if (!item.telefono || item.telefono.length < 7) {
        fallidos++;
        errores.push(`Fila ${filaNum} [Doc: ${item.documento}]: El 'TELEFONO_PRIMARIO' debe contener al menos 7 dígitos numéricos válidos.`);
        continue;
      }

      try {
        const existente = await prisma.cliente.findUnique({
          where: { documento: item.documento },
          select: { id: true },
        });

        if (existente) {
          await prisma.cliente.update({
            where: { documento: item.documento },
            data: {
              nombre: item.nombre,
              telefono: item.telefono,
              telefonoSecundario: item.telefonoSecundario,
              direccion: item.direccion,
              esResponsableIVA: item.esResponsableIVA,
              tipoIdentificacion: item.tipoIdentificacion,
              digitoVerificacion: item.digitoVerificacion,
              razonSocial: item.razonSocial,
              email: item.email,
              responsabilidadFiscal: item.responsabilidadFiscal,
              municipio: item.municipio,
              codigoDaneMunicipio: item.codigoDaneMunicipio,
              notas: item.notas,
            },
          });
          actualizados++;
        } else {
          await prisma.cliente.create({
            data: {
              documento: item.documento,
              nombre: item.nombre,
              telefono: item.telefono,
              telefonoSecundario: item.telefonoSecundario,
              direccion: item.direccion,
              esResponsableIVA: item.esResponsableIVA,
              tipoIdentificacion: item.tipoIdentificacion,
              digitoVerificacion: item.digitoVerificacion,
              razonSocial: item.razonSocial,
              email: item.email,
              responsabilidadFiscal: item.responsabilidadFiscal,
              municipio: item.municipio,
              codigoDaneMunicipio: item.codigoDaneMunicipio,
              notas: item.notas,
            },
          });
          creados++;
        }
      } catch (errDb: any) {
        fallidos++;
        errores.push(`Fila ${filaNum} [Doc: ${item.documento}]: Error al persistir en base de datos: ${errDb?.message || "Error desconocido"}`);
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
    console.error("Error al importar Excel de clientes:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error interno al procesar el archivo Excel" },
      { status: 500 }
    );
  }
}
