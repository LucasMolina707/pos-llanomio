/**
 * TEST QA - VERIFICACIÓN DE FLUJO COBRO ALQUILER -> IMPRESIÓN Y RESPALDO /impresion/[id]
 */

import { PrismaClient, TipoOperacion, MetodoPago, EstadoFactura, EstadoPrenda } from "@prisma/client";
import { POST as crearFacturaHandler } from "../src/app/api/facturas/route";
import { POST as liquidarFacturaHandler } from "../src/app/api/facturas/[id]/route";
import { GET as obtenerImpresionHandler } from "../src/app/api/impresion/[id]/route";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("INICIANDO PRUEBAS DE CIRCUITO COBRO -> IMPRESIÓN");
  console.log("=================================================\n");

  try {
    // 1. Obtener usuario cajero
    const cajero = await prisma.user.findFirst({ where: { activo: true } });
    if (!cajero) throw new Error("No hay usuario activo");

    // 2. Crear cliente de prueba
    const cliente = await prisma.cliente.create({
      data: {
        documento: `CC-${Date.now()}`,
        nombre: "María Fernanda Salcedo",
        telefono: "3115556677",
        telefonoSecundario: "3128889900",
        direccion: "Avenida 40 # 12-45",
      },
    });

    // 3. Crear prenda de prueba
    const prenda = await prisma.producto.create({
      data: {
        codigo: `ALQ-QA-${Date.now()}`,
        nombre: "Vestido Típico Joropo Señorial",
        categoria: "Trajes",
        tipo: "ALQUILER",
        precioAlquilerBase: 90000,
        stockActual: 3,
        estadoPrenda: EstadoPrenda.DISPONIBLE,
        activo: true,
      },
    });

    console.log(`[OK] Cliente creado: ${cliente.nombre} con 2 teléfonos: ${cliente.telefono} y ${cliente.telefonoSecundario}`);
    console.log(`[OK] Prenda creada: ${prenda.nombre}`);

    // 4. Cobrar / Expedir Alquiler en Paso 3
    console.log("\nSimulando Cobro de Alquiler en Paso 3 (POST /api/facturas)...");
    const reqCobro = new NextRequest("http://localhost:3000/api/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: cliente.id,
        cajeroId: cajero.id,
        tipoOperacion: "ALQUILER",
        fechaEntregaAlquiler: new Date().toISOString(),
        fechaDevolucionPactada: new Date(Date.now() + 86400000 * 2).toISOString(),
        montoDeposito: 60000,
        metodoPagoDeposito: "EFECTIVO",
        detalles: [
          {
            productoId: prenda.id,
            cantidad: 1,
            precioUnitario: 90000,
          },
        ],
        abonoInicial: {
          monto: 50000,
          metodoPago: "EFECTIVO",
          montoRecibido: 50000,
          vueltasEntregadas: 0,
        },
      }),
    });

    const resCobro = await crearFacturaHandler(reqCobro);
    const dataCobro = await resCobro.json();

    console.log("Respuesta recibida:", {
      status: resCobro.status,
      success: dataCobro.success,
      ok: dataCobro.ok,
      id: dataCobro.id,
      facturaId: dataCobro.factura?.id,
    });

    if (!resCobro.ok || !dataCobro.id || !dataCobro.ok) {
      throw new Error(`Respuesta inválida al cobrar alquiler: ${JSON.stringify(dataCobro)}`);
    }

    const facturaId = dataCobro.id;
    console.log(`[OK] Cobro registrado exitosamente con ID directo: ${facturaId}`);

    // 5. Verificar resolución de datos de impresión en /api/impresion/[id]
    console.log("\nVerificando /api/impresion/[id] para Paso 4 e /impresion/[id]...");
    const resImpresion = await obtenerImpresionHandler(new NextRequest(`http://localhost:3000/api/impresion/${facturaId}`), {
      params: Promise.resolve({ id: facturaId }),
    });
    const dataImpresion = await resImpresion.json();

    if (!resImpresion.ok || !dataImpresion.success || !dataImpresion.factura) {
      throw new Error(`Fallo consulta de impresión: ${JSON.stringify(dataImpresion)}`);
    }

    const f = dataImpresion.factura;
    console.log(`[OK] Factura N° ${f.numeroFactura} cargada para impresión.`);
    console.log(`     - Cliente: ${f.cliente?.nombre}`);
    console.log(`     - Teléfonos: ${f.cliente?.telefono} / ${f.cliente?.telefonoSecundario}`);
    console.log(`     - Depósito en Garantía: $${f.montoDeposito} (${f.estadoDeposito})`);
    console.log(`     - Total Alquiler: $${f.totalFactura}, Abonado: $${f.totalAbonado}, Saldo: $${f.saldoPendiente}`);

    // 6. Liquidar / Devolver en Paz y Salvo
    console.log("\nSimulando Liquidación y Devolución (POST /api/facturas/[id])...");
    const reqLiquidar = new NextRequest(`http://localhost:3000/api/facturas/${facturaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipoAccion: "LIQUIDAR_CONTRATO",
        cobroSaldo: 40000,
        metodoPago: "EFECTIVO",
        estadoDeposito: "DEVUELTO_COMPLETO",
        montoDevueltoDeposito: 60000,
        montoRetenidoDeposito: 0,
      }),
    });

    const resLiquidar = await liquidarFacturaHandler(reqLiquidar, { params: Promise.resolve({ id: facturaId }) });
    const dataLiquidar = await resLiquidar.json();

    console.log("Respuesta de liquidación:", {
      status: resLiquidar.status,
      success: dataLiquidar.success,
      ok: dataLiquidar.ok,
      id: dataLiquidar.id,
      saldo: dataLiquidar.factura?.saldoPendiente,
      estado: dataLiquidar.factura?.estado,
    });

    if (!resLiquidar.ok || !dataLiquidar.ok || dataLiquidar.factura?.saldoPendiente !== 0) {
      throw new Error(`Fallo al liquidar alquiler: ${JSON.stringify(dataLiquidar)}`);
    }

    console.log(`[OK] Alquiler liquidado en Paz y Salvo. Estado: ${dataLiquidar.factura.estado}, Saldo: $${dataLiquidar.factura.saldoPendiente}`);

    console.log("\n=================================================");
    console.log("¡CIRCUITO DE COBRO -> IMPRESIÓN VALIDADO AL 100%!");
    console.log("=================================================\n");
  } catch (error) {
    console.error("[ERROR EN TEST]:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
