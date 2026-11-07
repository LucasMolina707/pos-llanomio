import { NextResponse } from "next/server";
import { execFile } from "child_process";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const accion = body?.accion || "MINIMIZAR";

    if (accion !== "MINIMIZAR") {
      return NextResponse.json(
        { ok: false, error: "Acción no reconocida" },
        { status: 400 }
      );
    }

    if (process.platform !== "win32") {
      return NextResponse.json({
        ok: true,
        mensaje: "Acción omitida: entorno no es Windows",
      });
    }

    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Window {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@
$hwnd = [Win32Window]::GetForegroundWindow()
if ($hwnd -ne [IntPtr]::Zero) {
  [Win32Window]::ShowWindowAsync($hwnd, 6) | Out-Null
}
`;

    await new Promise<void>((resolve, reject) => {
      execFile(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psScript],
        {
          windowsHide: true,
          timeout: 4000,
        },
        (error) => {
          if (error) {
            // No bloqueamos si falla la llamada nativa
            console.error("[VENTANA] Error al minimizar ventana Win32:", error.message);
          }
          resolve();
        }
      );
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Ventana minimizada en la barra de tareas",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { ok: false, error: errorMsg },
      { status: 500 }
    );
  }
}

