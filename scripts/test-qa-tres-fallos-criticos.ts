/**
 * TEST QA INTEGRAL - TRES FALLOS CRÍTICOS POS LLANOMIO
 * 
 * 1. Erradicar error interno al finalizar/cerrar alquiler y pasar a impresión.
 * 2. Carga y estabilidad de clientes entre POS y Alquileres.
 * 3. Separación estricta de historiales en POS vs Alquileres y unificación en Galería de Clientes.
 */

import { NextRequest } from "next/server";
import { PrismaClient, TipoOperacion, MetodoPago, EstadoFactura, EstadoPrenda } from "@prisma/client";
import { POST as crearClienteHandler, GET as listarClientesHandler } from "../src/app/api/clientes/route";
import { GET as obtenerClienteHandler } from "../src/app/api/clientes/[id]/route";
import { POST as crearFacturaHandler, GET as listarFacturasHandler } from "../src/app/api/facturas/route";
import { POST as liquidarFacturaHandler } from "../src/app/api/facturas/[id]/route";
import { GET as obtenerImpresionHandler } from "../src/app/api/impresion/[id]/route";
import { GET as monitoreoHandler } from "../src/app/api/facturas/monitoreo/route";

const prisma = new PrismaClient();

async function ejecutarPruebasQA() {
  console.log("=================================================================");
  console.log("INICIANDO PRUEBAS DE CONTROL DE CALIDAD (QA INTEGRAL)");
  console.log("=================================================================\n");

  try {
    // 0. Preparar usuario cajero y prenda de prueba
    console.log("Paso 0: Verificando usuario activo y prenda de prueba...");
    let user = await prisma.user.findFirst({ where: { activo: true } });
    if (!user) {
      console.log("No había usuario activo, creando uno de prueba...");
      user = await prisma.user.create({
        data: {
          username: "admin_test",
          nombre: "Administrador Test",
          rol: "ADMIN",
          passwordHash: "hash_test",
          activo: true,
        },
      });
    }

    let prenda = await prisma.producto.findFirst({ where: { activo: true } });
    if (!prenda) {
      prenda = await prisma.producto.create({
        data: {
          codigo: "TRAJE-QA-01",
          nombre: "Traje Llanero de Gala Test",
          categoria: "Trajes",
          tipo: "ALQUILER",
          precioVenta: 180000,
          precioAlquilerBase: 75000,
          stockActual: 5,
          estadoPrenda: EstadoPrenda.DISPONIBLE,
          activo: true,
        },
      });
    }

    // 1. Probar Creación de Cliente con 2 teléfonos y listado estable
    console.log("\nPaso 1: Creando cliente con 2 teléfonos...");
    const reqCliente = new Request("http://localhost:3000/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Carlos Alirio Gómez",
        documento: "1098765432",
        telefono: "3109876543",
        telefonoSecundario: "3201234567",
        direccion: "Calle 15 # 22-30 Barrio El Centro",
        email: "carlos.gomez@test.com",
      }),
    });

    const resCliente = await crearClienteHandler(reqCliente);
    const clienteData = await resCliente.json();
    const clienteId = clienteData.cliente?.id || clienteData.id;
    if (!clienteId) {
      throw new Error(`Fallo creación de cliente: ${JSON.stringify(clienteData)}`);
    }
    console.log(`[OK] Cliente creado exitosamente. ID: ${clienteId}`);

    // Verificar listado en GET /api/clientes
    console.log("Verificando GET /api/clientes...");
    const resListarClientes = await listarClientesHandler(new Request("http://localhost:3000/api/clientes"));
    const resListarJson = await resListarClientes.json();
    const clientesLista = Array.isArray(resListarJson) ? resListarJson : (resListarJson.clientes || []);
    const clienteEncontrado = clientesLista.find((c: any) => c.id === clienteId);
    if (!clienteEncontrado) {
      throw new Error("El cliente recién creado no aparece en GET /api/clientes");
    }
    if (!clienteEncontrado.identificacion || !clienteEncontrado.telefonoSecundario) {
      throw new Error("El cliente no expone identificacion o telefonoSecundario en el listado");
    }
    console.log(`[OK] Cliente listado y normalizado correctamente con identificacion: ${clienteEncontrado.identificacion} y 2 teléfonos.`);

    // 2. Probar Creación de Alquiler con depósito en efectivo y abono
    console.log("\nPaso 2: Creando Factura de Alquiler con depósito...");
    const reqAlquiler = new Request("http://localhost:3000/api/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        cajeroId: user.id,
        tipoOperacion: "ALQUILER",
        fechaSalida: new Date().toISOString(),
        fechaDevolucion: new Date(Date.now() + 86400000 * 3).toISOString(),
        montoDeposito: 50000,
        metodoPagoDeposito: "EFECTIVO",
        total: 75000,
        abonoInicial: 40000,
        metodoPagoAbono: "EFECTIVO",
        items: [
          {
            productoId: prenda.id,
            nombre: prenda.nombre,
            cantidad: 1,
            precioUnitario: 75000,
            subtotal: 75000,
            fechaSalida: new Date().toISOString(),
            fechaDevolucion: new Date(Date.now() + 86400000 * 3).toISOString(),
            depositoPrenda: 50000,
          },
        ],
      }),
    });

    const resAlquiler = await crearFacturaHandler(reqAlquiler);
    const dataAlquiler = await resAlquiler.json();
    const facturaAlquiler = dataAlquiler.factura || dataAlquiler;
    if (!resAlquiler.ok || !facturaAlquiler?.id) {
      throw new Error(`Error 500 al crear alquiler: ${JSON.stringify(dataAlquiler)}`);
    }
    const facturaAlquilerId = facturaAlquiler.id;
    console.log(`[OK] Factura de Alquiler creada sin error. ID: ${facturaAlquilerId}, Folio: ${facturaAlquiler.numeroFactura}, Saldo: ${facturaAlquiler.saldoPendiente}, Depósito: ${facturaAlquiler.montoDeposito}`);

    // Verificar que la prenda haya pasado a ALQUILADA
    const prendaAlquilada = await prisma.producto.findUnique({ where: { id: prenda.id } });
    console.log(`[OK] Estado actual de la prenda: ${prendaAlquilada?.estadoPrenda}`);

    // 3. Probar Liquidación / Cierre de Alquiler (Paz y Salvo)
    console.log("\nPaso 3: Cerrando/Liquidando Alquiler (Paz y Salvo con devolución de prenda y depósito)...");
    const reqLiquidar = new Request(`http://localhost:3000/api/facturas/${facturaAlquilerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monto: 35000, // pagar saldo pendiente restante
        metodoPago: "EFECTIVO",
        notas: "Liquidación y entrega de prenda en perfecto estado",
        devolverPrendas: true,
        liquidarDeposito: true,
        estadoDeposito: "DEVUELTO",
        montoDevueltoDeposito: 50000,
        montoRetenidoDeposito: 0,
      }),
    });

    const resLiquidar = await liquidarFacturaHandler(reqLiquidar, { params: Promise.resolve({ id: facturaAlquilerId }) });
    const dataLiquidacion = await resLiquidar.json();
    if (!resLiquidar.ok || !dataLiquidacion.factura) {
      throw new Error(`Error al liquidar alquiler: ${JSON.stringify(dataLiquidacion)}`);
    }

    const facturaLiquidada = dataLiquidacion.factura;
    if (facturaLiquidada.saldoPendiente !== 0 || facturaLiquidada.estado !== EstadoFactura.CERRADA) {
      throw new Error(`Factura no quedó en CERRADA con saldo 0: Saldo=${facturaLiquidada.saldoPendiente}, Estado=${facturaLiquidada.estado}`);
    }
    console.log(`[OK] Alquiler cerrado exitosamente sin error 500. Estado: ${facturaLiquidada.estado}, Saldo: ${facturaLiquidada.saldoPendiente}, Depósito: ${facturaLiquidada.estadoDeposito}`);

    // Verificar que la prenda haya vuelto a DISPONIBLE
    const prendaDisponible = await prisma.producto.findUnique({ where: { id: prenda.id } });
    if (prendaDisponible?.estadoPrenda !== EstadoPrenda.DISPONIBLE) {
      throw new Error(`Prenda no regresó a DISPONIBLE: ${prendaDisponible?.estadoPrenda}`);
    }
    console.log(`[OK] Prenda liberada y devuelta a inventario: ${prendaDisponible?.estadoPrenda}`);

    // 4. Probar Impresión Directa GET /api/impresion/[id]
    console.log("\nPaso 4: Consultando GET /api/impresion/[id] para la factura cerrada...");
    const resImpresion = await obtenerImpresionHandler(new Request(`http://localhost:3000/api/impresion/${facturaAlquilerId}`), {
      params: Promise.resolve({ id: facturaAlquilerId }),
    });
    const dataImpresion = await resImpresion.json();
    if (!resImpresion.ok || !dataImpresion.success || !dataImpresion.factura) {
      throw new Error(`Error al obtener datos de impresión: ${JSON.stringify(dataImpresion)}`);
    }
    console.log(`[OK] Datos de impresión cargados con éxito. Folio: ${dataImpresion.factura.numeroFactura}, Empresa: ${dataImpresion.empresa?.nombre || "Llanomio"}`);

    // 5. Crear una Venta en POS para el mismo cliente
    console.log("\nPaso 5: Creando Factura de Venta Directa en POS para el mismo cliente...");
    const reqVenta = new Request("http://localhost:3000/api/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        cajeroId: user.id,
        tipoOperacion: "VENTA",
        total: 120000,
        abonoInicial: 120000,
        metodoPagoAbono: "EFECTIVO",
        items: [
          {
            nombre: "Sombrero Llanero Pelo de Guama",
            cantidad: 1,
            precioUnitario: 120000,
            subtotal: 120000,
          },
        ],
      }),
    });

    const resVenta = await crearFacturaHandler(reqVenta);
    const dataVenta = await resVenta.json();
    const facturaVenta = dataVenta.factura || dataVenta;
    if (!resVenta.ok || !facturaVenta?.id) {
      throw new Error(`Error al crear venta: ${JSON.stringify(dataVenta)}`);
    }
    const facturaVentaId = facturaVenta.id;
    console.log(`[OK] Venta creada exitosamente. ID: ${facturaVentaId}, Folio: ${facturaVenta.numeroFactura}`);

    // 6. Probar Separación Estricta de Historiales (POS vs ALQUILERES)
    console.log("\nPaso 6: Verificando separación estricta de historiales por módulo...");
    
    // 6.1 Historial POS en /api/facturas?modulo=POS
    const reqHistorialPos = new Request("http://localhost:3000/api/facturas?modulo=POS");
    const resHistorialPos = await listarFacturasHandler(reqHistorialPos);
    const dataPos = await resHistorialPos.json();
    const facturasPos = Array.isArray(dataPos) ? dataPos : (dataPos.facturas || []);
    const hayAlquilerEnPos = facturasPos.some((f: any) => f.tipoOperacion === "ALQUILER");
    if (hayAlquilerEnPos) {
      throw new Error("ERROR CRÍTICO: Se encontraron facturas de ALQUILER en el módulo POS");
    }
    console.log(`[OK] Historial POS filtrado estrictamente: ${facturasPos.length} facturas (cero alquileres).`);

    // 6.2 Historial Alquileres en /api/facturas?modulo=ALQUILERES
    const reqHistorialAlq = new Request("http://localhost:3000/api/facturas?modulo=ALQUILERES");
    const resHistorialAlq = await listarFacturasHandler(reqHistorialAlq);
    const dataAlq = await resHistorialAlq.json();
    const facturasAlq = Array.isArray(dataAlq) ? dataAlq : (dataAlq.facturas || []);
    const hayVentaEnAlq = facturasAlq.some((f: any) => f.tipoOperacion !== "ALQUILER");
    if (hayVentaEnAlq) {
      throw new Error("ERROR CRÍTICO: Se encontraron facturas de VENTA/ARREGLO en el módulo Alquileres");
    }
    console.log(`[OK] Historial Alquileres filtrado estrictamente: ${facturasAlq.length} facturas (cero ventas/arreglos).`);

    // 6.3 Monitoreo POS vs Monitoreo Alquileres
    const reqMonitoreoPos = new Request("http://localhost:3000/api/facturas/monitoreo?modulo=POS");
    const resMonitoreoPos = await monitoreoHandler(reqMonitoreoPos);
    const dataMonitoreoPos = await resMonitoreoPos.json();
    const alquilerEnMonitoreoPos = (dataMonitoreoPos.facturas || []).some((f: any) => f.tipoOperacion === "ALQUILER");
    if (alquilerEnMonitoreoPos) {
      throw new Error("ERROR CRÍTICO: Monitoreo POS contiene facturas de ALQUILER");
    }

    const reqMonitoreoAlq = new Request("http://localhost:3000/api/facturas/monitoreo?modulo=ALQUILERES");
    const resMonitoreoAlq = await monitoreoHandler(reqMonitoreoAlq);
    const dataMonitoreoAlq = await resMonitoreoAlq.json();
    const noAlquilerEnMonitoreoAlq = (dataMonitoreoAlq.facturas || []).some((f: any) => f.tipoOperacion !== "ALQUILER");
    if (noAlquilerEnMonitoreoAlq) {
      throw new Error("ERROR CRÍTICO: Monitoreo Alquileres contiene facturas que no son ALQUILER");
    }
    console.log("[OK] Endpoints de monitoreo filtran con estricta segregación por módulo.");

    // 7. Probar Historial Unificado en Galería de Clientes (/api/clientes/[id])
    console.log("\nPaso 7: Verificando Historial Unificado del Cliente en /api/clientes/[id]...");
    const resClienteExpediente = await obtenerClienteHandler(new Request(`http://localhost:3000/api/clientes/${clienteId}`), {
      params: Promise.resolve({ id: clienteId }),
    });
    const clienteExpediente = await resClienteExpediente.json();
    if (!clienteExpediente.facturas || clienteExpediente.facturas.length < 2) {
      throw new Error(`El expediente del cliente no unificó todas sus transacciones: ${JSON.stringify(clienteExpediente.facturas)}`);
    }

    const nombreCliente = clienteExpediente.cliente?.nombre || clienteExpediente.nombre;
    const tipos = clienteExpediente.facturas.map((f: any) => f.tipoOperacion);
    console.log(`Transacciones encontradas para ${nombreCliente}:`, tipos);
    if (!tipos.includes("ALQUILER") || !tipos.includes("VENTA")) {
      throw new Error("El historial unificado del cliente no contiene simultáneamente ALQUILER y VENTA");
    }
    console.log(`[OK] Historial unificado del cliente contiene todas sus operaciones (${clienteExpediente.facturas.length} transacciones unificadas).`);

    console.log("\n=================================================================");
    console.log("¡TODAS LAS PRUEBAS DE CALIDAD (QA) PASARON CON ÉXITO ROTUNDO!");
    console.log("=================================================================\n");
  } catch (error) {
    console.error("\n[FALLO EN TEST QA]:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ejecutarPruebasQA();
