/**
 * GENERADOR OFFLINE DE CÓDIGO QR EN RED LOCAL
 * POS LLANOMIO
 *
 * Genera una imagen PNG del código QR localmente sin conexión a internet
 * utilizando la librería 'qrcode' instalada en el proyecto.
 *
 * Uso:
 *   node scripts/generar-qr-local.js "<texto_o_url>" "<ruta_salida_png>"
 */

const qrcode = require("qrcode");
const path = require("path");
const fs = require("fs");

async function main() {
  const args = process.argv.slice(2);
  const texto = args[0] || "http://localhost:3000";
  const rutaSalida = args[1]
    ? path.resolve(args[1])
    : path.join(__dirname, "..", ".tmp", "qr_lan.png");

  const dir = path.dirname(rutaSalida);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await qrcode.toFile(rutaSalida, texto, {
    width: 240,
    margin: 1,
    color: {
      dark: "#0f172a", // Slate 900
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });

  console.log(JSON.stringify({ success: true, ruta: rutaSalida, texto }));
}

main().catch((err) => {
  console.error(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
