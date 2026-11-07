using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;

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

                // Configurar carpeta .tmp aislada
                string tmpDir = Path.Combine(baseDir, ".tmp");
                if (!Directory.Exists(tmpDir)) Directory.CreateDirectory(tmpDir);
                Environment.SetEnvironmentVariable("TEMP", tmpDir);
                Environment.SetEnvironmentVariable("TMP", tmpDir);

                // Leer puerto desde .env o default 3000
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

                string url = "http://127.0.0.1:" + port + "/login";

                // 1. Verificar si el servidor ya esta activo
                bool estaActivo = ProbarServidorActivo(url);

                if (!estaActivo)
                {
                    // 2. Levantar el servidor en segundo plano
                    LevantarServidor(baseDir);

                    // 3. Esperar hasta que responda (maximo 25 segundos)
                    int reintentos = 0;
                    while (!estaActivo && reintentos < 50)
                    {
                        Thread.Sleep(500);
                        estaActivo = ProbarServidorActivo(url);
                        reintentos++;
                    }
                }

                // 4. Abrir la ventana en pantalla completa
                AbrirPantallaCompleta(url);
            }
            catch
            {
                // Salida silenciosa y limpia
            }
        }

        static bool ProbarServidorActivo(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "GET";
                req.Timeout = 1500;
                req.ReadWriteTimeout = 1500;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return ((int)resp.StatusCode >= 200 && (int)resp.StatusCode < 400);
                }
            }
            catch
            {
                return false;
            }
        }

        static void LevantarServidor(string baseDir)
        {
            try
            {
                // Buscar script recuperador o iniciador maestro
                string scriptRecuperar = Path.Combine(baseDir, "RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat");
                string scriptIniciar = Path.Combine(baseDir, "instalador_tienda\\2_INICIADORES_Y_ACTIVADORES\\1_INICIALIZAR_SITIO_POS.bat");

                string targetScript = File.Exists(scriptRecuperar) ? scriptRecuperar : (File.Exists(scriptIniciar) ? scriptIniciar : "");

                if (!string.IsNullOrEmpty(targetScript))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "cmd.exe";
                    psi.Arguments = "/c \"\"" + targetScript + "\" --silencioso\"";
                    psi.WorkingDirectory = baseDir;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    Process p = Process.Start(psi);
                    if (p != null)
                    {
                        p.WaitForExit(8000);
                    }
                }
            }
            catch { }
        }

        static void AbrirPantallaCompleta(string url)
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
                    psi.Arguments = "--app=" + url + " --start-fullscreen --disable-pinch --overscroll-history-navigation=0";
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    // Fallback al navegador predeterminado
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
