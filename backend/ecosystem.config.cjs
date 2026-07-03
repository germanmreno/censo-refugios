/**
 * Configuración de PM2 para el backend del Censo de Refugios.
 *
 * Uso:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   # seguir el comando sudo que imprime
 *
 * Nota: usamos `tsx` para arrancar el TS directamente. Esto evita tener
 * que compilar `shared/` a JS aparte (el backend importa tipos y valores
 * runtime de `shared`, y `tsx` resuelve los `.ts` sin necesidad de un
 * paso de build adicional para el shared). PM2 carga `tsx` desde
 * node_modules/.
 */

module.exports = {
  apps: [
    {
      name: "censo-backend",
      cwd: __dirname,
      script: "src/index.ts",
      interpreter: "node_modules/.bin/tsx",
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

