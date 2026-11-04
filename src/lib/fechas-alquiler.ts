/**
 * REGLAS COMERCIALES DE TIEMPOS Y FECHAS DE ALQUILER
 * POS LLANOMIO
 * 
 * Regla de negocio oficial:
 * La devolución pactada se calcula automáticamente con fecha límite a las 8:00 p.m. (20:00):
 * - Lunes   -> Miércoles (+2 días) a las 20:00
 * - Martes  -> Jueves    (+2 días) a las 20:00
 * - Miércoles -> Viernes (+2 días) a las 20:00
 * - Jueves  -> Sábado    (+2 días) a las 20:00
 * - Viernes -> Lunes     (+3 días) a las 20:00
 * - Sábado  -> Lunes     (+2 días) a las 20:00
 * - Domingo -> Martes    (+2 días) a las 20:00
 */

const NOMBRES_DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/**
 * Parsea con seguridad cualquier input de fecha evitando desfases de zona horaria UTC
 */
function parsearFechaLocal(fechaInput?: string | Date): Date {
  if (!fechaInput) return new Date();
  if (fechaInput instanceof Date) return new Date(fechaInput.getTime());

  const limpia = String(fechaInput).trim();
  // Si viene en formato 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm'
  if (/^\d{4}-\d{2}-\d{2}/.test(limpia)) {
    const partes = limpia.split("T")[0].split("-").map(Number);
    const ahora = new Date();
    // Constructor local: año, mes-1, día, hora, minutos
    return new Date(partes[0], partes[1] - 1, partes[2], ahora.getHours(), ahora.getMinutes());
  }

  const d = new Date(limpia);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Calcula la fecha y hora de devolución automática pactada a las 20:00 (8:00 p.m.)
 * según el día de la semana en que se toma o retira la prenda.
 * Retorna string en formato ISO local para inputs `datetime-local` ('YYYY-MM-DDTHH:mm')
 */
export function calcularFechaDevolucionAlquiler(fechaSalidaInput?: string | Date): string {
  const base = parsearFechaLocal(fechaSalidaInput);
  const diaSemana = base.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

  let diasASumar = 2;
  if (diaSemana === 1) diasASumar = 2; // Lunes -> Miércoles
  else if (diaSemana === 2) diasASumar = 2; // Martes -> Jueves
  else if (diaSemana === 3) diasASumar = 2; // Miércoles -> Viernes
  else if (diaSemana === 4) diasASumar = 2; // Jueves -> Sábado
  else if (diaSemana === 5) diasASumar = 3; // Viernes -> Lunes
  else if (diaSemana === 6) diasASumar = 2; // Sábado -> Lunes
  else if (diaSemana === 0) diasASumar = 2; // Domingo -> Martes

  const entrega = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diasASumar, 20, 0, 0, 0);

  const yyyy = entrega.getFullYear();
  const mm = String(entrega.getMonth() + 1).padStart(2, "0");
  const dd = String(entrega.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T20:00`;
}

/**
 * Obtiene el nombre del día y la descripción legible de la regla automática aplicada
 */
export function obtenerDescripcionReglaDevolucion(fechaSalidaInput?: string | Date): {
  diaSalida: string;
  diaEntrega: string;
  horaTexto: string;
  mensajeInformativo: string;
} {
  const fechaDevIso = calcularFechaDevolucionAlquiler(fechaSalidaInput);
  const [fechaParte] = fechaDevIso.split("T");
  const [yyyy, mm, dd] = fechaParte.split("-").map(Number);
  const fechaDevDate = new Date(yyyy, mm - 1, dd, 20, 0);

  const base = parsearFechaLocal(fechaSalidaInput);
  const diaSalida = NOMBRES_DIAS_SEMANA[base.getDay()];
  const diaEntrega = NOMBRES_DIAS_SEMANA[fechaDevDate.getDay()];
  const horaTexto = "8:00 p.m.";

  return {
    diaSalida,
    diaEntrega,
    horaTexto,
    mensajeInformativo: `Regla automática aplicada: Entrega pactada el ${diaEntrega} hasta las 8:00 p.m.`,
  };
}

