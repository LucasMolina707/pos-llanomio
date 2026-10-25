/**
 * Punto de entrada para la migración de archivos Excel en la carpeta migracion_excel.
 * Redirige hacia el motor centralizado en src/migracion/migrar-datos.ts
 */

import { ejecutarMigracionMasiva } from "../src/migracion/migrar-datos";
import * as path from "path";

async function iniciar() {
  const rutaCarpeta = path.join(__dirname, "origen");
  await ejecutarMigracionMasiva(rutaCarpeta);
}

if (require.main === module) {
  iniciar().catch((e) => {
    console.error("Fallo durante la migracion:", e);
    process.exit(1);
  });
}

export { iniciar };
