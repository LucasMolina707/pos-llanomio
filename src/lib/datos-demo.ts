import { PrismaClient, TipoProducto, EstadoPrenda, UnidadMora } from "@prisma/client";

/**
 * DATOS DEMO PERMANENTES PARA AURORA POS (EDICIÓN VITRINA)
 *
 * Diseñados para demostraciones comerciales limpias:
 * - Clientes demostrativos con soporte DIAN y cartera
 * - Productos de ALQUILER neutros (gala y etiqueta)
 * - Productos de VENTA neutros (ejecutivos y accesorios)
 */

export const CLIENTE_DEMO = {
  documento: "1020456789",
  nombre: "Carlos Andrés Gómez",
  telefono: "3104567890",
  telefonoSecundario: "3209876543",
  email: "carlos.gomez@aurorapos.com",
  direccion: "Calle 85 # 15-24 Oficina 302",
  notas: "Cliente demostrativo de Aurora POS para pruebas de ventas y alquileres.",
  esResponsableIVA: false,
  tipoIdentificacion: "CC",
  digitoVerificacion: null,
  razonSocial: null,
  responsabilidadFiscal: "R-99-PN",
  municipio: "Bogotá D.C.",
  codigoDaneMunicipio: "11001",
};

export const PRODUCTOS_DEMO_ALQUILER = [
  {
    codigo: "ALQ-001",
    nombre: "Smoking Clásico de Gala Completo",
    tipo: TipoProducto.ALQUILER,
    categoria: "Trajes de Gala",
    talla: "L",
    color: "Negro",
    stockActual: 4,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 140000,
    precioAlquilerBase: 160000,
    tiempoAlquilerBaseHoras: 48,
    tarifaMora: 20000,
    unidadMora: UnidadMora.DIA,
    tarifaMoraPorDia: 20000,
    tarifaMoraPorHora: 3000,
    activo: true,
  },
  {
    codigo: "ALQ-002",
    nombre: "Vestido Largo de Noche Corte Imperial",
    tipo: TipoProducto.ALQUILER,
    categoria: "Vestidos de Fiesta",
    talla: "S",
    color: "Azul Rey",
    stockActual: 3,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 160000,
    precioAlquilerBase: 185000,
    tiempoAlquilerBaseHoras: 48,
    tarifaMora: 25000,
    unidadMora: UnidadMora.DIA,
    tarifaMoraPorDia: 25000,
    tarifaMoraPorHora: 3500,
    activo: true,
  },
];

export const PRODUCTOS_DEMO_VENTA = [
  {
    codigo: "VTA-001",
    nombre: "Camisa Oxford Ejecutiva Slim Fit",
    tipo: TipoProducto.VENTA,
    categoria: "Camisería Ejecutiva",
    talla: "M",
    color: "Blanca",
    stockActual: 15,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 55000,
    precioVenta: 89000,
    activo: true,
  },
  {
    codigo: "VTA-002",
    nombre: "Cinturón en Cuero Genuino Doble Faz",
    tipo: TipoProducto.VENTA,
    categoria: "Accesorios",
    talla: "Única",
    color: "Negro / Café",
    stockActual: 20,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 38000,
    precioVenta: 65000,
    activo: true,
  },
];

export async function sembrarDatosDemoPermanentes(prismaClient: PrismaClient) {
  const cliente = await prismaClient.cliente.upsert({
    where: { documento: CLIENTE_DEMO.documento },
    update: {
      nombre: CLIENTE_DEMO.nombre,
      telefono: CLIENTE_DEMO.telefono,
      telefonoSecundario: CLIENTE_DEMO.telefonoSecundario,
      email: CLIENTE_DEMO.email,
      direccion: CLIENTE_DEMO.direccion,
      notas: CLIENTE_DEMO.notas,
      tipoIdentificacion: CLIENTE_DEMO.tipoIdentificacion,
      responsabilidadFiscal: CLIENTE_DEMO.responsabilidadFiscal,
    },
    create: CLIENTE_DEMO,
  });

  const prodsAlquilerCreados = [];
  for (const prod of PRODUCTOS_DEMO_ALQUILER) {
    const p = await prismaClient.producto.upsert({
      where: { codigo: prod.codigo },
      update: {
        nombre: prod.nombre,
        tipo: prod.tipo,
        categoria: prod.categoria,
        talla: prod.talla,
        color: prod.color,
        precioBase: prod.precioBase,
        precioAlquilerBase: prod.precioAlquilerBase,
        tiempoAlquilerBaseHoras: prod.tiempoAlquilerBaseHoras,
        tarifaMora: prod.tarifaMora,
        unidadMora: prod.unidadMora,
        tarifaMoraPorDia: prod.tarifaMoraPorDia,
        tarifaMoraPorHora: prod.tarifaMoraPorHora,
        activo: true,
      },
      create: prod,
    });
    prodsAlquilerCreados.push(p);
  }

  const prodsVentaCreados = [];
  for (const prod of PRODUCTOS_DEMO_VENTA) {
    const p = await prismaClient.producto.upsert({
      where: { codigo: prod.codigo },
      update: {
        nombre: prod.nombre,
        tipo: prod.tipo,
        categoria: prod.categoria,
        talla: prod.talla,
        color: prod.color,
        precioBase: prod.precioBase,
        precioVenta: prod.precioVenta,
        activo: true,
      },
      create: prod,
    });
    prodsVentaCreados.push(p);
  }

  return {
    cliente,
    alquiler: prodsAlquilerCreados,
    venta: prodsVentaCreados,
  };
}
