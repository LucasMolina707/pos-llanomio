import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface ParcheInfo {
  nombre: string;
  ruta: string;
  tamanioBytes: number;
  tamanioFormateado: string;
  fechaModificacion: string;
}

interface SalvaguardaInfo {
  nombre: string;
  tamanioBytes: number;
  fechaModificacion: string;
}

function formatearBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * GET /api/sistema/actualizar
 * Consulta la versión actual del sistema, parches disponibles en la carpeta local y salvaguardas previas.
 */
export async function GET() {
  try {
    const projectRoot = process.cwd();
    const rutaPackage = path.join(projectRoot, "package.json");
    let version = "1.0.0";
    let nombre = "pos-llanomio";

    if (fs.existsSync(rutaPackage)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(rutaPackage, "utf-8"));
        version = pkg.version || "1.0.0";
        nombre = pkg.name || "pos-llanomio";
      } catch {
        // Fallback silencioso
      }
    }

    // Listar parches .zip en carpeta actualizaciones/
    const dirActualizaciones = path.join(projectRoot, "actualizaciones");
    const parchesDisponibles: ParcheInfo[] = [];

    if (fs.existsSync(dirActualizaciones)) {
      const archivos = fs.readdirSync(dirActualizaciones);
      for (const archivo of archivos) {
        if (archivo.toLowerCase().endsWith(".zip")) {
          const rutaCompleta = path.join(dirActualizaciones, archivo);
          try {
            const stat = fs.statSync(rutaCompleta);
            parchesDisponibles.push({
              nombre: archivo,
              ruta: rutaCompleta,
              tamanioBytes: stat.size,
              tamanioFormateado: formatearBytes(stat.size),
              fechaModificacion: stat.mtime.toISOString(),
            });
          } catch {
            // Ignorar archivos no accesibles
          }
        }
      }
    }

    // Ordenar de más reciente a más antiguo
    parchesDisponibles.sort((a, b) => (a.fechaModificacion < b.fechaModificacion ? 1 : -1));

    // Consultar salvaguardas en C:\POS_BACKUPS\salvaguarda_pre_actualizacion
    const dirSalvaguarda = path.join(process.env.SystemDrive || "C:", "POS_BACKUPS", "salvaguarda_pre_actualizacion");
    const salvaguardasPrevias: SalvaguardaInfo[] = [];

    if (fs.existsSync(dirSalvaguarda)) {
      const archivosSalvaguarda = fs.readdirSync(dirSalvaguarda);
      for (const archivo of archivosSalvaguarda) {
        const rutaCompleta = path.join(dirSalvaguarda, archivo);
        try {
          const stat = fs.statSync(rutaCompleta);
          salvaguardasPrevias.push({
            nombre: archivo,
            tamanioBytes: stat.size,
            fechaModificacion: stat.mtime.toISOString(),
          });
        } catch {
          // Ignorar
        }
      }
    }

    salvaguardasPrevias.sort((a, b) => (a.fechaModificacion < b.fechaModificacion ? 1 : -1));

    return NextResponse.json({
      ok: true,
      sistema: {
        nombre,
        version,
        carpetaRaiz: projectRoot,
      },
      parchesDisponibles,
      salvaguardasPrevias,
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error al obtener información de actualizaciones";
    return NextResponse.json(
      { ok: false, error: mensaje },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sistema/actualizar
 * Procesa la subida de un parche .ZIP o la ejecución de una actualización con preservación estricta de datos.
 */
export async function POST(req: NextRequest) {
  try {
    const projectRoot = process.cwd();
    const dirActualizaciones = path.join(projectRoot, "actualizaciones");

    if (!fs.existsSync(dirActualizaciones)) {
      fs.mkdirSync(dirActualizaciones, { recursive: true });
    }

    const contentType = req.headers.get("content-type") || "";

    let rutaZipFinal: string | null = null;
    let modoGithub = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const archivo = formData.get("parche") as File | null;
      const accion = formData.get("accion") as string | null;

      if (accion === "github") {
        modoGithub = true;
      } else if (archivo && archivo.name) {
        if (!archivo.name.toLowerCase().endsWith(".zip")) {
          return NextResponse.json(
            { ok: false, error: "El archivo debe ser un paquete comprimido en formato .ZIP." },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await archivo.arrayBuffer());
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\..+/, "")
          .replace("T", "_");
        const nombreDestino = `PARCHE_WEB_${timestamp}_${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const rutaDestino = path.join(dirActualizaciones, nombreDestino);

        fs.writeFileSync(rutaDestino, buffer);
        rutaZipFinal = rutaDestino;
      } else {
        const archivoLocal = formData.get("archivoLocal") as string | null;
        if (archivoLocal) {
          const rutaTentativa = path.join(dirActualizaciones, path.basename(archivoLocal));
          if (fs.existsSync(rutaTentativa)) {
            rutaZipFinal = rutaTentativa;
          } else {
            return NextResponse.json(
              { ok: false, error: `El archivo local especificado no existe en la carpeta de actualizaciones: ${archivoLocal}` },
              { status: 404 }
            );
          }
        } else {
          return NextResponse.json(
            { ok: false, error: "No se proporcionó ningún archivo de actualización ni orden válida." },
            { status: 400 }
          );
        }
      }
    } else {
      // JSON body
      const body = await req.json().catch(() => ({}));
      if (body.modo === "github") {
        modoGithub = true;
      } else if (body.archivoLocal) {
        const rutaTentativa = path.join(dirActualizaciones, path.basename(body.archivoLocal));
        if (fs.existsSync(rutaTentativa)) {
          rutaZipFinal = rutaTentativa;
        } else {
          return NextResponse.json(
            { ok: false, error: `El archivo local no fue encontrado: ${body.archivoLocal}` },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { ok: false, error: "Debe especificar un archivo o el modo de actualización." },
          { status: 400 }
        );
      }
    }

    // Ejecutar el motor blindado de actualización mediante subproceso seguro
    const rutaScriptActualizador = path.join(projectRoot, "scripts", "aplicar-actualizacion-segura.js");
    if (!fs.existsSync(rutaScriptActualizador)) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el script maestro de actualización segura en el servidor." },
        { status: 500 }
      );
    }

    let comando = `node "${rutaScriptActualizador}"`;
    if (modoGithub) {
      comando += " --github";
    } else if (rutaZipFinal) {
      comando += ` --zip="${rutaZipFinal}"`;
    }

    let salidaProceso = "";
    try {
      salidaProceso = execSync(comando, {
        cwd: projectRoot,
        encoding: "utf-8",
        timeout: 300000, // 5 minutos máximo
      });
    } catch (ejecucionError: unknown) {
      const err = ejecucionError as { stdout?: string; stderr?: string; message?: string };
      const salidaError = (err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || "");
      return NextResponse.json(
        {
          ok: false,
          error: "Error durante la ejecución del proceso de actualización.",
          detalles: salidaError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Actualización aplicada exitosamente. Los datos del cliente se mantuvieron intactos.",
      detalles: salidaProceso,
      archivoAplicado: rutaZipFinal ? path.basename(rutaZipFinal) : "GitHub",
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error inesperado en el servidor durante la actualización";
    return NextResponse.json(
      { ok: false, error: mensaje },
      { status: 500 }
    );
  }
}

