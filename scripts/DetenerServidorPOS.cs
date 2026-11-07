using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Windows.Forms;

namespace AuroraHost.POS
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                Directory.SetCurrentDirectory(baseDir);

                string tmpDir = Path.Combine(baseDir, ".tmp");
                if (!Directory.Exists(tmpDir)) Directory.CreateDirectory(tmpDir);
                Environment.SetEnvironmentVariable("TEMP", tmpDir);
                Environment.SetEnvironmentVariable("TMP", tmpDir);

                // Leer puerto configurado en .env o usar 3000
                string port = "3000";
                string envPath = Path.Combine(baseDir, ".env");
                if (File.Exists(envPath))
                {
                    foreach (string line in File.ReadAllLines(envPath))
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("PORT=", StringComparison.OrdinalIgnoreCase))
                        {
                            string[] parts = trimmed.Split('=');
                            if (parts.Length > 1 && !string.IsNullOrEmpty(parts[1].Trim()))
                            {
                                port = parts[1].Trim();
                            }
                        }
                    }
                }

                // 1. Verificar si el servidor está en línea
                string urlEstado = "http://127.0.0.1:" + port + "/api/caja/estado";
                string respuestaJson = ConsultarEstadoCaja(urlEstado);

                // 2. Si el servidor está activo, verificar si la caja está en apertura (turno abierto)
                if (!string.IsNullOrEmpty(respuestaJson))
                {
                    bool turnoAbierto = respuestaJson.IndexOf("\"turnoAbierto\":null", StringComparison.OrdinalIgnoreCase) < 0 &&
                                       (respuestaJson.IndexOf("\"turnoAbierto\":{", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                        respuestaJson.IndexOf("\"estado\":\"ABIERTO_HOY\"", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                        respuestaJson.IndexOf("\"estado\":\"BLOQUEADO_DIA_ANTERIOR\"", StringComparison.OrdinalIgnoreCase) >= 0);

                    if (turnoAbierto)
                    {
                        // Mensaje amigable y profesional informando al usuario
                        DialogResult dr = MessageBox.Show(
                            "ATENCIÓN: La caja registra un turno en apertura (caja abierta).\n\n" +
                            "Por seguridad financiera, debe realizar el arqueo y cierre de caja antes de apagar el servidor.\n\n" +
                            "¿Desea abrir la pantalla de Arqueo y Cierre de Caja ahora?",
                            "Caja en Apertura - Aurora-POS",
                            MessageBoxButtons.YesNo,
                            MessageBoxIcon.Warning
                        );

                        if (dr == DialogResult.Yes)
                        {
                            // Redirigir a la vista de caja para que el usuario haga el arqueo y cierre
                            string urlCaja = "http://127.0.0.1:" + port + "/admin/caja";
                            AbrirNavegadorMaximizado(urlCaja);
                        }

                        // NO detener el servidor porque la caja sigue abierta
                        return;
                    }
                }

                // 3. Si la caja está cerrada (o el servidor ya estaba apagado), proceder a detener y apagar
                DetenerServidorCompletamente(baseDir);

                MessageBox.Show(
                    "El servidor de Aurora-POS ha sido detenido y los puertos fueron liberados correctamente.",
                    "Servidor Detenido - Aurora-POS",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch
            {
                // Manejo silencioso defensivo
            }
        }

        static string ConsultarEstadoCaja(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "GET";
                req.Timeout = 2000;
                req.ReadWriteTimeout = 2000;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    if ((int)resp.StatusCode == 200)
                    {
                        using (StreamReader reader = new StreamReader(resp.GetResponseStream()))
                        {
                            return reader.ReadToEnd();
                        }
                    }
                }
            }
            catch { }
            return null;
        }

        static void AbrirNavegadorMaximizado(string url)
        {
            try
            {
                string[] navegadores = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft\\Edge\\Application\\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft\\Edge\\Application\\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google\\Chrome\\Application\\chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google\\Chrome\\Application\\chrome.exe")
                };

                string browserExe = "";
                foreach (string b in navegadores)
                {
                    if (File.Exists(b))
                    {
                        browserExe = b;
                        break;
                    }
                }

                if (!string.IsNullOrEmpty(browserExe))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserExe;
                    psi.Arguments = "--app=" + url + " --start-maximized --disable-pinch --overscroll-history-navigation=0";
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = url;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
            }
            catch { }
        }

        static void DetenerServidorCompletamente(string baseDir)
        {
            try
            {
                // Script de salvaguarda y detencion
                string scriptDetener = Path.Combine(baseDir, "instalador_tienda\\2_INICIADORES_Y_ACTIVADORES\\2_DETENER_PAUSAR_SERVIDOR_POS.bat");
                if (File.Exists(scriptDetener))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "cmd.exe";
                    psi.Arguments = "/c \"\"" + scriptDetener + "\"\"";
                    psi.WorkingDirectory = baseDir;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    Process p = Process.Start(psi);
                    if (p != null) p.WaitForExit(6000);
                }

                // Limpieza de servicios y puertos
                string scriptLimpiar = Path.Combine(baseDir, "scripts\\limpiar-servicios-y-puertos.js");
                string nodeExe = Path.Combine(baseDir, "runtime\\node\\node.exe");
                if (!File.Exists(nodeExe)) nodeExe = "node";

                if (File.Exists(scriptLimpiar))
                {
                    ProcessStartInfo psiNode = new ProcessStartInfo();
                    psiNode.FileName = nodeExe;
                    psiNode.Arguments = "\"" + scriptLimpiar + "\"";
                    psiNode.WorkingDirectory = baseDir;
                    psiNode.WindowStyle = ProcessWindowStyle.Hidden;
                    psiNode.CreateNoWindow = true;
                    psiNode.UseShellExecute = false;
                    Process pNode = Process.Start(psiNode);
                    if (pNode != null) pNode.WaitForExit(4000);
                }

                // Finalizar PM2
                string pm2Cmd = Path.Combine(baseDir, "node_modules\\.bin\\pm2.cmd");
                if (File.Exists(pm2Cmd))
                {
                    ProcessStartInfo psiPm2 = new ProcessStartInfo();
                    psiPm2.FileName = pm2Cmd;
                    psiPm2.Arguments = "kill";
                    psiPm2.WorkingDirectory = baseDir;
                    psiPm2.WindowStyle = ProcessWindowStyle.Hidden;
                    psiPm2.CreateNoWindow = true;
                    psiPm2.UseShellExecute = false;
                    Process pPm2 = Process.Start(psiPm2);
                    if (pPm2 != null) pPm2.WaitForExit(3000);
                }
            }
            catch { }
        }
    }
}
