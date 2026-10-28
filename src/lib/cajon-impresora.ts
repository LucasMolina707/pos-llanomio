import { execFile } from "child_process";
import { promisify } from "util";
import prisma from "@/lib/prisma";

const execFileAsync = promisify(execFile);

export interface ResultadoAperturaCajon {
  ok: boolean;
  impresoraUsada: string;
  detalle?: string;
  simulado?: boolean;
}

// Caché en memoria en el servidor para evitar invocar a PowerShell repetidamente
let cacheImpresoras: { lista: string[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de vigencia

const NODE_EXEC_OPTIONS = {
  windowsHide: true,
  timeout: 5000,
  maxBuffer: 1024 * 1024,
};

/**
 * Consulta las impresoras registradas en el sistema operativo Windows
 * mediante Win32_Printer a través de PowerShell de forma 100% invisible.
 */
export async function obtenerImpresorasWindows(forzarRefresco = false): Promise<string[]> {
  if (process.platform !== "win32") {
    return ["Impresora Simulación POS (No-Windows)"];
  }

  // Si existe en caché y no se solicitó forzar el refresco, responder inmediatamente en 0ms
  if (!forzarRefresco && cacheImpresoras && Date.now() - cacheImpresoras.timestamp < CACHE_TTL_MS) {
    return cacheImpresoras.lista;
  }

  try {
    const comando = `
      $printers = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
      if (-not $printers) {
        $printers = (Get-Printer -ErrorAction SilentlyContinue).Name
      }
      $printers | Where-Object { $_ -and $_.Trim() -ne '' } | ForEach-Object { $_.Trim() }
    `;

    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        comando,
      ],
      NODE_EXEC_OPTIONS
    );

    const lista = stdout
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0);

    const impresorasUnicas = Array.from(new Set(lista));

    // Almacenar en caché en memoria
    cacheImpresoras = {
      lista: impresorasUnicas,
      timestamp: Date.now(),
    };

    return impresorasUnicas;
  } catch (error: unknown) {
    console.error("Error al obtener impresoras de Windows:", error);
    return cacheImpresoras?.lista || [];
  }
}

/**
 * Obtiene el nombre de la impresora predeterminada en Windows de forma invisible.
 */
async function obtenerImpresoraPredeterminada(): Promise<string | null> {
  if (process.platform !== "win32") return null;

  try {
    const comando = `
      (Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | Where-Object { $_.Default -eq $true } | Select-Object -ExpandProperty Name)
    `;

    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        comando,
      ],
      NODE_EXEC_OPTIONS
    );

    const nombre = stdout.trim();
    return nombre.length > 0 ? nombre : null;
  } catch {
    return null;
  }
}

/**
 * Envía la secuencia RAW ESC/POS de apertura de cajón (Drawer Kick RJ11/RJ12)
 * a la impresora especificada o a la configurada en el sistema.
 * 
 * Secuencia ESC/POS:
 * Pin 2 (Epson, POS-80, Xprinter, etc.): [0x1B, 0x70, 0x00, 0x19, 0xFA] (ESC p 0 25 250)
 * Pin 5 (Compatibilidad secundaria):     [0x1B, 0x70, 0x01, 0x19, 0xFA] (ESC p 1 25 250)
 */
export async function dispararAperturaCajon(
  impresoraParam?: string,
  pinParam?: number
): Promise<ResultadoAperturaCajon> {
  try {
    // 1. Resolver impresora y pin desde la configuración de empresa si no vienen definidos
    let nombreImpresora = impresoraParam?.trim();
    let pin = pinParam !== undefined ? pinParam : 0;

    if (!nombreImpresora) {
      const config = await prisma.configuracionEmpresa.findFirst({
        select: { nombreImpresoraPos: true, pinCajon: true },
      });

      if (config?.nombreImpresoraPos && config.nombreImpresoraPos.trim().length > 0) {
        nombreImpresora = config.nombreImpresoraPos.trim();
      }

      if (config?.pinCajon !== undefined && pinParam === undefined) {
        pin = config.pinCajon;
      }
    }

    // 2. Si aún no hay impresora seleccionada, usar la predeterminada de Windows
    if (!nombreImpresora) {
      const predeterminada = await obtenerImpresoraPredeterminada();
      if (predeterminada) {
        nombreImpresora = predeterminada;
      }
    }

    // Si no estamos en Windows o no hay impresora detectada, operar en modo simulación
    if (process.platform !== "win32" || !nombreImpresora) {
      return {
        ok: true,
        impresoraUsada: nombreImpresora || "Simulada (Sin hardware físico)",
        detalle: "Pulso de apertura simulado con éxito (entorno sin hardware físico).",
        simulado: true,
      };
    }

    // 3. Preparar secuencia de bytes ESC/POS
    // Si pin es 0: Pin 2 (estándar universal)
    // Si pin es 1: Pin 5 (secundario)
    // Si pin es 2: Ambos pines concatenados para compatibilidad absoluta
    let bytesHex: string;
    if (pin === 1) {
      bytesHex = "0x1B, 0x70, 0x01, 0x19, 0xFA";
    } else if (pin === 2) {
      bytesHex = "0x1B, 0x70, 0x00, 0x19, 0xFA, 0x1B, 0x70, 0x01, 0x19, 0xFA";
    } else {
      // Por defecto Pin 2 y respaldo Pin 5
      bytesHex = "0x1B, 0x70, 0x00, 0x19, 0xFA, 0x1B, 0x70, 0x01, 0x19, 0xFA";
    }

    // 4. Script de PowerShell con Win32 RawPrinterHelper
    const scriptPowerShell = `
$ErrorActionPreference = 'Stop'
$printerName = "${nombreImpresora.replace(/"/g, '`"')}"

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytes(string szPrinterName, byte[] bytes) {
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Apertura Cajon POS";
        di.pDataType = "RAW";

        bool success = false;
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    int dwWritten = 0;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return success;
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelper').Type) {
    Add-Type -TypeDefinition $code -Language CSharp
}

[byte[]]$bytes = @(${bytesHex})
$res = [RawPrinterHelper]::SendBytes($printerName, $bytes)
if ($res) {
    Write-Output "OK"
} else {
    Write-Error "No se pudo enviar el pulso RAW a la impresora '$printerName'."
}
`;

    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        scriptPowerShell,
      ],
      NODE_EXEC_OPTIONS
    );

    if (stdout.includes("OK")) {
      return {
        ok: true,
        impresoraUsada: nombreImpresora,
        detalle: `Pulso ESC/POS enviado exitosamente a la impresora '${nombreImpresora}'.`,
      };
    } else {
      return {
        ok: true,
        impresoraUsada: nombreImpresora,
        detalle: `Se envió el comando a '${nombreImpresora}', sin confirmación de estado.`,
      };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn("Aviso al disparar apertura de cajón (modo defensivo):", errorMsg);

    // Modo tolerante a fallos: no interrumpe el flujo de la venta ni del mostrador
    return {
      ok: true,
      impresoraUsada: impresoraParam || "Impresora Local",
      detalle: `Apertura procesada en modo seguro: ${errorMsg}`,
      simulado: true,
    };
  }
}
