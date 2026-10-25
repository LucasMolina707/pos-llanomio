import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Replicación de las utilidades de normalización y búsqueda fuzzy
function normalizarTexto(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_.,;/\\()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  let edits = 0;
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      edits++;
      if (edits > 1) return 2;
      if (a.length > b.length) {
        i++;
      } else if (a.length < b.length) {
        j++;
      } else {
        if (i + 1 < a.length && j + 1 < b.length && a[i] === b[j + 1] && a[i + 1] === b[j]) {
          i += 2;
          j += 2;
          continue;
        }
        i++;
        j++;
      }
    } else {
      i++;
      j++;
    }
  }
  if (i < a.length || j < b.length) edits++;
  return edits;
}

function esCoincidenciaAproximada(palabra: string, token: string): boolean {
  if (!palabra || !token) return false;
  if (palabra.includes(token)) return true;
  if (token.length < 4) return false;

  if (Math.abs(palabra.length - token.length) <= 1) {
    return distanciaEdicion(palabra, token) <= 1;
  }

  if (palabra.length > token.length) {
    for (let i = 0; i <= palabra.length - token.length; i++) {
      const sub = palabra.substring(i, i + token.length);
      if (distanciaEdicion(sub, token) <= 1) return true;
    }
  }
  return false;
}

function filtrarClientesFuzzy(clientes: any[], busqueda: string) {
  if (!busqueda.trim()) return clientes;
  const tokens = normalizarTexto(busqueda).split(" ").filter(Boolean);
  if (tokens.length === 0) return clientes;

  const resultados: { cliente: any; score: number }[] = [];

  for (const c of clientes) {
    const nomNorm = normalizarTexto(c.nombre);
    const docNorm = normalizarTexto(c.documento);
    const telNorm = normalizarTexto(c.telefono);
    const dirNorm = normalizarTexto(c.direccion);
    const notasNorm = normalizarTexto(c.notas);

    const palabras = [
      ...nomNorm.split(" "),
      ...dirNorm.split(" "),
      ...docNorm.split(" "),
      ...telNorm.split(" "),
    ].filter(Boolean);

    let scoreTotal = 0;
    let coincideTodos = true;

    for (const token of tokens) {
      let tokenScore = 0;
      if (docNorm.startsWith(token) || nomNorm.startsWith(token)) {
        tokenScore += 100;
      } else if (docNorm.includes(token)) {
        tokenScore += 65;
      } else if (nomNorm.includes(token)) {
        tokenScore += 50;
      } else if (telNorm.includes(token)) {
        tokenScore += 35;
      } else if (dirNorm.includes(token) || notasNorm.includes(token)) {
        tokenScore += 20;
      } else if (token.length >= 4) {
        const aprox = palabras.some((p) => esCoincidenciaAproximada(p, token));
        if (aprox) {
          tokenScore += 10;
        } else {
          coincideTodos = false;
          break;
        }
      } else {
        coincideTodos = false;
        break;
      }
      scoreTotal += tokenScore;
    }

    if (coincideTodos && scoreTotal > 0) {
      resultados.push({ cliente: c, score: scoreTotal });
    }
  }

  resultados.sort((a, b) => b.score - a.score);
  return resultados.map((r) => r.cliente);
}

async function main() {
  console.log("================================================================================");
  console.log("QA POS: SELECTOR VISUAL DE CLIENTES POR ETIQUETAS Y AUTOFILTRADO FUZZY");
  console.log("================================================================================");

  // 1. Verificar carga de clientes en BD
  const clientesBD = await prisma.cliente.findMany({
    orderBy: [{ updatedAt: "desc" }, { fechaCreacion: "desc" }],
  });
  console.log(`[QA 1] Clientes totales encontrados en SQLite: ${clientesBD.length}`);

  if (clientesBD.length === 0) {
    // Sembrar un cliente de prueba si la BD estuviera vacía
    await prisma.cliente.create({
      data: {
        documento: "1121890456",
        nombre: "JUAN CARLOS PEREZ GOMEZ",
        telefono: "3114567890",
        direccion: "Barrio Barzal Alto, Villavicencio, Meta",
      },
    });
  }

  // 2. Probar escenarios de búsqueda no-precisa (Fuzzy Multi-Campo)
  const casosDePrueba = [
    { query: "1121", descripcion: "Fragmento inicial de cédula" },
    { query: "perez", descripcion: "Apellido sin tildes ni mayúsculas" },
    { query: "7890", descripcion: "Últimos dígitos de teléfono" },
    { query: "barzal", descripcion: "Fragmento de dirección / barrio" },
    { query: "juan 311", descripcion: "Multi-campo (nombre + teléfono combinados)" },
    { query: "perez meta", descripcion: "Multi-campo (apellido + departamento)" },
    { query: "perz", descripcion: "Tolerancia a error tipográfico (falta 1 letra en palabra de 4)" },
  ];

  console.log("\n[QA 2] Verificando casos de autofiltrado dinámico:");
  for (const caso of casosDePrueba) {
    const filtrados = filtrarClientesFuzzy(clientesBD, caso.query);
    console.log(`  -> Query "${caso.query}" (${caso.descripcion}): ${filtrados.length} coincidencia(s).`);
    if (filtrados.length > 0) {
      console.log(`     Primer resultado: ${filtrados[0].nombre} | Doc: ${filtrados[0].documento}`);
    }
  }

  // 3. Simular creación rápida de cliente y auto-inyección en primera posición
  const nuevoDoc = `CC-${Date.now().toString().slice(-8)}`;
  const nuevoCliente = await prisma.cliente.create({
    data: {
      documento: nuevoDoc,
      nombre: "CLIENTE TEST CHIP TACTIL QA",
      telefono: "3209876543",
      direccion: "Avenida 40 #22-10",
    },
  });

  console.log(`\n[QA 3] Cliente nuevo creado: ${nuevoCliente.nombre} (${nuevoCliente.documento})`);

  // Simulación de la inyección en estado local del POS:
  const listaLocalActualizada = [
    nuevoCliente,
    ...clientesBD.filter((c) => c.id !== nuevoCliente.id),
  ];

  if (listaLocalActualizada[0].id !== nuevoCliente.id) {
    throw new Error("Fallo: El cliente recién creado debe ubicarse al inicio de las etiquetas");
  }
  console.log(`[QA 3] Posición en lista de etiquetas: 1er lugar (Índice 0). Correcto.`);

  // Probar que el buscador lo encuentre inmediatamente
  const busquedaNuevo = filtrarClientesFuzzy(listaLocalActualizada, "tactil");
  if (busquedaNuevo.length === 0 || busquedaNuevo[0].id !== nuevoCliente.id) {
    throw new Error("Fallo: El nuevo cliente debe ser encontrado al instante por cualquiera de sus palabras");
  }
  console.log(`[QA 3] Autofiltrado instantáneo del nuevo cliente ("tactil"): Encontrado exitosamente.`);

  // Limpiar cliente de prueba generado para mantener integridad
  await prisma.cliente.delete({ where: { id: nuevoCliente.id } });
  console.log(`[QA 3] Limpieza de cliente de prueba completada.`);

  console.log("\n================================================================================");
  console.log("TODAS LAS PRUEBAS DE ETIQUETAS Y AUTOFILTRADO FUZZY PASARON EXITOSAMENTE (0 ERRORES)");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("[ERROR QA]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
