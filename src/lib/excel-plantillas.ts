import * as XLSX from "xlsx";
import { calcularDigitoVerificacionDIAN } from "@/lib/dian-utils";

/**
 * ============================================================================
 * DEFINICIÓN CANÓNICA DE COLUMNAS PARA INVENTARIO
 * ============================================================================
 */
export const COLUMNAS_INVENTARIO = {
  CODIGO: "CODIGO_REFERENCIA [OBLIGATORIO *]",
  NOMBRE: "NOMBRE_PRODUCTO [OBLIGATORIO *]",
  TIPO: "TIPO_MODALIDAD [OBLIGATORIO *: VENTA o ALQUILER]",
  PRECIO: "PRECIO_BASE [OBLIGATORIO *]",
  CATEGORIA: "CATEGORIA [OPCIONAL]",
  TALLA: "TALLA [OPCIONAL]",
  COLOR: "COLOR [OPCIONAL]",
  STOCK: "STOCK_CANTIDAD [OPCIONAL]",
  MORA_DIARIA: "TARIFA_MORA_DIARIA [OPCIONAL - Solo Alquiler]",
  MORA_HORA: "TARIFA_MORA_HORA [OPCIONAL - Solo Alquiler]",
  ESTADO: "ESTADO_PRENDA [OPCIONAL: DISPONIBLE, ALQUILADO, SEPARADO, EN_ARREGLO]",
  DESCRIPCION: "DESCRIPCION_NOTAS [OPCIONAL]",
} as const;

export const GUIA_CAMPOS_INVENTARIO = [
  {
    COLUMNA: COLUMNAS_INVENTARIO.CODIGO,
    OBLIGATORIO: "SI",
    DESCRIPCION: "Identificador alfanumérico único del producto o prenda. Es la clave primaria para crear o actualizar.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: VEN-101, ALQ-205, TRAJE-GALA-01",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.NOMBRE,
    OBLIGATORIO: "SI",
    DESCRIPCION: "Nombre descriptivo de la prenda, traje típico, accesorio o artículo comercial.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: Sombrero Pelo de Guama, Traje Joropo Hombre Gala",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.TIPO,
    OBLIGATORIO: "SI",
    DESCRIPCION: "Determina si el artículo se comercializa como venta directa o servicio de alquiler.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Exclusivamente: VENTA o ALQUILER (insensible a mayúsculas/minúsculas)",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.PRECIO,
    OBLIGATORIO: "SI",
    DESCRIPCION: "Valor monetario unitario de venta directa o canon pactado de alquiler en pesos colombianos (COP).",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: 150000, 80000 (admite número limpio o con formato $)",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.CATEGORIA,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Línea o clasificación de inventario. Si se deja vacío, el sistema asigna 'General'.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: Trajes Típicos, Sombreros, Calzado, Accesorios, Vestidos",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.TALLA,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Talla física de la prenda o artículo.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: S, M, L, XL, 36, 38, Única",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.COLOR,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Color predominante o combinación estética de la prenda.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: Blanco, Negro, Rojo con Dorado",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.STOCK,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Cantidad física de unidades disponibles en almacén. Si se deja vacío, asigna 1.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Número entero mayor o igual a 0. Ej: 1, 5, 10",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.MORA_DIARIA,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Valor de penalización por día de retraso al devolver una prenda alquilada. Solo aplica para ALQUILER.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: 20000, 25000. Por defecto: 0",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.MORA_HORA,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Valor de penalización por hora de retraso al devolver una prenda alquilada. Solo aplica para ALQUILER.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: 5000. Por defecto: 0",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.ESTADO,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Estado físico operativo actual del ítem. Si se omite, asigna DISPONIBLE.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "DISPONIBLE, ALQUILADO, SEPARADO, EN_ARREGLO o INACTIVO",
  },
  {
    COLUMNA: COLUMNAS_INVENTARIO.DESCRIPCION,
    OBLIGATORIO: "NO",
    DESCRIPCION: "Notas complementarias, observaciones técnicas o lista de piezas que integran el ajuar.",
    VALORES_PERMITIDOS_Y_EJEMPLOS: "Ej: Incluye liquiliqui, pantalón blanco y fajón rojo",
  },
];

export const EJEMPLOS_PLANTILLA_INVENTARIO = [
  {
    [COLUMNAS_INVENTARIO.CODIGO]: "VEN-101",
    [COLUMNAS_INVENTARIO.NOMBRE]: "Sombrero Pelo de Guama Llanero Original",
    [COLUMNAS_INVENTARIO.TIPO]: "VENTA",
    [COLUMNAS_INVENTARIO.PRECIO]: 150000,
    [COLUMNAS_INVENTARIO.CATEGORIA]: "Sombreros",
    [COLUMNAS_INVENTARIO.TALLA]: "M",
    [COLUMNAS_INVENTARIO.COLOR]: "Negro",
    [COLUMNAS_INVENTARIO.STOCK]: 5,
    [COLUMNAS_INVENTARIO.MORA_DIARIA]: 0,
    [COLUMNAS_INVENTARIO.MORA_HORA]: 0,
    [COLUMNAS_INVENTARIO.ESTADO]: "DISPONIBLE",
    [COLUMNAS_INVENTARIO.DESCRIPCION]: "Sombrero tradicional llanero de ala ancha impermeable",
  },
  {
    [COLUMNAS_INVENTARIO.CODIGO]: "ALQ-205",
    [COLUMNAS_INVENTARIO.NOMBRE]: "Traje de Gala Joropo Hombre Completo",
    [COLUMNAS_INVENTARIO.TIPO]: "ALQUILER",
    [COLUMNAS_INVENTARIO.PRECIO]: 80000,
    [COLUMNAS_INVENTARIO.CATEGORIA]: "Trajes Típicos",
    [COLUMNAS_INVENTARIO.TALLA]: "L",
    [COLUMNAS_INVENTARIO.COLOR]: "Blanco con faja roja",
    [COLUMNAS_INVENTARIO.STOCK]: 2,
    [COLUMNAS_INVENTARIO.MORA_DIARIA]: 25000,
    [COLUMNAS_INVENTARIO.MORA_HORA]: 5000,
    [COLUMNAS_INVENTARIO.ESTADO]: "DISPONIBLE",
    [COLUMNAS_INVENTARIO.DESCRIPCION]: "Incluye liquiliqui blanco, pantalón y sombrero",
  },
];

/**
 * ============================================================================
 * DEFINICIÓN CANÓNICA DE COLUMNAS PARA CLIENTES
 * ============================================================================
 */
export const COLUMNAS_CLIENTES = {
  DOCUMENTO: "DOCUMENTO_O_NIT [OBLIGATORIO *]",
  NOMBRE: "NOMBRE_COMPLETO [OBLIGATORIO *]",
  TELEFONO: "TELEFONO_PRIMARIO [OBLIGATORIO *]",
  TELEFONO_SECUNDARIO: "TELEFONO_SECUNDARIO [OPCIONAL]",
  DIRECCION: "DIRECCION [OPCIONAL / Recomendado FE]",
  ES_FE: "ES_FACTURACION_ELECTRONICA_CONTRIBUYENTE [OPCIONAL: SI o NO]",
  TIPO_DOC: "TIPO_DOCUMENTO [OPCIONAL: CC, NIT, CE, PASAPORTE, TI]",
  DV: "DIGITO_VERIFICACION [OPCIONAL - Se autocalcula si es NIT]",
  RAZON_SOCIAL: "RAZON_SOCIAL_LEGAL [OPCIONAL - Para Facturación Electrónica]",
  EMAIL: "CORREO_ELECTRONICO [OPCIONAL - Para Facturación Electrónica]",
  RESPONSABILIDAD: "RESPONSABILIDAD_FISCAL_DIAN [OPCIONAL: O-99, O-48, O-13, O-15, O-23, R-99-PN]",
  MUNICIPIO: "MUNICIPIO [OPCIONAL]",
  CODIGO_DANE: "CODIGO_DANE_MUNICIPIO [OPCIONAL]",
  NOTAS: "NOTAS_OBSERVACIONES [OPCIONAL]",
} as const;

export const GUIA_CAMPOS_CLIENTES = [
  {
    CAMPO: COLUMNAS_CLIENTES.DOCUMENTO,
    OBLIGATORIO_GENERAL: "SI",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Cédula de ciudadanía o NIT sin dígito de verificación. Llave única de búsqueda y actualización.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Ej: 1121888999, 900543210 (solo números y letras sin guiones ni espacios)",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.NOMBRE,
    OBLIGATORIO_GENERAL: "SI",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Nombres y apellidos de la persona natural o nombre comercial del cliente.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Ej: Carlos Alberto Gómez Ruiz, Academia de Baile Llanero",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.TELEFONO,
    OBLIGATORIO_GENERAL: "SI",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Número telefónico principal para contratos de alquiler, avisos y recordatorios WhatsApp.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Mínimo 7 dígitos. Ej: 3114567890",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.TELEFONO_SECUNDARIO,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "NO",
    DESCRIPCION_Y_REGLA_DIAN: "Teléfono alternativo o de contacto de respaldo del cliente.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Ej: 3209876543 o en blanco",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.DIRECCION,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Dirección física de residencia o domicilio fiscal exigido por la DIAN en facturación electrónica.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Ej: Calle 14 # 25-10 Barrio Barzal",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.ES_FE,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Indica si el cliente requiere Facturación Electrónica con validación previa DIAN.",
    VALORES_ACEPTADOS_Y_DEFAULT: "SI (para contribuyentes) o NO (por defecto para consumidor final)",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.TIPO_DOC,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Tipo de documento según estándar DIAN. Por defecto asigna CC (o NIT si es contribuyente).",
    VALORES_ACEPTADOS_Y_DEFAULT: "CC, NIT, CE, PASAPORTE, TI. Por defecto: CC",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.DV,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Dígito de verificación del NIT. Si se deja en blanco y es NIT, el sistema lo calcula automáticamente por Módulo 11.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Dígito entre 0 y 9. Autocalculado por defecto si es NIT.",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.RAZON_SOCIAL,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Razón social registrada en el RUT para personas jurídicas. Si está vacío y es FE, toma el NOMBRE_COMPLETO.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Ej: ACADEMIA DE BAILE JOROPO Y TRADICION SAS",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.EMAIL,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Buzón de correo electrónico para emisión y envío del PDF y XML de la factura electrónica.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Ej: facturacion@empresa.com",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.RESPONSABILIDAD,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "SI",
    DESCRIPCION_Y_REGLA_DIAN: "Código de responsabilidad fiscal DIAN. Si es FE toma O-48 (Responsable de IVA); de lo contrario O-99.",
    VALORES_ACEPTADOS_Y_DEFAULT: "O-48, O-99, O-13, O-15, O-23, R-99-PN. Por defecto: O-99 (o O-48 en FE)",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.MUNICIPIO,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "NO",
    DESCRIPCION_Y_REGLA_DIAN: "Ciudad o municipio de residencia fiscal.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Por defecto: Villavicencio - Meta",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.CODIGO_DANE,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "NO",
    DESCRIPCION_Y_REGLA_DIAN: "Código oficial DANE de 5 dígitos del municipio.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Por defecto: 50001 (Villavicencio)",
  },
  {
    CAMPO: COLUMNAS_CLIENTES.NOTAS,
    OBLIGATORIO_GENERAL: "NO",
    RECOMENDADO_FE: "NO",
    DESCRIPCION_Y_REGLA_DIAN: "Observaciones internas o preferencias comerciales del cliente.",
    VALORES_ACEPTADOS_Y_DEFAULT: "Texto libre descriptivo",
  },
];

export const EJEMPLOS_PLANTILLA_CLIENTES = [
  {
    [COLUMNAS_CLIENTES.DOCUMENTO]: "1121888999",
    [COLUMNAS_CLIENTES.NOMBRE]: "Carlos Alberto Gómez Ruiz",
    [COLUMNAS_CLIENTES.TELEFONO]: "3114567890",
    [COLUMNAS_CLIENTES.TELEFONO_SECUNDARIO]: "3209876543",
    [COLUMNAS_CLIENTES.DIRECCION]: "Calle 14 # 25-10 Barrio Barzal",
    [COLUMNAS_CLIENTES.ES_FE]: "NO",
    [COLUMNAS_CLIENTES.TIPO_DOC]: "CC",
    [COLUMNAS_CLIENTES.DV]: "",
    [COLUMNAS_CLIENTES.RAZON_SOCIAL]: "",
    [COLUMNAS_CLIENTES.EMAIL]: "carlos.gomez@gmail.com",
    [COLUMNAS_CLIENTES.RESPONSABILIDAD]: "O-99",
    [COLUMNAS_CLIENTES.MUNICIPIO]: "Villavicencio - Meta",
    [COLUMNAS_CLIENTES.CODIGO_DANE]: "50001",
    [COLUMNAS_CLIENTES.NOTAS]: "Cliente frecuente de alquiler de trajes",
  },
  {
    [COLUMNAS_CLIENTES.DOCUMENTO]: "900543210",
    [COLUMNAS_CLIENTES.NOMBRE]: "Academia de Baile Joropo y Tradición SAS",
    [COLUMNAS_CLIENTES.TELEFONO]: "3156789012",
    [COLUMNAS_CLIENTES.TELEFONO_SECUNDARIO]: "",
    [COLUMNAS_CLIENTES.DIRECCION]: "Carrera 33 # 40-20 Centro",
    [COLUMNAS_CLIENTES.ES_FE]: "SI",
    [COLUMNAS_CLIENTES.TIPO_DOC]: "NIT",
    [COLUMNAS_CLIENTES.DV]: "3",
    [COLUMNAS_CLIENTES.RAZON_SOCIAL]: "ACADEMIA DE BAILE JOROPO Y TRADICION SAS",
    [COLUMNAS_CLIENTES.EMAIL]: "facturacion@joropoytradicion.com",
    [COLUMNAS_CLIENTES.RESPONSABILIDAD]: "O-48",
    [COLUMNAS_CLIENTES.MUNICIPIO]: "Villavicencio - Meta",
    [COLUMNAS_CLIENTES.CODIGO_DANE]: "50001",
    [COLUMNAS_CLIENTES.NOTAS]: "Requiere factura electrónica con copia al correo",
  },
];

/**
 * ============================================================================
 * UTILIDADES DE SANITIZACIÓN Y NORMALIZACIÓN ROBUSTA
 * ============================================================================
 */

export function limpiarTexto(val: any, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}

export function limpiarNumero(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const str = String(val).trim();
  if (!str) return fallback;
  // Quitar signo de pesos, espacios y caracteres no numéricos excepto coma y punto
  const limpio = str.replace(/[^0-9.,-]/g, "");
  // Si contiene puntos y comas (ej 150.000,00 o 150,000.00)
  if (limpio.includes(".") && limpio.includes(",")) {
    // Si el punto viene antes de la coma: formato colombiano/europeo
    if (limpio.indexOf(".") < limpio.indexOf(",")) {
      const normalizado = limpio.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(normalizado);
      return isNaN(n) ? fallback : n;
    } else {
      const normalizado = limpio.replace(/,/g, "");
      const n = parseFloat(normalizado);
      return isNaN(n) ? fallback : n;
    }
  }
  // Si solo tiene puntos (ej: 150.000) asumimos separador de miles si no tiene decimales
  if (limpio.includes(".") && !limpio.includes(",")) {
    const partes = limpio.split(".");
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      const n = parseFloat(limpio.replace(/\./g, ""));
      return isNaN(n) ? fallback : n;
    }
  }
  // Si solo tiene comas (ej: 150,000)
  if (limpio.includes(",") && !limpio.includes(".")) {
    const partes = limpio.split(",");
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      const n = parseFloat(limpio.replace(/,/g, ""));
      return isNaN(n) ? fallback : n;
    }
    const n = parseFloat(limpio.replace(",", "."));
    return isNaN(n) ? fallback : n;
  }

  const num = parseFloat(limpio);
  return isNaN(num) ? fallback : num;
}

export function sanitizarTelefono(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/\D/g, "");
  return str;
}

export function esBooleanoVerdadero(val: any): boolean {
  if (val === true || val === 1) return true;
  if (!val) return false;
  const str = String(val).trim().toUpperCase();
  return ["SI", "S", "TRUE", "1", "YES", "Y"].includes(str);
}

/**
 * ============================================================================
 * LECTORES INTELIGENTES CON TOLERANCIA A ENCABEZADOS
 * ============================================================================
 */

export interface FilaInventarioNormalizada {
  codigo: string;
  nombre: string;
  tipo: "VENTA" | "ALQUILER";
  precioBase: number;
  categoria: string;
  talla: string | null;
  color: string | null;
  stockActual: number;
  tarifaMoraPorDia: number;
  tarifaMoraPorHora: number;
  estadoPrenda: "DISPONIBLE" | "ALQUILADO" | "SEPARADO" | "EN_ARREGLO" | "INACTIVO";
  descripcion: string | null;
}

export function extraerFilaInventario(row: Record<string, any>): FilaInventarioNormalizada | null {
  // Normalizar nombres de columnas a mayúsculas sin espacios
  const mapa: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const k = key.trim().toUpperCase();
    mapa[k] = val;
  }

  const buscar = (prefijos: string[]): any => {
    for (const pref of prefijos) {
      for (const [k, v] of Object.entries(mapa)) {
        if (k === pref || k.startsWith(pref) || k.includes(pref)) {
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            return v;
          }
        }
      }
    }
    return undefined;
  };

  const rawCodigo = buscar(["CODIGO_REFERENCIA", "CODIGO", "REFERENCIA", "REF"]);
  const rawNombre = buscar(["NOMBRE_PRODUCTO", "NOMBRE", "DESCRIPCION_PRODUCTO", "PRODUCTO"]);
  const rawTipo = buscar(["TIPO_MODALIDAD", "TIPO", "MODALIDAD"]);
  const rawPrecio = buscar(["PRECIO_BASE", "PRECIO", "VALOR", "CANON"]);

  const codigo = limpiarTexto(rawCodigo);
  const nombre = limpiarTexto(rawNombre);
  const precio = limpiarNumero(rawPrecio, 0);

  let tipoStr = limpiarTexto(rawTipo).toUpperCase();
  let tipo: "VENTA" | "ALQUILER" = "ALQUILER";
  if (tipoStr.includes("VENTA")) {
    tipo = "VENTA";
  } else if (tipoStr.includes("ALQUILER")) {
    tipo = "ALQUILER";
  }

  // Si no tiene código ni nombre, es una fila en blanco
  if (!codigo && !nombre) {
    return null;
  }

  const categoria = limpiarTexto(buscar(["CATEGORIA", "LINEA"]), "General");
  const talla = limpiarTexto(buscar(["TALLA", "SIZE"])) || null;
  const color = limpiarTexto(buscar(["COLOR"])) || null;
  const stock = Math.max(0, Math.floor(limpiarNumero(buscar(["STOCK_CANTIDAD", "STOCK", "CANTIDAD"]), 1)));
  const moraDia = Math.max(0, limpiarNumero(buscar(["TARIFA_MORA_DIARIA", "MORA_DIARIA", "MORA_DIA"]), 0));
  const moraHora = Math.max(0, limpiarNumero(buscar(["TARIFA_MORA_HORA", "MORA_HORA"]), 0));

  let estadoStr = limpiarTexto(buscar(["ESTADO_PRENDA", "ESTADO"])).toUpperCase();
  let estadoPrenda: "DISPONIBLE" | "ALQUILADO" | "SEPARADO" | "EN_ARREGLO" | "INACTIVO" = "DISPONIBLE";
  if (estadoStr.includes("ALQUIL")) estadoPrenda = "ALQUILADO";
  else if (estadoStr.includes("SEPAR")) estadoPrenda = "SEPARADO";
  else if (estadoStr.includes("ARREGL") || estadoStr.includes("MANTEN")) estadoPrenda = "EN_ARREGLO";
  else if (estadoStr.includes("INACT")) estadoPrenda = "INACTIVO";
  else estadoPrenda = "DISPONIBLE";

  const descripcion = limpiarTexto(buscar(["DESCRIPCION_NOTAS", "NOTAS", "OBSERVACIONES"])) || null;

  return {
    codigo,
    nombre,
    tipo,
    precioBase: precio,
    categoria,
    talla,
    color,
    stockActual: stock,
    tarifaMoraPorDia: moraDia,
    tarifaMoraPorHora: moraHora,
    estadoPrenda,
    descripcion,
  };
}

export interface FilaClienteNormalizada {
  documento: string;
  nombre: string;
  telefono: string;
  telefonoSecundario: string | null;
  direccion: string | null;
  esResponsableIVA: boolean;
  tipoIdentificacion: string;
  digitoVerificacion: string | null;
  razonSocial: string | null;
  email: string | null;
  responsabilidadFiscal: string;
  municipio: string;
  codigoDaneMunicipio: string;
  notas: string | null;
}

export function extraerFilaCliente(row: Record<string, any>): FilaClienteNormalizada | null {
  const mapa: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const k = key.trim().toUpperCase();
    mapa[k] = val;
  }

  const buscar = (prefijos: string[]): any => {
    for (const pref of prefijos) {
      for (const [k, v] of Object.entries(mapa)) {
        if (k === pref || k.startsWith(pref) || k.includes(pref)) {
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            return v;
          }
        }
      }
    }
    return undefined;
  };

  const rawDoc = buscar(["DOCUMENTO_O_NIT", "DOCUMENTO", "NIT", "CEDULA", "IDENTIFICACION", "DOC"]);
  const rawNombre = buscar(["NOMBRE_COMPLETO", "NOMBRE", "CLIENTE", "NOMBRES"]);
  const rawTel = buscar(["TELEFONO_PRIMARIO", "TELEFONO", "CELULAR", "TEL_1", "MOVIL"]);

  const documento = limpiarTexto(rawDoc);
  const nombre = limpiarTexto(rawNombre);
  const telefono = sanitizarTelefono(rawTel);

  // Si no tiene datos básicos en absoluto, es fila en blanco
  if (!documento && !nombre && !telefono) {
    return null;
  }

  const rawTel2 = buscar(["TELEFONO_SECUNDARIO", "TEL_2", "TELEFONO_2", "CELULAR_2"]);
  const telefonoSecundario = sanitizarTelefono(rawTel2) || null;
  const direccion = limpiarTexto(buscar(["DIRECCION"])) || null;

  const rawEsFE = buscar(["ES_FACTURACION_ELECTRONICA_CONTRIBUYENTE", "FACTURACION_ELECTRONICA", "RESPONSABLE_IVA", "ES_CONTRIBUYENTE"]);
  const esResponsableIVA = esBooleanoVerdadero(rawEsFE);

  let rawTipoDoc = limpiarTexto(buscar(["TIPO_DOCUMENTO", "TIPO_DOC", "TIPO_IDENTIFICACION"])).toUpperCase();
  let tipoIdentificacion = "CC";
  if (rawTipoDoc) {
    if (rawTipoDoc.includes("NIT")) tipoIdentificacion = "NIT";
    else if (rawTipoDoc.includes("CE")) tipoIdentificacion = "CE";
    else if (rawTipoDoc.includes("PASAP")) tipoIdentificacion = "PASAPORTE";
    else if (rawTipoDoc.includes("TI")) tipoIdentificacion = "TI";
    else tipoIdentificacion = rawTipoDoc;
  } else if (esResponsableIVA) {
    // Si es responsable de IVA y el documento parece NIT o es empresa, sugerir NIT
    tipoIdentificacion = "NIT";
  }

  let digitoVerificacion = limpiarTexto(buscar(["DIGITO_VERIFICACION", "DV", "DIGITO"])) || null;
  if (!digitoVerificacion && tipoIdentificacion === "NIT" && documento) {
    const dvCalc = calcularDigitoVerificacionDIAN(documento);
    if (dvCalc) digitoVerificacion = dvCalc;
  }

  let razonSocial = limpiarTexto(buscar(["RAZON_SOCIAL_LEGAL", "RAZON_SOCIAL", "EMPRESA"])) || null;
  if (!razonSocial && esResponsableIVA) {
    razonSocial = nombre;
  }

  const email = limpiarTexto(buscar(["CORREO_ELECTRONICO", "CORREO", "EMAIL"])) || null;

  let responsabilidadFiscal = limpiarTexto(buscar(["RESPONSABILIDAD_FISCAL_DIAN", "RESPONSABILIDAD_FISCAL", "RESPONSABILIDAD"])).toUpperCase();
  if (!responsabilidadFiscal) {
    responsabilidadFiscal = esResponsableIVA ? "O-48" : "O-99";
  }

  const municipio = limpiarTexto(buscar(["MUNICIPIO", "CIUDAD"]), "Villavicencio - Meta");
  const codigoDaneMunicipio = limpiarTexto(buscar(["CODIGO_DANE_MUNICIPIO", "CODIGO_DANE", "DANE"]), "50001");
  const notas = limpiarTexto(buscar(["NOTAS_OBSERVACIONES", "NOTAS", "OBSERVACIONES"])) || null;

  return {
    documento,
    nombre,
    telefono,
    telefonoSecundario,
    direccion,
    esResponsableIVA,
    tipoIdentificacion,
    digitoVerificacion,
    razonSocial,
    email,
    responsabilidadFiscal,
    municipio,
    codigoDaneMunicipio,
    notas,
  };
}

/**
 * ============================================================================
 * CONSTRUCTORES DE LIBROS EXCEL (PLANTILLAS Y EXPORTACIONES)
 * ============================================================================
 */

export function generarExcelPlantillaInventario(): Buffer {
  const wb = XLSX.utils.book_new();

  // Hoja 1: INVENTARIO con ejemplos
  const wsInventario = XLSX.utils.json_to_sheet(EJEMPLOS_PLANTILLA_INVENTARIO);
  // Ajustar ancho de columnas
  wsInventario["!cols"] = [
    { wch: 28 }, // CODIGO
    { wch: 38 }, // NOMBRE
    { wch: 30 }, // TIPO
    { wch: 22 }, // PRECIO
    { wch: 20 }, // CATEGORIA
    { wch: 15 }, // TALLA
    { wch: 18 }, // COLOR
    { wch: 20 }, // STOCK
    { wch: 28 }, // MORA_DIARIA
    { wch: 26 }, // MORA_HORA
    { wch: 30 }, // ESTADO
    { wch: 45 }, // DESCRIPCION
  ];
  XLSX.utils.book_append_sheet(wb, wsInventario, "INVENTARIO");

  // Hoja 2: GUIA_CAMPOS_OBLIGATORIOS
  const wsGuia = XLSX.utils.json_to_sheet(GUIA_CAMPOS_INVENTARIO);
  wsGuia["!cols"] = [
    { wch: 35 },
    { wch: 16 },
    { wch: 55 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGuia, "GUIA_CAMPOS_OBLIGATORIOS");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function generarExcelExportacionInventario(productos: any[]): Buffer {
  const wb = XLSX.utils.book_new();

  const filas = productos.map((prod) => ({
    [COLUMNAS_INVENTARIO.CODIGO]: prod.codigo,
    [COLUMNAS_INVENTARIO.NOMBRE]: prod.nombre,
    [COLUMNAS_INVENTARIO.TIPO]: prod.tipo === "VENTA" ? "VENTA" : "ALQUILER",
    [COLUMNAS_INVENTARIO.PRECIO]: prod.tipo === "VENTA" ? prod.precioVenta || prod.precioBase : prod.precioAlquilerBase || prod.precioBase,
    [COLUMNAS_INVENTARIO.CATEGORIA]: prod.categoria || "General",
    [COLUMNAS_INVENTARIO.TALLA]: prod.talla || "",
    [COLUMNAS_INVENTARIO.COLOR]: prod.color || "",
    [COLUMNAS_INVENTARIO.STOCK]: prod.stockActual ?? 1,
    [COLUMNAS_INVENTARIO.MORA_DIARIA]: prod.tarifaMoraPorDia || (prod.unidadMora === "DIA" ? prod.tarifaMora : 0) || 0,
    [COLUMNAS_INVENTARIO.MORA_HORA]: prod.tarifaMoraPorHora || (prod.unidadMora === "HORA" ? prod.tarifaMora : 0) || 0,
    [COLUMNAS_INVENTARIO.ESTADO]: prod.estadoPrenda || prod.estado || "DISPONIBLE",
    [COLUMNAS_INVENTARIO.DESCRIPCION]: prod.descripcion || "",
  }));

  const ws = XLSX.utils.json_to_sheet(filas.length > 0 ? filas : EJEMPLOS_PLANTILLA_INVENTARIO);
  ws["!cols"] = [
    { wch: 28 },
    { wch: 38 },
    { wch: 30 },
    { wch: 22 },
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 28 },
    { wch: 26 },
    { wch: 30 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "INVENTARIO");

  const wsGuia = XLSX.utils.json_to_sheet(GUIA_CAMPOS_INVENTARIO);
  wsGuia["!cols"] = [{ wch: 35 }, { wch: 16 }, { wch: 55 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsGuia, "GUIA_CAMPOS_OBLIGATORIOS");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function generarExcelPlantillaClientes(): Buffer {
  const wb = XLSX.utils.book_new();

  // Hoja 1: CLIENTES con ejemplos
  const wsClientes = XLSX.utils.json_to_sheet(EJEMPLOS_PLANTILLA_CLIENTES);
  wsClientes["!cols"] = [
    { wch: 26 }, // DOCUMENTO
    { wch: 38 }, // NOMBRE
    { wch: 26 }, // TELEFONO
    { wch: 24 }, // TELEFONO_SECUNDARIO
    { wch: 35 }, // DIRECCION
    { wch: 36 }, // ES_FE
    { wch: 28 }, // TIPO_DOC
    { wch: 28 }, // DV
    { wch: 38 }, // RAZON_SOCIAL
    { wch: 35 }, // EMAIL
    { wch: 34 }, // RESPONSABILIDAD
    { wch: 26 }, // MUNICIPIO
    { wch: 24 }, // CODIGO_DANE
    { wch: 40 }, // NOTAS
  ];
  XLSX.utils.book_append_sheet(wb, wsClientes, "CLIENTES");

  // Hoja 2: GUIA_CAMPOS_Y_DIAN
  const wsGuia = XLSX.utils.json_to_sheet(GUIA_CAMPOS_CLIENTES);
  wsGuia["!cols"] = [
    { wch: 35 },
    { wch: 18 },
    { wch: 16 },
    { wch: 55 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGuia, "GUIA_CAMPOS_Y_DIAN");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function generarExcelExportacionClientes(clientes: any[]): Buffer {
  const wb = XLSX.utils.book_new();

  const filas = clientes.map((cli) => ({
    [COLUMNAS_CLIENTES.DOCUMENTO]: cli.documento,
    [COLUMNAS_CLIENTES.NOMBRE]: cli.nombre,
    [COLUMNAS_CLIENTES.TELEFONO]: cli.telefono || "",
    [COLUMNAS_CLIENTES.TELEFONO_SECUNDARIO]: cli.telefonoSecundario || "",
    [COLUMNAS_CLIENTES.DIRECCION]: cli.direccion || "",
    [COLUMNAS_CLIENTES.ES_FE]: cli.esResponsableIVA ? "SI" : "NO",
    [COLUMNAS_CLIENTES.TIPO_DOC]: cli.tipoIdentificacion || "CC",
    [COLUMNAS_CLIENTES.DV]: cli.digitoVerificacion || "",
    [COLUMNAS_CLIENTES.RAZON_SOCIAL]: cli.razonSocial || "",
    [COLUMNAS_CLIENTES.EMAIL]: cli.email || "",
    [COLUMNAS_CLIENTES.RESPONSABILIDAD]: cli.responsabilidadFiscal || (cli.esResponsableIVA ? "O-48" : "O-99"),
    [COLUMNAS_CLIENTES.MUNICIPIO]: cli.municipio || "Villavicencio - Meta",
    [COLUMNAS_CLIENTES.CODIGO_DANE]: cli.codigoDaneMunicipio || "50001",
    [COLUMNAS_CLIENTES.NOTAS]: cli.notas || "",
  }));

  const ws = XLSX.utils.json_to_sheet(filas.length > 0 ? filas : EJEMPLOS_PLANTILLA_CLIENTES);
  ws["!cols"] = [
    { wch: 26 },
    { wch: 38 },
    { wch: 26 },
    { wch: 24 },
    { wch: 35 },
    { wch: 36 },
    { wch: 28 },
    { wch: 28 },
    { wch: 38 },
    { wch: 35 },
    { wch: 34 },
    { wch: 26 },
    { wch: 24 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "CLIENTES");

  const wsGuia = XLSX.utils.json_to_sheet(GUIA_CAMPOS_CLIENTES);
  wsGuia["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 16 }, { wch: 55 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsGuia, "GUIA_CAMPOS_Y_DIAN");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
