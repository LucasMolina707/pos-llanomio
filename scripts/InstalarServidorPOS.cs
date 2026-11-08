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

                // 1. Ejecutar el Instalador Maestro de configuracion de PM2, Firewall y Autoarranque
                string scriptInstalador = Path.Combine(baseDir, "INSTALADOR_MAESTRO_UNICO_POS.bat");
                if (File.Exists(scriptInstalador))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c \"" + scriptInstalador + "\" --silencioso",
                        WorkingDirectory = baseDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process p = Process.Start(psi);
                    if (p != null)
                    {
                        p.WaitForExit(90000); // Dar hasta 90s para que PM2 y Firewall queden listos
                    }
                }

                // 2. Crear los 4 accesos directos oficiales en el Escritorio con sus iconos
                CrearAccesosEscritorio(baseDir);

                // 3. Iniciar el servidor POS y abrir pantalla de acceso
                string iniciarExe = Path.Combine(baseDir, "Iniciar_Servidor_POS.exe");
                if (File.Exists(iniciarExe))
                {
                    ProcessStartInfo psiIniciar = new ProcessStartInfo
                    {
                        FileName = iniciarExe,
                        WorkingDirectory = baseDir,
                        UseShellExecute = true
                    };
                    Process.Start(psiIniciar);
                }
            }
            catch
            {
                // Silencioso
            }
        }

        private static void CrearAccesosEscritorio(string baseDir)
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string iconosDir = Path.Combine(baseDir, "instalador_tienda", "iconos");

                string icoVerde = Path.Combine(iconosDir, "icono_iniciar_verde.ico");
                string icoRojo = Path.Combine(iconosDir, "icono_detener_rojo.ico");
                string icoAzul = Path.Combine(iconosDir, "icono_reiniciar_azul.ico");
                string icoAurora = Path.Combine(baseDir, "aurora.ico");

                if (!File.Exists(icoVerde)) icoVerde = icoAurora;
                if (!File.Exists(icoRojo)) icoRojo = icoAurora;
                if (!File.Exists(icoAzul)) icoAzul = icoAurora;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic shell = Activator.CreateInstance(shellType);

                // 1. Iniciar Servidor POS
                string exeIniciar = Path.Combine(baseDir, "Iniciar_Servidor_POS.exe");
                if (File.Exists(exeIniciar))
                {
                    dynamic sc1 = shell.CreateShortcut(Path.Combine(desktop, "Iniciar Servidor POS.lnk"));
                    sc1.TargetPath = exeIniciar;
                    sc1.WorkingDirectory = baseDir;
                    sc1.IconLocation = icoVerde;
                    sc1.Description = "Iniciar Servidor Local Aurora POS y Abrir Sistema";
                    sc1.Save();
                }

                // 2. Detener Servidor POS
                string exeDetener = Path.Combine(baseDir, "Detener_Servidor_POS.exe");
                if (File.Exists(exeDetener))
                {
                    dynamic sc2 = shell.CreateShortcut(Path.Combine(desktop, "Detener Servidor POS.lnk"));
                    sc2.TargetPath = exeDetener;
                    sc2.WorkingDirectory = baseDir;
                    sc2.IconLocation = icoRojo;
                    sc2.Description = "Detener y Pausar de forma segura el Servidor Aurora POS";
                    sc2.Save();
                }

                // 3. Reiniciar Servidor POS
                string exeReiniciar = Path.Combine(baseDir, "Reiniciar_Servidor_POS.exe");
                if (File.Exists(exeReiniciar))
                {
                    dynamic sc3 = shell.CreateShortcut(Path.Combine(desktop, "Reiniciar Servidor POS.lnk"));
                    sc3.TargetPath = exeReiniciar;
                    sc3.WorkingDirectory = baseDir;
                    sc3.IconLocation = icoAzul;
                    sc3.Description = "Reiniciar y Optimizar Servidor Aurora POS";
                    sc3.Save();
                }

                // 4. POS Llanomio - Recuperar y Levantar Servidor
                string exeRecuperar = Path.Combine(baseDir, "Recuperar_Servidor_POS.exe");
                if (File.Exists(exeRecuperar))
                {
                    dynamic sc4 = shell.CreateShortcut(Path.Combine(desktop, "POS Llanomio - Recuperar y Levantar Servidor.lnk"));
                    sc4.TargetPath = exeRecuperar;
                    sc4.WorkingDirectory = baseDir;
                    sc4.IconLocation = icoAurora;
                    sc4.Description = "Rescate Rapido y Verificacion de Integridad del Servidor POS";
                    sc4.Save();
                }
            }
            catch
            {
                // Manejo silencioso
            }
        }
    }
}

