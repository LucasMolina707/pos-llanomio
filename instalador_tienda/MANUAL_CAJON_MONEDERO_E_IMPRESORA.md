# MANUAL OPERATIVO: CONEXIÓN, CONFIGURACIÓN Y APERTURA DE CAJÓN MONEDERO
**Sistema POS LLANOMIO · Conexión RJ11/RJ12 mediante Impresora Térmica ESC/POS**

---

## 1. INTRODUCCIÓN Y ARQUITECTURA DE HARDWARE

En los puntos de venta profesionales (POS), el cajón monedero (gaveta de dinero) **no se conecta directamente por USB al computador**, sino mediante un cable telefónico estándar **RJ11 / RJ12 de 6 hilos** conectado al puerto trasero de la **impresora térmica de recibos** (80mm o 58mm).

El puerto en la impresora viene marcado usualmente con las siglas **DK**, **DRAWER** o un ícono de gaveta/dinero. La impresora recibe un pulso electromagnético de bajo voltaje (12V o 24V según el modelo) que activa el electroimán del pestillo mecánico, empujando la gaveta hacia afuera con su resorte interno.

```text
[ COMPUTADOR POS WINDOWS ] 
           │
           │ (Cable USB)
           ▼
[ IMPRESORA TÉRMICA POS-80 / POS-58 ] ──(Cable RJ11 / DK)──► [ CAJÓN MONEDERO ]
           │
     (Spooler RAW ESC/POS)
```

El Sistema POS LLANOMIO cuenta con un **motor local Windows** integrado en Node.js que envía la secuencia de bytes **ESC/POS RAW** directamente al Spooler de impresión de Windows (`winspool.drv`), logrando una apertura instantánea en menos de 300 milisegundos **sin imprimir papel, sin hacer avanzar la bobina térmica y sin abrir ventanas emergentes del navegador**.

---

## 2. GUÍA DE CONEXIÓN FÍSICA PASO A PASO

Siga este procedimiento físico antes de encender los equipos:

1. **Ubicación del Cajón y la Impresora:**
   - Coloque la impresora térmica sobre el cajón monedero o sobre el mostrador junto a la pantalla del operador.
2. **Conexión del Cable RJ11:**
   - Tome el cable telefónico que sale de la parte trasera del cajón monedero.
   - Conéctelo en la ranura marcada como **DK** o **Drawer** en el panel trasero de la impresora térmica hasta escuchar un *clic* de seguro.
3. **Conexión de la Impresora al PC:**
   - Conecte el cable de poder de la impresora al tomacorriente.
   - Conecte el cable USB de la impresora al computador con Windows.
   - Encienda la impresora térmica (verifique que el LED de encendido esté en verde o azul y tenga papel térmico cargado).
4. **Posición de la Llave Física Frontal (MUY IMPORTANTE):**
   - El cajón monedero dispone de una cerradura frontal con 3 posiciones:
     - **Posición Vertical (12 en punto / Neutro):** MODO APERTURA ELECTRÓNICA. En esta posición el cajón está desbloqueado para que el sistema informático lo abra automáticamente o mediante el botón de pantalla. **Esta es la posición operativa normal de trabajo diario.**
     - **Posición Derecha (Giro hacia las 3 en punto):** APERTURA MANUAL CON LLAVE. Abre el cajón mecánicamente cuando no hay electricidad o la impresora está apagada.
     - **Posición Izquierda (Giro hacia las 9 en punto):** BLOQUEO FÍSICO / SEGURO TOTAL. En esta posición el pestillo mecánico queda trancado y **ningún pulso informático podrá abrir el cajón**. Utilice esta posición únicamente al cerrar la tienda de noche para seguridad.

---

## 3. CONFIGURACIÓN EN EL PANEL ADMINISTRATIVO (`/admin/configuracion`)

Una vez conectado el hardware, ingrese al sistema con su usuario Administrador y configure el dispositivo:

1. En el menú superior o lateral, ingrese a **Configuración de Sitio y Factura** (`/admin/configuracion`).
2. Desplácese hasta la sección **"Hardware POS: Impresora Térmica y Cajón Monedero RJ11"**.
3. Haga clic en el botón **"Detectar Impresoras"**:
   - El sistema ejecutará un escaneo nativo de Windows y desplegará en la lista desplegable todas las impresoras instaladas en el computador (ej: `POS-80`, `POS-58`, `Xprinter`, `Epson TM-T20`, etc.).
4. **Seleccione su Impresora Térmica:**
   - Elija el nombre de la impresora que tiene conectado físicamente el cable del cajón. Si deja la opción *"Impresora Predeterminada de Windows"*, el sistema disparará la apertura en la impresora fijada por defecto en Windows.
5. **Selector de Pin del Puerto DK:**
   - **Pin 2 (Recomendado):** Estándar universal compatible con Epson, Xprinter, 3nStar, POS-80, SAT y la mayoría de cajones monederos del mercado colombiano.
   - **Pin 5:** Utilizado por algunas marcas como Bixolon o Citizen.
   - **Pulso Dual (Universal):** Envía ambos pulsos seguidos para máxima compatibilidad si desconoce el pin exacto de su cajón.
6. **Apertura Automática al Cobrar en Efectivo:**
   - Active este switch si desea que cada vez que confirme una venta, alquiler, apartado o liquidación de depósito pagada en **EFECTIVO**, el cajón se abra solo de inmediato.
7. **Prueba en Vivo:**
   - Presione el botón **"Probar Apertura de Cajón Ahora"**.
   - El cajón debe abrirse instantáneamente. Si el cajón no abre, verifique que la llave esté en posición vertical y que la impresora esté encendida.
8. Haga clic en **"Guardar Configuración de Facturación"** al final de la página.

---

## 4. GUÍA OPERATIVA: ¿CUÁNDO ABRE SOLO Y CUÁNDO USAR EL BOTÓN MANUAL?

Esta sección es fundamental para capacitar a los cajeros y administradores del mostrador.

### A. CUÁNDO NO NECESITAS USAR EL BOTÓN MANUAL (APERTURA AUTOMÁTICA)

El cajón monedero **abrirá de manera automática** sin tocar ningún botón adicional en las siguientes operaciones de caja:

1. **Al Finalizar una Venta o Arreglo en Efectivo (`/caja/pos`):**
   - Cuando en el Paso 3 se cobra en `EFECTIVO` y se presiona *"Finalizar Venta y Generar Factura"*, el cajón abre solo para que el cajero reciba los billetes y entregue las vueltas calculadas por el sistema.
2. **Al Confirmar un Alquiler con Depósito en Efectivo (`/caja/alquileres`):**
   - Cuando se registra el contrato de alquiler en el Paso 3 recibiendo el depósito de garantía en efectivo o el pago del canon en efectivo.
3. **Al Registrar un Apartado o Reserva en Efectivo (`/caja/apartados`):**
   - Al registrar la separación de la prenda con abono en efectivo en el Paso 3.
4. **Al Liquidar un Alquiler con Devolución de Depósito en Efectivo:**
   - Cuando el cliente devuelve las prendas en buen estado y desde el historial se liquida el depósito para entregarle sus billetes en custodia.
5. **Al Registrar un Abono Posterior en Efectivo:**
   - Cuando un cliente con saldo pendiente realiza un pago posterior en efectivo desde el centro de historial.

---

### B. CUÁNDO SÍ DEBES USAR EL BOTÓN MANUAL `"Abrir Cajón"` (O TECLA F9)

El botón manual **`"Abrir Cajón"`** está visible permanentemente en la barra superior de las 3 terminales de mostrador (`/caja/pos`, `/caja/alquileres`, `/caja/apartados`), en la consola de impresión del Paso 4 y en el panel de **Control de Caja** (`/admin/caja`).

Debe utilizar este botón manual en las siguientes **5 situaciones operativas exactas**:

#### 1. AL ABRIR EL TURNO DE CAJA EN LA MAÑANA (BASE INICIAL)
- **Situación:** El administrador o cajero llega en la mañana, ingresa a `/admin/caja` o abre la terminal y va a ingresar la **Base Inicial de Efectivo** (ej: $100.000 en billetes y monedas para dar cambio durante el día).
- **Cómo proceder:** Antes de empezar a vender, presiona el botón **`"Abrir Cajón"`**, selecciona el motivo **`"Ingresar Base Inicial / Efectivo a Gaveta"`**, deposita el dinero en las divisiones correspondientes y empuja suavemente el cajón para cerrarlo.

#### 2. PARA CAMBIAR UN BILLETE POR SENCILLO (SIN VENTA)
- **Situación:** Un cliente que está esperando, un proveedor o un compañero de trabajo necesita cambiar un billete de $50.000 o $100.000 por billetes de menor denominación o monedas para el transporte, **sin que exista una compra o factura**.
- **Cómo proceder:** Presione **`"Abrir Cajón"`** (o la tecla rápida **`F9`**), seleccione el motivo **`"Dar cambio / Cambiar billete por sencillo"`**, guarde el billete grande, tome el sencillo equivalente y cierre el cajón.

#### 3. CUANDO EL CLIENTE PAGA POR NEQUI O TRANSFERENCIA PERO DEJA DEPÓSITO FÍSICO
- **Situación:** En un contrato de alquiler o apartado, el cliente transfiere el valor del alquiler por Nequi o Bancolombia, pero entrega los $50.000 del depósito de garantía en billetes físicos en mano, o viceversa, y el operador necesita guardar el dinero de garantía antes de cerrar la factura.
- **Cómo proceder:** Presione **`"Abrir Cajón"`**, seleccione el motivo **`"Custodia o Revisión de Depósito en Efectivo"`** y almacene la garantía en la gaveta con seguridad.

#### 4. SI EL CAJÓN TENÍA EL SEGURO PUESTO AL FACTURAR
- **Situación:** El cajero completó la venta y presionó *"Finalizar Venta"*, pero el cajón no se abrió porque tenía la llave física puesta en posición de seguro horizontal, o porque alguien estaba apoyado físicamente sobre la gaveta impidiendo que el pestillo saltara.
- **Cómo proceder:** Gire la llave física a posición vertical. Ahora, **en lugar de volver a cobrar o generar una factura falsa**, simplemente presione el botón **`"Abrir Cajón"`** que aparece en el banner superior del **Paso 4** (o en la barra de controles de la factura) para abrir la gaveta de inmediato sin alterar los registros contables.

#### 5. EN EL CIERRE DIARIO Y ARQUEO DE CAJA (`/admin/caja`)
- **Situación:** Al final de la jornada laboral, el cajero debe realizar el arqueo formal de caja, contar físicamente los billetes y monedas existentes y confrontarlos contra el total esperado por el sistema.
- **Cómo proceder:** Ingrese a `/admin/caja`, presione el botón **`"Abrir Cajón"`**, seleccione el motivo **`"Conteo de Arqueo / Verificación de Caja"`**, extraiga los billetes y monedas, realice el conteo físico, digite el monto en el formulario de arqueo con su nota de novedad y proceda al cierre del turno.

---

## 5. TRAZABILIDAD Y AUDITORÍA DE APERTURAS MANUALES

Para prevenir faltantes de dinero y garantizar transparencia entre cajeros en turnos compartidos:

1. Cada vez que se presiona el botón manual `"Abrir Cajón"`, el sistema despliega un micro-modal de 1 solo clic con los motivos operativos autorizados:
   - *Dar cambio / Cambiar billete por sencillo*
   - *Ingresar Base Inicial / Efectivo a Gaveta*
   - *Conteo de Arqueo / Verificación de Caja*
   - *Custodia o Revisión de Depósito en Efectivo*
   - *Otro motivo operativo autorizado*
2. Al seleccionar el motivo, el servidor local registra internamente el usuario autenticado, la fecha, la hora exacta y el motivo seleccionado en los registros del servidor.

---

## 6. PREGUNTAS FRECUENTES Y SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)

| Problema | Causa Probable | Solución |
| :--- | :--- | :--- |
| **El cajón no abre al presionar el botón ni al facturar.** | La llave física está en posición de seguro horizontal (bloqueo total). | Gire la llave física a posición vertical (12 en punto). |
| **La impresora imprime pero el cajón no dispara.** | El cable RJ11 está conectado al puerto telefónico incorrecto o está flojo. | Verifique que el conector esté firmemente encajado en el puerto marcado como `DK` detrás de la impresora. |
| **Aparece *"Modo seguro / simulación"* al probar el cajón.** | No se ha seleccionado una impresora térmica física en `/admin/configuracion` o está apagada. | Encienda la impresora por USB, vaya a `/admin/configuracion`, pulse *"Detectar Impresoras"* y elija su modelo térmico. |
| **El cajón abre con una marca de impresora pero no con otra.** | El modelo requiere el Pin 5 en lugar del Pin 2. | Cambie el selector a *"Pulso Dual"* o *"Pin 5"* en `/admin/configuracion`. |
| **El cajón hace clic pero no se desliza hacia afuera.** | Los rieles tienen polvo acumulado o los resortes mecánicos tienen baja tensión. | Retire la gaveta, limpie los rieles metálicos con un paño seco y aplique una gota de lubricante seco en los rodamientos. |

---
*Manual verificado para la suite POS LLANOMIO · Actualizado en Octubre de 2026.*
