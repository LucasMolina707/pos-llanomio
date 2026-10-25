import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TipoProducto, EstadoPrenda, UnidadMora } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const estado = searchParams.get("estado");
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase();
    const categoria = searchParams.get("categoria")?.trim();

    // Filtros de Prisma
    const where: Record<string, unknown> = {};

    if (tipo && tipo !== "TODOS") {
      where.tipo = tipo as TipoProducto;
    }

    if (estado && estado !== "TODOS") {
      where.estado = estado as EstadoPrenda;
    }

    if (categoria && categoria !== "TODAS") {
      where.categoria = categoria;
    }

    if (busqueda) {
      where.OR = [
        { codigo: { contains: busqueda } },
        { nombre: { contains: busqueda } },
        { talla: { contains: busqueda } },
        { color: { contains: busqueda } },
        { categoria: { contains: busqueda } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { codigo: "asc" }],
      include: {
        _count: {
          select: { itemsFactura: true },
        },
      },
    });

    // Estadísticas generales para el dashboard
    const todos = await prisma.producto.findMany({
      select: { tipo: true, estado: true },
    });

    const resumen = {
      total: todos.length,
      alquileres: todos.filter((p) => p.tipo === "ALQUILER").length,
      ventas: todos.filter((p) => p.tipo === "VENTA").length,
      disponibles: todos.filter((p) => p.estado === "DISPONIBLE").length,
      alquilados: todos.filter((p) => p.estado === "ALQUILADO").length,
      separados: todos.filter((p) => p.estado === "SEPARADO").length,
      enArreglo: todos.filter((p) => p.estado === "EN_ARREGLO").length,
      inactivos: todos.filter((p) => p.estado === "INACTIVO").length,
    };

    return NextResponse.json({
      ok: true,
      productos,
      resumen,
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error al obtener inventario";
    return NextResponse.json({ ok: false, error: errorMensaje }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      codigo,
      nombre,
      tipo = "ALQUILER",
      categoria = "General",
      talla,
      color,
      stockActual = 1,
      estado = "DISPONIBLE",
      precioBase = 0,
      tarifaMora = 0,
      unidadMora = "DIA",
    } = body;

    // Validaciones obligatorias
    if (!codigo || !String(codigo).trim()) {
      return NextResponse.json(
        { ok: false, error: "El código de referencia es obligatorio." },
        { status: 400 }
      );
    }

    if (!nombre || !String(nombre).trim()) {
      return NextResponse.json(
        { ok: false, error: "El nombre o descripción de la prenda es obligatorio." },
        { status: 400 }
      );
    }

    const codigoLimpio = String(codigo).trim().toUpperCase();

    // Validar unicidad del código
    const existente = await prisma.producto.findUnique({
      where: { codigo: codigoLimpio },
    });

    if (existente) {
      return NextResponse.json(
        { ok: false, error: `Ya existe un producto registrado con el código '${codigoLimpio}'.` },
        { status: 400 }
      );
    }

    const precioBaseNum = Math.max(0, parseFloat(precioBase) || 0);
    const tarifaMoraNum = Math.max(0, parseFloat(tarifaMora) || 0);
    const stockNum = Math.max(0, parseInt(stockActual, 10) || 1);

    // Si es Alquiler, validar tarifa y unidad de mora obligatorias
    if (tipo === "ALQUILER") {
      if (isNaN(tarifaMoraNum)) {
        return NextResponse.json(
          { ok: false, error: "Para prendas en alquiler debe definir una tarifa de mora válida." },
          { status: 400 }
        );
      }
      if (!["DIA", "HORA"].includes(unidadMora)) {
        return NextResponse.json(
          { ok: false, error: "La unidad de mora debe ser 'DIA' o 'HORA'." },
          { status: 400 }
        );
      }
    }

    // Campos de compatibilidad histórica
    const esAlquiler = tipo === "ALQUILER";
    const precioVenta = esAlquiler ? 0 : precioBaseNum;
    const precioAlquilerBase = esAlquiler ? precioBaseNum : 0;
    const tarifaMoraPorDia = esAlquiler && unidadMora === "DIA" ? tarifaMoraNum : 0;
    const tarifaMoraPorHora = esAlquiler && unidadMora === "HORA" ? tarifaMoraNum : 0;

    const nuevoProducto = await prisma.producto.create({
      data: {
        codigo: codigoLimpio,
        nombre: String(nombre).trim(),
        tipo: tipo as TipoProducto,
        categoria: String(categoria).trim() || "General",
        talla: talla ? String(talla).trim() : null,
        color: color ? String(color).trim() : null,
        stockActual: stockNum,
        estado: estado as EstadoPrenda,
        estadoPrenda: estado as EstadoPrenda,
        precioBase: precioBaseNum,
        precioVenta,
        precioAlquilerBase,
        tiempoAlquilerBaseHoras: 24,
        tarifaMora: tarifaMoraNum,
        unidadMora: unidadMora as UnidadMora,
        tarifaMoraPorDia,
        tarifaMoraPorHora,
        activo: estado !== "INACTIVO",
      },
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Prenda registrada exitosamente en el catálogo.",
      producto: nuevoProducto,
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error al crear producto";
    return NextResponse.json({ ok: false, error: errorMensaje }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      codigo,
      nombre,
      tipo = "ALQUILER",
      categoria = "General",
      talla,
      color,
      stockActual,
      estado,
      precioBase,
      tarifaMora,
      unidadMora,
    } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "El ID del producto es obligatorio para actualizar." },
        { status: 400 }
      );
    }

    const productoExistente = await prisma.producto.findUnique({
      where: { id },
    });

    if (!productoExistente) {
      return NextResponse.json(
        { ok: false, error: "El producto especificado no fue encontrado." },
        { status: 404 }
      );
    }

    const codigoLimpio = codigo ? String(codigo).trim().toUpperCase() : productoExistente.codigo;

    // Si cambió el código, validar que no esté en uso por otro registro
    if (codigoLimpio !== productoExistente.codigo) {
      const codigoEnUso = await prisma.producto.findUnique({
        where: { codigo: codigoLimpio },
      });
      if (codigoEnUso) {
        return NextResponse.json(
          { ok: false, error: `El código '${codigoLimpio}' ya pertenece a otro producto.` },
          { status: 400 }
        );
      }
    }

    const precioBaseNum =
      precioBase !== undefined ? Math.max(0, parseFloat(precioBase) || 0) : productoExistente.precioBase;
    const tarifaMoraNum =
      tarifaMora !== undefined ? Math.max(0, parseFloat(tarifaMora) || 0) : productoExistente.tarifaMora;
    const stockNum =
      stockActual !== undefined
        ? Math.max(0, parseInt(stockActual, 10) || 0)
        : productoExistente.stockActual;

    const tipoFinal = (tipo || productoExistente.tipo) as TipoProducto;
    const estadoFinal = (estado || productoExistente.estado) as EstadoPrenda;
    const unidadFinal = (unidadMora || productoExistente.unidadMora) as UnidadMora;

    const esAlquiler = tipoFinal === "ALQUILER";
    const precioVenta = esAlquiler ? 0 : precioBaseNum;
    const precioAlquilerBase = esAlquiler ? precioBaseNum : 0;
    const tarifaMoraPorDia = esAlquiler && unidadFinal === "DIA" ? tarifaMoraNum : 0;
    const tarifaMoraPorHora = esAlquiler && unidadFinal === "HORA" ? tarifaMoraNum : 0;

    const productoActualizado = await prisma.producto.update({
      where: { id },
      data: {
        codigo: codigoLimpio,
        nombre: nombre ? String(nombre).trim() : productoExistente.nombre,
        tipo: tipoFinal,
        categoria: categoria !== undefined ? String(categoria).trim() : productoExistente.categoria,
        talla: talla !== undefined ? (talla ? String(talla).trim() : null) : productoExistente.talla,
        color: color !== undefined ? (color ? String(color).trim() : null) : productoExistente.color,
        stockActual: stockNum,
        estado: estadoFinal,
        estadoPrenda: estadoFinal,
        precioBase: precioBaseNum,
        precioVenta,
        precioAlquilerBase,
        tarifaMora: tarifaMoraNum,
        unidadMora: unidadFinal,
        tarifaMoraPorDia,
        tarifaMoraPorHora,
        activo: estadoFinal !== "INACTIVO",
      },
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Prenda actualizada correctamente.",
      producto: productoActualizado,
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error al actualizar producto";
    return NextResponse.json({ ok: false, error: errorMensaje }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // Sin body JSON
      }
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "El ID del producto es obligatorio para eliminar." },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        itemsFactura: {
          include: {
            factura: true,
          },
        },
      },
    });

    if (!producto) {
      return NextResponse.json(
        { ok: false, error: "El producto no existe." },
        { status: 404 }
      );
    }

    // Regla de Negocio Crítica:
    // Evita la eliminación de productos que tengan facturas activas o en proceso asociadas,
    // permitiendo en su lugar cambiar su estado a INACTIVO.
    const facturasActivas = producto.itemsFactura.filter(
      (item) => item.factura && ["EN_PROCESO", "ACTIVA_ALQUILADA", "EN_MORA"].includes(item.factura.estado)
    );

    if (facturasActivas.length > 0) {
      // Cambiar automáticamente a INACTIVO
      await prisma.producto.update({
        where: { id },
        data: {
          estado: EstadoPrenda.INACTIVO,
          estadoPrenda: EstadoPrenda.INACTIVO,
          activo: false,
        },
      });

      return NextResponse.json(
        {
          ok: false,
          bloqueado: true,
          mensaje: `No se puede eliminar la prenda porque está vinculada a ${facturasActivas.length} factura(s) activa(s) o en alquiler. Ha sido marcada automáticamente como 'INACTIVO' para proteger el historial fiscal.`,
        },
        { status: 409 }
      );
    }

    // Si tiene facturas históricas cerradas, aplicar baja lógica (INACTIVO)
    if (producto.itemsFactura.length > 0) {
      await prisma.producto.update({
        where: { id },
        data: {
          estado: EstadoPrenda.INACTIVO,
          estadoPrenda: EstadoPrenda.INACTIVO,
          activo: false,
        },
      });

      return NextResponse.json({
        ok: true,
        mensaje: "La prenda cuenta con transacciones históricas cerradas. Fue desactivada (estado INACTIVO) para mantener la integridad contable.",
      });
    }

    // Si no tiene ninguna factura asociada, eliminación física segura
    await prisma.producto.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Prenda eliminada correctamente del inventario.",
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error al eliminar producto";
    return NextResponse.json({ ok: false, error: errorMensaje }, { status: 500 });
  }
}
