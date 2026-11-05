import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EstadoFactura, MetodoPago, TipoProducto, EstadoPrenda } from "@prisma/client";
import { obtenerFechaColombiaStr } from "@/lib/caja-control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/dashboard/metrics
 * Endpoint optimizado sin caché para telemetría gerencial en tiempo real.
 * Procesa en milisegundos los ingresos, cartera, moras, prendas y rendimiento en SQLite.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo");
    const desdeStr = searchParams.get("desde");
    const hastaStr = searchParams.get("hasta");

    const fechaHoyLocal = obtenerFechaColombiaStr();

    let fechaDesde: Date;
    let fechaHasta: Date;

    if (periodo === "dia" || periodo === "hoy") {
      fechaDesde = new Date(`${fechaHoyLocal}T00:00:00.000`);
      fechaHasta = new Date(`${fechaHoyLocal}T23:59:59.999`);
    } else if (periodo === "mes") {
      const now = new Date();
      const primerDiaMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      fechaDesde = new Date(`${primerDiaMes}T00:00:00.000`);
      fechaHasta = new Date(`${fechaHoyLocal}T23:59:59.999`);
    } else if (periodo === "anio" || periodo === "ano") {
      const now = new Date();
      fechaDesde = new Date(`${now.getFullYear()}-01-01T00:00:00.000`);
      fechaHasta = new Date(`${fechaHoyLocal}T23:59:59.999`);
    } else if (desdeStr) {
      fechaDesde = new Date(`${desdeStr}T00:00:00.000`);
      fechaHasta = hastaStr ? new Date(`${hastaStr}T23:59:59.999`) : new Date(`${fechaHoyLocal}T23:59:59.999`);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      fechaDesde = new Date(`${obtenerFechaColombiaStr(d)}T00:00:00.000`);
      fechaHasta = new Date(`${fechaHoyLocal}T23:59:59.999`);
    }

    // 1. Consultar facturas en el rango seleccionado
    const facturas = await prisma.factura.findMany({
      where: {
        fechaCreacion: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            documento: true,
            telefono: true,
          },
        },
        usuarioCajero: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                tipo: true,
                nombre: true,
              },
            },
          },
        },
        abonos: {
          select: {
            id: true,
            monto: true,
            metodoPago: true,
            fecha: true,
          },
        },
      },
      orderBy: { fechaCreacion: "desc" },
    });

    // 2. Consultar abonos registrados en el rango
    const abonos = await prisma.abono.findMany({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      select: {
        id: true,
        monto: true,
        metodoPago: true,
        fecha: true,
      },
    });

    // 3. Consultar turno de caja activo en el momento
    const turnoActivo = await prisma.turnoCaja.findFirst({
      where: { estado: "ABIERTO" },
      include: {
        usuarioCajero: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
      },
      orderBy: { fechaApertura: "desc" },
    });

    // 4. Cálculos precisos de ingresos por método de pago
    let ingresosNetos = 0;
    let totalEfectivo = 0;
    let totalNequi = 0;
    let totalDaviplata = 0;
    let totalBancolombia = 0;
    let totalLlave = 0;
    let totalTransferencia = 0;
    let totalConsignacion = 0;

    for (const a of abonos) {
      const m = Number(a.monto) || 0;
      ingresosNetos += m;

      switch (a.metodoPago) {
        case MetodoPago.EFECTIVO:
          totalEfectivo += m;
          break;
        case MetodoPago.NEQUI:
          totalNequi += m;
          break;
        case MetodoPago.DAVIPLATA:
          totalDaviplata += m;
          break;
        case MetodoPago.BANCOLOMBIA:
          totalBancolombia += m;
          break;
        case MetodoPago.LLAVE:
          totalLlave += m;
          break;
        case MetodoPago.TRANSFERENCIA:
          totalTransferencia += m;
          break;
        case MetodoPago.CONSIGNACION:
          totalConsignacion += m;
          break;
        default:
          totalEfectivo += m;
          break;
      }
    }

    // 5. Cálculos de líneas de negocio y rendimiento del periodo
    let rendimientoSastreria = 0;
    let rendimientoVentas = 0;
    let rendimientoAlquileres = 0;
    let rendimientoApartados = 0;
    let totalPrendasAlquiladas = 0;
    let morasRecaudadas = 0;

    for (const f of facturas) {
      morasRecaudadas += f.recargoMoraAcumulado || 0;
      rendimientoSastreria += f.subtotalArreglosLibres || 0;

      if (f.tipoOperacion === "ALQUILER") {
        rendimientoAlquileres += f.subtotalProductos || 0;
      } else if (f.tipoOperacion === "SEPARE") {
        rendimientoApartados += f.totalFactura || 0;
      } else {
        rendimientoVentas += f.subtotalProductos || 0;
      }

      for (const d of f.detalles) {
        const cantidad = d.cantidad || 1;
        if (d.producto && d.producto.tipo === TipoProducto.ALQUILER) {
          totalPrendasAlquiladas += cantidad;
        }
      }
    }

    // Prendas actualmente alquiladas fuera de la tienda (en general)
    const prendasAlquiladasActivas = await prisma.producto.count({
      where: {
        tipo: TipoProducto.ALQUILER,
        estadoPrenda: EstadoPrenda.ALQUILADO,
      },
    });

    // 6. DEPÓSITOS EN CUSTODIA (Regla 4: Alquileres Activos + Apartados Activos)
    // Facturas de Alquiler activas con depósito en garantía recibido y prendas aún no retornadas
    const alquileresActivosConDeposito = await prisma.factura.findMany({
      where: {
        tipoOperacion: "ALQUILER",
        estado: { not: EstadoFactura.CERRADA },
        fechaDevolucionReal: null,
        montoDeposito: { gt: 0 },
      },
      select: {
        id: true,
        montoDeposito: true,
        estadoDeposito: true,
      },
    });

    const custodiaAlquileres = alquileresActivosConDeposito.reduce(
      (acc, f) => acc + (f.montoDeposito || 0),
      0
    );

    // Facturas de Apartados activos (dinero recibido en garantía/abono no cerrado)
    const apartadosActivos = await prisma.factura.findMany({
      where: {
        tipoOperacion: "SEPARE",
        estado: { not: EstadoFactura.CERRADA },
      },
      select: {
        id: true,
        totalAbonado: true,
        montoDeposito: true,
      },
    });

    const custodiaApartados = apartadosActivos.reduce(
      (acc, f) => acc + (f.totalAbonado || f.montoDeposito || 0),
      0
    );

    const totalDepositosCustodia = custodiaAlquileres + custodiaApartados;

    // 7. DINERO EN LA CALLE (Regla 4: Saldos Pendientes Activos + Moras Activas de Vencidos)
    const facturasActivas = await prisma.factura.findMany({
      where: {
        estado: { not: EstadoFactura.CERRADA },
      },
      select: {
        id: true,
        clienteId: true,
        tipoOperacion: true,
        saldoPendiente: true,
        fechaDevolucionPactada: true,
        fechaDevolucionReal: true,
        tarifaMoraDiaria: true,
        recargoMoraAcumulado: true,
      },
    });

    const ahora = new Date();
    let totalSaldosPendientesCalle = 0;
    let totalMorasActivasCalle = 0;
    const clientesDeudoresSet = new Set<string>();
    let facturasConSaldoCount = 0;
    let alquileresVencidosCount = 0;

    for (const f of facturasActivas) {
      let tieneDeuda = false;

      // Saldo pendiente
      if (f.saldoPendiente > 0) {
        totalSaldosPendientesCalle += f.saldoPendiente;
        facturasConSaldoCount++;
        tieneDeuda = true;
      }

      // Moras activas acumuladas de clientes vencidos (Alquiler no devuelto superó fecha límite)
      if (
        f.tipoOperacion === "ALQUILER" &&
        !f.fechaDevolucionReal &&
        f.fechaDevolucionPactada &&
        new Date(f.fechaDevolucionPactada) < ahora
      ) {
        const msDiferencia = ahora.getTime() - new Date(f.fechaDevolucionPactada).getTime();
        const diasRetraso = Math.max(0, Math.floor(msDiferencia / (1000 * 60 * 60 * 24)));
        const tarifa = f.tarifaMoraDiaria > 0 ? f.tarifaMoraDiaria : 3000;
        const moraCalculada = diasRetraso * tarifa;
        const moraEfectiva = Math.max(f.recargoMoraAcumulado || 0, moraCalculada);

        if (moraEfectiva > 0) {
          totalMorasActivasCalle += moraEfectiva;
          alquileresVencidosCount++;
          tieneDeuda = true;
        }
      }

      if (tieneDeuda && f.clienteId) {
        clientesDeudoresSet.add(f.clienteId);
      }
    }

    const totalDineroEnLaCalle = totalSaldosPendientesCalle + totalMorasActivasCalle;

    // 8. Efectivo disponible en gaveta si el turno está abierto
    const efectivoEnGavetaTurno = turnoActivo
      ? Math.max(0, (turnoActivo.baseInicialEfectivo || 0) + (turnoActivo.totalEfectivo || 0))
      : 0;

    const totalDigital =
      totalNequi +
      totalDaviplata +
      totalBancolombia +
      totalLlave +
      totalTransferencia +
      totalConsignacion;

    const desgloseMetodos = {
      totalEfectivo: Math.round(totalEfectivo * 100) / 100,
      totalNequi: Math.round(totalNequi * 100) / 100,
      totalDaviplata: Math.round(totalDaviplata * 100) / 100,
      totalBancolombia: Math.round(totalBancolombia * 100) / 100,
      totalLlave: Math.round(totalLlave * 100) / 100,
      totalTransferencia: Math.round(totalTransferencia * 100) / 100,
      totalConsignacion: Math.round(totalConsignacion * 100) / 100,
      totalDigital: Math.round(totalDigital * 100) / 100,
    };

    const desgloseLineas = {
      alquileres: Math.round(rendimientoAlquileres * 100) / 100,
      ventas: Math.round(rendimientoVentas * 100) / 100,
      apartados: Math.round(rendimientoApartados * 100) / 100,
      sastreria: Math.round(rendimientoSastreria * 100) / 100,
    };

    const dondeEstaElDinero = {
      efectivoFisicoPeriodo: Math.round(totalEfectivo * 100) / 100,
      efectivoEnGavetaTurno: Math.round(efectivoEnGavetaTurno * 100) / 100,
      baseInicialGaveta: turnoActivo?.baseInicialEfectivo || 0,
      efectivoRecaudadoTurno: turnoActivo?.totalEfectivo || 0,
      totalCuentasDigitales: Math.round(totalDigital * 100) / 100,
      cuentasDigitalesOConsignaciones: Math.round(totalDigital * 100) / 100,
      desgloseDigital: {
        nequi: Math.round(totalNequi * 100) / 100,
        bancolombia: Math.round(totalBancolombia * 100) / 100,
        llave: Math.round(totalLlave * 100) / 100,
        daviplata: Math.round(totalDaviplata * 100) / 100,
        transferencia: Math.round(totalTransferencia * 100) / 100,
        consignacion: Math.round(totalConsignacion * 100) / 100,
      },
      depositosCustodia: Math.round(totalDepositosCustodia * 100) / 100,
      depositosEnCustodia: Math.round(totalDepositosCustodia * 100) / 100,
      desgloseCustodia: {
        alquileresActivos: Math.round(custodiaAlquileres * 100) / 100,
        apartadosActivos: Math.round(custodiaApartados * 100) / 100,
        leyenda: "Dinero en garantía de alquileres activos y apartados (En custodia, no es ingreso de la tienda)",
      },
      dineroEnLaCalle: Math.round(totalDineroEnLaCalle * 100) / 100,
      desgloseDineroCalle: {
        saldosPorCobrar: Math.round(totalSaldosPendientesCalle * 100) / 100,
        morasActivas: Math.round(totalMorasActivasCalle * 100) / 100,
        clientesDeudoresCount: clientesDeudoresSet.size,
        facturasConSaldoCount,
        alquileresVencidosCount,
      },
      cuentasPorCobrar: Math.round(totalSaldosPendientesCalle * 100) / 100,
      morasRecaudadas: Math.round(morasRecaudadas * 100) / 100,
    };

    // 8. Gastos consolidados del periodo y balance neto operativo (Sin tocar caja física)
    const gastosPeriodo = await prisma.gasto.aggregate({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      _sum: { valor: true },
    });
    const totalGastosPeriodo = Math.round((gastosPeriodo._sum.valor || 0) * 100) / 100;
    const utilidadNetaPeriodo = Math.round((ingresosNetos - totalGastosPeriodo) * 100) / 100;

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        rango: {
          desde: fechaDesde.toISOString(),
          hasta: fechaHasta.toISOString(),
          desdeLocal: desdeStr || obtenerFechaColombiaStr(fechaDesde),
          hastaLocal: hastaStr || obtenerFechaColombiaStr(fechaHasta),
        },
        metricas: {
          ingresosNetos: Math.round(ingresosNetos * 100) / 100,
          totalGastos: totalGastosPeriodo,
          utilidadNeta: utilidadNetaPeriodo,
          balanceNeto: utilidadNetaPeriodo,
          cuentasPorCobrar: Math.round(totalSaldosPendientesCalle * 100) / 100,
          morasRecaudadas: Math.round(morasRecaudadas * 100) / 100,
          totalPrendasAlquiladas,
          prendasAlquiladasActivas,
          rendimientoSastreria: Math.round(rendimientoSastreria * 100) / 100,
          rendimientoVentas: Math.round(rendimientoVentas * 100) / 100,
          rendimientoAlquileres: Math.round(rendimientoAlquileres * 100) / 100,
          rendimientoApartados: Math.round(rendimientoApartados * 100) / 100,
          totalFacturas: facturas.length,
          totalAbonos: abonos.length,
          depositosCustodia: Math.round(totalDepositosCustodia * 100) / 100,
          depositosEnCustodia: Math.round(totalDepositosCustodia * 100) / 100,
          dineroEnLaCalle: Math.round(totalDineroEnLaCalle * 100) / 100,
          clientesDeudoresCount: clientesDeudoresSet.size,
        },
        dondeEstaElDinero,
        desgloseMetodos,
        desgloseMetodosPago: desgloseMetodos,
        desgloseLineas,
        desgloseLineasNegocio: desgloseLineas,
        turnoActual: turnoActivo
          ? {
              id: turnoActivo.id,
              fechaApertura: turnoActivo.fechaApertura.toISOString(),
              baseInicial: turnoActivo.baseInicialEfectivo,
              cajero: turnoActivo.usuarioCajero.nombre,
              efectivoEnGaveta: efectivoEnGavetaTurno,
            }
          : null,
        ultimasFacturas: facturas.slice(0, 10).map((f) => ({
          id: f.id,
          numeroFactura: f.numeroFactura,
          clienteNombre: f.cliente?.nombre || "Consumidor Final",
          tipoOperacion: f.tipoOperacion,
          estado: f.estado,
          totalFactura: f.totalFactura,
          totalAbonado: f.totalAbonado,
          saldoPendiente: f.saldoPendiente,
          fechaCreacion: f.fechaCreacion.toISOString(),
        })),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al calcular métricas en tiempo real:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al calcular telemetría gerencial",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
