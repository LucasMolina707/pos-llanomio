using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
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

                // Leer puerto configurado
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

                // 1. Detener procesos actuales
                string scriptDetener = Path.Combine(baseDir, "instalador_tienda\\2_INICIADORES_Y_ACTIVADORES\\2_DETENER_PAUSAR_SERVIDOR_POS.bat");
                if (File.Exists(scriptDetener))
                {
                    ProcessStartInfo psiStop = new ProcessStartInfo();
                    psiStop.FileName = "cmd.exe";
                    psiStop.Arguments = "/c \"\"" + scriptDetener + "\"\"";
                    psiStop.WorkingDirectory = baseDir;
                    psiStop.WindowStyle = ProcessWindowStyle.Hidden;
                    psiStop.CreateNoWindow = true;
                    psiStop.UseShellExecute = false;
                    Process pStop = Process.Start(psiStop);
                    if (pStop != null) pStop.WaitForExit(4000);
                }

                // 2. Levantar servidor en segundo plano
                string scriptRecuperar = Path.Combine(baseDir, "RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat");
                if (File.Exists(scriptRecuperar))
                {
                    ProcessStartInfo psiStart = new ProcessStartInfo();
                    psiStart.FileName = "cmd.exe";
                    psiStart.Arguments = "/c \"\"" + scriptRecuperar + "\" --silencioso\"";
                    psiStart.WorkingDirectory = baseDir;
                    psiStart.WindowStyle = ProcessWindowStyle.Hidden;
                    psiStart.CreateNoWindow = true;
                    psiStart.UseShellExecute = false;
                    Process pStart = Process.Start(psiStart);
                    if (pStart != null) pStart.WaitForExit(6000);
                }

                // 3. Esperar confirmación de puerto
                string url = "http://127.0.0.1:" + port + "/login";
                bool estaActivo = false;
                int reintentos = 0;
                while (!estaActivo && reintentos < 30)
                {
                    Thread.Sleep(500);
                    estaActivo = ProbarServidorActivo(url);
                    reintentos++;
                }

                // 4. Abrir ventana maximizada
                AbrirNavegadorMaximizado(url);
            }
            catch { }
        }

        static bool ProbarServidorActivo(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "GET";
                req.Timeout = 1500;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return ((int)resp.StatusCode >= 200 && (int)resp.StatusCode < 400);
                }
            }
            catch { return false; }
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
    }
}

