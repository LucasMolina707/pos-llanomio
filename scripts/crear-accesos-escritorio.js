/**
 * CREADOR DE ACCESOS DIRECTOS (.LNK) CON ICONOS PERSONALIZADOS EN EL ESCRITORIO
 * POS LLANOMIO
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DIR_INICIADORES = path.join(PROJECT_ROOT, "instalador_tienda", "2_INICIADORES_Y_ACTIVADORES");
const DIR_ICONOS = path.join(PROJECT_ROOT, "instalador_tienda", "iconos");

// Asegurar que los iconos existan
try {
  const { generarTodosLosIconos } = require("./generar-iconos-control.js");
  generarTodosLosIconos();
} catch {}

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

const DEFINICIONES_BOTONES = [
  {
    nombreLnk: "1. Inicializar Sitio POS (Levantar si Cayo).lnk",
    scriptBat: "1_INICIALIZAR_SITIO_POS.bat",
    iconoIco: "icono_iniciar_verde.ico",
    descripcion: "Verifica integridad, levanta PM2 y abre el servidor POS Llanomio",
  },
  {
    nombreLnk: "2. Detener y Pausar Servidor POS.lnk",
    scriptBat: "2_DETENER_PAUSAR_SERVIDOR_POS.bat",
    iconoIco: "icono_detener_rojo.ico",
    descripcion: "Crea respaldo de seguridad y detiene temporalmente el servidor",
  },
  {
    nombreLnk: "3. Reiniciar Sitio POS (Optimizar Velocidad).lnk",
    scriptBat: "3_REINICIAR_SITIO_RAPIDO_POS.bat",
    iconoIco: "icono_reiniciar_azul.ico",
    descripcion: "Limpia cachés, ejecuta checkpoint WAL y reinicia procesos PM2",
  },
  {
    nombreLnk: "4. Activar Inicio Automatico con Windows.lnk",
    scriptBat: "4_ACTIVAR_INICIO_AUTOMATICO_PC.bat",
    iconoIco: "icono_autoarranque_ambar.ico",
    descripcion: "Configura arranque desatendido de Windows y tarea programada",
  },
  {
    nombreLnk: "5. Abrir Terminal POS Pantalla Completa.lnk",
    scriptBat: "5_ABRIR_POS_PANTALLA_COMPLETA.bat",
    iconoIco: "icono_pantalla_completa_indigo.ico",
    descripcion: "Abre el POS en modo aplicación nativa sin barras de navegador",
  },
];

function crearAccesosDirectos() {
  console.log("=================================================================");
  console.log("CREANDO LOS 5 ACCESOS DIRECTOS CON ICONOS PERSONALIZADOS");
  console.log("=================================================================\n");

  const escritorios = obtenerRutasEscritorio();

  for (const escritorio of escritorios) {
    console.log(`[ESCRITORIO] Generando accesos en: ${escritorio}`);

    for (const btn of DEFINICIONES_BOTONES) {
      const rutaLnk = path.join(escritorio, btn.nombreLnk);
      const rutaBat = path.join(DIR_INICIADORES, btn.scriptBat);
      const rutaIco = path.join(DIR_ICONOS, btn.iconoIco);

      if (!fs.existsSync(rutaBat)) {
        console.warn(`[AVISO] No se encontró el script bat: ${rutaBat}`);
        continue;
      }

      // Script PowerShell para instanciar WScript.Shell y generar el acceso directo .lnk
      const psCmd = `
        $ws = New-Object -ComObject WScript.Shell;
        $s = $ws.CreateShortcut('${rutaLnk.replace(/'/g, "''")}');
        $s.TargetPath = '${rutaBat.replace(/'/g, "''")}';
        $s.WorkingDirectory = '${PROJECT_ROOT.replace(/'/g, "''")}';
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
        console.log(`[OK] Creado: ${btn.nombreLnk} -> Icono: ${btn.iconoIco}`);
      } catch (err) {
        console.error(`[ERROR] No se pudo crear ${btn.nombreLnk}:`, err.message);
      }
    }
  }

  // También crear accesos directos en la raíz de instalador_tienda/2_INICIADORES_Y_ACTIVADORES/
  for (const btn of DEFINICIONES_BOTONES) {
    const rutaLnkLocal = path.join(DIR_INICIADORES, btn.nombreLnk);
    const rutaBat = path.join(DIR_INICIADORES, btn.scriptBat);
    const rutaIco = path.join(DIR_ICONOS, btn.iconoIco);

    const psCmd = `
      $ws = New-Object -ComObject WScript.Shell;
      $s = $ws.CreateShortcut('${rutaLnkLocal.replace(/'/g, "''")}');
      $s.TargetPath = '${rutaBat.replace(/'/g, "''")}';
      $s.WorkingDirectory = '${PROJECT_ROOT.replace(/'/g, "''")}';
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

  console.log("\n=================================================================");
  console.log("ACCESOS DIRECTOS CREADOS CORRECTAMENTE EN EL ESCRITORIO");
  console.log("=================================================================\n");
}

if (require.main === module) {
  crearAccesosDirectos();
}

module.exports = { crearAccesosDirectos };

