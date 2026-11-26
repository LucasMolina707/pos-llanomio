import { NextRequest, NextResponse } from "next/server";
import {
  abrirCarpetaEnExplorador,
  ejecutarRespaldoEnCaliente,
  obtenerDirectorioRespaldosDefault,
  obtenerRutaRespaldoActiva,
  restaurarBaseDeDatosDesdeArchivo,
  restaurarBaseDeDatosDesdeBuffer,
  validarYAsegurarDirectorio,
} from "@/lib/backup";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/backup
 * - Con ?info=true o ?metadata=true: Retorna metadatos JSON del estado actual de respaldos para la interfaz administrativa.
 * - Con ?archivo=nombre.db: Descarga un archivo específico del historial al computador cliente.
 * - Con ?abrirCarpeta=true: Abre la carpeta de respaldos en el servidor (Windows Explorer o ruta Linux).
 * - Sin parámetros (o ?descargar=1): Genera un respaldo fresco in situ y descarga el binario .db directamente al computador cliente.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // 1. Abrir carpeta en el servidor bajo demanda
    if (searchParams.get("abrirCarpeta") === "true") {
      const rutaConfigurada = await obtenerRutaRespaldoActiva();
      const resultadoApertura = abrirCarpetaEnExplorador(rutaConfigurada);
      return NextResponse.json(resultadoApertura, { headers: NO_CACHE_HEADERS });
    }

    const soloInfo =
      searchParams.get("info") === "true" ||
      searchParams.get("metadata") === "true";

    const archivoEspecifico = searchParams.get("archivo");

    const carpetaPrincipal = await obtenerRutaRespaldoActiva();
    const carpetaHistorial = path.join(carpetaPrincipal, "historial");
    const carpetaLocal = path.join(process.cwd(), "database", "backups_locales");
    const rutaPorDefecto = obtenerDirectorioRespaldosDefault();
    const validacionAcceso = validarYAsegurarDirectorio(carpetaPrincipal);

    // 2. Si solo se solicita información/metadatos de diagnóstico para la UI
    if (soloInfo) {
      let ultimoRespaldo = null;
      const mapaArchivos = new Map<
        string,
        {
          nombre: string;
          tamanioBytes: number;
          fechaModificacion: Date;
          origen: "EXTERNO" | "LOCAL";
          rutaFisica: string;
        }
      >();

      // Explorar carpeta principal
      if (fs.existsSync(carpetaPrincipal)) {
        try {
          const archivosPrincipal = fs.readdirSync(carpetaPrincipal);
          for (const arch of archivosPrincipal) {
            if (arch.endsWith(".db")) {
              const p = path.join(carpetaPrincipal, arch);
              const stat = fs.statSync(p);
              mapaArchivos.set(arch, {
                nombre: arch,
                tamanioBytes: stat.size,
                fechaModificacion: stat.mtime,
                origen: "EXTERNO",
                rutaFisica: p,
              });
            }
          }
        } catch {}
      }

      // Explorar subcarpeta historial
      if (fs.existsSync(carpetaHistorial)) {
        try {
          const archivosHist = fs.readdirSync(carpetaHistorial);
          for (const arch of archivosHist) {
            if (arch.endsWith(".db") && !mapaArchivos.has(arch)) {
              const p = path.join(carpetaHistorial, arch);
              const stat = fs.statSync(p);
              mapaArchivos.set(arch, {
                nombre: arch,
                tamanioBytes: stat.size,
                fechaModificacion: stat.mtime,
                origen: "EXTERNO",
                rutaFisica: p,
              });
            }
          }
        } catch {}
      }

      // Explorar carpeta local
      if (fs.existsSync(carpetaLocal)) {
        try {
          const archivosLoc = fs.readdirSync(carpetaLocal);
          for (const arch of archivosLoc) {
            if (arch.endsWith(".db") && !mapaArchivos.has(arch)) {
              const p = path.join(carpetaLocal, arch);
              const stat = fs.statSync(p);
              mapaArchivos.set(arch, {
                nombre: arch,
                tamanioBytes: stat.size,
                fechaModificacion: stat.mtime,
                origen: "LOCAL",
                rutaFisica: p,
              });
            }
          }
        } catch {}
      }

      const listaArchivos = Array.from(mapaArchivos.values()).sort(
        (a, b) => b.fechaModificacion.getTime() - a.fechaModificacion.getTime()
      );

      // Determinar el último respaldo
      const candidatoUltimo =
        listaArchivos.find((f) => f.nombre === "pos_ULTIMO.db" || f.nombre === "llanomio_ULTIMO.db") ||
        listaArchivos[0];

      if (candidatoUltimo) {
        ultimoRespaldo = {
          nombre: candidatoUltimo.nombre,
          ruta: candidatoUltimo.rutaFisica,
          tamanioBytes: candidatoUltimo.tamanioBytes,
          fechaModificacion: candidatoUltimo.fechaModificacion,
        };
      }

      // Filtrar historial para mostrar respaldos fechados individuales
      const historialReciente = listaArchivos
        .filter((f) => f.nombre !== "pos_ULTIMO.db" && f.nombre !== "llanomio_ULTIMO.db")
        .slice(0, 15);

      const subcarpetasEstructuradas = [
        "inventario",
        "clientes",
        "historial_facturas",
        "movimientos_caja",
        "gastos_operativos",
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

      return NextResponse.json(
        {
          ok: true,
          rutaCarpetaPrincipal: carpetaPrincipal,
          rutaCarpetaLocal: carpetaLocal,
          rutaPorDefecto,
          esWindows: process.platform === "win32",
          permisosEscritura: validacionAcceso.valido,
          errorRuta: validacionAcceso.error || null,
          subcarpetas: subcarpetasDetectadas,
          ultimoRespaldo,
          historialReciente,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Descarga de archivo específico solicitado del historial
    if (archivoEspecifico) {
      const nombreLimpio = path.basename(archivoEspecifico);
      const posiblesRutas = [
        path.join(carpetaPrincipal, nombreLimpio),
        path.join(carpetaHistorial, nombreLimpio),
        path.join(carpetaLocal, nombreLimpio),
      ];

      let rutaArchivoFisico: string | null = null;
      for (const r of posiblesRutas) {
        if (fs.existsSync(r)) {
          rutaArchivoFisico = r;
          break;
        }
      }

      if (!rutaArchivoFisico) {
        return NextResponse.json(
          { ok: false, error: `El archivo '${nombreLimpio}' no existe en el almacenamiento del servidor.` },
          { status: 404, headers: NO_CACHE_HEADERS }
        );
      }

      const stat = fs.statSync(rutaArchivoFisico);
      const fileBuffer = fs.readFileSync(rutaArchivoFisico);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${nombreLimpio}"`,
          "Content-Length": String(stat.size),
          ...NO_CACHE_HEADERS,
        },
      });
    }

    // 4. EXPORTACIÓN GERENCIAL BAJO DEMANDA: Generar respaldo fresco in situ y devolver binario .db al cliente
    const resultado = await ejecutarRespaldoEnCaliente("GERENCIAL_CLIENTE");

    if (!resultado.success) {
      return NextResponse.json(
        {
          ok: false,
          error: resultado.error || "No se pudo generar la copia de seguridad para descarga.",
        },
        { status: 500, headers: NO_CACHE_HEADERS }
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
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const stat = fs.statSync(rutaArchivoFisico);
    const fileBuffer = fs.readFileSync(rutaArchivoFisico);

    // Formatear nombre claro para la descarga en el equipo cliente
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
        ...NO_CACHE_HEADERS,
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
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/backup
 * - Si recibe FormData o stream binario: Restaura la base de datos previa verificación defensiva de integridad SQLite.
 * - Si recibe JSON con motivo: Genera un respaldo manual bajo demanda en el servidor.
 * - Si recibe JSON con accion === "RESTAURAR_EXISTENTE": Restaura desde un archivo ya ubicado en el servidor.
 * - Si recibe JSON con accion === "VALIDAR_RUTA": Valida si una ruta es escribible.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // CASO 1: Subida de archivo vía FormData desde el computador cliente (Restauración Web)
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
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const arrayBuffer = await archivoEntry.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "El archivo subido está completamente vacío (0 bytes).",
          },
          { status: 400, headers: NO_CACHE_HEADERS }
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
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          mensaje: resultado.mensaje,
          rutaEmergencia: resultado.rutaEmergencia,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // CASO 2: Subida de archivo binario directo (Octet-Stream)
    if (contentType.includes("application/octet-stream")) {
      const arrayBuffer = await req.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { ok: false, error: "El cuerpo binario enviado está vacío." },
          { status: 400, headers: NO_CACHE_HEADERS }
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
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          mensaje: resultado.mensaje,
          rutaEmergencia: resultado.rutaEmergencia,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // CASO 3: Peticiones JSON (respaldo manual, restauración existente o validación de ruta)
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Sin cuerpo JSON
    }

    const accion = String(body.accion || "").toUpperCase();

    // Validar si una ruta de respaldo es válida y escribible
    if (accion === "VALIDAR_RUTA") {
      const ruta = String(body.ruta || "");
      const resVal = validarYAsegurarDirectorio(ruta);
      return NextResponse.json(
        {
          ok: resVal.valido,
          rutaResuelta: resVal.rutaResuelta,
          error: resVal.error || null,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Restaurar desde un archivo existente en el servidor
    if (accion === "RESTAURAR_EXISTENTE") {
      const nombreArchivo = String(body.nombreArchivo || "");
      if (!nombreArchivo) {
        return NextResponse.json(
          { ok: false, error: "Debe especificar el nombre del archivo a restaurar." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      const resultado = await restaurarBaseDeDatosDesdeArchivo(nombreArchivo);
      if (!resultado.ok) {
        return NextResponse.json(
          { ok: false, error: resultado.error, mensaje: resultado.mensaje },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        {
          ok: true,
          mensaje: resultado.mensaje,
          rutaEmergencia: resultado.rutaEmergencia,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Abrir carpeta en servidor
    if (accion === "ABRIR_CARPETA" || body.abrirCarpeta) {
      const rutaConfigurada = await obtenerRutaRespaldoActiva();
      const resultadoApertura = abrirCarpetaEnExplorador(rutaConfigurada);
      return NextResponse.json(resultadoApertura, { headers: NO_CACHE_HEADERS });
    }

    // Generar respaldo manual bajo demanda en el servidor
    const motivo = String(body.motivo || "SOLICITUD_MANUAL");
    const rutaDestinoOpt = body.rutaDestino ? String(body.rutaDestino) : undefined;
    const resultado = await ejecutarRespaldoEnCaliente(motivo, rutaDestinoOpt);

    if (!resultado.success) {
      return NextResponse.json(
        {
          ok: false,
          error: resultado.error,
          mensaje: resultado.mensaje,
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        resultado,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const errorMensaje =
      error instanceof Error ? error.message : "Error desconocido al procesar respaldo/restauración";
    return NextResponse.json(
      {
        ok: false,
        error: errorMensaje,
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
