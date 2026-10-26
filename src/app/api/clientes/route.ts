import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularDigitoVerificacionDIAN, validarEmail } from "@/lib/dian-utils";

/**
 * GET /api/clientes
 * Carga completa de clientes ordenados por más recientes / frecuentes
 * con soporte de búsqueda multi-campo (documento, nombre, razón social, teléfono, email, dirección).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
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
              { email: { contains: token } },
              { direccion: { contains: token } },
              { notas: { contains: token } },
            ],
          })),
        };
      }
    }

    const clientes = await prisma.cliente.findMany({
      where,
      take: limite || undefined,
      orderBy: [
        { updatedAt: "desc" },
        { fechaCreacion: "desc" },
        { nombre: "asc" },
      ],
      select: {
        id: true,
        documento: true,
        nombre: true,
        telefono: true,
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

    return NextResponse.json({
      success: true,
      clientes,
      total: clientes.length,
    });
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

    const docSanitizado = documento.trim().toUpperCase();
    const nombreSanitizado = nombre.trim().toUpperCase();
    const telSanitizado = telefono ? telefono.trim().replace(/[^\d+]/g, "") : null;
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
