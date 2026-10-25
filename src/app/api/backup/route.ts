import { NextRequest, NextResponse } from "next/server";
import { ejecutarRespaldoEnCaliente } from "@/lib/backup";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: NextRequest) {
  try {
    let motivo = "SOLICITUD_MANUAL";
    try {
      const body = await req.json();
      if (body?.motivo) motivo = body.motivo;
    } catch {
      // Si no hay body JSON, se usa el motivo por defecto
    }

    const resultado = await ejecutarRespaldoEnCaliente(motivo);

    if (!resultado.success) {
      return NextResponse.json(
        {
          ok: false,
          error: resultado.error,
          mensaje: resultado.mensaje,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      resultado,
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error desconocido en respaldo";
    return NextResponse.json(
      {
        ok: false,
        error: errorMensaje,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const carpetaPrincipal = "C:\\POS_LLANOMIO_BACKUPS";
    const carpetaHistorial = path.join(carpetaPrincipal, "historial");

    let ultimoRespaldo = null;
    let archivosHistorial: { nombre: string; tamanioBytes: number; fechaModificacion: Date }[] = [];

    const rutaUltimo = path.join(carpetaPrincipal, "llanomio_ULTIMO.db");
    if (fs.existsSync(rutaUltimo)) {
      const stat = fs.statSync(rutaUltimo);
      ultimoRespaldo = {
        ruta: rutaUltimo,
        tamanioBytes: stat.size,
        fechaModificacion: stat.mtime,
      };
    }

    if (fs.existsSync(carpetaHistorial)) {
      archivosHistorial = fs
        .readdirSync(carpetaHistorial)
        .filter((f) => f.endsWith(".db"))
        .map((archivo) => {
          const ruta = path.join(carpetaHistorial, archivo);
          const stat = fs.statSync(ruta);
          return {
            nombre: archivo,
            tamanioBytes: stat.size,
            fechaModificacion: stat.mtime,
          };
        })
        .sort((a, b) => b.fechaModificacion.getTime() - a.fechaModificacion.getTime())
        .slice(0, 10);
    }

    return NextResponse.json({
      ok: true,
      ultimoRespaldo,
      historialReciente: archivosHistorial,
    });
  } catch (error: unknown) {
    const errorMensaje = error instanceof Error ? error.message : "Error al consultar estado de respaldos";
    return NextResponse.json(
      {
        ok: false,
        error: errorMensaje,
      },
      { status: 500 }
    );
  }
}
