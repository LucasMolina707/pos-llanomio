using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace AuroraHost.POS.ControlServidor
{
    public class Program
    {
        [STAThread]
        public static void Main()
        {
            try
            {
                // Auto-elevacion con permisos de Administrador si no los tiene
                if (!EsAdministrador())
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = Application.ExecutablePath;
                    psi.UseShellExecute = true;
                    psi.Verb = "runas";
                    try
                    {
                        Process.Start(psi);
                    }
                    catch
                    {
                        MessageBox.Show(
                            "Este programa requiere permisos de Administrador para controlar los servicios de Windows, el Firewall y las copias de seguridad.",
                            "Permisos Requeridos - POS Llanomio",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );
                    }
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new FormPanelPrincipal());
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar el Panel: " + ex.Message, "Error Critico", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        public static bool EsAdministrador()
        {
            try
            {
                WindowsIdentity id = WindowsIdentity.GetCurrent();
                WindowsPrincipal principal = new WindowsPrincipal(id);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
            catch
            {
                return false;
            }
        }
    }

    public class FormPanelPrincipal : Form
    {
        public const string NOMBRE_SERVICIO = "POS_Llanomio";
        public const string PIN_MAESTRO_SOPORTE = "000000";

        private string baseDir;
        private string puertoConfigurado = "3000";
        private string ipLanDetectada = "127.0.0.1";
        private string urlLanActual = "http://127.0.0.1:3000";

        // Encabezado nativo limpio
        private Panel panelHeader;
        private Label lblLogoTitulo;
        private Label lblSubtitulo;
        private Panel badgeEstadoServidor;
        private Label lblBadgeTexto;

        // Pestanas principales de navegacion
        private TabControl tabControlPrincipal;
        private TabPage tabDashboard;
        private TabPage tabServicioRed;
        private TabPage tabBackups;
        private TabPage tabCuentas;

        // Controles Tab 1: Estado y QR
        private Panel panelCentroDashboard;
        private Panel cardServidor;
        private Label lblTituloCardServidor;
        private Label lblEstadoServicio;
        private Label lblEstadoHttp;
        private Label lblPuertoActivo;
        private Label lblUrlLocal;
        private Label lblUrlLan;
        private Button btnCopiarUrlLocal;
        private Button btnCopiarUrlLan;
        private Button btnAbrirPos;
        private Button btnIniciarServicio;
        private Button btnDetenerConBackup;
        private Label lblNotaDetencion;

        private Panel cardQr;
        private Label lblTituloQr;
        private Label lblSubtituloQr;
        private PictureBox picQr;
        private Label lblUrlQrTexto;
        private Button btnRefrescarQr;
        private Button btnCopiarLanQr;

        // Controles Tab 2: Servicio y Red
        private Panel panelCentroServicio;
        private GroupBox grpServicioWin;
        private Button btnInstalarServicio;
        private Button btnReiniciarServicio;
        private Button btnDesinstalarServicio;
        private Label lblInfoServicio;

        private GroupBox grpFirewall;
        private Button btnRepararFirewall;
        private Label lblInfoFirewall;

        private GroupBox grpPuerto;
        private Label lblEtiquetaPuerto;
        private TextBox txtPuertoConfig;
        private Button btnGuardarPuerto;

        // Controles Tab 3: Respaldos
        private Panel panelTopBackups;
        private Button btnCrearBackup;
        private Button btnAbrirCarpeta;
        private Button btnRefrescarBackups;
        private ListBox lstBackups;
        private Panel panelBottomBackups;
        private Button btnRestaurarSeleccionado;
        private Button btnRestaurarExterno;

        // Controles Tab 4: Cuentas y Fabrica
        private Panel panelCentroCuentas;
        private GroupBox grpNuevoUsuario;
        private TextBox txtNombreUser;
        private TextBox txtUsername;
        private ComboBox cmbRol;
        private TextBox txtPassword;
        private TextBox txtPin;
        private Button btnCrearUsuario;
        private Label lblInfoNuevoUsuario;

        private GroupBox grpAccesoMaestro;
        private Button btnRestablecerAdmin;
        private Button btnFormatearFabrica;
        private Label lblInfoFabrica;

        // Temporizador de refresco en vivo
        private System.Windows.Forms.Timer timerMonitor;
        private bool estaOcupado = false;
        private string ultimoQrGenerado = "";

        public FormPanelPrincipal()
        {
            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(baseDir);

            LeerVariablesEntorno();
            DetectarIpLan();
            ActualizarUrls();
            InicializarComponentes();

            timerMonitor = new System.Windows.Forms.Timer();
            timerMonitor.Interval = 3000;
            timerMonitor.Tick += delegate { RefrescarEstadoEnVivo(); };
            timerMonitor.Start();

            this.Shown += delegate
            {
                RefrescarEstadoEnVivo();
                GenerarQrLocalSeguro();
                AjustarLayoutCentrado();
            };
        }

        private void LeerVariablesEntorno()
        {
            try
            {
                string envPath = Path.Combine(baseDir, ".env");
                if (File.Exists(envPath))
                {
                    string[] lineas = File.ReadAllLines(envPath);
                    foreach (string linea in lineas)
                    {
                        string trim = linea.Trim();
                        if (trim.StartsWith("PORT=", StringComparison.OrdinalIgnoreCase))
                        {
                            string[] p = trim.Split('=');
                            if (p.Length > 1 && !string.IsNullOrEmpty(p[1].Trim()))
                            {
                                puertoConfigurado = p[1].Trim().Replace("\"", "").Replace("'", "");
                            }
                        }
                    }
                }
            }
            catch { }
        }

        private void GuardarPuertoEnDotEnv(string nuevoPuerto)
        {
            try
            {
                string envPath = Path.Combine(baseDir, ".env");
                List<string> lineasNuevas = new List<string>();
                bool encontrado = false;

                if (File.Exists(envPath))
                {
                    string[] lineas = File.ReadAllLines(envPath);
                    foreach (string l in lineas)
                    {
                        string t = l.Trim();
                        if (t.StartsWith("PORT=", StringComparison.OrdinalIgnoreCase))
                        {
                            lineasNuevas.Add("PORT=" + nuevoPuerto);
                            encontrado = true;
                        }
                        else if (t.StartsWith("HTTP_PORT=", StringComparison.OrdinalIgnoreCase))
                        {
                            lineasNuevas.Add("HTTP_PORT=" + nuevoPuerto);
                        }
                        else
                        {
                            lineasNuevas.Add(l);
                        }
                    }
                }

                if (!encontrado)
                {
                    lineasNuevas.Add("PORT=" + nuevoPuerto);
                    lineasNuevas.Add("HTTP_PORT=" + nuevoPuerto);
                }

                File.WriteAllLines(envPath, lineasNuevas.ToArray(), Encoding.UTF8);
                puertoConfigurado = nuevoPuerto;
                ActualizarUrls();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al actualizar el archivo .env: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void DetectarIpLan()
        {
            try
            {
                NetworkInterface[] interfaces = NetworkInterface.GetAllNetworkInterfaces();
                foreach (NetworkInterface ni in interfaces)
                {
                    if (ni.OperationalStatus == OperationalStatus.Up &&
                        ni.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                        !ni.Description.ToLower().Contains("virtual") &&
                        !ni.Description.ToLower().Contains("pseudo") &&
                        !ni.Description.ToLower().Contains("vpn"))
                    {
                        IPInterfaceProperties props = ni.GetIPProperties();
                        foreach (UnicastIPAddressInformation ip in props.UnicastAddresses)
                        {
                            if (ip.Address.AddressFamily == AddressFamily.InterNetwork)
                            {
                                string ipStr = ip.Address.ToString();
                                if (!ipStr.StartsWith("127.") && !ipStr.StartsWith("169.254."))
                                {
                                    ipLanDetectada = ipStr;
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            catch { }
            ipLanDetectada = "127.0.0.1";
        }

        private void ActualizarUrls()
        {
            urlLanActual = "http://" + ipLanDetectada + ":" + puertoConfigurado;
        }

        private void InicializarComponentes()
        {
            // Propiedades de ventana nativa de Windows
            this.Text = "POS Llanomio - Servidor y Control";
            this.Size = new Size(960, 680);
            this.MinimumSize = new Size(880, 600);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.Sizable;
            this.MaximizeBox = true;
            this.MinimizeBox = true;
            this.BackColor = Color.FromArgb(248, 250, 252); // Slate 50
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);

            // Icono de la aplicacion
            try
            {
                string icoPath = Path.Combine(baseDir, "aurora.ico");
                if (!File.Exists(icoPath)) icoPath = Path.Combine(baseDir, "public", "iconos", "aurora.ico");
                if (File.Exists(icoPath)) this.Icon = new Icon(icoPath);
            }
            catch { }

            // 1. Barra de Encabezado Superior Nativa y Limpia (Blanca con borde sutil)
            panelHeader = new Panel();
            panelHeader.Dock = DockStyle.Top;
            panelHeader.Height = 56;
            panelHeader.BackColor = Color.White;
            panelHeader.Paint += delegate(object sender, PaintEventArgs e)
            {
                using (Pen p = new Pen(Color.FromArgb(226, 232, 240), 1))
                {
                    e.Graphics.DrawLine(p, 0, panelHeader.Height - 1, panelHeader.Width, panelHeader.Height - 1);
                }
            };
            this.Controls.Add(panelHeader);

            lblLogoTitulo = new Label();
            lblLogoTitulo.Text = "POS Llanomio";
            lblLogoTitulo.Font = new Font("Segoe UI", 12.5F, FontStyle.Bold);
            lblLogoTitulo.ForeColor = Color.FromArgb(15, 23, 42); // Slate 900
            lblLogoTitulo.Location = new Point(20, 14);
            lblLogoTitulo.AutoSize = true;
            panelHeader.Controls.Add(lblLogoTitulo);

            lblSubtitulo = new Label();
            lblSubtitulo.Text = "· Servidor Local y Respaldo Autonomo";
            lblSubtitulo.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSubtitulo.ForeColor = Color.FromArgb(100, 116, 139); // Slate 500
            lblSubtitulo.Location = new Point(148, 18);
            lblSubtitulo.AutoSize = true;
            panelHeader.Controls.Add(lblSubtitulo);

            // Badge / Pildora de Estado en vivo en la cabecera
            badgeEstadoServidor = new Panel();
            badgeEstadoServidor.Size = new Size(170, 28);
            badgeEstadoServidor.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            badgeEstadoServidor.BackColor = Color.FromArgb(241, 245, 249);
            badgeEstadoServidor.BorderStyle = BorderStyle.FixedSingle;
            panelHeader.Controls.Add(badgeEstadoServidor);

            lblBadgeTexto = new Label();
            lblBadgeTexto.Text = "Comprobando...";
            lblBadgeTexto.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            lblBadgeTexto.ForeColor = Color.FromArgb(71, 85, 105);
            lblBadgeTexto.Dock = DockStyle.Fill;
            lblBadgeTexto.TextAlign = ContentAlignment.MiddleCenter;
            badgeEstadoServidor.Controls.Add(lblBadgeTexto);

            // 2. Control de Pestanas Principal
            tabControlPrincipal = new TabControl();
            tabControlPrincipal.Dock = DockStyle.Fill;
            tabControlPrincipal.Font = new Font("Segoe UI", 9.5F);
            tabControlPrincipal.ItemSize = new Size(140, 32);
            tabControlPrincipal.SizeMode = TabSizeMode.Fixed;
            this.Controls.Add(tabControlPrincipal);

            tabDashboard = new TabPage("Estado y QR");
            tabDashboard.BackColor = Color.FromArgb(248, 250, 252);
            tabControlPrincipal.TabPages.Add(tabDashboard);

            tabServicioRed = new TabPage("Servicio y Red");
            tabServicioRed.BackColor = Color.FromArgb(248, 250, 252);
            tabControlPrincipal.TabPages.Add(tabServicioRed);

            tabBackups = new TabPage("Respaldos");
            tabBackups.BackColor = Color.FromArgb(248, 250, 252);
            tabControlPrincipal.TabPages.Add(tabBackups);

            tabCuentas = new TabPage("Cuentas y Fabrica");
            tabCuentas.BackColor = Color.FromArgb(248, 250, 252);
            tabControlPrincipal.TabPages.Add(tabCuentas);

            ConstruirTabDashboard();
            ConstruirTabServicioRed();
            ConstruirTabBackups();
            ConstruirTabCuentas();

            this.Resize += delegate
            {
                ReposicionarBadgeHeader();
                AjustarLayoutCentrado();
            };

            ReposicionarBadgeHeader();
        }

        private void ReposicionarBadgeHeader()
        {
            if (badgeEstadoServidor == null || panelHeader == null) return;
            badgeEstadoServidor.Location = new Point(panelHeader.ClientSize.Width - 190, 14);
        }

        // =========================================================================
        // PESTANA 1: ESTADO Y QR (DASHBOARD PRINCIPAL)
        // =========================================================================
        private void ConstruirTabDashboard()
        {
            panelCentroDashboard = new Panel();
            panelCentroDashboard.Size = new Size(880, 500);
            panelCentroDashboard.BackColor = Color.Transparent;
            tabDashboard.Controls.Add(panelCentroDashboard);

            // Card Izquierda: Estado y Control
            cardServidor = new Panel();
            cardServidor.Location = new Point(20, 20);
            cardServidor.Size = new Size(490, 460);
            cardServidor.BackColor = Color.White;
            cardServidor.BorderStyle = BorderStyle.FixedSingle;
            panelCentroDashboard.Controls.Add(cardServidor);

            lblTituloCardServidor = new Label();
            lblTituloCardServidor.Text = "Estado del Servidor";
            lblTituloCardServidor.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            lblTituloCardServidor.ForeColor = Color.FromArgb(15, 23, 42);
            lblTituloCardServidor.Location = new Point(20, 18);
            lblTituloCardServidor.AutoSize = true;
            cardServidor.Controls.Add(lblTituloCardServidor);

            lblEstadoServicio = new Label();
            lblEstadoServicio.Text = "Servicio Windows: Consultando...";
            lblEstadoServicio.Font = new Font("Segoe UI", 9.5F);
            lblEstadoServicio.Location = new Point(20, 55);
            lblEstadoServicio.AutoSize = true;
            cardServidor.Controls.Add(lblEstadoServicio);

            lblEstadoHttp = new Label();
            lblEstadoHttp.Text = "Respuesta Web: Consultando...";
            lblEstadoHttp.Font = new Font("Segoe UI", 9.5F);
            lblEstadoHttp.Location = new Point(20, 85);
            lblEstadoHttp.AutoSize = true;
            cardServidor.Controls.Add(lblEstadoHttp);

            lblPuertoActivo = new Label();
            lblPuertoActivo.Text = "Puerto TCP: " + puertoConfigurado;
            lblPuertoActivo.Font = new Font("Segoe UI", 9.5F);
            lblPuertoActivo.Location = new Point(20, 115);
            lblPuertoActivo.AutoSize = true;
            cardServidor.Controls.Add(lblPuertoActivo);

            lblUrlLocal = new Label();
            lblUrlLocal.Text = "Local: http://localhost:" + puertoConfigurado;
            lblUrlLocal.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblUrlLocal.ForeColor = Color.FromArgb(2, 132, 199);
            lblUrlLocal.Location = new Point(20, 150);
            lblUrlLocal.AutoSize = true;
            cardServidor.Controls.Add(lblUrlLocal);

            btnCopiarUrlLocal = new Button();
            btnCopiarUrlLocal.Text = "Copiar";
            btnCopiarUrlLocal.Size = new Size(70, 24);
            btnCopiarUrlLocal.Location = new Point(395, 147);
            btnCopiarUrlLocal.BackColor = Color.FromArgb(241, 245, 249);
            btnCopiarUrlLocal.FlatStyle = FlatStyle.Flat;
            btnCopiarUrlLocal.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnCopiarUrlLocal.Font = new Font("Segoe UI", 8F);
            btnCopiarUrlLocal.Cursor = Cursors.Hand;
            btnCopiarUrlLocal.Click += delegate
            {
                Clipboard.SetText("http://localhost:" + puertoConfigurado);
                MessageBox.Show("URL local copiada:\nhttp://localhost:" + puertoConfigurado, "Copiado", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };
            cardServidor.Controls.Add(btnCopiarUrlLocal);

            lblUrlLan = new Label();
            lblUrlLan.Text = "Red Wi-Fi: " + urlLanActual;
            lblUrlLan.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblUrlLan.ForeColor = Color.FromArgb(16, 185, 129);
            lblUrlLan.Location = new Point(20, 185);
            lblUrlLan.AutoSize = true;
            cardServidor.Controls.Add(lblUrlLan);

            btnCopiarUrlLan = new Button();
            btnCopiarUrlLan.Text = "Copiar";
            btnCopiarUrlLan.Size = new Size(70, 24);
            btnCopiarUrlLan.Location = new Point(395, 182);
            btnCopiarUrlLan.BackColor = Color.FromArgb(241, 245, 249);
            btnCopiarUrlLan.FlatStyle = FlatStyle.Flat;
            btnCopiarUrlLan.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnCopiarUrlLan.Font = new Font("Segoe UI", 8F);
            btnCopiarUrlLan.Cursor = Cursors.Hand;
            btnCopiarUrlLan.Click += delegate
            {
                Clipboard.SetText(urlLanActual);
                MessageBox.Show("URL de red Wi-Fi copiada:\n" + urlLanActual, "Copiado", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };
            cardServidor.Controls.Add(btnCopiarUrlLan);

            // Boton Principal
            btnAbrirPos = new Button();
            btnAbrirPos.Text = "Abrir POS en Navegador";
            btnAbrirPos.Location = new Point(20, 235);
            btnAbrirPos.Size = new Size(445, 48);
            btnAbrirPos.BackColor = Color.FromArgb(2, 132, 199); // Sky 600
            btnAbrirPos.ForeColor = Color.White;
            btnAbrirPos.FlatStyle = FlatStyle.Flat;
            btnAbrirPos.FlatAppearance.BorderSize = 0;
            btnAbrirPos.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            btnAbrirPos.Cursor = Cursors.Hand;
            btnAbrirPos.Click += delegate { AbrirNavegadorPos(); };
            cardServidor.Controls.Add(btnAbrirPos);

            // Fila de 2 botones de servicio
            btnIniciarServicio = new Button();
            btnIniciarServicio.Text = "Iniciar Servicio";
            btnIniciarServicio.Location = new Point(20, 298);
            btnIniciarServicio.Size = new Size(215, 42);
            btnIniciarServicio.BackColor = Color.FromArgb(5, 150, 105); // Emerald 600
            btnIniciarServicio.ForeColor = Color.White;
            btnIniciarServicio.FlatStyle = FlatStyle.Flat;
            btnIniciarServicio.FlatAppearance.BorderSize = 0;
            btnIniciarServicio.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnIniciarServicio.Cursor = Cursors.Hand;
            btnIniciarServicio.Click += delegate { IniciarServidorAccion(); };
            cardServidor.Controls.Add(btnIniciarServicio);

            btnDetenerConBackup = new Button();
            btnDetenerConBackup.Text = "Detener con Respaldo";
            btnDetenerConBackup.Location = new Point(250, 298);
            btnDetenerConBackup.Size = new Size(215, 42);
            btnDetenerConBackup.BackColor = Color.FromArgb(220, 38, 38); // Red 600
            btnDetenerConBackup.ForeColor = Color.White;
            btnDetenerConBackup.FlatStyle = FlatStyle.Flat;
            btnDetenerConBackup.FlatAppearance.BorderSize = 0;
            btnDetenerConBackup.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnDetenerConBackup.Cursor = Cursors.Hand;
            btnDetenerConBackup.Click += delegate { DetenerConRespaldoAccion(); };
            cardServidor.Controls.Add(btnDetenerConBackup);

            lblNotaDetencion = new Label();
            lblNotaDetencion.Text = "Nota: Al detener, se genera y valida obligatoriamente una copia antes de apagar.";
            lblNotaDetencion.Location = new Point(20, 355);
            lblNotaDetencion.Size = new Size(445, 30);
            lblNotaDetencion.Font = new Font("Segoe UI", 8F, FontStyle.Italic);
            lblNotaDetencion.ForeColor = Color.FromArgb(100, 116, 139);
            cardServidor.Controls.Add(lblNotaDetencion);

            // Card Derecha: QR Acceso Movil
            cardQr = new Panel();
            cardQr.Location = new Point(530, 20);
            cardQr.Size = new Size(330, 460);
            cardQr.BackColor = Color.White;
            cardQr.BorderStyle = BorderStyle.FixedSingle;
            panelCentroDashboard.Controls.Add(cardQr);

            lblTituloQr = new Label();
            lblTituloQr.Text = "Acceso Movil (QR Wi-Fi)";
            lblTituloQr.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            lblTituloQr.ForeColor = Color.FromArgb(15, 23, 42);
            lblTituloQr.Location = new Point(16, 18);
            lblTituloQr.AutoSize = true;
            cardQr.Controls.Add(lblTituloQr);

            lblSubtituloQr = new Label();
            lblSubtituloQr.Text = "Escanee para ingresar desde celular o tablet:";
            lblSubtituloQr.Font = new Font("Segoe UI", 8.5F);
            lblSubtituloQr.ForeColor = Color.FromArgb(100, 116, 139);
            lblSubtituloQr.Location = new Point(16, 44);
            lblSubtituloQr.AutoSize = true;
            cardQr.Controls.Add(lblSubtituloQr);

            picQr = new PictureBox();
            picQr.Location = new Point(65, 75);
            picQr.Size = new Size(200, 200);
            picQr.SizeMode = PictureBoxSizeMode.Zoom;
            picQr.BackColor = Color.White;
            picQr.BorderStyle = BorderStyle.FixedSingle;
            cardQr.Controls.Add(picQr);

            lblUrlQrTexto = new Label();
            lblUrlQrTexto.Text = urlLanActual;
            lblUrlQrTexto.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblUrlQrTexto.ForeColor = Color.FromArgb(5, 150, 105);
            lblUrlQrTexto.Location = new Point(16, 285);
            lblUrlQrTexto.Size = new Size(298, 22);
            lblUrlQrTexto.TextAlign = ContentAlignment.MiddleCenter;
            cardQr.Controls.Add(lblUrlQrTexto);

            btnCopiarLanQr = new Button();
            btnCopiarLanQr.Text = "Copiar Enlace LAN";
            btnCopiarLanQr.Location = new Point(20, 320);
            btnCopiarLanQr.Size = new Size(290, 34);
            btnCopiarLanQr.BackColor = Color.FromArgb(241, 245, 249);
            btnCopiarLanQr.FlatStyle = FlatStyle.Flat;
            btnCopiarLanQr.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnCopiarLanQr.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            btnCopiarLanQr.Cursor = Cursors.Hand;
            btnCopiarLanQr.Click += delegate
            {
                Clipboard.SetText(urlLanActual);
                MessageBox.Show("Enlace copiado al portapapeles:\n" + urlLanActual, "Copiado", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };
            cardQr.Controls.Add(btnCopiarLanQr);

            btnRefrescarQr = new Button();
            btnRefrescarQr.Text = "Actualizar QR";
            btnRefrescarQr.Location = new Point(20, 362);
            btnRefrescarQr.Size = new Size(290, 34);
            btnRefrescarQr.BackColor = Color.FromArgb(241, 245, 249);
            btnRefrescarQr.FlatStyle = FlatStyle.Flat;
            btnRefrescarQr.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnRefrescarQr.Font = new Font("Segoe UI", 8.5F);
            btnRefrescarQr.Cursor = Cursors.Hand;
            btnRefrescarQr.Click += delegate
            {
                DetectarIpLan();
                ActualizarUrls();
                lblUrlQrTexto.Text = urlLanActual;
                GenerarQrLocalSeguro();
            };
            cardQr.Controls.Add(btnRefrescarQr);
        }

        // =========================================================================
        // PESTANA 2: SERVICIO Y RED
        // =========================================================================
        private void ConstruirTabServicioRed()
        {
            panelCentroServicio = new Panel();
            panelCentroServicio.Size = new Size(880, 500);
            panelCentroServicio.BackColor = Color.Transparent;
            tabServicioRed.Controls.Add(panelCentroServicio);

            grpServicioWin = new GroupBox();
            grpServicioWin.Text = "Servicio de Windows (POS_Llanomio)";
            grpServicioWin.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            grpServicioWin.Location = new Point(20, 15);
            grpServicioWin.Size = new Size(840, 130);
            panelCentroServicio.Controls.Add(grpServicioWin);

            btnInstalarServicio = new Button();
            btnInstalarServicio.Text = "Instalar / Reparar Servicio";
            btnInstalarServicio.Location = new Point(25, 30);
            btnInstalarServicio.Size = new Size(240, 38);
            btnInstalarServicio.BackColor = Color.FromArgb(241, 245, 249);
            btnInstalarServicio.Font = new Font("Segoe UI", 9F);
            btnInstalarServicio.Click += delegate { InstalarServicioAccion(); };
            grpServicioWin.Controls.Add(btnInstalarServicio);

            btnReiniciarServicio = new Button();
            btnReiniciarServicio.Text = "Reiniciar Servicio";
            btnReiniciarServicio.Location = new Point(285, 30);
            btnReiniciarServicio.Size = new Size(240, 38);
            btnReiniciarServicio.BackColor = Color.FromArgb(241, 245, 249);
            btnReiniciarServicio.Font = new Font("Segoe UI", 9F);
            btnReiniciarServicio.Click += delegate { ReiniciarServicioAccion(); };
            grpServicioWin.Controls.Add(btnReiniciarServicio);

            btnDesinstalarServicio = new Button();
            btnDesinstalarServicio.Text = "Desinstalar Servicio";
            btnDesinstalarServicio.Location = new Point(545, 30);
            btnDesinstalarServicio.Size = new Size(240, 38);
            btnDesinstalarServicio.BackColor = Color.FromArgb(241, 245, 249);
            btnDesinstalarServicio.Font = new Font("Segoe UI", 9F);
            btnDesinstalarServicio.Click += delegate { DesinstalarServicioAccion(); };
            grpServicioWin.Controls.Add(btnDesinstalarServicio);

            lblInfoServicio = new Label();
            lblInfoServicio.Text = "Registra el inicio automatico retardado (delayed-auto) y recuperacion ante fallos en Windows.";
            lblInfoServicio.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            lblInfoServicio.ForeColor = Color.FromArgb(100, 116, 139);
            lblInfoServicio.Location = new Point(25, 80);
            lblInfoServicio.Size = new Size(760, 25);
            grpServicioWin.Controls.Add(lblInfoServicio);

            grpFirewall = new GroupBox();
            grpFirewall.Text = "Seguridad y Firewall de Windows";
            grpFirewall.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            grpFirewall.Location = new Point(20, 160);
            grpFirewall.Size = new Size(840, 120);
            panelCentroServicio.Controls.Add(grpFirewall);

            btnRepararFirewall = new Button();
            btnRepararFirewall.Text = "Reparar Reglas de Firewall y Carpetas";
            btnRepararFirewall.Location = new Point(25, 30);
            btnRepararFirewall.Size = new Size(760, 38);
            btnRepararFirewall.BackColor = Color.FromArgb(241, 245, 249);
            btnRepararFirewall.Font = new Font("Segoe UI", 9F);
            btnRepararFirewall.Click += delegate { RepararFirewallAccion(); };
            grpFirewall.Controls.Add(btnRepararFirewall);

            lblInfoFirewall = new Label();
            lblInfoFirewall.Text = "Asegura la apertura de puertos TCP (3000 o configurado) y UDP 5353 (mDNS) para terminales en la red.";
            lblInfoFirewall.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            lblInfoFirewall.ForeColor = Color.FromArgb(100, 116, 139);
            lblInfoFirewall.Location = new Point(25, 80);
            lblInfoFirewall.Size = new Size(760, 25);
            grpFirewall.Controls.Add(lblInfoFirewall);

            grpPuerto = new GroupBox();
            grpPuerto.Text = "Puerto TCP del Servidor";
            grpPuerto.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            grpPuerto.Location = new Point(20, 295);
            grpPuerto.Size = new Size(840, 95);
            panelCentroServicio.Controls.Add(grpPuerto);

            lblEtiquetaPuerto = new Label();
            lblEtiquetaPuerto.Text = "Puerto:";
            lblEtiquetaPuerto.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblEtiquetaPuerto.Location = new Point(25, 38);
            lblEtiquetaPuerto.AutoSize = true;
            grpPuerto.Controls.Add(lblEtiquetaPuerto);

            txtPuertoConfig = new TextBox();
            txtPuertoConfig.Text = puertoConfigurado;
            txtPuertoConfig.Font = new Font("Segoe UI", 9.5F);
            txtPuertoConfig.Location = new Point(85, 35);
            txtPuertoConfig.Size = new Size(100, 26);
            grpPuerto.Controls.Add(txtPuertoConfig);

            btnGuardarPuerto = new Button();
            btnGuardarPuerto.Text = "Guardar Puerto y Reiniciar";
            btnGuardarPuerto.Location = new Point(205, 31);
            btnGuardarPuerto.Size = new Size(220, 34);
            btnGuardarPuerto.BackColor = Color.FromArgb(241, 245, 249);
            btnGuardarPuerto.Font = new Font("Segoe UI", 9F);
            btnGuardarPuerto.Click += delegate { CambiarPuertoAccion(); };
            grpPuerto.Controls.Add(btnGuardarPuerto);
        }

        // =========================================================================
        // PESTANA 3: RESPALDOS
        // =========================================================================
        private void ConstruirTabBackups()
        {
            panelTopBackups = new Panel();
            panelTopBackups.Dock = DockStyle.Top;
            panelTopBackups.Height = 52;
            panelTopBackups.Padding = new Padding(20, 8, 20, 8);
            tabBackups.Controls.Add(panelTopBackups);

            btnCrearBackup = new Button();
            btnCrearBackup.Text = "Crear Copia Ahora";
            btnCrearBackup.Size = new Size(180, 36);
            btnCrearBackup.Location = new Point(20, 8);
            btnCrearBackup.BackColor = Color.FromArgb(5, 150, 105);
            btnCrearBackup.ForeColor = Color.White;
            btnCrearBackup.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnCrearBackup.Click += delegate { GenerarBackupManualAccion(); };
            panelTopBackups.Controls.Add(btnCrearBackup);

            btnAbrirCarpeta = new Button();
            btnAbrirCarpeta.Text = "Abrir Carpeta (C:\\POS_BACKUPS)";
            btnAbrirCarpeta.Size = new Size(260, 36);
            btnAbrirCarpeta.Location = new Point(215, 8);
            btnAbrirCarpeta.BackColor = Color.FromArgb(241, 245, 249);
            btnAbrirCarpeta.Font = new Font("Segoe UI", 9F);
            btnAbrirCarpeta.Click += delegate { AbrirCarpetaBackupsAccion(); };
            panelTopBackups.Controls.Add(btnAbrirCarpeta);

            btnRefrescarBackups = new Button();
            btnRefrescarBackups.Text = "Refrescar Lista";
            btnRefrescarBackups.Size = new Size(150, 36);
            btnRefrescarBackups.Location = new Point(490, 8);
            btnRefrescarBackups.BackColor = Color.FromArgb(241, 245, 249);
            btnRefrescarBackups.Font = new Font("Segoe UI", 9F);
            btnRefrescarBackups.Click += delegate { CargarListaBackups(); };
            panelTopBackups.Controls.Add(btnRefrescarBackups);

            panelBottomBackups = new Panel();
            panelBottomBackups.Dock = DockStyle.Bottom;
            panelBottomBackups.Height = 56;
            panelBottomBackups.Padding = new Padding(20, 8, 20, 8);
            tabBackups.Controls.Add(panelBottomBackups);

            btnRestaurarSeleccionado = new Button();
            btnRestaurarSeleccionado.Text = "Restaurar Copia Seleccionada";
            btnRestaurarSeleccionado.Size = new Size(260, 38);
            btnRestaurarSeleccionado.Location = new Point(20, 8);
            btnRestaurarSeleccionado.BackColor = Color.FromArgb(220, 38, 38);
            btnRestaurarSeleccionado.ForeColor = Color.White;
            btnRestaurarSeleccionado.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnRestaurarSeleccionado.Click += delegate { RestaurarSeleccionadoAccion(); };
            panelBottomBackups.Controls.Add(btnRestaurarSeleccionado);

            btnRestaurarExterno = new Button();
            btnRestaurarExterno.Text = "Restaurar Archivo .db Externo...";
            btnRestaurarExterno.Size = new Size(260, 38);
            btnRestaurarExterno.Location = new Point(295, 8);
            btnRestaurarExterno.BackColor = Color.FromArgb(30, 41, 59);
            btnRestaurarExterno.ForeColor = Color.White;
            btnRestaurarExterno.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnRestaurarExterno.Click += delegate { RestaurarArchivoExternoAccion(); };
            panelBottomBackups.Controls.Add(btnRestaurarExterno);

            lstBackups = new ListBox();
            lstBackups.Dock = DockStyle.Fill;
            lstBackups.Font = new Font("Consolas", 9F);
            lstBackups.BorderStyle = BorderStyle.FixedSingle;
            tabBackups.Controls.Add(lstBackups);
            lstBackups.BringToFront();

            CargarListaBackups();
        }

        // =========================================================================
        // PESTANA 4: CUENTAS Y FABRICA
        // =========================================================================
        private void ConstruirTabCuentas()
        {
            panelCentroCuentas = new Panel();
            panelCentroCuentas.Size = new Size(880, 500);
            panelCentroCuentas.BackColor = Color.Transparent;
            tabCuentas.Controls.Add(panelCentroCuentas);

            grpNuevoUsuario = new GroupBox();
            grpNuevoUsuario.Text = "Crear Cuenta de Usuario";
            grpNuevoUsuario.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            grpNuevoUsuario.Location = new Point(20, 15);
            grpNuevoUsuario.Size = new Size(840, 210);
            panelCentroCuentas.Controls.Add(grpNuevoUsuario);

            Label lblNom = new Label();
            lblNom.Text = "Nombre:";
            lblNom.Font = new Font("Segoe UI", 8.5F);
            lblNom.Location = new Point(25, 28);
            lblNom.AutoSize = true;
            grpNuevoUsuario.Controls.Add(lblNom);

            txtNombreUser = new TextBox();
            txtNombreUser.Location = new Point(25, 48);
            txtNombreUser.Size = new Size(220, 26);
            txtNombreUser.Font = new Font("Segoe UI", 9F);
            grpNuevoUsuario.Controls.Add(txtNombreUser);

            Label lblUser = new Label();
            lblUser.Text = "Usuario / Login:";
            lblUser.Font = new Font("Segoe UI", 8.5F);
            lblUser.Location = new Point(265, 28);
            lblUser.AutoSize = true;
            grpNuevoUsuario.Controls.Add(lblUser);

            txtUsername = new TextBox();
            txtUsername.Location = new Point(265, 48);
            txtUsername.Size = new Size(180, 26);
            txtUsername.Font = new Font("Segoe UI", 9F);
            grpNuevoUsuario.Controls.Add(txtUsername);

            Label lblRol = new Label();
            lblRol.Text = "Rol:";
            lblRol.Font = new Font("Segoe UI", 8.5F);
            lblRol.Location = new Point(465, 28);
            lblRol.AutoSize = true;
            grpNuevoUsuario.Controls.Add(lblRol);

            cmbRol = new ComboBox();
            cmbRol.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbRol.Items.Add("CAJERO");
            cmbRol.Items.Add("ADMIN");
            cmbRol.SelectedIndex = 0;
            cmbRol.Location = new Point(465, 48);
            cmbRol.Size = new Size(140, 26);
            cmbRol.Font = new Font("Segoe UI", 9F);
            grpNuevoUsuario.Controls.Add(cmbRol);

            Label lblPass = new Label();
            lblPass.Text = "Contrasena:";
            lblPass.Font = new Font("Segoe UI", 8.5F);
            lblPass.Location = new Point(25, 85);
            lblPass.AutoSize = true;
            grpNuevoUsuario.Controls.Add(lblPass);

            txtPassword = new TextBox();
            txtPassword.Location = new Point(25, 105);
            txtPassword.Size = new Size(220, 26);
            txtPassword.Font = new Font("Segoe UI", 9F);
            txtPassword.UseSystemPasswordChar = true;
            grpNuevoUsuario.Controls.Add(txtPassword);

            Label lblPin = new Label();
            lblPin.Text = "PIN (4-6 digitos):";
            lblPin.Font = new Font("Segoe UI", 8.5F);
            lblPin.Location = new Point(265, 85);
            lblPin.AutoSize = true;
            grpNuevoUsuario.Controls.Add(lblPin);

            txtPin = new TextBox();
            txtPin.Location = new Point(265, 105);
            txtPin.Size = new Size(180, 26);
            txtPin.Font = new Font("Segoe UI", 9F);
            txtPin.MaxLength = 6;
            grpNuevoUsuario.Controls.Add(txtPin);

            btnCrearUsuario = new Button();
            btnCrearUsuario.Text = "Crear Usuario";
            btnCrearUsuario.Location = new Point(465, 101);
            btnCrearUsuario.Size = new Size(180, 32);
            btnCrearUsuario.BackColor = Color.FromArgb(5, 150, 105);
            btnCrearUsuario.ForeColor = Color.White;
            btnCrearUsuario.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnCrearUsuario.Click += delegate { CrearUsuarioAccion(); };
            grpNuevoUsuario.Controls.Add(btnCrearUsuario);

            lblInfoNuevoUsuario = new Label();
            lblInfoNuevoUsuario.Text = "Aplica cifrado bcrypt a contrasena y PIN directamente en la base de datos sin requerir el servidor web activo.";
            lblInfoNuevoUsuario.Font = new Font("Segoe UI", 8F);
            lblInfoNuevoUsuario.ForeColor = Color.FromArgb(100, 116, 139);
            lblInfoNuevoUsuario.Location = new Point(25, 155);
            lblInfoNuevoUsuario.Size = new Size(760, 25);
            grpNuevoUsuario.Controls.Add(lblInfoNuevoUsuario);

            grpAccesoMaestro = new GroupBox();
            grpAccesoMaestro.Text = "Credenciales Maestras y Limpieza de Fabrica";
            grpAccesoMaestro.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            grpAccesoMaestro.Location = new Point(20, 240);
            grpAccesoMaestro.Size = new Size(840, 150);
            panelCentroCuentas.Controls.Add(grpAccesoMaestro);

            btnRestablecerAdmin = new Button();
            btnRestablecerAdmin.Text = "Restablecer admin por Defecto";
            btnRestablecerAdmin.Location = new Point(25, 32);
            btnRestablecerAdmin.Size = new Size(280, 38);
            btnRestablecerAdmin.BackColor = Color.FromArgb(2, 132, 199);
            btnRestablecerAdmin.ForeColor = Color.White;
            btnRestablecerAdmin.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnRestablecerAdmin.Click += delegate { RestablecerAdminAccion(); };
            grpAccesoMaestro.Controls.Add(btnRestablecerAdmin);

            btnFormatearFabrica = new Button();
            btnFormatearFabrica.Text = "Formatear a Estado de Fabrica";
            btnFormatearFabrica.Location = new Point(325, 32);
            btnFormatearFabrica.Size = new Size(280, 38);
            btnFormatearFabrica.BackColor = Color.FromArgb(220, 38, 38);
            btnFormatearFabrica.ForeColor = Color.White;
            btnFormatearFabrica.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnFormatearFabrica.Click += delegate { FormatearFabricaAccion(); };
            grpAccesoMaestro.Controls.Add(btnFormatearFabrica);

            lblInfoFabrica = new Label();
            lblInfoFabrica.Text = "Restablecer admin restaura admin / admin123 y PIN 000000. Formatear a fabrica vacia transacciones con respaldo previo.";
            lblInfoFabrica.Font = new Font("Segoe UI", 8F);
            lblInfoFabrica.ForeColor = Color.FromArgb(100, 116, 139);
            lblInfoFabrica.Location = new Point(25, 85);
            lblInfoFabrica.Size = new Size(760, 45);
            grpAccesoMaestro.Controls.Add(lblInfoFabrica);
        }

        // =========================================================================
        // AJUSTE RESPONSIVO Y CENTRADO DE PANELES AL MAXIMIZAR / REDIMENSIONAR
        // =========================================================================
        private void AjustarLayoutCentrado()
        {
            CentrarPanelEnContenedor(panelCentroDashboard, tabDashboard);
            CentrarPanelEnContenedor(panelCentroServicio, tabServicioRed);
            CentrarPanelEnContenedor(panelCentroCuentas, tabCuentas);
        }

        private void CentrarPanelEnContenedor(Panel panelHijo, TabPage tabPadre)
        {
            if (panelHijo == null || tabPadre == null) return;
            int x = Math.Max(0, (tabPadre.ClientSize.Width - panelHijo.Width) / 2);
            int y = Math.Max(0, (tabPadre.ClientSize.Height - panelHijo.Height) / 2);
            panelHijo.Location = new Point(x, y);
        }

        // =========================================================================
        // GENERACION LOCAL Y SEGURA DE CODIGO QR
        // =========================================================================
        private void GenerarQrLocalSeguro()
        {
            try
            {
                string scriptQr = Path.Combine(baseDir, "scripts", "generar-qr-local.js");
                if (!File.Exists(scriptQr))
                {
                    DibujarPlaceholderQr("Script QR no encontrado");
                    return;
                }

                string nodeExe = ObtenerNodeExe();
                string tmpDir = Path.Combine(baseDir, ".tmp");
                if (!Directory.Exists(tmpDir)) Directory.CreateDirectory(tmpDir);
                string outPng = Path.Combine(tmpDir, "qr_lan.png");

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = "\"" + scriptQr + "\" \"" + urlLanActual + "\" \"" + outPng + "\"";
                psi.WorkingDirectory = baseDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                using (Process p = Process.Start(psi))
                {
                    if (p != null)
                    {
                        p.WaitForExit(10000);
                        if (File.Exists(outPng))
                        {
                            byte[] bytes = File.ReadAllBytes(outPng);
                            if (bytes != null && bytes.Length > 100)
                            {
                                using (MemoryStream ms = new MemoryStream(bytes))
                                {
                                    using (Image imgNueva = Image.FromStream(ms))
                                    {
                                        Image imgVieja = picQr.Image;
                                        picQr.Image = new Bitmap(imgNueva);
                                        if (imgVieja != null) imgVieja.Dispose();
                                    }
                                }
                                ultimoQrGenerado = urlLanActual;
                                return;
                            }
                        }
                    }
                }

                DibujarPlaceholderQr("Escanee: " + urlLanActual);
            }
            catch (Exception ex)
            {
                DibujarPlaceholderQr("Error al generar QR: " + ex.Message);
            }
        }

        private void DibujarPlaceholderQr(string mensaje)
        {
            try
            {
                Bitmap bmp = new Bitmap(200, 200);
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.FromArgb(248, 250, 252));
                    using (Pen pen = new Pen(Color.FromArgb(203, 213, 225), 1))
                    {
                        g.DrawRectangle(pen, 0, 0, 199, 199);
                    }
                    using (Font f = new Font("Segoe UI", 8.5F, FontStyle.Regular))
                    using (Brush b = new SolidBrush(Color.FromArgb(100, 116, 139)))
                    {
                        StringFormat sf = new StringFormat();
                        sf.Alignment = StringAlignment.Center;
                        sf.LineAlignment = StringAlignment.Center;
                        g.DrawString("Acceso Movil LAN:\n\n" + urlLanActual + "\n\n(" + mensaje + ")", f, b, new RectangleF(10, 10, 180, 180), sf);
                    }
                }
                Image vieja = picQr.Image;
                picQr.Image = bmp;
                if (vieja != null) vieja.Dispose();
            }
            catch { }
        }

        // =========================================================================
        // ACCIONES DE CREACION DE USUARIOS
        // =========================================================================
        private void CrearUsuarioAccion()
        {
            string nombre = txtNombreUser.Text.Trim();
            string username = txtUsername.Text.Trim();
            string rol = cmbRol.SelectedItem != null ? cmbRol.SelectedItem.ToString() : "CAJERO";
            string password = txtPassword.Text.Trim();
            string pin = txtPin.Text.Trim();

            if (string.IsNullOrEmpty(nombre) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(pin))
            {
                MessageBox.Show("Por favor complete todos los campos (Nombre, Usuario, Contrasena y PIN).", "Campos Requeridos", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (pin.Length < 4)
            {
                MessageBox.Show("El PIN debe tener al menos 4 digitos numericos.", "Validacion de PIN", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptCrear = Path.Combine(baseDir, "scripts", "crear-usuario-panel.js");
                string nodeExe = ObtenerNodeExe();

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = "\"" + scriptCrear + "\" \"" + nombre + "\" \"" + username + "\" \"" + rol + "\" \"" + password + "\" \"" + pin + "\"";
                psi.WorkingDirectory = baseDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                using (Process p = Process.Start(psi))
                {
                    if (p != null)
                    {
                        string outStr = p.StandardOutput.ReadToEnd();
                        string errStr = p.StandardError.ReadToEnd();
                        p.WaitForExit(15000);

                        if (p.ExitCode == 0)
                        {
                            MessageBox.Show(
                                "Cuenta de usuario creada con exito:\n\n" +
                                "• Nombre: " + nombre + "\n" +
                                "• Usuario: " + username + "\n" +
                                "• Rol: " + rol + "\n\n" +
                                "El usuario ya puede iniciar sesion en el sistema.",
                                "Usuario Creado",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Information
                            );
                            txtNombreUser.Text = "";
                            txtUsername.Text = "";
                            txtPassword.Text = "";
                            txtPin.Text = "";
                        }
                        else
                        {
                            string msg = !string.IsNullOrEmpty(errStr) ? errStr : outStr;
                            MessageBox.Show("No se pudo crear el usuario:\n" + msg, "Error al Crear Usuario", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Fallo al ejecutar el script de creacion de usuario: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
            }
        }

        // =========================================================================
        // ACCIONES DE SERVICIO Y OPERACION
        // =========================================================================
        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        private const int SW_MAXIMIZE = 3;

        private void AbrirNavegadorPos()
        {
            try
            {
                string url = "http://localhost:" + puertoConfigurado;

                // Buscar navegadores Chromium modernos en rutas estandar de Windows
                string[] navegadores = new string[]
                {
                    // Microsoft Edge (Nativo en Windows 10 y 11)
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),

                    // Google Chrome
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),

                    // Brave
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"BraveSoftware\Brave-Browser\Application\brave.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"BraveSoftware\Brave-Browser\Application\brave.exe")
                };

                string rutaNavegador = null;
                foreach (string ruta in navegadores)
                {
                    if (File.Exists(ruta))
                    {
                        rutaNavegador = ruta;
                        break;
                    }
                }

                if (!string.IsNullOrEmpty(rutaNavegador))
                {
                    // Lanzar en ventana nueva maximizada respetando barra de tareas y botones nativos
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = rutaNavegador;
                    psi.Arguments = "--new-window --start-maximized \"" + url + "\"";
                    psi.UseShellExecute = true;
                    psi.WindowStyle = ProcessWindowStyle.Maximized;

                    Process p = Process.Start(psi);
                    if (p != null)
                    {
                        try
                        {
                            p.WaitForInputIdle(1500);
                            if (p.MainWindowHandle != IntPtr.Zero)
                            {
                                ShowWindow(p.MainWindowHandle, SW_MAXIMIZE);
                            }
                        }
                        catch { }
                    }
                    return;
                }

                // Fallback: Lanzar con el navegador predeterminado de Windows maximizado
                ProcessStartInfo psiFallback = new ProcessStartInfo();
                psiFallback.FileName = url;
                psiFallback.UseShellExecute = true;
                psiFallback.WindowStyle = ProcessWindowStyle.Maximized;

                Process pFallback = Process.Start(psiFallback);
                if (pFallback != null)
                {
                    try
                    {
                        pFallback.WaitForInputIdle(1500);
                        if (pFallback.MainWindowHandle != IntPtr.Zero)
                        {
                            ShowWindow(pFallback.MainWindowHandle, SW_MAXIMIZE);
                        }
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al abrir navegador: " + ex.Message, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void IniciarServidorAccion()
        {
            if (estaOcupado) return;
            estaOcupado = true;
            this.Cursor = Cursors.WaitCursor;

            try
            {
                bool servInstalado = ExisteServicioWindows(NOMBRE_SERVICIO);
                if (servInstalado)
                {
                    EjecutarComandoOculto("sc.exe", "start \"" + NOMBRE_SERVICIO + "\"");
                }
                else
                {
                    string startScript = Path.Combine(baseDir, "start-pos.js");
                    string nodeExe = ObtenerNodeExe();
                    if (File.Exists(startScript))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = nodeExe;
                        psi.Arguments = "\"" + startScript + "\"";
                        psi.WorkingDirectory = baseDir;
                        psi.CreateNoWindow = true;
                        psi.UseShellExecute = false;
                        Process.Start(psi);
                    }
                }

                Thread.Sleep(2000);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar el servicio: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                estaOcupado = false;
                RefrescarEstadoEnVivo();
            }
        }

        private void DetenerConRespaldoAccion()
        {
            if (estaOcupado) return;

            DialogResult dr = MessageBox.Show(
                "¿Desea detener el servicio del POS?\n\nREGLA DE SALVAGUARDA:\nAntes de detener el servidor, el sistema realizara de forma obligatoria un checkpoint de la base de datos y guardara una copia de seguridad verificada en C:\\POS_BACKUPS.\n\n¿Continuar?",
                "Detener Servidor con Respaldo",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (dr != DialogResult.Yes) return;

            estaOcupado = true;
            this.Cursor = Cursors.WaitCursor;

            try
            {
                // 1. Ejecutar Respaldo Obligatorio Previo
                string scriptRespaldo = Path.Combine(baseDir, "scripts", "respaldo-servicio.js");
                string nodeExe = ObtenerNodeExe();
                bool backupExitoso = false;

                if (File.Exists(scriptRespaldo))
                {
                    ProcessStartInfo psiBackup = new ProcessStartInfo();
                    psiBackup.FileName = nodeExe;
                    psiBackup.Arguments = "\"" + scriptRespaldo + "\"";
                    psiBackup.WorkingDirectory = baseDir;
                    psiBackup.CreateNoWindow = true;
                    psiBackup.UseShellExecute = false;
                    psiBackup.RedirectStandardOutput = true;

                    using (Process pBackup = Process.Start(psiBackup))
                    {
                        if (pBackup != null)
                        {
                            pBackup.WaitForExit(45000);
                            backupExitoso = (pBackup.ExitCode == 0);
                        }
                    }
                }

                if (!backupExitoso)
                {
                    backupExitoso = RealizarCopiaSeguridadDirectaFallback();
                }

                if (!backupExitoso)
                {
                    MessageBox.Show(
                        "SEGURIDAD CRITICA: La copia de seguridad previa no pudo confirmarse.\nPor proteccion de los datos contables y ventas, la detencion del servicio fue CANCELADA.",
                        "Detencion Cancelada por Salvaguarda",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                // 2. Detener Servicio de Windows
                if (ExisteServicioWindows(NOMBRE_SERVICIO))
                {
                    EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                }

                Thread.Sleep(2000);

                MessageBox.Show(
                    "El servidor y servicio fueron detenidos correctamente.\n\nLa copia de seguridad obligatoria previa fue generada y verificada con exito en C:\\POS_BACKUPS.",
                    "Servidor Detenido",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error durante la detencion con respaldo: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                estaOcupado = false;
                RefrescarEstadoEnVivo();
                CargarListaBackups();
            }
        }

        private bool RealizarCopiaSeguridadDirectaFallback()
        {
            try
            {
                string dbOrig = Path.Combine(baseDir, "database", "llanomio.db");
                if (!File.Exists(dbOrig)) return false;

                string backupDir = "C:\\POS_BACKUPS";
                if (!Directory.Exists(backupDir)) Directory.CreateDirectory(backupDir);

                string dest = Path.Combine(backupDir, "pos_llanomio_PRE_DETENCION_FALLBACK_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".db");
                File.Copy(dbOrig, dest, true);

                FileInfo fi = new FileInfo(dest);
                return fi.Exists && fi.Length > 0;
            }
            catch
            {
                return false;
            }
        }

        // =========================================================================
        // ACCIONES DE INFRAESTRUCTURA Y RED
        // =========================================================================
        private void InstalarServicioAccion()
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptInstalador = Path.Combine(baseDir, "portable-windows", "Instalar_Servicio_Automatico.bat");
                if (File.Exists(scriptInstalador))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "cmd.exe";
                    psi.Arguments = "/c \"" + scriptInstalador + "\"";
                    psi.WorkingDirectory = baseDir;
                    psi.Verb = "runas";
                    psi.UseShellExecute = true;

                    Process p = Process.Start(psi);
                    if (p != null)
                    {
                        p.WaitForExit();
                        MessageBox.Show("Proceso de instalacion del servicio finalizado.", "Instalador", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al ejecutar instalador: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void DesinstalarServicioAccion()
        {
            DialogResult dr = MessageBox.Show(
                "¿Desea desinstalar el servicio de Windows 'POS_Llanomio'?\n\nEl servidor dejara de arrancar de forma automatica.",
                "Desinstalar Servicio",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );
            if (dr != DialogResult.Yes) return;

            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1500);
                EjecutarComandoOculto("sc.exe", "delete \"" + NOMBRE_SERVICIO + "\"");
                MessageBox.Show("Servicio 'POS_Llanomio' desinstalado correctamente.", "Servicio Eliminado", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al desinstalar: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void ReiniciarServicioAccion()
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(2000);
                EjecutarComandoOculto("sc.exe", "start \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(2000);
                MessageBox.Show("Comando de reinicio enviado con exito.", "Reinicio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al reiniciar: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void RepararFirewallAccion()
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                string ruleTcp = "POS_Llanomio_TCP";
                string ruleUdp = "POS_Llanomio_mDNS";

                string[] carpetas = new string[] {
                    Path.Combine(baseDir, ".tmp"),
                    Path.Combine(baseDir, "database"),
                    Path.Combine(baseDir, "database", "backups_locales"),
                    "C:\\POS_BACKUPS"
                };
                foreach (string c in carpetas)
                {
                    try { if (!Directory.Exists(c)) Directory.CreateDirectory(c); } catch { }
                }

                EjecutarComandoOculto("netsh.exe", "advfirewall firewall delete rule name=\"" + ruleTcp + "\"");
                EjecutarComandoOculto("netsh.exe", "advfirewall firewall delete rule name=\"" + ruleUdp + "\"");

                EjecutarComandoOculto("netsh.exe", "advfirewall firewall add rule name=\"" + ruleTcp + "\" dir=in action=allow protocol=TCP localport=" + puertoConfigurado);
                EjecutarComandoOculto("netsh.exe", "advfirewall firewall add rule name=\"" + ruleUdp + "\" dir=in action=allow protocol=UDP localport=5353");

                MessageBox.Show(
                    "Reglas de Firewall y carpetas reparadas exitosamente:\n\n" +
                    "• " + ruleTcp + " (TCP Puerto " + puertoConfigurado + " Habilitado)\n" +
                    "• " + ruleUdp + " (UDP Puerto 5353 mDNS Habilitado)\n" +
                    "• Boveda de respaldos verificada en C:\\POS_BACKUPS",
                    "Infraestructura Reparada",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al configurar Firewall: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
            }
        }

        private void CambiarPuertoAccion()
        {
            string nuevoP = txtPuertoConfig.Text.Trim();
            int pNum;
            if (!int.TryParse(nuevoP, out pNum) || pNum < 80 || pNum > 65535)
            {
                MessageBox.Show("Por favor ingrese un puerto TCP valido entre 80 y 65535.", "Puerto Invalido", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            GuardarPuertoEnDotEnv(nuevoP);
            RepararFirewallAccion();
            ReiniciarServicioAccion();
            GenerarQrLocalSeguro();
        }

        // =========================================================================
        // ACCIONES DE COPIAS DE SEGURIDAD
        // =========================================================================
        private void GenerarBackupManualAccion()
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptRespaldo = Path.Combine(baseDir, "scripts", "respaldo-servicio.js");
                string nodeExe = ObtenerNodeExe();

                if (File.Exists(scriptRespaldo))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = nodeExe;
                    psi.Arguments = "\"" + scriptRespaldo + "\"";
                    psi.WorkingDirectory = baseDir;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;

                    using (Process p = Process.Start(psi))
                    {
                        if (p != null)
                        {
                            p.WaitForExit(45000);
                            if (p.ExitCode == 0)
                            {
                                MessageBox.Show("Copia de seguridad generada y verificada exitosamente en C:\\POS_BACKUPS.", "Respaldo Exitoso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                            }
                            else
                            {
                                MessageBox.Show("El script de respaldo retorno codigo: " + p.ExitCode, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al generar copia: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                CargarListaBackups();
            }
        }

        private void AbrirCarpetaBackupsAccion()
        {
            try
            {
                string dir = "C:\\POS_BACKUPS";
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                Process.Start("explorer.exe", dir);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al abrir carpeta: " + ex.Message, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void CargarListaBackups()
        {
            try
            {
                lstBackups.Items.Clear();
                string dir = "C:\\POS_BACKUPS";
                if (!Directory.Exists(dir))
                {
                    lstBackups.Items.Add("No existe la carpeta de respaldos C:\\POS_BACKUPS.");
                    return;
                }

                string[] archivos = Directory.GetFiles(dir, "*.db");
                Array.Sort(archivos);
                Array.Reverse(archivos);

                if (archivos.Length == 0)
                {
                    lstBackups.Items.Add("No hay copias de seguridad registradas aun en C:\\POS_BACKUPS.");
                    return;
                }

                foreach (string arch in archivos)
                {
                    FileInfo fi = new FileInfo(arch);
                    double kb = Math.Round((double)fi.Length / 1024, 1);
                    string item = string.Format("{0,-45} | {1,10} KB | {2:dd/MM/yyyy HH:mm:ss}", fi.Name, kb, fi.LastWriteTime);
                    lstBackups.Items.Add(item);
                }
            }
            catch { }
        }

        private void RestaurarSeleccionadoAccion()
        {
            if (lstBackups.SelectedIndex < 0)
            {
                MessageBox.Show("Por favor seleccione una copia de seguridad de la lista.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            string linea = lstBackups.SelectedItem.ToString();
            string nombreArchivo = linea.Split('|')[0].Trim();
            string rutaCompleta = Path.Combine("C:\\POS_BACKUPS", nombreArchivo);

            EjecutarRestauracionDeBaseDatos(rutaCompleta);
        }

        private void RestaurarArchivoExternoAccion()
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Title = "Seleccionar Copia de Seguridad SQLite (.db)";
            ofd.Filter = "Base de Datos SQLite (*.db)|*.db|Todos los archivos (*.*)|*.*";

            if (ofd.ShowDialog(this) == DialogResult.OK)
            {
                EjecutarRestauracionDeBaseDatos(ofd.FileName);
            }
        }

        private void EjecutarRestauracionDeBaseDatos(string rutaArchivoOrigen)
        {
            if (!File.Exists(rutaArchivoOrigen))
            {
                MessageBox.Show("El archivo seleccionado no existe: " + rutaArchivoOrigen, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            try
            {
                using (FileStream fs = new FileStream(rutaArchivoOrigen, FileMode.Open, FileAccess.Read))
                {
                    byte[] header = new byte[16];
                    fs.Read(header, 0, 16);
                    string headerStr = Encoding.UTF8.GetString(header);
                    if (!headerStr.StartsWith("SQLite format 3"))
                    {
                        MessageBox.Show("El archivo seleccionado no es una base de datos SQLite valida (cabecera corrupta o invalida).", "Error de Validacion", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("No se pudo leer el archivo de respaldo: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            DialogResult dr = MessageBox.Show(
                "ADVERTENCIA DE SOBRESCRITURA DE DATOS:\n\n" +
                "Se reemplazara la base de datos operativa actual por:\n" + Path.GetFileName(rutaArchivoOrigen) + "\n\n" +
                "El sistema detendra el servicio, realizara una copia de salvaguarda de emergencia previa, reemplazara la base de datos, limpiara los archivos WAL y reiniciara el servicio.\n\n" +
                "¿Desea proceder con la restauracion?",
                "Confirmar Restauracion de Base de Datos",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Warning
            );

            if (dr != DialogResult.Yes) return;

            estaOcupado = true;
            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(2000);

                string dbDestino = Path.Combine(baseDir, "database", "llanomio.db");
                string walDestino = Path.Combine(baseDir, "database", "llanomio.db-wal");
                string shmDestino = Path.Combine(baseDir, "database", "llanomio.db-shm");

                if (File.Exists(dbDestino))
                {
                    string emergDir = Path.Combine(baseDir, "database", "backups_locales");
                    if (!Directory.Exists(emergDir)) Directory.CreateDirectory(emergDir);
                    string emergFile = Path.Combine(emergDir, "pos_EMERGENCIA_PRE_RESTAURACION_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".db");
                    File.Copy(dbDestino, emergFile, true);
                }

                try { if (File.Exists(walDestino)) File.Delete(walDestino); } catch { }
                try { if (File.Exists(shmDestino)) File.Delete(shmDestino); } catch { }

                File.Copy(rutaArchivoOrigen, dbDestino, true);

                EjecutarComandoOculto("sc.exe", "start \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(2500);

                MessageBox.Show(
                    "Base de datos restaurada con exito.\n\nEl servicio fue reiniciado y los datos anteriores fueron respaldados preventivamente en backups_locales.",
                    "Restauracion Completada",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show("Fallo durante la restauracion: " + ex.Message, "Error Critico", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                estaOcupado = false;
                RefrescarEstadoEnVivo();
                CargarListaBackups();
            }
        }

        // =========================================================================
        // ACCIONES DE GESTION DE ACCESO Y FABRICA
        // =========================================================================
        private void RestablecerAdminAccion()
        {
            DialogResult dr = MessageBox.Show(
                "¿Desea restablecer las credenciales maestras del sistema?\n\nSe asegurara el usuario 'admin' con contrasena 'admin123' y PIN '000000'.\nLos datos de ventas, alquileres y clientes NO se eliminaran.",
                "Restablecer Administrador",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );
            if (dr != DialogResult.Yes) return;

            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptAdmin = Path.Combine(baseDir, "scripts", "asegurar-admin.js");
                string nodeExe = ObtenerNodeExe();

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = "\"" + scriptAdmin + "\"";
                psi.WorkingDirectory = baseDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                using (Process p = Process.Start(psi))
                {
                    if (p != null)
                    {
                        p.WaitForExit(20000);
                        if (p.ExitCode == 0)
                        {
                            MessageBox.Show(
                                "Credenciales maestras restablecidas con exito:\n\nUsuario: admin\nContrasena: admin123\nPIN de Seguridad: 000000",
                                "Credenciales Restauradas",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Information
                            );
                        }
                        else
                        {
                            MessageBox.Show("El script de credenciales retorno codigo: " + p.ExitCode, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al restablecer credenciales: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
            }
        }

        private void FormatearFabricaAccion()
        {
            DialogResult dr = MessageBox.Show(
                "¡PELIGRO DE BORRADO GENERAL!\n\n" +
                "Esta a punto de realizar un FORMATEO A ESTADO EN BLANCO DE FABRICA.\n\n" +
                "• Se guardara una copia de seguridad automatica en C:\\POS_BACKUPS.\n" +
                "• Se borraran TODAS las ventas, alquileres, clientes, movimientos y cierres.\n" +
                "• Se conservara unicamente el usuario admin por defecto.\n\n" +
                "¿Esta COMPLETAMENTE SEGURO de continuar?",
                "Confirmacion de Barrido de Fabrica",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Warning
            );

            if (dr != DialogResult.Yes) return;

            FormPromptPin prompt = new FormPromptPin("Ingrese el PIN de soporte (000000) para autorizar:");
            if (prompt.ShowDialog(this) != DialogResult.OK || prompt.PinIngresado != PIN_MAESTRO_SOPORTE)
            {
                MessageBox.Show("Autorizacion cancelada o PIN incorrecto.", "Operacion Cancelada", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptFabrica = Path.Combine(baseDir, "scripts", "barrido-inicial-fabrica.js");
                string nodeExe = ObtenerNodeExe();

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = "\"" + scriptFabrica + "\"";
                psi.WorkingDirectory = baseDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                using (Process p = Process.Start(psi))
                {
                    if (p != null)
                    {
                        p.WaitForExit(30000);
                        if (p.ExitCode == 0)
                        {
                            MessageBox.Show(
                                "El sistema ha sido limpiado y formateado a estado de fabrica con exito.\n\n" +
                                "Copia de salvaguarda creada en C:\\POS_BACKUPS.\n" +
                                "Usuario admin activo (admin / admin123).",
                                "Barrido Completado",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Information
                            );
                        }
                        else
                        {
                            MessageBox.Show("El script retorno codigo de salida: " + p.ExitCode, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error durante el barrido de fabrica: " + ex.Message, "Error Critico", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                CargarListaBackups();
                ReiniciarServicioAccion();
            }
        }

        // =========================================================================
        // REFRESO EN VIVO Y MONITOREO DEL ESTADO DEL SISTEMA
        // =========================================================================
        private void RefrescarEstadoEnVivo()
        {
            if (estaOcupado) return;

            string estadoServicio = "No instalado";
            bool servicioCorriendo = false;

            try
            {
                if (ExisteServicioWindows(NOMBRE_SERVICIO))
                {
                    using (ServiceController sc = new ServiceController(NOMBRE_SERVICIO))
                    {
                        estadoServicio = sc.Status.ToString();
                        servicioCorriendo = (sc.Status == ServiceControllerStatus.Running);
                    }
                }
            }
            catch
            {
                estadoServicio = "Error al consultar";
            }

            bool httpOk = false;
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://localhost:" + puertoConfigurado + "/api/caja/estado");
                req.Timeout = 1200;
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    if (res.StatusCode == HttpStatusCode.OK) httpOk = true;
                }
            }
            catch
            {
                httpOk = false;
            }

            // Actualizar Badge en el Header
            if (servicioCorriendo && httpOk)
            {
                badgeEstadoServidor.BackColor = Color.FromArgb(220, 252, 231); // Emerald 100
                lblBadgeTexto.Text = "En linea (" + puertoConfigurado + ")";
                lblBadgeTexto.ForeColor = Color.FromArgb(22, 101, 52); // Emerald 800
            }
            else if (servicioCorriendo && !httpOk)
            {
                badgeEstadoServidor.BackColor = Color.FromArgb(254, 243, 199); // Amber 100
                lblBadgeTexto.Text = "Iniciando servidor...";
                lblBadgeTexto.ForeColor = Color.FromArgb(146, 64, 14); // Amber 800
            }
            else
            {
                badgeEstadoServidor.BackColor = Color.FromArgb(254, 226, 226); // Red 100
                lblBadgeTexto.Text = "Servicio detenido";
                lblBadgeTexto.ForeColor = Color.FromArgb(153, 27, 27); // Red 800
            }

            // Actualizar etiquetas en CardServidor
            lblEstadoServicio.Text = "Servicio Windows: " + (servicioCorriendo ? "En ejecucion" : estadoServicio);
            lblEstadoHttp.Text = "Respuesta Web: " + (httpOk ? "200 OK (En linea)" : "Sin conexion");
            lblPuertoActivo.Text = "Puerto TCP: " + puertoConfigurado;
            lblUrlLocal.Text = "Local: http://localhost:" + puertoConfigurado;
            lblUrlLan.Text = "Red Wi-Fi: " + urlLanActual;

            if (ultimoQrGenerado != urlLanActual)
            {
                GenerarQrLocalSeguro();
            }
        }

        // =========================================================================
        // UTILIDADES AUXILIARES
        // =========================================================================
        private bool ExisteServicioWindows(string nombre)
        {
            try
            {
                ServiceController[] servicios = ServiceController.GetServices();
                foreach (ServiceController s in servicios)
                {
                    if (string.Equals(s.ServiceName, nombre, StringComparison.OrdinalIgnoreCase)) return true;
                }
            }
            catch { }
            return false;
        }

        private void EjecutarComandoOculto(string ejecutable, string argumentos)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = ejecutable;
                psi.Arguments = argumentos;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(15000);
                }
            }
            catch { }
        }

        private string ObtenerNodeExe()
        {
            string[] candidatos = new string[] {
                Path.Combine(baseDir, "portable-windows", "runtime", "node.exe"),
                Path.Combine(baseDir, "runtime", "node", "node.exe"),
                Path.Combine(baseDir, "runtime", "node.exe"),
                Path.Combine(baseDir, "node.exe"),
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe"
            };

            foreach (string c in candidatos)
            {
                if (File.Exists(c)) return c;
            }

            string pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                foreach (string p in pathEnv.Split(';'))
                {
                    string clean = p.Trim();
                    if (string.IsNullOrEmpty(clean)) continue;
                    try
                    {
                        string target = Path.Combine(clean, "node.exe");
                        if (File.Exists(target)) return target;
                    }
                    catch { }
                }
            }

            return "node.exe";
        }
    }

    // Cuadro de Dialogo modal para solicitar PIN
    public class FormPromptPin : Form
    {
        private TextBox txtPin;
        private Button btnOk;
        private Button btnCancel;
        public string PinIngresado { get; private set; }

        public FormPromptPin(string mensaje = "Ingrese el PIN o Clave de Administrador:")
        {
            this.Text = "Autenticacion de Seguridad";
            this.Size = new Size(380, 200);
            this.StartPosition = FormStartPosition.CenterParent;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.White;
            this.Font = new Font("Segoe UI", 9F);

            Label lbl = new Label();
            lbl.Text = mensaje;
            lbl.Location = new Point(25, 20);
            lbl.Size = new Size(320, 35);
            this.Controls.Add(lbl);

            txtPin = new TextBox();
            txtPin.Location = new Point(25, 60);
            txtPin.Size = new Size(310, 26);
            txtPin.Font = new Font("Segoe UI", 11F);
            txtPin.UseSystemPasswordChar = true;
            this.Controls.Add(txtPin);

            btnOk = new Button();
            btnOk.Text = "Aceptar";
            btnOk.DialogResult = DialogResult.OK;
            btnOk.Location = new Point(145, 110);
            btnOk.Size = new Size(90, 32);
            btnOk.BackColor = Color.FromArgb(5, 150, 105);
            btnOk.ForeColor = Color.White;
            btnOk.FlatStyle = FlatStyle.Flat;
            btnOk.FlatAppearance.BorderSize = 0;
            btnOk.Click += delegate { PinIngresado = txtPin.Text.Trim(); };
            this.Controls.Add(btnOk);

            btnCancel = new Button();
            btnCancel.Text = "Cancelar";
            btnCancel.DialogResult = DialogResult.Cancel;
            btnCancel.Location = new Point(245, 110);
            btnCancel.Size = new Size(90, 32);
            btnCancel.BackColor = Color.FromArgb(241, 245, 249);
            btnCancel.FlatStyle = FlatStyle.Flat;
            btnCancel.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            this.Controls.Add(btnCancel);

            this.AcceptButton = btnOk;
            this.CancelButton = btnCancel;
        }
    }
}
