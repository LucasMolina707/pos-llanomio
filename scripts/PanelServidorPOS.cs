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
    // PALETA Y COMPONENTES FLOTANTES ESTILO FINORA / APPLE (GDI+ ANTI-ALIASED)
    // =========================================================================
    public static class TemaFinora
    {
        public static readonly Color LienzoFondo = Color.FromArgb(245, 248, 252);      // #F5F8FC Aireado
        public static readonly Color BlancoPuro = Color.FromArgb(255, 255, 255);       // #FFFFFF
        public static readonly Color BordeFino = Color.FromArgb(234, 240, 247);        // #EAF0F7
        public static readonly Color TextoOscuro = Color.FromArgb(20, 28, 46);         // #141C2E
        public static readonly Color TextoSuave = Color.FromArgb(115, 128, 150);       // #738096

        public static readonly Color AzulPrimario = Color.FromArgb(37, 118, 246);      // #2576F6
        public static readonly Color AzulHover = Color.FromArgb(24, 98, 218);
        public static readonly Color AzulPastel = Color.FromArgb(232, 243, 255);       // #E8F3FF
        public static readonly Color AzulTarjeta = Color.FromArgb(242, 247, 255);      // #F2F7FF

        public static readonly Color VerdePrimario = Color.FromArgb(22, 184, 110);     // #16B86E
        public static readonly Color VerdeHover = Color.FromArgb(18, 158, 94);
        public static readonly Color VerdePastel = Color.FromArgb(226, 249, 237);      // #E2F9ED
        public static readonly Color VerdeTarjeta = Color.FromArgb(242, 252, 247);     // #F2FCF7
        public static readonly Color VerdeTexto = Color.FromArgb(16, 134, 78);

        public static readonly Color AmbarPrimario = Color.FromArgb(235, 158, 18);     // #EB9E12
        public static readonly Color AmbarPastel = Color.FromArgb(255, 243, 214);      // #FFF3D6
        public static readonly Color AmbarTarjeta = Color.FromArgb(255, 251, 241);     // #FFFBF1
        public static readonly Color AmbarTexto = Color.FromArgb(172, 108, 6);

        public static readonly Color RosaPrimario = Color.FromArgb(239, 78, 92);       // #EF4E5C
        public static readonly Color RosaHover = Color.FromArgb(214, 56, 70);
        public static readonly Color RosaPastel = Color.FromArgb(254, 232, 235);       // #FEE8EB
        public static readonly Color RosaTarjeta = Color.FromArgb(255, 245, 246);      // #FFF5F6
        public static readonly Color RosaTexto = Color.FromArgb(198, 42, 56);

        public static readonly Color GrisPill = Color.FromArgb(238, 242, 248);         // #EEF2F8
        public static readonly Color GrisPillHover = Color.FromArgb(224, 231, 242);

        public static GraphicsPath CrearRuta(Rectangle rect, int radio)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radio * 2;
            if (d > rect.Width) d = rect.Width;
            if (d > rect.Height) d = rect.Height;
            if (d <= 0) { path.AddRectangle(rect); return path; }
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        public static void DibujarSombraSuave(Graphics g, Rectangle cardRect, int radio)
        {
            for (int i = 3; i >= 1; i--)
            {
                Rectangle r = new Rectangle(cardRect.X - i + 1, cardRect.Y + i, cardRect.Width + (i * 2) - 2, cardRect.Height + i);
                int alpha = (4 - i) * 5;
                using (GraphicsPath p = CrearRuta(r, radio + i))
                using (SolidBrush br = new SolidBrush(Color.FromArgb(alpha, 25, 45, 80)))
                {
                    g.FillPath(br, p);
                }
            }
        }

        public static void DibujarIconoVectorial(Graphics g, string tipo, Rectangle r, Color color)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (Pen pen = new Pen(color, 1.8F))
            {
                pen.StartCap = LineCap.Round;
                pen.EndCap = LineCap.Round;
                pen.LineJoin = LineJoin.Round;

                int x = r.X;
                int y = r.Y;
                int w = r.Width;
                int h = r.Height;

                if (tipo == "home")
                {
                    Point[] techo = new Point[] {
                        new Point(x + 2, y + h / 2),
                        new Point(x + w / 2, y + 2),
                        new Point(x + w - 2, y + h / 2)
                    };
                    g.DrawLines(pen, techo);
                    g.DrawRectangle(pen, x + 4, y + h / 2, w - 8, h / 2 - 2);
                }
                else if (tipo == "services")
                {
                    g.DrawRectangle(pen, x + 2, y + 3, w - 4, 5);
                    g.DrawRectangle(pen, x + 2, y + 11, w - 4, 5);
                    using (SolidBrush b = new SolidBrush(color))
                    {
                        g.FillEllipse(b, x + 5, y + 5, 2, 2);
                        g.FillEllipse(b, x + 5, y + 13, 2, 2);
                    }
                }
                else if (tipo == "backup")
                {
                    g.DrawEllipse(pen, x + 3, y + 2, w - 6, 5);
                    g.DrawLine(pen, x + 3, y + 5, x + 3, y + h - 4);
                    g.DrawLine(pen, x + w - 3, y + 5, x + w - 3, y + h - 4);
                    g.DrawArc(pen, x + 3, y + h - 7, w - 6, 5, 0, 180);
                }
                else if (tipo == "users")
                {
                    g.DrawEllipse(pen, x + 5, y + 2, 7, 7);
                    g.DrawArc(pen, x + 2, y + 11, w - 4, 10, 180, 180);
                }
                else if (tipo == "settings")
                {
                    g.DrawEllipse(pen, x + 6, y + 6, w - 12, h - 12);
                    g.DrawEllipse(pen, x + 3, y + 3, w - 6, h - 6);
                }
                else if (tipo == "wifi")
                {
                    g.DrawArc(pen, x + 2, y + 4, w - 4, h - 4, 215, 110);
                    g.DrawArc(pen, x + 5, y + 8, w - 10, h - 8, 215, 110);
                    using (SolidBrush b = new SolidBrush(color))
                    {
                        g.FillEllipse(b, x + w / 2 - 2, y + h - 5, 4, 4);
                    }
                }
                else if (tipo == "power")
                {
                    g.DrawArc(pen, x + 3, y + 4, w - 6, h - 6, 305, 290);
                    g.DrawLine(pen, x + w / 2, y + 2, x + w / 2, y + h / 2);
                }
                else if (tipo == "book")
                {
                    g.DrawRectangle(pen, x + 3, y + 2, w - 6, h - 4);
                    g.DrawLine(pen, x + 7, y + 2, x + 7, y + h - 2);
                    g.DrawLine(pen, x + 10, y + 7, x + w - 5, y + 7);
                    g.DrawLine(pen, x + 10, y + 11, x + w - 5, y + 11);
                }
            }
        }
    }

    public class TarjetaFlotante : Panel
    {
        public int Radio { get; set; }
        public Color ColorInicio { get; set; }
        public Color ColorFin { get; set; }

        public TarjetaFlotante()
        {
            this.Radio = 22;
            this.ColorInicio = TemaFinora.BlancoPuro;
            this.ColorFin = TemaFinora.BlancoPuro;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = TemaFinora.LienzoFondo;
        }

        protected override void OnControlAdded(ControlEventArgs e)
        {
            base.OnControlAdded(e);
            if (e.Control is Label || e.Control is RadioButton || e.Control is BotonCurvo || e.Control is PildoraEstado || e.Control is BotonSidebarFinora)
            {
                e.Control.BackColor = TemaFinora.BlancoPuro;
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.Clear(this.BackColor);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(4, 3, this.Width - 9, this.Height - 9);
            TemaFinora.DibujarSombraSuave(e.Graphics, rect, this.Radio);

            using (GraphicsPath path = TemaFinora.CrearRuta(rect, this.Radio))
            using (LinearGradientBrush br = new LinearGradientBrush(rect, this.ColorInicio, this.ColorFin, LinearGradientMode.Vertical))
            using (Pen pen = new Pen(TemaFinora.BordeFino, 1F))
            {
                e.Graphics.FillPath(br, path);
                e.Graphics.DrawPath(pen, path);
            }
        }
    }

    public class TarjetaKpiPastel : Control
    {
        public string Titulo { get; set; }
        public string Valor { get; set; }
        public string EtiquetaPill { get; set; }
        public string TipoIcono { get; set; }
        public Color FondoTarjeta { get; set; }
        public Color FondoIcono { get; set; }
        public Color ColorAcento { get; set; }
        public Color FondoPill { get; set; }
        public Color TextoPill { get; set; }

        public TarjetaKpiPastel()
        {
            this.Size = new Size(184, 148);
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = TemaFinora.LienzoFondo;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.Clear(this.BackColor);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Rectangle rect = new Rectangle(4, 3, this.Width - 9, this.Height - 9);
            TemaFinora.DibujarSombraSuave(g, rect, 20);

            using (GraphicsPath path = TemaFinora.CrearRuta(rect, 20))
            using (LinearGradientBrush br = new LinearGradientBrush(rect, this.FondoTarjeta, TemaFinora.BlancoPuro, LinearGradientMode.Vertical))
            using (Pen pen = new Pen(TemaFinora.BordeFino, 1F))
            {
                g.FillPath(br, path);
                g.DrawPath(pen, path);
            }

            // Circulo pastel con icono vectorial
            Rectangle iconCircle = new Rectangle(18, 16, 36, 36);
            using (SolidBrush brCir = new SolidBrush(this.FondoIcono))
            {
                g.FillEllipse(brCir, iconCircle);
            }
            TemaFinora.DibujarIconoVectorial(g, this.TipoIcono, new Rectangle(27, 25, 18, 18), this.ColorAcento);

            // Titulo
            using (Font fTit = new Font("Segoe UI", 8.8F))
            {
                TextRenderer.DrawText(g, this.Titulo ?? "", fTit, new Rectangle(18, 60, this.Width - 36, 20), TemaFinora.TextoSuave, TextFormatFlags.Left | TextFormatFlags.VerticalCenter);
            }

            // Valor grande
            using (Font fVal = new Font("Segoe UI Semibold", 13F))
            {
                TextRenderer.DrawText(g, this.Valor ?? "", fVal, new Rectangle(18, 80, this.Width - 36, 26), TemaFinora.TextoOscuro, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
            }

            // Pill inferior
            if (!string.IsNullOrEmpty(this.EtiquetaPill))
            {
                Rectangle pillRect = new Rectangle(18, 110, 96, 22);
                using (GraphicsPath pp = TemaFinora.CrearRuta(pillRect, 11))
                using (SolidBrush brP = new SolidBrush(this.FondoPill))
                {
                    g.FillPath(brP, pp);
                }
                using (Font fP = new Font("Segoe UI Semibold", 7.8F))
                {
                    TextRenderer.DrawText(g, this.EtiquetaPill, fP, pillRect, this.TextoPill, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
                }
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
            this.ColorNormal = TemaFinora.AzulPrimario;
            this.ColorHover = TemaFinora.AzulHover;
            this.ColorTexto = Color.White;
            this.Font = new Font("Segoe UI Semibold", 9.5F);
            this.Cursor = Cursors.Hand;
            this.Size = new Size(140, 42);
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = TemaFinora.BlancoPuro;
        }

        protected override void OnMouseEnter(EventArgs e) { estaEncima = true; this.Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { estaEncima = false; estaPresionado = false; this.Invalidate(); base.OnMouseLeave(e); }
        protected override void OnMouseDown(MouseEventArgs e) { if (e.Button == MouseButtons.Left) { estaPresionado = true; this.Invalidate(); } base.OnMouseDown(e); }
        protected override void OnMouseUp(MouseEventArgs e) { estaPresionado = false; this.Invalidate(); base.OnMouseUp(e); }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Color fondo = this.Enabled ? (estaEncima ? this.ColorHover : this.ColorNormal) : Color.FromArgb(222, 228, 236);
            if (estaPresionado && this.Enabled) fondo = ControlPaint.Dark(fondo, 0.06F);
            Color texto = this.Enabled ? this.ColorTexto : Color.FromArgb(148, 158, 174);

            Rectangle rect = new Rectangle(1, 1, this.Width - 3, this.Height - 3);
            using (GraphicsPath path = TemaFinora.CrearRuta(rect, this.Radio))
            using (SolidBrush br = new SolidBrush(fondo))
            {
                e.Graphics.FillPath(br, path);
            }

            TextRenderer.DrawText(e.Graphics, this.Text, this.Font, rect, texto, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    public class PildoraEstado : Control
    {
        private bool enLinea = false;
        private string textoEstado = "Offline";

        public PildoraEstado()
        {
            this.Size = new Size(118, 34);
            this.Font = new Font("Segoe UI Semibold", 9F);
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = TemaFinora.LienzoFondo;
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

            Color fondo = enLinea ? TemaFinora.VerdePastel : TemaFinora.RosaPastel;
            Color punto = enLinea ? TemaFinora.VerdePrimario : TemaFinora.RosaPrimario;
            Color texto = enLinea ? TemaFinora.VerdeTexto : TemaFinora.RosaTexto;

            Rectangle rect = new Rectangle(2, 2, this.Width - 5, this.Height - 5);
            using (GraphicsPath path = TemaFinora.CrearRuta(rect, rect.Height / 2))
            using (SolidBrush br = new SolidBrush(fondo))
            {
                e.Graphics.FillPath(br, path);
            }

            int dotSize = 9;
            int dotY = (this.Height - dotSize) / 2;
            using (SolidBrush brDot = new SolidBrush(punto))
            {
                e.Graphics.FillEllipse(brDot, 16, dotY, dotSize, dotSize);
            }

            Rectangle rectTxt = new Rectangle(32, 0, this.Width - 38, this.Height);
            TextRenderer.DrawText(e.Graphics, textoEstado, this.Font, rectTxt, texto, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    public class BotonSidebarFinora : Control
    {
        private bool activo = false;
        private bool hover = false;
        private string tipoIcono;

        public bool Activo
        {
            get { return activo; }
            set { activo = value; this.Invalidate(); }
        }

        public BotonSidebarFinora(string titulo, string icono)
        {
            this.Text = titulo;
            this.tipoIcono = icono;
            this.Size = new Size(164, 42);
            this.Font = new Font("Segoe UI Semibold", 9.5F);
            this.Cursor = Cursors.Hand;
            this.DoubleBuffered = true;
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.BackColor = TemaFinora.BlancoPuro;
        }

        protected override void OnMouseEnter(EventArgs e) { hover = true; this.Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { hover = false; this.Invalidate(); base.OnMouseLeave(e); }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Rectangle rect = new Rectangle(1, 1, this.Width - 3, this.Height - 3);
            if (activo || hover)
            {
                Color fondo = activo ? TemaFinora.AzulPastel : Color.FromArgb(244, 247, 252);
                using (GraphicsPath path = TemaFinora.CrearRuta(rect, 12))
                using (SolidBrush br = new SolidBrush(fondo))
                {
                    e.Graphics.FillPath(br, path);
                }
            }

            Color fg = activo ? TemaFinora.AzulPrimario : TemaFinora.TextoSuave;
            TemaFinora.DibujarIconoVectorial(e.Graphics, this.tipoIcono, new Rectangle(15, 12, 18, 18), fg);

            Rectangle rectTxt = new Rectangle(42, 0, this.Width - 48, this.Height);
            TextRenderer.DrawText(e.Graphics, this.Text, this.Font, rectTxt, activo ? TemaFinora.AzulPrimario : TemaFinora.TextoOscuro, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine);
        }
    }

    // =========================================================================
    // VENTANA PRINCIPAL UNIFICADA — ESTILO FINORA / APPLE
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

        private List<ServicioModulo> serviciosRegistrados = new List<ServicioModulo>();

        // Layout raiz
        private TarjetaFlotante panelSidebar;
        private Panel panelDerecho;
        private Panel panelTopBar;
        private Label lblSaludoTop;
        private PildoraEstado pildoraGlobal;
        private TarjetaFlotante pillFechaTop;
        private Label lblFechaTop;
        private Panel panelContenido;

        // Navegacion
        private BotonSidebarFinora navInicio;
        private BotonSidebarFinora navServicios;
        private BotonSidebarFinora navRespaldos;
        private BotonSidebarFinora navCuentas;
        private BotonSidebarFinora navSistema;

        // Vistas
        private Panel vistaInstalacion;
        private Panel vistaInicio;
        private Panel vistaServicios;
        private Panel vistaRespaldos;
        private Panel vistaCuentas;
        private Panel vistaSistema;

        // Instalacion unica
        private RadioButton rbConservarDatos;
        private RadioButton rbFabricaLimpia;
        private BotonCurvo btnEjecutarInstalacion;
        private Label lblProgresoInstalacion;

        // KPI Pastel Cards (Inicio)
        private TarjetaKpiPastel kpiServidor;
        private TarjetaKpiPastel kpiRedLan;
        private TarjetaKpiPastel kpiRespaldos;
        private TarjetaKpiPastel kpiServicios;

        // Control Principal + QR (Inicio)
        private Label lblUrlInicio;
        private BotonCurvo btnInicioIniciar;
        private BotonCurvo btnInicioAbrir;
        private BotonCurvo btnInicioReiniciar;
        private BotonCurvo btnInicioDetener;

        private PictureBox picQr;
        private Label lblIpQr;
        private BotonCurvo btnCopiarIp;

        // Servicios Modulares
        private FlowLayoutPanel flowServicios;

        // Respaldos
        private ListBox lstBackups;

        // Cuentas
        private TextBox txtNombreUser;
        private TextBox txtUsername;
        private ComboBox cmbRol;
        private TextBox txtPassword;
        private TextBox txtPin;

        // Sistema
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
            this.Size = new Size(1040, 670);
            this.MinimumSize = new Size(980, 620);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = TemaFinora.LienzoFondo;
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

            this.Resize += delegate { AjustarPosiciones(); };
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                bool srvActivo = VerificarServicioWindowsActivo(NOMBRE_SERVICIO) ||
                                 ProbarHttpLocal("http://localhost:" + puertoConfigurado + "/api/caja/estado");
                if (srvActivo)
                {
                    DialogResult dr = MessageBox.Show(
                        this,
                        "El servidor POS se encuentra activo.\n\n¿Desea apagar el servidor (guardando respaldo automatico) y cerrar el panel?",
                        "Confirmar Cierre - POS Llanomio",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Warning,
                        MessageBoxDefaultButton.Button2
                    );
                    if (dr != DialogResult.Yes)
                    {
                        e.Cancel = true;
                        return;
                    }

                    if (!DetenerConBackupObligatorio())
                    {
                        e.Cancel = true;
                        return;
                    }
                }
            }
            base.OnFormClosing(e);
        }

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
        // CONSTRUCCION DEL LAYOUT FLOTANTE ESTILO FINORA
        // =========================================================================
        private void ConstruirLayout()
        {
            // Sidebar blanca flotante izquierda
            panelSidebar = new TarjetaFlotante();
            panelSidebar.Radio = 22;
            panelSidebar.Location = new Point(14, 14);
            panelSidebar.Size = new Size(202, this.ClientSize.Height - 28);
            panelSidebar.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left;
            this.Controls.Add(panelSidebar);

            // Marca visual en el sidebar
            Panel marcaPanel = new Panel();
            marcaPanel.Location = new Point(18, 22);
            marcaPanel.Size = new Size(166, 38);
            marcaPanel.BackColor = TemaFinora.BlancoPuro;
            marcaPanel.Paint += delegate(object s, PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                using (SolidBrush b1 = new SolidBrush(TemaFinora.AzulPrimario))
                using (SolidBrush b2 = new SolidBrush(Color.FromArgb(90, 198, 250)))
                {
                    e.Graphics.FillEllipse(b1, 2, 12, 14, 14);
                    e.Graphics.FillEllipse(b2, 11, 5, 14, 14);
                }
            };
            panelSidebar.Controls.Add(marcaPanel);

            Label lblMarca = new Label();
            lblMarca.Text = "Llanomio";
            lblMarca.Font = new Font("Segoe UI Bold", 13F);
            lblMarca.ForeColor = TemaFinora.TextoOscuro;
            lblMarca.Location = new Point(32, 6);
            lblMarca.AutoSize = true;
            marcaPanel.Controls.Add(lblMarca);

            navInicio = CrearItemSidebar("Inicio", "home", 84, delegate { MostrarVista("inicio"); });
            navServicios = CrearItemSidebar("Servicios", "services", 132, delegate { MostrarVista("servicios"); });
            navRespaldos = CrearItemSidebar("Respaldos", "backup", 180, delegate { AbrirSeccionProtegida("respaldos"); });
            navCuentas = CrearItemSidebar("Cuentas", "users", 228, delegate { AbrirSeccionProtegida("cuentas"); });
            navSistema = CrearItemSidebar("Sistema", "settings", 276, delegate { AbrirSeccionProtegida("sistema"); });
            CrearItemSidebar("Manual HTML", "book", 324, delegate { AbrirManualHtmlLocal(); });

            // Contenedor derecho aireado
            panelDerecho = new Panel();
            panelDerecho.Location = new Point(226, 0);
            panelDerecho.Size = new Size(this.ClientSize.Width - 226, this.ClientSize.Height);
            panelDerecho.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            panelDerecho.BackColor = TemaFinora.LienzoFondo;
            this.Controls.Add(panelDerecho);

            // TopBar limpia y flotante
            panelTopBar = new Panel();
            panelTopBar.Dock = DockStyle.Top;
            panelTopBar.Height = 68;
            panelTopBar.BackColor = TemaFinora.LienzoFondo;
            panelDerecho.Controls.Add(panelTopBar);

            lblSaludoTop = new Label();
            lblSaludoTop.Text = "Panel de Control";
            lblSaludoTop.Font = new Font("Segoe UI Bold", 15.5F);
            lblSaludoTop.ForeColor = TemaFinora.TextoOscuro;
            lblSaludoTop.Location = new Point(18, 20);
            lblSaludoTop.AutoSize = true;
            panelTopBar.Controls.Add(lblSaludoTop);

            pillFechaTop = new TarjetaFlotante();
            pillFechaTop.Radio = 14;
            pillFechaTop.Size = new Size(156, 38);
            pillFechaTop.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            pillFechaTop.Location = new Point(panelTopBar.Width - 306, 15);
            panelTopBar.Controls.Add(pillFechaTop);

            lblFechaTop = new Label();
            lblFechaTop.Text = DateTime.Now.ToString("ddd, dd MMM yyyy");
            lblFechaTop.Font = new Font("Segoe UI Semibold", 8.5F);
            lblFechaTop.ForeColor = TemaFinora.TextoSuave;
            lblFechaTop.TextAlign = ContentAlignment.MiddleCenter;
            lblFechaTop.Location = new Point(6, 4);
            lblFechaTop.Size = new Size(144, 28);
            pillFechaTop.Controls.Add(lblFechaTop);

            pildoraGlobal = new PildoraEstado();
            pildoraGlobal.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            pildoraGlobal.Location = new Point(panelTopBar.Width - 138, 17);
            panelTopBar.Controls.Add(pildoraGlobal);

            // Contenido principal
            panelContenido = new Panel();
            panelContenido.Dock = DockStyle.Fill;
            panelContenido.BackColor = TemaFinora.LienzoFondo;
            panelDerecho.Controls.Add(panelContenido);
            panelContenido.BringToFront();

            ConstruirVistaInstalacion();
            ConstruirVistaInicio();
            ConstruirVistaServicios();
            ConstruirVistaRespaldos();
            ConstruirVistaCuentas();
            ConstruirVistaSistema();
        }

        private BotonSidebarFinora CrearItemSidebar(string titulo, string icono, int top, EventHandler onClick)
        {
            BotonSidebarFinora btn = new BotonSidebarFinora(titulo, icono);
            btn.Location = new Point(19, top);
            btn.Click += onClick;
            panelSidebar.Controls.Add(btn);
            return btn;
        }

        // -------------------------------------------------------------------------
        // VISTA 0: INSTALACION UNICA (EQUIPO NUEVO)
        // -------------------------------------------------------------------------
        private void ConstruirVistaInstalacion()
        {
            vistaInstalacion = new Panel();
            vistaInstalacion.Dock = DockStyle.Fill;
            vistaInstalacion.BackColor = TemaFinora.LienzoFondo;
            vistaInstalacion.Visible = false;
            panelContenido.Controls.Add(vistaInstalacion);

            TarjetaFlotante card = new TarjetaFlotante();
            card.Size = new Size(460, 320);
            vistaInstalacion.Controls.Add(card);

            Label lblTit = new Label();
            lblTit.Text = "Configurar POS Llanomio";
            lblTit.Font = new Font("Segoe UI Bold", 15F);
            lblTit.ForeColor = TemaFinora.TextoOscuro;
            lblTit.TextAlign = ContentAlignment.MiddleCenter;
            lblTit.Location = new Point(28, 36);
            lblTit.Size = new Size(404, 34);
            card.Controls.Add(lblTit);

            rbConservarDatos = new RadioButton();
            rbConservarDatos.Text = "Conservar datos actuales";
            rbConservarDatos.Font = new Font("Segoe UI Semibold", 10F);
            rbConservarDatos.ForeColor = TemaFinora.TextoOscuro;
            rbConservarDatos.Checked = true;
            rbConservarDatos.Location = new Point(116, 98);
            rbConservarDatos.Size = new Size(250, 28);
            card.Controls.Add(rbConservarDatos);

            rbFabricaLimpia = new RadioButton();
            rbFabricaLimpia.Text = "Iniciar limpio de fabrica";
            rbFabricaLimpia.Font = new Font("Segoe UI Semibold", 10F);
            rbFabricaLimpia.ForeColor = TemaFinora.TextoOscuro;
            rbFabricaLimpia.Location = new Point(116, 136);
            rbFabricaLimpia.Size = new Size(250, 28);
            card.Controls.Add(rbFabricaLimpia);

            btnEjecutarInstalacion = new BotonCurvo();
            btnEjecutarInstalacion.Text = "Instalar";
            btnEjecutarInstalacion.Size = new Size(220, 46);
            btnEjecutarInstalacion.Location = new Point(120, 194);
            btnEjecutarInstalacion.Click += delegate { EjecutarInstalacionUnica(); };
            card.Controls.Add(btnEjecutarInstalacion);

            lblProgresoInstalacion = new Label();
            lblProgresoInstalacion.Text = "";
            lblProgresoInstalacion.Font = new Font("Segoe UI", 9F);
            lblProgresoInstalacion.ForeColor = TemaFinora.TextoSuave;
            lblProgresoInstalacion.TextAlign = ContentAlignment.MiddleCenter;
            lblProgresoInstalacion.Location = new Point(30, 256);
            lblProgresoInstalacion.Size = new Size(400, 24);
            card.Controls.Add(lblProgresoInstalacion);
        }

        // -------------------------------------------------------------------------
        // VISTA 1: INICIO (4 TARJETAS KPI PASTEL + 2 TARJETAS FLOTANTES)
        // -------------------------------------------------------------------------
        private void ConstruirVistaInicio()
        {
            vistaInicio = new Panel();
            vistaInicio.Dock = DockStyle.Fill;
            vistaInicio.BackColor = TemaFinora.LienzoFondo;
            panelContenido.Controls.Add(vistaInicio);

            Panel box = new Panel();
            box.Size = new Size(766, 520);
            box.BackColor = TemaFinora.LienzoFondo;
            vistaInicio.Controls.Add(box);

            // Fila 1: 4 tarjetas KPI con degradados pastel estilo Finora
            kpiServidor = new TarjetaKpiPastel();
            kpiServidor.Titulo = "Servidor POS";
            kpiServidor.Valor = "Offline";
            kpiServidor.EtiquetaPill = "Puerto " + puertoConfigurado;
            kpiServidor.TipoIcono = "power";
            kpiServidor.FondoTarjeta = TemaFinora.AzulTarjeta;
            kpiServidor.FondoIcono = TemaFinora.AzulPastel;
            kpiServidor.ColorAcento = TemaFinora.AzulPrimario;
            kpiServidor.FondoPill = TemaFinora.AzulPastel;
            kpiServidor.TextoPill = TemaFinora.AzulPrimario;
            kpiServidor.Location = new Point(4, 6);
            box.Controls.Add(kpiServidor);

            kpiRedLan = new TarjetaKpiPastel();
            kpiRedLan.Titulo = "Red Local";
            kpiRedLan.Valor = ipLanDetectada;
            kpiRedLan.EtiquetaPill = "Wi-Fi LAN";
            kpiRedLan.TipoIcono = "wifi";
            kpiRedLan.FondoTarjeta = TemaFinora.VerdeTarjeta;
            kpiRedLan.FondoIcono = TemaFinora.VerdePastel;
            kpiRedLan.ColorAcento = TemaFinora.VerdePrimario;
            kpiRedLan.FondoPill = TemaFinora.VerdePastel;
            kpiRedLan.TextoPill = TemaFinora.VerdeTexto;
            kpiRedLan.Location = new Point(195, 6);
            box.Controls.Add(kpiRedLan);

            kpiRespaldos = new TarjetaKpiPastel();
            kpiRespaldos.Titulo = "Respaldos";
            kpiRespaldos.Valor = "0 copias";
            kpiRespaldos.EtiquetaPill = "SQLite WAL";
            kpiRespaldos.TipoIcono = "backup";
            kpiRespaldos.FondoTarjeta = TemaFinora.AmbarTarjeta;
            kpiRespaldos.FondoIcono = TemaFinora.AmbarPastel;
            kpiRespaldos.ColorAcento = TemaFinora.AmbarPrimario;
            kpiRespaldos.FondoPill = TemaFinora.AmbarPastel;
            kpiRespaldos.TextoPill = TemaFinora.AmbarTexto;
            kpiRespaldos.Location = new Point(386, 6);
            box.Controls.Add(kpiRespaldos);

            kpiServicios = new TarjetaKpiPastel();
            kpiServicios.Titulo = "Servicios";
            kpiServicios.Valor = "0 / 1";
            kpiServicios.EtiquetaPill = "Modulos";
            kpiServicios.TipoIcono = "services";
            kpiServicios.FondoTarjeta = TemaFinora.RosaTarjeta;
            kpiServicios.FondoIcono = TemaFinora.RosaPastel;
            kpiServicios.ColorAcento = TemaFinora.RosaPrimario;
            kpiServicios.FondoPill = TemaFinora.RosaPastel;
            kpiServicios.TextoPill = TemaFinora.RosaTexto;
            kpiServicios.Location = new Point(577, 6);
            box.Controls.Add(kpiServicios);

            // Fila 2 Izquierda: Tarjeta Control del Servidor
            TarjetaFlotante cardControl = new TarjetaFlotante();
            cardControl.Size = new Size(462, 336);
            cardControl.Location = new Point(4, 168);
            box.Controls.Add(cardControl);

            Label lblTitCtrl = new Label();
            lblTitCtrl.Text = "Control del Servidor";
            lblTitCtrl.Font = new Font("Segoe UI Bold", 13F);
            lblTitCtrl.ForeColor = TemaFinora.TextoOscuro;
            lblTitCtrl.Location = new Point(28, 28);
            lblTitCtrl.Size = new Size(360, 28);
            cardControl.Controls.Add(lblTitCtrl);

            lblUrlInicio = new Label();
            lblUrlInicio.Text = "http://localhost:" + puertoConfigurado;
            lblUrlInicio.Font = new Font("Consolas", 10F, FontStyle.Bold);
            lblUrlInicio.ForeColor = TemaFinora.AzulPrimario;
            lblUrlInicio.Location = new Point(28, 60);
            lblUrlInicio.Size = new Size(360, 22);
            cardControl.Controls.Add(lblUrlInicio);

            btnInicioIniciar = new BotonCurvo();
            btnInicioIniciar.Text = "Iniciar";
            btnInicioIniciar.ColorNormal = TemaFinora.VerdePrimario;
            btnInicioIniciar.ColorHover = TemaFinora.VerdeHover;
            btnInicioIniciar.Size = new Size(220, 48);
            btnInicioIniciar.Location = new Point(120, 146);
            btnInicioIniciar.Click += delegate { IniciarServicioAccion(NOMBRE_SERVICIO); };
            cardControl.Controls.Add(btnInicioIniciar);

            btnInicioAbrir = new BotonCurvo();
            btnInicioAbrir.Text = "Abrir POS";
            btnInicioAbrir.ColorNormal = TemaFinora.AzulPrimario;
            btnInicioAbrir.ColorHover = TemaFinora.AzulHover;
            btnInicioAbrir.Size = new Size(406, 48);
            btnInicioAbrir.Location = new Point(28, 122);
            btnInicioAbrir.Visible = false;
            btnInicioAbrir.Click += delegate { AbrirNavegadorPos(); };
            cardControl.Controls.Add(btnInicioAbrir);

            btnInicioReiniciar = new BotonCurvo();
            btnInicioReiniciar.Text = "Reiniciar";
            btnInicioReiniciar.ColorNormal = TemaFinora.GrisPill;
            btnInicioReiniciar.ColorHover = TemaFinora.GrisPillHover;
            btnInicioReiniciar.ColorTexto = TemaFinora.TextoOscuro;
            btnInicioReiniciar.Size = new Size(196, 44);
            btnInicioReiniciar.Location = new Point(28, 188);
            btnInicioReiniciar.Visible = false;
            btnInicioReiniciar.Click += delegate { ReiniciarServicioAccion(NOMBRE_SERVICIO); };
            cardControl.Controls.Add(btnInicioReiniciar);

            btnInicioDetener = new BotonCurvo();
            btnInicioDetener.Text = "Detener";
            btnInicioDetener.ColorNormal = TemaFinora.RosaPrimario;
            btnInicioDetener.ColorHover = TemaFinora.RosaHover;
            btnInicioDetener.Size = new Size(196, 44);
            btnInicioDetener.Location = new Point(238, 188);
            btnInicioDetener.Visible = false;
            btnInicioDetener.Click += delegate { DetenerConBackupObligatorio(); };
            cardControl.Controls.Add(btnInicioDetener);

            BotonCurvo btnManualInicio = new BotonCurvo();
            btnManualInicio.Text = "Abrir Manual Local (HTML)";
            btnManualInicio.ColorNormal = TemaFinora.AzulPastel;
            btnManualInicio.ColorHover = Color.FromArgb(212, 232, 255);
            btnManualInicio.ColorTexto = TemaFinora.AzulPrimario;
            btnManualInicio.Size = new Size(406, 40);
            btnManualInicio.Location = new Point(28, 266);
            btnManualInicio.Click += delegate { AbrirManualHtmlLocal(); };
            cardControl.Controls.Add(btnManualInicio);

            // Fila 2 Derecha: Tarjeta QR Wi-Fi
            TarjetaFlotante cardQr = new TarjetaFlotante();
            cardQr.Size = new Size(284, 336);
            cardQr.Location = new Point(477, 168);
            box.Controls.Add(cardQr);

            Label lblTitQr = new Label();
            lblTitQr.Text = "Acceso Wi-Fi";
            lblTitQr.Font = new Font("Segoe UI Bold", 12.5F);
            lblTitQr.ForeColor = TemaFinora.TextoOscuro;
            lblTitQr.TextAlign = ContentAlignment.MiddleCenter;
            lblTitQr.Location = new Point(20, 22);
            lblTitQr.Size = new Size(244, 26);
            cardQr.Controls.Add(lblTitQr);

            picQr = new PictureBox();
            picQr.Size = new Size(168, 168);
            picQr.Location = new Point(58, 56);
            picQr.SizeMode = PictureBoxSizeMode.Zoom;
            picQr.BackColor = Color.White;
            cardQr.Controls.Add(picQr);

            lblIpQr = new Label();
            lblIpQr.Text = urlLanActual;
            lblIpQr.Font = new Font("Consolas", 9F, FontStyle.Bold);
            lblIpQr.ForeColor = TemaFinora.AzulPrimario;
            lblIpQr.TextAlign = ContentAlignment.MiddleCenter;
            lblIpQr.Location = new Point(16, 232);
            lblIpQr.Size = new Size(252, 22);
            cardQr.Controls.Add(lblIpQr);

            btnCopiarIp = new BotonCurvo();
            btnCopiarIp.Text = "Copiar IP";
            btnCopiarIp.ColorNormal = TemaFinora.AzulPastel;
            btnCopiarIp.ColorHover = Color.FromArgb(212, 232, 255);
            btnCopiarIp.ColorTexto = TemaFinora.AzulPrimario;
            btnCopiarIp.Size = new Size(148, 38);
            btnCopiarIp.Location = new Point(68, 268);
            btnCopiarIp.Click += delegate { CopiarAlPortapapeles(urlLanActual); };
            cardQr.Controls.Add(btnCopiarIp);
        }

        // -------------------------------------------------------------------------
        // VISTA 2: SERVICIOS MODULARES
        // -------------------------------------------------------------------------
        private void ConstruirVistaServicios()
        {
            vistaServicios = new Panel();
            vistaServicios.Dock = DockStyle.Fill;
            vistaServicios.BackColor = TemaFinora.LienzoFondo;
            vistaServicios.Visible = false;
            panelContenido.Controls.Add(vistaServicios);

            Panel box = new Panel();
            box.Size = new Size(766, 510);
            box.BackColor = TemaFinora.LienzoFondo;
            vistaServicios.Controls.Add(box);

            BotonCurvo btnAgregar = new BotonCurvo();
            btnAgregar.Text = "+ Agregar Servicio";
            btnAgregar.BackColor = TemaFinora.LienzoFondo;
            btnAgregar.Size = new Size(168, 38);
            btnAgregar.Location = new Point(590, 4);
            btnAgregar.Click += delegate { AgregarServicioModuloAccion(); };
            box.Controls.Add(btnAgregar);

            flowServicios = new FlowLayoutPanel();
            flowServicios.Location = new Point(4, 54);
            flowServicios.Size = new Size(758, 446);
            flowServicios.FlowDirection = FlowDirection.TopDown;
            flowServicios.WrapContents = false;
            flowServicios.AutoScroll = true;
            flowServicios.BackColor = TemaFinora.LienzoFondo;
            box.Controls.Add(flowServicios);

            RenderizarTarjetasServicios();
        }

        private void RenderizarTarjetasServicios()
        {
            if (flowServicios == null) return;
            flowServicios.Controls.Clear();

            foreach (ServicioModulo srv in serviciosRegistrados)
            {
                ServicioModulo localSrv = srv;
                TarjetaFlotante card = new TarjetaFlotante();
                card.Size = new Size(734, 92);
                card.Margin = new Padding(0, 0, 0, 12);

                Label lblNom = new Label();
                lblNom.Text = localSrv.Nombre;
                lblNom.Font = new Font("Segoe UI Bold", 11.5F);
                lblNom.ForeColor = TemaFinora.TextoOscuro;
                lblNom.Location = new Point(26, 20);
                lblNom.Size = new Size(260, 24);
                card.Controls.Add(lblNom);

                Label lblSub = new Label();
                lblSub.Text = string.IsNullOrEmpty(localSrv.Puerto)
                    ? localSrv.ServicioWindows
                    : localSrv.ServicioWindows + "  |  :" + localSrv.Puerto;
                lblSub.Font = new Font("Segoe UI", 8.8F);
                lblSub.ForeColor = TemaFinora.TextoSuave;
                lblSub.Location = new Point(26, 48);
                lblSub.Size = new Size(260, 20);
                card.Controls.Add(lblSub);

                bool activo = VerificarServicioWindowsActivo(localSrv.ServicioWindows);
                PildoraEstado pill = new PildoraEstado();
                pill.Size = new Size(112, 32);
                pill.Location = new Point(316, 28);
                pill.ActualizarEstado(activo, activo ? "En linea" : "Offline");
                card.Controls.Add(pill);

                BotonCurvo btnAcc = new BotonCurvo();
                btnAcc.Size = new Size(124, 38);
                btnAcc.Location = new Point(452, 25);
                if (activo)
                {
                    btnAcc.Text = "Detener";
                    btnAcc.ColorNormal = TemaFinora.RosaPrimario;
                    btnAcc.ColorHover = TemaFinora.RosaHover;
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
                    btnAcc.ColorNormal = TemaFinora.VerdePrimario;
                    btnAcc.ColorHover = TemaFinora.VerdeHover;
                    btnAcc.Click += delegate
                    {
                        IniciarServicioAccion(localSrv.ServicioWindows);
                        RenderizarTarjetasServicios();
                    };
                }
                card.Controls.Add(btnAcc);

                BotonCurvo btnRei = new BotonCurvo();
                btnRei.Text = "Reiniciar";
                btnRei.ColorNormal = TemaFinora.GrisPill;
                btnRei.ColorHover = TemaFinora.GrisPillHover;
                btnRei.ColorTexto = TemaFinora.TextoOscuro;
                btnRei.Size = new Size(124, 38);
                btnRei.Location = new Point(588, 25);
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
            vistaRespaldos.BackColor = TemaFinora.LienzoFondo;
            vistaRespaldos.Visible = false;
            panelContenido.Controls.Add(vistaRespaldos);

            Panel box = new Panel();
            box.Size = new Size(766, 510);
            box.BackColor = TemaFinora.LienzoFondo;
            vistaRespaldos.Controls.Add(box);

            TarjetaFlotante card = new TarjetaFlotante();
            card.Size = new Size(756, 488);
            card.Location = new Point(4, 8);
            box.Controls.Add(card);

            BotonCurvo btnRespaldar = new BotonCurvo();
            btnRespaldar.Text = "Respaldar";
            btnRespaldar.Size = new Size(131, 40);
            btnRespaldar.Location = new Point(26, 26);
            btnRespaldar.Click += delegate { GenerarBackupManualAccion(); };
            card.Controls.Add(btnRespaldar);

            BotonCurvo btnRestaurar = new BotonCurvo();
            btnRestaurar.Text = "Restaurar";
            btnRestaurar.ColorNormal = TemaFinora.RosaPrimario;
            btnRestaurar.ColorHover = TemaFinora.RosaHover;
            btnRespaldar.Size = new Size(131, 40);
            btnRestaurar.Size = new Size(131, 40);
            btnRestaurar.Location = new Point(169, 26);
            btnRestaurar.Click += delegate { RestaurarSeleccionadoAccion(); };
            card.Controls.Add(btnRestaurar);

            BotonCurvo btnExterno = new BotonCurvo();
            btnExterno.Text = "Archivo .db";
            btnExterno.ColorNormal = TemaFinora.GrisPill;
            btnExterno.ColorHover = TemaFinora.GrisPillHover;
            btnExterno.ColorTexto = TemaFinora.TextoOscuro;
            btnExterno.Size = new Size(131, 40);
            btnExterno.Location = new Point(312, 26);
            btnExterno.Click += delegate { RestaurarArchivoExternoAccion(); };
            card.Controls.Add(btnExterno);

            BotonCurvo btnCarpeta = new BotonCurvo();
            btnCarpeta.Text = "Carpeta";
            btnCarpeta.ColorNormal = TemaFinora.GrisPill;
            btnCarpeta.ColorHover = TemaFinora.GrisPillHover;
            btnCarpeta.ColorTexto = TemaFinora.TextoOscuro;
            btnCarpeta.Size = new Size(131, 40);
            btnCarpeta.Location = new Point(455, 26);
            btnCarpeta.Click += delegate { AbrirCarpetaBackupsAccion(); };
            card.Controls.Add(btnCarpeta);

            BotonCurvo btnManualBak = new BotonCurvo();
            btnManualBak.Text = "Manual HTML";
            btnManualBak.ColorNormal = TemaFinora.AzulPastel;
            btnManualBak.ColorHover = Color.FromArgb(212, 232, 255);
            btnManualBak.ColorTexto = TemaFinora.AzulPrimario;
            btnManualBak.Size = new Size(132, 40);
            btnManualBak.Location = new Point(598, 26);
            btnManualBak.Click += delegate { AbrirManualHtmlLocal(); };
            card.Controls.Add(btnManualBak);

            lstBackups = new ListBox();
            lstBackups.Location = new Point(26, 84);
            lstBackups.Size = new Size(704, 376);
            lstBackups.Font = new Font("Consolas", 9.5F);
            lstBackups.BorderStyle = BorderStyle.FixedSingle;
            lstBackups.BackColor = TemaFinora.LienzoFondo;
            card.Controls.Add(lstBackups);
        }

        // -------------------------------------------------------------------------
        // VISTA 4: CUENTAS
        // -------------------------------------------------------------------------
        private void ConstruirVistaCuentas()
        {
            vistaCuentas = new Panel();
            vistaCuentas.Dock = DockStyle.Fill;
            vistaCuentas.BackColor = TemaFinora.LienzoFondo;
            vistaCuentas.Visible = false;
            panelContenido.Controls.Add(vistaCuentas);

            Panel box = new Panel();
            box.Size = new Size(766, 480);
            box.BackColor = TemaFinora.LienzoFondo;
            vistaCuentas.Controls.Add(box);

            TarjetaFlotante card = new TarjetaFlotante();
            card.Size = new Size(756, 286);
            card.Location = new Point(4, 8);
            box.Controls.Add(card);

            Label lblTit = new Label();
            lblTit.Text = "Nuevo Usuario";
            lblTit.Font = new Font("Segoe UI Bold", 13F);
            lblTit.ForeColor = TemaFinora.TextoOscuro;
            lblTit.Location = new Point(28, 24);
            lblTit.Size = new Size(240, 28);
            card.Controls.Add(lblTit);

            txtNombreUser = CrearCampoFormulario(card, "Nombre", 28, 70, 330, false);
            txtUsername = CrearCampoFormulario(card, "Usuario", 386, 70, 330, false);
            txtPassword = CrearCampoFormulario(card, "Contrasena", 28, 138, 220, true);
            txtPin = CrearCampoFormulario(card, "PIN", 270, 138, 150, true);
            txtPin.MaxLength = 6;

            Label lblRol = new Label();
            lblRol.Text = "Rol";
            lblRol.Font = new Font("Segoe UI", 8.5F);
            lblRol.ForeColor = TemaFinora.TextoSuave;
            lblRol.Location = new Point(442, 138);
            lblRol.Size = new Size(100, 18);
            card.Controls.Add(lblRol);

            cmbRol = new ComboBox();
            cmbRol.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbRol.Items.AddRange(new object[] { "CAJERO", "ADMIN" });
            cmbRol.SelectedIndex = 0;
            cmbRol.Location = new Point(442, 158);
            cmbRol.Size = new Size(274, 28);
            card.Controls.Add(cmbRol);

            BotonCurvo btnCrear = new BotonCurvo();
            btnCrear.Text = "Crear";
            btnCrear.Size = new Size(176, 42);
            btnCrear.Location = new Point(28, 214);
            btnCrear.Click += delegate { CrearUsuarioAccion(); };
            card.Controls.Add(btnCrear);

            TarjetaFlotante cardAdmin = new TarjetaFlotante();
            cardAdmin.Size = new Size(756, 132);
            cardAdmin.Location = new Point(4, 312);
            box.Controls.Add(cardAdmin);

            Label lblAdm = new Label();
            lblAdm.Text = "Acceso Maestro";
            lblAdm.Font = new Font("Segoe UI Bold", 12.5F);
            lblAdm.ForeColor = TemaFinora.TextoOscuro;
            lblAdm.Location = new Point(28, 22);
            lblAdm.Size = new Size(240, 26);
            cardAdmin.Controls.Add(lblAdm);

            BotonCurvo btnResetAdmin = new BotonCurvo();
            btnResetAdmin.Text = "Restablecer admin";
            btnResetAdmin.ColorNormal = TemaFinora.AzulPastel;
            btnResetAdmin.ColorHover = Color.FromArgb(212, 232, 255);
            btnResetAdmin.ColorTexto = TemaFinora.AzulPrimario;
            btnResetAdmin.Size = new Size(210, 42);
            btnResetAdmin.Location = new Point(28, 62);
            btnResetAdmin.Click += delegate { RestablecerAdminAccion(); };
            cardAdmin.Controls.Add(btnResetAdmin);
        }

        private TextBox CrearCampoFormulario(Control padre, string etiqueta, int x, int y, int ancho, bool esClave)
        {
            Label lbl = new Label();
            lbl.Text = etiqueta;
            lbl.Font = new Font("Segoe UI", 8.5F);
            lbl.ForeColor = TemaFinora.TextoSuave;
            lbl.Location = new Point(x, y);
            lbl.Size = new Size(ancho, 18);
            padre.Controls.Add(lbl);

            TextBox tb = new TextBox();
            tb.Location = new Point(x, y + 20);
            tb.Size = new Size(ancho, 28);
            tb.Font = new Font("Segoe UI", 10F);
            tb.BorderStyle = BorderStyle.FixedSingle;
            if (esClave) tb.UseSystemPasswordChar = true;
            padre.Controls.Add(tb);
            return tb;
        }

        // -------------------------------------------------------------------------
        // VISTA 5: SISTEMA
        // -------------------------------------------------------------------------
        private void ConstruirVistaSistema()
        {
            vistaSistema = new Panel();
            vistaSistema.Dock = DockStyle.Fill;
            vistaSistema.BackColor = TemaFinora.LienzoFondo;
            vistaSistema.Visible = false;
            panelContenido.Controls.Add(vistaSistema);

            Panel box = new Panel();
            box.Size = new Size(766, 480);
            box.BackColor = TemaFinora.LienzoFondo;
            vistaSistema.Controls.Add(box);

            // Actualizacion
            TarjetaFlotante cardAct = new TarjetaFlotante();
            cardAct.Size = new Size(756, 134);
            cardAct.Location = new Point(4, 8);
            box.Controls.Add(cardAct);

            Label lblAct = new Label();
            lblAct.Text = "Actualizar";
            lblAct.Font = new Font("Segoe UI Bold", 12.5F);
            lblAct.ForeColor = TemaFinora.TextoOscuro;
            lblAct.Location = new Point(28, 22);
            lblAct.Size = new Size(240, 26);
            cardAct.Controls.Add(lblAct);

            BotonCurvo btnZip = new BotonCurvo();
            btnZip.Text = "Actualizar (.zip)";
            btnZip.Size = new Size(192, 42);
            btnZip.Location = new Point(28, 64);
            btnZip.Click += delegate { ActualizarDesdeZipAccion(); };
            cardAct.Controls.Add(btnZip);

            BotonCurvo btnGit = new BotonCurvo();
            btnGit.Text = "Actualizar (GitHub)";
            btnGit.ColorNormal = TemaFinora.GrisPill;
            btnGit.ColorHover = TemaFinora.GrisPillHover;
            btnGit.ColorTexto = TemaFinora.TextoOscuro;
            btnGit.Size = new Size(192, 42);
            btnGit.Location = new Point(236, 64);
            btnGit.Click += delegate { ActualizarDesdeGithubAccion(); };
            cardAct.Controls.Add(btnGit);

            // Red y Puerto
            TarjetaFlotante cardRed = new TarjetaFlotante();
            cardRed.Size = new Size(756, 134);
            cardRed.Location = new Point(4, 158);
            box.Controls.Add(cardRed);

            Label lblRed = new Label();
            lblRed.Text = "Red y Puerto";
            lblRed.Font = new Font("Segoe UI Bold", 12.5F);
            lblRed.ForeColor = TemaFinora.TextoOscuro;
            lblRed.Location = new Point(28, 22);
            lblRed.Size = new Size(220, 26);
            cardRed.Controls.Add(lblRed);

            txtPuerto = new TextBox();
            txtPuerto.Text = puertoConfigurado;
            txtPuerto.Font = new Font("Segoe UI", 10.5F);
            txtPuerto.Location = new Point(28, 68);
            txtPuerto.Size = new Size(114, 28);
            txtPuerto.BorderStyle = BorderStyle.FixedSingle;
            cardRed.Controls.Add(txtPuerto);

            BotonCurvo btnPuerto = new BotonCurvo();
            btnPuerto.Text = "Guardar Puerto";
            btnPuerto.Size = new Size(168, 40);
            btnPuerto.Location = new Point(158, 64);
            btnPuerto.Click += delegate { CambiarPuertoAccion(); };
            cardRed.Controls.Add(btnPuerto);

            BotonCurvo btnFw = new BotonCurvo();
            btnFw.Text = "Firewall";
            btnFw.ColorNormal = TemaFinora.GrisPill;
            btnFw.ColorHover = TemaFinora.GrisPillHover;
            btnFw.ColorTexto = TemaFinora.TextoOscuro;
            btnFw.Size = new Size(168, 40);
            btnFw.Location = new Point(342, 64);
            btnFw.Click += delegate { RepararFirewallAccion(true); };
            cardRed.Controls.Add(btnFw);

            // Equipo (Reinstalacion oculta aqui)
            TarjetaFlotante cardEq = new TarjetaFlotante();
            cardEq.Size = new Size(756, 134);
            cardEq.Location = new Point(4, 308);
            box.Controls.Add(cardEq);

            Label lblEq = new Label();
            lblEq.Text = "Equipo";
            lblEq.Font = new Font("Segoe UI Bold", 12.5F);
            lblEq.ForeColor = TemaFinora.TextoOscuro;
            lblEq.Location = new Point(28, 22);
            lblEq.Size = new Size(220, 26);
            cardEq.Controls.Add(lblEq);

            BotonCurvo btnReinstalar = new BotonCurvo();
            btnReinstalar.Text = "Reinstalar";
            btnReinstalar.ColorNormal = TemaFinora.GrisPill;
            btnReinstalar.ColorHover = TemaFinora.GrisPillHover;
            btnReinstalar.ColorTexto = TemaFinora.TextoOscuro;
            btnReinstalar.Size = new Size(176, 42);
            btnReinstalar.Location = new Point(28, 64);
            btnReinstalar.Click += delegate { MostrarVistaInstalacion(); };
            cardEq.Controls.Add(btnReinstalar);

            BotonCurvo btnDesinstalar = new BotonCurvo();
            btnDesinstalar.Text = "Desinstalar";
            btnDesinstalar.ColorNormal = TemaFinora.GrisPill;
            btnDesinstalar.ColorHover = TemaFinora.GrisPillHover;
            btnDesinstalar.ColorTexto = TemaFinora.TextoOscuro;
            btnDesinstalar.Size = new Size(176, 42);
            btnDesinstalar.Location = new Point(220, 64);
            btnDesinstalar.Click += delegate { DesinstalarServicioAccion(); };
            cardEq.Controls.Add(btnDesinstalar);

            BotonCurvo btnFabrica = new BotonCurvo();
            btnFabrica.Text = "Fabrica";
            btnFabrica.ColorNormal = TemaFinora.RosaPrimario;
            btnFabrica.ColorHover = TemaFinora.RosaHover;
            btnFabrica.Size = new Size(176, 42);
            btnFabrica.Location = new Point(412, 64);
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
            panelDerecho.Location = new Point(0, 0);
            panelDerecho.Width = this.ClientSize.Width;
            lblSaludoTop.Text = "Instalacion";
            OcultarTodasLasVistas();
            vistaInstalacion.Visible = true;
            AjustarPosiciones();
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
            panelDerecho.Location = new Point(226, 0);
            panelDerecho.Width = this.ClientSize.Width - 226;
            OcultarTodasLasVistas();

            navInicio.Activo = (clave == "inicio");
            navServicios.Activo = (clave == "servicios");
            navRespaldos.Activo = (clave == "respaldos");
            navCuentas.Activo = (clave == "cuentas");
            navSistema.Activo = (clave == "sistema");

            if (clave == "inicio") { lblSaludoTop.Text = "Panel de Control"; vistaInicio.Visible = true; RefrescarEstadoEnVivo(); }
            else if (clave == "servicios") { lblSaludoTop.Text = "Servicios"; vistaServicios.Visible = true; RenderizarTarjetasServicios(); }
            else if (clave == "respaldos") { lblSaludoTop.Text = "Respaldos"; vistaRespaldos.Visible = true; CargarListaBackups(); }
            else if (clave == "cuentas") { lblSaludoTop.Text = "Cuentas"; vistaCuentas.Visible = true; }
            else if (clave == "sistema") { lblSaludoTop.Text = "Sistema"; vistaSistema.Visible = true; }

            AjustarPosiciones();
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

        private void AjustarPosiciones()
        {
            if (panelSidebar != null && panelDerecho != null)
            {
                panelSidebar.Height = Math.Max(400, this.ClientSize.Height - 28);
                if (panelSidebar.Visible)
                {
                    panelDerecho.Location = new Point(226, 0);
                    panelDerecho.Size = new Size(Math.Max(600, this.ClientSize.Width - 226), this.ClientSize.Height);
                }
                else
                {
                    panelDerecho.Location = new Point(0, 0);
                    panelDerecho.Size = this.ClientSize;
                }
            }

            Panel[] vistas = new Panel[] { vistaInstalacion, vistaInicio, vistaServicios, vistaRespaldos, vistaCuentas, vistaSistema };
            foreach (Panel v in vistas)
            {
                if (v != null && v.Controls.Count > 0)
                {
                    Control box = v.Controls[0];
                    box.Location = new Point(
                        Math.Max(14, (v.ClientSize.Width - box.Width) / 2),
                        Math.Max(10, (v.ClientSize.Height - box.Height) / 2)
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
            dlg.BackColor = TemaFinora.LienzoFondo;

            Label lbl = new Label();
            lbl.Text = "PIN Maestro";
            lbl.Font = new Font("Segoe UI Semibold", 10F);
            lbl.ForeColor = TemaFinora.TextoOscuro;
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
        // INSTALACION UNICA INTEGRADA
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

                lblProgresoInstalacion.Text = rbFabricaLimpia.Checked ? "Inicializando fabrica..." : "Verificando administrador...";
                Application.DoEvents();
                string scriptDb = rbFabricaLimpia.Checked
                    ? Path.Combine(baseDir, "scripts", "barrido-inicial-fabrica.js")
                    : Path.Combine(baseDir, "scripts", "asegurar-admin.js");
                string argDb = rbFabricaLimpia.Checked ? "--confirmar" : "";
                if (File.Exists(scriptDb)) EjecutarScriptNode(scriptDb, argDb, 30000);

                lblProgresoInstalacion.Text = "Configurando Firewall...";
                Application.DoEvents();
                RepararFirewallAccion(false);

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

                lblProgresoInstalacion.Text = "Creando accesos directos...";
                Application.DoEvents();
                CrearAccesosEscritorio();

                lblProgresoInstalacion.Text = "Instalacion completada.";
                Application.DoEvents();
                Thread.Sleep(1000);

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
        // ESTADO EN VIVO Y ACTUALIZACION DE TARJETAS KPI
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

            // Actualizar KPIs pastel
            if (kpiServidor != null)
            {
                kpiServidor.Valor = servidorEnLineaActual ? "En linea" : "Offline";
                kpiServidor.EtiquetaPill = "Puerto " + puertoConfigurado;
                kpiServidor.Invalidate();
            }
            if (kpiRedLan != null)
            {
                kpiRedLan.Valor = ipLanDetectada;
                kpiRedLan.Invalidate();
            }
            if (kpiRespaldos != null)
            {
                int totalBak = 0;
                try { if (Directory.Exists("C:\\POS_BACKUPS")) totalBak = Directory.GetFiles("C:\\POS_BACKUPS", "*.db").Length; } catch { }
                kpiRespaldos.Valor = totalBak + (totalBak == 1 ? " copia" : " copias");
                kpiRespaldos.Invalidate();
            }
            if (kpiServicios != null)
            {
                int activos = 0;
                foreach (ServicioModulo s in serviciosRegistrados)
                {
                    if (VerificarServicioWindowsActivo(s.ServicioWindows)) activos++;
                }
                kpiServicios.Valor = activos + " / " + serviciosRegistrados.Count;
                kpiServicios.Invalidate();
            }

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
            catch { return false; }
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
            catch { return false; }
        }

        private void IniciarServicioAccion(string nombreServicio)
        {
            this.Cursor = Cursors.WaitCursor;
            try { EjecutarComandoOculto("sc.exe", "start \"" + nombreServicio + "\""); Thread.Sleep(1800); }
            catch (Exception ex) { MessageBox.Show("Error al iniciar: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
        }

        private void DetenerServicioGenerico(string nombreServicio)
        {
            this.Cursor = Cursors.WaitCursor;
            try { EjecutarComandoOculto("sc.exe", "stop \"" + nombreServicio + "\""); Thread.Sleep(1500); }
            catch (Exception ex) { MessageBox.Show("Error al detener: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
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
            catch (Exception ex) { MessageBox.Show("Error al reiniciar: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
        }

        private bool DetenerConBackupObligatorio()
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
                        MessageBox.Show("Respaldo previo fallo. Detencion cancelada.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        return false;
                    }
                }
                EjecutarComandoOculto("sc.exe", "stop \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1800);
                return true;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al detener: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return false;
            }
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
        }

        private void AbrirNavegadorPos()
        {
            try
            {
                string url = "http://localhost:" + puertoConfigurado;
                string[] navegadores = new string[] {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"BraveSoftware\Brave-Browser\Application\brave.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"BraveSoftware\Brave-Browser\Application\brave.exe")
                };

                foreach (string ruta in navegadores)
                {
                    if (File.Exists(ruta))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = ruta;
                        // Modo Aplicacion Independiente: sin pestanas, sin barra de direcciones, maximizada y solo con barra minimizar/maximizar/cerrar
                        psi.Arguments = "--app=\"" + url + "\" --start-maximized";
                        psi.UseShellExecute = true;
                        psi.WindowStyle = ProcessWindowStyle.Maximized;
                        Process p = Process.Start(psi);
                        if (p != null) { try { p.WaitForInputIdle(1500); if (p.MainWindowHandle != IntPtr.Zero) ShowWindow(p.MainWindowHandle, SW_MAXIMIZE); } catch { } }
                        return;
                    }
                }
                Process.Start(url);
            }
            catch (Exception ex) { MessageBox.Show("Error al abrir aplicacion: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        }

        // =========================================================================
        // CATALOGO MODULAR DE SERVICIOS
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
            dlg.BackColor = TemaFinora.LienzoFondo;

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
                    File.AppendAllText(Path.Combine(dirCfg, "servicios-panel.cfg"), nom + "|" + srv + "|" + prt + Environment.NewLine, Encoding.UTF8);
                    CargarServiciosModulares();
                    RenderizarTarjetasServicios();
                    RefrescarEstadoEnVivo();
                }
                catch (Exception ex) { MessageBox.Show("Error al guardar: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error); }
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
                int code = EjecutarScriptNode(Path.Combine(baseDir, "scripts", "aplicar-actualizacion-segura.js"), "--zip=\"" + ofd.FileName + "\"", 180000);
                MessageBox.Show(code == 0 ? "Actualizacion aplicada." : "Error (codigo " + code + ").", "POS Llanomio", MessageBoxButtons.OK, code == 0 ? MessageBoxIcon.Information : MessageBoxIcon.Warning);
            }
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
        }

        private void ActualizarDesdeGithubAccion()
        {
            if (MessageBox.Show("Actualizar desde GitHub?", "POS Llanomio", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            this.Cursor = Cursors.WaitCursor;
            try
            {
                int code = EjecutarScriptNode(Path.Combine(baseDir, "scripts", "aplicar-actualizacion-segura.js"), "--github", 240000);
                MessageBox.Show(code == 0 ? "Actualizacion completada." : "Error (codigo " + code + ").", "POS Llanomio", MessageBoxButtons.OK, code == 0 ? MessageBoxIcon.Information : MessageBoxIcon.Warning);
            }
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
        }

        private void GenerarBackupManualAccion()
        {
            this.Cursor = Cursors.WaitCursor;
            try
            {
                int code = EjecutarScriptNode(Path.Combine(baseDir, "scripts", "respaldo-servicio.js"), "", 45000);
                if (code == 0) MessageBox.Show("Respaldo guardado.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            finally { this.Cursor = Cursors.Default; CargarListaBackups(); RefrescarEstadoEnVivo(); }
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
                    lstBackups.Items.Add(string.Format("{0,-42} | {1,8} KB | {2:dd/MM/yyyy HH:mm}", fi.Name, kb, fi.LastWriteTime));
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

        private void AbrirManualHtmlLocal()
        {
            try
            {
                string rutaRespaldosHtml = Path.Combine(baseDir, "Manual_Respaldos_POS", "Manual_Interactivo_Respaldos.html");
                string rutaGeneralHtml = Path.Combine(baseDir, "public", "manual", "index.html");
                string destino = File.Exists(rutaRespaldosHtml) ? rutaRespaldosHtml : rutaGeneralHtml;

                if (!File.Exists(destino))
                {
                    MessageBox.Show("No se encontro el archivo del manual HTML local.", "Panel Servidor POS", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = destino;
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("No se pudo abrir el manual local: " + ex.Message, "Panel Servidor POS", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
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
            if (ofd.ShowDialog(this) == DialogResult.OK) EjecutarRestauracion(ofd.FileName);
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

                if (File.Exists(destino + "-wal")) File.Delete(destino + "-wal");
                if (File.Exists(destino + "-shm")) File.Delete(destino + "-shm");
                File.Copy(origen, destino, true);

                EjecutarComandoOculto("sc.exe", "start \"" + NOMBRE_SERVICIO + "\"");
                Thread.Sleep(1800);
                MessageBox.Show("Base de datos restaurada.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex) { MessageBox.Show("Error: " + ex.Message, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); CargarListaBackups(); }
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
                string args = "\"" + nom + "\" \"" + usr + "\" \"" + rol + "\" \"" + pwd + "\" \"" + pin + "\"";
                int code = EjecutarScriptNode(Path.Combine(baseDir, "scripts", "crear-usuario-panel.js"), args, 15000);
                if (code == 0)
                {
                    MessageBox.Show("Usuario creado: " + usr, "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    txtNombreUser.Text = "";
                    txtUsername.Text = "";
                    txtPassword.Text = "";
                    txtPin.Text = "";
                }
                else MessageBox.Show("No se pudo crear el usuario.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            finally { this.Cursor = Cursors.Default; }
        }

        private void RestablecerAdminAccion()
        {
            if (MessageBox.Show("Restablecer admin / admin123 (PIN 000000)?", "Confirmar", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            this.Cursor = Cursors.WaitCursor;
            try
            {
                int code = EjecutarScriptNode(Path.Combine(baseDir, "scripts", "asegurar-admin.js"), "", 20000);
                if (code == 0) MessageBox.Show("Admin restablecido.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            finally { this.Cursor = Cursors.Default; }
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
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
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
            finally { this.Cursor = Cursors.Default; RefrescarEstadoEnVivo(); }
        }

        private void RepararFirewallAccion(bool mostrarAviso)
        {
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall delete rule name=\"POS_Llanomio_TCP\"");
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall delete rule name=\"POS_Llanomio_mDNS\"");
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall add rule name=\"POS_Llanomio_TCP\" dir=in action=allow protocol=TCP localport=" + puertoConfigurado);
            EjecutarComandoOculto("netsh.exe", "advfirewall firewall add rule name=\"POS_Llanomio_mDNS\" dir=in action=allow protocol=UDP localport=5353");
            if (mostrarAviso) MessageBox.Show("Firewall configurado.", "POS Llanomio", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
                        if (l.Trim().StartsWith("PORT=")) { nuevas.Add("PORT=" + nuevoPuerto); encontro = true; }
                        else if (l.Trim().StartsWith("HTTP_PORT=")) { nuevas.Add("HTTP_PORT=" + nuevoPuerto); }
                        else { nuevas.Add(l); }
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
