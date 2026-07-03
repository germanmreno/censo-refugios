import { Router } from "express";
import type { Request, Response } from "express";
import venezuela from "shared/geo";

export const geoRouter = Router();

type Parroquia = { id: string; nombre: string };
type Municipio = { id: string; nombre: string; parroquias: Parroquia[] };
type Estado = { id: string; nombre: string; municipios: Municipio[] };

const estados = (venezuela as { estados: Estado[] }).estados;

// GET /api/geo/estados
geoRouter.get("/estados", (_req: Request, res: Response) => {
  res.json(estados.map((e) => ({ id: e.id, nombre: e.nombre })));
});

// GET /api/geo/municipios?estadoId=
geoRouter.get("/municipios", (req: Request, res: Response) => {
  const estadoId = String(req.query.estadoId ?? "");
  const estado = estados.find((e) => e.id === estadoId);
  if (!estado) {
    res.status(404).json({ error: "Estado no encontrado." });
    return;
  }
  res.json(estado.municipios.map((m) => ({ id: m.id, nombre: m.nombre })));
});

// GET /api/geo/parroquias?municipioId=&estadoId=
geoRouter.get("/parroquias", (req: Request, res: Response) => {
  const municipioId = String(req.query.municipioId ?? "");
  const estadoId = String(req.query.estadoId ?? "");
  const estado = estados.find((e) => e.id === estadoId);
  if (!estado) {
    res.status(404).json({ error: "Estado no encontrado." });
    return;
  }
  const municipio = estado.municipios.find((m) => m.id === municipioId);
  if (!municipio) {
    res.status(404).json({ error: "Municipio no encontrado." });
    return;
  }
  res.json(municipio.parroquias.map((p) => ({ id: p.id, nombre: p.nombre })));
});
