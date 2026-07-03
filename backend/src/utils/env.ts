import "dotenv/config";

const required = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;

const ADMIN_REQUIRED = ["ADMIN_CEDULA", "ADMIN_NOMBRE", "ADMIN_APELLIDO", "ADMIN_PASSWORD"] as const;

const defaults: Record<string, string> = {
  PORT: "4000",
  NODE_ENV: "development",
  CORS_ORIGIN: "http://localhost:5173",
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "7d",
};

export function loadEnv() {
  for (const k of required) {
    if (!process.env[k]) {
      throw new Error(`Falta la variable de entorno obligatoria: ${k}`);
    }
  }
  for (const [k, v] of Object.entries(defaults)) {
    if (!process.env[k]) process.env[k] = v;
  }

  if (process.env.NODE_ENV === "production") {
    for (const k of ADMIN_REQUIRED) {
      // En producción el seed ya debió correr; sólo advertimos si faltan.
      if (!process.env[k]) {
        console.warn(`[advertencia] ${k} no definida: el seed del admin raíz no podrá ejecutarse.`);
      }
    }
    if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length < 32) {
      console.warn("[advertencia] JWT_ACCESS_SECRET debería tener al menos 32 caracteres en producción.");
    }
  }

  return {
    port: Number(process.env.PORT),
    nodeEnv: process.env.NODE_ENV!,
    isProd: process.env.NODE_ENV === "production",
    corsOrigin: process.env.CORS_ORIGIN!,
  };
}
