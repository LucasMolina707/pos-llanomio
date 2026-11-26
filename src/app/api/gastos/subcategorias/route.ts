import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { obtenerSesionDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/gastos/subcategorias
 * Lista las subcategorías persistentes de una categoría específica (ej. JOHANA)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get("categoriaId");
    const categoriaNombre = searchParams.get("categoriaNombre");

    const where: any = { activa: true };

    if (categoriaId) {
      where.categoriaId = categoriaId;
    } else if (categoriaNombre) {
      const cat = await prisma.categoriaGasto.findFirst({
        where: {
          nombre: {
            equals: categoriaNombre,
          },
        },
      });
      if (cat) {
        where.categoriaId = cat.id;
      }
    }

    const subcategorias = await prisma.subcategoriaGasto.findMany({
      where,
      orderBy: { nombre: "asc" },
      include: {
        categoria: {
          select: { id: true, nombre: true },
        },
      },
    });

    return NextResponse.json(
      { ok: true, success: true, subcategorias },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener subcategorías:", error);
    const mensaje = error instanceof Error ? error.message : "Error al consultar subcategorías";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/gastos/subcategorias
 * Guarda una nueva subcategoría persistente en SQLite vinculada a una categoría.
 */
export async function POST(req: NextRequest) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, success: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    let categoriaId = String(body.categoriaId || "").trim();
    const categoriaNombre = String(body.categoriaNombre || "").trim();
    const nombre = String(body.nombre || "").trim();

    if (!nombre || nombre.length < 2) {
      return NextResponse.json(
        { ok: false, success: false, error: "El nombre de la subcategoría es obligatorio (mínimo 2 caracteres)." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Si no viene categoriaId pero sí categoriaNombre (ej. JOHANA), buscar su ID
    if (!categoriaId && categoriaNombre) {
      const cat = await prisma.categoriaGasto.findFirst({
        where: {
          OR: [
            { nombre: categoriaNombre },
            { nombre: "YOHANNA" },
            { nombre: "JOHANA" },
            { nombre: "YOANA" },
          ],
        },
      });
      if (cat) categoriaId = cat.id;
    }

    if (!categoriaId) {
      return NextResponse.json(
        { ok: false, success: false, error: "Se requiere identificar la categoría de gasto padre." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const subcategoria = await prisma.subcategoriaGasto.upsert({
      where: {
        categoriaId_nombre: {
          categoriaId,
          nombre,
        },
      },
      update: { activa: true },
      create: {
        categoriaId,
        nombre,
        activa: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        success: true,
        subcategoria,
        mensaje: "Subcategoría guardada exitosamente en la base de datos.",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al registrar subcategoría:", error);
    const mensaje = error instanceof Error ? error.message : "Error al guardar subcategoría";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
