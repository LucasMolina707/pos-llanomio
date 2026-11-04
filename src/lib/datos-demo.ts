import { PrismaClient, TipoProducto, EstadoPrenda, UnidadMora } from "@prisma/client";

/**
 * DATOS DEMO PERMANENTES PARA POS LLANOMIO
 * 
 * Diseñados para pruebas inmediatas de:
 * - 1 Cliente oficial con datos completos y formato DIAN
 * - 2 Productos de ALQUILER (con tarifas de mora, tallas y categorías)
 * - 2 Productos de VENTA (con precios de venta y stock controlado)
 * 
 * Regla de negocio:
 * Estos datos se conservan permanentemente y son idempotentes.
 * Durante cualquier actualización del sistema o sincronización de esquema,
 * se verifican y se mantienen intactos mediante upsert.
 */

export const CLIENTE_DEMO = {
  documento: "1000000001",
  nombre: "Cliente Demo POS",
  telefono: "3101234567",
  telefonoSecundario: "3209876543",
  email: "clientedemo@posllanomio.com",
  direccion: "Avenida Principal Demo # 12-34",
  notas: "Cliente demo permanente para demostración de ventas y alquileres.",
  esResponsableIVA: false,
  tipoIdentificacion: "CC",
  digitoVerificacion: null,
  razonSocial: null,
  responsabilidadFiscal: "R-99-PN",
  municipio: "Villavicencio - Meta",
  codigoDaneMunicipio: "50001",
};

export const PRODUCTOS_DEMO_ALQUILER = [
  {
    codigo: "DEMO-ALQ-01",
    nombre: "Traje Llanero Gala Demo [Alquiler]",
    tipo: TipoProducto.ALQUILER,
    categoria: "Trajes Típicos",
    talla: "M",
    color: "Blanco / Negro",
    stockActual: 3,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 80000,
    precioAlquilerBase: 85000,
    tiempoAlquilerBaseHoras: 24,
    tarifaMora: 15000,
    unidadMora: UnidadMora.DIA,
    tarifaMoraPorDia: 15000,
    tarifaMoraPorHora: 2000,
    activo: true,
  },
  {
    codigo: "DEMO-ALQ-02",
    nombre: "Vestido Quinceañera Demo [Alquiler]",
    tipo: TipoProducto.ALQUILER,
    categoria: "Vestidos de Fiesta",
    talla: "S",
    color: "Azul Rey",
    stockActual: 2,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 110000,
    precioAlquilerBase: 120000,
    tiempoAlquilerBaseHoras: 48,
    tarifaMora: 20000,
    unidadMora: UnidadMora.DIA,
    tarifaMoraPorDia: 20000,
    tarifaMoraPorHora: 3000,
    activo: true,
  },
];

export const PRODUCTOS_DEMO_VENTA = [
  {
    codigo: "DEMO-VTA-01",
    nombre: "Camisa Llanera Tradicional Demo [Venta]",
    tipo: TipoProducto.VENTA,
    categoria: "Prendas de Venta",
    talla: "L",
    color: "Blanca",
    stockActual: 10,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 45000,
    precioVenta: 65000,
    activo: true,
  },
  {
    codigo: "DEMO-VTA-02",
    nombre: "Sombrero Peloeguama Demo [Venta]",
    tipo: TipoProducto.VENTA,
    categoria: "Accesorios y Sombreros",
    talla: "Única",
    color: "Café",
    stockActual: 15,
    estado: EstadoPrenda.DISPONIBLE,
    estadoPrenda: EstadoPrenda.DISPONIBLE,
    precioBase: 30000,
    precioVenta: 45000,
    activo: true,
  },
];

/**
 * Garantiza de forma idempotente que el cliente demo y los 4 productos demo
 * existan y estén activos en la base de datos sin duplicarse.
 */
export async function sembrarDatosDemoPermanentes(prismaClient: PrismaClient) {
  // 1. Cliente Demo
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

  // 2. Productos Demo de Alquiler (2 ítems)
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

  // 3. Productos Demo de Venta (2 ítems)
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

