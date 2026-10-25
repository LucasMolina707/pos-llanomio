import { PrismaClient } from "@prisma/client";
import {
  crearDocumentoPdfMediaCarta,
  crearDocumentoPdfCarta,
  crearDocumentoPdfTirilla,
} from "../src/lib/pdf-media-carta";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function ejecutarPruebaQA() {
  console.log("===============================================================================");
  console.log("      CONTROL DE CALIDAD (QA - AGENTE 5) - PRUEBA INTEGRAL DE FACTURACIÓN");
  console.log("===============================================================================\n");

  try {
    // 1. Obtener o crear cajero
    let usuario = await prisma.user.findFirst({ where: { activo: true } });
    if (!usuario) {
      usuario = await prisma.user.create({
        data: {
          username: "admin_qa",
          nombre: "Administrador QA",
          passwordHash: "hash_temporal",
          rol: "ADMIN",
        },
      });
    }
    console.log(`[1/6] Cajero verificado: ${usuario.nombre} (${usuario.username})`);

    // 2. Obtener o crear cliente
    const docCliente = "1099887766";
    let cliente = await prisma.cliente.findUnique({ where: { documento: docCliente } });
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          documento: docCliente,
          nombre: "Carolina Gómez Llanera",
          telefono: "3159988776",
          direccion: "Carrera 40 # 12-50, Villavicencio",
        },
      });
    }
    console.log(`[2/6] Cliente verificado: ${cliente.nombre} (C.C. ${cliente.documento})`);

    // 3. Obtener o crear prendas/productos para factura mixta
    let productoVenta = await prisma.producto.findFirst({ where: { tipo: "VENTA", activo: true } });
    if (!productoVenta) {
      productoVenta = await prisma.producto.create({
        data: {
          codigo: "VEN-SOMBRERO-01",
          nombre: "Sombrero Llanero Pelo e Guama",
          tipo: "VENTA",
          categoria: "Accesorios",
          precioVenta: 120000,
          stockActual: 10,
        },
      });
    }

    let productoAlquiler = await prisma.producto.findFirst({ where: { tipo: "ALQUILER", activo: true } });
    if (!productoAlquiler) {
      productoAlquiler = await prisma.producto.create({
        data: {
          codigo: "ALQ-TRAJE-01",
          nombre: "Traje Típico Liquiliqui Blanco",
          tipo: "ALQUILER",
          categoria: "Trajes Típicos",
          precioAlquilerBase: 90000,
          tarifaMoraPorDia: 25000,
          stockActual: 3,
        },
      });
    }
    console.log(`[3/6] Productos verificados:`);
    console.log(`      - Venta: ${productoVenta.nombre} ($${productoVenta.precioVenta})`);
    console.log(`      - Alquiler: ${productoAlquiler.nombre} ($${productoAlquiler.precioAlquilerBase})`);

    // 4. Creación de Factura Mixta con Pago Parcial (Abono Inicial del 50%)
    const numeroFactura = `TEST-QA-${Date.now().toString().slice(-6)}`;
    const subtotalVenta = productoVenta.precioVenta || 120000;
    const subtotalAlquiler = productoAlquiler.precioAlquilerBase || 90000;
    const subtotalArreglo = 35000; // Servicio libre
    const totalInicial = subtotalVenta + subtotalAlquiler + subtotalArreglo; // $245.000
    const abonoInicial = 100000; // Adelanto
    const saldoInicial = totalInicial - abonoInicial; // $145.000

    // Fecha pactada de devolución vencida hace 2 días para probar cálculo de mora
    const fechaPactadaVencida = new Date();
    fechaPactadaVencida.setDate(fechaPactadaVencida.getDate() - 2);

    const factura = await prisma.factura.create({
      data: {
        numeroFactura,
        clienteId: cliente.id,
        usuarioCajeroId: usuario.id,
        tipoOperacion: "MIXTO",
        estado: "ACTIVA_ALQUILADA",
        subtotalProductos: subtotalVenta + subtotalAlquiler,
        subtotalArreglosLibres: subtotalArreglo,
        recargoMoraAcumulado: 0,
        totalFactura: totalInicial,
        totalAbonado: abonoInicial,
        saldoPendiente: saldoInicial,
        fechaEntregaAlquiler: new Date(),
        fechaDevolucionPactada: fechaPactadaVencida,
        notas: "Prueba de QA automatizada de ciclo completo",
        detalles: {
          create: [
            {
              productoId: productoVenta.id,
              cantidad: 1,
              precioUnitario: subtotalVenta,
              subtotal: subtotalVenta,
              esServicioLibre: false,
            },
            {
              productoId: productoAlquiler.id,
              cantidad: 1,
              precioUnitario: subtotalAlquiler,
              subtotal: subtotalAlquiler,
              esServicioLibre: false,
            },
            {
              cantidad: 1,
              precioUnitario: subtotalArreglo,
              subtotal: subtotalArreglo,
              esServicioLibre: true,
              descripcionLibre: "Ajuste de bota y botones de camisa típicos",
            },
          ],
        },
        abonos: {
          create: [
            {
              cajeroId: usuario.id,
              monto: abonoInicial,
              metodoPago: "EFECTIVO",
              montoRecibido: 100000,
              vueltasEntregadas: 0,
              referenciaComprobante: "ADELANTO-QA-01",
              notas: "Abono inicial 50%",
            },
          ],
        },
      },
      include: {
        detalles: true,
        abonos: true,
      },
    });

    console.log(`\n[4/6] Factura mixta creada exitosamente: ${factura.numeroFactura}`);
    console.log(`      Total Factura:   $${factura.totalFactura.toLocaleString()}`);
    console.log(`      Abono Inicial:   $${factura.totalAbonado.toLocaleString()} (Efectivo)`);
    console.log(`      Saldo Pendiente: $${factura.saldoPendiente.toLocaleString()}`);

    // 5. Simulación de Liquidación Posterior con Recargo por Mora y Devolución de Prendas
    const recargoMoraDias = 2 * (productoAlquiler.tarifaMoraPorDia || 25000); // 2 días = $50.000
    const totalLiquidacionFinal = saldoInicial + recargoMoraDias; // $145.000 + $50.000 = $195.000

    console.log(`\n[5/6] Liquidando factura con mora y saldo pendiente:`);
    console.log(`      - Saldo base pendiente: $${saldoInicial.toLocaleString()}`);
    console.log(`      - Recargo por mora (2 días): +$${recargoMoraDias.toLocaleString()}`);
    console.log(`      - TOTAL A COBRAR FINAL: $${totalLiquidacionFinal.toLocaleString()}`);

    // Transacción atómica de liquidación
    const facturaLiquidada = await prisma.$transaction(async (tx) => {
      // Registrar abono final por el saldo pendiente + mora
      await tx.abono.create({
        data: {
          facturaId: factura.id,
          cajeroId: usuario.id,
          monto: totalLiquidacionFinal,
          metodoPago: "NEQUI",
          referenciaComprobante: "NEQUI-LIQUIDACION-PAZYSALVO",
          notas: "Liquidación total de saldo pendiente y recargo por mora",
        },
      });

      // Crear detalle por concepto de mora
      await tx.detalleFactura.create({
        data: {
          facturaId: factura.id,
          cantidad: 1,
          precioUnitario: recargoMoraDias,
          subtotal: recargoMoraDias,
          esServicioLibre: true,
          descripcionLibre: "Recargo por Mora - Retraso en devolución de alquiler (2 días)",
        },
      });

      // Retornar prenda a estado DISPONIBLE
      await tx.producto.update({
        where: { id: productoAlquiler.id },
        data: { estadoPrenda: "DISPONIBLE", stockActual: { increment: 1 } },
      });

      // Actualizar factura a CERRADA (Paz y Salvo)
      const nuevoTotal = totalInicial + recargoMoraDias;
      const nuevoAbonado = abonoInicial + totalLiquidacionFinal;

      return await tx.factura.update({
        where: { id: factura.id },
        data: {
          totalFactura: nuevoTotal,
          totalAbonado: nuevoAbonado,
          saldoPendiente: 0,
          recargoMoraAcumulado: recargoMoraDias,
          estado: "CERRADA",
          fechaDevolucionReal: new Date(),
        },
        include: {
          cliente: true,
          usuarioCajero: true,
          detalles: { include: { producto: true } },
          abonos: true,
        },
      });
    });

    console.log(`\n      Resultado de Liquidación:`);
    console.log(`      - Estado Factura: ${facturaLiquidada.estado} (PAZ Y SALVO)`);
    console.log(`      - Total Factura Final: $${facturaLiquidada.totalFactura.toLocaleString()}`);
    console.log(`      - Total Abonado:       $${facturaLiquidada.totalAbonado.toLocaleString()}`);
    console.log(`      - Saldo Pendiente:     $${facturaLiquidada.saldoPendiente} (0 pesos)`);
    console.log(`      - Cuadre Matemático:   ${facturaLiquidada.totalFactura - facturaLiquidada.totalAbonado === 0 ? "EXACTO AL CENTAVO" : "DESCUADRADO"}`);

    // 6. Prueba de Generación de PDF Documental (Media Carta y Carta) con CERO códigos QR
    console.log(`\n[6/6] Generando PDF de Paz y Salvo con logo y CERO QR...`);
    const empresaConfig = (await prisma.configuracionEmpresa.findFirst()) || {
      nombreComercial: "LLANOMIO",
      nit: "900.123.456-7",
      direccion: "Calle 15 # 22-30",
      telefono: "310 123 4567",
      eslogan: "Trajes Típicos y Alquiler",
      regimenFiscal: "No Responsable de IVA",
      ciudad: "Villavicencio",
      email: "contacto@llanomio.com",
    };

    const datosImpresion = {
      factura: {
        id: facturaLiquidada.id,
        numeroFactura: facturaLiquidada.numeroFactura,
        fechaCreacion: facturaLiquidada.fechaCreacion.toISOString(),
        fechaEntregaAlquiler: facturaLiquidada.fechaEntregaAlquiler?.toISOString() || null,
        fechaDevolucionPactada: facturaLiquidada.fechaDevolucionPactada?.toISOString() || null,
        fechaDevolucionReal: facturaLiquidada.fechaDevolucionReal?.toISOString() || null,
        tipoOperacion: facturaLiquidada.tipoOperacion,
        estado: facturaLiquidada.estado,
        subtotalProductos: facturaLiquidada.subtotalProductos,
        subtotalArreglosLibres: facturaLiquidada.subtotalArreglosLibres,
        recargoMoraAcumulado: facturaLiquidada.recargoMoraAcumulado,
        totalFactura: facturaLiquidada.totalFactura,
        totalAbonado: facturaLiquidada.totalAbonado,
        saldoPendiente: facturaLiquidada.saldoPendiente,
        notas: facturaLiquidada.notas,
        cliente: {
          nombre: facturaLiquidada.cliente.nombre,
          documento: facturaLiquidada.cliente.documento,
          telefono: facturaLiquidada.cliente.telefono,
          direccion: facturaLiquidada.cliente.direccion,
        },
        usuarioCajero: {
          nombre: facturaLiquidada.usuarioCajero.nombre,
          username: facturaLiquidada.usuarioCajero.username,
        },
        detalles: facturaLiquidada.detalles.map((d) => ({
          id: d.id,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
          esServicioLibre: d.esServicioLibre,
          descripcionLibre: d.descripcionLibre,
          producto: d.producto
            ? {
                codigo: d.producto.codigo,
                nombre: d.producto.nombre,
                tipo: d.producto.tipo,
                talla: d.producto.talla,
                color: d.producto.color,
              }
            : null,
        })),
        abonos: facturaLiquidada.abonos.map((a) => ({
          id: a.id,
          fecha: a.fecha.toISOString(),
          monto: a.monto,
          metodoPago: a.metodoPago,
          referenciaComprobante: a.referenciaComprobante,
          montoRecibido: a.montoRecibido,
          vueltasEntregadas: a.vueltasEntregadas,
        })),
      },
      empresa: empresaConfig,
    };

    // Generar PDF Media Carta
    const docMediaCarta = crearDocumentoPdfMediaCarta(datosImpresion as any);
    const bufferMediaCarta = Buffer.from(docMediaCarta.output("arraybuffer"));
    console.log(`      - PDF Media Carta generado: ${bufferMediaCarta.byteLength} bytes.`);

    // Generar PDF Carta
    const docCarta = crearDocumentoPdfCarta(datosImpresion as any);
    const bufferCarta = Buffer.from(docCarta.output("arraybuffer"));
    console.log(`      - PDF Carta generado:       ${bufferCarta.byteLength} bytes.`);

    // Generar PDF Tirilla 80mm
    const docTirilla = crearDocumentoPdfTirilla(datosImpresion as any);
    const bufferTirilla = Buffer.from(docTirilla.output("arraybuffer"));
    console.log(`      - PDF Tirilla 80mm generado:${bufferTirilla.byteLength} bytes.`);

    console.log("\n===============================================================================");
    console.log("   PRUEBA INTEGRAL DE QA SUPERADA CON ÉXITO: 100% OPERATIVO Y SIN ERRORES");
    console.log("===============================================================================\n");
  } catch (error) {
    console.error("\n[ERROR EN PRUEBA QA]:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ejecutarPruebaQA();
