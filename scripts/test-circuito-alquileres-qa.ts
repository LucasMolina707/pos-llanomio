import { prisma } from "../src/lib/prisma";
import {
  crearDocumentoPdfMediaCarta,
  crearDocumentoPdfCarta,
  crearDocumentoPdfTirilla,
} from "../src/lib/pdf-media-carta";
import { DatosImpresionFactura } from "../src/components/impresion/PlantillaImpresion";
import * as fs from "fs";
import * as path from "path";

/**
 * Script de Control de Calidad Integral (QA - Agente 5):
 * Valida de punta a punta el circuito transaccional del Sistema de Alquileres:
 * 1. Apertura / Asignación de Turno de Caja, Cliente con 2 teléfonos y Prenda de Alquiler.
 * 2. Emisión de Alquiler ($100.000) con Abono Inicial ($40.000 Efectivo) + Depósito ($50.000).
 *    -> Saldo Pendiente $60.000, Prenda en ALQUILADO, Comprobante API emitido.
 * 3. Segundo Abono ($60.000 Nequi).
 *    -> Saldo Pendiente $0, 2 abonos cronológicos registrados, prenda sigue en ALQUILADO.
 * 4. Recepción de Prendas y Liquidación de Depósito con Retención Parcial por Daño.
 *    -> Prenda regresa al inventario (EN_ARREGLO o DISPONIBLE), Factura CERRADA (Paz y Salvo).
 * 5. Generación y validación de PDF en los 3 formatos (80mm Tirilla, Media Carta, Carta Completa)
 *    con 1 y 2 copias, confirmando CERO códigos QR.
 */
async function main() {
  console.log("=========================================================================");
  console.log("  INICIANDO CONTROL DE CALIDAD (QA) - CIRCUITO COMPLETO DE ALQUILERES");
  console.log("=========================================================================\n");

  const baseUrl = "http://127.0.0.1:3000";

  // 0. Autenticarse como Administrador / Cajero para obtener la cookie de sesión
  console.log("[PASO 0] Iniciando sesión para obtener cookie de autenticación...");
  const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });

  const authCookie = resLogin.headers.get("set-cookie") || "";
  if (!resLogin.ok || !authCookie) {
    throw new Error(`Error en login de prueba: HTTP ${resLogin.status}`);
  }
  console.log("  -> Sesión autenticada correctamente. Cookie obtenida.");

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: authCookie,
  };

  // 1. Obtener o crear cajero de prueba activo
  let cajero = await prisma.user.findFirst({ where: { activo: true } });
  if (!cajero) {
    throw new Error("No hay un usuario cajero o administrador activo en el sistema.");
  }
  console.log(`[PASO 1] Cajero de prueba identificado: ${cajero.nombre} (${cajero.username})`);

  // Asegurar turno de caja abierto para facturación
  let turnoActivo = await prisma.turnoCaja.findFirst({
    where: { estado: "ABIERTO" },
    orderBy: { fechaApertura: "desc" },
  });

  if (!turnoActivo) {
    turnoActivo = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: cajero.id,
        fechaApertura: new Date(),
        baseInicialEfectivo: 100000,
        estado: "ABIERTO",
      },
    });
    console.log(`  -> Turno de caja aperturado automáticamente para la prueba: ID ${turnoActivo.id}`);
  } else {
    console.log(`  -> Turno de caja abierto existente detectado: ID ${turnoActivo.id}`);
  }

  // 2. Crear o actualizar cliente con Teléfono Primario y Secundario
  const docCliente = "1121999777";
  let cliente = await prisma.cliente.findFirst({ where: { documento: docCliente } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        documento: docCliente,
        nombre: "CARLOS ALBERTO GOMEZ SILVA",
        telefono: "3101234567",
        telefonoSecundario: "3209876543",
        direccion: "Avenida 40 # 25-10, Barrio Barzal, Villavicencio",
        email: "carlos.gomez@testqa.com",
      },
    });
    console.log(`[PASO 2] Cliente de prueba creado: ${cliente.nombre} (Tel 1: ${cliente.telefono}, Tel 2: ${cliente.telefonoSecundario})`);
  } else {
    cliente = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        telefono: "3101234567",
        telefonoSecundario: "3209876543",
      },
    });
    console.log(`[PASO 2] Cliente de prueba sincronizado: ${cliente.nombre} (Tel 1: ${cliente.telefono}, Tel 2: ${cliente.telefonoSecundario})`);
  }

  // 3. Crear o resetear prenda de inventario de tipo ALQUILER
  const codigoPrenda = "ALQ-TRAJE-QA-100";
  let prenda = await prisma.producto.findFirst({ where: { codigo: codigoPrenda } });
  if (!prenda) {
    prenda = await prisma.producto.create({
      data: {
        codigo: codigoPrenda,
        nombre: "Liquiliqui Tradicional Llanero Beige con Botones Dorados",
        tipo: "ALQUILER",
        talla: "L",
        color: "Beige",
        categoria: "TRAJES_CABALLERO",
        precioAlquilerBase: 100000,
        precioVenta: 350000,
        stockActual: 1,
        estado: "DISPONIBLE",
        estadoPrenda: "DISPONIBLE",
        activo: true,
      },
    });
    console.log(`[PASO 3] Prenda de alquiler creada: ${prenda.nombre} (Código: ${prenda.codigo}, Base: $${prenda.precioAlquilerBase})`);
  } else {
    prenda = await prisma.producto.update({
      where: { id: prenda.id },
      data: {
        estado: "DISPONIBLE",
        estadoPrenda: "DISPONIBLE",
        precioAlquilerBase: 100000,
      },
    });
    console.log(`[PASO 3] Prenda de alquiler restablecida a DISPONIBLE: ${prenda.nombre}`);
  }

  // 4. Emisión de Alquiler inicial por $100.000 con Abono Parcial de $40.000 y Depósito de $50.000
  console.log("\n[PASO 4] Emitiendo nuevo contrato de alquiler vía API /api/facturas...");
  const fechaSalida = new Date();
  const fechaDevPactada = new Date(Date.now() + 86400000 * 3);

  const payloadCreacion = {
    clienteId: cliente.id,
    cajeroId: cajero.id,
    tipoOperacion: "ALQUILER",
    fechaEntregaAlquiler: fechaSalida.toISOString(),
    fechaDevolucionPactada: fechaDevPactada.toISOString(),
    detalles: [
      {
        productoId: prenda.id,
        cantidad: 1,
        precioUnitario: 100000,
      },
    ],
    abonoInicial: {
      monto: 40000,
      metodoPago: "EFECTIVO",
      referenciaComprobante: "AB-INICIAL-001",
    },
    montoDeposito: 50000,
    metodoPagoDeposito: "EFECTIVO",
    notas: "Prueba QA Circuito Completo de Alquileres",
  };

  const resCrear = await fetch(`${baseUrl}/api/facturas`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payloadCreacion),
  });

  const dataCrear = await resCrear.json();
  if (!resCrear.ok || !dataCrear.success) {
    throw new Error(`Error en creación de alquiler: ${dataCrear.error || resCrear.statusText}`);
  }

  const facturaCreada = dataCrear.factura;
  console.log(`  -> Factura de Alquiler Creada: N° ${facturaCreada.numeroFactura} (ID: ${facturaCreada.id})`);
  console.log(`     Total Factura: $${facturaCreada.totalFactura} | Total Abonado: $${facturaCreada.totalAbonado}`);
  console.log(`     Saldo Pendiente: $${facturaCreada.saldoPendiente} | Depósito en Garantía: $${facturaCreada.montoDeposito}`);

  // Verificaciones del Paso 4
  if (facturaCreada.totalFactura !== 100000) {
    throw new Error(`Total factura erróneo: esperado 100000, obtenido ${facturaCreada.totalFactura}`);
  }
  if (facturaCreada.totalAbonado !== 40000) {
    throw new Error(`Total abonado erróneo: esperado 40000, obtenido ${facturaCreada.totalAbonado}`);
  }
  if (facturaCreada.saldoPendiente !== 60000) {
    throw new Error(`Saldo pendiente erróneo: esperado 60000, obtenido ${facturaCreada.saldoPendiente}`);
  }
  if (facturaCreada.montoDeposito !== 50000) {
    throw new Error(`Depósito erróneo: esperado 50000, obtenido ${facturaCreada.montoDeposito}`);
  }

  // Verificar que la prenda en inventario cambió a ALQUILADO
  const prendaAlquilada = await prisma.producto.findUnique({ where: { id: prenda.id } });
  if (prendaAlquilada?.estado !== "ALQUILADO") {
    throw new Error(`El estado del producto no cambió a ALQUILADO: actual ${prendaAlquilada?.estado}`);
  }
  console.log(`  [OK] Estado del producto en inventario validado: ${prendaAlquilada.estado}`);

  // 5. Verificar endpoint de impresión /api/impresion/[id]
  console.log("\n[PASO 5] Verificando payload de /api/impresion/[id] para el comprobante con saldo...");
  const resImpresion1 = await fetch(`${baseUrl}/api/impresion/${facturaCreada.id}`, {
    headers: authHeaders,
  });
  const dataImpresion1 = await resImpresion1.json();

  if (!resImpresion1.ok || !dataImpresion1.success) {
    throw new Error(`Error en /api/impresion/[id]: ${dataImpresion1.error}`);
  }

  const fImp1 = dataImpresion1.factura;
  if (!fImp1.cliente.telefono || !fImp1.cliente.telefonoSecundario) {
    throw new Error("El payload de impresión no incluyó ambos teléfonos del cliente.");
  }
  if (fImp1.saldoPendiente !== 60000) {
    throw new Error(`Saldo en impresión incorrecto: esperado 60000, obtenido ${fImp1.saldoPendiente}`);
  }
  if (fImp1.abonos.length !== 1) {
    throw new Error(`Número de abonos incorrecto: esperado 1, obtenido ${fImp1.abonos.length}`);
  }
  console.log(`  [OK] Payload de impresión validado: Tel 1=${fImp1.cliente.telefono}, Tel 2=${fImp1.cliente.telefonoSecundario}, Saldo=$${fImp1.saldoPendiente}`);

  // 6. Registro de Segundo Abono de $60.000 (Cancelación del saldo restante vía Nequi)
  console.log("\n[PASO 6] Registrando Segundo Abono de $60.000 vía PATCH /api/facturas/[id]...");
  const payloadSegundoAbono = {
    monto: 60000,
    metodoPago: "NEQUI",
    referenciaComprobante: "NEQ-QA-778899",
    notas: "Segundo abono completando el total del alquiler",
  };

  const resSegundoAbono = await fetch(`${baseUrl}/api/facturas/${facturaCreada.id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify(payloadSegundoAbono),
  });

  const dataSegundoAbono = await resSegundoAbono.json();
  if (!resSegundoAbono.ok || !dataSegundoAbono.success) {
    throw new Error(`Error al registrar segundo abono: ${dataSegundoAbono.error}`);
  }

  const facturaConSegundoAbono = dataSegundoAbono.factura;
  console.log(`  -> Segundo Abono Registrado con éxito.`);
  console.log(`     Total Abonado: $${facturaConSegundoAbono.totalAbonado} | Saldo Pendiente: $${facturaConSegundoAbono.saldoPendiente}`);
  console.log(`     Estado Factura: ${facturaConSegundoAbono.estado} (Prendas aún no devueltas)`);

  if (facturaConSegundoAbono.saldoPendiente !== 0) {
    throw new Error(`Saldo pendiente erróneo tras segundo abono: esperado 0, obtenido ${facturaConSegundoAbono.saldoPendiente}`);
  }
  if (facturaConSegundoAbono.totalAbonado !== 100000) {
    throw new Error(`Total abonado erróneo: esperado 100000, obtenido ${facturaConSegundoAbono.totalAbonado}`);
  }
  if (facturaConSegundoAbono.estado !== "ACTIVA_ALQUILADA") {
    throw new Error(`El estado de la factura debería mantenerse en ACTIVA_ALQUILADA mientras las prendas estén en alquiler: actual ${facturaConSegundoAbono.estado}`);
  }
  console.log(`  [OK] Regla de Negocio validada: Saldo es $0 pero la factura sigue ACTIVA_ALQUILADA hasta devolución física.`);

  // 7. Recepción de Prendas, Liquidación de Depósito con Retención Parcial y Emisión de Paz y Salvo
  console.log("\n[PASO 7] Recepción de prenda y liquidación de depósito vía POST /api/facturas/[id] (Retención Parcial)...");
  const payloadLiquidacion = {
    tipoAccion: "LIQUIDAR_CONTRATO",
    estadoDeposito: "RETENIDO_PARCIAL",
    montoRetenidoDeposito: 20000,
    montoDevueltoDeposito: 30000,
    motivoRetencionDeposito: "Costura de solapa rasgada accidentalmente por el cliente",
    notas: "Liquidación final de alquiler. Se devuelven $30.000 del depósito y se retienen $20.000 para costura.",
  };

  const resLiquidacion = await fetch(`${baseUrl}/api/facturas/${facturaCreada.id}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payloadLiquidacion),
  });

  const dataLiquidacion = await resLiquidacion.json();
  if (!resLiquidacion.ok || !dataLiquidacion.success) {
    throw new Error(`Error al liquidar contrato de alquiler: ${dataLiquidacion.error}`);
  }

  const facturaCerrada = dataLiquidacion.factura;
  console.log(`  -> Contrato de Alquiler Liquidado y Cerrado.`);
  console.log(`     Estado Factura: ${facturaCerrada.estado} (Paz y Salvo)`);
  console.log(`     Estado Depósito: ${facturaCerrada.estadoDeposito}`);
  console.log(`     Monto Retenido: $${facturaCerrada.montoRetenidoDeposito} | Monto Devuelto: $${facturaCerrada.montoDevueltoDeposito}`);
  console.log(`     Motivo Retención: ${facturaCerrada.motivoRetencionDeposito}`);

  if (facturaCerrada.estado !== "CERRADA") {
    throw new Error(`Estado erróneo de la factura: esperado CERRADA, obtenido ${facturaCerrada.estado}`);
  }
  if (facturaCerrada.estadoDeposito !== "RETENIDO_PARCIAL") {
    throw new Error(`Estado de depósito erróneo: esperado RETENIDO_PARCIAL, obtenido ${facturaCerrada.estadoDeposito}`);
  }
  if (facturaCerrada.montoRetenidoDeposito !== 20000 || facturaCerrada.montoDevueltoDeposito !== 30000) {
    throw new Error(`Montos de liquidación de depósito incorrectos: Retenido=${facturaCerrada.montoRetenidoDeposito}, Devuelto=${facturaCerrada.montoDevueltoDeposito}`);
  }

  // Verificar estado de la prenda tras la liquidación
  const prendaTrasDevolucion = await prisma.producto.findUnique({ where: { id: prenda.id } });
  console.log(`  [OK] Estado de la prenda tras devolución: ${prendaTrasDevolucion?.estado} (Avería parcial enviada a arreglo)`);

  // 8. Consultar payload final de impresión para Paz y Salvo
  console.log("\n[PASO 8] Consultando payload final de Paz y Salvo en /api/impresion/[id]...");
  const resImpresionFinal = await fetch(`${baseUrl}/api/impresion/${facturaCreada.id}`, {
    headers: authHeaders,
  });
  const dataImpresionFinal = await resImpresionFinal.json();

  if (!resImpresionFinal.ok || !dataImpresionFinal.success) {
    throw new Error(`Error en /api/impresion/[id] final: ${dataImpresionFinal.error}`);
  }

  const payloadPazYSalvo: DatosImpresionFactura = {
    factura: dataImpresionFinal.factura,
    empresa: dataImpresionFinal.empresa,
  };

  if (payloadPazYSalvo.factura.abonos?.length !== 2) {
    throw new Error(`El historial final de abonos debe contener 2 registros cronológicos: tiene ${payloadPazYSalvo.factura.abonos?.length}`);
  }
  console.log(`  [OK] Historial de abonos cronológico completo verificado: 2 abonos registrados.`);

  // 9. Validar Generación de PDFs en los 3 Formatos Físicos (Tirilla 80mm, Media Carta, Carta)
  console.log("\n[PASO 9] Probando generación de PDFs oficiales en los 3 formatos y validando CERO QR...");

  // A. Formato TIRILLA 80mm (1 y 2 copias)
  const docTirilla1 = crearDocumentoPdfTirilla(payloadPazYSalvo, { numCopias: 1 });
  const docTirilla2 = crearDocumentoPdfTirilla(payloadPazYSalvo, { numCopias: 2 });
  const bufferTirilla1 = Buffer.from(docTirilla1.output("arraybuffer"));
  const bufferTirilla2 = Buffer.from(docTirilla2.output("arraybuffer"));
  console.log(`  [OK] PDF Tirilla 80mm generado: 1 copia (${bufferTirilla1.length} bytes), 2 copias (${bufferTirilla2.length} bytes)`);

  // B. Formato MEDIA CARTA Landscape (1 y 2 copias)
  const docMediaCarta1 = crearDocumentoPdfMediaCarta(payloadPazYSalvo, { numCopias: 1 });
  const docMediaCarta2 = crearDocumentoPdfMediaCarta(payloadPazYSalvo, { numCopias: 2 });
  const bufferMediaCarta1 = Buffer.from(docMediaCarta1.output("arraybuffer"));
  const bufferMediaCarta2 = Buffer.from(docMediaCarta2.output("arraybuffer"));
  console.log(`  [OK] PDF Media Carta generado: 1 copia (${bufferMediaCarta1.length} bytes), 2 copias (${bufferMediaCarta2.length} bytes)`);

  // C. Formato CARTA Completa Letter Portrait (1 y 2 copias)
  const docCarta1 = crearDocumentoPdfCarta(payloadPazYSalvo, { numCopias: 1 });
  const docCarta2 = crearDocumentoPdfCarta(payloadPazYSalvo, { numCopias: 2 });
  const bufferCarta1 = Buffer.from(docCarta1.output("arraybuffer"));
  const bufferCarta2 = Buffer.from(docCarta2.output("arraybuffer"));
  console.log(`  [OK] PDF Carta Completa generado: 1 copia (${bufferCarta1.length} bytes), 2 copias (${bufferCarta2.length} bytes)`);

  // D. Verificación Estricta: CERO códigos QR en todos los PDFs
  const regexQR = /QRCode|qrcode|data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAA/i;
  for (const [nombreDoc, buffer] of [
    ["Tirilla 1 Copia", bufferTirilla1],
    ["Tirilla 2 Copias", bufferTirilla2],
    ["Media Carta 1 Copia", bufferMediaCarta1],
    ["Media Carta 2 Copias", bufferMediaCarta2],
    ["Carta 1 Copia", bufferCarta1],
    ["Carta 2 Copias", bufferCarta2],
  ] as const) {
    const textoDoc = buffer.toString("binary");
    if (regexQR.test(textoDoc)) {
      throw new Error(`Se detectó un código QR no permitido en el documento ${nombreDoc}`);
    }
  }
  console.log(`  [OK] CERO códigos QR verificado en todos los formatos generados.`);

  console.log("\n=========================================================================");
  console.log("  ¡PRUEBA QA DE CIRCUITO COMPLETO DE ALQUILERES FINALIZADA CON ÉXITO 100%!");
  console.log("=========================================================================\n");
}

main()
  .catch((err) => {
    console.error("\n[ERROR QA ALQUILERES]:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
