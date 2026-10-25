import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/clientes
 * Búsqueda de clientes por documento o nombre
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const where = q
      ? {
          OR: [
            { documento: { contains: q } },
            { nombre: { contains: q } },
            { telefono: { contains: q } },
          ],
        }
      : {};

    const clientes = await prisma.cliente.findMany({
      where,
      take: 20,
      orderBy: { fechaCreacion: "desc" },
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
        direccion: true,
        notas: true,
      },
    });

    return NextResponse.json({ success: true, clientes });
  } catch (error: unknown) {
    console.error("Error al buscar clientes:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar clientes en la base de datos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clientes
 * Creación rápida de cliente desde mostrador
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
