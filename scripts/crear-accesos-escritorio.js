/**
 * CREADOR DE ACCESOS DIRECTOS (.LNK) CON ICONOS PERSONALIZADOS EN EL ESCRITORIO
 * AURORA HOST POS
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function obtenerRutasEscritorio() {
  const rutas = [];
  const userProfile = process.env.USERPROFILE || "C:\\Users\\Default";

  // Escritorio estándar
  const desktopNormal = path.join(userProfile, "Desktop");
  if (fs.existsSync(desktopNormal)) rutas.push(desktopNormal);

  // Escritorio redirigido por OneDrive si aplica
  const desktopOneDrive = path.join(userProfile, "OneDrive", "Desktop");
  if (fs.existsSync(desktopOneDrive) && !rutas.includes(desktopOneDrive)) {
    rutas.push(desktopOneDrive);
  }

  // Escritorio público / all users
  const publicProfile = process.env.PUBLIC || "C:\\Users\\Public";
  const desktopPublic = path.join(publicProfile, "Desktop");
  if (fs.existsSync(desktopPublic) && !rutas.includes(desktopPublic)) {
    rutas.push(desktopPublic);
  }

  return rutas.length > 0 ? rutas : [desktopNormal];
}

const DEFINICIONES_BOTONES_AURORA = [
  {
    nombreLnk: "Iniciar Servidor POS.lnk",
    scriptExe: "Iniciar_Servidor_POS.exe",
    scriptBat: "1_INICIALIZAR_SITIO_POS.bat",
    iconoIco: "icono_iniciar_verde.ico",
    descripcion: "Iniciar Servidor y Abrir Sistema POS Llanomio",
  },
  {
    nombreLnk: "Detener Servidor POS.lnk",
    scriptExe: "Detener_Servidor_POS.exe",
    scriptBat: "2_DETENER_PAUSAR_SERVIDOR_POS.bat",
    iconoIco: "icono_detener_rojo.ico",
    descripcion: "Detener Servidor Local Aurora POS",
  },
];

function crearAccesosDirectos(directorioRaiz = null) {
  const root = directorioRaiz || path.resolve(__dirname, "..");
  const dirIniciadores = path.join(root, "instalador_tienda", "2_INICIADORES_Y_ACTIVADORES");
  const dirIconos = path.join(root, "instalador_tienda", "iconos");

  console.log("=================================================================");
  console.log("CREANDO LOS ACCESOS DIRECTOS OFICIALES DE AURORA HOST EN ESCRITORIO");
  console.log(`Directorio del Servidor: ${root}`);
  console.log("=================================================================\n");

  const escritorios = obtenerRutasEscritorio();

  for (const escritorio of escritorios) {
    console.log(`[ESCRITORIO] Generando accesos en: ${escritorio}`);

    // Limpiar accesos viejos u obsoletos en el escritorio
    const obsoletos = [
      "Reiniciar Servidor POS.lnk",
      "POS Llanomio - Recuperar y Levantar Servidor.lnk",
      "POS Llanomio - Carpeta Respaldos.lnk",
      "POS Llanomio - Panel de Control.lnk",
      "POS Llanomio - Pantalla Completa.lnk",
      "Aurora Host - Iniciar Servidor.lnk",
      "Aurora Host - Vista Pantalla Completa.lnk",
      "Aurora Host - Apagar o Pausar Servidor.lnk",
      "Aurora Host - Relanzar o Reconectar Servidor.lnk",
      "Aurora Host - Activar Inicio Automatico.lnk"
    ];
    for (const obs of obsoletos) {
      const rutaObs = path.join(escritorio, obs);
      if (fs.existsSync(rutaObs)) {
        try { fs.unlinkSync(rutaObs); } catch {}
      }
    }

    for (const btn of DEFINICIONES_BOTONES_AURORA) {
      const rutaLnk = path.join(escritorio, btn.nombreLnk);
      const targetExe = btn.scriptExe ? path.join(root, btn.scriptExe) : null;
      const targetBat = path.join(dirIniciadores, btn.scriptBat);
      const rutaFinalTarget = (targetExe && fs.existsSync(targetExe)) ? targetExe : targetBat;
      const rutaIco = path.join(dirIconos, btn.iconoIco);

      if (!fs.existsSync(rutaFinalTarget)) {
        console.warn(`[AVISO] No se encontró el ejecutable/script: ${rutaFinalTarget}`);
        continue;
      }

      const psCmd = `
        $ws = New-Object -ComObject WScript.Shell;
        $s = $ws.CreateShortcut('${rutaLnk.replace(/'/g, "''")}');
        $s.TargetPath = '${rutaFinalTarget.replace(/'/g, "''")}';
        $s.WorkingDirectory = '${root.replace(/'/g, "''")}';
        $s.Description = '${btn.descripcion.replace(/'/g, "''")}';
        if (Test-Path '${rutaIco.replace(/'/g, "''")}') {
          $s.IconLocation = '${rutaIco.replace(/'/g, "''")},0';
        }
        $s.Save();
      `.replace(/\r?\n\s*/g, " ");

      try {
        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`, {
          windowsHide: true,
        });
        console.log(`[OK] Creado: ${btn.nombreLnk}`);
      } catch (err) {
        console.error(`[ERROR] No se pudo crear ${btn.nombreLnk}:`, err.message);
      }
    }
  }

  // Sincronizar también accesos directos en instalador_tienda/2_INICIADORES_Y_ACTIVADORES/
  for (const btn of DEFINICIONES_BOTONES_AURORA) {
    const rutaLnkLocal = path.join(dirIniciadores, btn.nombreLnk);
    const rutaBat = path.join(dirIniciadores, btn.scriptBat);
    const rutaIco = path.join(dirIconos, btn.iconoIco);

    if (fs.existsSync(rutaBat)) {
      const psCmd = `
        $ws = New-Object -ComObject WScript.Shell;
        $s = $ws.CreateShortcut('${rutaLnkLocal.replace(/'/g, "''")}');
        $s.TargetPath = '${rutaBat.replace(/'/g, "''")}';
        $s.WorkingDirectory = '${root.replace(/'/g, "''")}';
        $s.Description = '${btn.descripcion.replace(/'/g, "''")}';
        if (Test-Path '${rutaIco.replace(/'/g, "''")}') {
          $s.IconLocation = '${rutaIco.replace(/'/g, "''")},0';
        }
        $s.Save();
      `.replace(/\r?\n\s*/g, " ");

      try {
        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`, {
          windowsHide: true,
        });
      } catch {}
    }
  }

  console.log("\n=================================================================");
  console.log("ACCESOS DIRECTOS DE AURORA HOST CREADOS SATISFACTORIAMENTE");
  console.log("=================================================================\n");
}

if (require.main === module) {
  const dirParam = process.argv[2] || null;
  crearAccesosDirectos(dirParam);
}

module.exports = { crearAccesosDirectos, DEFINICIONES_BOTONES_AURORA };
