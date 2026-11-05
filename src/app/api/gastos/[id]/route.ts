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

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/gastos/[id]
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, success: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { id } = await params;
    const gasto = await prisma.gasto.findUnique({
      where: { id },
      include: {
        categoria: true,
      },
    });

    if (!gasto) {
      return NextResponse.json(
        { ok: false, success: false, error: "El gasto solicitado no existe." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true, success: true, gasto },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al obtener gasto:", error);
    const mensaje = error instanceof Error ? error.message : "Error al consultar gasto";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * PUT /api/gastos/[id]
 * Actualiza un gasto existente.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, success: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { id } = await params;
    const gastoExistente = await prisma.gasto.findUnique({
      where: { id },
    });

    if (!gastoExistente) {
      return NextResponse.json(
        { ok: false, success: false, error: "El gasto a actualizar no existe." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const dataUpdate: any = {};

    if (body.categoriaId && body.categoriaId !== gastoExistente.categoriaId) {
      const categoria = await prisma.categoriaGasto.findUnique({
        where: { id: body.categoriaId },
      });
      if (categoria) {
        dataUpdate.categoriaId = categoria.id;
        dataUpdate.categoriaNombre = categoria.nombre;
        dataUpdate.esNomina =
          categoria.nombre === "Pago de Nómina" ||
          categoria.nombre === "Gasto de Empleados" ||
          categoria.requiereEmpleado;
      }
    }

    if (body.valor !== undefined) {
      const valor = Math.round(Number(body.valor) * 100) / 100;
      if (isNaN(valor) || valor <= 0) {
        return NextResponse.json(
          { ok: false, success: false, error: "El monto debe ser un número positivo mayor a cero." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      dataUpdate.valor = valor;
    }

    if (body.descripcion !== undefined) {
      const desc = String(body.descripcion).trim();
      if (!desc) {
        return NextResponse.json(
          { ok: false, success: false, error: "La descripción no puede estar vacía." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      dataUpdate.descripcion = desc;
    }

    if (body.fecha !== undefined) {
      let fecha = new Date();
      if (typeof body.fecha === "string" && body.fecha.includes("-")) {
        const [a, m, d] = body.fecha.split("T")[0].split("-").map(Number);
        fecha = new Date(a, m - 1, d, 12, 0, 0);
      } else {
        const dParsed = new Date(body.fecha);
        if (!isNaN(dParsed.getTime())) {
          fecha = dParsed;
        }
      }
      dataUpdate.fecha = fecha;
    }

    if (body.nombreEmpleado !== undefined) {
      const emp = body.nombreEmpleado ? String(body.nombreEmpleado).trim() : null;
      dataUpdate.nombreEmpleado = emp;
      if (emp) {
        try {
          await prisma.empleadoGasto.upsert({
            where: { nombreCompleto: emp },
            update: { activo: true },
            create: { nombreCompleto: emp, cargoOperacion: "Operativo / Sastrería", activo: true },
          });
        } catch {}
      }
    }

    if (body.modalidadPagoNomina !== undefined) {
      dataUpdate.modalidadPagoNomina = body.modalidadPagoNomina ? String(body.modalidadPagoNomina).trim() : null;
    }

    if (body.observacionNomina !== undefined) {
      dataUpdate.observacionNomina = body.observacionNomina ? String(body.observacionNomina).trim() : null;
    }

    const gastoActualizado = await prisma.gasto.update({
      where: { id },
      data: dataUpdate,
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(
      { ok: true, success: true, gasto: gastoActualizado, mensaje: "Gasto actualizado exitosamente." },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al actualizar gasto:", error);
    const mensaje = error instanceof Error ? error.message : "Error al actualizar gasto";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/gastos/[id]
 * Elimina un gasto del histórico.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const sesion = await obtenerSesionDesdeRequest(req);
    if (!sesion || sesion.rol !== "ADMIN") {
      return NextResponse.json(
        { ok: false, success: false, error: "Acceso denegado: Se requieren permisos de Administrador." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { id } = await params;
    const gastoExistente = await prisma.gasto.findUnique({
      where: { id },
    });

    if (!gastoExistente) {
      return NextResponse.json(
        { ok: false, success: false, error: "El gasto a eliminar no existe." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    await prisma.gasto.delete({
      where: { id },
    });

    return NextResponse.json(
      { ok: true, success: true, mensaje: "Gasto eliminado correctamente del histórico." },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al eliminar gasto:", error);
    const mensaje = error instanceof Error ? error.message : "Error al eliminar gasto";
    return NextResponse.json(
      { ok: false, success: false, error: mensaje },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

