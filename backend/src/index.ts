import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { loadEnv } from "./utils/env.js";
import { authRouter } from "./routes/auth.js";
import { usuariosRouter } from "./routes/usuarios.js";
import { refugiosRouter } from "./routes/refugios.js";
import { refugiadosRouter } from "./routes/refugiados.js";
import { geoRouter } from "./routes/geo.js";
import { statsRouter } from "./routes/stats.js";
import { auditoriaRouter } from "./routes/auditoria.js";
import { verificacionRouter } from "./routes/verificacion.js";
import { errorHandler } from "./middleware/errorHandler.js";

const { port, nodeEnv, isProd, corsOrigins } = loadEnv();

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

// CORS: aceptamos una lista de orígenes separados por coma en CORS_ORIGIN.
// Si el origin de la request está en la lista (o la lista contiene "*"),
// permitimos credenciales. Si no, devolvemos 403 sin CORS headers.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // mismo origin (server-to-server, fetch sin origin)
      if (corsOrigins.includes("*")) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use(morgan(isProd ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "censo-refugios-backend", env: nodeEnv, ts: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/refugios", refugiosRouter);
app.use("/api/refugiados", refugiadosRouter);
app.use("/api/geo", geoRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auditoria", auditoriaRouter);
app.use("/api/verificar", verificacionRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port} (${nodeEnv})`);
});

export default app;
