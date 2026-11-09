using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace AuroraHost.POS.Instalador
{
    public class FormInstalador : Form
    {
        // Controles Principales
        private Panel panelHeader;
        private Label lblTitulo;
        private Label lblSubtitulo;
        
        private Panel panelConfig;
        private RadioButton rbModoRapido;
        private RadioButton rbModoPersonalizado;
        private GroupBox gbOpciones;
        private Label lblPuerto;
        private TextBox txtPuerto;
        private Label lblDominio;
        private TextBox txtDominio;
        private CheckBox chkAccesosEscritorio;
        private CheckBox chkIniciarAlFinalizar;
        private CheckBox chkAutoArranque;
        private CheckBox chkResetDB;

        private Panel panelProgreso;
        private Label lblEstadoFase;
        private ProgressBar progressBar;
        private Label lblPorcentaje;
        private TextBox txtLogs;

        private Panel panelFooter;
        private Button btnInstalar;
        private Button btnCancelar;
        private Button btnAbrirPOS;

        private BackgroundWorker worker;
        private string baseDir;
        private bool instalacionCompletada = false;

        public FormInstalador()
        {
            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(baseDir);

            InicializarComponentes();
            CargarConfiguracionActual();
        }

        private void InicializarComponentes()
        {
            this.Text = "Instalador Maestro - Sistema POS Llanomio";
            this.Size = new Size(680, 620);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            string icoPath = Path.Combine(baseDir, "aurora.ico");
            if (File.Exists(icoPath))
            {
                try { this.Icon = new Icon(icoPath); } catch {}
            }

            // HEADER
            panelHeader = new Panel();
            panelHeader.Dock = DockStyle.Top;
            panelHeader.Height = 85;
            panelHeader.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            panelHeader.Padding = new Padding(24, 16, 24, 16);

            lblTitulo = new Label();
            lblTitulo.Text = "SISTEMA POS LLANOMIO";
            lblTitulo.ForeColor = Color.White;
            lblTitulo.Font = new Font("Segoe UI", 13F, FontStyle.Bold);
            lblTitulo.AutoSize = true;
            lblTitulo.Location = new Point(20, 16);

            lblSubtitulo = new Label();
            lblSubtitulo.Text = "Asistente de Instalacion, Configuracion de Red y Control de Servicios";
            lblSubtitulo.ForeColor = Color.FromArgb(148, 163, 184); // Slate 400
            lblSubtitulo.Font = new Font("Segoe UI", 9.5F);
            lblSubtitulo.AutoSize = true;
            lblSubtitulo.Location = new Point(21, 46);

            panelHeader.Controls.Add(lblTitulo);
            panelHeader.Controls.Add(lblSubtitulo);

            // FOOTER
            panelFooter = new Panel();
            panelFooter.Dock = DockStyle.Bottom;
            panelFooter.Height = 65;
            panelFooter.BackColor = Color.FromArgb(241, 245, 249);
            panelFooter.Padding = new Padding(20, 12, 20, 12);

            btnInstalar = new Button();
            btnInstalar.Text = "Iniciar Instalacion";
            btnInstalar.Size = new Size(160, 38);
            btnInstalar.Location = new Point(485, 14);
            btnInstalar.BackColor = Color.FromArgb(16, 185, 129); // Emerald 500
            btnInstalar.ForeColor = Color.White;
            btnInstalar.FlatStyle = FlatStyle.Flat;
            btnInstalar.FlatAppearance.BorderSize = 0;
            btnInstalar.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnInstalar.Cursor = Cursors.Hand;
            btnInstalar.Click += BtnInstalar_Click;

            btnCancelar = new Button();
            btnCancelar.Text = "Salir";
            btnCancelar.Size = new Size(100, 38);
            btnCancelar.Location = new Point(370, 14);
            btnCancelar.BackColor = Color.White;
            btnCancelar.ForeColor = Color.FromArgb(71, 85, 105);
            btnCancelar.FlatStyle = FlatStyle.Flat;
            btnCancelar.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnCancelar.Font = new Font("Segoe UI", 9F);
            btnCancelar.Cursor = Cursors.Hand;
            btnCancelar.Click += (s, e) => this.Close();

            btnAbrirPOS = new Button();
            btnAbrirPOS.Text = "Abrir POS Ahora";
            btnAbrirPOS.Size = new Size(160, 38);
            btnAbrirPOS.Location = new Point(485, 14);
            btnAbrirPOS.BackColor = Color.FromArgb(37, 99, 235); // Blue 600
            btnAbrirPOS.ForeColor = Color.White;
            btnAbrirPOS.FlatStyle = FlatStyle.Flat;
            btnAbrirPOS.FlatAppearance.BorderSize = 0;
            btnAbrirPOS.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnAbrirPOS.Visible = false;
            btnAbrirPOS.Cursor = Cursors.Hand;
            btnAbrirPOS.Click += BtnAbrirPOS_Click;

            panelFooter.Controls.Add(btnCancelar);
            panelFooter.Controls.Add(btnInstalar);
            panelFooter.Controls.Add(btnAbrirPOS);

            // PANEL CONFIGURACION
            panelConfig = new Panel();
            panelConfig.Location = new Point(20, 95);
            panelConfig.Size = new Size(625, 230);
            panelConfig.BackColor = Color.Transparent;

            rbModoRapido = new RadioButton();
            rbModoRapido.Text = "Instalacion Rapida Predeterminada (Recomendada - 1 Clic)";
            rbModoRapido.Location = new Point(10, 8);
            rbModoRapido.Size = new Size(580, 24);
            rbModoRapido.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            rbModoRapido.Checked = true;
            rbModoRapido.CheckedChanged += Modo_CheckedChanged;

            Label lblDescRapido = new Label();
            lblDescRapido.Text = "Configura puerto 3000, llanomio.local, autoarranque permanente y accesos de escritorio.";
            lblDescRapido.Location = new Point(32, 32);
            lblDescRapido.Size = new Size(580, 20);
            lblDescRapido.ForeColor = Color.FromArgb(100, 116, 139);

            rbModoPersonalizado = new RadioButton();
            rbModoPersonalizado.Text = "Instalacion Personalizada";
            rbModoPersonalizado.Location = new Point(10, 58);
            rbModoPersonalizado.Size = new Size(300, 24);
            rbModoPersonalizado.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            rbModoPersonalizado.CheckedChanged += Modo_CheckedChanged;

            gbOpciones = new GroupBox();
            gbOpciones.Text = "Parametros de Red y Servidor";
            gbOpciones.Location = new Point(10, 88);
            gbOpciones.Size = new Size(605, 135);
            gbOpciones.Enabled = false;

            lblPuerto = new Label();
            lblPuerto.Text = "Puerto HTTP:";
            lblPuerto.Location = new Point(20, 26);
            lblPuerto.AutoSize = true;

            txtPuerto = new TextBox();
            txtPuerto.Text = "3000";
            txtPuerto.Location = new Point(115, 23);
            txtPuerto.Size = new Size(80, 23);

            lblDominio = new Label();
            lblDominio.Text = "Dominio Red:";
            lblDominio.Location = new Point(230, 26);
            lblDominio.AutoSize = true;

            txtDominio = new TextBox();
            txtDominio.Text = "llanomio.local";
            txtDominio.Location = new Point(320, 23);
            txtDominio.Size = new Size(150, 23);

            chkAccesosEscritorio = new CheckBox();
            chkAccesosEscritorio.Text = "Crear botones y accesos en el Escritorio";
            chkAccesosEscritorio.Location = new Point(20, 60);
            chkAccesosEscritorio.Size = new Size(280, 22);
            chkAccesosEscritorio.Checked = true;

            chkAutoArranque = new CheckBox();
            chkAutoArranque.Text = "Activar auto-arranque silencioso al encender PC";
            chkAutoArranque.Location = new Point(320, 60);
            chkAutoArranque.Size = new Size(270, 22);
            chkAutoArranque.Checked = true;

            chkIniciarAlFinalizar = new CheckBox();
            chkIniciarAlFinalizar.Text = "Abrir el sistema POS al terminar la instalacion";
            chkIniciarAlFinalizar.Location = new Point(20, 95);
            chkIniciarAlFinalizar.Size = new Size(280, 22);
            chkIniciarAlFinalizar.Checked = true;

            chkResetDB = new CheckBox();
            chkResetDB.Text = "Restablecer BD a estado puro de fabrica";
            chkResetDB.Location = new Point(320, 95);
            chkResetDB.Size = new Size(270, 22);
            chkResetDB.Checked = false;

            gbOpciones.Controls.Add(lblPuerto);
            gbOpciones.Controls.Add(txtPuerto);
            gbOpciones.Controls.Add(lblDominio);
            gbOpciones.Controls.Add(txtDominio);
            gbOpciones.Controls.Add(chkAccesosEscritorio);
            gbOpciones.Controls.Add(chkAutoArranque);
            gbOpciones.Controls.Add(chkIniciarAlFinalizar);
            gbOpciones.Controls.Add(chkResetDB);

            panelConfig.Controls.Add(rbModoRapido);
            panelConfig.Controls.Add(lblDescRapido);
            panelConfig.Controls.Add(rbModoPersonalizado);
            panelConfig.Controls.Add(gbOpciones);

            // PANEL PROGRESO
            panelProgreso = new Panel();
            panelProgreso.Location = new Point(20, 335);
            panelProgreso.Size = new Size(625, 175);
            panelProgreso.BackColor = Color.Transparent;

            lblEstadoFase = new Label();
            lblEstadoFase.Text = "Estado: Preparado para iniciar";
            lblEstadoFase.Location = new Point(5, 5);
            lblEstadoFase.Size = new Size(500, 20);
            lblEstadoFase.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblEstadoFase.ForeColor = Color.FromArgb(51, 65, 85);

            lblPorcentaje = new Label();
            lblPorcentaje.Text = "0%";
            lblPorcentaje.Location = new Point(570, 5);
            lblPorcentaje.Size = new Size(45, 20);
            lblPorcentaje.TextAlign = ContentAlignment.MiddleRight;
            lblPorcentaje.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblPorcentaje.ForeColor = Color.FromArgb(51, 65, 85);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(5, 28);
            progressBar.Size = new Size(610, 20);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Minimum = 0;
            progressBar.Maximum = 100;
            progressBar.Value = 0;

            txtLogs = new TextBox();
            txtLogs.Location = new Point(5, 56);
            txtLogs.Size = new Size(610, 115);
            txtLogs.Multiline = true;
            txtLogs.ScrollBars = ScrollBars.Vertical;
            txtLogs.ReadOnly = true;
            txtLogs.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            txtLogs.ForeColor = Color.FromArgb(226, 232, 240); // Slate 200
            txtLogs.Font = new Font("Consolas", 8.5F);

            panelProgreso.Controls.Add(lblEstadoFase);
            panelProgreso.Controls.Add(lblPorcentaje);
            panelProgreso.Controls.Add(progressBar);
            panelProgreso.Controls.Add(txtLogs);

            // AGREGAR AL FORM
            this.Controls.Add(panelProgreso);
            this.Controls.Add(panelConfig);
            this.Controls.Add(panelFooter);
            this.Controls.Add(panelHeader);

            // BACKGROUND WORKER
            worker = new BackgroundWorker();
            worker.WorkerReportsProgress = true;
            worker.DoWork += Worker_DoWork;
            worker.ProgressChanged += Worker_ProgressChanged;
            worker.RunWorkerCompleted += Worker_RunWorkerCompleted;
        }

        private void CargarConfiguracionActual()
        {
            try
            {
                string envPath = Path.Combine(baseDir, ".env");
                if (File.Exists(envPath))
                {
                    string[] lines = File.ReadAllLines(envPath);
                    foreach (string line in lines)
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("PORT="))
                            txtPuerto.Text = trimmed.Substring(5).Trim();
                        if (trimmed.StartsWith("LOCAL_DOMAIN="))
                            txtDominio.Text = trimmed.Substring(13).Trim();
                    }
                }
            }
            catch {}
        }

        private void Modo_CheckedChanged(object sender, EventArgs e)
        {
            gbOpciones.Enabled = rbModoPersonalizado.Checked;
            if (rbModoRapido.Checked)
            {
                txtPuerto.Text = "3000";
                txtDominio.Text = "llanomio.local";
                chkAccesosEscritorio.Checked = true;
                chkAutoArranque.Checked = true;
                chkIniciarAlFinalizar.Checked = true;
                chkResetDB.Checked = false;
            }
        }

        private void BtnInstalar_Click(object sender, EventArgs e)
        {
            btnInstalar.Enabled = false;
            btnCancelar.Enabled = false;
            panelConfig.Enabled = false;
            txtLogs.Clear();

            worker.RunWorkerAsync();
        }

        private void Worker_ProgressChanged(object sender, ProgressChangedEventArgs e)
        {
            progressBar.Value = Math.Min(100, Math.Max(0, e.ProgressPercentage));
            lblPorcentaje.Text = e.ProgressPercentage + "%";
            
            if (e.UserState != null)
            {
                string mensaje = e.UserState.ToString();
                lblEstadoFase.Text = "Estado: " + mensaje;
                txtLogs.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + mensaje + Environment.NewLine);
                txtLogs.SelectionStart = txtLogs.TextLength;
                txtLogs.ScrollToCaret();
            }
        }

        private void Worker_DoWork(object sender, DoWorkEventArgs e)
        {
            try
            {
                // Parametros seleccionados
                string port = "3000";
                string domain = "llanomio.local";
                bool crearAccesos = true;
                bool autoArranque = true;
                bool resetDb = false;

                this.Invoke(new Action(() => {
                    port = txtPuerto.Text.Trim();
                    domain = txtDominio.Text.Trim();
                    crearAccesos = chkAccesosEscritorio.Checked;
                    autoArranque = chkAutoArranque.Checked;
                    resetDb = chkResetDB.Checked;
                }));

                // FASE 1: Limpieza
                worker.ReportProgress(10, "Purgando servicios previos y liberando puertos...");
                EjecutarComandoSilencioso("cmd.exe", "/c taskkill /F /IM node.exe >nul 2>&1");
                EjecutarComandoSilencioso("cmd.exe", "/c netsh advfirewall firewall delete rule name=\"POS_LLANOMIO_PUERTOS_WEB_IN\" >nul 2>&1");
                EjecutarComandoSilencioso("cmd.exe", "/c netsh advfirewall firewall delete rule name=\"POS_LLANOMIO_PUERTOS_WEB_OUT\" >nul 2>&1");
                Thread.Sleep(800);

                // FASE 2: Configuracion de Entorno
                worker.ReportProgress(25, "Escribiendo configuracion de produccion (.env)...");
                GuardarArchivoEnv(port, domain);
                Thread.Sleep(500);

                // FASE 3: Bovedas y Carpetas
                worker.ReportProgress(40, "Verificando bovedas locales y carpetas de datos...");
                AsegurarCarpetas();
                Thread.Sleep(500);

                // FASE 4: Base de Datos
                worker.ReportProgress(55, "Sincronizando esquema de base de datos SQLite...");
                if (resetDb)
                {
                    EjecutarNodeScript("scripts\\reset-db-fabrica.js");
                }
                EjecutarNodeScript("scripts\\asegurar-admin.js");
                Thread.Sleep(600);

                // FASE 5: Reglas de Windows Defender Firewall
                worker.ReportProgress(70, "Configurando reglas de red en Windows Firewall...");
                EjecutarComandoSilencioso("netsh.exe", "advfirewall firewall add rule name=\"POS_LLANOMIO_PUERTOS_WEB_IN\" dir=in action=allow protocol=TCP localport=" + port + " profile=any description=\"Acceso Web Entrante para terminales POS en Red Local\"");
                EjecutarComandoSilencioso("netsh.exe", "advfirewall firewall add rule name=\"POS_LLANOMIO_PUERTOS_WEB_OUT\" dir=out action=allow protocol=TCP localport=" + port + " profile=any description=\"Acceso Web Saliente para terminales POS en Red Local\"");
                EjecutarComandoSilencioso("netsh.exe", "advfirewall firewall add rule name=\"POS_LLANOMIO_MDNS_IN\" dir=in action=allow protocol=UDP localport=5353 profile=any description=\"Resolucion Bonjour mDNS Entrante\"");
                EjecutarComandoSilencioso("netsh.exe", "advfirewall firewall add rule name=\"POS_LLANOMIO_MDNS_OUT\" dir=out action=allow protocol=UDP localport=5353 profile=any description=\"Resolucion Bonjour mDNS Saliente\"");
                Thread.Sleep(500);

                // FASE 6: Auto-Arranque
                if (autoArranque)
                {
                    worker.ReportProgress(80, "Registrando auto-arranque silencioso en Windows...");
                    RegistrarAutoArranque();
                }

                // FASE 7: Botonera y Accesos Directos
                if (crearAccesos)
                {
                    worker.ReportProgress(90, "Creando botonera de accesos directos en el Escritorio...");
                    CrearAccesosEscritorio();
                }

                worker.ReportProgress(100, "Instalacion y configuracion finalizada con exito.");
                e.Result = true;
            }
            catch (Exception ex)
            {
                e.Result = false;
                worker.ReportProgress(100, "Error en instalacion: " + ex.Message);
            }
        }

        private void Worker_RunWorkerCompleted(object sender, RunWorkerCompletedEventArgs e)
        {
            instalacionCompletada = (e.Result is bool && (bool)e.Result);
            btnCancelar.Enabled = true;
            btnCancelar.Text = "Cerrar";

            if (instalacionCompletada)
            {
                btnInstalar.Visible = false;
                btnAbrirPOS.Visible = true;
                lblEstadoFase.Text = "Estado: Servidor POS preparado y listo para operar.";
                lblEstadoFase.ForeColor = Color.FromArgb(16, 185, 129);

                bool abrir = false;
                this.Invoke(new Action(() => { abrir = chkIniciarAlFinalizar.Checked; }));
                if (abrir)
                {
                    LanzarServidor();
                }
            }
            else
            {
                btnInstalar.Enabled = true;
                panelConfig.Enabled = true;
                lblEstadoFase.ForeColor = Color.FromArgb(220, 38, 38);
            }
        }

        private void BtnAbrirPOS_Click(object sender, EventArgs e)
        {
            LanzarServidor();
            this.Close();
        }

        private void LanzarServidor()
        {
            string exeIniciar = Path.Combine(baseDir, "Iniciar_Servidor_POS.exe");
            if (File.Exists(exeIniciar))
            {
                Process.Start(new ProcessStartInfo {
                    FileName = exeIniciar,
                    WorkingDirectory = baseDir,
                    UseShellExecute = true
                });
            }
        }

        private void GuardarArchivoEnv(string port, string domain)
        {
            string envPath = Path.Combine(baseDir, ".env");
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("# Configuracion Oficial de Produccion POS Local");
            sb.AppendLine("NODE_ENV=production");
            sb.AppendLine("PORT=" + port);
            sb.AppendLine("HTTP_PORT=" + port);
            sb.AppendLine("LOCAL_DOMAIN=" + domain);
            sb.AppendLine("INSTANCE_ID=pos-llanomio");
            sb.AppendLine("DATABASE_URL=\"file:./llanomio.db\"");
            sb.AppendLine("HOSTNAME=0.0.0.0");
            sb.AppendLine("NEXTAUTH_SECRET=pos_secret_token_seguro_2026_local_key");

            File.WriteAllText(envPath, sb.ToString(), Encoding.UTF8);
        }

        private void AsegurarCarpetas()
        {
            string[] dirs = new string[] {
                Path.Combine(baseDir, ".tmp"),
                Path.Combine(baseDir, "database"),
                Path.Combine(baseDir, "database", "backups_locales"),
                Path.Combine(baseDir, "actualizaciones"),
                "C:\\POS_BACKUPS",
                "C:\\POS_BACKUPS\\historial",
                "C:\\POS_BACKUPS\\inventario",
                "C:\\POS_BACKUPS\\clientes",
                "C:\\POS_BACKUPS\\historial_facturas",
                "C:\\POS_BACKUPS\\movimientos_caja",
                "C:\\POS_BACKUPS\\gastos_operativos",
                "C:\\POS_BACKUPS\\salvaguarda_pre_actualizacion"
            };

            foreach (string d in dirs)
            {
                try { if (!Directory.Exists(d)) Directory.CreateDirectory(d); } catch {}
            }
        }

        private void RegistrarAutoArranque()
        {
            try
            {
                string startupUser = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Microsoft\\Windows\\Start Menu\\Programs\\Startup");
                string scriptRecuperar = Path.Combine(baseDir, "RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat");
                
                // VBScript invisible que ejecuta silenciosamente la recuperación y levanta el servidor al encender el PC
                string vbsContent = "Set WshShell = CreateObject(\"WScript.Shell\")\r\n" +
                                   "WshShell.Run Chr(34) & \"" + scriptRecuperar.Replace("\\", "\\\\") + "\" & Chr(34) & \" --silencioso\", 0, False\r\n";

                if (Directory.Exists(startupUser))
                {
                    File.WriteAllText(Path.Combine(startupUser, "AutoArranque_POS_Llanomio.vbs"), vbsContent, Encoding.Default);
                }

                // Tarea programada en Task Scheduler como mecanismo de contingencia reforzado al iniciar sesión
                EjecutarComandoSilencioso("schtasks.exe", "/Delete /TN \"POS_Llanomio_AutoArranque\" /F");
                EjecutarComandoSilencioso("schtasks.exe", "/Create /TN \"POS_Llanomio_AutoArranque\" /TR \"\\\"" + scriptRecuperar + "\\\" --silencioso\" /SC ONLOGON /RL HIGHEST /F");
            }
            catch {}
        }

        private void CrearAccesosEscritorio()
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                string oneDriveDesktop = Path.Combine(userProfile, "OneDrive", "Desktop");
                
                List<string> escritorios = new List<string>();
                if (Directory.Exists(desktop)) escritorios.Add(desktop);
                if (Directory.Exists(oneDriveDesktop) && !escritorios.Contains(oneDriveDesktop)) escritorios.Add(oneDriveDesktop);

                string iconosDir = Path.Combine(baseDir, "instalador_tienda", "iconos");

                string icoVerde = Path.Combine(iconosDir, "icono_iniciar_verde.ico");
                string icoRojo = Path.Combine(iconosDir, "icono_detener_rojo.ico");
                string icoAurora = Path.Combine(baseDir, "aurora.ico");

                if (!File.Exists(icoVerde)) icoVerde = icoAurora;
                if (!File.Exists(icoRojo)) icoRojo = icoAurora;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic shell = Activator.CreateInstance(shellType);

                string exeIniciar = Path.Combine(baseDir, "Iniciar_Servidor_POS.exe");
                string exeDetener = Path.Combine(baseDir, "Detener_Servidor_POS.exe");

                foreach (string rutaEscritorio in escritorios)
                {
                    // 1. Iniciar Servidor POS (Único botón para iniciar o abrir si ya está activo)
                    if (File.Exists(exeIniciar))
                    {
                        dynamic sc1 = shell.CreateShortcut(Path.Combine(rutaEscritorio, "Iniciar Servidor POS.lnk"));
                        sc1.TargetPath = exeIniciar;
                        sc1.WorkingDirectory = baseDir;
                        sc1.IconLocation = icoVerde;
                        sc1.Description = "Iniciar Servidor y Abrir Sistema POS Llanomio";
                        sc1.Save();
                    }

                    // 2. Detener Servidor POS (Único botón para pausar y detener)
                    if (File.Exists(exeDetener))
                    {
                        dynamic sc2 = shell.CreateShortcut(Path.Combine(rutaEscritorio, "Detener Servidor POS.lnk"));
                        sc2.TargetPath = exeDetener;
                        sc2.WorkingDirectory = baseDir;
                        sc2.IconLocation = icoRojo;
                        sc2.Description = "Detener Servidor Local Aurora POS";
                        sc2.Save();
                    }

                    // Eliminar accesos directos anteriores innecesarios para dejar únicamente los 2 solicitados
                    string[] obsoletos = new string[] {
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
                    };

                    foreach (string obs in obsoletos)
                    {
                        string p = Path.Combine(rutaEscritorio, obs);
                        if (File.Exists(p)) { try { File.Delete(p); } catch {} }
                    }
                }
            }
            catch {}
        }

        private void EjecutarComandoSilencioso(string fileName, string args)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo {
                    FileName = fileName,
                    Arguments = args,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process p = Process.Start(psi);
                if (p != null) p.WaitForExit(10000);
            }
            catch {}
        }

        private void EjecutarNodeScript(string relPath)
        {
            string fullPath = Path.Combine(baseDir, relPath);
            if (!File.Exists(fullPath)) return;

            string nodeExe = "node";
            string portableNode = Path.Combine(baseDir, "runtime\\node\\node.exe");
            if (File.Exists(portableNode)) nodeExe = portableNode;

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo {
                    FileName = nodeExe,
                    Arguments = "\"" + fullPath + "\"",
                    WorkingDirectory = baseDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process p = Process.Start(psi);
                if (p != null) p.WaitForExit(15000);
            }
            catch {}
        }

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new FormInstalador());
        }
    }
}

