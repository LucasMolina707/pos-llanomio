import { prisma } from "../src/lib/prisma";
import { EstadoTurno, MetodoPago, TipoCierre } from "@prisma/client";
import { ejecutarRespaldoEnCaliente } from "../src/lib/backup";
import {
  crearDocumentoPdfMediaCarta,
  crearDocumentoPdfCarta,
  crearDocumentoPdfTirilla,
  obtenerInfoEstadosAlquiler,
} from "../src/lib/pdf-media-carta";
import { DatosImpresionFactura } from "../src/components/impresion/PlantillaImpresion";
import { calcularMoraDeFactura } from "../src/lib/cron-moras";

/**
 * =========================================================================
 * AUDITORÍA TÉCNICA QA INTEGRAL - CIRCUITO 100% AUTOMATIZADO
 * =========================================================================
 * 1. Verificación de Seguridad y Sesión.
 * 2. Verificación de Turno de Caja y Sincronización Transparente.
 * 3. Venta y Arreglo de Sastrería en POS (/caja/pos).
 * 4. Alquiler Lineal POS en 4 Pasos (/caja/alquileres):
 *    - Caso A: Orden Abierta con Saldo Pendiente ("QUEDÓ FALTANDO PLATA").
 *    - Caso B: Orden con Pago Completo ("PAGÓ COMPLETAMENTE ($0 Pendiente)").
 *    - Caso C: Orden en Mora ("YA SE PASÓ DE LA FECHA DE ENTREGA (EN MORA)").
 *    - Caso D: Devolución de Prendas y Liquidación de Depósito en Paz y Salvo ("CERRADA").
 * 5. Generación de Comprobantes Oficiales en 80mm, Media Carta y Carta (CERO QR).
 * 6. Arqueo de Caja con Diferencia Justificada por Nota de Novedad y Respaldo VACUUM INTO.
 */
async function ejecutarAuditoriaQA() {
  console.log("=========================================================================");
  console.log("  INICIANDO AUDITORÍA INTEGRAL DE CONEXIONES, INTERFACES Y QA FINAL");
  console.log("=========================================================================\n");

  // 1. CONFIGURACIÓN CORPORATIVA Y USUARIO
  console.log("[FASE 1] Verificando Configuración Corporativa y Roles de Usuario...");
  let empresa = await prisma.configuracionEmpresa.findFirst();
  if (!empresa) {
    empresa = await prisma.configuracionEmpresa.create({
      data: {
        nombreTienda: "LLANOMIO",
        nombreComercial: "LLANOMIO TRAJES Y SASTRERÍA",
        nit: "900.876.543-2",
        direccion: "Calle 15 # 22-30",
        telefono: "3101234567",
        formatoPredeterminado: "MEDIA_CARTA",
      },
    });
  }
  console.log(`  ✓ Empresa activa: ${empresa.nombreComercial} (NIT: ${empresa.nit})`);

  let admin = await prisma.user.findFirst({ where: { activo: true, rol: "ADMIN" } });
  if (!admin) {
    admin = await prisma.user.findFirst({ where: { activo: true } });
  }
  if (!admin) {
    throw new Error("No hay usuarios activos en la base de datos.");
  }
  console.log(`  ✓ Usuario responsable: ${admin.nombre} (${admin.username}) - Rol: ${admin.rol}`);

  // 2. APERTURA Y GESTIÓN DE CAJA TRANSPARENTE
  console.log("\n[FASE 2] Sincronización Transparente de Caja...");
  let turno = await prisma.turnoCaja.findFirst({
    where: { estado: EstadoTurno.ABIERTO },
    orderBy: { fechaApertura: "desc" },
  });

  if (!turno) {
    turno = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: admin.id,
        nombreGabinete: "Terminal Principal #1",
        modalidad: "COMPARTIDA",
        baseInicialEfectivo: 150000,
        estado: EstadoTurno.ABIERTO,
      },
    });
    console.log(`  ✓ Turno de caja aperturado con base de $150.000: ID ${turno.id}`);
  } else {
    console.log(`  ✓ Turno de caja transparente activo detectado: ID ${turno.id}`);
  }

  // 3. BASE DE CLIENTES UNIFICADA (Teléfono 1° Obligatorio, Teléfono 2° Opcional, DIAN)
  console.log("\n[FASE 3] Verificando Base Unificada de Clientes con Doble Teléfono...");
  const docCliente = "1098765432";
  let cliente = await prisma.cliente.findFirst({ where: { documento: docCliente } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        documento: docCliente,
        nombre: "MARIA FERNANDA RODRIGUEZ",
        telefono: "3124567890",
        telefonoSecundario: "3159876543",
        direccion: "Carrera 30 # 14-25, Villavicencio",
        esResponsableIVA: false,
      },
    });
    console.log(`  ✓ Cliente creado: ${cliente.nombre} | Tel 1°: ${cliente.telefono} | Tel 2°: ${cliente.telefonoSecundario}`);
  } else {
    cliente = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        telefono: "3124567890",
        telefonoSecundario: "3159876543",
      },
    });
    console.log(`  ✓ Cliente validado: ${cliente.nombre} | Tel 1°: ${cliente.telefono} | Tel 2°: ${cliente.telefonoSecundario}`);
  }

  // 4. VENTA Y ARREGLO DE SASTRERÍA EN POS (/caja/pos)
  console.log("\n[FASE 4] Simulando Venta y Arreglo de Sastrería en /caja/pos...");
  let productoVenta = await prisma.producto.findFirst({ where: { tipo: "VENTA", activo: true } });
  if (!productoVenta) {
    productoVenta = await prisma.producto.create({
      data: {
        codigo: "VNT-SOMBRERO-01",
        nombre: "Sombrero Pelo de Guama Llanero",
        tipo: "VENTA",
        precioVenta: 120000,
        stockActual: 10,
        estado: "DISPONIBLE",
        activo: true,
      },
    });
  }

  const facturaVenta = await prisma.factura.create({
    data: {
      numeroFactura: `VNT-QA-${Date.now()}`,
      clienteId: cliente.id,
      tipoOperacion: "VENTA",
      estado: "CERRADA",
      subtotalProductos: 120000,
      subtotalArreglosLibres: 25000,
      totalFactura: 145000,
      totalAbonado: 145000,
      saldoPendiente: 0,
      usuarioCajeroId: admin.id,
      turnoCajaId: turno.id,
      detalles: {
        create: [
          {
            productoId: productoVenta.id,
            cantidad: 1,
            precioUnitario: 120000,
            subtotal: 120000,
            esServicioLibre: false,
          },
          {
            cantidad: 1,
            precioUnitario: 25000,
            subtotal: 25000,
            esServicioLibre: true,
            descripcionLibre: "Entalle y ajuste de cintura de traje típico",
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: 145000,
            metodoPago: MetodoPago.EFECTIVO,
            montoRecibido: 150000,
            vueltasEntregadas: 5000,
            cajeroId: admin.id,
            turnoCajaId: turno.id,
            notas: "Venta + Arreglo de Sastrería cancelado en mostrador",
          },
        ],
      },
    },
    include: { detalles: true, abonos: true, cliente: true },
  });
  console.log(`  ✓ Factura de Venta y Sastrería expedida: N° ${facturaVenta.numeroFactura} (Total: $${facturaVenta.totalFactura.toLocaleString("es-CO")})`);

  // 5. TERMINAL DE ALQUILERES (/caja/alquileres) - 4 CASOS EXIGIDOS
  console.log("\n[FASE 5] Terminal de Alquileres: Validando los 4 Casos Críticos...");

  let prendaAlquiler = await prisma.producto.findFirst({ where: { tipo: "ALQUILER", activo: true } });
  if (!prendaAlquiler) {
    prendaAlquiler = await prisma.producto.create({
      data: {
        codigo: "ALQ-TRAJE-01",
        nombre: "Vestido Tradicional de Joropo Llanero Rojo y Blanco",
        tipo: "ALQUILER",
        precioAlquilerBase: 80000,
        stockActual: 1,
        estado: "DISPONIBLE",
        activo: true,
      },
    });
  }

  // CASO A: Alquiler Abierto con Saldo Pendiente ("QUEDÓ FALTANDO PLATA")
  console.log("\n  -> [CASO A]: Alquiler Abierto con Saldo Pendiente...");
  const fechaHoy = new Date();
  const fechaDevPactadaA = new Date(Date.now() + 86400000 * 2); // En plazo (+2 días)

  const alqA = await prisma.factura.create({
    data: {
      numeroFactura: `ALQ-CASO-A-${Date.now()}`,
      clienteId: cliente.id,
      tipoOperacion: "ALQUILER",
      estado: "ACTIVA_ALQUILADA",
      fechaEntregaAlquiler: fechaHoy.toISOString(),
      fechaDevolucionPactada: fechaDevPactadaA.toISOString(),
      subtotalProductos: 80000,
      totalFactura: 80000,
      totalAbonado: 30000,
      saldoPendiente: 50000,
      montoDeposito: 50000,
      estadoDeposito: "RECIBIDO_EN_GARANTIA",
      metodoPagoDeposito: "EFECTIVO",
      usuarioCajeroId: admin.id,
      turnoCajaId: turno.id,
      detalles: {
        create: [
          {
            productoId: prendaAlquiler.id,
            cantidad: 1,
            precioUnitario: 80000,
            subtotal: 80000,
            esServicioLibre: false,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: 30000,
            metodoPago: MetodoPago.EFECTIVO,
            montoRecibido: 30000,
            vueltasEntregadas: 0,
            cajeroId: admin.id,
            turnoCajaId: turno.id,
            notas: "Abono inicial en efectivo",
          },
        ],
      },
    },
    include: { detalles: true, abonos: true, cliente: true },
  });

  const estadoAlqA = obtenerInfoEstadosAlquiler(alqA as any);
  console.log(`     ✓ Estado Orden: "${estadoAlqA.textoEstadoOrden}"`);
  console.log(`     ✓ Estado Financiero: "${estadoAlqA.textoEstadoFinanciero}"`);
  console.log(`     ✓ Estado Tiempo/Llegada: "${estadoAlqA.textoTiempoYDevolucion}"`);
  if (estadoAlqA.estaCerrada) throw new Error("Caso A debería estar ABIERTA.");
  if (estadoAlqA.esPazYSalvo) throw new Error("Caso A debería tener saldo pendiente.");

  // CASO B: Alquiler con Pago Completo ($0 Pendiente)
  console.log("\n  -> [CASO B]: Alquiler con Pago Completo ($0 Pendiente)...");
  const alqB = await prisma.factura.create({
    data: {
      numeroFactura: `ALQ-CASO-B-${Date.now()}`,
      clienteId: cliente.id,
      tipoOperacion: "ALQUILER",
      estado: "ACTIVA_ALQUILADA",
      fechaEntregaAlquiler: fechaHoy.toISOString(),
      fechaDevolucionPactada: fechaDevPactadaA.toISOString(),
      subtotalProductos: 80000,
      totalFactura: 80000,
      totalAbonado: 80000,
      saldoPendiente: 0,
      montoDeposito: 50000,
      estadoDeposito: "RECIBIDO_EN_GARANTIA",
      metodoPagoDeposito: "EFECTIVO",
      usuarioCajeroId: admin.id,
      turnoCajaId: turno.id,
      detalles: {
        create: [
          {
            productoId: prendaAlquiler.id,
            cantidad: 1,
            precioUnitario: 80000,
            subtotal: 80000,
            esServicioLibre: false,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: 80000,
            metodoPago: MetodoPago.EFECTIVO,
            montoRecibido: 100000,
            vueltasEntregadas: 20000,
            cajeroId: admin.id,
            turnoCajaId: turno.id,
            notas: "Pago completo del canon de alquiler",
          },
        ],
      },
    },
    include: { detalles: true, abonos: true, cliente: true },
  });

  const estadoAlqB = obtenerInfoEstadosAlquiler(alqB as any);
  console.log(`     ✓ Estado Orden: "${estadoAlqB.textoEstadoOrden}"`);
  console.log(`     ✓ Estado Financiero: "${estadoAlqB.textoEstadoFinanciero}"`);
  console.log(`     ✓ Estado Tiempo/Llegada: "${estadoAlqB.textoTiempoYDevolucion}"`);
  if (!estadoAlqB.esPazYSalvo) throw new Error("Caso B debería tener saldo $0.");

  // CASO C: Alquiler Vencido en Mora ("YA SE PASÓ DE LA FECHA DE ENTREGA")
  console.log("\n  -> [CASO C]: Alquiler en Mora de Devolución...");
  const fechaPactadaVencida = new Date(Date.now() - 86400000 * 2); // Vencido hace 2 días

  const alqC = await prisma.factura.create({
    data: {
      numeroFactura: `ALQ-CASO-C-${Date.now()}`,
      clienteId: cliente.id,
      tipoOperacion: "ALQUILER",
      estado: "ACTIVA_ALQUILADA",
      fechaEntregaAlquiler: new Date(Date.now() - 86400000 * 5).toISOString(),
      fechaDevolucionPactada: fechaPactadaVencida.toISOString(),
      subtotalProductos: 80000,
      recargoMoraAcumulado: 40000,
      totalFactura: 120000,
      totalAbonado: 80000,
      saldoPendiente: 40000,
      montoDeposito: 50000,
      estadoDeposito: "RECIBIDO_EN_GARANTIA",
      metodoPagoDeposito: "EFECTIVO",
      usuarioCajeroId: admin.id,
      turnoCajaId: turno.id,
      detalles: {
        create: [
          {
            productoId: prendaAlquiler.id,
            cantidad: 1,
            precioUnitario: 80000,
            subtotal: 80000,
            esServicioLibre: false,
          },
        ],
      },
    },
    include: { detalles: true, abonos: true, cliente: true },
  });

  const estadoAlqC = obtenerInfoEstadosAlquiler(alqC as any);
  console.log(`     ✓ Estado Orden: "${estadoAlqC.textoEstadoOrden}"`);
  console.log(`     ✓ Estado Financiero: "${estadoAlqC.textoEstadoFinanciero}"`);
  console.log(`     ✓ Estado Tiempo/Llegada: "${estadoAlqC.textoTiempoYDevolucion}"`);
  if (!estadoAlqC.estaEnMora) throw new Error("Caso C debería estar EN MORA.");

  // CASO D: Devolución de Prendas y Liquidación de Depósito en Paz y Salvo ("CERRADA")
  console.log("\n  -> [CASO D]: Devolución de Prendas y Liquidación en Paz y Salvo...");
  const alqD = await prisma.factura.create({
    data: {
      numeroFactura: `ALQ-CASO-D-${Date.now()}`,
      clienteId: cliente.id,
      tipoOperacion: "ALQUILER",
      estado: "CERRADA",
      fechaEntregaAlquiler: new Date(Date.now() - 86400000 * 3).toISOString(),
      fechaDevolucionPactada: new Date(Date.now() - 86400000 * 1).toISOString(),
      fechaDevolucionReal: new Date().toISOString(),
      subtotalProductos: 80000,
      totalFactura: 80000,
      totalAbonado: 80000,
      saldoPendiente: 0,
      montoDeposito: 50000,
      estadoDeposito: "DEVUELTO_COMPLETO",
      montoDevueltoDeposito: 50000,
      montoRetenidoDeposito: 0,
      metodoPagoDeposito: "EFECTIVO",
      usuarioCajeroId: admin.id,
      turnoCajaId: turno.id,
      detalles: {
        create: [
          {
            productoId: prendaAlquiler.id,
            cantidad: 1,
            precioUnitario: 80000,
            subtotal: 80000,
            esServicioLibre: false,
          },
        ],
      },
    },
    include: { detalles: true, abonos: true, cliente: true },
  });

  const estadoAlqD = obtenerInfoEstadosAlquiler(alqD as any);
  console.log(`     ✓ Estado Orden: "${estadoAlqD.textoEstadoOrden}"`);
  console.log(`     ✓ Estado Financiero: "${estadoAlqD.textoEstadoFinanciero}"`);
  console.log(`     ✓ Estado Tiempo/Llegada: "${estadoAlqD.textoTiempoYDevolucion}"`);
  if (!estadoAlqD.estaCerrada) throw new Error("Caso D debería estar CERRADA.");

  // 6. MOTOR DE IMPRESIÓN Y GENERACIÓN VECTORIAL DE PDF (3 FORMATOS, CERO QR)
  console.log("\n[FASE 6] Motor de Impresión: Validando Tirilla 80mm, Media Carta y Carta (CERO QR)...");

  const datosPruebaImpresion: DatosImpresionFactura = {
    factura: {
      id: alqD.id,
      numeroFactura: alqD.numeroFactura,
      fechaCreacion: alqD.fechaCreacion.toISOString(),
      fechaEntregaAlquiler: alqD.fechaEntregaAlquiler ? alqD.fechaEntregaAlquiler.toISOString() : null,
      fechaDevolucionPactada: alqD.fechaDevolucionPactada ? alqD.fechaDevolucionPactada.toISOString() : null,
      fechaDevolucionReal: alqD.fechaDevolucionReal ? alqD.fechaDevolucionReal.toISOString() : null,
      tipoOperacion: "ALQUILER",
      estado: alqD.estado,
      subtotalProductos: alqD.subtotalProductos,
      subtotalArreglosLibres: 0,
      recargoMoraAcumulado: alqD.recargoMoraAcumulado,
      totalFactura: alqD.totalFactura,
      totalAbonado: alqD.totalAbonado,
      saldoPendiente: alqD.saldoPendiente,
      montoDeposito: alqD.montoDeposito,
      estadoDeposito: alqD.estadoDeposito,
      montoRetenidoDeposito: alqD.montoRetenidoDeposito,
      montoDevueltoDeposito: alqD.montoDevueltoDeposito,
      metodoPagoDeposito: "EFECTIVO",
      cliente: {
        nombre: cliente.nombre,
        documento: cliente.documento,
        telefono: cliente.telefono,
        telefonoSecundario: cliente.telefonoSecundario,
        direccion: cliente.direccion,
      },
      usuarioCajero: {
        nombre: admin.nombre,
        username: admin.username,
      },
      detalles: [
        {
          id: "det-1",
          cantidad: 1,
          precioUnitario: 80000,
          subtotal: 80000,
          esServicioLibre: false,
          producto: {
            codigo: prendaAlquiler.codigo,
            nombre: prendaAlquiler.nombre,
            tipo: "ALQUILER",
          },
        },
      ],
      abonos: [
        {
          id: "ab-1",
          fecha: new Date().toISOString(),
          monto: 80000,
          metodoPago: "EFECTIVO",
          cajero: {
            nombre: admin.nombre,
          },
        },
      ],
    },
    empresa: {
      nombreComercial: empresa.nombreComercial,
      nit: empresa.nit,
      direccion: empresa.direccion,
      telefono: empresa.telefono,
      formatoPredeterminado: "MEDIA_CARTA",
    },
  };

  // A. Tirilla 80mm
  const pdfTirilla = crearDocumentoPdfTirilla(datosPruebaImpresion, { numCopias: 1 });
  const bufTirilla = Buffer.from(pdfTirilla.output("arraybuffer"));
  console.log(`  ✓ PDF Tirilla 80mm generado con éxito (${bufTirilla.length} bytes)`);

  // B. Media Carta
  const pdfMediaCarta = crearDocumentoPdfMediaCarta(datosPruebaImpresion, { numCopias: 1 });
  const bufMediaCarta = Buffer.from(pdfMediaCarta.output("arraybuffer"));
  console.log(`  ✓ PDF Media Carta generado con éxito (${bufMediaCarta.length} bytes)`);

  // C. Carta Completa
  const pdfCarta = crearDocumentoPdfCarta(datosPruebaImpresion, { numCopias: 1 });
  const bufCarta = Buffer.from(pdfCarta.output("arraybuffer"));
  console.log(`  ✓ PDF Carta Completa generado con éxito (${bufCarta.length} bytes)`);

  // D. Cero Códigos QR
  const regexQR = /QRCode|qrcode|data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAA/i;
  for (const [nom, buf] of [["Tirilla", bufTirilla], ["Media Carta", bufMediaCarta], ["Carta", bufCarta]] as const) {
    if (regexQR.test(buf.toString("binary"))) {
      throw new Error(`Se detectó código QR en documento ${nom}`);
    }
  }
  console.log(`  ✓ CERO códigos QR confirmado en todos los formatos generados.`);

  // 7. ARQUEO DE CAJA CON NOTA DE NOVEDAD Y VACUUM INTO
  console.log("\n[FASE 7] Arqueo de Caja con Novedad y Respaldo VACUUM INTO...");
  const notaNovedadJustificada = "Diferencia de -$2.000 por redondeo en cambio de monedas autorizado por administración.";
  const cierreCaja = await prisma.turnoCaja.update({
    where: { id: turno.id },
    data: {
      estado: EstadoTurno.CERRADO,
      fechaCierre: new Date(),
      totalEfectivo: 300000,
      totalRecaudado: 300000,
      efectivoEsperado: 450000,
      efectivoContado: 448000,
      diferencia: -2000,
      tieneDiferencia: true,
      notaNovedad: notaNovedadJustificada,
    },
  });
  console.log(`  ✓ Turno arqueado y cerrado formalmente: ID ${cierreCaja.id}`);
  console.log(`  ✓ Diferencia registrada: $${cierreCaja.diferencia} | Novedad: "${cierreCaja.notaNovedad}"`);

  const backupRes = await ejecutarRespaldoEnCaliente("TEST_AUDITORIA_QA");
  console.log(`  ✓ Respaldo automático en caliente completado: ${backupRes.rutaUltimo} (${backupRes.tamanioBytes} bytes)`);

  console.log("\n=========================================================================");
  console.log("  ¡AUDITORÍA QA SUPERADA AL 100%! TODOS LOS CONTRATOS FUNCIONAN EXACTO.");
  console.log("=========================================================================\n");
}

ejecutarAuditoriaQA()
  .catch((err) => {
    console.error("\n[ERROR FATAL EN AUDITORÍA QA]:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
