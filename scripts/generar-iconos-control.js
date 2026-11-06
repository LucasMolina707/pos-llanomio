/**
 * GENERADOR DE ICONOS .ICO PERSONALIZADOS PARA CONTROL DEL SERVIDOR POS
 * POS LLANOMIO
 *
 * Genera 5 archivos .ico de 48x48 píxeles en formato nativo de Windows (RGBA 32 bits):
 * 1. icono_iniciar_verde.ico         (Play ▶ - Iniciar / Levantar Servidor)
 * 2. icono_detener_rojo.ico          (Stop ■ - Detener / Pausar Servidor)
 * 3. icono_reiniciar_azul.ico        (Refresh ↻ - Reiniciar Sitio Rápido)
 * 4. icono_autoarranque_ambar.ico    (Bolt ⚡ - Auto-Arranque con Windows)
 * 5. icono_pantalla_completa_indigo.ico (Screen 🖥 - Abrir Pantalla Completa POS)
 */

const fs = require("fs");
const path = require("path");

const DIR_DESTINO = path.resolve(__dirname, "..", "instalador_tienda", "iconos");

/**
 * Crea un búfer binario en formato ICO nativo de Windows (32-bit BGRA)
 */
function crearIconoWindows(ancho, alto, dibujadorPixel) {
  const HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const BMP_INFO_SIZE = 40;

  const rowSizeXor = ancho * 4;
  const xorSize = rowSizeXor * alto;

  // Máscara AND de 1 bit por pixel, alineada a múltiplos de 4 bytes (32 bits)
  const andRowBytes = Math.ceil(ancho / 32) * 4;
  const andSize = andRowBytes * alto;

  const imageSize = BMP_INFO_SIZE + xorSize + andSize;
  const totalFileSize = HEADER_SIZE + DIR_ENTRY_SIZE + imageSize;

  const buf = Buffer.alloc(totalFileSize);

  // 1. ICONDIR (6 bytes)
  buf.writeUInt16LE(0, 0); // Reservado
  buf.writeUInt16LE(1, 2); // Tipo 1 = Icono
  buf.writeUInt16LE(1, 4); // Número de imágenes = 1

  // 2. ICONDIRENTRY (16 bytes)
  const offset = HEADER_SIZE;
  buf.writeUInt8(ancho === 256 ? 0 : ancho, offset + 0);
  buf.writeUInt8(alto === 256 ? 0 : alto, offset + 1);
  buf.writeUInt8(0, offset + 2); // Paleta
  buf.writeUInt8(0, offset + 3); // Reservado
  buf.writeUInt16LE(1, offset + 4); // Planos de color
  buf.writeUInt16LE(32, offset + 6); // Bits por pixel (RGBA)
  buf.writeUInt32LE(imageSize, offset + 8); // Tamaño imagen
  buf.writeUInt32LE(HEADER_SIZE + DIR_ENTRY_SIZE, offset + 12); // Offset de la imagen

  // 3. BITMAPINFOHEADER (40 bytes)
  const bmpOffset = HEADER_SIZE + DIR_ENTRY_SIZE;
  buf.writeUInt32LE(40, bmpOffset + 0); // biSize
  buf.writeInt32LE(ancho, bmpOffset + 4); // biWidth
  buf.writeInt32LE(alto * 2, bmpOffset + 8); // biHeight (duplicado en ICO para XOR + AND)
  buf.writeUInt16LE(1, bmpOffset + 12); // biPlanes
  buf.writeUInt16LE(32, bmpOffset + 14); // biBitCount
  buf.writeUInt32LE(0, bmpOffset + 16); // biCompression = BI_RGB
  buf.writeUInt32LE(xorSize, bmpOffset + 20); // biSizeImage
  buf.writeInt32LE(0, bmpOffset + 24); // biXPelsPerMeter
  buf.writeInt32LE(0, bmpOffset + 28); // biYPelsPerMeter
  buf.writeUInt32LE(0, bmpOffset + 32); // biClrUsed
  buf.writeUInt32LE(0, bmpOffset + 36); // biClrImportant

  // 4. Pixel data XOR (BGRA bottom-up)
  const xorOffset = bmpOffset + BMP_INFO_SIZE;
  const andOffset = xorOffset + xorSize;

  // Inicializar máscara AND en 1 (transparente)
  buf.fill(0xff, andOffset, andOffset + andSize);

  for (let y = 0; y < alto; y++) {
    // BMP se almacena de abajo hacia arriba: y=0 en BMP es la fila inferior
    const yBmp = y;
    const yTopDown = alto - 1 - y;

    for (let x = 0; x < ancho; x++) {
      const pixel = dibujadorPixel(x, yTopDown, ancho, alto);
      const pxOffset = xorOffset + yBmp * rowSizeXor + x * 4;

      // BGRA
      buf.writeUInt8(pixel.b, pxOffset + 0);
      buf.writeUInt8(pixel.g, pxOffset + 1);
      buf.writeUInt8(pixel.r, pxOffset + 2);
      buf.writeUInt8(pixel.a, pxOffset + 3);

      // Si el pixel no es totalmente transparente (a > 30), poner bit de máscara AND en 0
      if (pixel.a > 30) {
        const byteIndex = andOffset + yBmp * andRowBytes + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);
        buf[byteIndex] &= ~(1 << bitIndex);
      }
    }
  }

  return buf;
}

/**
 * Funciones de rasterizado con suavizado (Anti-Aliasing)
 */
function dibujarCirculoConIcono(x, y, ancho, alto, colorFondo, dibujadorSimbolo) {
  const centroX = ancho / 2;
  const centroY = alto / 2;
  const radio = (ancho / 2) - 3;

  const dx = x - centroX;
  const dy = y - centroY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Fuera del círculo
  if (dist > radio + 1.2) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Antialiasing del borde exterior del círculo
  let alphaBorde = 1.0;
  if (dist > radio - 0.8) {
    alphaBorde = Math.max(0, Math.min(1, (radio + 1.2 - dist) / 2.0));
  }

  // Verificar si cae dentro del símbolo blanco
  const enSimbolo = dibujadorSimbolo(x - centroX, y - centroY, ancho, alto);

  if (enSimbolo > 0) {
    // Símbolo blanco con antialiasing
    const simAlpha = Math.min(1, enSimbolo);
    const r = Math.round(255 * simAlpha + colorFondo.r * (1 - simAlpha));
    const g = Math.round(255 * simAlpha + colorFondo.g * (1 - simAlpha));
    const b = Math.round(255 * simAlpha + colorFondo.b * (1 - simAlpha));
    return { r, g, b, a: Math.round(255 * alphaBorde) };
  }

  // Degradado sutil en el fondo (luz superior a sombra inferior)
  const factorLuz = 1.0 + (dy / alto) * -0.15;
  const r = Math.min(255, Math.max(0, Math.round(colorFondo.r * factorLuz)));
  const g = Math.min(255, Math.max(0, Math.round(colorFondo.g * factorLuz)));
  const b = Math.min(255, Math.max(0, Math.round(colorFondo.b * factorLuz)));

  return { r, g, b, a: Math.round(255 * alphaBorde) };
}

// 1. Símbolo PLAY ▶ (Triángulo orientado a la derecha)
function simboloPlay(x, y) {
  // Coordenadas relativas al centro (-24 a 24)
  // Vértices del triángulo: (-6, -11), (-6, 11), (11, 0)
  const x1 = -6, y1 = -11;
  const x2 = -6, y2 = 11;
  const x3 = 11, y3 = 0;

  // Prueba de punto dentro del triángulo
  const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denom;
  const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denom;
  const c = 1 - a - b;

  if (a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1) {
    return 1.0;
  }
  return 0;
}

// 2. Símbolo STOP ■ (Cuadrado con bordes suaves)
function simboloStop(x, y) {
  const tam = 9.5;
  if (Math.abs(x) <= tam && Math.abs(y) <= tam) {
    return 1.0;
  }
  return 0;
}

// 3. Símbolo REFRESH ↻ (Flecha circular)
function simboloRefresh(x, y) {
  const dist = Math.sqrt(x * x + y * y);
  const rExt = 11;
  const rInt = 7;

  // Arco circular (3/4 de círculo)
  const ang = Math.atan2(y, x);
  const enArco = dist >= rInt && dist <= rExt && !(ang > -0.8 && ang < 0.8 && dist > 8);

  if (enArco) {
    return 1.0;
  }

  // Punta de flecha en el cuadrante superior derecho
  if (x >= 4 && x <= 12 && y >= -13 && y <= -5) {
    const fx = x - 7;
    const fy = y - (-9);
    if (fx + fy >= -4 && fx - fy <= 5 && fy <= 2) {
      return 1.0;
    }
  }

  return 0;
}

// 4. Símbolo RAYO / ENGRANAJE ⚡ (Rayo de autoarranque / potencia)
function simboloRayo(x, y) {
  // Trapezoide superior: (-2, -12) a (7, -12) bajando hacia (-4, 0)
  // Trapezoide inferior: (4, 0) bajando a (-5, 12)
  if (y <= 0 && y >= -12) {
    const limIzq = -4 + (y / -12) * -2;
    const limDer = 5 + (y / -12) * 2;
    if (x >= limIzq && x <= limDer) return 1.0;
  }
  if (y >= 0 && y <= 12) {
    const limIzq = -5 + ((12 - y) / 12) * 9;
    const limDer = 2 + ((12 - y) / 12) * 2;
    if (x >= limIzq && x <= limDer) return 1.0;
  }
  return 0;
}

// 5. Símbolo MONITOR / PANTALLA COMPLETA 🖥 (Pantalla con marco y base)
function simboloMonitor(x, y) {
  // Pantalla marco exterior: -12 a 12 en X, -10 a 5 en Y
  if (Math.abs(x) <= 12 && y >= -10 && y <= 5) {
    // Bisel / Hueco interior
    if (Math.abs(x) <= 9.5 && y >= -7.5 && y <= 2.5) {
      return 0; // Hueco interior transparente
    }
    return 1.0; // Marco exterior
  }

  // Cuello del monitor
  if (Math.abs(x) <= 2 && y >= 5 && y <= 8) {
    return 1.0;
  }

  // Base del monitor
  if (Math.abs(x) <= 7 && y >= 8 && y <= 10.5) {
    return 1.0;
  }

  return 0;
}

async function generarTodosLosIconos() {
  console.log("=================================================================");
  console.log("GENERADOR DE ICONOS .ICO PERSONALIZADOS PARA BOTONERA POS");
  console.log("=================================================================\n");

  if (!fs.existsSync(DIR_DESTINO)) {
    fs.mkdirSync(DIR_DESTINO, { recursive: true });
  }

  const definiciones = [
    {
      archivo: "icono_iniciar_verde.ico",
      nombre: "Botón 1: Iniciar Servidor (Esmeralda Play)",
      color: { r: 5, g: 150, b: 105 }, // Emerald-600
      simbolo: simboloPlay,
    },
    {
      archivo: "icono_detener_rojo.ico",
      nombre: "Botón 2: Detener/Pausar Servidor (Coral Stop)",
      color: { r: 220, g: 38, b: 38 }, // Red-600
      simbolo: simboloStop,
    },
    {
      archivo: "icono_reiniciar_azul.ico",
      nombre: "Botón 3: Reiniciar Servidor Rápido (Azul Cobalto Refresh)",
      color: { r: 37, g: 99, b: 235 }, // Blue-600
      simbolo: simboloRefresh,
    },
    {
      archivo: "icono_autoarranque_ambar.ico",
      nombre: "Botón 4: Auto-Arranque con Windows (Ámbar Rayo)",
      color: { r: 217, g: 119, b: 6 }, // Amber-600
      simbolo: simboloRayo,
    },
    {
      archivo: "icono_pantalla_completa_indigo.ico",
      nombre: "Botón 5: Terminal POS Pantalla Completa (Índigo Monitor)",
      color: { r: 79, g: 70, b: 229 }, // Indigo-600
      simbolo: simboloMonitor,
    },
  ];

  for (const def of definiciones) {
    const ruta = path.join(DIR_DESTINO, def.archivo);
    const buffer = crearIconoWindows(48, 48, (x, y, w, h) =>
      dibujarCirculoConIcono(x, y, w, h, def.color, def.simbolo)
    );
    fs.writeFileSync(ruta, buffer);
    console.log(`[OK] Generado: ${def.archivo} (${buffer.length} bytes) - ${def.nombre}`);
  }

  // Copia de seguridad en carpeta de recursos del instalador
  const rutaRecursos = path.resolve(__dirname, "..", "instalador_tienda", "recursos");
  if (fs.existsSync(rutaRecursos)) {
    for (const def of definiciones) {
      const src = path.join(DIR_DESTINO, def.archivo);
      const dest = path.join(rutaRecursos, def.archivo);
      fs.copyFileSync(src, dest);
    }
    console.log("[OK] Duplicados en instalador_tienda/recursos/ para respaldo.");
  }

  console.log("\n=================================================================");
  console.log("LOS 5 ICONOS .ICO FUERON GENERADOS EXITOSAMENTE");
  console.log("=================================================================\n");
}

if (require.main === module) {
  generarTodosLosIconos().catch((err) => {
    console.error("[ERROR]", err);
    process.exit(1);
  });
}

module.exports = { generarTodosLosIconos };

