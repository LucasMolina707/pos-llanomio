/**
 * Utilidades para integración CRM y mensajería oficial con WhatsApp API
 */

/**
 * Sanitiza y formatea el número de teléfono para la API de WhatsApp
 * Normaliza números colombianos (antepone 57 si tiene 10 dígitos iniciando por 3)
 */
export function normalizarTelefonoWhatsApp(telefonoRaw?: string | null): string | null {
  if (!telefonoRaw) return null;

  // Remover todo carácter no numérico
  const soloDigitos = telefonoRaw.replace(/\D/g, "");

  if (!soloDigitos || soloDigitos.length < 7) {
    return null;
  }

  // Si ya tiene el indicativo 57 al inicio y tiene 12 dígitos
  if (soloDigitos.startsWith("57") && soloDigitos.length === 12) {
    return soloDigitos;
  }

  // Si es un celular colombiano de 10 dígitos (ej. 3101234567)
  if (soloDigitos.length === 10 && soloDigitos.startsWith("3")) {
    return `57${soloDigitos}`;
  }

  return soloDigitos;
}

/**
 * Genera el texto formal y profesional para WhatsApp según las reglas de negocio
 */
export function generarMensajeCobroWhatsApp({
  nombreCliente,
  nombrePrenda = "la prenda de alquiler",
  diasRetraso = 0,
  horasRetraso = 0,
  unidadMora = "DIA",
  saldoPendiente,
  tipoMensaje = "MORA",
  numeroFactura,
}: {
  nombreCliente: string;
  nombrePrenda?: string;
  diasRetraso?: number;
  horasRetraso?: number;
  unidadMora?: "HORA" | "DIA";
  saldoPendiente: number;
  tipoMensaje?: "MORA" | "RECORDATORIO" | "SALDO_PENDIENTE";
  numeroFactura?: string;
}): string {
  const saldoFormateado = `$${Math.round(saldoPendiente).toLocaleString("es-CO")}`;
  const refFactura = numeroFactura ? ` (Factura ${numeroFactura})` : "";

  if (tipoMensaje === "MORA") {
    const tiempoTexto =
      unidadMora === "HORA"
        ? `${horasRetraso} ${horasRetraso === 1 ? "hora" : "horas"}`
        : `${diasRetraso} ${diasRetraso === 1 ? "dia" : "dias"}`;

    return `Hola ${nombreCliente}, le saludamos de LLANOMIO. Le recordamos que tiene pendiente la devolucion/saldo de la prenda ${nombrePrenda}${refFactura} con un retraso de ${tiempoTexto}. El saldo actual a la fecha es ${saldoFormateado}. Lo esperamos en nuestra tienda para su recepcion y liquidacion.`;
  }

  if (tipoMensaje === "RECORDATORIO") {
    return `Hola ${nombreCliente}, un cordial saludo de LLANOMIO. Le recordamos amablemente la devolucion pactada de la prenda ${nombrePrenda}${refFactura}. Quedamos atentos para recibirla en nuestra tienda. Que tenga un excelente dia.`;
  }

  // SALDO_PENDIENTE
  return `Hola ${nombreCliente}, un saludo de LLANOMIO. Le recordamos que registra un saldo pendiente de ${saldoFormateado} correspondiente a su ${refFactura}. Puede acercarse a nuestra tienda o realizar su pago mediante transferencia o Nequi.`;
}
