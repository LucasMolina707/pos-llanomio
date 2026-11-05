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

const CATEGORIAS_BASE = [
  { nombre: "Compra a Proveedores", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Gasto Administrativo", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Pago de Nómina", requiereEmpleado: true, esPredeterminada: true },
  { nombre: "Gasto de Empleados", requiereEmpleado: true, esPredeterminada: true },
  { nombre: "Reposición de Bienes del Almacén", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Herramientas", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Insumos de Producción y Sastrería (Cintas, Tizas, Lápices, Hilos, Agujas)", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Arriendo", requiereEmpleado: false, esPredeterminada: true },
  { nombre: "Servicios Públicos (Agua, Luz, Gas, Internet)", requiereEmpleado: false, esPredeterminada: true },
];

/**
 * GET /api/gastos/categorias
 * Retorna el catálogo completo de categorías de gastos.
 * Si la base de datos está vacía, realiza sembrado automático inicial (Auto-Seed)
 * con las 9 categorías base obligatorias.
 */
export async function GET() {
  try {
    let categorias = await prisma.categoriaGasto.findMany({
      where: { activa: true },
      orderBy: [{ esPredeterminada: "desc" }, { nombre: "asc" }],
    });

    // Auto-sembrado si la tabla está vacía o faltan las categorías base
    if (categorias.length === 0) {
      for (const catBase of CATEGORIAS_BASE) {
        await prisma.categoriaGasto.upsert({
          where: { nombre: catBase.nombre },
          update: {},
          create: {
            nombre: catBase.nombre,
            requiereEmpleado: catBase.requiereEmpleado,
            esPredeterminada: catBase.esPredeterminada,
            activa: true,
          },
        });
      }

      categorias = await prisma.categoriaGasto.findMany({
        where: { activa: true },
        orderBy: [{ esPredeterminada: "desc" }, { nombre: "asc" }],
      });
    }

    return NextResponse.json(
      { ok: true, success: true, categorias },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener categorías de gastos:", error);
    const mensaje = error instanceof Error ? error.message : "Error al obtener categorías de gastos";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/gastos/categorias
 * Crea una nueva categoría de gasto persistente en SQLite.
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
    const nombre = String(body.nombre || "").trim();
    const requiereEmpleado = Boolean(body.requiereEmpleado);

    if (!nombre || nombre.length < 2) {
      return NextResponse.json(
        { ok: false, success: false, error: "El nombre de la categoría es obligatorio y debe tener al menos 2 caracteres." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Buscar si ya existe (insensible a mayúsculas o exacto)
    const existente = await prisma.categoriaGasto.findFirst({
      where: {
        nombre: {
          equals: nombre,
        },
      },
    });

    if (existente) {
      if (!existente.activa) {
        // Reactivar si estaba inactiva
        const reactivada = await prisma.categoriaGasto.update({
          where: { id: existente.id },
          data: { activa: true, requiereEmpleado },
        });
        return NextResponse.json(
          { ok: true, success: true, categoria: reactivada, mensaje: "Categoría reactivada con éxito." },
          { headers: NO_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: true, success: true, categoria: existente, mensaje: "La categoría ya existe." },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const nuevaCategoria = await prisma.categoriaGasto.create({
      data: {
        nombre,
        requiereEmpleado,
        esPredeterminada: false,
        activa: true,
      },
    });

    return NextResponse.json(
      { ok: true, success: true, categoria: nuevaCategoria, mensaje: "Categoría guardada permanentemente en la base de datos." },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al crear categoría de gasto:", error);
    const mensaje = error instanceof Error ? error.message : "Error al registrar categoría";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

