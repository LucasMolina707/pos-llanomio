const path = require("path");

module.exports = {
  apps: [
    {
      name: "pos-llanomio",
      script: path.join(__dirname, "start-pos.js"),
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "pos-mdns-proxy",
      script: path.join(__dirname, "server-mdns.js"),
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        PORT_PROXY: "80",
        PORT_NEXT: "3000",
      },
    },
  ],
};
