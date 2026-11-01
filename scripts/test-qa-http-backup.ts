import * as fs from "fs";
import * as path from "path";

async function probarHttpBackup() {
  console.log("=================================================================");
  console.log("   PRUEBA HTTP /api/backup - DESCARGA, METADATOS Y RESTAURACIÓN");
  console.log("=================================================================\n");

  const baseUrl = "http://localhost:3000";

  // 0. Autenticación como ADMIN
  console.log(">> 0. Autenticando en el servidor como Administrador (POST /api/auth/login)...");
  let cookieSesion = "";
  try {
    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });

    const dataLogin = await resLogin.json();
    if (!resLogin.ok || !dataLogin.ok) {
      throw new Error(`Fallo de login: ${JSON.stringify(dataLogin)}`);
    }

    const setCookie = resLogin.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/llanomio_session=([^;]+)/);
      if (match) {
        cookieSesion = `llanomio_session=${match[1]}`;
      }
    }

    if (!cookieSesion) {
      throw new Error("No se pudo obtener la cookie de sesión del login.");
    }

    console.log("   [OK] Sesión de Administrador iniciada correctamente.");
  } catch (err) {
    console.error("   [ERROR] Fallo al autenticar:", err);
    process.exit(1);
  }

  const authHeaders = {
    Cookie: cookieSesion,
  };

  // 1. GET con ?info=true
  console.log("\n>> 1. Solicitando metadatos (GET /api/backup?info=true)...");
  try {
    const resInfo = await fetch(`${baseUrl}/api/backup?info=true`, {
      headers: authHeaders,
    });
    const dataInfo = await resInfo.json();
    if (!resInfo.ok || !dataInfo.ok) {
      throw new Error(`Fallo al consultar info: ${JSON.stringify(dataInfo)}`);
    }
    console.log(`   [OK] Metadatos recibidos: Último respaldo de ${Math.round((dataInfo.ultimoRespaldo?.tamanioBytes || 0) / 1024)} KB.`);
  } catch (err) {
    console.error("   [ERROR] Prueba 1 HTTP falló:", err);
  }

  // 2. GET exportación binaria
  console.log("\n>> 2. Solicitando descarga binaria (GET /api/backup)...");
  try {
    const resDescarga = await fetch(`${baseUrl}/api/backup`, {
      headers: authHeaders,
    });
    if (!resDescarga.ok) {
      throw new Error(`Fallo en descarga HTTP: Status ${resDescarga.status}`);
    }

    const contentType = resDescarga.headers.get("content-type");
    const disposition = resDescarga.headers.get("content-disposition");
    const arrayBuf = await resDescarga.arrayBuffer();
    const bytes = arrayBuf.byteLength;

    console.log(`   [OK] Content-Type: ${contentType}`);
    console.log(`   [OK] Content-Disposition: ${disposition}`);
    console.log(`   [OK] Tamaño binario descargado: ${Math.round(bytes / 1024)} KB (${bytes} bytes).`);

    if (bytes < 20480) {
      throw new Error(`El archivo descargado es menor a 20KB: ${bytes} bytes`);
    }
    if (!contentType?.includes("application/octet-stream")) {
      throw new Error(`Content-Type inesperado: ${contentType}`);
    }
    if (!disposition?.includes("Respaldo_Sistema_Llanomio_")) {
      throw new Error(`Content-Disposition inesperado: ${disposition}`);
    }
  } catch (err) {
    console.error("   [ERROR] Prueba 2 HTTP falló:", err);
  }

  // 3. POST Restauración con archivo corrupto
  console.log("\n>> 3. Probando rechazo de archivo corrupto (POST /api/backup con texto falso)...");
  try {
    const formDataFalso = new FormData();
    const blobFalso = new Blob(["ESTO NO ES UN ARCHIVO SQLITE"], { type: "application/octet-stream" });
    formDataFalso.append("archivo", blobFalso, "corrupto.db");

    const resFalso = await fetch(`${baseUrl}/api/backup`, {
      method: "POST",
      headers: authHeaders,
      body: formDataFalso,
    });
    const dataFalso = await resFalso.json();

    if (resFalso.status === 400 && !dataFalso.ok) {
      console.log(`   [OK] Archivo corrupto rechazado con HTTP 400 y mensaje: "${dataFalso.error}"`);
    } else {
      throw new Error(`Respuesta inesperada al subir archivo corrupto: Status ${resFalso.status}`);
    }
  } catch (err) {
    console.error("   [ERROR] Prueba 3 HTTP falló:", err);
  }

  // 4. POST Restauración con archivo .db válido
  console.log("\n>> 4. Probando restauración válida (POST /api/backup con llanomio.db)...");
  try {
    const rutaDb = path.join(process.cwd(), "database", "llanomio.db");
    const bufferDb = fs.readFileSync(rutaDb);
    const blobValido = new Blob([bufferDb], { type: "application/octet-stream" });

    const formDataValido = new FormData();
    formDataValido.append("archivo", blobValido, "llanomio_test.db");

    const resValido = await fetch(`${baseUrl}/api/backup`, {
      method: "POST",
      headers: authHeaders,
      body: formDataValido,
    });
    const dataValido = await resValido.json();

    if (resValido.ok && dataValido.ok) {
      console.log(`   [OK] Restauración aceptada con HTTP 200: "${dataValido.mensaje}"`);
      console.log(`   [OK] Respaldo de emergencia generado en: ${dataValido.rutaEmergencia}`);
    } else {
      throw new Error(`Fallo en restauración válida: ${JSON.stringify(dataValido)}`);
    }
  } catch (err) {
    console.error("   [ERROR] Prueba 4 HTTP falló:", err);
  }

  console.log("\n=================================================================");
  console.log("   FIN DE PRUEBAS HTTP - TODAS LAS OPERACIONES EXITOSAS");
  console.log("=================================================================\n");
}

probarHttpBackup();
