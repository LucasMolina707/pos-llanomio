import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularDigitoVerificacionDIAN, validarEmail } from "@/lib/dian-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/clientes
 * Carga completa de clientes ordenados por más recientes / frecuentes
 * con soporte de búsqueda multi-campo (documento, nombre, razón social, teléfono, email, dirección).
 */
export async function GET(req: NextRequest | Request) {
  try {
    const searchParams = req?.url
      ? new URL(req.url).searchParams
      : new URL("http://localhost/api/clientes").searchParams;
    const q = searchParams.get("q")?.trim() || "";
    const limiteParam = searchParams.get("limite");
    const limite = limiteParam ? parseInt(limiteParam, 10) : undefined;

    let where: Record<string, unknown> = {};

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      if (tokens.length === 1) {
        where = {
          OR: [
            { documento: { contains: tokens[0] } },
            { nombre: { contains: tokens[0] } },
            { razonSocial: { contains: tokens[0] } },
            { telefono: { contains: tokens[0] } },
            { telefonoSecundario: { contains: tokens[0] } },
            { email: { contains: tokens[0] } },
            { direccion: { contains: tokens[0] } },
            { notas: { contains: tokens[0] } },
          ],
        };
      } else if (tokens.length > 1) {
        where = {
          AND: tokens.map((token) => ({
            OR: [
              { documento: { contains: token } },
              { nombre: { contains: token } },
              { razonSocial: { contains: token } },
              { telefono: { contains: token } },
              { telefonoSecundario: { contains: token } },
              { email: { contains: token } },
              { direccion: { contains: token } },
              { notas: { contains: token } },
            ],
          })),
        };
      }
    }

    const clientesRaw = await prisma.cliente.findMany({
      where,
      take: limite || undefined,
      orderBy: [
        { fechaCreacion: "desc" },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
        telefonoSecundario: true,
        email: true,
        direccion: true,
        notas: true,
        esResponsableIVA: true,
        tipoIdentificacion: true,
        digitoVerificacion: true,
        razonSocial: true,
        responsabilidadFiscal: true,
        municipio: true,
        codigoDaneMunicipio: true,
        fechaCreacion: true,
        updatedAt: true,
        _count: {
          select: { facturas: true },
        },
      },
    });

    const clientes = clientesRaw.map((c) => ({
      ...c,
      identificacion: c.documento,
    }));

    return NextResponse.json(
      {
        success: true,
        clientes,
        total: clientes.length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Error al consultar clientes:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar clientes en la base de datos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clientes
 * Creación de cliente desde mostrador o panel con validación condicional DIAN
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      documento,
      nombre,
      telefono,
      telefonoSecundario,
      email,
      direccion,
      notas,
      esResponsableIVA,
      tipoIdentificacion,
      digitoVerificacion,
      razonSocial,
      responsabilidadFiscal,
      municipio,
      codigoDaneMunicipio,
    } = body;

    if (!documento || !documento.trim()) {
      return NextResponse.json(
        { success: false, error: "El número de documento / NIT es obligatorio" },
        { status: 400 }
      );
    }

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre o razón social del cliente es obligatorio" },
        { status: 400 }
      );
    }

    if (!telefono || !telefono.trim()) {
      return NextResponse.json(
        { success: false, error: "El teléfono primario del cliente es obligatorio" },
        { status: 400 }
      );
    }

    const docSanitizado = documento.trim().toUpperCase();
    const nombreSanitizado = nombre.trim().toUpperCase();
    const telSanitizado = telefono.trim().replace(/[^\d+]/g, "");
    if (telSanitizado.length < 7) {
      return NextResponse.json(
        { success: false, error: "El teléfono primario debe tener al menos 7 dígitos" },
        { status: 400 }
      );
    }
    const telSecSanitizado = telefonoSecundario && telefonoSecundario.trim()
      ? telefonoSecundario.trim().replace(/[^\d+]/g, "")
      : null;
    const emailSanitizado = email ? email.trim().toLowerCase() : null;
    const dirSanitizada = direccion ? direccion.trim() : null;
    const notasSanitizadas = notas ? notas.trim() : null;
    const esRespIVA = Boolean(esResponsableIVA);

    let tipoId = tipoIdentificacion ? tipoIdentificacion.trim().toUpperCase() : (esRespIVA ? "NIT" : "CC");
    let dv: string | null = digitoVerificacion ? String(digitoVerificacion).trim() : null;
    let rSocial: string | null = razonSocial ? razonSocial.trim().toUpperCase() : null;
    let respFiscal = responsabilidadFiscal ? responsabilidadFiscal.trim().toUpperCase() : (esRespIVA ? "O-48" : "O-99");
    let mun = municipio ? municipio.trim() : "Villavicencio - Meta";
    let codDane = codigoDaneMunicipio ? String(codigoDaneMunicipio).trim() : "50001";

    // Si es tipo NIT y no se proporcionó DV, calcularlo automáticamente con el algoritmo DIAN Módulo 11
    if (tipoId === "NIT" && !dv) {
      dv = calcularDigitoVerificacionDIAN(docSanitizado) || null;
    }

    // VALIDACIÓN ESTRICTA DIAN PARA RESPONSABLES DE IVA / FACTURACIÓN ELECTRÓNICA
    if (esRespIVA) {
      if (!emailSanitizado || !validarEmail(emailSanitizado)) {
        return NextResponse.json(
          {
            success: false,
            error: "El correo electrónico es obligatorio y debe tener formato válido (@ y dominio) para clientes responsables de IVA (DIAN).",
          },
          { status: 400 }
        );
      }

      if (!rSocial) {
        // Si no se digitó razón social explícita, se usa el nombre provisto
        rSocial = nombreSanitizado;
      }

      if (!dirSanitizada) {
        return NextResponse.json(
          {
            success: false,
            error: "La dirección fiscal del RUT es obligatoria para clientes responsables de IVA (DIAN).",
          },
          { status: 400 }
        );
      }

      if (tipoId === "NIT" && (!dv || dv.trim() === "")) {
        return NextResponse.json(
          {
            success: false,
            error: "El Dígito de Verificación (DV) es obligatorio cuando la identificación es NIT.",
          },
          { status: 400 }
        );
      }

      if (respFiscal === "O-99") {
        respFiscal = "O-48";
      }
    } else {
      // Si no es responsable de IVA
      respFiscal = "O-99";
    }

    // Verificar si ya existe un cliente con ese documento
    const clienteExistente = await prisma.cliente.findUnique({
      where: { documento: docSanitizado },
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
        telefonoSecundario: true,
        email: true,
        direccion: true,
        notas: true,
        esResponsableIVA: true,
        tipoIdentificacion: true,
        digitoVerificacion: true,
        razonSocial: true,
        responsabilidadFiscal: true,
        municipio: true,
        codigoDaneMunicipio: true,
        fechaCreacion: true,
        updatedAt: true,
      },
    });

    if (clienteExistente) {
      return NextResponse.json(
        {
          success: true,
          mensaje: "El cliente ya se encontraba registrado",
          cliente: clienteExistente,
          yaExistia: true,
        },
        { status: 200 }
      );
    }

    const nuevoCliente = await prisma.cliente.create({
      data: {
        documento: docSanitizado,
        nombre: nombreSanitizado,
        telefono: telSanitizado,
        telefonoSecundario: telSecSanitizado,
        email: emailSanitizado,
        direccion: dirSanitizada,
        notas: notasSanitizadas,
        esResponsableIVA: esRespIVA,
        tipoIdentificacion: tipoId,
        digitoVerificacion: dv,
        razonSocial: rSocial,
        responsabilidadFiscal: respFiscal,
        municipio: mun,
        codigoDaneMunicipio: codDane,
      },
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
        telefonoSecundario: true,
        email: true,
        direccion: true,
        notas: true,
        esResponsableIVA: true,
        tipoIdentificacion: true,
        digitoVerificacion: true,
        razonSocial: true,
        responsabilidadFiscal: true,
        municipio: true,
        codigoDaneMunicipio: true,
        fechaCreacion: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        mensaje: "Cliente registrado exitosamente con información tributaria DIAN",
        cliente: nuevoCliente,
        yaExistia: false,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al registrar cliente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al registrar el cliente" },
      { status: 500 }
    );
  }
}
