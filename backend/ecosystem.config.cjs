/**
 * Configuración de PM2 para el backend del Censo de Refugios.
 *
 * Uso:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   # seguir el comando sudo que imprime
 *
 * El backend se ejecuta con `tsx` (cargador de TypeScript para Node) en
 * lugar de `node dist/index.js`. Buscamos el binario cli.mjs de tsx en
 * backend/node_modules y, si no está (monorepo con hoisting), subimos
 * un nivel al node_modules raíz del workspace.
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
  throw new Error(
    "No se encontró tsx. Ejecuta `npm install` en la raíz del monorepo.",
  );
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
  ],
};

