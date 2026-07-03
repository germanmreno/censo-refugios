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

const { port, nodeEnv, isProd, corsOrigin } = loadEnv();

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
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
