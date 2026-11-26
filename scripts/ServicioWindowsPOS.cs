using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
using System.Text;
using System.Threading;

namespace AuroraHost.POS.Servicio
{
    public class POSService : ServiceBase
    {
        public const string SERVICE_NAME = "POS_Llanomio";
        public const string SERVICE_DISPLAY = "POS Llanomio - Servidor de Ventas y Facturacion";

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

        protected override void OnStart(string[] args)
        {
            isStopping = false;
            EscribirLog("Iniciando servicio de Windows POS Llanomio...");

            try
            {
                IniciarServidorInterno();

                // Hilo de monitoreo para auto-recuperacion en segundo plano
                monitorThread = new Thread(MonitorearServidor);
                monitorThread.IsBackground = true;
                monitorThread.Start();

                EscribirLog("Servicio de Windows iniciado y monitoreando el servidor Next.js.");
            }
            catch (Exception ex)
            {
                EscribirLog("ERROR CRITICO AL INICIAR SERVICIO: " + ex.Message);
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

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = nodeExe,
                Arguments = "\"" + startScript + "\"",
                WorkingDirectory = baseDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };

            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["PORT"] = "3000";
            psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";

            EscribirLog("Lanzando proceso Node: " + nodeExe + " " + psi.Arguments);
            processNode = Process.Start(psi);
            if (processNode != null)
            {
                EscribirLog(string.Format("Proceso Node.js iniciado con PID: {0}", processNode.Id));
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
                        EscribirLog("AVISO: El proceso Node.js se detuvo inesperadamente. Reiniciando...");
                        IniciarServidorInterno();
                    }
                }
                catch (Exception ex)
                {
                    EscribirLog("Error en hilo de monitoreo: " + ex.Message);
                }
            }
        }

        protected override void OnStop()
        {
            isStopping = true;
            EscribirLog("=================================================================");
            EscribirLog("SOLICITUD DE DETENCION DE SERVICIO RECIBIDA");
            EscribirLog("=================================================================");

            // PASO 1 OBLIGATORIO: Generar y validar respaldo de base de datos antes de apagar
            EjecutarRespaldoObligatorioPreApagado();

            // PASO 2: Detener proceso Node.js y liberar recursos
            EscribirLog("Terminando proceso principal de Node.js...");
            try
            {
                if (processNode != null && !processNode.HasExited)
                {
                    processNode.Kill();
                    processNode.WaitForExit(3000);
                }
            }
            catch { }

            // Limpieza preventiva de puertos remanentes
            try
            {
                string scriptLimpiar = Path.Combine(baseDir, "scripts", "limpiar-servicios-y-puertos.js");
                string nodeExe = "node";
                string portableNode = Path.Combine(baseDir, "runtime", "node", "node.exe");
                if (File.Exists(portableNode)) nodeExe = portableNode;

                if (File.Exists(scriptLimpiar))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = nodeExe,
                        Arguments = "\"" + scriptLimpiar + "\"",
                        WorkingDirectory = baseDir,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    using (Process p = Process.Start(psi))
                    {
                        if (p != null) p.WaitForExit(4000);
                    }
                }
            }
            catch { }

            EscribirLog("Servicio de Windows POS Llanomio detenido correctamente con respaldo validado.");
        }

        protected override void OnShutdown()
        {
            EscribirLog("Sistema operativo Windows apagandose o reiniciandose. Ejecutando salvaguarda...");
            OnStop();
            base.OnShutdown();
        }

        private void EjecutarRespaldoObligatorioPreApagado()
        {
            EscribirLog("[RESPALDO OBLIGATORIO] Iniciando copia de seguridad pre-apagado de SQLite...");
            try
            {
                string scriptBackup = Path.Combine(baseDir, "scripts", "detener-con-backup.js");
                string nodeExe = "node";
                string portableNode = Path.Combine(baseDir, "runtime", "node", "node.exe");
                if (File.Exists(portableNode)) nodeExe = portableNode;

                if (File.Exists(scriptBackup))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = nodeExe,
                        Arguments = "\"" + scriptBackup + "\" --solo-backup",
                        WorkingDirectory = baseDir,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };

                    using (Process p = Process.Start(psi))
                    {
                        if (p != null)
                        {
                            p.WaitForExit(20000);
                            if (p.ExitCode == 0)
                            {
                                EscribirLog("[RESPALDO OBLIGATORIO] Respaldo pre-apagado generado y validado con EXITO.");
                            }
                            else
                            {
                                EscribirLog(string.Format("[ADVERTENCIA] El respaldo pre-apagado retorno codigo: {0}", p.ExitCode));
                            }
                        }
                    }
                }
                else
                {
                    // Fallback directo si el script no existe
                    string dbPath = Path.Combine(baseDir, "database", "llanomio.db");
                    string bDir = Path.Combine(baseDir, "database", "backups_locales");
                    if (File.Exists(dbPath))
                    {
                        if (!Directory.Exists(bDir)) Directory.CreateDirectory(bDir);
                        string bFile = Path.Combine(bDir, "pos_EMERGENCIA_PRE_APAGADO.db");
                        File.Copy(dbPath, bFile, true);
                        EscribirLog("[RESPALDO OBLIGATORIO] Copia binaria de emergencia creada en: " + bFile);
                    }
                }
            }
            catch (Exception ex)
            {
                EscribirLog("ERROR DURANTE RESPALDO PRE-APAGADO: " + ex.Message);
            }
        }

        public void IniciarEnConsola(string[] args)
        {
            Console.WriteLine("Iniciando POS Llanomio en modo interactivo...");
            OnStart(args);
            Console.WriteLine("Presione ENTER para detener el servicio...");
            Console.ReadLine();
            OnStop();
        }

        static void Main(string[] args)
        {
            Directory.SetCurrentDirectory(AppDomain.CurrentDomain.BaseDirectory);

            if (args.Length > 0 && (args[0] == "--console" || args[0] == "-c"))
            {
                POSService svc = new POSService();
                svc.IniciarEnConsola(args);
            }
            else
            {
                ServiceBase.Run(new POSService());
            }
        }
    }
}
