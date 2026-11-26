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

  // 1. Si viene con marca UTC ('Z') o con offset de zona horaria explícito ('+00:00', '-05:00')
  // El motor de JavaScript lo traslada con precisión exacta a la hora local del usuario
  if (limpia.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(limpia)) {
    const d = new Date(limpia);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // 2. Si viene en formato simple 'YYYY-MM-DD' (solo fecha, sin hora ni zona horaria)
  // Se fija a las 12:00 del mediodía local para evitar que medianoche UTC retroceda de día en UTC-5
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) {
    const [yyyy, mm, dd] = limpia.split("-").map(Number);
    return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
  }

  // 3. Si viene en formato local 'YYYY-MM-DDTHH:mm' o 'YYYY-MM-DDTHH:mm:ss' (sin Z)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(limpia)) {
    const [fechaParte, horaParte] = limpia.split("T");
    const [yyyy, mm, dd] = fechaParte.split("-").map(Number);
    const partesHora = horaParte.split(":").map(Number);
    const hora = partesHora[0] ?? 12;
    const min = partesHora[1] ?? 0;
    const seg = partesHora[2] ?? 0;
    return new Date(yyyy, mm - 1, dd, hora, min, seg, 0);
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
    mensajeInformativo: `Entrega pactada: ${diaEntrega}`,
  };
}

/**
 * Indica si una fecha corresponde a un domingo (día no laboral)
 */
export function esDomingo(fechaInput?: string | Date | null): boolean {
  if (!fechaInput) return false;
  const d = parsearFechaLocal(fechaInput);
  return d.getDay() === 0;
}

/**
 * Calcula los días y horas de retraso excluyendo estrictamente los domingos (no laborales).
 * La mora comercial de Llanomio nunca suma días domingos.
 */
export function calcularRetrasoSinDomingos(
  fechaPactadaInput: string | Date,
  fechaReferencia: Date = new Date()
): {
  enMora: boolean;
  diasRetraso: number;
  horasRetraso: number;
  domingosExcluidos: number;
} {
  const fechaLimite = parsearFechaLocal(fechaPactadaInput);
  const diffMs = fechaReferencia.getTime() - fechaLimite.getTime();

  if (diffMs <= 0) {
    return {
      enMora: false,
      diasRetraso: 0,
      horasRetraso: 0,
      domingosExcluidos: 0,
    };
  }

  const totalHorasRetraso = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

  // Recorrer los días calendario transcurridos para excluir estrictamente los domingos
  let domingosExcluidos = 0;
  let diasHabilesMora = 0;

  const inicio = new Date(fechaLimite.getFullYear(), fechaLimite.getMonth(), fechaLimite.getDate(), 0, 0, 0);
  const fin = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), fechaReferencia.getDate(), 0, 0, 0);
  const cursor = new Date(inicio.getTime());

  // Avanzar desde el día siguiente al vencimiento pactado
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= fin) {
    if (cursor.getDay() === 0) {
      domingosExcluidos++;
    } else {
      diasHabilesMora++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Si venció el mismo día después de las 8:00 p.m., cuenta 1 día hábil salvo que sea domingo
  if (diasHabilesMora === 0 && diffMs > 0 && fechaReferencia.getDay() !== 0) {
    diasHabilesMora = 1;
  }

  return {
    enMora: true,
    diasRetraso: Math.max(1, diasHabilesMora),
    horasRetraso: totalHorasRetraso,
    domingosExcluidos,
  };
}


