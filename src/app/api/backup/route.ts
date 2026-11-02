import { NextRequest, NextResponse } from "next/server";
import {
  abrirCarpetaEnExplorador,
  ejecutarRespaldoEnCaliente,
  restaurarBaseDeDatosDesdeBuffer,
} from "@/lib/backup";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/backup
 * - Sin parámetros (o ?descargar=1): Genera un respaldo fresco in situ y descarga el binario .db con cabeceras de adjunto.
 * - Con ?info=true o ?metadata=true: Retorna metadatos JSON del estado actual de respaldos para la interfaz administrativa.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Abrir carpeta en el Explorador de Windows bajo demanda
    if (searchParams.get("abrirCarpeta") === "true") {
      const resultadoApertura = abrirCarpetaEnExplorador();
      return NextResponse.json(resultadoApertura);
    }

    const soloInfo =
      searchParams.get("info") === "true" ||
      searchParams.get("metadata") === "true";

    const carpetaPrincipal = "C:\\POS_BACKUPS";
    const carpetaHistorial = path.join(carpetaPrincipal, "historial");
    const carpetaLocal = path.join(process.cwd(), "database", "backups_locales");

    // Si solo se solicita información/metadatos de diagnóstico para la UI
    if (soloInfo) {
      let ultimoRespaldo = null;
      let archivosHistorial: {
        nombre: string;
        tamanioBytes: number;
        fechaModificacion: Date;
      }[] = [];

      const rutaUltimo = path.join(carpetaPrincipal, "pos_ULTIMO.db");
      if (fs.existsSync(rutaUltimo)) {
        const stat = fs.statSync(rutaUltimo);
        ultimoRespaldo = {
          ruta: rutaUltimo,
          tamanioBytes: stat.size,
          fechaModificacion: stat.mtime,
        };
      } else if (fs.existsSync(carpetaLocal)) {
        // Fallback a la carpeta local si C:\ no existe o no tiene el archivo
        const archivosLocales = fs
          .readdirSync(carpetaLocal)
          .filter((f) => f.endsWith(".db"))
          .map((f) => {
            const p = path.join(carpetaLocal, f);
            return { ruta: p, stat: fs.statSync(p) };
          })
          .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

        if (archivosLocales.length > 0) {
          ultimoRespaldo = {
            ruta: archivosLocales[0].ruta,
            tamanioBytes: archivosLocales[0].stat.size,
            fechaModificacion: archivosLocales[0].stat.mtime,
          };
        }
      }

      const dirHistorial = fs.existsSync(carpetaHistorial)
        ? carpetaHistorial
        : carpetaLocal;

      if (fs.existsSync(dirHistorial)) {
        archivosHistorial = fs
          .readdirSync(dirHistorial)
          .filter((f) => f.endsWith(".db") && f !== "pos_ULTIMO.db")
          .map((archivo) => {
            const ruta = path.join(dirHistorial, archivo);
            const stat = fs.statSync(ruta);
            return {
              nombre: archivo,
              tamanioBytes: stat.size,
              fechaModificacion: stat.mtime,
            };
          })
          .sort(
            (a, b) =>
              b.fechaModificacion.getTime() - a.fechaModificacion.getTime()
          )
          .slice(0, 10);
      }

      const subcarpetasEstructuradas = [
        "inventario",
        "clientes",
        "historial_facturas",
        "movimientos_caja",
      ];
      const subcarpetasDetectadas: { nombre: string; ruta: string; cantidadArchivos: number }[] = [];
      const dirBaseSubcarpetas = fs.existsSync(carpetaPrincipal) ? carpetaPrincipal : carpetaLocal;
      for (const sub of subcarpetasEstructuradas) {
        const rutaSub = path.join(dirBaseSubcarpetas, sub);
        if (fs.existsSync(rutaSub)) {
          try {
            const archivos = fs.readdirSync(rutaSub);
            subcarpetasDetectadas.push({
              nombre: sub,
              ruta: rutaSub,
              cantidadArchivos: archivos.length,
            });
          } catch {}
        }
      }

      return NextResponse.json({
        ok: true,
        rutaCarpetaPrincipal: carpetaPrincipal,
        rutaCarpetaLocal: carpetaLocal,
        subcarpetas: subcarpetasDetectadas,
        ultimoRespaldo,
        historialReciente: archivosHistorial,
      });
    }

    // =========================================================================
    // EXPORTACIÓN GERENCIAL: Generar respaldo fresco in situ y devolver binario .db
    // =========================================================================
    const resultado = await ejecutarRespaldoEnCaliente("GERENCIAL");

    if (!resultado.success) {
      return NextResponse.json(
        {
          ok: false,
          error: resultado.error || "No se pudo generar la copia de seguridad para descarga.",
        },
        { status: 500 }
      );
    }

    // Determinar la ruta física del archivo generado
    let rutaArchivoFisico = resultado.rutaLocal;
    if (!fs.existsSync(rutaArchivoFisico) && fs.existsSync(resultado.rutaUltimo)) {
      rutaArchivoFisico = resultado.rutaUltimo;
    }

    if (!fs.existsSync(rutaArchivoFisico)) {
      return NextResponse.json(
        { ok: false, error: "El archivo de respaldo generado no fue localizado en disco." },
        { status: 500 }
      );
    }

    const stat = fs.statSync(rutaArchivoFisico);
    const fileBuffer = fs.readFileSync(rutaArchivoFisico);

    // Formatear fecha para el archivo descargado: Respaldo_Sistema_YYYY-MM-DD_HH-mm-ss.db
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const horas = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");
    const segundos = String(ahora.getSeconds()).padStart(2, "0");
    const nombreDescarga = `Respaldo_Sistema_${anio}-${mes}-${dia}_${horas}-${minutos}-${segundos}.db`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nombreDescarga}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error: unknown) {
    const errorMensaje =
      error instanceof Error ? error.message : "Error al procesar descarga de respaldo";
    return NextResponse.json(
      {
        ok: false,
        error: errorMensaje,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup
 * - Si recibe FormData o stream binario: Restaura la base de datos previa verificación defensiva de integridad SQLite.
 * - Si recibe JSON con motivo: Genera un respaldo manual bajo demanda.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // CASO 1: Subida de archivo vía FormData (Restauración Web)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const archivoEntry =
        formData.get("archivo") || formData.get("file") || formData.get("respaldo");

      if (!archivoEntry || !(archivoEntry instanceof Blob)) {
        return NextResponse.json(
          {
            ok: false,
            error: "No se proporcionó ningún archivo de base de datos válido (.db) en la solicitud.",
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await archivoEntry.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "El archivo subido está completamente vacío (0 bytes).",
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(arrayBuffer);
      const resultado = await restaurarBaseDeDatosDesdeBuffer(buffer);

      if (!resultado.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: resultado.error,
            mensaje: resultado.mensaje,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        mensaje: resultado.mensaje,
        rutaEmergencia: resultado.rutaEmergencia,
      });
    }

    // CASO 2: Subida de archivo binario directo (Octet-Stream para scripts o herramientas)
    if (contentType.includes("application/octet-stream")) {
      const arrayBuffer = await req.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { ok: false, error: "El cuerpo binario enviado está vacío." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(arrayBuffer);
      const resultado = await restaurarBaseDeDatosDesdeBuffer(buffer);

      if (!resultado.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: resultado.error,
            mensaje: resultado.mensaje,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        mensaje: resultado.mensaje,
        rutaEmergencia: resultado.rutaEmergencia,
      });
    }

    // CASO 3: Petición JSON (respaldo manual o apertura de carpeta en Windows)
    let motivo = "SOLICITUD_MANUAL";
    let accion = "";
    try {
      const body = await req.json();
      if (body?.accion) accion = String(body.accion).toUpperCase();
      if (body?.abrirCarpeta) accion = "ABRIR_CARPETA";
      if (body?.motivo) motivo = String(body.motivo);
    } catch {
      // Sin cuerpo JSON
    }

    if (accion === "ABRIR_CARPETA") {
      const resultadoApertura = abrirCarpetaEnExplorador();
      return NextResponse.json(resultadoApertura);
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
    const errorMensaje =
      error instanceof Error ? error.message : "Error desconocido al procesar respaldo/restauración";
    return NextResponse.json(
      {
        ok: false,
        error: errorMensaje,
      },
      { status: 500 }
    );
  }
}
