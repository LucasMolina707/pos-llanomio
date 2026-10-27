# REGISTRO MAESTRO DE USUARIOS, CREDENCIALES Y PROTOCOLO DE RECUPERACIÓN POS LLANOMIO

> **AVISO DE SEGURIDAD OPERATIVA:** Este documento reside en el servidor local de la tienda (`C:\Proyectos\pos-llanomio`). Contiene las credenciales base, la matriz oficial de roles y permisos (RBAC), el Protocolo Criptográfico de 3 Factores Locales contra SQLite (`database/llanomio.db`) y el registro auto-sincronizado de cuentas.

---

## 1. Credenciales Iniciales de Fábrica y Protocolo de Recuperación (3 Factores)

| Usuario (`username`) | Nombre Oficial | Rol | Contraseña Inicial Seed | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | Administrador Principal | `ADMIN` | `admin123` | Acceso total al sistema, configuración de empresa y alta de cajeros |

> **Nota:** La tienda arranca con una cuenta única de Administrador. Los cajeros y dependientes se crean a demanda desde el módulo **`/admin/usuarios`**.

### Protocolo Criptográfico de Restauración en Navegador (Anti-Hackeo 3 Factores)

Para restaurar la contraseña del Administrador directamente desde la pantalla de `/login`, el sistema exige superar simultáneamente un desafío criptográfico de **3 factores locales validados contra hashes bcrypt** en SQLite:

1. **Factor 1 - Identificación Registrada:** Cédula de Ciudadanía o NIT del titular asignado (Valor de fábrica: `0000000000`, personalizable en `/admin/usuarios`).
2. **Factor 2 - PIN de Seguridad de 6 Dígitos:** Código numérico confidencial (Valor de fábrica: `000000`, hasheado con `bcryptjs` en BD).
3. **Factor 3 - Pregunta y Respuesta de Seguridad:** Pregunta y respuesta secreta (Valor de fábrica: `llanomio`, hasheado con `bcryptjs` en BD).

> **Protección Anti-Fuerza Bruta en SQLite:** Si se introducen datos incorrectos 3 veces consecutivas, la cuenta entra en un bloqueo persistente en base de datos (`bloqueadoHasta`) durante **15 minutos**, impidiendo ataques por recarga de página o reinicio del navegador.

#### ¿Cómo restaurar una contraseña olvidada desde el navegador?
1. Dirígete a la pantalla de inicio de sesión (`http://llanomio.local/login` o `http://localhost:3000/login`).
2. Haz clic en el enlace discreto: **"Restaurar contraseña mediante verificación de identidad"**.
3. **Paso 1:** Ingresa el usuario (`admin`) y el Documento de Identidad registrado. El servidor verifica que la cuenta no esté bloqueada y retorna únicamente la pregunta secreta asignada.
4. **Paso 2:** Ingresa la Respuesta secreta, el PIN de Seguridad de 6 dígitos y la Nueva Contraseña (mínimo 6 caracteres).
5. Tras la validación criptográfica, el servidor actualiza la contraseña con hash `bcrypt` de 10 rondas, reinicia los contadores de intentos fallidos y autoriza el inicio de sesión.
6. *Nota para Cajeros:* Los cajeros pueden ser restaurados directamente por el Administrador en `/admin/usuarios` o verificando su identidad registrada.

---

## 2. Matriz Oficial de Roles y Permisos (RBAC)

El sistema opera bajo un modelo de control de acceso basado en roles con permisos granulares y visibilidad estricta:

| Permiso Operativo | Clave Interna | Administrador (`ADMIN`) | Cajero (`CAJERO`) | Visibilidad en Interfaz |
| :--- | :--- | :---: | :---: | :--- |
| **Facturación POS** | `pos_facturar` | **Activo** | **Activo** (Default) | Menú y mostrador visible |
| **Gestión de Cartera & Moras** | `pos_cobrar_cartera` | **Activo** | **Activo** (Default) | Menú y módulo de facturas visible |
| **Apertura & Cierre de Caja** | `caja_abrir_cerrar` | **Activo** | **Activo** (Default) | Control de turno y arqueo visible |
| **Creación Rápida de Inventario** | `inventario_crear_rapido` | **Activo** | *Configurable* | Botón de creación en POS |
| **Modificación Manual de Precios** | `pos_editar_precios` | **Activo** | *Configurable* | Edición de precio unitario en POS |
| **Catálogo & Inventario General** | Acceso a `/admin/inventario` | **Total** | *Oculto en DOM* | No se renderiza para Cajero; redirige a `/caja/pos` |
| **Dashboard Gerencial en Vivo** | Acceso a `/admin/dashboard` | **Total** | *Oculto en DOM* | No se renderiza para Cajero; redirige a `/caja/pos` |
| **Configuración Fiscal & Logo** | Acceso a `/admin/configuracion`| **Total** | *Oculto en DOM* | No se renderiza para Cajero; redirige a `/caja/pos` |
| **Gestión de Usuarios & Seguridad**| Acceso a `/admin/usuarios` | **Total** | *Oculto en DOM* | No se renderiza para Cajero; redirige a `/caja/pos` |

---

## 3. Directorio Auto-Sincronizado de Usuarios en SQLite (`database/llanomio.db`)

> **Última sincronización automática:** 26/10/2026, 11:51 p. m. (Hora Colombia)
> Total de cuentas registradas: **1** (1 Administradores, 0 Cajeros)

| Nombre Completo | Usuario (`username`) | Rol | Estado | Seguridad 3-Factores | Intentos Fallidos | Transacciones | Último Cambio de Clave |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| Administrador Principal | `admin` | `ADMIN` | **ACTIVO** | Protegido (3F) | 0 | 0 / 0 | Inicial (Seed) |

*Nota: Esta tabla se actualiza de forma automática cada vez que se crea, modifica o restaura una cuenta desde el panel `/admin/usuarios` o mediante la recuperación por 3 Factores en `/login`.*
