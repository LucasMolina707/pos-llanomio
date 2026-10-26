import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/stream
 * Canal Server-Sent Events (SSE) para notificaciones instantáneas de cambios en la base de datos.
 * Envía un pulso de telemetría continuo cada 3 segundos con el estado de la última transacción.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let cerrado = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        if (cerrado) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          cerrado = true;
          if (intervalId) clearInterval(intervalId);
        }
      };

      // Saludo inicial de conexión
      sendEvent("connected", {
        status: "ok",
        timestamp: new Date().toISOString(),
        red: "Local LAN",
      });

      // Emisor de telemetría y comprobación de transacciones
      const emitirPulso = async () => {
        if (cerrado) return;
        try {
          const [ultimaFactura, ultimoAbono, turnoActivo] = await Promise.all([
            prisma.factura.findFirst({
              select: { id: true, numeroFactura: true, fechaCreacion: true, totalFactura: true },
              orderBy: { fechaCreacion: "desc" },
            }),
            prisma.abono.findFirst({
              select: { id: true, monto: true, fecha: true },
              orderBy: { fecha: "desc" },
            }),
            prisma.turnoCaja.findFirst({
              where: { estado: "ABIERTO" },
              select: { id: true, fechaApertura: true },
              orderBy: { fechaApertura: "desc" },
            }),
          ]);

          sendEvent("tick", {
            timestamp: new Date().toISOString(),
            ultimaFacturaId: ultimaFactura?.id || null,
            ultimaFacturaNumero: ultimaFactura?.numeroFactura || null,
            ultimaFacturaFecha: ultimaFactura?.fechaCreacion ? ultimaFactura.fechaCreacion.toISOString() : null,
            ultimoAbonoId: ultimoAbono?.id || null,
            ultimoAbonoFecha: ultimoAbono?.fecha ? ultimoAbono.fecha.toISOString() : null,
            turnoActivoId: turnoActivo?.id || null,
          });
        } catch {
          // Falla no crítica de sondeo
        }
      };

      // Enviar primer pulso inmediato y luego cada 3000ms
      await emitirPulso();
      intervalId = setInterval(emitirPulso, 3000);
    },
    cancel() {
      cerrado = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Connection: "keep-alive",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
