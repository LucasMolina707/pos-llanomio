using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
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
using Microsoft.Win32;

namespace AuroraHost.POS.ControlServidor
{
    // =========================================================================
    // PUNTO DE ENTRADA HIBRIDO (GUI INTERACTIVA + SERVICIO NATIVO DE WINDOWS)
    // =========================================================================
    public static class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            bool esModoServicio = !Environment.UserInteractive || TieneArgumento(args, "--service");
            if (esModoServicio)
            {
                ServiceBase.Run(new POSService());
                return;
            }

            try
            {
                if (!EsAdministrador())
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = Application.ExecutablePath;
                    if (args != null && args.Length > 0)
                    {
                        psi.Arguments = string.Join(" ", args);
                    }
                    psi.UseShellExecute = true;
                    psi.Verb = "runas";
                    try
                    {
                        Process.Start(psi);
                    }
                    catch
                    {
                        MessageBox.Show(
                            "Se requieren permisos de Administrador.",
                            "POS Llanomio",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );
                    }
                    return;
                }

                bool forzarInstalacion = TieneArgumento(args, "--instalar");
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new FormPanelPrincipal(forzarInstalacion));
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static bool TieneArgumento(string[] args, string flag)
        {
            if (args == null) return false;
            foreach (string a in args)
            {
                if (a != null && a.Equals(flag, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
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

    // =========================================================================
    // SERVICIO NATIVO DE WINDOWS INTEGRADO (MODO --service)
    // =========================================================================
    public class POSService : ServiceBase
    {
        public const string SERVICE_NAME = "POS_Llanomio";
        public const string SERVICE_DISPLAY = "POS Llanomio - Servidor Local";

        private Process processNode;
        private Thread monitorThread;
        private volatile bool isStopping = false;
        private string baseDir;
        private string logFile;

        public POSService()
        {
            this.ServiceName = SERVICE_NAME;
            this.CanStop = true;
            this.CanShutdown = true;
            this.AutoLog = true;

            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string logsDir = Path.Combine(baseDir, ".tmp");
            try { if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir); } catch { }
            logFile = Path.Combine(logsDir, "servicio_windows_pos.log");
        }

        private void EscribirLog(string mensaje)
        {
            try
            {
                string linea = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}{2}", DateTime.Now, mensaje, Environment.NewLine);
                File.AppendAllText(logFile, linea, Encoding.UTF8);
            }
            catch { }
        }

        private string LeerPuertoConfigurado()
        {
            string envFile = Path.Combine(baseDir, ".env");
            try
            {
                if (File.Exists(envFile))
                {
                    foreach (string linea in File.ReadAllLines(envFile))
                    {
                        string l = linea.Trim();
                        if (l.StartsWith("PORT="))
                        {
                            string p = l.Substring(5).Trim().Trim('"', '\'');
                            int n;
                            if (int.TryParse(p, out n) && n >= 80 && n <= 65535) return p;
                        }
                    }
                }
            }
            catch { }
            return "3000";
        }

        protected override void OnStart(string[] args)
        {
            isStopping = false;
            EscribirLog("Iniciando servicio POS_Llanomio...");
            try
            {
                IniciarServidorInterno();
                monitorThread = new Thread(MonitorearServidor);
                monitorThread.IsBackground = true;
                monitorThread.Start();
                EscribirLog("Servicio iniciado y monitoreando Node.js.");
            }
            catch (Exception ex)
            {
                EscribirLog("ERROR AL INICIAR: " + ex.Message);
                throw;
            }
        }

        private void IniciarServidorInterno()
        {
            if (isStopping) return;

            string nodeExe = "node";
            string portableNode = Path.Combine(baseDir, "runtime", "node", "node.exe");
            if (File.Exists(portableNode)) nodeExe = portableNode;

            string startScript = Path.Combine(baseDir, "start-pos.js");
            if (!File.Exists(startScript))
            {
                throw new FileNotFoundException("No se encontro start-pos.js en " + baseDir);
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExe;
            psi.Arguments = "\"" + startScript + "\"";
            psi.WorkingDirectory = baseDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["PORT"] = LeerPuertoConfigurado();
            psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";

            processNode = Process.Start(psi);
            if (processNode != null)
            {
                EscribirLog(string.Format("Node.js iniciado (PID: {0})", processNode.Id));
            }
        }

        private void MonitorearServidor()
        {
            while (!isStopping)
            {
                Thread.Sleep(5000);
                if (isStopping) break;

                try
                {
                    if (processNode == null || processNode.HasExited)
                    {
                        EscribirLog("Proceso Node.js detenido inesperadamente. Reiniciando...");
                        IniciarServidorInterno();
                    }
                }
                catch (Exception ex)
                {
                    EscribirLog("Error en monitoreo: " + ex.Message);
                }
            }
        }

        protected override void OnStop()
        {
            isStopping = true;
            EscribirLog("Detencion de servicio solicitada. Ejecutando respaldo obligatorio...");
            EjecutarRespaldoPreApagado();

            try
            {
                if (processNode != null && !processNode.HasExited)
                {
                    processNode.Kill();
                    processNode.WaitForExit(3000);
                }
            }
            catch { }

            EscribirLog("Servicio POS_Llanomio detenido correctamente.");
        }

        protected override void OnShutdown()
        {
            EscribirLog("Apagado de Windows detectado. Guardando respaldo...");
            OnStop();
            base.OnShutdown();
        }

        private void EjecutarRespaldoPreApagado()
        {
            try
            {
                string scriptBackup = Path.Combine(baseDir, "scripts", "respaldo-servicio.js");
                string nodeExe = "node";
                string portableNode = Path.Combine(baseDir, "runtime", "node", "node.exe");
                if (File.Exists(portableNode)) nodeExe = portableNode;

                if (File.Exists(scriptBackup))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = nodeExe;
                    psi.Arguments = "\"" + scriptBackup + "\"";
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
                                EscribirLog("Respaldo WAL pre-apagado completado.");
                                return;
                            }
                        }
                    }
                }

                string dbPath = Path.Combine(baseDir, "database", "llanomio.db");
                string bDir = Path.Combine(baseDir, "database", "backups_locales");
                if (File.Exists(dbPath))
                {
                    if (!Directory.Exists(bDir)) Directory.CreateDirectory(bDir);
                    File.Copy(dbPath, Path.Combine(bDir, "pos_EMERGENCIA_PRE_APAGADO.db"), true);
                    EscribirLog("Copia de emergencia creada.");
                }
            }
            catch (Exception ex)
            {
                EscribirLog("Error en respaldo pre-apagado: " + ex.Message);
            }
        }
    }

    // =========================================================================
    // MODELO MODULAR DE SERVICIOS (ESCALABLE PARA SERVICIOS FUTUROS)
    // =========================================================================
    public class ServicioModulo
    {
        public string Id { get; set; }
        public string Nombre { get; set; }
        public string ServicioWindows { get; set; }
        public string Puerto { get; set; }
        public string RutaSalud { get; set; }
        public bool EsPrincipal { get; set; }
    }

    // =========================================================================
    // CONTROLES VISUALES ESTILO APPLE (iOS / macOS) CON ANTIALIASING GDI+
    // =========================================================================
    public static class EsteticaApple
    {
        public static readonly Color FondoApp = Color.FromArgb(242, 242, 247);         // #F2F2F7 iOS System Grouped BG
        public static readonly Color FondoSidebar = Color.FromArgb(235, 235, 242);     // #EBEBF2 macOS Sidebar
        public static readonly Color FondoHeader = Color.FromArgb(248, 248, 252);      // #F8F8FC Translucent Top
        public static readonly Color TarjetaBlanca = Color.FromArgb(255, 255, 255);    // #FFFFFF
        public static readonly Color BordeSuave = Color.FromArgb(226, 226, 232);       // #E2E2E8
        public static readonly Color TextoPrimario = Color.FromArgb(28, 28, 30);       // #1C1C1E
        public static readonly Color TextoSecundario = Color.FromArgb(110, 110, 118);  // #6E6E76
        public static readonly Color AzulApple = Color.FromArgb(0, 122, 255);          // #007AFF
        public static readonly Color AzulHover = Color.FromArgb(0, 100, 215);
        public static readonly Color VerdeApple = Color.FromArgb(52, 199, 89);         // #34C759
        public static readonly Color VerdeSuave = Color.FromArgb(230, 249, 236);
        public static readonly Color VerdeTexto = Color.FromArgb(22, 130, 56);
        public static readonly Color RojoApple = Color.FromArgb(255, 59, 48);          // #FF3B30
        public static readonly Color RojoHover = Color.FromArgb(220, 42, 34);
        public static readonly Color RojoSuave = Color.FromArgb(254, 236, 235);
        public static readonly Color RojoTexto = Color.FromArgb(196, 36, 28);
        public static readonly Color GrisBoton = Color.FromArgb(229, 229, 234);        // #E5E5EA
        public static readonly Color GrisBotonHover = Color.FromArgb(212, 212, 220);
        public static readonly Color GrisOfflineSuave = Color.FromArgb(235, 235, 240);

        public static GraphicsPath CrearRutaRedondeada(Rectangle rect, int radio)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radio * 2;
            if (d > rect.Width) d = rect.Width;
            if (d > rect.Height) d = rect.Height;
            if (d <= 0)
            {
                path.AddRectangle(rect);
                return path;
            }
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    public class TarjetaCurva : Panel
    {
        public int Radio { get; set; }
        public Color ColorFondo { get; set; }
        public Color ColorBorde { get; set; }

        public TarjetaCurva()
        {
            this.Radio = 20;
            this.ColorFondo = EsteticaApple.TarjetaBlanca;
            this.ColorBorde = EsteticaApple.BordeSuave;
            this.DoubleBuffered = true;
            this.BackColor = Color.Transparent;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(1, 1, this.Width - 3, this.Height - 3);
            using (GraphicsPath path = EsteticaApple.CrearRutaRedondeada(rect, this.Radio))
            using (SolidBrush br = new SolidBrush(this.ColorFondo))
            using (Pen pen = new Pen(this.ColorBorde, 1F))
            {
                e.Graphics.FillPath(br, path);
                e.Graphics.DrawPath(pen, path);
            }
        }
    }

    public class BotonCurvo : Control
    {
        public int Radio { get; set; }
        public Color ColorNormal { get; set; }
        public Color ColorHover { get; set; }
        public Color ColorTexto { get; set; }
        private bool estaEncima = false;
        private bool estaPresionado = false;

        public BotonCurvo()
        {
            this.Radio = 14;
            this.ColorNormal = EsteticaApple.AzulApple;
            this.ColorHover = EsteticaApple.AzulHover;
            this.ColorTexto = Color.White;
            this.Font = new Font("Segoe UI Semibold", 9.5F);
            this.Cursor = Cursors.Hand;
            this.Size = new Size(140, 40);
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.SupportsTransparentBackColor | ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = Color.Transparent;
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            estaEncima = true;
            this.Invalidate();
            base.OnMouseEnter(e);
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            estaEncima = false;
            estaPresionado = false;
            this.Invalidate();
            base.OnMouseLeave(e);
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                estaPresionado = true;
                this.Invalidate();
            }
            base.OnMouseDown(e);
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            estaPresionado = false;
            this.Invalidate();
            base.OnMouseUp(e);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Color fondo = this.Enabled ? (estaEncima ? this.ColorHover : this.ColorNormal) : Color.FromArgb(215, 215, 222);
            if (estaPresionado && this.Enabled)
            {
                fondo = ControlPaint.Dark(fondo, 0.08F);
            }
            Color texto = this.Enabled ? this.ColorTexto : Color.FromArgb(145, 145, 152);

            Rectangle rect = new Rectangle(1, 1, this.Width - 3, this.Height - 3);
            using (GraphicsPath path = EsteticaApple.CrearRutaRedondeada(rect, this.Radio))
            using (SolidBrush br = new SolidBrush(fondo))
            {
                e.Graphics.FillPath(br, path);
            }

            TextRenderer.DrawText(
                e.Graphics,
                this.Text,
                this.Font,
                rect,
                texto,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine
            );
        }
    }

    public class PildoraEstado : Control
    {
        private bool enLinea = false;
        private string textoEstado = "Offline";

        public PildoraEstado()
        {
            this.Size = new Size(116, 30);
            this.Font = new Font("Segoe UI Semibold", 9F);
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.SupportsTransparentBackColor | ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = Color.Transparent;
        }

        public void ActualizarEstado(bool online, string etiqueta)
        {
            enLinea = online;
            textoEstado = etiqueta;
            this.Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Color fondo = enLinea ? EsteticaApple.VerdeSuave : EsteticaApple.GrisOfflineSuave;
            Color punto = enLinea ? EsteticaApple.VerdeApple : EsteticaApple.RojoApple;
            Color texto = enLinea ? EsteticaApple.VerdeTexto : EsteticaApple.TextoSecundario;

            Rectangle rect = new Rectangle(1, 1, this.Width - 3, this.Height - 3);
            using (GraphicsPath path = EsteticaApple.CrearRutaRedondeada(rect, rect.Height / 2))
            using (SolidBrush br = new SolidBrush(fondo))
            {
                e.Graphics.FillPath(br, path);
            }

            int dotSize = 9;
            int dotY = (this.Height - dotSize) / 2;
            using (SolidBrush brDot = new SolidBrush(punto))
            {
                e.Graphics.FillEllipse(brDot, 14, dotY, dotSize, dotSize);
            }

            Rectangle rectTxt = new Rectangle(28, 0, this.Width - 34, this.Height);
            TextRenderer.DrawText(
                e.Graphics,
                textoEstado,
                this.Font,
                rectTxt,
                texto,
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine
            );
        }
    }

    public class BotonSidebar : Control
    {
        private bool activo = false;
        private bool hover = false;

        public bool Activo
        {
            get { return activo; }
            set { activo = value; this.Invalidate(); }
        }

        public BotonSidebar(string titulo)
        {
            this.Text = titulo;
            this.Size = new Size(164, 38);
            this.Font = new Font("Segoe UI Semibold", 9.5F);
            this.Cursor = Cursors.Hand;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.SupportsTransparentBackColor | ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = Color.Transparent;
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            hover = true;
            this.Invalidate();
            base.OnMouseEnter(e);
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            hover = false;
            this.Invalidate();
            base.OnMouseLeave(e);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Rectangle rect = new Rectangle(1, 1, this.Width - 3, this.Height - 3);
            if (activo || hover)
            {
                Color fondo = activo ? Color.White : Color.FromArgb(224, 224, 232);
                using (GraphicsPath path = EsteticaApple.CrearRutaRedondeada(rect, 11))
                using (SolidBrush br = new SolidBrush(fondo))
                {
                    e.Graphics.FillPath(br, path);
                }
            }

            if (activo)
            {
                using (SolidBrush brBar = new SolidBrush(EsteticaApple.AzulApple))
                {
                    e.Graphics.FillRectangle(brBar, 8, 10, 3, this.Height - 20);
                }
            }

            Color txtColor = activo ? EsteticaApple.AzulApple : EsteticaApple.TextoPrimario;
            Rectangle rectTxt = new Rectangle(20, 0, this.Width - 26, this.Height);
            TextRenderer.DrawText(
                e.Graphics,
                this.Text,
                this.Font,
                rectTxt,
                txtColor,
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine
            );
        }
    }

    // =========================================================================
    // VENTANA PRINCIPAL UNIFICADA — POS LLANOMIO
    // =========================================================================
    public class FormPanelPrincipal : Form
    {
        public const string NOMBRE_SERVICIO = "POS_Llanomio";
        public const string PIN_MAESTRO_SOPORTE = "000000";

        private string baseDir;
        private string puertoConfigurado = "3000";
        private string ipLanDetectada = "127.0.0.1";
        private string urlLanActual = "http://127.0.0.1:3000";
        private string ultimoQrGenerado = "";
        private bool soporteAutenticado = false;
        private bool esEquipoNuevo = false;
        private bool servidorEnLineaActual = false;

        // Catalogo modular de servicios
        private List<ServicioModulo> serviciosRegistrados = new List<ServicioModulo>();

        // Layout raiz
        private Panel panelHeader;
        private Label lblTituloHeader;
        private PildoraEstado pildoraGlobal;

        private Panel panelSidebar;
        private Panel panelContenido;

        // Botones de navegacion
        private BotonSidebar navInicio;
        private BotonSidebar navServicios;
        private BotonSidebar navRespaldos;
        private BotonSidebar navCuentas;
        private BotonSidebar navSistema;

        // Vistas
        private Panel vistaInstalacion;
        private Panel vistaInicio;
        private Panel vistaServicios;
        private Panel vistaRespaldos;
        private Panel vistaCuentas;
        private Panel vistaSistema;

        // Controles Instalacion Unica
        private RadioButton rbConservarDatos;
        private RadioButton rbFabricaLimpia;
        private BotonCurvo btnEjecutarInstalacion;
        private Label lblProgresoInstalacion;

        // Controles Inicio
        private TarjetaCurva cardEstadoInicio;
        private Label lblUrlInicio;
        private BotonCurvo btnInicioIniciar;
        private BotonCurvo btnInicioAbrir;
        private BotonCurvo btnInicioDetener;
        private BotonCurvo btnInicioReiniciar;

        private TarjetaCurva cardQrInicio;
        private PictureBox picQr;
        private Label lblIpQr;
        private BotonCurvo btnCopiarIp;

        // Controles Servicios Modulares
        private FlowLayoutPanel flowServicios;
        private BotonCurvo btnAgregarServicio;

        // Controles Respaldos
        private ListBox lstBackups;

        // Controles Cuentas
        private TextBox txtNombreUser;
        private TextBox txtUsername;
        private ComboBox cmbRol;
        private TextBox txtPassword;
        private TextBox txtPin;

        // Controles Sistema
        private TextBox txtPuerto;

        private System.Windows.Forms.Timer timerEstado;

        [DllImport("dwmapi.dll", PreserveSig = true)]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        private const int SW_MAXIMIZE = 3;

        public FormPanelPrincipal(bool forzarInstalacion)
        {
            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            LeerConfiguracionEnv();
            ipLanDetectada = DetectarIpLan();
            urlLanActual = "http://" + ipLanDetectada + ":" + puertoConfigurado;
            CargarServiciosModulares();

            esEquipoNuevo = forzarInstalacion || DetectarSiEsEquipoNuevo();

            ConfigurarVentana();
            ConstruirLayout();

            if (esEquipoNuevo)
            {
                MostrarVistaInstalacion();
            }
            else
            {
                MostrarVista("inicio");
                RefrescarEstadoEnVivo();
                GenerarQrLocalSeguro();
            }

            timerEstado = new System.Windows.Forms.Timer();
            timerEstado.Interval = 4000;
            timerEstado.Tick += delegate { if (!esEquipoNuevo) RefrescarEstadoEnVivo(); };
            timerEstado.Start();
        }

        private void ConfigurarVentana()
        {
            this.Text = "POS Llanomio";
            this.Size = new Size(920, 620);
            this.MinimumSize = new Size(840, 560);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = EsteticaApple.FondoApp;
            this.Font = new Font("Segoe UI", 9.5F);
            this.DoubleBuffered = true;

            try
            {
                string icoPath = Path.Combine(baseDir, "aurora.ico");
                if (!File.Exists(icoPath)) icoPath = Path.Combine(baseDir, "public", "iconos", "aurora.ico");
                if (File.Exists(icoPath)) this.Icon = new Icon(icoPath);
            }
            catch { }

            this.HandleCreated += delegate
            {
                try
                {
                    int pref = 2; // DWMWCP_ROUND en Windows 11
                    DwmSetWindowAttribute(this.Handle, 33, ref pref, sizeof(int));
                }
                catch { }
            };

            this.Resize += delegate { AjustarCentrado(); };
        }

        // =========================================================================
        // DETECCION AUTOMATICA DE EQUIPO NUEVO (INSTALACION UNICA)
        // =========================================================================
        private bool DetectarSiEsEquipoNuevo()
        {
            try
            {
                string envFile = Path.Combine(baseDir, ".env");
                if (!File.Exists(envFile)) return true;

                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Services\" + NOMBRE_SERVICIO))
                {
                    if (key == null) return true;
                    object imgPathObj = key.GetValue("ImagePath");
                    if (imgPathObj == null) return true;
                    string imgPath = imgPathObj.ToString().Trim().ToLowerInvariant();
                    string exeActual = Application.ExecutablePath.ToLowerInvariant();
                    if (!imgPath.Contains(exeActual)) return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }

        // =========================================================================
        // CONSTRUCCION DE INTERFAZ MINIMALISTA ESTILO APPLE
        // =========================================================================
        private void ConstruirLayout()
        {
            // Barra superior fija
            panelHeader = new Panel();
            panelHeader.Dock = DockStyle.Top;
            panelHeader.Height = 58;
            panelHeader.BackColor = EsteticaApple.FondoHeader;
            panelHeader.Paint += delegate(object s, PaintEventArgs e)
            {
                using (Pen p = new Pen(EsteticaApple.BordeSuave, 1F))
                {
                    e.Graphics.DrawLine(p, 0, panelHeader.Height - 1, panelHeader.Width, panelHeader.Height - 1);
                }
            };
            this.Controls.Add(panelHeader);

            lblTituloHeader = new Label();
            lblTituloHeader.Text = "POS Llanomio";
            lblTituloHeader.Font = new Font("Segoe UI Semibold", 13F);
            lblTituloHeader.ForeColor = EsteticaApple.TextoPrimario;
            lblTituloHeader.AutoSize = true;
            lblTituloHeader.Location = new Point(24, 16);
            panelHeader.Controls.Add(lblTituloHeader);

            pildoraGlobal = new PildoraEstado();
            pildoraGlobal.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            pildoraGlobal.Location = new Point(panelHeader.Width - 140, 14);
            panelHeader.Controls.Add(pildoraGlobal);

            // Barra lateral izquierda estilo macOS
            panelSidebar = new Panel();
            panelSidebar.Dock = DockStyle.Left;
            panelSidebar.Width = 196;
            panelSidebar.BackColor = EsteticaApple.FondoSidebar;
            panelSidebar.Paint += delegate(object s, PaintEventArgs e)
            {
                using (Pen p = new Pen(EsteticaApple.BordeSuave, 1F))
                {
                    e.Graphics.DrawLine(p, panelSidebar.Width - 1, 0, panelSidebar.Width - 1, panelSidebar.Height);
                }
            };
            this.Controls.Add(panelSidebar);

            navInicio = CrearItemSidebar("Inicio", 20, delegate { MostrarVista("inicio"); });
            navServicios = CrearItemSidebar("Servicios", 66, delegate { MostrarVista("servicios"); });
            navRespaldos = CrearItemSidebar("Respaldos", 112, delegate { AbrirSeccionProtegida("respaldos"); });
            navCuentas = CrearItemSidebar("Cuentas", 158, delegate { AbrirSeccionProtegida("cuentas"); });
            navSistema = CrearItemSidebar("Sistema", 204, delegate { AbrirSeccionProtegida("sistema"); });

            // Area de contenido principal
            panelContenido = new Panel();
            panelContenido.Dock = DockStyle.Fill;
            panelContenido.BackColor = EsteticaApple.FondoApp;
            this.Controls.Add(panelContenido);
            panelContenido.BringToFront();

            ConstruirVistaInstalacion();
            ConstruirVistaInicio();
            ConstruirVistaServicios();
            ConstruirVistaRespaldos();
            ConstruirVistaCuentas();
            ConstruirVistaSistema();
        }

        private BotonSidebar CrearItemSidebar(string titulo, int top, EventHandler onClick)
        {
            BotonSidebar btn = new BotonSidebar(titulo);
            btn.Location = new Point(16, top);
            btn.Click += onClick;
            panelSidebar.Controls.Add(btn);
            return btn;
        }

        // -------------------------------------------------------------------------
        // VISTA 0: ASISTENTE DE INSTALACION UNICA (EQUIPO NUEVO)
        // -------------------------------------------------------------------------
        private void ConstruirVistaInstalacion()
        {
            vistaInstalacion = new Panel();
            vistaInstalacion.Dock = DockStyle.Fill;
            vistaInstalacion.BackColor = EsteticaApple.FondoApp;
            vistaInstalacion.Visible = false;
            panelContenido.Controls.Add(vistaInstalacion);

            TarjetaCurva card = new TarjetaCurva();
            card.Name = "cardInstall";
            card.Size = new Size(460, 320);
            vistaInstalacion.Controls.Add(card);

            Label lblTit = new Label();
            lblTit.Text = "Configurar en este equipo";
            lblTit.Font = new Font("Segoe UI Semibold", 15F);
            lblTit.ForeColor = EsteticaApple.TextoPrimario;
            lblTit.TextAlign = ContentAlignment.MiddleCenter;
            lblTit.Location = new Point(30, 34);
            lblTit.Size = new Size(400, 34);
            card.Controls.Add(lblTit);

            rbConservarDatos = new RadioButton();
            rbConservarDatos.Text = "Conservar datos actuales";
            rbConservarDatos.Font = new Font("Segoe UI", 10F);
            rbConservarDatos.ForeColor = EsteticaApple.TextoPrimario;
            rbConservarDatos.Checked = true;
            rbConservarDatos.Location = new Point(110, 96);
            rbConservarDatos.Size = new Size(260, 28);
            card.Controls.Add(rbConservarDatos);

            rbFabricaLimpia = new RadioButton();
            rbFabricaLimpia.Text = "Iniciar limpio de fabrica";
            rbFabricaLimpia.Font = new Font("Segoe UI", 10F);
            rbFabricaLimpia.ForeColor = EsteticaApple.TextoPrimario;
            rbFabricaLimpia.Location = new Point(110, 134);
            rbFabricaLimpia.Size = new Size(260, 28);
            card.Controls.Add(rbFabricaLimpia);

            btnEjecutarInstalacion = new BotonCurvo();
            btnEjecutarInstalacion.Text = "Instalar";
            btnEjecutarInstalacion.Size = new Size(220, 44);
            btnEjecutarInstalacion.Location = new Point(120, 192);
            btnEjecutarInstalacion.Click += delegate { EjecutarInstalacionUnica(); };
            card.Controls.Add(btnEjecutarInstalacion);

            lblProgresoInstalacion = new Label();
            lblProgresoInstalacion.Text = "";
            lblProgresoInstalacion.Font = new Font("Segoe UI", 9F);
            lblProgresoInstalacion.ForeColor = EsteticaApple.TextoSecundario;
            lblProgresoInstalacion.TextAlign = ContentAlignment.MiddleCenter;
            lblProgresoInstalacion.Location = new Point(30, 254);
            lblProgresoInstalacion.Size = new Size(400, 28);
            card.Controls.Add(lblProgresoInstalacion);
        }

        // -------------------------------------------------------------------------
        // VISTA 1: INICIO (CONTROL PUNTUAL + QR)
        // -------------------------------------------------------------------------
        private void ConstruirVistaInicio()
        {
            vistaInicio = new Panel();
            vistaInicio.Dock = DockStyle.Fill;
            vistaInicio.BackColor = EsteticaApple.FondoApp;
            panelContenido.Controls.Add(vistaInicio);

            Panel contenedor = new Panel();
            contenedor.Name = "centerBox";
            contenedor.Size = new Size(640, 450);
            contenedor.BackColor = Color.Transparent;
            vistaInicio.Controls.Add(contenedor);

            // Tarjeta 1: Servidor
            cardEstadoInicio = new TarjetaCurva();
            cardEstadoInicio.Size = new Size(620, 175);
            cardEstadoInicio.Location = new Point(10, 12);
            contenedor.Controls.Add(cardEstadoInicio);

            Label lblTitSrv = new Label();
            lblTitSrv.Text = "Servidor POS";
            lblTitSrv.Font = new Font("Segoe UI Semibold", 13.5F);
            lblTitSrv.ForeColor = EsteticaApple.TextoPrimario;
            lblTitSrv.TextAlign = ContentAlignment.MiddleCenter;
            lblTitSrv.Location = new Point(20, 22);
            lblTitSrv.Size = new Size(580, 28);
            cardEstadoInicio.Controls.Add(lblTitSrv);

            lblUrlInicio = new Label();
            lblUrlInicio.Text = "http://localhost:" + puertoConfigurado;
            lblUrlInicio.Font = new Font("Segoe UI", 9.5F);
            lblUrlInicio.ForeColor = EsteticaApple.TextoSecundario;
            lblUrlInicio.TextAlign = ContentAlignment.MiddleCenter;
            lblUrlInicio.Location = new Point(20, 54);
            lblUrlInicio.Size = new Size(580, 24);
            cardEstadoInicio.Controls.Add(lblUrlInicio);

            btnInicioIniciar = new BotonCurvo();
            btnInicioIniciar.Text = "Iniciar";
            btnInicioIniciar.ColorNormal = EsteticaApple.VerdeApple;
            btnInicioIniciar.ColorHover = Color.FromArgb(40, 176, 74);
            btnInicioIniciar.Size = new Size(200, 44);
            btnInicioIniciar.Location = new Point(210, 98);
            btnInicioIniciar.Click += delegate { IniciarServicioAccion(NOMBRE_SERVICIO); };
            cardEstadoInicio.Controls.Add(btnInicioIniciar);

            btnInicioAbrir = new BotonCurvo();
            btnInicioAbrir.Text = "Abrir POS";
            btnInicioAbrir.ColorNormal = EsteticaApple.AzulApple;
            btnInicioAbrir.ColorHover = EsteticaApple.AzulHover;
            btnInicioAbrir.Size = new Size(165, 44);
            btnInicioAbrir.Location = new Point(52, 98);
            btnInicioAbrir.Visible = false;
            btnInicioAbrir.Click += delegate { AbrirNavegadorPos(); };
            cardEstadoInicio.Controls.Add(btnInicioAbrir);

            btnInicioReiniciar = new BotonCurvo();
            btnInicioReiniciar.Text = "Reiniciar";
            btnInicioReiniciar.ColorNormal = EsteticaApple.GrisBoton;
            btnInicioReiniciar.ColorHover = EsteticaApple.GrisBotonHover;
            btnInicioReiniciar.ColorTexto = EsteticaApple.TextoPrimario;
            btnInicioReiniciar.Size = new Size(165, 44);
            btnInicioReiniciar.Location = new Point(227, 98);
            btnInicioReiniciar.Visible = false;
            btnInicioReiniciar.Click += delegate { ReiniciarServicioAccion(NOMBRE_SERVICIO); };
            cardEstadoInicio.Controls.Add(btnInicioReiniciar);

            btnInicioDetener = new BotonCurvo();
            btnInicioDetener.Text = "Detener";
            btnInicioDetener.ColorNormal = EsteticaApple.RojoApple;
            btnInicioDetener.ColorHover = EsteticaApple.RojoHover;
            btnInicioDetener.Size = new Size(165, 44);
            btnInicioDetener.Location = new Point(402, 98);
            btnInicioDetener.Visible = false;
            btnInicioDetener.Click += delegate { DetenerConBackupObligatorio(); };
            cardEstadoInicio.Controls.Add(btnInicioDetener);

            // Tarjeta 2: QR Wi-Fi
            cardQrInicio = new TarjetaCurva();
            cardQrInicio.Size = new Size(620, 232);
            cardQrInicio.Location = new Point(10, 204);
            contenedor.Controls.Add(cardQrInicio);

            picQr = new PictureBox();
            picQr.Size = new Size(176, 176);
            picQr.Location = new Point(74, 28);
            picQr.SizeMode = PictureBoxSizeMode.Zoom;
            picQr.BackColor = Color.White;
            cardQrInicio.Controls.Add(picQr);

            Label lblQrTit = new Label();
            lblQrTit.Text = "Acceso Wi-Fi";
            lblQrTit.Font = new Font("Segoe UI Semibold", 12.5F);
            lblQrTit.ForeColor = EsteticaApple.TextoPrimario;
            lblQrTit.Location = new Point(286, 56);
            lblQrTit.Size = new Size(280, 28);
            cardQrInicio.Controls.Add(lblQrTit);

            lblIpQr = new Label();
            lblIpQr.Text = urlLanActual;
            lblIpQr.Font = new Font("Consolas", 10.5F, FontStyle.Bold);
            lblIpQr.ForeColor = EsteticaApple.AzulApple;
            lblIpQr.Location = new Point(286, 90);
            lblIpQr.Size = new Size(290, 24);
            cardQrInicio.Controls.Add(lblIpQr);

            btnCopiarIp = new BotonCurvo();
            btnCopiarIp.Text = "Copiar IP";
            btnCopiarIp.ColorNormal = EsteticaApple.GrisBoton;
            btnCopiarIp.ColorHover = EsteticaApple.GrisBotonHover;
            btnCopiarIp.ColorTexto = EsteticaApple.TextoPrimario;
            btnCopiarIp.Size = new Size(136, 38);
            btnCopiarIp.Location = new Point(286, 130);
            btnCopiarIp.Click += delegate { CopiarAlPortapapeles(urlLanActual); };
            cardQrInicio.Controls.Add(btnCopiarIp);
        }

        // -------------------------------------------------------------------------
        // VISTA 2: SERVICIOS MODULARES (ESCALABLE A FUTUROS SERVICIOS)
        // -------------------------------------------------------------------------
        private void ConstruirVistaServicios()
        {
            vistaServicios = new Panel();
            vistaServicios.Dock = DockStyle.Fill;
            vistaServicios.BackColor = EsteticaApple.FondoApp;
            vistaServicios.Visible = false;
            panelContenido.Controls.Add(vistaServicios);

            Panel contenedor = new Panel();
            contenedor.Name = "centerBox";
            contenedor.Size = new Size(640, 460);
            contenedor.BackColor = Color.Transparent;
            vistaServicios.Controls.Add(contenedor);

            Label lblTit = new Label();
            lblTit.Text = "Servicios";
            lblTit.Font = new Font("Segoe UI Semibold", 14F);
            lblTit.ForeColor = EsteticaApple.TextoPrimario;
            lblTit.Location = new Point(14, 10);
            lblTit.Size = new Size(250, 32);
            contenedor.Controls.Add(lblTit);

            btnAgregarServicio = new BotonCurvo();
            btnAgregarServicio.Text = "+ Agregar";
            btnAgregarServicio.Size = new Size(124, 34);
            btnAgregarServicio.Location = new Point(504, 8);
            btnAgregarServicio.Click += delegate { AgregarServicioModuloAccion(); };
            contenedor.Controls.Add(btnAgregarServicio);

            flowServicios = new FlowLayoutPanel();
            flowServicios.Location = new Point(10, 54);
            flowServicios.Size = new Size(620, 396);
            flowServicios.FlowDirection = FlowDirection.TopDown;
            flowServicios.WrapContents = false;
            flowServicios.AutoScroll = true;
            flowServicios.BackColor = Color.Transparent;
            contenedor.Controls.Add(flowServicios);

            RenderizarTarjetasServicios();
        }

        private void RenderizarTarjetasServicios()
        {
            if (flowServicios == null) return;
            flowServicios.Controls.Clear();

            foreach (ServicioModulo srv in serviciosRegistrados)
            {
                ServicioModulo localSrv = srv;
                TarjetaCurva card = new TarjetaCurva();
                card.Size = new Size(596, 86);
                card.Margin = new Padding(0, 0, 0, 12);

                Label lblNom = new Label();
                lblNom.Text = localSrv.Nombre;
                lblNom.Font = new Font("Segoe UI Semibold", 11F);
                lblNom.ForeColor = EsteticaApple.TextoPrimario;
                lblNom.Location = new Point(22, 18);
                lblNom.Size = new Size(210, 24);
                card.Controls.Add(lblNom);

                Label lblSub = new Label();
                lblSub.Text = string.IsNullOrEmpty(localSrv.Puerto)
                    ? localSrv.ServicioWindows
                    : localSrv.ServicioWindows + "  |  :" + localSrv.Puerto;
                lblSub.Font = new Font("Segoe UI", 8.5F);
                lblSub.ForeColor = EsteticaApple.TextoSecundario;
                lblSub.Location = new Point(22, 44);
                lblSub.Size = new Size(210, 20);
                card.Controls.Add(lblSub);

                bool activo = VerificarServicioWindowsActivo(localSrv.ServicioWindows);
                PildoraEstado pill = new PildoraEstado();
                pill.Size = new Size(102, 28);
                pill.Location = new Point(236, 29);
                pill.ActualizarEstado(activo, activo ? "En linea" : "Offline");
                card.Controls.Add(pill);

                BotonCurvo btnAcc = new BotonCurvo();
                btnAcc.Size = new Size(108, 36);
                btnAcc.Location = new Point(352, 25);
                if (activo)
                {
                    btnAcc.Text = "Detener";
                    btnAcc.ColorNormal = EsteticaApple.RojoApple;
                    btnAcc.ColorHover = EsteticaApple.RojoHover;
                    btnAcc.Click += delegate
                    {
                        if (localSrv.EsPrincipal) DetenerConBackupObligatorio();
                        else DetenerServicioGenerico(localSrv.ServicioWindows);
                        RenderizarTarjetasServicios();
                    };
                }
                else
                {
                    btnAcc.Text = "Iniciar";
                    btnAcc.ColorNormal = EsteticaApple.VerdeApple;
                    btnAcc.ColorHover = Color.FromArgb(40, 176, 74);
                    btnAcc.Click += delegate
                    {
                        IniciarServicioAccion(localSrv.ServicioWindows);
                        RenderizarTarjetasServicios();
                    };
                }
                card.Controls.Add(btnAcc);

                BotonCurvo btnRei = new BotonCurvo();
                btnRei.Text = "Reiniciar";
                btnRei.ColorNormal = EsteticaApple.GrisBoton;
                btnRei.ColorHover = EsteticaApple.GrisBotonHover;
                btnRei.ColorTexto = EsteticaApple.TextoPrimario;
                btnRei.Size = new Size(108, 36);
                btnRei.Location = new Point(468, 25);
                btnRei.Click += delegate
                {
                    ReiniciarServicioAccion(localSrv.ServicioWindows);
                    RenderizarTarjetasServicios();
                };
                card.Controls.Add(btnRei);

                flowServicios.Controls.Add(card);
            }
        }

        // -------------------------------------------------------------------------
        // VISTA 3: RESPALDOS
        // -------------------------------------------------------------------------
        private void ConstruirVistaRespaldos()
        {
            vistaRespaldos = new Panel();
            vistaRespaldos.Dock = DockStyle.Fill;
            vistaRespaldos.BackColor = EsteticaApple.FondoApp;
            vistaRespaldos.Visible = false;
            panelContenido.Controls.Add(vistaRespaldos);

            Panel contenedor = new Panel();
            contenedor.Name = "centerBox";
            contenedor.Size = new Size(640, 460);
            contenedor.BackColor = Color.Transparent;
            vistaRespaldos.Controls.Add(contenedor);

            TarjetaCurva card = new TarjetaCurva();
            card.Size = new Size(620, 436);
            card.Location = new Point(10, 12);
            contenedor.Controls.Add(card);

            Label lblTit = new Label();
            lblTit.Text = "Respaldos";
            lblTit.Font = new Font("Segoe UI Semibold", 13.5F);
            lblTit.ForeColor = EsteticaApple.TextoPrimario;
            lblTit.Location = new Point(24, 20);
            lblTit.Size = new Size(200, 28);
            card.Controls.Add(lblTit);

            BotonCurvo btnRespaldar = new BotonCurvo();
            btnRespaldar.Text = "Respaldar";
            btnRespaldar.ColorNormal = EsteticaApple.AzulApple;
            btnRespaldar.ColorHover = EsteticaApple.AzulHover;
            btnRespaldar.Size = new Size(134, 38);
            btnRespaldar.Location = new Point(24, 62);
            btnRespaldar.Click += delegate { GenerarBackupManualAccion(); };
            card.Controls.Add(btnRespaldar);

            BotonCurvo btnRestaurar = new BotonCurvo();
            btnRestaurar.Text = "Restaurar";
            btnRestaurar.ColorNormal = EsteticaApple.RojoApple;
            btnRestaurar.ColorHover = EsteticaApple.RojoHover;
            btnRestaurar.Size = new Size(134, 38);
            btnRestaurar.Location = new Point(168, 62);
            btnRestaurar.Click += delegate { RestaurarSeleccionadoAccion(); };
            card.Controls.Add(btnRestaurar);

            BotonCurvo btnExterno = new BotonCurvo();
            btnExterno.Text = "Archivo .db";
            btnExterno.ColorNormal = EsteticaApple.GrisBoton;
            btnExterno.ColorHover = EsteticaApple.GrisBotonHover;
            btnExterno.ColorTexto = EsteticaApple.TextoPrimario;
            btnExterno.Size = new Size(134, 38);
            btnExterno.Location = new Point(312, 62);
            btnExterno.Click += delegate { RestaurarArchivoExternoAccion(); };
            card.Controls.Add(btnExterno);

            BotonCurvo btnCarpeta = new BotonCurvo();
            btnCarpeta.Text = "Carpeta";
            btnCarpeta.ColorNormal = EsteticaApple.GrisBoton;
            btnCarpeta.ColorHover = EsteticaApple.GrisBotonHover;
            btnCarpeta.ColorTexto = EsteticaApple.TextoPrimario;
            btnCarpeta.Size = new Size(134, 38);
            btnCarpeta.Location = new Point(456, 62);
            btnCarpeta.Click += delegate { AbrirCarpetaBackupsAccion(); };
            card.Controls.Add(btnCarpeta);

            lstBackups = new ListBox();
            lstBackups.Location = new Point(24, 118);
            lstBackups.Size = new Size(572, 290);
            lstBackups.Font = new Font("Consolas", 9F);
            lstBackups.BorderStyle = BorderStyle.FixedSingle;
            lstBackups.BackColor = Color.FromArgb(250, 250, 252);
            card.Controls.Add(lstBackups);
        }

        // -------------------------------------------------------------------------
        // VISTA 4: CUENTAS
        // -------------------------------------------------------------------------
        private void ConstruirVistaCuentas()
        {
            vistaCuentas = new Panel();
            vistaCuentas.Dock = DockStyle.Fill;
            vistaCuentas.BackColor = EsteticaApple.FondoApp;
            vistaCuentas.Visible = false;
            panelContenido.Controls.Add(vistaCuentas);

            Panel contenedor = new Panel();
            contenedor.Name = "centerBox";
            contenedor.Size = new Size(640, 440);
            contenedor.BackColor = Color.Transparent;
            vistaCuentas.Controls.Add(contenedor);

            TarjetaCurva card = new TarjetaCurva();
            card.Size = new Size(620, 260);
            card.Location = new Point(10, 12);
            contenedor.Controls.Add(card);

            Label lblTit = new Label();
            lblTit.Text = "Nuevo Usuario";
            lblTit.Font = new Font("Segoe UI Semibold", 13F);
            lblTit.ForeColor = EsteticaApple.TextoPrimario;
            lblTit.Location = new Point(28, 22);
            lblTit.Size = new Size(240, 26);
            card.Controls.Add(lblTit);

            txtNombreUser = CrearCampoFormulario(card, "Nombre", 28, 66, 260, false);
            txtUsername = CrearCampoFormulario(card, "Usuario", 316, 66, 260, false);
            txtPassword = CrearCampoFormulario(card, "Contrasena", 28, 130, 175, true);
            txtPin = CrearCampoFormulario(card, "PIN", 220, 130, 120, true);
            txtPin.MaxLength = 6;

            Label lblRol = new Label();
            lblRol.Text = "Rol";
            lblRol.Font = new Font("Segoe UI", 8.5F);
            lblRol.ForeColor = EsteticaApple.TextoSecundario;
            lblRol.Location = new Point(358, 130);
            lblRol.Size = new Size(100, 18);
            card.Controls.Add(lblRol);

            cmbRol = new ComboBox();
            cmbRol.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbRol.Items.AddRange(new object[] { "CAJERO", "ADMIN" });
            cmbRol.SelectedIndex = 0;
            cmbRol.Location = new Point(358, 150);
            cmbRol.Size = new Size(218, 28);
            card.Controls.Add(cmbRol);

            BotonCurvo btnCrear = new BotonCurvo();
            btnCrear.Text = "Crear";
            btnCrear.ColorNormal = EsteticaApple.AzulApple;
            btnCrear.ColorHover = EsteticaApple.AzulHover;
            btnCrear.Size = new Size(160, 40);
            btnCrear.Location = new Point(28, 198);
            btnCrear.Click += delegate { CrearUsuarioAccion(); };
            card.Controls.Add(btnCrear);

            TarjetaCurva cardAdmin = new TarjetaCurva();
            cardAdmin.Size = new Size(620, 120);
            cardAdmin.Location = new Point(10, 290);
            contenedor.Controls.Add(cardAdmin);

            Label lblAdm = new Label();
            lblAdm.Text = "Acceso Maestro";
            lblAdm.Font = new Font("Segoe UI Semibold", 12F);
            lblAdm.ForeColor = EsteticaApple.TextoPrimario;
            lblAdm.Location = new Point(28, 20);
            lblAdm.Size = new Size(240, 26);
            cardAdmin.Controls.Add(lblAdm);

            BotonCurvo btnResetAdmin = new BotonCurvo();
            btnResetAdmin.Text = "Restablecer admin";
            btnResetAdmin.ColorNormal = EsteticaApple.GrisBoton;
            btnResetAdmin.ColorHover = EsteticaApple.GrisBotonHover;
            btnResetAdmin.ColorTexto = EsteticaApple.TextoPrimario;
            btnResetAdmin.Size = new Size(190, 40);
            btnResetAdmin.Location = new Point(28, 58);
            btnResetAdmin.Click += delegate { RestablecerAdminAccion(); };
            cardAdmin.Controls.Add(btnResetAdmin);
        }

        private TextBox CrearCampoFormulario(Control padre, string etiqueta, int x, int y, int ancho, bool esClave)
        {
            Label lbl = new Label();
            lbl.Text = etiqueta;
            lbl.Font = new Font("Segoe UI", 8.5F);
            lbl.ForeColor = EsteticaApple.TextoSecundario;
            lbl.Location = new Point(x, y);
            lbl.Size = new Size(ancho, 18);
            padre.Controls.Add(lbl);

            TextBox tb = new TextBox();
            tb.Location = new Point(x, y + 20);
            tb.Size = new Size(ancho, 26);
            tb.Font = new Font("Segoe UI", 9.5F);
            tb.BorderStyle = BorderStyle.FixedSingle;
            if (esClave) tb.UseSystemPasswordChar = true;
            padre.Controls.Add(tb);
            return tb;
        }

        // -------------------------------------------------------------------------
        // VISTA 5: SISTEMA (ACTUALIZAR, PUERTO, FIREWALL, REINSTALAR, FABRICA)
        // -------------------------------------------------------------------------
        private void ConstruirVistaSistema()
        {
            vistaSistema = new Panel();
            vistaSistema.Dock = DockStyle.Fill;
            vistaSistema.BackColor = EsteticaApple.FondoApp;
            vistaSistema.Visible = false;
            panelContenido.Controls.Add(vistaSistema);

            Panel contenedor = new Panel();
            contenedor.Name = "centerBox";
            contenedor.Size = new Size(640, 450);
            contenedor.BackColor = Color.Transparent;
            vistaSistema.Controls.Add(contenedor);

            // Tarjeta 1: Actualizaciones
            TarjetaCurva cardAct = new TarjetaCurva();
            cardAct.Size = new Size(620, 126);
            cardAct.Location = new Point(10, 12);
            contenedor.Controls.Add(cardAct);

            Label lblAct = new Label();
            lblAct.Text = "Actualizar Sistema";
            lblAct.Font = new Font("Segoe UI Semibold", 12.5F);
            lblAct.ForeColor = EsteticaApple.TextoPrimario;
            lblAct.Location = new Point(26, 20);
            lblAct.Size = new Size(250, 26);
            cardAct.Controls.Add(lblAct);

            BotonCurvo btnZip = new BotonCurvo();
            btnZip.Text = "Actualizar (.zip)";
            btnZip.ColorNormal = EsteticaApple.AzulApple;
            btnZip.ColorHover = EsteticaApple.AzulHover;
            btnZip.Size = new Size(180, 40);
            btnZip.Location = new Point(26, 62);
            btnZip.Click += delegate { ActualizarDesdeZipAccion(); };
            cardAct.Controls.Add(btnZip);

            BotonCurvo btnGit = new BotonCurvo();
            btnGit.Text = "Actualizar (GitHub)";
            btnGit.ColorNormal = EsteticaApple.GrisBoton;
            btnGit.ColorHover = EsteticaApple.GrisBotonHover;
            btnGit.ColorTexto = EsteticaApple.TextoPrimario;
            btnGit.Size = new Size(180, 40);
            btnGit.Location = new Point(220, 62);
            btnGit.Click += delegate { ActualizarDesdeGithubAccion(); };
            cardAct.Controls.Add(btnGit);

            // Tarjeta 2: Red y Puerto
            TarjetaCurva cardRed = new TarjetaCurva();
            cardRed.Size = new Size(620, 126);
            cardRed.Location = new Point(10, 154);
            contenedor.Controls.Add(cardRed);

            Label lblRed = new Label();
            lblRed.Text = "Red y Puerto";
            lblRed.Font = new Font("Segoe UI Semibold", 12.5F);
            lblRed.ForeColor = EsteticaApple.TextoPrimario;
            lblRed.Location = new Point(26, 20);
            lblRed.Size = new Size(220, 26);
            cardRed.Controls.Add(lblRed);

            txtPuerto = new TextBox();
            txtPuerto.Text = puertoConfigurado;
            txtPuerto.Font = new Font("Segoe UI", 10.5F);
            txtPuerto.Location = new Point(26, 66);
            txtPuerto.Size = new Size(110, 28);
            txtPuerto.BorderStyle = BorderStyle.FixedSingle;
            cardRed.Controls.Add(txtPuerto);

            BotonCurvo btnPuerto = new BotonCurvo();
            btnPuerto.Text = "Guardar Puerto";
            btnPuerto.ColorNormal = EsteticaApple.AzulApple;
            btnPuerto.ColorHover = EsteticaApple.AzulHover;
            btnPuerto.Size = new Size(156, 38);
            btnPuerto.Location = new Point(150, 62);
            btnPuerto.Click += delegate { CambiarPuertoAccion(); };
            cardRed.Controls.Add(btnPuerto);

            BotonCurvo btnFw = new BotonCurvo();
            btnFw.Text = "Reparar Firewall";
            btnFw.ColorNormal = EsteticaApple.GrisBoton;
            btnFw.ColorHover = EsteticaApple.GrisBotonHover;
            btnFw.ColorTexto = EsteticaApple.TextoPrimario;
            btnFw.Size = new Size(156, 38);
            btnFw.Location = new Point(320, 62);
            btnFw.Click += delegate { RepararFirewallAccion(true); };
            cardRed.Controls.Add(btnFw);

            // Tarjeta 3: Equipo y Fabrica (Reinstalacion oculta aqui)
            TarjetaCurva cardEq = new TarjetaCurva();
            cardEq.Size = new Size(620, 126);
            cardEq.Location = new Point(10, 296);
            contenedor.Controls.Add(cardEq);

            Label lblEq = new Label();
            lblEq.Text = "Equipo";
            lblEq.Font = new Font("Segoe UI Semibold", 12.5F);
            lblEq.ForeColor = EsteticaApple.TextoPrimario;
            lblEq.Location = new Point(26, 20);
            lblEq.Size = new Size(220, 26);
            cardEq.Controls.Add(lblEq);

            BotonCurvo btnReinstalar = new BotonCurvo();
            btnReinstalar.Text = "Reinstalar";
            btnReinstalar.ColorNormal = EsteticaApple.GrisBoton;
            btnReinstalar.ColorHover = EsteticaApple.GrisBotonHover;
            btnReinstalar.ColorTexto = EsteticaApple.TextoPrimario;
            btnReinstalar.Size = new Size(165, 40);
            btnReinstalar.Location = new Point(26, 62);
            btnReinstalar.Click += delegate { MostrarVistaInstalacion(); };
            cardEq.Controls.Add(btnReinstalar);

            BotonCurvo btnDesinstalar = new BotonCurvo();
            btnDesinstalar.Text = "Desinstalar";
            btnDesinstalar.ColorNormal = EsteticaApple.GrisBoton;
            btnDesinstalar.ColorHover = EsteticaApple.GrisBotonHover;
            btnDesinstalar.ColorTexto = EsteticaApple.TextoPrimario;
            btnDesinstalar.Size = new Size(165, 40);
            btnDesinstalar.Location = new Point(206, 62);
            btnDesinstalar.Click += delegate { DesinstalarServicioAccion(); };
            cardEq.Controls.Add(btnDesinstalar);

            BotonCurvo btnFabrica = new BotonCurvo();
            btnFabrica.Text = "Fabrica";
            btnFabrica.ColorNormal = EsteticaApple.RojoApple;
            btnFabrica.ColorHover = EsteticaApple.RojoHover;
            btnFabrica.Size = new Size(165, 40);
            btnFabrica.Location = new Point(386, 62);
            btnFabrica.Click += delegate { FormatearFabricaAccion(); };
            cardEq.Controls.Add(btnFabrica);
        }

        // =========================================================================
        // NAVEGACION Y CENTRADO
        // =========================================================================
        private void MostrarVistaInstalacion()
        {
            esEquipoNuevo = true;
            panelSidebar.Visible = false;
            OcultarTodasLasVistas();
            vistaInstalacion.Visible = true;
            AjustarCentrado();
        }

        private void AbrirSeccionProtegida(string clave)
        {
            if (!soporteAutenticado)
            {
                if (!SolicitarPinSoporte()) return;
                soporteAutenticado = true;
            }
            MostrarVista(clave);
        }

        private void MostrarVista(string clave)
        {
            esEquipoNuevo = false;
            panelSidebar.Visible = true;
            OcultarTodasLasVistas();

            navInicio.Activo = (clave == "inicio");
            navServicios.Activo = (clave == "servicios");
            navRespaldos.Activo = (clave == "respaldos");
            navCuentas.Activo = (clave == "cuentas");
            navSistema.Activo = (clave == "sistema");

            if (clave == "inicio")
            {
                vistaInicio.Visible = true;
                RefrescarEstadoEnVivo();
            }
            else if (clave == "servicios")
            {
                vistaServicios.Visible = true;
                RenderizarTarjetasServicios();
            }
            else if (clave == "respaldos")
            {
                vistaRespaldos.Visible = true;
                CargarListaBackups();
            }
            else if (clave == "cuentas")
            {
                vistaCuentas.Visible = true;
            }
            else if (clave == "sistema")
            {
                vistaSistema.Visible = true;
            }

            AjustarCentrado();
        }

        private void OcultarTodasLasVistas()
        {
            vistaInstalacion.Visible = false;
            vistaInicio.Visible = false;
            vistaServicios.Visible = false;
            vistaRespaldos.Visible = false;
            vistaCuentas.Visible = false;
            vistaSistema.Visible = false;
        }

        private void AjustarCentrado()
        {
            if (vistaInstalacion != null && vistaInstalacion.Controls.Count > 0)
            {
                Control c = vistaInstalacion.Controls[0];
                c.Location = new Point(
                    Math.Max(16, (vistaInstalacion.ClientSize.Width - c.Width) / 2),
                    Math.Max(16, (vistaInstalacion.ClientSize.Height - c.Height) / 2)
                );
            }

            Panel[] vistas = new Panel[] { vistaInicio, vistaServicios, vistaRespaldos, vistaCuentas, vistaSistema };
            foreach (Panel v in vistas)
            {
                if (v != null && v.Controls.Count > 0)
                {
                    Control box = v.Controls[0];
                    box.Location = new Point(
                        Math.Max(12, (v.ClientSize.Width - box.Width) / 2),
                        Math.Max(12, (v.ClientSize.Height - box.Height) / 2)
                    );
                }
            }
        }

        private bool SolicitarPinSoporte()
        {
            Form dlg = new Form();
            dlg.Text = "Acceso Administrador";
            dlg.Size = new Size(320, 178);
            dlg.StartPosition = FormStartPosition.CenterParent;
            dlg.FormBorderStyle = FormBorderStyle.FixedDialog;
            dlg.MaximizeBox = false;
            dlg.MinimizeBox = false;
            dlg.BackColor = EsteticaApple.FondoApp;

            Label lbl = new Label();
            lbl.Text = "PIN Maestro";
            lbl.Font = new Font("Segoe UI Semibold", 10F);
            lbl.ForeColor = EsteticaApple.TextoPrimario;
            lbl.Location = new Point(24, 20);
            lbl.Size = new Size(260, 22);
            dlg.Controls.Add(lbl);

            TextBox txt = new TextBox();
            txt.UseSystemPasswordChar = true;
            txt.Font = new Font("Segoe UI", 11F);
            txt.Location = new Point(24, 48);
            txt.Size = new Size(256, 28);
            dlg.Controls.Add(txt);

            Button btnOk = new Button();
            btnOk.Text = "Ingresar";
            btnOk.DialogResult = DialogResult.OK;
            btnOk.Location = new Point(176, 92);
            btnOk.Size = new Size(104, 34);
            dlg.Controls.Add(btnOk);
            dlg.AcceptButton = btnOk;

            if (dlg.ShowDialog(this) == DialogResult.OK)
            {
                string v = txt.Text.Trim();
                if (v == PIN_MAESTRO_SOPORTE || v == "admin123") return true;
                MessageBox.Show("PIN incorrecto.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            return false;
        }

        // =========================================================================
        // INSTALACION UNICA INTEGRADA (SIN .BAT EXTERNOS)
        // =========================================================================
        private void EjecutarInstalacionUnica()
        {
            btnEjecutarInstalacion.Enabled = false;
            this.Cursor = Cursors.WaitCursor;

            try
            {
                lblProgresoInstalacion.Text = "Preparando entorno...";
                Application.DoEvents();

                string[] carpetas = new string[] {
                    Path.Combine(baseDir, ".tmp"),
                    Path.Combine(baseDir, "database"),
                    Path.Combine(baseDir, "database", "backups_locales"),
                    "C:\\POS_BACKUPS"
                };
                foreach (string c in carpetas)
                {
                    if (!Directory.Exists(c)) Directory.CreateDirectory(c);
                }

                string envFile = Path.Combine(baseDir, ".env");
                if (!File.Exists(envFile))
                {
                    string[] lineas = new string[] {
                        "# Configuracion Produccion POS Local",
                        "NODE_ENV=production",
                        "PORT=3000",
                        "HTTP_PORT=3000",
                        "LOCAL_DOMAIN=llanomio.local",
                        "INSTANCE_ID=pos-llanomio",
                        "DATABASE_URL=\"file:./llanomio.db\"",
                        "HOSTNAME=0.0.0.0",
                        "NEXTAUTH_SECRET=pos_secret_token_seguro_2026_local_key"
                    };
                    File.WriteAllLines(envFile, lineas, Encoding.UTF8);
                }
                LeerConfiguracionEnv();

                // Inicializar base de datos
                lblProgresoInstalacion.Text = rbFabricaLimpia.Checked ? "Inicializando fabrica..." : "Verificando administrador...";
                Application.DoEvents();
                string scriptDb = rbFabricaLimpia.Checked
                    ? Path.Combine(baseDir, "scripts", "barrido-inicial-fabrica.js")
                    : Path.Combine(baseDir, "scripts", "asegurar-admin.js");
                string argDb = rbFabricaLimpia.Checked ? "--confirmar" : "";
                if (File.Exists(scriptDb))
                {
                    EjecutarScriptNode(scriptDb, argDb, 30000);
                }

                // Firewall
                lblProgresoInstalacion.Text = "Configurando Firewall...";
                Application.DoEvents();
                RepararFirewallAccion(false);

                // Registrar servicio apuntando a ESTE MISMO ejecutable con --service
                lblProgresoInstalacion.Text = "Registrando servicio...";
                Application.DoEvents();
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1200);
                EjecutarComandoOculto("sc.exe", "delete \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1000);
                try { string oldSrv = Path.Combine(baseDir, "POS_Llanomio_Service.exe"); if (File.Exists(oldSrv)) File.Delete(oldSrv); } catch { }

                string binCmd = "\\\"" + Application.ExecutablePath + "\\\" --service";
                EjecutarComandoOculto("sc.exe", "create \"" + NOMBRE_SERVICIO + "\" binPath= \"" + binCmd + "\" start= auto DisplayName= \"POS Llanomio - Servidor Local\"");
                EjecutarComandoOculto("sc.exe", "failure \"" + NOMBRE_SERVICIO + "\" reset= 86400 actions= restart/5000/restart/10000/restart/20000");
                EjecutarComandoOculto("sc.exe", "config \"" + NOMBRE_SERVICIO + "\" start= delayed-auto");
                EjecutarComandoOculto("sc.exe", "start \"" + NOMBRE_SERVICIO + "\"");

                // Accesos directos en Escritorio
                lblProgresoInstalacion.Text = "Creando accesos directos...";
                Application.DoEvents();
                CrearAccesosEscritorio();

                lblProgresoInstalacion.Text = "Instalacion completada.";
                Application.DoEvents();
                Thread.Sleep(1200);

                MostrarVista("inicio");
                RefrescarEstadoEnVivo();
                GenerarQrLocalSeguro();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error en instalacion: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnEjecutarInstalacion.Enabled = true;
                this.Cursor = Cursors.Default;
            }
        }

        private void CrearAccesosEscritorio()
        {
            try
            {
                string ico = Path.Combine(baseDir, "aurora.ico");
                if (!File.Exists(ico)) ico = Path.Combine(baseDir, "public", "iconos", "aurora.ico");
                string ps =
                    "$wsh = New-Object -ComObject WScript.Shell; " +
                    "$desk = [Environment]::GetFolderPath('Desktop'); " +
                    "$s1 = $wsh.CreateShortcut(\"$desk\\Panel Servidor POS.lnk\"); " +
                    "$s1.TargetPath = '" + Application.ExecutablePath + "'; " +
                    "$s1.WorkingDirectory = '" + baseDir.TrimEnd('\\') + "'; " +
                    "$s1.IconLocation = '" + ico + "'; " +
                    "$s1.Save(); " +
                    "$s2 = $wsh.CreateShortcut(\"$desk\\Abrir POS Llanomio.lnk\"); " +
                    "$s2.TargetPath = 'http://localhost:" + puertoConfigurado + "'; " +
                    "$s2.IconLocation = '" + ico + "'; " +
                    "$s2.Save();";
                EjecutarComandoOculto("powershell.exe", "-NoProfile -ExecutionPolicy Bypass -Command \"" + ps + "\"");
            }
            catch { }
        }

        // =========================================================================
        // ESTADO EN VIVO Y ACCIONES PRINCIPALES
        // =========================================================================
        private void RefrescarEstadoEnVivo()
        {
            bool srvActivo = VerificarServicioWindowsActivo(NOMBRE_SERVICIO);
            bool httpOk = ProbarHttpLocal("http://localhost:" + puertoConfigurado + "/api/caja/estado");
            servidorEnLineaActual = srvActivo || httpOk;

            pildoraGlobal.ActualizarEstado(servidorEnLineaActual, servidorEnLineaActual ? "En linea" : "Offline");

            btnInicioIniciar.Visible = !servidorEnLineaActual;
            btnInicioAbrir.Visible = servidorEnLineaActual;
            btnInicioReiniciar.Visible = servidorEnLineaActual;
            btnInicioDetener.Visible = servidorEnLineaActual;

            lblUrlInicio.Text = "http://localhost:" + puertoConfigurado;
            urlLanActual = "http://" + ipLanDetectada + ":" + puertoConfigurado;
            lblIpQr.Text = urlLanActual;

            if (ultimoQrGenerado != urlLanActual)
            {
                GenerarQrLocalSeguro();
            }
        }

        private bool VerificarServicioWindowsActivo(string nombreServicio)
        {
            try
            {
                using (ServiceController sc = new ServiceController(nombreServicio))
                {
                    return sc.Status == ServiceControllerStatus.Running;
                }
            }
            catch
            {
                return false;
            }
        }

        private bool ProbarHttpLocal(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 1500;
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return (int)res.StatusCode >= 200 && (int)res.StatusCode < 500;
                }
            }
            catch
            {
                return false;
            }
        }

        private void IniciarServicioAccion(string nombreServicio)
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "start \"" + nombreServicio + "\"");
                Thread.Sleep(1800);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void DetenerServicioGenerico(string nombreServicio)
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + nombreServicio + "\"");
                Thread.Sleep(1500);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al detener: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void ReiniciarServicioAccion(string nombreServicio)
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + nombreServicio + "\"");
                Thread.Sleep(1500);
                EjecutarComandoOculto("sc.exe", "start \"" + nombreServicio + "\"");
                Thread.Sleep(1800);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al reiniciar: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void DetenerConBackupObligatorio()
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptRespaldo = Path.Combine(baseDir, "scripts", "respaldo-servicio.js");
                if (File.Exists(scriptRespaldo))
                {
                    int code = EjecutarScriptNode(scriptRespaldo, "", 35000);
                    if (code != 0)
                    {
                        MessageBox.Show("Respaldo previo fallo. Detencion cancelada por seguridad.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        return;
                    }
                }
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1800);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al detener: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void AbrirNavegadorPos()
        {
            try
            {
                string url = "http://localhost:" + puertoConfigurado;
                string[] navegadores = new string[] {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe")
                };

                foreach (string ruta in navegadores)
                {
                    if (File.Exists(ruta))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = ruta;
                        psi.Arguments = "--new-window --start-maximized \"" + url + "\"";
                        psi.UseShellExecute = true;
                        psi.WindowStyle = ProcessWindowStyle.Maximized;
                        Process p = Process.Start(psi);
                        if (p != null)
                        {
                            try { p.WaitForInputIdle(1500); if (p.MainWindowHandle != IntPtr.Zero) ShowWindow(p.MainWindowHandle, SW_MAXIMIZE); } catch { }
                        }
                        return;
                    }
                }
                Process.Start(url);
            }
            catch (Exception ex)
            {
                MessageBox.Show("No se pudo abrir el navegador: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // =========================================================================
        // CATALOGO MODULAR DE SERVICIOS (servicios-panel.cfg)
        // =========================================================================
        private void CargarServiciosModulares()
        {
            serviciosRegistrados.Clear();
            serviciosRegistrados.Add(new ServicioModulo {
                Id = "pos",
                Nombre = "POS Llanomio",
                ServicioWindows = NOMBRE_SERVICIO,
                Puerto = puertoConfigurado,
                RutaSalud = "/api/caja/estado",
                EsPrincipal = true
            });

            try
            {
                string rutaCfg = Path.Combine(baseDir, "portable-windows", "servicios-panel.cfg");
                if (File.Exists(rutaCfg))
                {
                    foreach (string linea in File.ReadAllLines(rutaCfg, Encoding.UTF8))
                    {
                        string l = linea.Trim();
                        if (string.IsNullOrEmpty(l) || l.StartsWith("#")) continue;
                        string[] p = l.Split('|');
                        if (p.Length >= 2)
                        {
                            serviciosRegistrados.Add(new ServicioModulo {
                                Id = "ext_" + p[1].Trim(),
                                Nombre = p[0].Trim(),
                                ServicioWindows = p[1].Trim(),
                                Puerto = p.Length >= 3 ? p[2].Trim() : "",
                                RutaSalud = "",
                                EsPrincipal = false
                            });
                        }
                    }
                }
            }
            catch { }
        }

        private void AgregarServicioModuloAccion()
        {
            if (!soporteAutenticado)
            {
                if (!SolicitarPinSoporte()) return;
                soporteAutenticado = true;
            }

            Form dlg = new Form();
            dlg.Text = "Agregar Servicio";
            dlg.Size = new Size(360, 260);
            dlg.StartPosition = FormStartPosition.CenterParent;
            dlg.FormBorderStyle = FormBorderStyle.FixedDialog;
            dlg.MaximizeBox = false;
            dlg.MinimizeBox = false;
            dlg.BackColor = EsteticaApple.FondoApp;

            TextBox tbNom = CrearCampoFormulario(dlg, "Nombre visible", 24, 18, 296, false);
            TextBox tbSrv = CrearCampoFormulario(dlg, "Nombre del Servicio Windows", 24, 76, 296, false);
            TextBox tbPrt = CrearCampoFormulario(dlg, "Puerto (opcional)", 24, 134, 130, false);

            Button btnOk = new Button();
            btnOk.Text = "Guardar";
            btnOk.DialogResult = DialogResult.OK;
            btnOk.Location = new Point(216, 182);
            btnOk.Size = new Size(104, 34);
            dlg.Controls.Add(btnOk);
            dlg.AcceptButton = btnOk;

            if (dlg.ShowDialog(this) == DialogResult.OK)
            {
                string nom = tbNom.Text.Trim();
                string srv = tbSrv.Text.Trim();
                string prt = tbPrt.Text.Trim();
                if (string.IsNullOrEmpty(nom) || string.IsNullOrEmpty(srv)) return;

                try
                {
                    string dirCfg = Path.Combine(baseDir, "portable-windows");
                    if (!Directory.Exists(dirCfg)) Directory.CreateDirectory(dirCfg);
                    string rutaCfg = Path.Combine(dirCfg, "servicios-panel.cfg");
                    File.AppendAllText(rutaCfg, nom + "|" + srv + "|" + prt + Environment.NewLine, Encoding.UTF8);
                    CargarServiciosModulares();
                    RenderizarTarjetasServicios();
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Error al guardar servicio: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        // =========================================================================
        // ACTUALIZACIONES, RESPALDOS, CUENTAS Y SISTEMA
        // =========================================================================
        private void ActualizarDesdeZipAccion()
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Title = "Seleccionar paquete (.zip)";
            ofd.Filter = "Paquete ZIP (*.zip)|*.zip";
            string dirAct = Path.Combine(baseDir, "actualizaciones");
            if (Directory.Exists(dirAct)) ofd.InitialDirectory = dirAct;

            if (ofd.ShowDialog(this) != DialogResult.OK) return;

            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptAct = Path.Combine(baseDir, "scripts", "aplicar-actualizacion-segura.js");
                int code = EjecutarScriptNode(scriptAct, "--zip=\"" + ofd.FileName + "\"", 180000);
                if (code == 0)
                {
                    MessageBox.Show("Actualizacion aplicada con exito.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                else
                {
                    MessageBox.Show("Error al aplicar actualizacion (codigo " + code + ").", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void ActualizarDesdeGithubAccion()
        {
            DialogResult dr = MessageBox.Show("Actualizar desde GitHub?", "POS Llanomio", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (dr != DialogResult.Yes) return;

            this.Cursor = Cursors.WaitCursor;
            try
            {
                string scriptAct = Path.Combine(baseDir, "scripts", "aplicar-actualizacion-segura.js");
                int code = EjecutarScriptNode(scriptAct, "--github", 240000);
                if (code == 0)
                {
                    MessageBox.Show("Actualizacion desde GitHub completada.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                else
                {
                    MessageBox.Show("No se pudo actualizar desde GitHub (codigo " + code + ").", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void GenerarBackupManualAccion()
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                string script = Path.Combine(baseDir, "scripts", "respaldo-servicio.js");
                int code = EjecutarScriptNode(script, "", 45000);
                if (code == 0)
                {
                    MessageBox.Show("Respaldo guardado en C:\\POS_BACKUPS.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                CargarListaBackups();
            }
        }

        private void CargarListaBackups()
        {
            try
            {
                lstBackups.Items.Clear();
                string dir = "C:\\POS_BACKUPS";
                if (!Directory.Exists(dir)) return;
                string[] archivos = Directory.GetFiles(dir, "*.db");
                Array.Sort(archivos);
                Array.Reverse(archivos);
                foreach (string arch in archivos)
                {
                    FileInfo fi = new FileInfo(arch);
                    double kb = Math.Round((double)fi.Length / 1024, 1);
                    lstBackups.Items.Add(string.Format("{0,-40} | {1,8} KB | {2:dd/MM/yyyy HH:mm}", fi.Name, kb, fi.LastWriteTime));
                }
            }
            catch { }
        }

        private void AbrirCarpetaBackupsAccion()
        {
            try
            {
                string dir = "C:\\POS_BACKUPS";
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                Process.Start("explorer.exe", dir);
            }
            catch { }
        }

        private void RestaurarSeleccionadoAccion()
        {
            if (lstBackups.SelectedIndex < 0) return;
            string nombre = lstBackups.SelectedItem.ToString().Split('|')[0].Trim();
            EjecutarRestauracion(Path.Combine("C:\\POS_BACKUPS", nombre));
        }

        private void RestaurarArchivoExternoAccion()
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Title = "Seleccionar respaldo (.db)";
            ofd.Filter = "SQLite (*.db)|*.db";
            if (ofd.ShowDialog(this) == DialogResult.OK)
            {
                EjecutarRestauracion(ofd.FileName);
            }
        }

        private void EjecutarRestauracion(string origen)
        {
            if (!File.Exists(origen)) return;
            try
            {
                using (FileStream fs = new FileStream(origen, FileMode.Open, FileAccess.Read))
                {
                    byte[] h = new byte[16];
                    fs.Read(h, 0, 16);
                    if (!Encoding.UTF8.GetString(h).StartsWith("SQLite format 3"))
                    {
                        MessageBox.Show("Archivo SQLite invalido.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    }
                }
            }
            catch { return; }

            if (MessageBox.Show("Restaurar " + Path.GetFileName(origen) + "?", "Confirmar", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;

            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1800);

                string destino = Path.Combine(baseDir, "database", "llanomio.db");
                if (File.Exists(destino))
                {
                    string prevDir = "C:\\POS_BACKUPS";
                    if (!Directory.Exists(prevDir)) Directory.CreateDirectory(prevDir);
                    File.Copy(destino, Path.Combine(prevDir, "pre_restauracion_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".db"), true);
                }

                string wal = destino + "-wal";
                string shm = destino + "-shm";
                if (File.Exists(wal)) File.Delete(wal);
                if (File.Exists(shm)) File.Delete(shm);
                File.Copy(origen, destino, true);

                EjecutarComandoOculto("sc.exe", "start \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1800);
                MessageBox.Show("Base de datos restaurada.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al restaurar: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
                CargarListaBackups();
            }
        }

        private void CrearUsuarioAccion()
        {
            string nom = txtNombreUser.Text.Trim();
            string usr = txtUsername.Text.Trim();
            string rol = cmbRol.SelectedItem != null ? cmbRol.SelectedItem.ToString() : "CAJERO";
            string pwd = txtPassword.Text.Trim();
            string pin = txtPin.Text.Trim();

            if (string.IsNullOrEmpty(nom) || string.IsNullOrEmpty(usr) || string.IsNullOrEmpty(pwd) || pin.Length < 4)
            {
                MessageBox.Show("Complete todos los campos (PIN minimo 4 digitos).", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            this.Cursor = Cursors.WaitCursor;
            try
            {
                string script = Path.Combine(baseDir, "scripts", "crear-usuario-panel.js");
                string args = "\"" + nom + "\" \"" + usr + "\" \"" + rol + "\" \"" + pwd + "\" \"" + pin + "\"";
                int code = EjecutarScriptNode(script, args, 15000);
                if (code == 0)
                {
                    MessageBox.Show("Usuario creado: " + usr, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    txtNombreUser.Text = "";
                    txtUsername.Text = "";
                    txtPassword.Text = "";
                    txtPin.Text = "";
                }
                else
                {
                    MessageBox.Show("No se pudo crear el usuario.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            finally
            {
                this.Cursor = Cursors.Default;
            }
        }

        private void RestablecerAdminAccion()
        {
            if (MessageBox.Show("Restablecer admin / admin123 (PIN 000000)?", "Confirmar", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            this.Cursor = Cursors.WaitCursor;
            try
            {
                int code = EjecutarScriptNode(Path.Combine(baseDir, "scripts", "asegurar-admin.js"), "", 20000);
                if (code == 0) MessageBox.Show("Credenciales de admin restablecidas.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            finally
            {
                this.Cursor = Cursors.Default;
            }
        }

        private void FormatearFabricaAccion()
        {
            if (MessageBox.Show("Limpiar transacciones y dejar de fabrica?", "Confirmar", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1500);
                int code = EjecutarScriptNode(Path.Combine(baseDir, "scripts", "barrido-inicial-fabrica.js"), "--confirmar", 30000);
                EjecutarComandoOculto("sc.exe", "start \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1500);
                if (code == 0) MessageBox.Show("Sistema reiniciado de fabrica.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void DesinstalarServicioAccion()
        {
            if (MessageBox.Show("Desinstalar servicio POS_Llanomio?", "Confirmar", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            this.Cursor = Cursors.WaitCursor;
            try
            {
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1200);
                EjecutarComandoOculto("sc.exe", "delete \"" + NOMBRE_SERVICIO + "\"");
                MessageBox.Show("Servicio desinstalado.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            finally
            {
                this.Cursor = Cursors.Default;
                RefrescarEstadoEnVivo();
            }
        }

        private void RepararFirewallAccion(bool mostrarAviso)
        {
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall delete rule name=\"POS_Llanomio_TCP\"");
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall delete rule name=\"POS_Llanomio_mDNS\"");
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall add rule name=\"POS_Llanomio_TCP\" dir=in action=allow protocol=TCP localport=" + puertoConfigurado);
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall add rule name=\"POS_Llanomio_mDNS\" dir=in action=allow protocol=UDP localport=5353");
            if (mostrarAviso)
            {
                MessageBox.Show("Firewall configurado (TCP " + puertoConfigurado + " / UDP 5353).", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void CambiarPuertoAccion()
        {
            string pStr = txtPuerto.Text.Trim();
            int pNum;
            if (!int.TryParse(pStr, out pNum) || pNum < 80 || pNum > 65535)
            {
                MessageBox.Show("Puerto invalido (80-65535).", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            GuardarPuertoEnDotEnv(pStr);
            RepararFirewallAccion(false);
            ReiniciarServicioAccion(NOMBRE_SERVICIO);
            CargarServiciosModulares();
            GenerarQrLocalSeguro();
            MessageBox.Show("Puerto actualizado a " + pStr + ".", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        // =========================================================================
        // UTILIDADES (QR, ENV, NODE, RED)
        // =========================================================================
        private void GenerarQrLocalSeguro()
        {
            try
            {
                string scriptQr = Path.Combine(baseDir, "scripts", "generar-qr-local.js");
                if (!File.Exists(scriptQr)) return;

                string tmpDir = Path.Combine(baseDir, ".tmp");
                if (!Directory.Exists(tmpDir)) Directory.CreateDirectory(tmpDir);
                string outPng = Path.Combine(tmpDir, "qr_lan.png");

                EjecutarScriptNode(scriptQr, "\"" + urlLanActual + "\" \"" + outPng + "\"", 10000);
                if (File.Exists(outPng))
                {
                    byte[] bytes = File.ReadAllBytes(outPng);
                    using (MemoryStream ms = new MemoryStream(bytes))
                    using (Image img = Image.FromStream(ms))
                    {
                        Image vieja = picQr.Image;
                        picQr.Image = new Bitmap(img);
                        if (vieja != null) vieja.Dispose();
                    }
                    ultimoQrGenerado = urlLanActual;
                }
            }
            catch { }
        }

        private string ObtenerNodeExe()
        {
            string portable = Path.Combine(baseDir, "runtime", "node", "node.exe");
            return File.Exists(portable) ? portable : "node";
        }

        private int EjecutarScriptNode(string rutaScript, string extraArgs, int timeoutMs)
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = ObtenerNodeExe();
            psi.Arguments = "\"" + rutaScript + "\"" + (string.IsNullOrEmpty(extraArgs) ? "" : " " + extraArgs);
            psi.WorkingDirectory = baseDir;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;

            using (Process p = Process.Start(psi))
            {
                if (p == null) return -1;
                p.WaitForExit(timeoutMs);
                return p.HasExited ? p.ExitCode : -1;
            }
        }

        private void EjecutarComandoOculto(string exe, string args)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exe;
                psi.Arguments = args;
                psi.WorkingDirectory = baseDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(15000);
                }
            }
            catch { }
        }

        private void LeerConfiguracionEnv()
        {
            try
            {
                string envPath = Path.Combine(baseDir, ".env");
                if (!File.Exists(envPath)) return;
                foreach (string linea in File.ReadAllLines(envPath))
                {
                    string l = linea.Trim();
                    if (l.StartsWith("PORT="))
                    {
                        string val = l.Substring(5).Trim().Trim('"', '\'');
                        if (!string.IsNullOrEmpty(val)) puertoConfigurado = val;
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
                List<string> nuevas = new List<string>();
                bool encontro = false;
                if (File.Exists(envPath))
                {
                    foreach (string l in File.ReadAllLines(envPath))
                    {
                        if (l.Trim().StartsWith("PORT="))
                        {
                            nuevas.Add("PORT=" + nuevoPuerto);
                            encontro = true;
                        }
                        else if (l.Trim().StartsWith("HTTP_PORT="))
                        {
                            nuevas.Add("HTTP_PORT=" + nuevoPuerto);
                        }
                        else
                        {
                            nuevas.Add(l);
                        }
                    }
                }
                if (!encontro) nuevas.Add("PORT=" + nuevoPuerto);
                File.WriteAllLines(envPath, nuevas.ToArray(), Encoding.UTF8);
                puertoConfigurado = nuevoPuerto;
            }
            catch { }
        }

        private string DetectarIpLan()
        {
            try
            {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up) continue;
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                    string desc = ni.Description.ToLowerInvariant();
                    if (desc.Contains("virtual") || desc.Contains("vmware") || desc.Contains("vbox") || desc.Contains("hyper-v")) continue;

                    foreach (UnicastIPAddressInformation ip in ni.GetIPProperties().UnicastAddresses)
                    {
                        if (ip.Address.AddressFamily == AddressFamily.InterNetwork)
                        {
                            string s = ip.Address.ToString();
                            if (s.StartsWith("192.168.") || s.StartsWith("10.") || s.StartsWith("172.")) return s;
                        }
                    }
                }
            }
            catch { }
            return "127.0.0.1";
        }

        private void CopiarAlPortapapeles(string texto)
        {
            try
            {
                Clipboard.SetText(texto);
                btnCopiarIp.Text = "Copiado";
                System.Windows.Forms.Timer t = new System.Windows.Forms.Timer();
                t.Interval = 1400;
                t.Tick += delegate { btnCopiarIp.Text = "Copiar IP"; t.Stop(); t.Dispose(); };
                t.Start();
            }
            catch { }
        }
    }
}
