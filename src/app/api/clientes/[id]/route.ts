import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularMoraDeFactura } from "@/lib/cron-moras";
import { EstadoFactura } from "@prisma/client";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clientes/[id]
 * Retorna los datos detallados del cliente junto con su historial completo
 * de compras, alquileres activos, moras acumuladas y prendas en su poder.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [{ id }, { documento: id }],
      },
      include: {
        facturas: {
          orderBy: { fechaCreacion: "desc" },
          include: {
            usuarioCajero: {
              select: {
                id: true,
                nombre: true,
                username: true,
              },
            },
            detalles: {
              include: {
                producto: true,
              },
            },
            abonos: {
              include: {
                cajero: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
              orderBy: { fecha: "desc" },
            },
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const ahora = new Date();

    // Procesar cada factura del cliente calculando moras en tiempo real
    const historialFacturas = cliente.facturas.map((fac) => {
      const calculo = calcularMoraDeFactura(fac, ahora);

      const saldoBase = Math.max(
        0,
        Math.round(((fac.totalFactura || 0) - (fac.totalAbonado || 0)) * 100) / 100
      );
      const recargoMora = Math.round(calculo.recargoMoraCalculado * 100) / 100;
      const totalExigible = Math.round((saldoBase + recargoMora) * 100) / 100;

      const prendaSinEntregar =
        (fac.tipoOperacion === "ALQUILER" || fac.tipoOperacion === "MIXTO") &&
        !fac.fechaDevolucionReal &&
        !!fac.fechaDevolucionPactada &&
        new Date(fac.fechaDevolucionPactada) < ahora;

      const estaCerrada =
        fac.estado === EstadoFactura.CERRADA ||
        (saldoBase === 0 && recargoMora === 0 && !prendaSinEntregar);

      const prendaPrincipal =
        fac.detalles.find((d) => d.producto)?.producto?.nombre ||
        fac.detalles.find((d) => d.esServicioLibre)?.descripcionLibre ||
        "Traje / Prenda de Alquiler";

      return {
        ...fac,
        saldoBase,
        recargoMora,
        totalExigible,
        diasRetraso: calculo.diasRetraso,
        horasRetraso: calculo.horasRetraso,
        enMora: calculo.enMora && recargoMora > 0,
        prendasEnMora: calculo.prendasEnMora,
        prendaPrincipal,
        estaCerrada,
        prendaSinEntregar,
      };
    });

    // Métricas consolidadas del cliente
    let totalFacturado = 0;
    let totalAbonado = 0;
    let saldoTotalPendiente = 0;
    let totalMoraVigente = 0;
    const prendasEnPoderCliente: Array<{
      facturaId: string;
      numeroFactura: string;
      prenda: string;
      codigo?: string;
      fechaEntrega?: string | null;
      fechaDevolucionPactada?: string | null;
      enMora: boolean;
      diasRetraso: number;
    }> = [];

    historialFacturas.forEach((fac) => {
      totalFacturado += fac.totalFactura;
      totalAbonado += fac.totalAbonado;
      saldoTotalPendiente += fac.totalExigible;
      totalMoraVigente += fac.recargoMora;

      if (!fac.estaCerrada && (fac.tipoOperacion === "ALQUILER" || fac.tipoOperacion === "MIXTO")) {
        fac.detalles.forEach((det) => {
          if (det.producto && det.producto.tipo === "ALQUILER") {
            prendasEnPoderCliente.push({
              facturaId: fac.id,
              numeroFactura: fac.numeroFactura,
              prenda: det.producto.nombre,
              codigo: det.producto.codigo,
              fechaEntrega: fac.fechaEntregaAlquiler ? fac.fechaEntregaAlquiler.toISOString() : null,
              fechaDevolucionPactada: fac.fechaDevolucionPactada ? fac.fechaDevolucionPactada.toISOString() : null,
              enMora: fac.enMora,
              diasRetraso: fac.diasRetraso,
            });
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        documento: cliente.documento,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        notas: cliente.notas,
        fechaCreacion: cliente.fechaCreacion,
        updatedAt: cliente.updatedAt,
      },
      metricas: {
        totalFacturas: historialFacturas.length,
        totalFacturado: Math.round(totalFacturado * 100) / 100,
        totalAbonado: Math.round(totalAbonado * 100) / 100,
        saldoTotalPendiente: Math.round(saldoTotalPendiente * 100) / 100,
        totalMoraVigente: Math.round(totalMoraVigente * 100) / 100,
        prendasAlquiladasActivas: prendasEnPoderCliente.length,
      },
      prendasEnPoderCliente,
      facturas: historialFacturas,
    });
  } catch (error: unknown) {
    console.error("Error al consultar cliente por ID:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar el perfil del cliente" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clientes/[id]
 * Actualización de información de contacto o notas del cliente
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nombre, telefono, direccion, notas } = body;

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: {
        ...(nombre ? { nombre: nombre.trim() } : {}),
        telefono: telefono ? telefono.trim() : null,
        direccion: direccion ? direccion.trim() : null,
        notas: notas ? notas.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      cliente: clienteActualizado,
      message: "Datos del cliente actualizados exitosamente",
    });
  } catch (error: unknown) {
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json(
      { success: false, error: "No fue posible actualizar los datos del cliente" },
      { status: 500 }
    );
  }
}
