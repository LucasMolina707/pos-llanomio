import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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

function obtenerRangoAnio(anio: number) {
  const inicio = new Date(anio, 0, 1, 0, 0, 0, 0);
  const fin = new Date(anio, 11, 31, 23, 59, 59, 999);
  return { inicio, fin };
}

/**
 * GET /api/gastos
 * Listado histórico de gastos con filtros y métricas Día a Día, Mes a Mes y Anual.
 */
export async function GET(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, success: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo") || "MES";
    const fechaParam = searchParams.get("fecha");
    const mesParam = searchParams.get("mes");
    const anioParam = searchParams.get("anio");
    const fechaInicioParam = searchParams.get("fechaInicio");
    const fechaFinParam = searchParams.get("fechaFin");
    const categoriaId = searchParams.get("categoriaId");
    const empleado = searchParams.get("empleado")?.trim();
    const q = searchParams.get("q")?.trim();

    const ahora = new Date();
    const anioActual = anioParam ? parseInt(anioParam, 10) : ahora.getFullYear();
    const mesActual = mesParam ? parseInt(mesParam, 10) : ahora.getMonth() + 1;
    const fechaHoyStr = fechaParam || ahora.toISOString().split("T")[0];

    // 1. Construir cláusula where para la consulta filtrada
    const where: any = {};

    let fechaFiltroInicio: Date | null = null;
    let fechaFiltroFin: Date | null = null;

    if (periodo === "DIA" && fechaHoyStr) {
      const r = obtenerRangoFecha(fechaHoyStr);
      fechaFiltroInicio = r.inicio;
      fechaFiltroFin = r.fin;
    } else if (periodo === "MES") {
      const r = obtenerRangoMes(anioActual, mesActual);
      fechaFiltroInicio = r.inicio;
      fechaFiltroFin = r.fin;
    } else if (periodo === "ANUAL") {
      const r = obtenerRangoAnio(anioActual);
      fechaFiltroInicio = r.inicio;
      fechaFiltroFin = r.fin;
    } else if (periodo === "RANGO" && fechaInicioParam && fechaFinParam) {
      fechaFiltroInicio = new Date(`${fechaInicioParam}T00:00:00.000`);
      fechaFiltroFin = new Date(`${fechaFinParam}T23:59:59.999`);
    }

    if (fechaFiltroInicio && fechaFiltroFin) {
      where.fecha = {
        gte: fechaFiltroInicio,
        lte: fechaFiltroFin,
      };
    }

    if (categoriaId && categoriaId !== "TODAS") {
      where.categoriaId = categoriaId;
    }

    if (empleado && empleado !== "TODOS") {
      where.nombreEmpleado = {
        contains: empleado,
      };
    }

    if (q) {
      where.OR = [
        { descripcion: { contains: q } },
        { categoriaNombre: { contains: q } },
        { nombreEmpleado: { contains: q } },
        { observacionNomina: { contains: q } },
      ];
    }

    // 2. Consultar gastos filtrados
    const gastos = await prisma.gasto.findMany({
      where,
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            requiereEmpleado: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    const totalGastosFiltrados = gastos.reduce((sum, g) => sum + g.valor, 0);

    // 3. Métricas ejecutivas consolidadas: Día, Mes, Año
    // Gasto Día
    const rangoDia = obtenerRangoFecha(fechaHoyStr);
    const gastosDiaAgregados = await prisma.gasto.aggregate({
      where: {
        fecha: { gte: rangoDia.inicio, lte: rangoDia.fin },
      },
      _sum: { valor: true },
    });
    const gastoDia = gastosDiaAgregados._sum.valor || 0;

    // Gasto Mes actual (desglosado en operativo y nómina)
    const rangoMes = obtenerRangoMes(anioActual, mesActual);
    const gastosMesTotal = await prisma.gasto.findMany({
      where: {
        fecha: { gte: rangoMes.inicio, lte: rangoMes.fin },
      },
      select: { valor: true, esNomina: true },
    });
    let gastoMesTotal = 0;
    let gastoMesNomina = 0;
    let gastoMesOperativo = 0;
    for (const gm of gastosMesTotal) {
      gastoMesTotal += gm.valor;
      if (gm.esNomina) {
        gastoMesNomina += gm.valor;
      } else {
        gastoMesOperativo += gm.valor;
      }
    }

    // Gasto Año actual
    const rangoAnio = obtenerRangoAnio(anioActual);
    const gastosAnioAgregados = await prisma.gasto.aggregate({
      where: {
        fecha: { gte: rangoAnio.inicio, lte: rangoAnio.fin },
      },
      _sum: { valor: true },
    });
    const gastoAnio = gastosAnioAgregados._sum.valor || 0;

    // 4. Calcular Ingresos de la Tienda en el Periodo (Abonos reales sin contar depósitos retenidos/devueltos)
    let ingresosPeriodo = 0;
    if (fechaFiltroInicio && fechaFiltroFin) {
      const abonosPeriodo = await prisma.abono.aggregate({
        where: {
          fecha: { gte: fechaFiltroInicio, lte: fechaFiltroFin },
        },
        _sum: { monto: true },
      });
      ingresosPeriodo = abonosPeriodo._sum.monto || 0;
    }

    const balanceNeto = ingresosPeriodo - totalGastosFiltrados;

    // 5. Tabla Resumen Mes a Mes (Enero a Diciembre del Año seleccionado)
    const balanceMesAMes = [];
    for (let m = 1; m <= 12; m++) {
      const rM = obtenerRangoMes(anioActual, m);

      // Ingresos del mes
      const abonosMes = await prisma.abono.aggregate({
        where: { fecha: { gte: rM.inicio, lte: rM.fin } },
        _sum: { monto: true },
      });
      const ingresosMes = abonosMes._sum.monto || 0;

      // Gastos del mes
      const gastosDelMes = await prisma.gasto.findMany({
        where: { fecha: { gte: rM.inicio, lte: rM.fin } },
        select: { valor: true, esNomina: true },
      });

      let gOperativos = 0;
      let gNomina = 0;
      for (const g of gastosDelMes) {
        if (g.esNomina) {
          gNomina += g.valor;
        } else {
          gOperativos += g.valor;
        }
      }
      const gTotal = gOperativos + gNomina;
      const bNeto = ingresosMes - gTotal;

      balanceMesAMes.push({
        mesNumero: m,
        mesNombre: NOMBRES_MESES[m - 1],
        anio: anioActual,
        ingresos: ingresosMes,
        gastosOperativos: gOperativos,
        gastosNomina: gNomina,
        totalGastos: gTotal,
        balanceNeto: bNeto,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        success: true,
        gastos,
        total: gastos.length,
        resumen: {
          totalGastosFiltrados,
          gastoDia,
          gastoMesTotal,
          gastoMesOperativo,
          gastoMesNomina,
          gastoAnio,
          ingresosPeriodo,
          balanceNeto,
          fechaSeleccionada: fechaHoyStr,
          mesSeleccionado: mesActual,
          anioSeleccionado: anioActual,
        },
        balanceMesAMes,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error en GET /api/gastos:", error);
    const mensaje = error instanceof Error ? error.message : "Error al consultar gastos";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/gastos
 * Registra un nuevo gasto operativo o de nómina.
 * AISLAMIENTO TOTAL: Este registro NO modifica TurnoCaja, CierreCaja ni la caja activa.
 */
export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, success: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const {
      fecha: fechaInput,
      categoriaId,
      descripcion: descripcionInput,
      valor: valorInput,
      nombreEmpleado: nombreEmpleadoInput,
      modalidadPagoNomina,
      observacionNomina,
    } = body;

    // 1. Validar categoría
    if (!categoriaId) {
      return NextResponse.json(
        { ok: false, success: false, error: "Debes seleccionar una categoría de gasto válida." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const categoria = await prisma.categoriaGasto.findUnique({
      where: { id: categoriaId },
    });

    if (!categoria) {
      return NextResponse.json(
        { ok: false, success: false, error: "La categoría seleccionada no existe en la base de datos." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Validar valor numérico > 0
    const valor = Math.round(Number(valorInput) * 100) / 100;
    if (isNaN(valor) || valor <= 0) {
      return NextResponse.json(
        { ok: false, success: false, error: "El monto o valor del gasto debe ser un número mayor a cero." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Validar descripción
    const descripcion = String(descripcionInput || "").trim();
    if (!descripcion || descripcion.length < 2) {
      return NextResponse.json(
        { ok: false, success: false, error: "La descripción del gasto es obligatoria." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 4. Validar fecha
    let fecha = new Date();
    if (fechaInput) {
      if (typeof fechaInput === "string" && fechaInput.includes("-")) {
        const [a, m, d] = fechaInput.split("T")[0].split("-").map(Number);
        fecha = new Date(a, m - 1, d, 12, 0, 0);
      } else {
        const dParsed = new Date(fechaInput);
        if (!isNaN(dParsed.getTime())) {
          fecha = dParsed;
        }
      }
    }

    // 5. Validar reglas de Nómina
    const esNomina =
      categoria.nombre === "Pago de Nómina" ||
      categoria.nombre === "Gasto de Empleados" ||
      categoria.requiereEmpleado;

    const nombreEmpleado = nombreEmpleadoInput ? String(nombreEmpleadoInput).trim() : null;

    if (esNomina && (!nombreEmpleado || nombreEmpleado.length < 2)) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: "Para la categoría de Nómina es obligatorio registrar o seleccionar el nombre del empleado a quien se le pagó.",
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Si se especificó nombre de empleado y no existe en EmpleadoGasto, guardarlo en el directorio persistente
    if (nombreEmpleado) {
      try {
        await prisma.empleadoGasto.upsert({
          where: { nombreCompleto: nombreEmpleado },
          update: { activo: true },
          create: {
            nombreCompleto: nombreEmpleado,
            cargoOperacion: "Operativo / Sastrería",
            activo: true,
          },
        });
      } catch (errEmp) {
        console.warn("[GASTOS] No se pudo auto-sembrar empleado en EmpleadoGasto:", errEmp);
      }
    }

    // 6. Crear el registro en Gasto (Sin alterar cajas ni turnos)
    const nuevoGasto = await prisma.gasto.create({
      data: {
        fecha,
        categoriaId: categoria.id,
        categoriaNombre: categoria.nombre,
        descripcion,
        valor,
        esNomina,
        nombreEmpleado: nombreEmpleado || null,
        modalidadPagoNomina: modalidadPagoNomina ? String(modalidadPagoNomina).trim() : null,
        observacionNomina: observacionNomina ? String(observacionNomina).trim() : null,
        registradoPorId: sesion.userId,
        registradoPorNombre: sesion.username || sesion.nombre || "Administrador",
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            requiereEmpleado: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        success: true,
        gasto: nuevoGasto,
        mensaje: "Gasto registrado exitosamente en el balance operativo.",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al registrar gasto:", error);
    const mensaje = error instanceof Error ? error.message : "Error interno al guardar el gasto";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

