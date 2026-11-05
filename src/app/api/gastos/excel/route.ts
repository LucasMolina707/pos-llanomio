import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function obtenerRangoMes(anio: number, mes: number) {
  const inicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const fin = new Date(anio, mes, 0, 23, 59, 59, 999);
  return { inicio, fin };
}

/**
 * GET /api/gastos/excel
 * Exporta el reporte completo de gastos y balances a un archivo Excel (.xlsx).
 */
export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo") || "MES";
    const fechaParam = searchParams.get("fecha");
    const mesParam = searchParams.get("mes");
    const anioParam = searchParams.get("anio");
    const categoriaId = searchParams.get("categoriaId");
    const empleado = searchParams.get("empleado")?.trim();

    const ahora = new Date();
    const anioActual = anioParam ? parseInt(anioParam, 10) : ahora.getFullYear();
    const mesActual = mesParam ? parseInt(mesParam, 10) : ahora.getMonth() + 1;

    const where: any = {};

    if (periodo === "DIA" && fechaParam) {
      const [a, m, d] = fechaParam.split("-").map(Number);
      where.fecha = {
        gte: new Date(a, m - 1, d, 0, 0, 0),
        lte: new Date(a, m - 1, d, 23, 59, 59, 999),
      };
    } else if (periodo === "MES") {
      const r = obtenerRangoMes(anioActual, mesActual);
      where.fecha = { gte: r.inicio, lte: r.fin };
    } else if (periodo === "ANUAL") {
      where.fecha = {
        gte: new Date(anioActual, 0, 1, 0, 0, 0),
        lte: new Date(anioActual, 11, 31, 23, 59, 59, 999),
      };
    }

    if (categoriaId && categoriaId !== "TODAS") {
      where.categoriaId = categoriaId;
    }

    if (empleado && empleado !== "TODOS") {
      where.nombreEmpleado = { contains: empleado };
    }

    const gastos = await prisma.gasto.findMany({
      where,
      orderBy: { fecha: "desc" },
    });

    // 1. Datos para Hoja 1: Gastos Detallados
    const filasGastos = gastos.map((g) => ({
      "ID": g.id,
      "Fecha": g.fecha.toISOString().split("T")[0],
      "Categoría": g.categoriaNombre,
      "Descripción": g.descripcion,
      "Es Nómina": g.esNomina ? "SÍ" : "NO",
      "Empleado (Nómina)": g.nombreEmpleado || "-",
      "Modalidad": g.modalidadPagoNomina || "-",
      "Observación Nómina": g.observacionNomina || "-",
      "Valor ($ COP)": g.valor,
      "Registrado Por": g.registradoPorNombre || "Administrador",
    }));

    // 2. Datos para Hoja 2: Balance Mes a Mes del Año
    const filasBalance = [];
    for (let m = 1; m <= 12; m++) {
      const rM = obtenerRangoMes(anioActual, m);
      const abonosMes = await prisma.abono.aggregate({
        where: { fecha: { gte: rM.inicio, lte: rM.fin } },
        _sum: { monto: true },
      });
      const ingresos = abonosMes._sum.monto || 0;

      const gastosDelMes = await prisma.gasto.findMany({
        where: { fecha: { gte: rM.inicio, lte: rM.fin } },
        select: { valor: true, esNomina: true },
      });

      let gOperativos = 0;
      let gNomina = 0;
      for (const g of gastosDelMes) {
        if (g.esNomina) gNomina += g.valor;
        else gOperativos += g.valor;
      }
      const gTotal = gOperativos + gNomina;
      const bNeto = ingresos - gTotal;

      filasBalance.push({
        "Mes": NOMBRES_MESES[m - 1],
        "Año": anioActual,
        "Ingresos Tienda ($ COP)": ingresos,
        "Gastos Operativos ($ COP)": gOperativos,
        "Gastos Nómina ($ COP)": gNomina,
        "Total Gastos ($ COP)": gTotal,
        "Balance Neto ($ COP)": bNeto,
      });
    }

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();

    const hojaGastos = XLSX.utils.json_to_sheet(filasGastos);
    const hojaBalance = XLSX.utils.json_to_sheet(filasBalance);

    // Ajustar anchos
    hojaGastos["!cols"] = [
      { wch: 18 }, { wch: 12 }, { wch: 32 }, { wch: 35 },
      { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 30 },
      { wch: 18 }, { wch: 20 },
    ];
    hojaBalance["!cols"] = [
      { wch: 15 }, { wch: 8 }, { wch: 22 }, { wch: 22 },
      { wch: 22 }, { wch: 22 }, { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, hojaGastos, "Gastos Detallados");
    XLSX.utils.book_append_sheet(workbook, hojaBalance, `Balance Anual ${anioActual}`);

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const hoyStr = ahora.toISOString().split("T")[0];
    const filename = `Reporte_Gastos_${hoyStr}.xlsx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Error al exportar gastos a Excel:", error);
    const mensaje = error instanceof Error ? error.message : "Error al exportar gastos";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

