import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma.js";
import { authGuard, requireRole } from "../middleware/auth.js";
import { RolUsuario } from "shared";

export const auditoriaRouter = Router();

auditoriaRouter.use(authGuard, requireRole(RolUsuario.ADMINISTRADOR));

// GET /api/auditoria?entidad=&accion=&usuarioId=&page=&pageSize=
auditoriaRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 50)));

    const where: Record<string, unknown> = {};
    if (typeof req.query.entidad === "string" && req.query.entidad) where.entidad = req.query.entidad;
    if (typeof req.query.accion === "string" && req.query.accion) where.accion = req.query.accion;
    if (typeof req.query.usuarioId === "string" && req.query.usuarioId) where.usuarioId = req.query.usuarioId;

    const [total, items] = await Promise.all([
      prisma.auditoria.count({ where }),
      prisma.auditoria.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          usuario: {
            select: { id: true, nombre: true, apellido: true, cedula: true, rol: true },
          },
        },
      }),
    ]);

    res.json({ total, page, pageSize, items });
  } catch (err) {
    next(err);
  }
});
