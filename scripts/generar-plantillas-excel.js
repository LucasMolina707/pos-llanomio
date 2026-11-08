const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const dirSalida = path.join(__dirname, "..", "plantillas_excel");
if (!fs.existsSync(dirSalida)) {
  fs.mkdirSync(dirSalida, { recursive: true });
}

// 1. Plantilla de Clientes
const datosClientes = [
  {
    "Cédula / Documento": "1002345678",
    "Nombre Completo": "Carlos Andrés Gómez Pérez",
    "Teléfono Principal": "3101234567",
    "Teléfono Secundario": "3209876543",
    "Dirección": "Calle 45 # 12-34 Barrio Centro",
    "Email": "carlos.gomez@ejemplo.com",
    "Notas": "Cliente preferencial de alquileres"
  },
  {
    "Cédula / Documento": "52987654",
    "Nombre Completo": "María Fernanda López",
    "Teléfono Principal": "3154567890",
    "Teléfono Secundario": "",
    "Dirección": "Carrera 7 # 89-10",
    "Email": "maria.lopez@ejemplo.com",
    "Notas": "Talla M / Vestidos de gala"
  }
];

const wbClientes = XLSX.utils.book_new();
const wsClientes = XLSX.utils.json_to_sheet(datosClientes);
wsClientes["!cols"] = [
  { wch: 20 },
  { wch: 30 },
  { wch: 20 },
  { wch: 20 },
  { wch: 35 },
  { wch: 28 },
  { wch: 35 }
];
XLSX.utils.book_append_sheet(wbClientes, wsClientes, "Clientes");
const rutaClientes = path.join(dirSalida, "Plantilla_Carga_Clientes.xlsx");
XLSX.writeFile(wbClientes, rutaClientes);
console.log("[OK] Generada:", rutaClientes);

// 2. Plantilla de Inventario / Prendas
const datosInventario = [
  {
    "Código": "TRA-001",
    "Nombre del Producto / Prenda": "Traje Smoking Clásico Negro",
    "Tipo (VENTA o ALQUILER)": "ALQUILER",
    "Categoría": "TRAJES DE GALA",
    "Talla": "38R",
    "Color": "Negro",
    "Stock Actual": 5,
    "Precio Venta": 0,
    "Precio Alquiler": 120000,
    "Valor Depósito": 50000,
    "Descripción": "Incluye saco, pantalón y chaleco"
  },
  {
    "Código": "CAM-002",
    "Nombre del Producto / Prenda": "Camisa Cuello Francés Blanca",
    "Tipo (VENTA o ALQUILER)": "VENTA",
    "Categoría": "CAMISAS",
    "Talla": "M",
    "Color": "Blanco",
    "Stock Actual": 15,
    "Precio Venta": 65000,
    "Precio Alquiler": 0,
    "Valor Depósito": 0,
    "Descripción": "Algodón 100% corte slim fit"
  }
];

const wbInventario = XLSX.utils.book_new();
const wsInventario = XLSX.utils.json_to_sheet(datosInventario);
wsInventario["!cols"] = [
  { wch: 15 },
  { wch: 32 },
  { wch: 24 },
  { wch: 20 },
  { wch: 10 },
  { wch: 12 },
  { wch: 14 },
  { wch: 16 },
  { wch: 16 },
  { wch: 16 },
  { wch: 35 }
];
XLSX.utils.book_append_sheet(wbInventario, wsInventario, "Inventario");
const rutaInventario = path.join(dirSalida, "Plantilla_Carga_Inventario.xlsx");
XLSX.writeFile(wbInventario, rutaInventario);
console.log("[OK] Generada:", rutaInventario);

