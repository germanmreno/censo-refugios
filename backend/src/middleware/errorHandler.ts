import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Datos inválidos.", detalles: err.flatten() });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
}
