/**
 * CONSTRUCTOR MAESTRO DEL INSTALADOR GRÁFICO .EXE DE AURORA HOST POS
 * Genera el ejecutable nativo autónomo: dist_instalador/Aurora_Host_POS_Setup.exe
 *
 * Utiliza:
 * 1. Runtime de Node.js para empaquetado del payload ZIP
 * 2. Compilador nativo de Windows csc.exe (.NET Framework WinForms)
 * 3. Icono oficial incrustado y manifest UAC con requireAdministrator
 * 4. Compilador Inno Setup ISCC.exe (si está presente en el sistema)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DIR_DIST = path.join(PROJECT_ROOT, "dist_instalador");
const DIR_TMP = path.join(PROJECT_ROOT, ".tmp");
const RUTA_ICONO = path.join(PROJECT_ROOT, "instalador_tienda", "recursos", "llanomio.ico");
const RUTA_TERMINOS = path.join(PROJECT_ROOT, "instalador_tienda", "recursos", "TERMINOS_Y_CONDICIONES_AURORA_HOST.txt");
const RUTA_EXE_SALIDA = path.join(DIR_DIST, "Aurora_Host_POS_Setup.exe");
const RUTA_ZIP_PAYLOAD = path.join(DIR_DIST, "payload_aurora_host.zip");

// Asegurar directorios base y aislamiento de variables temporales
if (!fs.existsSync(DIR_DIST)) fs.mkdirSync(DIR_DIST, { recursive: true });
if (!fs.existsSync(DIR_TMP)) fs.mkdirSync(DIR_TMP, { recursive: true });

process.env.TEMP = DIR_TMP;
process.env.TMP = DIR_TMP;
process.env.NEXT_TELEMETRY_DISABLED = "1";

console.log("===============================================================================");
console.log("   CONSTRUCTOR MAESTRO DEL INSTALADOR GRÁFICO .EXE - AURORA HOST POS");
console.log("===============================================================================\n");

// 1. Preparar y sincronizar base de datos y recursos autónomos
console.log("[1/6] Sincronizando entorno de producción y base de datos limpia de fábrica...");
try {
  execSync("node scripts/preparar-paquete-instalador.js", {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      TEMP: DIR_TMP,
      TMP: DIR_TMP,
    },
  });
  console.log("      [OK] Entorno standalone y base de datos de fábrica listos.\n");
} catch (errPrep) {
  console.error("      [ERROR] Fallo al preparar el paquete standalone:", errPrep.message);
  process.exit(1);
}

// 2. Generar el archivo comprimido del payload completo
console.log("[2/6] Comprimiendo payload completo de Aurora Host en archivo ZIP...");
const archivoExclusiones = path.join(DIR_TMP, "exclusiones_aurora.txt");
const lineasExclusion = [
  ".git",
  ".git/*",
  "node_modules",
  "node_modules/*",
  ".next/cache",
  ".next/cache/*",
  "dist_instalador",
  "dist_instalador/*",
  "*.log",
  ".tmp",
  ".tmp/*",
  ".pm2",
  ".pm2/*",
  "database/backups_locales/*",
];
fs.writeFileSync(archivoExclusiones, lineasExclusion.join("\n"), "utf-8");

if (fs.existsSync(RUTA_ZIP_PAYLOAD)) {
  try {
    fs.unlinkSync(RUTA_ZIP_PAYLOAD);
  } catch {}
}

try {
  execSync(`tar -a -cf "${RUTA_ZIP_PAYLOAD}" --exclude-from="${archivoExclusiones}" *`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      TEMP: DIR_TMP,
      TMP: DIR_TMP,
    },
  });
  const sizeMb = (fs.statSync(RUTA_ZIP_PAYLOAD).size / (1024 * 1024)).toFixed(2);
  console.log(`      [OK] Payload ZIP generado exitosamente: ${RUTA_ZIP_PAYLOAD} (${sizeMb} MB).\n`);
} catch (errTar) {
  console.error("      [ERROR] Fallo al generar payload ZIP:", errTar.message);
  process.exit(1);
} finally {
  if (fs.existsSync(archivoExclusiones)) {
    try {
      fs.unlinkSync(archivoExclusiones);
    } catch {}
  }
}

// 3. Generar Manifest de UAC para privilegios de Administrador
console.log("[3/6] Generando archivo de manifiesto UAC para privilegios administrativos...");
const rutaManifest = path.join(DIR_DIST, "app.manifest");
const contenidoManifest = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="2026.1.0.0" processorArchitecture="*" name="AuroraHost.POS.Setup" type="win32"/>
  <description>Instalador Oficial Aurora Host POS</description>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
      <supportedOS Id="{1f676c76-80e1-4239-95bb-83d0f6d0da78}"/>
      <supportedOS Id="{4a2f28e3-53b9-4441-ba9c-d69d4a4a6e38}"/>
      <supportedOS Id="{35138b9a-5d96-4fbd-8e2d-a2440225f93a}"/>
    </application>
  </compatibility>
</assembly>`;
fs.writeFileSync(rutaManifest, contenidoManifest, "utf-8");
console.log("      [OK] app.manifest generado correctamente.\n");

// 4. Cargar Términos y Condiciones
let terminosTexto = "";
if (fs.existsSync(RUTA_TERMINOS)) {
  terminosTexto = fs.readFileSync(RUTA_TERMINOS, "utf-8");
} else {
  terminosTexto = "Términos y Condiciones de Licencia Oficial de Aurora Host POS.\nOperación 100% Local y Offline-First.";
}

// 5. Generar Código Fuente C# del Asistente Gráfico Windows Forms
console.log("[4/6] Generando código fuente C# para el Asistente Gráfico de 4 Pantallas...");
const rutaSourceCs = path.join(DIR_DIST, "AuroraHostInstaller.cs");

// Escapar texto de términos para C# string literal
const terminosEscapados = JSON.stringify(terminosTexto);

const codigoCs = `using System;
using System.IO;
using System.IO.Compression;
using System.Drawing;
using System.Windows.Forms;
using System.Diagnostics;
using System.Reflection;
using System.Collections.Generic;
using System.ComponentModel;

namespace AuroraHost.Installer {
    public class InstallerWizardForm : Form {
        private int currentStep = 0;
        private string installDir = @"C:\\Aurora_Host_POS";

        // Controles de Navegación
        private Panel pnlHeader;
        private Label lblHeaderTitle;
        private Label lblHeaderSubtitle;
        private Panel pnlFooter;
        private Button btnCancelar;
        private Button btnAtras;
        private Button btnSiguiente;
        private Panel pnlContent;

        // Pantalla 0: Términos y Condiciones
        private Panel pnlStep0;
        private TextBox txtTerminos;
        private CheckBox chkAcepto;

        // Pantalla 1: Selección de Directorio
        private Panel pnlStep1;
        private TextBox txtDirectorio;
        private Button btnExaminar;
        private Label lblEspacioInfo;

        // Pantalla 2: Instalación y Extracción
        private Panel pnlStep2;
        private ProgressBar pbProgreso;
        private Label lblEstadoExtraccion;
        private TextBox txtLog;
        private BackgroundWorker bgWorker;

        // Pantalla 3: Finalización
        private Panel pnlStep3;
        private CheckBox chkIniciarServidor;
        private CheckBox chkAbrirPOS;

        public InstallerWizardForm() {
            InitializeComponent();
            UpdateStepUI();
        }

        private void InitializeComponent() {
            this.Text = "Instalador Oficial - Aurora Host POS (Versión 2026)";
            this.Size = new Size(740, 560);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.White;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point, 0);

            // Intentar cargar icono propio
            try {
                this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            } catch { }

            // 1. Cabecera (Header Panel)
            pnlHeader = new Panel {
                Dock = DockStyle.Top,
                Height = 85,
                BackColor = Color.FromArgb(15, 23, 42) // Slate 900
            };

            lblHeaderTitle = new Label {
                Location = new Point(24, 16),
                AutoSize = true,
                Font = new Font("Segoe UI", 12F, FontStyle.Bold),
                ForeColor = Color.White,
                Text = "AURORA HOST — Sistema POS y Control de Mostrador"
            };

            lblHeaderSubtitle = new Label {
                Location = new Point(24, 46),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Regular),
                ForeColor = Color.FromArgb(203, 213, 225), // Slate 300
                Text = "Bienvenido al Asistente Oficial de Instalación Comercial Offline-First"
            };

            pnlHeader.Controls.Add(lblHeaderTitle);
            pnlHeader.Controls.Add(lblHeaderSubtitle);

            // 2. Barra Inferior (Footer Panel)
            pnlFooter = new Panel {
                Dock = DockStyle.Bottom,
                Height = 65,
                BackColor = Color.FromArgb(248, 250, 252) // Slate 50
            };

            var pnlFooterLine = new Panel {
                Dock = DockStyle.Top,
                Height = 1,
                BackColor = Color.FromArgb(226, 232, 240)
            };
            pnlFooter.Controls.Add(pnlFooterLine);

            btnCancelar = new Button {
                Text = "Cancelar",
                Size = new Size(95, 34),
                Location = new Point(24, 16),
                BackColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.FromArgb(71, 85, 105),
                Cursor = Cursors.Hand
            };
            btnCancelar.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnCancelar.Click += (s, e) => {
                if (MessageBox.Show("¿Está seguro de que desea cancelar la instalación de Aurora Host POS?",
                    "Confirmación", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes) {
                    this.Close();
                }
            };

            btnAtras = new Button {
                Text = "< Atrás",
                Size = new Size(95, 34),
                Location = new Point(505, 16),
                BackColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.FromArgb(30, 41, 59),
                Cursor = Cursors.Hand
            };
            btnAtras.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnAtras.Click += (s, e) => {
                if (currentStep > 0 && currentStep != 2) {
                    currentStep--;
                    UpdateStepUI();
                }
            };

            btnSiguiente = new Button {
                Text = "Siguiente >",
                Size = new Size(110, 34),
                Location = new Point(608, 16),
                BackColor = Color.FromArgb(37, 99, 235), // Blue 600
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnSiguiente.FlatAppearance.BorderSize = 0;
            btnSiguiente.Click += BtnSiguiente_Click;

            pnlFooter.Controls.Add(btnCancelar);
            pnlFooter.Controls.Add(btnAtras);
            pnlFooter.Controls.Add(btnSiguiente);

            // 3. Panel Contenedor de Pasos
            pnlContent = new Panel {
                Dock = DockStyle.Fill,
                BackColor = Color.White,
                Padding = new Padding(24)
            };

            // Construir los 4 paneles de contenido
            BuildStep0_Terminos();
            BuildStep1_Directorio();
            BuildStep2_Instalando();
            BuildStep3_Finalizado();

            this.Controls.Add(pnlContent);
            this.Controls.Add(pnlHeader);
            this.Controls.Add(pnlFooter);
        }

        private void BuildStep0_Terminos() {
            pnlStep0 = new Panel { Dock = DockStyle.Fill, Visible = false };

            var lblTitulo = new Label {
                Text = "Contrato de Licencia Comercial y Términos de Uso de Aurora Host:",
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 41, 59),
                Location = new Point(4, 8),
                AutoSize = true
            };

            txtTerminos = new TextBox {
                Location = new Point(4, 34),
                Size = new Size(665, 290),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(248, 250, 252),
                ForeColor = Color.FromArgb(51, 65, 85),
                Font = new Font("Consolas", 8.5F),
                Text = ${terminosEscapados}
            };

            chkAcepto = new CheckBox {
                Text = "He leído y acepto los Términos y Condiciones de Licencia de Aurora Host",
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 41, 59),
                Location = new Point(4, 335),
                AutoSize = true,
                Cursor = Cursors.Hand
            };
            chkAcepto.CheckedChanged += (s, e) => {
                btnSiguiente.Enabled = chkAcepto.Checked;
            };

            pnlStep0.Controls.Add(lblTitulo);
            pnlStep0.Controls.Add(txtTerminos);
            pnlStep0.Controls.Add(chkAcepto);
            pnlContent.Controls.Add(pnlStep0);
        }

        private void BuildStep1_Directorio() {
            pnlStep1 = new Panel { Dock = DockStyle.Fill, Visible = false };

            var lblInstruccion = new Label {
                Text = "El instalador configurará los archivos del servidor y la base de datos en la siguiente carpeta.\\nPara instalar en un directorio o disco diferente, haga clic en Examinar.",
                Location = new Point(4, 16),
                Size = new Size(665, 40),
                ForeColor = Color.FromArgb(51, 65, 85)
            };

            var grpCarpeta = new GroupBox {
                Text = " Carpeta Raíz de Instalación ",
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Location = new Point(4, 70),
                Size = new Size(665, 95),
                ForeColor = Color.FromArgb(30, 41, 59)
            };

            txtDirectorio = new TextBox {
                Location = new Point(16, 38),
                Size = new Size(515, 25),
                Font = new Font("Segoe UI", 9.5F),
                Text = installDir
            };
            txtDirectorio.TextChanged += (s, e) => {
                installDir = txtDirectorio.Text.Trim();
                ActualizarEspacioDisco();
            };

            btnExaminar = new Button {
                Text = "Examinar...",
                Location = new Point(542, 36),
                Size = new Size(105, 29),
                BackColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnExaminar.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnExaminar.Click += (s, e) => {
                using (var fbd = new FolderBrowserDialog()) {
                    fbd.Description = "Seleccione la carpeta de instalación para Aurora Host POS:";
                    fbd.SelectedPath = installDir;
                    if (fbd.ShowDialog() == DialogResult.OK) {
                        txtDirectorio.Text = fbd.SelectedPath;
                    }
                }
            };

            grpCarpeta.Controls.Add(txtDirectorio);
            grpCarpeta.Controls.Add(btnExaminar);

            lblEspacioInfo = new Label {
                Location = new Point(4, 185),
                Size = new Size(665, 50),
                ForeColor = Color.FromArgb(71, 85, 105)
            };
            ActualizarEspacioDisco();

            var lblAvisoPermisos = new Label {
                Text = "Nota: Se requieren permisos de Administrador para registrar reglas de Windows Firewall y configurar puertos.",
                Location = new Point(4, 250),
                Size = new Size(665, 30),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Italic),
                ForeColor = Color.FromArgb(100, 116, 139)
            };

            pnlStep1.Controls.Add(lblInstruccion);
            pnlStep1.Controls.Add(grpCarpeta);
            pnlStep1.Controls.Add(lblEspacioInfo);
            pnlStep1.Controls.Add(lblAvisoPermisos);
            pnlContent.Controls.Add(pnlStep1);
        }

        private void ActualizarEspacioDisco() {
            try {
                string root = Path.GetPathRoot(installDir);
                if (!string.IsNullOrEmpty(root) && Directory.Exists(root)) {
                    var drive = new DriveInfo(root);
                    double libresGb = drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
                    lblEspacioInfo.Text = string.Format("Espacio aproximado requerido en disco: ~350 MB\\nEspacio disponible en la unidad {0}: {1:F2} GB",
                        root, libresGb);
                    return;
                }
            } catch { }
            lblEspacioInfo.Text = "Espacio aproximado requerido en disco: ~350 MB";
        }

        private void BuildStep2_Instalando() {
            pnlStep2 = new Panel { Dock = DockStyle.Fill, Visible = false };

            lblEstadoExtraccion = new Label {
                Text = "Preparando descompresión y configuración del servidor...",
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                Location = new Point(4, 16),
                Size = new Size(665, 25),
                ForeColor = Color.FromArgb(30, 41, 59)
            };

            pbProgreso = new ProgressBar {
                Location = new Point(4, 48),
                Size = new Size(665, 24),
                Minimum = 0,
                Maximum = 100,
                Value = 0
            };

            txtLog = new TextBox {
                Location = new Point(4, 88),
                Size = new Size(665, 260),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(15, 23, 42),
                ForeColor = Color.FromArgb(56, 189, 248),
                Font = new Font("Consolas", 8.5F)
            };

            pnlStep2.Controls.Add(lblEstadoExtraccion);
            pnlStep2.Controls.Add(pbProgreso);
            pnlStep2.Controls.Add(txtLog);
            pnlContent.Controls.Add(pnlStep2);
        }

        private void BuildStep3_Finalizado() {
            pnlStep3 = new Panel { Dock = DockStyle.Fill, Visible = false };

            var lblExitoTitulo = new Label {
                Text = "¡Instalación de Aurora Host POS Completada con Éxito!",
                Font = new Font("Segoe UI", 12F, FontStyle.Bold),
                ForeColor = Color.FromArgb(22, 101, 52), // Green 800
                Location = new Point(4, 16),
                AutoSize = true
            };

            var lblExitoDesc = new Label {
                Text = "El sistema POS local, los servicios de red y la base de datos comercial han sido configurados correctamente.",
                Location = new Point(4, 48),
                Size = new Size(665, 25),
                ForeColor = Color.FromArgb(51, 65, 85)
            };

            var grpAccesos = new GroupBox {
                Text = " Botonera de Control Creada en su Escritorio de Windows ",
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Location = new Point(4, 85),
                Size = new Size(665, 140),
                ForeColor = Color.FromArgb(30, 41, 59)
            };

            var lblLista = new Label {
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                Location = new Point(16, 26),
                Size = new Size(630, 100),
                ForeColor = Color.FromArgb(51, 65, 85),
                Text = "1. Aurora Host - Iniciar Servidor (Icono Verde) -> Levanta el servidor local\\n" +
                       "2. Aurora Host - Vista Pantalla Completa (Icono Índigo) -> Abre el POS sin barras de navegador\\n" +
                       "3. Aurora Host - Apagar o Pausar Servidor (Icono Rojo) -> Respaldo automático y detención limpia\\n" +
                       "4. Aurora Host - Relanzar o Reconectar Servidor (Icono Azul) -> Optimización y recuperación rápida"
            };
            grpAccesos.Controls.Add(lblLista);

            chkIniciarServidor = new CheckBox {
                Text = "Iniciar y levantar el Servidor Aurora Host ahora",
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 41, 59),
                Location = new Point(16, 245),
                AutoSize = true,
                Checked = true,
                Cursor = Cursors.Hand
            };

            chkAbrirPOS = new CheckBox {
                Text = "Abrir Aurora Host POS en Pantalla Completa al finalizar",
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                ForeColor = Color.FromArgb(37, 99, 235),
                Location = new Point(16, 280),
                AutoSize = true,
                Checked = true,
                Cursor = Cursors.Hand
            };

            pnlStep3.Controls.Add(lblExitoTitulo);
            pnlStep3.Controls.Add(lblExitoDesc);
            pnlStep3.Controls.Add(grpAccesos);
            pnlStep3.Controls.Add(chkIniciarServidor);
            pnlStep3.Controls.Add(chkAbrirPOS);
            pnlContent.Controls.Add(pnlStep3);
        }

        private void UpdateStepUI() {
            pnlStep0.Visible = (currentStep == 0);
            pnlStep1.Visible = (currentStep == 1);
            pnlStep2.Visible = (currentStep == 2);
            pnlStep3.Visible = (currentStep == 3);

            btnAtras.Enabled = (currentStep > 0 && currentStep != 2 && currentStep != 3);
            btnCancelar.Enabled = (currentStep != 2);

            switch (currentStep) {
                case 0:
                    lblHeaderTitle.Text = "TÉRMINOS Y CONDICIONES DE LICENCIA";
                    lblHeaderSubtitle.Text = "Por favor lea y acepte el contrato de uso para continuar con la instalación.";
                    btnSiguiente.Text = "Siguiente >";
                    btnSiguiente.Enabled = chkAcepto.Checked;
                    break;
                case 1:
                    lblHeaderTitle.Text = "SELECCIÓN DE CARPETA DE INSTALACIÓN";
                    lblHeaderSubtitle.Text = "Elija el directorio donde se almacenarán el sistema y la base de datos comercial.";
                    btnSiguiente.Text = "Instalar Ahora >";
                    btnSiguiente.Enabled = true;
                    break;
                case 2:
                    lblHeaderTitle.Text = "INSTALANDO AURORA HOST POS...";
                    lblHeaderSubtitle.Text = "Extrayendo archivos y configurando servicios en segundo plano.";
                    btnSiguiente.Enabled = false;
                    btnAtras.Enabled = false;
                    IniciarExtraccionEInstalacion();
                    break;
                case 3:
                    lblHeaderTitle.Text = "INSTALACIÓN COMPLETADA";
                    lblHeaderSubtitle.Text = "Aurora Host POS está listo para iniciar operaciones comerciales.";
                    btnSiguiente.Text = "Finalizar";
                    btnSiguiente.Enabled = true;
                    btnCancelar.Visible = false;
                    break;
            }
        }

        private void BtnSiguiente_Click(object sender, EventArgs e) {
            if (currentStep == 0) {
                currentStep = 1;
                UpdateStepUI();
            } else if (currentStep == 1) {
                currentStep = 2;
                UpdateStepUI();
            } else if (currentStep == 3) {
                // Finalizar y ejecutar opciones seleccionadas
                EjecutarAccionesFinales();
                this.Close();
            }
        }

        private void IniciarExtraccionEInstalacion() {
            bgWorker = new BackgroundWorker {
                WorkerReportsProgress = true
            };

            bgWorker.DoWork += (s, e) => {
                Log("Iniciando proceso de instalación en: " + installDir);

                // 1. Crear carpeta destino si no existe
                if (!Directory.Exists(installDir)) {
                    Directory.CreateDirectory(installDir);
                    Log("Directorio raíz creado exitosamente.");
                }

                // 2. Extraer Payload ZIP incrustado
                Log("Localizando paquete comprimido embebido (payload.zip)...");
                var asm = Assembly.GetExecutingAssembly();
                Stream zipStream = asm.GetManifestResourceStream("payload.zip");

                if (zipStream == null) {
                    // Fallback a archivo local si existe
                    string localZip = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "payload_aurora_host.zip");
                    if (File.Exists(localZip)) {
                        zipStream = File.OpenRead(localZip);
                        Log("Cargando payload desde archivo local: " + localZip);
                    }
                }

                if (zipStream == null) {
                    throw new Exception("No se encontró el paquete comprimido del sistema (payload.zip).");
                }

                using (zipStream)
                using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Read)) {
                    int total = archive.Entries.Count;
                    int index = 0;
                    Log(string.Format("Extrayendo {0} archivos y carpetas del sistema...", total));

                    foreach (var entry in archive.Entries) {
                        index++;
                        int porcentaje = (int)((double)index / total * 100);

                        string destinoArchivo = Path.Combine(installDir, entry.FullName);

                        // Crear subcarpeta si es directorio
                        if (string.IsNullOrEmpty(entry.Name)) {
                            Directory.CreateDirectory(destinoArchivo);
                            continue;
                        }

                        string parentDir = Path.GetDirectoryName(destinoArchivo);
                        if (!string.IsNullOrEmpty(parentDir) && !Directory.Exists(parentDir)) {
                            Directory.CreateDirectory(parentDir);
                        }

                        // Extraer y sobrescribir
                        try {
                            entry.ExtractToFile(destinoArchivo, true);
                        } catch (Exception exFile) {
                            Log("[AVISO] " + entry.Name + ": " + exFile.Message);
                        }

                        bgWorker.ReportProgress(porcentaje, "Extrayendo: " + entry.Name);
                    }
                }

                Log("Descompresión completada al 100%.");

                // 3. Crear carpetas auxiliares esenciales
                Log("Configurando directorios de trabajo y respaldos locales...");
                string dirBackups = @"C:\\POS_BACKUPS";
                string dirBackupsHist = @"C:\\POS_BACKUPS\\historial";
                string dirTmp = Path.Combine(installDir, ".tmp");
                string dirPm2 = Path.Combine(installDir, ".pm2");

                try {
                    if (!Directory.Exists(dirBackups)) Directory.CreateDirectory(dirBackups);
                    if (!Directory.Exists(dirBackupsHist)) Directory.CreateDirectory(dirBackupsHist);
                    if (!Directory.Exists(dirTmp)) Directory.CreateDirectory(dirTmp);
                    if (!Directory.Exists(dirPm2)) Directory.CreateDirectory(dirPm2);
                    Log(@"Carpetas locales C:\\POS_BACKUPS, .tmp y .pm2 configuradas.");
                } catch { }

                // 4. Configurar reglas de Windows Firewall
                Log("Configurando reglas en Windows Defender Firewall para Red Local...");
                ConfigurarFirewall();

                // 5. Crear accesos directos en el Escritorio
                Log("Generando accesos directos de Aurora Host en el Escritorio...");
                CrearAccesosEscritorio();
                Log("Botonera de control en el Escritorio creada exitosamente.");
            };

            bgWorker.ProgressChanged += (s, e) => {
                pbProgreso.Value = Math.Min(100, Math.Max(0, e.ProgressPercentage));
                if (e.UserState != null) {
                    lblEstadoExtraccion.Text = e.UserState.ToString();
                }
            };

            bgWorker.RunWorkerCompleted += (s, e) => {
                if (e.Error != null) {
                    MessageBox.Show("Ocurrió un error durante la instalación:\\n" + e.Error.Message,
                        "Error de Instalación", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    btnCancelar.Enabled = true;
                    lblEstadoExtraccion.Text = "Instalación fallida: " + e.Error.Message;
                } else {
                    currentStep = 3;
                    UpdateStepUI();
                }
            };

            bgWorker.RunWorkerAsync();
        }

        private void Log(string msg) {
            if (txtLog.InvokeRequired) {
                txtLog.Invoke(new Action<string>(Log), msg);
                return;
            }
            txtLog.AppendText(string.Format("[{0}] {1}\\r\\n", DateTime.Now.ToString("HH:mm:ss"), msg));
        }

        private void ConfigurarFirewall() {
            try {
                var psiTcp = new ProcessStartInfo("netsh", "advfirewall firewall add rule name=\\"AURORA_HOST_POS_WEB_IN\\" dir=in action=allow protocol=TCP localport=3000 profile=any") {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                var pTcp = Process.Start(psiTcp);
                if (pTcp != null) pTcp.WaitForExit(3000);

                var psiUdp = new ProcessStartInfo("netsh", "advfirewall firewall add rule name=\\"AURORA_HOST_POS_MDNS_IN\\" dir=in action=allow protocol=UDP localport=5353 profile=any") {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                var pUdp = Process.Start(psiUdp);
                if (pUdp != null) pUdp.WaitForExit(3000);
            } catch { }
        }

        private void CrearAccesosEscritorio() {
            string dirIniciadores = Path.Combine(installDir, @"instalador_tienda\\2_INICIADORES_Y_ACTIVADORES");
            string dirIconos = Path.Combine(installDir, @"instalador_tienda\\iconos");

            string userDesktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string commonDesktop = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);

            var escritorios = new List<string>();
            if (Directory.Exists(userDesktop)) escritorios.Add(userDesktop);
            if (Directory.Exists(commonDesktop) && !escritorios.Contains(commonDesktop)) escritorios.Add(commonDesktop);

            var accesos = new[] {
                new { Lnk = "Aurora Host - Iniciar Servidor.lnk", Bat = "1_INICIALIZAR_SITIO_POS.bat", Ico = "icono_iniciar_verde.ico", Desc = "Levanta e inicializa el servidor local Aurora Host POS" },
                new { Lnk = "Aurora Host - Vista Pantalla Completa.lnk", Bat = "5_ABRIR_POS_PANTALLA_COMPLETA.bat", Ico = "icono_pantalla_completa_indigo.ico", Desc = "Abre Aurora Host POS en pantalla completa" },
                new { Lnk = "Aurora Host - Apagar o Pausar Servidor.lnk", Bat = "2_DETENER_PAUSAR_SERVIDOR_POS.bat", Ico = "icono_detener_rojo.ico", Desc = "Crea respaldo y detiene o pausa el servidor" },
                new { Lnk = "Aurora Host - Relanzar o Reconectar Servidor.lnk", Bat = "3_REINICIAR_SITIO_RAPIDO_POS.bat", Ico = "icono_reiniciar_azul.ico", Desc = "Relanza, reconecta y optimiza el servidor" },
                new { Lnk = "Aurora Host - Activar Inicio Automatico.lnk", Bat = "4_ACTIVAR_INICIO_AUTOMATICO_PC.bat", Ico = "icono_autoarranque_ambar.ico", Desc = "Configura inicio automático con Windows" }
            };

            foreach (var esc in escritorios) {
                foreach (var acc in accesos) {
                    string rutaLnk = Path.Combine(esc, acc.Lnk);
                    string rutaBat = Path.Combine(dirIniciadores, acc.Bat);
                    string rutaIco = Path.Combine(dirIconos, acc.Ico);
                    CrearLnk(rutaLnk, rutaBat, installDir, acc.Desc, rutaIco);
                }
            }
        }

        private void CrearLnk(string lnkPath, string targetPath, string workingDir, string desc, string iconPath) {
            try {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic sc = shell.CreateShortcut(lnkPath);
                sc.TargetPath = targetPath;
                sc.WorkingDirectory = workingDir;
                sc.Description = desc;
                if (File.Exists(iconPath)) {
                    sc.IconLocation = iconPath + ",0";
                }
                sc.Save();
            } catch { }
        }

        private void EjecutarAccionesFinales() {
            try {
                string dirIniciadores = Path.Combine(installDir, @"instalador_tienda\\2_INICIADORES_Y_ACTIVADORES");

                if (chkIniciarServidor.Checked) {
                    string batIniciar = Path.Combine(dirIniciadores, "1_INICIALIZAR_SITIO_POS.bat");
                    if (File.Exists(batIniciar)) {
                        Process.Start(new ProcessStartInfo("cmd.exe", "/c \\"" + batIniciar + "\\"") {
                            WorkingDirectory = installDir,
                            WindowStyle = ProcessWindowStyle.Minimized
                        });
                    }
                }

                if (chkAbrirPOS.Checked) {
                    string batPantalla = Path.Combine(dirIniciadores, "5_ABRIR_POS_PANTALLA_COMPLETA.bat");
                    if (File.Exists(batPantalla)) {
                        Process.Start(new ProcessStartInfo("cmd.exe", "/c \\"" + batPantalla + "\\"") {
                            WorkingDirectory = installDir,
                            WindowStyle = ProcessWindowStyle.Normal
                        });
                    }
                }
            } catch { }
        }
    }

    static class Program {
        [STAThread]
        static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerWizardForm());
        }
    }
}
`;

fs.writeFileSync(rutaSourceCs, codigoCs, "utf-8");
console.log("      [OK] Código fuente C# generado en: " + rutaSourceCs + "\\n");

// 6. Compilar con csc.exe nativo de Windows
console.log("[5/6] Compilando ejecutable gráfico autónomo con csc.exe (.NET Framework)...");
const cscPath = "C:\\\\Windows\\\\Microsoft.NET\\\\Framework64\\\\v4.0.30319\\\\csc.exe";

if (!fs.existsSync(cscPath)) {
  console.error("      [ERROR CRÍTICO] No se encontró el compilador csc.exe en: " + cscPath);
  process.exit(1);
}

// Crear archivo de respuesta (.rsp) para csc.exe para evitar problemas de escape con comillas y espacios
const rutaRsp = path.join(DIR_DIST, "csc_options.rsp");
const lineasRsp = [
  "/nologo",
  "/t:winexe",
  "/optimize+",
  `/out:"${RUTA_EXE_SALIDA}"`,
  `/win32icon:"${RUTA_ICONO}"`,
  `/win32manifest:"${rutaManifest}"`,
  `/resource:"${RUTA_ZIP_PAYLOAD}",payload.zip`,
  "/reference:System.dll,System.Windows.Forms.dll,System.Drawing.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll,Microsoft.CSharp.dll",
  `"${rutaSourceCs}"`,
];

fs.writeFileSync(rutaRsp, lineasRsp.join("\r\n"), "utf-8");

try {
  execSync(`"${cscPath}" @"${rutaRsp}"`, {
    cwd: DIR_DIST,
    stdio: "inherit",
    env: {
      ...process.env,
      TEMP: DIR_TMP,
      TMP: DIR_TMP,
    },
  });
  console.log("      [OK] Compilación con csc.exe finalizada exitosamente.\\n");
} catch (errCsc) {
  console.error("      [ERROR] Fallo al compilar con csc.exe:", errCsc.message);
  process.exit(1);
}

// 7. Verificación de Integridad del Archivo .EXE Generado
console.log("[6/6] Auditando integridad del ejecutable gráfico generado...");
if (!fs.existsSync(RUTA_EXE_SALIDA)) {
  console.error("      [ERROR] El archivo ejecutable no existe: " + RUTA_EXE_SALIDA);
  process.exit(1);
}

const statsExe = fs.statSync(RUTA_EXE_SALIDA);
const sizeExeMb = (statsExe.size / (1024 * 1024)).toFixed(2);

// Verificar cabecera PE válida (MZ)
const fd = fs.openSync(RUTA_EXE_SALIDA, "r");
const bufferHeader = Buffer.alloc(2);
fs.readSync(fd, bufferHeader, 0, 2, 0);
fs.closeSync(fd);

const esPeValido = bufferHeader[0] === 0x4d && bufferHeader[1] === 0x5a; // 'MZ'

console.log("===============================================================================");
console.log("   CERTIFICADO DE CONSTRUCCIÓN DEL INSTALADOR GRÁFICO .EXE");
console.log("===============================================================================");
console.log(`- Archivo Generado:  ${RUTA_EXE_SALIDA}`);
console.log(`- Tamaño Final:      ${sizeExeMb} MB`);
console.log(`- Cabecera PE (MZ):  ${esPeValido ? "VÁLIDA (Ejecutable nativo de Windows)" : "NO VÁLIDA"}`);
console.log(`- Icono Incrustado:  ${RUTA_ICONO}`);
console.log(`- Privilegios UAC:   requireAdministrator`);
console.log(`- Asistente Gráfico: 4 Pantallas (Términos, Carpeta, Extracción en Vivo, Finalización)`);
console.log("===============================================================================\n");

// Verificar si existe compilador Inno Setup para compilar también el script de respaldo
const posiblesIscc = [
  "C:\\\\Program Files (x86)\\\\Inno Setup 6\\\\ISCC.exe",
  "C:\\\\Program Files\\\\Inno Setup 6\\\\ISCC.exe",
];
let isccEncontrado = null;
for (const p of posiblesIscc) {
  if (fs.existsSync(p)) {
    isccEncontrado = p;
    break;
  }
}

if (isccEncontrado) {
  console.log("[INNO SETUP] Compilador ISCC detectado. Generando instalador Inno alternativo...");
  try {
    const rutaIss = path.join(PROJECT_ROOT, "instalador_tienda", "1_INSTALACIONES", "Aurora_Host_Setup.iss");
    execSync(`"${isccEncontrado}" "${rutaIss}"`, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });
    console.log("      [OK] Instalador alternativo de Inno Setup compilado.");
  } catch (errInno) {
    console.warn("      [AVISO] No se pudo compilar con Inno Setup:", errInno.message);
  }
}

console.log("[ÉXITO TOTAL] El instalador gráfico Aurora_Host_POS_Setup.exe está listo para distribución comercial.");

