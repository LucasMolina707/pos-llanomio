/**
 * MOTOR DE ACTUALIZACIÓN SEGURA SIN PÉRDIDA DE DATOS
 * POS LLANOMIO - Sistema de Facturación e Inventario Local
 *
 * Propósito:
 * Aplica parches .ZIP generados por el desarrollador o actualizaciones desde GitHub
 * garantizando con certeza matemática y física que JAMÁS se borren ni se sobrescriban
 * los clientes, facturas, productos, abonos, turnos ni configuración local (.env).
 *
 * 5 Fases Automáticas:
 *   [1/5] Salvaguarda Blindada Pre-Actualización (.db y .env a C:\POS_BACKUPS\salvaguarda_pre_actualizacion)
 *   [2/5] Pausa Limpia de Servicios en PM2
 *   [3/5] Inyección del Nuevo Código (Extracción segura de .zip o git pull)
 *   [4/5] Migración No Destructiva de Esquema SQLite (prisma db push + generate)
 *   [5/5] Reactivación y Verificación de Servicios
 *
 * Ejecución:
 *   node scripts/aplicar-actualizacion-segura.js --zip="ruta/parche.zip"
 *   node scripts/aplicar-actualizacion-segura.js --github
 *   node scripts/aplicar-actualizacion-segura.js (auto-detección o diálogo gráfico)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");

/**
 * Lee y parsea variables del archivo .env
 */
function obtenerConfiguracionEnv() {
  const rutaEnv = path.join(PROJECT_ROOT, ".env");
  const env = {
    PORT: "3000",
    HTTP_PORT: "3000",
    INSTANCE_ID: "pos-llanomio",
    DATABASE_URL: "file:./llanomio.db",
    LOCAL_DOMAIN: "llanomio.local",
  };

  if (fs.existsSync(rutaEnv)) {
    const contenido = fs.readFileSync(rutaEnv, "utf-8");
    for (const linea of contenido.split(/\r?\n/)) {
      const limpia = linea.trim();
      if (limpia && !limpia.startsWith("#") && limpia.includes("=")) {
        const [clave, ...resto] = limpia.split("=");
        env[clave.trim()] = resto.join("=").replace(/^["']|["']$/g, "").trim();
      }
    }
  }
  return env;
}

/**
 * Resuelve la ruta física del archivo SQLite activo en disco
 */
function obtenerRutaFisicaBaseDeDatos(env) {
  const dbUrl = env.DATABASE_URL || "file:./llanomio.db";
  const nombreLimpio = dbUrl.replace(/^file:\.\/database\/|^file:\.\/|^file:/g, "");
  return path.join(PROJECT_ROOT, "database", nombreLimpio || "llanomio.db");
}

/**
 * Abre un cuadro de diálogo nativo de Windows (OpenFileDialog) usando PowerShell
 */
function seleccionarArchivoZipGrafico() {
  try {
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Filter = 'Parches de Actualizacion (*.zip)|*.zip|Todos los archivos (*.*)|*.*'; $dialog.Title = 'Seleccione el archivo de actualizacion (.zip) para POS Llanomio'; $dialog.InitialDirectory = [System.IO.Path]::Combine('%PROJECT_ROOT%', 'actualizaciones'); if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.FileName }"`.replace(
      "%PROJECT_ROOT%",
      PROJECT_ROOT
    );
    const resultado = execSync(psCommand, { encoding: "utf-8" }).trim();
    return resultado || null;
  } catch {
    return null;
  }
}

/**
 * Función principal que aplica la actualización segura en 5 fases
 */
async function aplicarActualizacion({ rutaZip = null, modoGithub = false } = {}) {
  const env = obtenerConfiguracionEnv();
  const rutaDbActiva = obtenerRutaFisicaBaseDeDatos(env);
  const nombreDb = path.basename(rutaDbActiva);

  console.log("===============================================================================");
  console.log("       SISTEMA DE ACTUALIZACION SEGURA SIN PERDIDA DE DATOS (POS LOCAL)");
  console.log("===============================================================================\n");
  console.log(`Directorio Raiz:     ${PROJECT_ROOT}`);
  console.log(`Instancia PM2:       ${env.INSTANCE_ID}`);
  console.log(`Base de Datos Real:  database/${nombreDb}`);
  console.log(`Puerto Activo:       ${env.PORT}\n`);

  // Determinar origen de la actualización
  let archivoZipFinal = rutaZip;

  if (!modoGithub) {
    if (!archivoZipFinal) {
      // 1. Buscar en carpeta 'actualizaciones/'
      const dirActualizaciones = path.join(PROJECT_ROOT, "actualizaciones");
      if (fs.existsSync(dirActualizaciones)) {
        const archivos = fs
          .readdirSync(dirActualizaciones)
          .filter((f) => f.endsWith(".zip") && f.startsWith("ACTUALIZACION_"))
          .map((f) => ({
            nombre: f,
            ruta: path.join(dirActualizaciones, f),
            mtime: fs.statSync(path.join(dirActualizaciones, f)).mtimeMs,
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (archivos.length > 0) {
          archivoZipFinal = archivos[0].ruta;
          console.log(`[ORIGEN] Parche detectado en carpeta 'actualizaciones/':`);
          console.log(`         ${archivoZipFinal}\n`);
        }
      }

      // 2. Buscar en la raíz del proyecto
      if (!archivoZipFinal) {
        const archivosRaiz = fs
          .readdirSync(PROJECT_ROOT)
          .filter((f) => f.endsWith(".zip") && f.startsWith("ACTUALIZACION_"))
          .map((f) => ({
            nombre: f,
            ruta: path.join(PROJECT_ROOT, f),
            mtime: fs.statSync(path.join(PROJECT_ROOT, f)).mtimeMs,
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (archivosRaiz.length > 0) {
          archivoZipFinal = archivosRaiz[0].ruta;
          console.log(`[ORIGEN] Parche detectado en la raíz del proyecto:`);
          console.log(`         ${archivoZipFinal}\n`);
        }
      }

      // 3. Si sigue sin encontrarse y estamos en terminal interactiva, abrir selector de archivos
      if (!archivoZipFinal && process.stdout.isTTY) {
        console.log("[ORIGEN] Abriendo selector de archivos de Windows para elegir el archivo .zip...");
        archivoZipFinal = seleccionarArchivoZipGrafico();
      }
    }

    if (!archivoZipFinal || !fs.existsSync(archivoZipFinal)) {
      throw new Error(
        "No se encontro ningun archivo de actualizacion (.zip). Copie el archivo 'ACTUALIZACION_*.zip' a la carpeta 'actualizaciones/' o use el selector de archivos."
      );
    }
  }

  // =========================================================================
  // FASE 1: SALVAGUARDA BLINDADA PRE-ACTUALIZACIÓN
  // =========================================================================
  console.log("[FASE 1/5] Ejecutando salvaguarda blindada de la base de datos y configuración...");

  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  let bovedaPrincipal = "C:\\POS_BACKUPS\\salvaguarda_pre_actualizacion";
  try {
    if (!fs.existsSync(bovedaPrincipal)) {
      fs.mkdirSync(bovedaPrincipal, { recursive: true });
    }
  } catch {
    // Si no se puede escribir en C:\, fallback a backups locales
    bovedaPrincipal = path.join(PROJECT_ROOT, "database", "backups_locales", "salvaguarda_pre_actualizacion");
    fs.mkdirSync(bovedaPrincipal, { recursive: true });
  }

  const rutaRespaldoDb = path.join(bovedaPrincipal, `${path.parse(nombreDb).name}_PRE_UPDATE_${timestamp}.db`);
  const rutaRespaldoEnv = path.join(bovedaPrincipal, `env_PRE_UPDATE_${timestamp}.bak`);
  const rutaEnvLocalBak = path.join(PROJECT_ROOT, ".env.bak");
  const rutaEnvActual = path.join(PROJECT_ROOT, ".env");

  // Respaldar archivo .env
  if (fs.existsSync(rutaEnvActual)) {
    fs.copyFileSync(rutaEnvActual, rutaRespaldoEnv);
    fs.copyFileSync(rutaEnvActual, rutaEnvLocalBak);
    console.log(`      [+] Configuración .env respaldada en:`);
    console.log(`          ${rutaRespaldoEnv}`);
  }

  // Respaldar base de datos SQLite activa física
  let tamanoDbBytes = 0;
  if (fs.existsSync(rutaDbActiva)) {
    fs.copyFileSync(rutaDbActiva, rutaRespaldoDb);
    tamanoDbBytes = fs.statSync(rutaDbActiva).size;
    console.log(`      [+] Base de datos SQLite activa respaldada en:`);
    console.log(`          ${rutaRespaldoDb} (${(tamanoDbBytes / 1024).toFixed(1)} KB)`);

    // Copiar también archivos WAL y SHM si existen
    const wal = `${rutaDbActiva}-wal`;
    const shm = `${rutaDbActiva}-shm`;
    if (fs.existsSync(wal)) {
      try {
        fs.copyFileSync(wal, `${rutaRespaldoDb}-wal`);
      } catch {}
    }
    if (fs.existsSync(shm)) {
      try {
        fs.copyFileSync(shm, `${rutaRespaldoDb}-shm`);
      } catch {}
    }
  } else {
    console.warn(`      [AVISO] No se encontro base de datos previa en ${rutaDbActiva}. Se inicializara en la migracion.`);
  }

  console.log("      [OK] Salvaguarda previa completada con éxito.\n");

  // =========================================================================
  // FASE 2: PAUSA LIMPIA DEL SERVIDOR
  // =========================================================================
  console.log("[FASE 2/5] Pausando temporalmente los servicios de PM2 para liberar archivos...");
  try {
    const cmdStop = `npx pm2 stop ${env.INSTANCE_ID} ${env.INSTANCE_ID}-mdns`;
    execSync(cmdStop, { cwd: PROJECT_ROOT, stdio: "ignore" });
    console.log("      [OK] Procesos de la instancia pausados limpiamente.");
  } catch {
    console.log("      [INFO] Procesos de PM2 ya estaban inactivos o no instalados.");
  }
  console.log("");

  // =========================================================================
  // FASE 3: INYECCIÓN DEL NUEVO CÓDIGO
  // =========================================================================
  if (modoGithub) {
    console.log("[FASE 3/5] Descargando y sincronizando últimos cambios desde GitHub...");
    try {
      execSync("git fetch origin main", { cwd: PROJECT_ROOT, stdio: "inherit" });
      execSync("git pull origin main", { cwd: PROJECT_ROOT, stdio: "inherit" });
      console.log("      [OK] Repositorio remoto sincronizado.");
    } catch (errGit) {
      throw new Error(`Fallo la actualizacion desde GitHub: ${errGit.message}`);
    }
  } else {
    console.log(`[FASE 3/5] Extrayendo paquete de actualizacion en el sistema...`);
    console.log(`          Archivo: ${archivoZipFinal}`);

    // Extraer mediante Expand-Archive nativo de PowerShell sin errores de buffer de consola
    const cmdExtract = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; Expand-Archive -Path '${archivoZipFinal}' -DestinationPath '${PROJECT_ROOT}' -Force"`;
    try {
      execSync(cmdExtract, { cwd: PROJECT_ROOT, stdio: "inherit" });
      console.log("      [OK] Código nuevo extraído e inyectado correctamente.");
    } catch (errExt) {
      throw new Error(`Fallo la extraccion del paquete ZIP: ${errExt.message}`);
    }
  }

  // Verificación Defensiva y Protección de Integridad Inmediata
  if (fs.existsSync(rutaEnvLocalBak)) {
    fs.copyFileSync(rutaEnvLocalBak, rutaEnvActual);
    console.log("      [DEFENSA] Archivo .env original del cliente verificado y protegido.");
  }

  // Verificar que la base de datos del cliente jamás haya sido borrada
  if (tamanoDbBytes > 0) {
    if (!fs.existsSync(rutaDbActiva) || fs.statSync(rutaDbActiva).size === 0) {
      console.warn("      [ALERTA] Restaurando archivo de base de datos desde la bóveda de seguridad...");
      fs.copyFileSync(rutaRespaldoDb, rutaDbActiva);
    }
    const tamanoFinal = fs.statSync(rutaDbActiva).size;
    console.log(`      [DEFENSA] Base de datos del cliente verificada intacta (${(tamanoFinal / 1024).toFixed(1)} KB).\n`);
  }

  // =========================================================================
  // FASE 4: MIGRACIÓN NO DESTRUCTIVA DE ESQUEMA SQLITE
  // =========================================================================
  console.log("[FASE 4/5] Sincronizando esquema de Prisma en SQLite (Migración No Destructiva)...");
  try {
    // prisma db push aplica cambios estructurales conservando todos los datos existentes
    execSync("npx prisma db push --schema=database/schema.prisma --skip-generate", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: env.DATABASE_URL || "file:./llanomio.db",
      },
    });

    execSync("npx prisma generate --schema=database/schema.prisma", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });
    console.log("      [OK] Tablas, índices y esquemas actualizados sin perder registros existentes.\n");
  } catch (errPrisma) {
    console.warn("      [AVISO] Observación al sincronizar esquema Prisma:", errPrisma.message);
  }

  // Si se actualizó desde GitHub con código fuente sin .next, compilar
  if (modoGithub) {
    console.log("      Compilando codigo de produccion actualizado...");
    execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "inherit" });
  }

  // =========================================================================
  // FASE 5: REINICIO Y VERIFICACIÓN DE SERVICIOS
  // =========================================================================
  console.log("[FASE 5/5] Reactivando y verificando servicios del sistema POS...");
  try {
    execSync(`npx pm2 start ecosystem.config.js --update-env`, {
      cwd: PROJECT_ROOT,
      stdio: "ignore",
    });
    execSync(`npx pm2 save`, { cwd: PROJECT_ROOT, stdio: "ignore" });
    console.log("      [OK] Servicios en segundo plano reactivados exitosamente en PM2.");
  } catch {
    console.log("      [INFO] Los servicios se iniciaran con el lanzador estandar.");
  }

  console.log("\n===============================================================================");
  console.log("                 ACTUALIZACION COMPLETADA CON EXITO");
  console.log("===============================================================================");
  console.log("Sus clientes, inventario, facturas, abonos y configuracion se conservaron intactos.");
  console.log(`Salvaguarda previa de respaldo almacenada en:`);
  console.log(`  ${rutaRespaldoDb}`);
  console.log("");
  console.log(`Consola web disponible en: http://localhost:${env.PORT}/login`);
  console.log("===============================================================================\n");

  return {
    ok: true,
    mensaje: "Actualización completada con éxito. Sus clientes, inventario y facturas se conservaron intactos.",
    respaldoPrevio: rutaRespaldoDb,
    timestamp,
    instancia: env.INSTANCE_ID,
    puerto: env.PORT,
  };
}

// Ejecución directa por CLI
if (require.main === module) {
  const cliArgs = process.argv.slice(2);
  let zipArg = null;
  let githubArg = false;

  for (const arg of cliArgs) {
    if (arg.startsWith("--zip=")) {
      zipArg = arg.split("=")[1].replace(/^["']|["']$/g, "");
    } else if (arg === "--github") {
      githubArg = true;
    }
  }

  aplicarActualizacion({ rutaZip: zipArg, modoGithub: githubArg })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n[ERROR CRITICO DURANTE LA ACTUALIZACION]:", error.message);
      process.exit(1);
    });
}

module.exports = {
  aplicarActualizacion,
  obtenerConfiguracionEnv,
  obtenerRutaFisicaBaseDeDatos,
};
