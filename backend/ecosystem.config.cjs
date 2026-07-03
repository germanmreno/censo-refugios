/**
 * Configuración de PM2 para el stack completo del Censo de Refugios.
 *
 * Levanta DOS procesos:
 *   1. censo-backend    → API Express en puerto 3016
 *   2. censo-frontend   → Servidor estático del frontend (Vite build) en 3017
 *
 * Para HTTPS, caché y compresión, usar Nginx como reverse proxy delante
 * de estos procesos (ver docs/DEPLOY.md).
 *
 * Uso:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */

const path = require("path");
const fs = require("fs");

function findTsxCli() {
  const candidates = [
    path.resolve(__dirname, "node_modules/tsx/dist/cli.mjs"),
    path.resolve(__dirname, "../node_modules/tsx/dist/cli.mjs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("No se encontró tsx. Ejecuta `npm install` en la raíz del monorepo.");
}

module.exports = {
  apps: [
    {
      name: "censo-backend",
      cwd: __dirname,
      script: findTsxCli(),
      args: "src/index.ts",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3016,
      },
      max_memory_restart: "300M",
      error_file: "/var/log/censo-refugios/backend-error.log",
      out_file: "/var/log/censo-refugios/backend-out.log",
      time: true,
      autorestart: true,
    },
    {
      name: "censo-frontend",
      cwd: path.resolve(__dirname, "../frontend"),
      script: path.resolve(__dirname, "../frontend/serve.mjs"),
      instances: 1,
      exec_mode: "fork",
      env: {
        PORT_FRONTEND: 3017,
      },
      max_memory_restart: "200M",
      error_file: "/var/log/censo-refugios/frontend-error.log",
      out_file: "/var/log/censo-refugios/frontend-out.log",
      time: true,
      autorestart: true,
    },
  ],
};
