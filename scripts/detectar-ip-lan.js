// Script auxiliar para obtener la IP principal de la Red Local (LAN) sin errores de shell
const os = require('os');

function obtenerIpLan() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = '127.0.0.1';

  for (const nombre of Object.keys(interfaces)) {
    const list = interfaces[nombre] || [];
    for (const item of list) {
      if (item.family === 'IPv4' && !item.internal) {
        // Priorizar adaptadores típicos de red
        if (/wi-fi|ethernet|local|en0|eth0/i.test(nombre)) {
          return item.address;
        }
        fallbackIp = item.address;
      }
    }
  }
  return fallbackIp;
}

console.log(obtenerIpLan());

