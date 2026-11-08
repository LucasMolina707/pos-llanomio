using System;
using System.Diagnostics;
using System.IO;
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

                string tmpDir = Path.Combine(baseDir, ".tmp");
                if (!Directory.Exists(tmpDir)) Directory.CreateDirectory(tmpDir);
                Environment.SetEnvironmentVariable("TEMP", tmpDir);
                Environment.SetEnvironmentVariable("TMP", tmpDir);

                // 1. Ejecutar Recuperar y Levantar Servidor
                string scriptRecuperar = Path.Combine(baseDir, "RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat");
                if (File.Exists(scriptRecuperar))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c \"" + scriptRecuperar + "\" --silencioso",
                        WorkingDirectory = baseDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process p = Process.Start(psi);
                    if (p != null)
                    {
                        p.WaitForExit(30000);
                    }
                }

                // 2. Levantar el lanzador principal para garantizar servicio activo y pantalla
                string launcherExe = Path.Combine(baseDir, "Iniciar_Servidor_POS.exe");
                if (File.Exists(launcherExe))
                {
                    ProcessStartInfo psiLauncher = new ProcessStartInfo
                    {
                        FileName = launcherExe,
                        WorkingDirectory = baseDir,
                        UseShellExecute = true
                    };
                    Process.Start(psiLauncher);
                }
            }
            catch
            {
                // Silencioso
            }
        }
    }
}
