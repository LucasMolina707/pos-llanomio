import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/clientes
 * Carga completa de clientes ordenados por más recientes / frecuentes
 * con soporte de búsqueda multi-campo y filtrado flexible.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const limiteParam = searchParams.get("limite");
    const limite = limiteParam ? parseInt(limiteParam, 10) : undefined;

    let where: Record<string, unknown> = {};

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      if (tokens.length === 1) {
        where = {
          OR: [
            { documento: { contains: tokens[0] } },
            { nombre: { contains: tokens[0] } },
            { telefono: { contains: tokens[0] } },
            { direccion: { contains: tokens[0] } },
            { notas: { contains: tokens[0] } },
          ],
        };
      } else if (tokens.length > 1) {
        where = {
          AND: tokens.map((token) => ({
            OR: [
              { documento: { contains: token } },
              { nombre: { contains: token } },
              { telefono: { contains: token } },
              { direccion: { contains: token } },
              { notas: { contains: token } },
            ],
          })),
        };
      }
    }

    const clientes = await prisma.cliente.findMany({
      where,
      take: limite || undefined,
      orderBy: [
        { updatedAt: "desc" },
        { fechaCreacion: "desc" },
        { nombre: "asc" },
      ],
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
        direccion: true,
        notas: true,
        fechaCreacion: true,
        updatedAt: true,
        _count: {
          select: { facturas: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      clientes,
      total: clientes.length,
    });
  } catch (error: unknown) {
    console.error("Error al consultar clientes:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar clientes en la base de datos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clientes
 * Creación rápida de cliente desde mostrador con retorno de objeto completo
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documento, nombre, telefono, direccion, notas } = body;

    if (!documento || !documento.trim()) {
      return NextResponse.json(
        { success: false, error: "El número de documento es obligatorio" },
        { status: 400 }
      );
    }

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre del cliente es obligatorio" },
        { status: 400 }
      );
    }

    const docSanitizado = documento.trim().toUpperCase();
    const nombreSanitizado = nombre.trim().toUpperCase();
    const telSanitizado = telefono ? telefono.trim().replace(/[^\d+]/g, "") : null;
    const dirSanitizada = direccion ? direccion.trim() : null;
    const notasSanitizadas = notas ? notas.trim() : null;

    // Verificar si ya existe un cliente con ese documento
    const clienteExistente = await prisma.cliente.findUnique({
      where: { documento: docSanitizado },
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
        direccion: true,
        notas: true,
        fechaCreacion: true,
        updatedAt: true,
      },
    });

    if (clienteExistente) {
      return NextResponse.json(
        {
          success: true,
          mensaje: "El cliente ya se encontraba registrado",
          cliente: clienteExistente,
          yaExistia: true,
        },
        { status: 200 }
      );
    }

    const nuevoCliente = await prisma.cliente.create({
      data: {
        documento: docSanitizado,
        nombre: nombreSanitizado,
        telefono: telSanitizado,
        direccion: dirSanitizada,
        notas: notasSanitizadas,
      },
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
        direccion: true,
        notas: true,
        fechaCreacion: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        mensaje: "Cliente registrado exitosamente",
        cliente: nuevoCliente,
        yaExistia: false,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al registrar cliente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al registrar el cliente" },
      { status: 500 }
    );
  }
}
