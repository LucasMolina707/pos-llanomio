import { prisma } from "../src/lib/prisma";
import { calcularDigitoVerificacionDIAN, validarEmail } from "../src/lib/dian-utils";

async function main() {
  console.log("=== INICIANDO QA: CUMPLIMIENTO TRIBUTARIO DIAN & CLIENTES ===");

  // 1. Probar algoritmo DIAN Módulo 11 con NITs conocidos
  console.log("\n1. Verificando algoritmo DIAN Módulo 11:");
  const pruebasNIT = [
    { nit: "800197268", dvEsperado: "4", nombre: "DIAN" },
    { nit: "890900608", dvEsperado: "9", nombre: "Éxito" },
    { nit: "890903938", dvEsperado: "8", nombre: "Bancolombia" },
    { nit: "899999068", dvEsperado: "1", nombre: "Ecopetrol" },
    { nit: "900123456", dvEsperado: "8", nombre: "Test Agro Llanos" },
  ];

  for (const p of pruebasNIT) {
    const dvCalc = calcularDigitoVerificacionDIAN(p.nit);
    const ok = dvCalc === p.dvEsperado;
    console.log(`- NIT ${p.nit} (${p.nombre}): DV Calculado = ${dvCalc} | Esperado = ${p.dvEsperado} -> ${ok ? "OK" : "FALLÓ"}`);
    if (!ok) throw new Error(`Fallo en cálculo de DV para ${p.nit}`);
  }

  // 2. Validación de emails para facturación electrónica
  console.log("\n2. Verificando validación de emails:");
  console.log("- 'facturacion@empresa.com':", validarEmail("facturacion@empresa.com") ? "VÁLIDO" : "INVÁLIDO");
  console.log("- 'invalido-sin-arroba.com':", !validarEmail("invalido-sin-arroba.com") ? "CORRECTAMENTE RECHAZADO" : "FALLÓ");

  // Limpiar clientes de prueba previos
  await prisma.cliente.deleteMany({
    where: { documento: { in: ["TEST-CF-1001", "900123456"] } },
  });

  // 3. Crear Cliente Estándar (Consumidor Final / Check Desactivado)
  console.log("\n3. Creando Cliente Estándar (Consumidor Final / Check Desactivado):");
  const clienteEstandar = await prisma.cliente.create({
    data: {
      documento: "TEST-CF-1001",
      nombre: "JUAN CARLOS PÉREZ GÓMEZ",
      telefono: "3109876543",
      esResponsableIVA: false,
      tipoIdentificacion: "CC",
      responsabilidadFiscal: "O-99",
      municipio: "Villavicencio - Meta",
      codigoDaneMunicipio: "50001",
    },
  });

  console.log("Cliente Estándar Creado:", {
    id: clienteEstandar.id,
    nombre: clienteEstandar.nombre,
    documento: clienteEstandar.documento,
    esResponsableIVA: clienteEstandar.esResponsableIVA,
    responsabilidadFiscal: clienteEstandar.responsabilidadFiscal,
    codigoDane: clienteEstandar.codigoDaneMunicipio,
  });

  if (clienteEstandar.esResponsableIVA !== false || clienteEstandar.responsabilidadFiscal !== "O-99") {
    throw new Error("Cliente estándar no tiene los valores por defecto requeridos.");
  }

  // 4. Crear Cliente Responsable de IVA (Check Activado)
  console.log("\n4. Creando Cliente Responsable de IVA (Persona Jurídica / RUT DIAN):");
  const dvAgro = calcularDigitoVerificacionDIAN("900123456");
  const clienteIVA = await prisma.cliente.create({
    data: {
      documento: "900123456",
      nombre: "AGROPECUARIA LOS LLANOS S.A.S.",
      razonSocial: "AGROPECUARIA LOS LLANOS S.A.S.",
      email: "facturacion@agrollanos.com",
      direccion: "Carrera 40 # 25-10, Barrio Siete de Agosto",
      telefono: "3201112233",
      esResponsableIVA: true,
      tipoIdentificacion: "NIT",
      digitoVerificacion: dvAgro,
      responsabilidadFiscal: "O-48",
      municipio: "Villavicencio - Meta",
      codigoDaneMunicipio: "50001",
    },
  });

  console.log("Cliente Responsable de IVA Creado:", {
    id: clienteIVA.id,
    razonSocial: clienteIVA.razonSocial,
    nit: `${clienteIVA.documento}-${clienteIVA.digitoVerificacion}`,
    email: clienteIVA.email,
    direccion: clienteIVA.direccion,
    esResponsableIVA: clienteIVA.esResponsableIVA,
    responsabilidadFiscal: clienteIVA.responsabilidadFiscal,
    municipioDANE: `${clienteIVA.municipio} (${clienteIVA.codigoDaneMunicipio})`,
  });

  if (!clienteIVA.esResponsableIVA || clienteIVA.tipoIdentificacion !== "NIT" || clienteIVA.digitoVerificacion !== "8") {
    throw new Error("Error en datos fiscales del cliente responsable de IVA.");
  }

  // 5. Editar Cliente Estándar existente y convertirlo a Responsable de IVA
  console.log("\n5. Actualizando Cliente Estándar a Responsable de IVA:");
  const clienteActualizado = await prisma.cliente.update({
    where: { id: clienteEstandar.id },
    data: {
      esResponsableIVA: true,
      tipoIdentificacion: "NIT",
      digitoVerificacion: calcularDigitoVerificacionDIAN("800197268"),
      razonSocial: "COMERCIALIZADORA DEL LLANO LTDA",
      email: "contabilidad@comercializadorallano.com",
      direccion: "Calle 15 # 30-45",
      responsabilidadFiscal: "O-48",
    },
  });

  console.log("Cliente Actualizado con éxito:", {
    id: clienteActualizado.id,
    razonSocial: clienteActualizado.razonSocial,
    nitConDV: `${clienteActualizado.documento}-${clienteActualizado.digitoVerificacion}`,
    esResponsableIVA: clienteActualizado.esResponsableIVA,
    responsabilidadFiscal: clienteActualizado.responsabilidadFiscal,
    email: clienteActualizado.email,
  });

  // 6. Limpieza de datos de prueba
  console.log("\n6. Limpiando datos de prueba...");
  await prisma.cliente.deleteMany({
    where: { id: { in: [clienteEstandar.id, clienteIVA.id] } },
  });

  console.log("Limpieza completada.");
  console.log("\n=== PRUEBA QA CUMPLIMIENTO DIAN FINALIZADA CON ÉXITO ABSOLUTO ===");
}

main()
  .catch((e) => {
    console.error("ERROR EN QA DIAN:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
