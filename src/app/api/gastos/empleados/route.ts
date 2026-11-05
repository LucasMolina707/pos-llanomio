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
 * GET /api/gastos/empleados
 * Retorna el catálogo persistente de empleados para nómina y gastos.
 */
export async function GET() {
  try {
    const empleados = await prisma.empleadoGasto.findMany({
      where: { activo: true },
      orderBy: { nombreCompleto: "asc" },
    });

    return NextResponse.json(
      { ok: true, success: true, empleados },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener catálogo de empleados para gastos:", error);
    const mensaje = error instanceof Error ? error.message : "Error al obtener empleados";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/gastos/empleados
 * Agrega un nuevo empleado al directorio persistente de nómina.
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
    const nombreCompleto = String(body.nombreCompleto || body.nombre || "").trim();
    const cargoOperacion = body.cargoOperacion ? String(body.cargoOperacion).trim() : null;
    const telefono = body.telefono ? String(body.telefono).trim() : null;

    if (!nombreCompleto || nombreCompleto.length < 2) {
      return NextResponse.json(
        { ok: false, success: false, error: "El nombre del empleado es obligatorio." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const existente = await prisma.empleadoGasto.findUnique({
      where: { nombreCompleto },
    });

    if (existente) {
      if (!existente.activo) {
        const reactivado = await prisma.empleadoGasto.update({
          where: { id: existente.id },
          data: { activo: true, cargoOperacion: cargoOperacion || existente.cargoOperacion, telefono: telefono || existente.telefono },
        });
        return NextResponse.json(
          { ok: true, success: true, empleado: reactivado, mensaje: "Empleado reactivado con éxito." },
          { headers: NO_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: true, success: true, empleado: existente, mensaje: "El empleado ya se encuentra registrado." },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const nuevoEmpleado = await prisma.empleadoGasto.create({
      data: {
        nombreCompleto,
        cargoOperacion: cargoOperacion || "Operativo / Sastrería",
        telefono,
        activo: true,
      },
    });

    return NextResponse.json(
      { ok: true, success: true, empleado: nuevoEmpleado, mensaje: "Empleado registrado en el directorio persistente." },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al crear empleado para gastos:", error);
    const mensaje = error instanceof Error ? error.message : "Error al registrar empleado";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
