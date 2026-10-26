Manual Técnico Definitivo: Instalación y Configuración del Sistema POS "Llanomio"
1. Arquitectura y Requisitos Previos del Sistema Operativo
Sistema Operativo Compatible: Windows 10 o Windows 11 (Ediciones Home o Pro).
Entorno de Ejecución (Node.js): Se requiere instalar el motor oficial de Node.js en su versión LTS (Long Term Support) desde nodejs.org. Esto incluye automáticamente el gestor de paquetes npm.
Herramienta de Control de Versiones (Git): Necesaria para la descarga del código fuente desde el repositorio privado, disponible en git-scm.com.
2. Métodos de Adquisición del Código Fuente
El proyecto puede desplegarse en el equipo de mostrador mediante dos alternativas directas:
Método A: Descarga Directa desde GitHub
Abre la terminal de comandos (PowerShell) en la ruta del disco donde se alojará el sistema (por ejemplo, C:\Proyectos).
Clona el repositorio privado oficial utilizando el enlace del proyecto:
Bash
git clone https://github.com/LucasMolina707/pos-llanomio.git


Accede al directorio recién creado:
Bash
cd pos-llanomio


Método B: Instalación sin Conexión mediante Memoria USB
Conecta la memoria USB al equipo de mostrador.
Copia la carpeta contenedora del proyecto (que contiene previamente la estructura descargada de GitHub) y pégala en la ruta local del disco duro del nuevo equipo (por ejemplo, en C:\Proyectos\pos-llanomio).
Retira la memoria USB de manera segura e ingresa a la carpeta mediante la terminal de comandos.
3. Instalación de Dependencias y Estructura de Base de Datos
Estando ubicados dentro de la carpeta raíz del proyecto (C:\Proyectos\pos-llanomio) en la terminal:
Instala los paquetes y librerías necesarias para el funcionamiento del servidor web y los módulos de interfaz:
Bash
npm install


Ejecuta la inicialización y migración del esquema de base de datos local SQLite con Prisma ORM:
Bash
npx prisma migrate dev --name init

(Este comando genera automáticamente el archivo de base de datos llanomio.db dentro de la carpeta /database del sistema).
4. Automatización y Persistencia en Segundo Plano (PM2)
Para asegurar que la aplicación web de Next.js se ejecute de manera permanente en segundo plano y se recupere automáticamente ante posibles cortes de energía o reinicios del equipo de la tienda:
Instala y configura el administrador de procesos PM2 utilizando el archivo maestro del proyecto:
Bash
pm2 start ecosystem.config.js


Configura el servicio para que despegue automáticamente con el inicio de Windows y guarda el estado actual de los procesos:
Bash
pm2 startup
pm2 save


5. Configuración de Red Local (Acceso sin IPs complejas)
Para permitir que las tablets, celulares o equipos secundarios de los empleados interactúen con el POS desde cualquier lugar de la tienda mediante la red Wi-Fi local:
El servidor principal se encarga de exponer el servicio en el puerto estándar del navegador.
Puedes acceder directamente desde cualquier dispositivo conectado a la misma red escribiendo la dirección IP fija del equipo principal seguida del puerto (ejemplo: [http://192.168.1.50:3000](http://192.168.1.50:3000)) o mediante el servicio de resolución local configurado en la red del establecimiento.
6. Sistema de Respaldo Automático de Datos (Nube o Dispositivo Externo)
Para garantizar la seguridad de la información financiera, el inventario y las cuentas por cobrar de la sastrería y disfraces:
Sincronización Automática en Nube (Google Drive / OneDrive): Instala la aplicación de escritorio de tu servicio de nube preferido y apunta la carpeta de respaldos del POS para que el archivo de respaldo generado automáticamente mediante la función VACUUM INTO al cerrar sesión o cerrar caja (llanomio_ULTIMO.db y sus copias fechadas en /historial) se cargue en tiempo real a la nube.
Respaldo Físico Manual (USB o Dispositivo de Apoyo): Copia periódicamente los archivos de base de datos alojados en la carpeta /database hacia una unidad de almacenamiento externa conectada por USB para mantener copias físicas fuera del equipo de caja principal.
