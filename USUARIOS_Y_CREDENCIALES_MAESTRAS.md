# REGISTRO MAESTRO DE USUARIOS, CREDENCIALES Y RECUPERACIÓN POS LLANOMIO

> **AVISO DE SEGURIDAD OPERATIVA:** Este documento reside en el servidor local de la tienda (`C:\Proyectos\pos-llanomio`). Contiene las credenciales por defecto, la matriz oficial de roles y permisos (RBAC), el PIN Maestro de Emergencia y la tabla auto-sincronizada de cuentas activas en SQLite (`database/llanomio.db`).

---

## 1. Credenciales Iniciales y Llave Maestra de Recuperación

| Usuario (`username`) | Nombre Oficial | Rol | Contraseña Inicial Seed | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | Administrador General | `ADMIN` | `admin123` | Acceso total al sistema, auditoría, configuración y gestión de personal |
| **`cajero`** | Cajero Principal | `CAJERO` | `cajero123` | Facturación ágil en mostrador, abonos y atención al cliente |

### Llave Maestra de Restauración en Navegador (`MASTER_RECOVERY_KEY`)
```text
LLANOMIO-ADMIN-2026
```

#### ¿Cómo restaurar una contraseña olvidada directamente desde el navegador?
1. Dirígete a la pantalla de inicio de sesión (`http://llanomio.local/login` o `http://localhost/login`).
2. Haz clic en el enlace inferior: **"¿Olvidaste tu contraseña? Restaurar acceso aquí"**.
3. Selecciona o escribe el usuario que deseas restaurar (ej: `admin` o cualquier cajero).
4. Ingresa la **Llave Maestra de Recuperación Local**: `LLANOMIO-ADMIN-2026`.
5. Define la **Nueva Contraseña** y haz clic en **"Confirmar y Restablecer Contraseña"**.
6. El sistema actualizará el hash de seguridad en SQLite inmediatamente y podrás iniciar sesión sin reiniciar el servidor ni usar comandos de consola.

---

## 2. Matriz Oficial de Roles y Permisos (RBAC)

El sistema opera bajo un modelo de control de acceso basado en roles con permisos granulares configurables por el Administrador:

| Permiso Operativo | Clave Interna | Administrador (`ADMIN`) | Cajero (`CAJERO`) | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| **Facturación POS** | `pos_facturar` | **Activo** | **Activo** (Default) | Emitir facturas de venta, alquiler de prendas y confección/arreglos |
| **Gestión de Cartera & Moras** | `pos_cobrar_cartera` | **Activo** | **Activo** (Default) | Registrar abonos, liquidar recargos de mora y emitir Paz y Salvos |
| **Apertura & Cierre de Caja** | `caja_abrir_cerrar` | **Activo** | **Activo** (Default) | Abrir turno (Compartida o Dividida) y realizar arqueo de gaveta física |
| **Creación Rápida de Inventario** | `inventario_crear_rapido` | **Activo** | *Configurable* | Crear prendas/servicios directamente desde el modal del mostrador |
| **Modificación Manual de Precios** | `pos_editar_precios` | **Activo** | *Configurable* | Modificar el precio unitario base de una prenda o arreglo en mostrador |
| **Catálogo & Precios Generales** | Acceso a `/admin/inventario` | **Total** | *Restringido* | Gestión completa del stock, precios base, tallas y prendas de alquiler |
| **Dashboard Gerencial en Vivo** | Acceso a `/admin/dashboard` | **Total** | *Restringido* | Analítica de ingresos, cuentas por cobrar y rentabilidad en tiempo real |
| **Configuración Fiscal & Logo** | Acceso a `/admin/configuracion`| **Total** | *Restringido* | Razón social, NIT, resolución, logo comercial y carpetas de respaldo |
| **Gestión de Usuarios & Claves** | Acceso a `/admin/usuarios` | **Total** | *Restringido* | Crear cajeros, asignar permisos y cambiar claves en un clic |

---

## 3. Directorio Auto-Sincronizado de Usuarios en SQLite (`database/llanomio.db`)

> **Última sincronización automática:** 25/10/2026, 11:31 p. m. (Hora Colombia)
> Total de cuentas registradas: **5** (1 Administradores, 4 Cajeros)

| Nombre Completo | Usuario (`username`) | Rol | Estado | Permisos Asignados | Transacciones (Fac / Abono) | Último Cambio de Clave |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| Administrador General | `admin` | `ADMIN` | **ACTIVO** | Facturar, Cobrar, Control Caja, Crear Productos, Editar Precios | 29 / 25 | 25/10/2026 |
| Cajero Principal | `cajero` | `CAJERO` | **ACTIVO** | Facturar, Cobrar, Control Caja | 0 / 0 | Inicial (Seed) |
| Cajero Dos (Laura) | `cajero2_test` | `CAJERO` | **ACTIVO** | Facturar, Cobrar, Control Caja | 0 / 0 | Inicial (Seed) |
| Cajero Tres (Carlos) | `cajero3_test` | `CAJERO` | **ACTIVO** | Facturar, Cobrar, Control Caja | 0 / 0 | Inicial (Seed) |
| Cajera Turno Tarde QA | `otro_cajero_qa` | `CAJERO` | **ACTIVO** | Facturar, Cobrar, Control Caja | 0 / 6 | Inicial (Seed) |

*Nota: Esta tabla se actualiza de forma automática cada vez que se crea, modifica o restaura una cuenta desde el panel `/admin/usuarios` o mediante la recuperación con Llave Maestra en `/login`.*
