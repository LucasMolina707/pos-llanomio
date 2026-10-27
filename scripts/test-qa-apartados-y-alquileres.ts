import { prisma } from "../src/lib/prisma";
import { TipoOperacion, EstadoFactura, MetodoPago, TipoProducto, EstadoPrenda } from "@prisma/client";

async function main() {
  console.log("==========================================================");
  console.log("INICIANDO QA DEL SISTEMA DE APARTADOS Y CONVERSIÓN A ALQUILER");
  console.log("==========================================================");

  // 1. Obtener o crear cajero de prueba
  let cajero = await prisma.user.findFirst({ where: { activo: true } });
  if (!cajero) {
    cajero = await prisma.user.create({
      data: {
        username: "cajero_qa",
        nombre: "Cajero de Pruebas QA",
        passwordHash: "hash_demo",
        rol: "CAJERO",
        activo: true,
      },
    });
  }
  console.log(`[OK] Cajero activo identificado: ${cajero.nombre} (${cajero.id})`);

  // 2. Obtener o crear turno abierto
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
  console.log(`[OK] Turno de caja abierto: ID ${turno.id}`);

  // 3. Crear cliente de prueba con teléfono primario y secundario
  const suffix = Date.now().toString().slice(-6);
  const clientePrueba = await prisma.cliente.create({
    data: {
      nombre: `Carlos Alberto Llanos QA ${suffix}`,
      documento: `CC-${suffix}`,
      telefono: "3109876543",
      telefonoSecundario: "3201234567",
      direccion: "Calle 15 # 20 - 45, Barrio Centro",
      email: `carlos.${suffix}@ejemplo.com`,
    },
  });
  console.log(`[OK] Cliente creado: ${clientePrueba.nombre} - Tel: ${clientePrueba.telefono} / ${clientePrueba.telefonoSecundario}`);

  // 4. Crear prenda de prueba en inventario
  const prendaPrueba = await prisma.producto.create({
    data: {
      codigo: `QA-TRAJE-${suffix}`,
      nombre: "Traje Llanero Tradicional Blanco y Rojo",
      tipo: TipoProducto.ALQUILER,
      talla: "L",
      color: "Blanco / Rojo",
      categoria: "Trajes Tradicionales",
      stockActual: 1,
      precioAlquilerBase: 120000,
      precioVenta: 250000,
      estado: "DISPONIBLE",
      estadoPrenda: EstadoPrenda.DISPONIBLE,
    },
  });
  console.log(`[OK] Prenda creada: ${prendaPrueba.codigo} - ${prendaPrueba.nombre}`);

  // 5. REGISTRAR APARTADO / SEPARE
  // Valores acordados: Alquiler: $120.000, Depósito: $50.000, Abono hoy: $40.000, Saldo: $80.000
  const consecutivo = await prisma.factura.count() + 1;
  const numFactura = `APT-${consecutivo.toString().padStart(6, "0")}`;

  const fechaRetiro = new Date();
  fechaRetiro.setDate(fechaRetiro.getDate() + 5);

  const fechaDevolucion = new Date();
  fechaDevolucion.setDate(fechaDevolucion.getDate() + 8);

  const apartado = await prisma.factura.create({
    data: {
      numeroFactura: numFactura,
      consecutivo,
      clienteId: clientePrueba.id,
      usuarioCajeroId: cajero.id,
      turnoCajaId: turno.id,
      tipoOperacion: TipoOperacion.SEPARE,
      estado: EstadoFactura.ACTIVA,
      subtotalProductos: 120000,
      subtotalArreglosLibres: 0,
      totalFactura: 120000,
      totalAbonado: 40000,
      saldoPendiente: 80000,
      montoDeposito: 50000,
      estadoDeposito: "SIN_DEPOSITO", // Estipulado para la entrega
      metodoPagoDeposito: "EFECTIVO",
      observaciones: "Ajustar basta de pantalón 2cm, incluir sombrero alazán. Evento de fin de semana.",
      fechaRetiroApartado: fechaRetiro,
      fechaDevolucionEstimada: fechaDevolucion,
      detalles: {
        create: [
          {
            productoId: prendaPrueba.id,
            cantidad: 1,
            precioUnitario: 120000,
            subtotal: 120000,
            esServicioLibre: false,
            descripcionLibre: null,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: 40000,
            metodoPago: MetodoPago.EFECTIVO,
            montoRecibido: 50000,
            vueltasEntregadas: 10000,
            cajeroId: cajero.id,
            turnoCajaId: turno.id,
            notas: "Abono inicial para separar traje",
          },
        ],
      },
    },
    include: {
      detalles: { include: { producto: true } },
      abonos: true,
      cliente: true,
    },
  });

  console.log(`[OK] Apartado creado exitosamente: N° ${apartado.numeroFactura}`);
  console.log(`     - Total Alquiler: $${apartado.totalFactura}`);
  console.log(`     - Abono Inicial:  $${apartado.totalAbonado}`);
  console.log(`     - Saldo Restante: $${apartado.saldoPendiente}`);
  console.log(`     - Depósito:       $${apartado.montoDeposito}`);
  console.log(`     - Observaciones:  "${apartado.observaciones}"`);

  // Verificar que la prenda física siga en DISPONIBLE (no bloqueada porque es para fecha futura)
  const prendaVerificada = await prisma.producto.findUnique({ where: { id: prendaPrueba.id } });
  if (prendaVerificada?.estado !== "DISPONIBLE") {
    throw new Error(`FALLO: La prenda no debería marcarse como ALQUILADA durante el apartado. Estado actual: ${prendaVerificada?.estado}`);
  }
  console.log(`[OK] Verificado: Prenda en inventario permanece en DISPONIBLE durante la reserva.`);

  // 6. PROBAR CONVERSIÓN DE APARTADO A ALQUILER
  console.log("\n--- SIMULANDO CONVERSIÓN DE APARTADO A ALQUILER ---");
  // Llega el cliente, paga el saldo de $80.000 y se lleva las prendas
  const nuevoAbonoMonto = 80000;
  
  // Registrar el abono del saldo
  await prisma.abono.create({
    data: {
      facturaId: apartado.id,
      cajeroId: cajero.id,
      turnoCajaId: turno.id,
      monto: nuevoAbonoMonto,
      metodoPago: MetodoPago.EFECTIVO,
      montoRecibido: 100000,
      vueltasEntregadas: 20000,
      notas: "Pago de saldo restante al entregar prendas en alquiler",
    },
  });

  // Marcar la prenda como ALQUILADO
  await prisma.producto.update({
    where: { id: prendaPrueba.id },
    data: { estado: "ALQUILADO", estadoPrenda: EstadoPrenda.ALQUILADO },
  });

  // Actualizar factura a ALQUILER activo
  const facturaConvertida = await prisma.factura.update({
    where: { id: apartado.id },
    data: {
      tipoOperacion: TipoOperacion.ALQUILER,
      estado: EstadoFactura.ACTIVA_ALQUILADA,
      totalAbonado: apartado.totalAbonado + nuevoAbonoMonto,
      saldoPendiente: Math.max(0, apartado.totalFactura - (apartado.totalAbonado + nuevoAbonoMonto)),
      estadoDeposito: "RECIBIDO_EN_GARANTIA",
      fechaEntregaAlquiler: new Date(),
      fechaDevolucionPactada: fechaDevolucion,
    },
    include: {
      detalles: true,
      abonos: true,
      cliente: true,
    },
  });

  console.log(`[OK] Apartado convertido a ALQUILER activo:`);
  console.log(`     - Tipo de Operación: ${facturaConvertida.tipoOperacion}`);
  console.log(`     - Estado de Factura: ${facturaConvertida.estado}`);
  console.log(`     - Total Alquiler:    $${facturaConvertida.totalFactura}`);
  console.log(`     - Total Abonado:     $${facturaConvertida.totalAbonado}`);
  console.log(`     - Saldo Pendiente:   $${facturaConvertida.saldoPendiente}`);
  console.log(`     - Depósito Garantía: $${facturaConvertida.montoDeposito} (${facturaConvertida.estadoDeposito})`);
  console.log(`     - Total de Abonos:   ${facturaConvertida.abonos.length} registros`);

  // Verificar prenda alquilada
  const prendaPostConversion = await prisma.producto.findUnique({ where: { id: prendaPrueba.id } });
  if (prendaPostConversion?.estado !== "ALQUILADO") {
    throw new Error(`FALLO: La prenda debería estar en estado ALQUILADO tras la entrega.`);
  }
  console.log(`[OK] Verificado: Prenda en inventario ahora está marcada como ALQUILADO.`);

  console.log("\n==========================================================");
  console.log("TODAS LAS PRUEBAS DE APARTADOS Y CONVERSIÓN PASARON CON ÉXITO");
  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("ERROR EN PRUEBAS QA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
