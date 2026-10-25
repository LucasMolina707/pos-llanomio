import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

export function generarArchivosExcelMuestra(carpetaDestino: string) {
  if (!fs.existsSync(carpetaDestino)) {
    fs.mkdirSync(carpetaDestino, { recursive: true });
  }

  // 1. Archivo de Clientes con tildes, eñes, formatos variados y duplicados
  const clientesData = [
    {
      "Identificacion": "1.121.890.123",
      "Nombre Completo": "  maría camila peña  ",
      "Telefono": "+57 (310) 123-4567",
      "Direccion": "Calle 15 # 22-10, Villavicencio",
      "Notas": "Cliente frecuente de alquiler joropo",
    },
    {
      "Identificacion": "86.050.124",
      "Nombre Completo": "JOSÉ OMAR ÑÁÑEZ",
      "Telefono": "320 987 6543",
      "Direccion": "Barrio Barzal Alto",
      "Notas": "Prefiere trajes en talla L",
    },
    {
      "Identificacion": "1.121.890.123", // Duplicado intencional con datos más recientes
      "Nombre Completo": "MARÍA CAMILA PEÑA RODRÍGUEZ",
      "Telefono": "3101234567",
      "Direccion": "Calle 15 # 22-10 Apto 201",
      "Notas": "Registro actualizado con dirección completa",
    },
    {
      "Identificacion": "900.543.210-9",
      "Nombre Completo": "ACADEMIA DE BAILE LLANERO EL GUATEQUE",
      "Telefono": "311 445 6677",
      "Direccion": "Avenida 40 # 12-45",
      "Notas": "Alquileres grupales para festivales",
    },
    {
      "Identificacion": "40.389.765",
      "Nombre Completo": "Esperanza Gómez de Muñoz",
      "Telefono": "+57 315-443-2211",
      "Direccion": "Carrera 30 # 18-05",
      "Notas": "Servicios de sastrería y arreglos",
    },
    {
      "Identificacion": "1.006.789.012",
      "Nombre Completo": "Juan Sebastián Cañón",
      "Telefono": "3125558899",
      "Direccion": "Manzana B Casa 4 La Esperanza",
      "Notas": "",
    },
    {
      "Identificacion": "86.050.124", // Duplicado intencional de José Omar
      "Nombre Completo": "José Omar Ñáñez Caicedo",
      "Telefono": "3209876543",
      "Direccion": "Barrio Barzal Alto Casa 12",
      "Notas": "Registro final verificado",
    },
  ];

  const wbClientes = XLSX.utils.book_new();
  const wsClientes = XLSX.utils.json_to_sheet(clientesData);
  XLSX.utils.book_append_sheet(wbClientes, wsClientes, "Clientes");
  const rutaClientes = path.join(carpetaDestino, "clientes_tienda.xlsx");
  XLSX.writeFile(wbClientes, rutaClientes);

  // 2. Archivo de Inventario de Prendas con precios variados, monedas y duplicados
  const inventarioData = [
    {
      "Codigo": "LL-001",
      "Descripcion": "Vestido de Joropo Tradicional Rojo Fuego",
      "Categoria": "Alquiler",
      "Talla": "M",
      "Color": "Rojo/Negro",
      "Stock": 3,
      "Estado": "Disponible",
      "Precio Venta": "$ 120.000",
      "Precio Alquiler": "$ 45.000",
      "Tarifa Mora Dia": "$ 15.000",
      "Tarifa Mora Hora": "2000",
    },
    {
      "Codigo": "LL-002",
      "Descripcion": "Traje Liqui Liqui Blanco Gala",
      "Categoria": "Alquiler",
      "Talla": "L",
      "Color": "Blanco",
      "Stock": 2,
      "Estado": "Disponible",
      "Precio Venta": "180000",
      "Precio Alquiler": "55000",
      "Tarifa Mora Dia": "20000",
      "Tarifa Mora Hora": "2500",
    },
    {
      "Codigo": "LL-003",
      "Descripcion": "Sombrero Peloeguama Llanero Auténtico",
      "Categoria": "Venta",
      "Talla": "Única",
      "Color": "Negro",
      "Stock": 5,
      "Estado": "Disponible",
      "Precio Venta": "95.000",
      "Precio Alquiler": "0",
      "Tarifa Mora Dia": "0",
      "Tarifa Mora Hora": "0",
    },
    {
      "Codigo": "LL-004",
      "Descripcion": "Cotizas de Cuero Tradicionales",
      "Categoria": "Venta",
      "Talla": "40",
      "Color": "Café",
      "Stock": 8,
      "Estado": "Disponible",
      "Precio Venta": "45.000",
      "Precio Alquiler": "0",
      "Tarifa Mora Dia": "0",
      "Tarifa Mora Hora": "0",
    },
    {
      "Codigo": "LL-005",
      "Descripcion": "Vestido Joropo Infantil Estampado Floral",
      "Categoria": "Alquiler",
      "Talla": "8",
      "Color": "Amarillo/Azul",
      "Stock": 1,
      "Estado": "Alquilado",
      "Precio Venta": "N/A", // Prueba de texto inválido a convertir a 0
      "Precio Alquiler": "$ 35.000",
      "Tarifa Mora Dia": "$ 10.000",
      "Tarifa Mora Hora": "$ 1.500",
    },
    {
      "Codigo": "LL-006",
      "Descripcion": "Camisa Vaquera Bordada Manga Larga",
      "Categoria": "Alquiler",
      "Talla": "XL",
      "Color": "Azul Oscuro",
      "Stock": 2,
      "Estado": "En Arreglo",
      "Precio Venta": "70000",
      "Precio Alquiler": "25000",
      "Tarifa Mora Dia": "8000",
      "Tarifa Mora Hora": "1000",
    },
    {
      "Codigo": "LL-007",
      "Descripcion": "Falda Llanera Campesina Doble Vuelo",
      "Categoria": "Alquiler",
      "Talla": "S",
      "Color": "Verde Esmeralda",
      "Stock": 2,
      "Estado": "Separado",
      "Precio Venta": "80000",
      "Precio Alquiler": "30000",
      "Tarifa Mora Dia": "10000",
      "Tarifa Mora Hora": "1500",
    },
    {
      "Codigo": "LL-001", // Duplicado intencional de LL-001 con descripción actualizada
      "Descripcion": "Vestido de Joropo Tradicional Rojo Fuego (Edición Especial)",
      "Categoria": "Alquiler",
      "Talla": "M",
      "Color": "Rojo/Negro",
      "Stock": 4,
      "Estado": "Disponible",
      "Precio Venta": "130000",
      "Precio Alquiler": "48000",
      "Tarifa Mora Dia": "15000",
      "Tarifa Mora Hora": "2000",
    },
  ];

  const wbInventario = XLSX.utils.book_new();
  const wsInventario = XLSX.utils.json_to_sheet(inventarioData);
  XLSX.utils.book_append_sheet(wbInventario, wsInventario, "Prendas");
  const rutaInventario = path.join(carpetaDestino, "inventario_prendas.xlsx");
  XLSX.writeFile(wbInventario, rutaInventario);

  console.log(`[EXCEL MUESTRA] Archivos generados exitosamente en: ${carpetaDestino}`);
  console.log(` - Clientes: ${rutaClientes}`);
  console.log(` - Inventario: ${rutaInventario}`);
}

if (require.main === module) {
  const rutaOrigen = path.join(process.cwd(), "migracion_excel", "origen");
  generarArchivosExcelMuestra(rutaOrigen);
}
