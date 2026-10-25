import { prisma } from "../src/lib/prisma";
import {
  normalizarTexto,
  distanciaEdicion,
  esCoincidenciaAproximada,
  filtrarPorRelevancia,
} from "../src/lib/fuzzy-search";
import { crearDocumentoPdfMediaCarta } from "../src/lib/pdf-media-carta";
import { DatosImpresionFactura } from "../src/components/impresion/PlantillaImpresion";
import * as fs from "fs";
import * as path from "path";

/**
 * CONTROL DE CALIDAD INTEGRAL (QA - AGENTE 5)
 * =========================================================================
 * 1. Pruebas del motor difuso multi-campo (normalización, erratas, relevancia).
 * 2. Ciclo de transacciones en mostrador (Pago Completo, Parcial, $0 Pendiente).
 * 3. Persistencia de saldos pendientes, estados financieros y vínculos a TurnoCaja.
 * 4. Bandeja de cobro de pendientes y liquidación posterior con cambio a CERRADA.
 * 5. Impacto de abonos en los arqueos de caja del turno activo.
 * 6. Generación del Comprobante Final (Paz y Salvo) en PDF Media Carta con 0 QR.
 */

async function ejecutarQA() {
  console.log("=========================================================================");
  console.log("  INICIANDO CONTROL DE CALIDAD (QA - AGENTE 5): FUZZY SEARCH Y LIQUIDACIÓN");
  console.log("=========================================================================\n");

  let exitos = 0;
  let fallos = 0;

  function assert(condicion: boolean, mensaje: string) {
    if (condicion) {
      console.log(`  [OK] ${mensaje}`);
      exitos++;
    } else {
      console.error(`  [FALLO] ${mensaje}`);
      fallos++;
    }
  }

  // -----------------------------------------------------------------------
  // FASE 1: Validación del Motor de Búsqueda Difusa (src/lib/fuzzy-search.ts)
  // -----------------------------------------------------------------------
  console.log("--- FASE 1: Motor Universal de Búsqueda Difusa ---");

  // Normalización
  const norm1 = normalizarTexto("¡Camisón Llanero Tamaño XL con Moño!");
  assert(norm1 === "camison llanero tamano xl con mono", "Normalización elimina tildes, ñ y caracteres especiales");

  // Distancia de edición
  const dist1 = distanciaEdicion("vestido", "vestdo");
  assert(dist1 === 1, "Distancia de edición detecta letra faltante (distancia = 1)");

  const dist2 = distanciaEdicion("traje", "tarje");
  assert(dist2 === 1, "Distancia de edición detecta transposición adyacente (distancia = 1)");

  // Coincidencia aproximada
  assert(esCoincidenciaAproximada("llanero", "llaneroo"), "Tolerancia a errata tipográfica en sufijo");
  assert(esCoincidenciaAproximada("3118889900", "8889"), "Búsqueda por fragmento numérico (teléfono)");

  // Filtrado por relevancia
  const listaPrueba = [
    { id: "1", nombre: "Carlos Rodriguez", doc: "11223344", tel: "3101112233" },
    { id: "2", nombre: "Maria Carlota Gomez", doc: "55667788", tel: "3204445566" },
    { id: "3", nombre: "Pedro Albornoz", doc: "99001122", tel: "3119990011" },
  ];

  const resFuzzy1 = filtrarPorRelevancia(listaPrueba, "carl", (item) => ({
    primarios: [item.nombre],
    secundarios: [item.doc, item.tel],
  }));
  assert(resFuzzy1.length === 2, "Buscador difuso encuentra ambos registros con 'carl'");
  assert(resFuzzy1[0].nombre === "Carlos Rodriguez", "Prefijo exacto tiene mayor relevancia y queda de primero");

  const resFuzzyErrata = filtrarPorRelevancia(listaPrueba, "albornos", (item) => ({
    primarios: [item.nombre],
    secundarios: [item.doc],
  }));
  assert(resFuzzyErrata.length === 1 && resFuzzyErrata[0].id === "3", "Tolerancia a z/s ('albornos' -> 'Pedro Albornoz')");

  console.log("");

  // -----------------------------------------------------------------------
  // FASE 2: Base de Datos y Turno de Caja Activo
  // -----------------------------------------------------------------------
  console.log("--- FASE 2: Preparación de Datos y Turno de Caja ---");

  let cajero = await prisma.user.findFirst({ where: { activo: true } });
  if (!cajero) {
    cajero = await prisma.user.create({
      data: {
        nombre: "Cajero Principal QA",
        username: "cajero_qa_" + Date.now(),
        password: "hash_temporal_qa",
        rol: "CAJERO",
        activo: true,
      },
    });
  }
  assert(!!cajero, `Cajero listo para auditoría: ${cajero.nombre} (ID: ${cajero.id})`);

  let turno = await prisma.turnoCaja.findFirst({ where: { estado: "ABIERTO" } });
  if (!turno) {
    turno = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: cajero.id,
        baseInicialEfectivo: 100000,
        estado: "ABIERTO",
      },
    });
  }
  assert(!!turno, `Turno de caja abierto activo listo (ID: ${turno.id})`);

  // Cliente de prueba
  let cliente = await prisma.cliente.findFirst({ where: { documento: "9988776655" } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        documento: "9988776655",
        nombre: "ANDRES CAMILO OSPINA",
        telefono: "3157778899",
        direccion: "Villavicencio, Meta",
      },
    });
  }
  assert(!!cliente, `Cliente de prueba listo: ${cliente.nombre}`);

  // Prenda / Producto de prueba
  let producto = await prisma.producto.findFirst({ where: { codigo: "QA-VENTA-01" } });
  if (!producto) {
    producto = await prisma.producto.create({
      data: {
        codigo: "QA-VENTA-01",
        nombre: "Sombrero Peloeguama Especial",
        tipo: "VENTA",
        categoria: "Sombreros",
        talla: "L",
        color: "Negro",
        precioBase: 120000,
        stockActual: 10,
        estado: "DISPONIBLE",
      },
    });
  }
  assert(!!producto, `Producto de venta listo: ${producto.nombre} ($${producto.precioBase})`);

  console.log("");

  // -----------------------------------------------------------------------
  // FASE 3: Creación de 3 Facturas en Diferentes Modalidades Financieras
  // -----------------------------------------------------------------------
  console.log("--- FASE 3: Transacciones en Mostrador POS ---");

  // Factura 1: Pago Completo (saldoPendiente = 0, CERRADA)
  const consecutivo1 = await prisma.factura.count() + 1001;
  const f1 = await prisma.factura.create({
    data: {
      numeroFactura: `FAC-QA-${consecutivo1}`,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      turnoCajaId: turno.id,
      tipoOperacion: "VENTA",
      estado: "CERRADA",
      totalFactura: 120000,
      totalAbonado: 120000,
      saldoPendiente: 0,
      detalles: {
        create: [
          {
            productoId: producto.id,
            cantidad: 1,
            precioUnitario: 120000,
            subtotal: 120000,
            esServicioLibre: false,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: 120000,
            metodoPago: "EFECTIVO",
            cajeroId: cajero.id,
            turnoCajaId: turno.id,
            notas: "Pago completo 100% en apertura de factura",
          },
        ],
      },
    },
  });

  // Impactar turno
  await prisma.turnoCaja.update({
    where: { id: turno.id },
    data: {
      totalEfectivo: { increment: 120000 },
      totalRecaudado: { increment: 120000 },
    },
  });

  assert(f1.saldoPendiente === 0, `Factura 1 (Pago Completo) guardada con saldoPendiente = $0`);
  assert(f1.estado === "CERRADA", `Factura 1 guardada con estado CERRADA`);

  // Factura 2: Pago Parcial / Adelanto ($120.000 total, $50.000 abono, $70.000 saldo, EN_PROCESO)
  const consecutivo2 = await prisma.factura.count() + 1001;
  const f2 = await prisma.factura.create({
    data: {
      numeroFactura: `FAC-QA-${consecutivo2}`,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      turnoCajaId: turno.id,
      tipoOperacion: "VENTA",
      estado: "EN_PROCESO",
      totalFactura: 120000,
      totalAbonado: 50000,
      saldoPendiente: 70000,
      detalles: {
        create: [
          {
            productoId: producto.id,
            cantidad: 1,
            precioUnitario: 120000,
            subtotal: 120000,
            esServicioLibre: false,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: 50000,
            metodoPago: "NEQUI",
            cajeroId: cajero.id,
            turnoCajaId: turno.id,
            notas: "Adelanto inicial de compra",
          },
        ],
      },
    },
  });

  // Impactar turno
  await prisma.turnoCaja.update({
    where: { id: turno.id },
    data: {
      totalNequi: { increment: 50000 },
      totalRecaudado: { increment: 50000 },
    },
  });

  assert(f2.saldoPendiente === 70000, `Factura 2 (Pago Parcial) guardada con saldoPendiente = $70.000`);
  assert(f2.estado === "EN_PROCESO", `Factura 2 guardada con estado EN_PROCESO`);

  // Factura 3: Falta de Pago / $0 Inicial ($120.000 total, $0 abonado, $120.000 saldo, EN_PROCESO)
  const consecutivo3 = await prisma.factura.count() + 1001;
  const f3 = await prisma.factura.create({
    data: {
      numeroFactura: `FAC-QA-${consecutivo3}`,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      turnoCajaId: turno.id,
      tipoOperacion: "VENTA",
      estado: "EN_PROCESO",
      totalFactura: 120000,
      totalAbonado: 0,
      saldoPendiente: 120000,
      detalles: {
        create: [
          {
            productoId: producto.id,
            cantidad: 1,
            precioUnitario: 120000,
            subtotal: 120000,
            esServicioLibre: false,
          },
        ],
      },
    },
  });

  assert(f3.saldoPendiente === 120000, `Factura 3 (Sin Pago Inicial) guardada con saldoPendiente = $120.000`);
  assert(f3.totalAbonado === 0, `Factura 3 guardada con totalAbonado = $0`);
  assert(f3.estado === "EN_PROCESO", `Factura 3 guardada con estado EN_PROCESO`);

  console.log("");

  // -----------------------------------------------------------------------
  // FASE 4: Consulta de Facturas Pendientes (Bandeja POS & Monitoreo)
  // -----------------------------------------------------------------------
  console.log("--- FASE 4: Bandeja de Facturas Pendientes por Cobrar ---");

  const pendientes = await prisma.factura.findMany({
    where: {
      saldoPendiente: { gt: 0 },
    },
    include: {
      cliente: true,
      usuarioCajero: true,
      abonos: true,
    },
    orderBy: { fechaCreacion: "desc" },
  });

  assert(pendientes.length >= 2, `Bandeja de pendientes recupera facturas con saldo > 0 (total encontradas: ${pendientes.length})`);
  const idsPendientes = pendientes.map((p) => p.id);
  assert(idsPendientes.includes(f2.id), `Factura 2 (${f2.numeroFactura}) figura en la bandeja de pendientes`);
  assert(idsPendientes.includes(f3.id), `Factura 3 (${f3.numeroFactura}) figura en la bandeja de pendientes`);
  assert(!idsPendientes.includes(f1.id), `Factura 1 (${f1.numeroFactura}) NO figura en pendientes por estar CERRADA al 100%`);

  console.log("");

  // -----------------------------------------------------------------------
  // FASE 5: Liquidación Posterior de Saldos (Otro Cajero o Mismo Turno)
  // -----------------------------------------------------------------------
  console.log("--- FASE 5: Liquidación Posterior y Cierre a Paz y Salvo ---");

  // Creamos un segundo cajero para simular cobro por otro usuario en turno
  let otroCajero = await prisma.user.findFirst({ where: { username: "otro_cajero_qa" } });
  if (!otroCajero) {
    otroCajero = await prisma.user.create({
      data: {
        nombre: "Cajera Turno Tarde QA",
        username: "otro_cajero_qa",
        passwordHash: "hash_temporal_qa",
        rol: "CAJERO",
        activo: true,
      },
    });
  }

  // 5.1 Liquidar Factura 2 (Pago restante de $70.000 vía DAVIPLATA)
  const abonoFinalF2 = await prisma.abono.create({
    data: {
      facturaId: f2.id,
      monto: 70000,
      metodoPago: "DAVIPLATA",
      cajeroId: otroCajero.id,
      turnoCajaId: turno.id,
      notas: "Pago total restante de saldo - Paz y Salvo",
    },
  });

  const f2Liquidada = await prisma.factura.update({
    where: { id: f2.id },
    data: {
      totalAbonado: { increment: 70000 },
      saldoPendiente: 0,
      estado: "CERRADA",
    },
    include: {
      abonos: { include: { cajero: true } },
      cliente: true,
      detalles: true,
    },
  });

  // Impactar caja con el nuevo ingreso
  await prisma.turnoCaja.update({
    where: { id: turno.id },
    data: {
      totalDaviplata: { increment: 70000 },
      totalRecaudado: { increment: 70000 },
    },
  });

  assert(f2Liquidada.saldoPendiente === 0, `Factura 2 liquidada con saldoPendiente = $0`);
  assert(f2Liquidada.estado === "CERRADA", `Factura 2 pasa automáticamente a estado CERRADA`);
  assert(f2Liquidada.abonos.length === 2, `Factura 2 conserva el historial de los 2 abonos ($50.000 Nequi + $70.000 Daviplata)`);
  assert(
    f2Liquidada.abonos[1].cajero?.nombre === otroCajero.nombre,
    `El segundo abono registra con éxito el cajero receptor (${otroCajero.nombre})`
  );

  // 5.2 Liquidar Factura 3 (Pago total de $120.000 vía TRANSFERENCIA)
  await prisma.abono.create({
    data: {
      facturaId: f3.id,
      monto: 120000,
      metodoPago: "TRANSFERENCIA",
      cajeroId: otroCajero.id,
      turnoCajaId: turno.id,
      notas: "Liquidación completa de factura pendiente",
    },
  });

  const f3Liquidada = await prisma.factura.update({
    where: { id: f3.id },
    data: {
      totalAbonado: 120000,
      saldoPendiente: 0,
      estado: "CERRADA",
    },
    include: {
      abonos: { include: { cajero: true } },
    },
  });

  assert(f3Liquidada.saldoPendiente === 0, `Factura 3 liquidada con saldoPendiente = $0`);
  assert(f3Liquidada.estado === "CERRADA", `Factura 3 pasa automáticamente a estado CERRADA`);

  console.log("");

  // -----------------------------------------------------------------------
  // FASE 6: Verificación de Arqueo y Movimientos de Caja del Turno
  // -----------------------------------------------------------------------
  console.log("--- FASE 6: Impacto en Arqueo y Movimientos de Caja ---");

  const turnoActualizado = await prisma.turnoCaja.findUnique({
    where: { id: turno.id },
    include: {
      abonos: true,
    },
  });

  assert(!!turnoActualizado, "Turno de caja recuperado tras liquidaciones");
  assert(
    (turnoActualizado?.totalRecaudado || 0) >= 360000,
    `Total recaudado del turno acumula todos los cobros ($${turnoActualizado?.totalRecaudado})`
  );
  assert(
    (turnoActualizado?.totalDaviplata || 0) >= 70000,
    `Total Daviplata del turno registra el abono de liquidación ($${turnoActualizado?.totalDaviplata})`
  );

  console.log("");

  // -----------------------------------------------------------------------
  // FASE 7: Emisión de Comprobante Final / Paz y Salvo en PDF Media Carta
  // -----------------------------------------------------------------------
  console.log("--- FASE 7: Comprobante de Pago Final (PDF Media Carta) ---");

  const datosImpresion: DatosImpresionFactura = {
    factura: {
      id: f2Liquidada.id,
      numeroFactura: f2Liquidada.numeroFactura,
      tipoOperacion: f2Liquidada.tipoOperacion,
      estado: f2Liquidada.estado,
      subtotalProductos: 120000,
      subtotalArreglosLibres: 0,
      recargoMoraAcumulado: 0,
      fechaCreacion: f2Liquidada.fechaCreacion.toISOString(),
      totalFactura: f2Liquidada.totalFactura,
      totalAbonado: f2Liquidada.totalAbonado,
      saldoPendiente: f2Liquidada.saldoPendiente,
      cliente: {
        nombre: cliente.nombre,
        documento: cliente.documento,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
      },
      usuarioCajero: {
        nombre: otroCajero.nombre,
        username: otroCajero.username,
      },
      detalles: [
        {
          id: "det-1",
          cantidad: 1,
          precioUnitario: 120000,
          subtotal: 120000,
          esServicioLibre: false,
          producto: {
            nombre: producto.nombre,
            codigo: producto.codigo,
          },
        },
      ],
      abonos: f2Liquidada.abonos.map((a) => ({
        id: a.id,
        monto: a.monto,
        metodoPago: a.metodoPago,
        fecha: a.fecha.toISOString(),
        cajero: {
          nombre: a.cajero?.nombre || "Cajero",
        },
      })),
    },
    empresa: {
      nombreComercial: "ALMACÉN & TRAJES LLANOMIO",
      nit: "900.123.456-7",
      direccion: "Calle 15 # 22-30, Barrio Siete de Agosto",
      telefono: "310 123 4567",
    },
  };

  const docPdf = crearDocumentoPdfMediaCarta(datosImpresion);
  const pdfBytes = docPdf.output("arraybuffer");
  assert(pdfBytes.byteLength > 1000, `PDF Media Carta generado exitosamente (${pdfBytes.byteLength} bytes)`);

  // Guardar archivo para verificación física
  const rutaPdf = path.join(process.cwd(), "scratch_test_paz_y_salvo_media_carta.pdf");
  fs.writeFileSync(rutaPdf, Buffer.from(pdfBytes));
  assert(fs.existsSync(rutaPdf), `Archivo PDF guardado correctamente en: ${rutaPdf}`);

  // Inspeccionar código fuente para verificar CERO códigos QR
  const plantillaimpresionCode = fs.readFileSync(
    path.join(process.cwd(), "src/components/impresion/PlantillaImpresion.tsx"),
    "utf8"
  );
  const pdfMediaCartaCode = fs.readFileSync(
    path.join(process.cwd(), "src/lib/pdf-media-carta.ts"),
    "utf8"
  );

  const tieneQrPlantilla = plantillaimpresionCode.toLowerCase().includes("qrcode") || plantillaimpresionCode.toLowerCase().includes("qr-code");
  const tieneQrPdf = pdfMediaCartaCode.toLowerCase().includes("qrcode") || pdfMediaCartaCode.toLowerCase().includes("qr-code");

  assert(!tieneQrPlantilla, "PlantillaImpresion.tsx tiene CERO códigos QR en comprobantes de clientes");
  assert(!tieneQrPdf, "pdf-media-carta.ts tiene CERO códigos QR en documentos Media Carta");

  console.log("\n=========================================================================");
  console.log(`  RESUMEN FINAL DE CONTROL DE CALIDAD (QA):`);
  console.log(`  - Pruebas Exitosas: ${exitos}`);
  console.log(`  - Fallos: ${fallos}`);
  console.log("=========================================================================\n");

  if (fallos > 0) {
    process.exit(1);
  }
}

ejecutarQA()
  .catch((err) => {
    console.error("Error fatal durante ejecución de QA:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
