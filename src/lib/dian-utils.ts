/**
 * Utilidades Oficiales de Cumplimiento Tributario DIAN (Colombia)
 * Algoritmo Módulo 11 para Dígito de Verificación (DV),
 * Catálogo de Responsabilidades Fiscales y Catálogo de Municipios DANE.
 */

// Ponderadores oficiales DIAN (Decreto 624 de 1989 / Art. 555-2 E.T.)
const FACTORES_PRIMOS_DIAN = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/**
 * Calcula el Dígito de Verificación (DV) oficial de la DIAN mediante el algoritmo Módulo 11.
 * Retorna cadena con el dígito (0 a 9) o vacío si no hay dígitos numéricos.
 */
export function calcularDigitoVerificacionDIAN(nit: string | number): string {
  const nitLimpio = String(nit).replace(/\D/g, "");
  if (!nitLimpio) return "";

  let suma = 0;
  const longitud = nitLimpio.length;

  for (let i = 0; i < longitud; i++) {
    // Dígito tomado de derecha a izquierda
    const digito = parseInt(nitLimpio[longitud - 1 - i], 10);
    const factor = FACTORES_PRIMOS_DIAN[i] || 0;
    suma += digito * factor;
  }

  const residuo = suma % 11;

  if (residuo > 1) {
    return String(11 - residuo);
  }
  return String(residuo); // 0 o 1
}

/**
 * Valida si un correo electrónico cumple con el formato estándar para recepción de factura electrónica.
 */
export function validarEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Catálogo Oficial de Tipos de Documento de Identidad (DIAN)
 */
export interface TipoIdentificacionDIAN {
  codigo: string;
  nombre: string;
  descripcion: string;
  esPersonaJuridica?: boolean;
}

export const TIPOS_IDENTIFICACION_DIAN: TipoIdentificacionDIAN[] = [
  { codigo: "CC", nombre: "Cédula de Ciudadanía", descripcion: "Cédula de Ciudadanía Colombiana" },
  { codigo: "NIT", nombre: "NIT / RUT", descripcion: "Número de Identificación Tributaria", esPersonaJuridica: true },
  { codigo: "CE", nombre: "Cédula de Extranjería", descripcion: "Cédula de Extranjería para extranjeros residentes" },
  { codigo: "PASAPORTE", nombre: "Pasaporte", descripcion: "Pasaporte para extranjeros" },
  { codigo: "TI", nombre: "Tarjeta de Identidad", descripcion: "Tarjeta de Identidad (menores de edad)" },
  { codigo: "CONSUMIDOR_FINAL", nombre: "Consumidor Final (222222222222)", descripcion: "Ventas menores sin identificación individual" },
];

/**
 * Catálogo Oficial de Responsabilidades Fiscales DIAN
 */
export interface ResponsabilidadFiscalDIAN {
  codigo: string;
  nombre: string;
  aplicaPara: "IVA" | "NO_RESPONSABLE" | "ESPECIAL";
  descripcion: string;
}

export const RESPONSABILIDADES_FISCALES_DIAN: ResponsabilidadFiscalDIAN[] = [
  {
    codigo: "O-48",
    nombre: "O-48: Impuesto sobre las ventas - IVA",
    aplicaPara: "IVA",
    descripcion: "Responsable de IVA (Ventas de bienes o servicios gravados)",
  },
  {
    codigo: "O-99",
    nombre: "O-99: No responsable de IVA",
    aplicaPara: "NO_RESPONSABLE",
    descripcion: "Personas naturales no responsables del impuesto a las ventas",
  },
  {
    codigo: "O-13",
    nombre: "O-13: Gran Contribuyente",
    aplicaPara: "ESPECIAL",
    descripcion: "Persona jurídica catalogada como Gran Contribuyente por resolución DIAN",
  },
  {
    codigo: "O-15",
    nombre: "O-15: Autorretenedor",
    aplicaPara: "ESPECIAL",
    descripcion: "Autorretenedor en la fuente por renta",
  },
  {
    codigo: "O-23",
    nombre: "O-23: Agente de retención en el impuesto sobre las ventas (IVA)",
    aplicaPara: "ESPECIAL",
    descripcion: "Agente retenedor de IVA",
  },
  {
    codigo: "R-99-PN",
    nombre: "R-99-PN: No aplica - Otros / Régimen Simple (Simple)",
    aplicaPara: "NO_RESPONSABLE",
    descripcion: "Contribuyente adscrito al Régimen Simple de Tributación u otros regímenes",
  },
];

/**
 * Catálogo de Municipios Principales de Colombia con Códigos DANE Oficiales
 * Encabezado por Villavicencio (Meta) - 50001
 */
export interface MunicipioDANE {
  codigoDane: string;
  nombre: string;
  departamento: string;
}

export const MUNICIPIOS_DANE: MunicipioDANE[] = [
  { codigoDane: "50001", nombre: "Villavicencio", departamento: "Meta" },
  { codigoDane: "50006", nombre: "Acacías", departamento: "Meta" },
  { codigoDane: "50313", nombre: "Granada", departamento: "Meta" },
  { codigoDane: "50573", nombre: "Puerto López", departamento: "Meta" },
  { codigoDane: "50606", nombre: "Restrepo", departamento: "Meta" },
  { codigoDane: "50226", nombre: "Cumaral", departamento: "Meta" },
  { codigoDane: "50689", nombre: "San Martín", departamento: "Meta" },
  { codigoDane: "50287", nombre: "Fuente de Oro", departamento: "Meta" },
  { codigoDane: "50110", nombre: "Barranca de Upía", departamento: "Meta" },
  { codigoDane: "11001", nombre: "Bogotá D.C.", departamento: "Cundinamarca" },
  { codigoDane: "05001", nombre: "Medellín", departamento: "Antioquia" },
  { codigoDane: "76001", nombre: "Cali", departamento: "Valle del Cauca" },
  { codigoDane: "08001", nombre: "Barranquilla", departamento: "Atlántico" },
  { codigoDane: "13001", nombre: "Cartagena", departamento: "Bolívar" },
  { codigoDane: "68001", nombre: "Bucaramanga", departamento: "Santander" },
  { codigoDane: "85001", nombre: "Yopal", departamento: "Casanare" },
  { codigoDane: "17001", nombre: "Manizales", departamento: "Caldas" },
  { codigoDane: "66001", nombre: "Pereira", departamento: "Risaralda" },
  { codigoDane: "63001", nombre: "Armenia", departamento: "Quindío" },
  { codigoDane: "73001", nombre: "Ibagué", departamento: "Tolima" },
  { codigoDane: "41001", nombre: "Neiva", departamento: "Huila" },
  { codigoDane: "54001", nombre: "Cúcuta", departamento: "Norte de Santander" },
  { codigoDane: "52001", nombre: "Pasto", departamento: "Nariño" },
  { codigoDane: "19001", nombre: "Popayán", departamento: "Cauca" },
  { codigoDane: "20001", nombre: "Valledupar", departamento: "Cesar" },
  { codigoDane: "23001", nombre: "Montería", departamento: "Córdoba" },
  { codigoDane: "47001", nombre: "Santa Marta", departamento: "Magdalena" },
  { codigoDane: "70001", nombre: "Sincelejo", departamento: "Sucre" },
  { codigoDane: "15001", nombre: "Tunja", departamento: "Boyacá" },
  { codigoDane: "18001", nombre: "Florencia", departamento: "Caquetá" },
  { codigoDane: "95001", nombre: "San José del Guaviare", departamento: "Guaviare" },
  { codigoDane: "86001", nombre: "Mocoa", departamento: "Putumayo" },
  { codigoDane: "91001", nombre: "Licia", departamento: "Amazonas" },
  { codigoDane: "97001", nombre: "Mitú", departamento: "Vaupés" },
  { codigoDane: "99001", nombre: "Puerto Carreño", departamento: "Vichada" },
  { codigoDane: "94001", nombre: "Inírida", departamento: "Guainía" },
  { codigoDane: "88001", nombre: "San Andrés", departamento: "Archipiélago" },
];

/**
 * Retorna la etiqueta formateada del municipio con su departamento y código DANE.
 */
export function formatearMunicipioDANE(codigoDane: string, nombreManual?: string): string {
  const encontrado = MUNICIPIOS_DANE.find((m) => m.codigoDane === codigoDane);
  if (encontrado) {
    return `${encontrado.nombre} (${encontrado.departamento}) - Código DANE: ${encontrado.codigoDane}`;
  }
  if (nombreManual) {
    return `${nombreManual} - Código DANE: ${codigoDane || "50001"}`;
  }
  return `Villavicencio (Meta) - Código DANE: 50001`;
}
