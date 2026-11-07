using System;
using System.Diagnostics;
using System.IO;

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

                // 1. Ejecutar script de detencion si existe
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
                    if (p != null) p.WaitForExit(5000);
                }

                // 2. Ejecutar limpieza de servicios y puertos
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

                // 3. Forzar detencion de PM2 local si sigue activo
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
            catch
            {
                // Salida silenciosa y limpia
            }
        }
    }
}
