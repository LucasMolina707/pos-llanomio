import { prisma } from "./prisma";
import { EstadoFactura, UnidadMora, TipoProducto } from "@prisma/client";

export interface PrendaEnMoraInfo {
  productoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  tarifaMora: number;
  unidadMora: UnidadMora;
  unidadesRetraso: number;
  subtotalMora: number;
}

export interface ResultadoCalculoMora {
  facturaId: string;
  numeroFactura: string;
  enMora: boolean;
  diasRetraso: number;
  horasRetraso: number;
  recargoMoraCalculado: number;
  saldoAnterior: number;
  saldoConMora: number;
  prendasEnMora: PrendaEnMoraInfo[];
}

/**
 * Calcula en memoria la mora de una factura a partir de su fecha pactada y sus detalles de alquiler
 */
export function calcularMoraDeFactura(factura: any, fechaReferencia: Date = new Date()): ResultadoCalculoMora {
  const resultado: ResultadoCalculoMora = {
    facturaId: factura.id,
    numeroFactura: factura.numeroFactura,
    enMora: false,
    diasRetraso: 0,
    horasRetraso: 0,
    recargoMoraCalculado: 0,
    saldoAnterior: factura.saldoPendiente || 0,
    saldoConMora: factura.saldoPendiente || 0,
    prendasEnMora: [],
  };

  // Si la factura está cerrada o ya devolvió la prenda, no se computa nueva mora
  if (factura.estado === EstadoFactura.CERRADA || factura.fechaDevolucionReal) {
    return resultado;
  }

  // Si no tiene fecha pactada de devolución, no hay base para calcular mora
  if (!factura.fechaDevolucionPactada) {
    return resultado;
  }

  const fechaLimite = new Date(factura.fechaDevolucionPactada);
  const diffMs = fechaReferencia.getTime() - fechaLimite.getTime();

  // Si aún no ha vencido la fecha pactada
  if (diffMs <= 0) {
    return resultado;
  }

  resultado.enMora = true;

  // Cálculo de tiempo transcurrido
  const totalHorasRetraso = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const totalDiasRetraso = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  resultado.horasRetraso = totalHorasRetraso;
  resultado.diasRetraso = totalDiasRetraso;

  let sumaRecargoTotal = 0;

  // Analizar cada ítem de alquiler
  if (Array.isArray(factura.detalles)) {
    for (const detalle of factura.detalles) {
      const prod = detalle.producto;
      // Solo computa mora para prendas de tipo ALQUILER
      if (prod && (prod.tipo === TipoProducto.ALQUILER || prod.precioAlquilerBase > 0)) {
        const unidad = prod.unidadMora || UnidadMora.DIA;
        let tarifaAplicable = prod.tarifaMora || 0;
        let unidadesCobro = totalDiasRetraso;

        if (unidad === UnidadMora.HORA) {
          tarifaAplicable = prod.tarifaMoraPorHora > 0 ? prod.tarifaMoraPorHora : (prod.tarifaMora || 0);
          unidadesCobro = totalHorasRetraso;
        } else {
          tarifaAplicable = prod.tarifaMoraPorDia > 0 ? prod.tarifaMoraPorDia : (prod.tarifaMora || 0);
          unidadesCobro = totalDiasRetraso;
        }

        const cantidad = detalle.cantidad || 1;
        const subtotalMoraItem = Math.round(tarifaAplicable * unidadesCobro * cantidad * 100) / 100;

        sumaRecargoTotal += subtotalMoraItem;

        resultado.prendasEnMora.push({
          productoId: prod.id,
          codigo: prod.codigo,
          nombre: prod.nombre,
          cantidad,
          tarifaMora: tarifaAplicable,
          unidadMora: unidad,
          unidadesRetraso: unidadesCobro,
          subtotalMora: subtotalMoraItem,
        });
      }
    }
  }

  resultado.recargoMoraCalculado = Math.round(sumaRecargoTotal * 100) / 100;

  // El saldo pendiente base sin mora es: totalFactura - totalAbonado
  const saldoBaseSinMora = Math.max(0, (factura.totalFactura || 0) - (factura.totalAbonado || 0));
  resultado.saldoConMora = Math.round((saldoBaseSinMora + resultado.recargoMoraCalculado) * 100) / 100;

  return resultado;
}

/**
 * Rutina para evaluar y actualizar en la base de datos todas las facturas de alquiler vencidas
 */
export async function sincronizarMorasEnBaseDeDatos(): Promise<{
  procesadas: number;
  enMora: number;
  totalRecargosAplicados: number;
}> {
  const ahora = new Date();

  // Consultar facturas activas o en proceso que tengan fecha pactada de devolución
  const facturasCandidatas = await prisma.factura.findMany({
    where: {
      estado: {
        in: [EstadoFactura.ACTIVA, EstadoFactura.EN_PROCESO, EstadoFactura.ACTIVA_ALQUILADA, EstadoFactura.EN_MORA],
      },
      fechaDevolucionPactada: {
        not: null,
      },
      fechaDevolucionReal: null,
    },
    include: {
      detalles: {
        include: {
          producto: true,
        },
      },
      cliente: true,
    },
  });

  let facturasEnMora = 0;
  let totalRecargos = 0;

  for (const fac of facturasCandidatas) {
    const calculo = calcularMoraDeFactura(fac, ahora);

    if (calculo.enMora && calculo.recargoMoraCalculado > 0) {
      facturasEnMora++;
      totalRecargos += calculo.recargoMoraCalculado;

      // Actualizar estado a EN_MORA y reflejar el nuevo recargo y saldo
      await prisma.factura.update({
        where: { id: fac.id },
        data: {
          estado: EstadoFactura.EN_MORA,
          recargoMoraAcumulado: calculo.recargoMoraCalculado,
          saldoPendiente: calculo.saldoConMora,
        },
      });
    }
  }

  return {
    procesadas: facturasCandidatas.length,
    enMora: facturasEnMora,
    totalRecargosAplicados: Math.round(totalRecargos * 100) / 100,
  };
}
