import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularMoraDeFactura } from "@/lib/cron-moras";
import { EstadoFactura } from "@prisma/client";
import { calcularDigitoVerificacionDIAN, validarEmail } from "@/lib/dian-utils";

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
        telefonoSecundario: cliente.telefonoSecundario,
        email: cliente.email,
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
 * Actualización completa de información de contacto o datos tributarios DIAN (RUT)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      nombre,
      telefono,
      telefonoSecundario,
      email,
      direccion,
      notas,
      esResponsableIVA,
      tipoIdentificacion,
      digitoVerificacion,
      razonSocial,
      responsabilidadFiscal,
      municipio,
      codigoDaneMunicipio,
    } = body;

    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        OR: [{ id }, { documento: id }],
      },
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado para actualizar" },
        { status: 404 }
      );
    }

    if (telefono !== undefined) {
      if (!telefono || !telefono.trim()) {
        return NextResponse.json(
          { success: false, error: "El teléfono primario no puede estar vacío" },
          { status: 400 }
        );
      }
      const telSan = telefono.trim().replace(/[^\d+]/g, "");
      if (telSan.length < 7) {
        return NextResponse.json(
          { success: false, error: "El teléfono primario debe tener al menos 7 dígitos" },
          { status: 400 }
        );
      }
    }

    const esRespIVA = esResponsableIVA !== undefined ? Boolean(esResponsableIVA) : clienteExistente.esResponsableIVA;
    const emailSanitizado = email !== undefined ? (email ? email.trim().toLowerCase() : null) : clienteExistente.email;
    const dirSanitizada = direccion !== undefined ? (direccion ? direccion.trim() : null) : clienteExistente.direccion;
    const nombreSanitizado = nombre !== undefined ? (nombre ? nombre.trim().toUpperCase() : clienteExistente.nombre) : clienteExistente.nombre;
    const rSocialSanitizada = razonSocial !== undefined ? (razonSocial ? razonSocial.trim().toUpperCase() : null) : clienteExistente.razonSocial;
    const tipoId = tipoIdentificacion !== undefined ? tipoIdentificacion.trim().toUpperCase() : clienteExistente.tipoIdentificacion;
    let dv = digitoVerificacion !== undefined ? (digitoVerificacion ? String(digitoVerificacion).trim() : null) : clienteExistente.digitoVerificacion;

    // Si es NIT y no tiene DV, autocalcular
    if (tipoId === "NIT" && !dv) {
      dv = calcularDigitoVerificacionDIAN(clienteExistente.documento) || null;
    }

    // Validaciones estrictas si es responsable de IVA
    if (esRespIVA) {
      if (!emailSanitizado || !validarEmail(emailSanitizado)) {
        return NextResponse.json(
          {
            success: false,
            error: "El correo electrónico es obligatorio y debe tener formato válido (@ y dominio) para clientes responsables de IVA (DIAN).",
          },
          { status: 400 }
        );
      }

      if (!dirSanitizada) {
        return NextResponse.json(
          {
            success: false,
            error: "La dirección fiscal del RUT es obligatoria para clientes responsables de IVA (DIAN).",
          },
          { status: 400 }
        );
      }

      if (tipoId === "NIT" && (!dv || dv.trim() === "")) {
        return NextResponse.json(
          {
            success: false,
            error: "El Dígito de Verificación (DV) es obligatorio cuando la identificación es NIT.",
          },
          { status: 400 }
        );
      }
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id: clienteExistente.id },
      data: {
        ...(nombre !== undefined ? { nombre: nombreSanitizado } : {}),
        ...(telefono !== undefined ? { telefono: telefono ? telefono.trim().replace(/[^\d+]/g, "") : null } : {}),
        ...(telefonoSecundario !== undefined
          ? { telefonoSecundario: telefonoSecundario ? telefonoSecundario.trim().replace(/[^\d+]/g, "") : null }
          : {}),
        ...(email !== undefined ? { email: emailSanitizado } : {}),
        ...(direccion !== undefined ? { direccion: dirSanitizada } : {}),
        ...(notas !== undefined ? { notas: notas ? notas.trim() : null } : {}),
        esResponsableIVA: esRespIVA,
        tipoIdentificacion: tipoId,
        digitoVerificacion: dv,
        razonSocial: rSocialSanitizada || (esRespIVA ? nombreSanitizado : null),
        responsabilidadFiscal: esRespIVA
          ? (responsabilidadFiscal ? responsabilidadFiscal.trim().toUpperCase() : "O-48")
          : "O-99",
        municipio: municipio ? municipio.trim() : (clienteExistente.municipio || "Villavicencio - Meta"),
        codigoDaneMunicipio: codigoDaneMunicipio ? String(codigoDaneMunicipio).trim() : (clienteExistente.codigoDaneMunicipio || "50001"),
      },
    });

    return NextResponse.json({
      success: true,
      cliente: clienteActualizado,
      message: "Datos tributarios y de contacto del cliente actualizados exitosamente",
    });
  } catch (error: unknown) {
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json(
      { success: false, error: "No fue posible actualizar los datos del cliente" },
      { status: 500 }
    );
  }
}
