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

export const NOMBRES_DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const NOMBRES_MESES_ESP = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const NOMBRES_MESES_CORTOS_ESP = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * Parsea con seguridad cualquier input de fecha evitando desfases de zona horaria UTC
 */
export function parsearFechaLocal(fechaInput?: string | Date | null): Date {
  if (!fechaInput) return new Date();
  if (fechaInput instanceof Date) return new Date(fechaInput.getTime());

  const limpia = String(fechaInput).trim();
  if (!limpia) return new Date();

  // Si viene en formato 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm'
  if (/^\d{4}-\d{2}-\d{2}/.test(limpia)) {
    const partesFecha = limpia.split("T")[0].split("-").map(Number);
    let hora = 12;
    let min = 0;
    if (limpia.includes("T")) {
      const parteHora = limpia.split("T")[1];
      const sub = parteHora.split(":").map(Number);
      hora = sub[0] ?? 12;
      min = sub[1] ?? 0;
    }
    return new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2], hora, min);
  }

  const d = new Date(limpia);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formatea una fecha incluyendo el día de la semana en español, ej:
 * "sábado, 21 de noviembre de 2026" o con hora "sábado, 21 de noviembre de 2026, 08:00 p.m."
 */
export function formatearFechaConDia(
  val: unknown,
  withTime = false,
  formato: "completo" | "corto" = "corto"
): string {
  if (!val) return "—";
  const d = parsearFechaLocal(val as string | Date);
  if (isNaN(d.getTime())) return "—";

  const diaSemana = NOMBRES_DIAS_SEMANA[d.getDay()].toLowerCase();
  const diaNum = String(d.getDate()).padStart(2, "0");
  const mesIdx = d.getMonth();
  const yyyy = d.getFullYear();

  let horaTexto = "";
  if (withTime) {
    let horas = d.getHours();
    const minutos = String(d.getMinutes()).padStart(2, "0");
    const ampm = horas >= 12 ? "p. m." : "a. m.";
    horas = horas % 12;
    horas = horas ? horas : 12;
    horaTexto = ` ${horas}:${minutos} ${ampm}`;
  }

  if (formato === "corto") {
    const mesNum = String(mesIdx + 1).padStart(2, "0");
    return `${diaSemana}, ${diaNum}/${mesNum}/${yyyy}${horaTexto}`;
  }

  const mesNombre = NOMBRES_MESES_ESP[mesIdx];
  return `${diaSemana}, ${diaNum} de ${mesNombre} de ${yyyy}${horaTexto ? ` - ${horaTexto.trim()}` : ""}`;
}

/**
 * Retorna etiqueta visual enriquecida para campos de mostrador, ej:
 * "Sábado, 21 nov 2026" o "Lunes, 23 nov 2026 08:00 p.m."
 */
export function formatearEtiquetaDiaYFecha(val: unknown, withTime = false): string {
  if (!val) return "—";
  const d = parsearFechaLocal(val as string | Date);
  if (isNaN(d.getTime())) return "—";

  const diaSemana = NOMBRES_DIAS_SEMANA[d.getDay()];
  const diaNum = d.getDate();
  const mesCorto = NOMBRES_MESES_CORTOS_ESP[d.getMonth()];
  const anio = d.getFullYear();

  let horaTexto = "";
  if (withTime) {
    let horas = d.getHours();
    const minutos = String(d.getMinutes()).padStart(2, "0");
    const ampm = horas >= 12 ? "p.m." : "a.m.";
    horas = horas % 12;
    horas = horas ? horas : 12;
    horaTexto = ` ${horas}:${minutos} ${ampm}`;
  }

  return `${diaSemana}, ${diaNum} ${mesCorto} ${anio}${horaTexto}`;
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

