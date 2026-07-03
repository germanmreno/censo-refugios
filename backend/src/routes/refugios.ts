import { z } from "zod";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma.js";
import { authGuard, requireRole } from "../middleware/auth.js";
import { logAuditoria } from "../utils/auditoria.js";
import { refugiosVisiblesIds, verificarAccesoRefugio } from "../services/refugioAccess.js";
import { RolUsuario } from "shared";

export const refugiosRouter = Router();

refugiosRouter.use(authGuard);

const aulaSchema = z.object({
  nombre: z.string().min(1).max(100),
  capacidad: z.number().int().positive().optional(),
});

const crearRefugioSchema = z.object({
  nombre: z.string().min(1).max(200),
  capacidadEstimada: z.number().int().positive(),
  ubicacion: z.string().min(1).max(500),
  aulas: z.array(aulaSchema).max(100).default([]),
});

const actualizarRefugioSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  capacidadEstimada: z.number().int().positive().optional(),
  ubicacion: z.string().min(1).max(500).optional(),
});

const aulaCrearSchema = z.object({
  nombre: z.string().min(1).max(100),
  capacidad: z.number().int().positive().optional(),
});

// GET /api/refugios  (admin: todos; funcionario: solo sus refugios)
refugiosRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permitidos = await refugiosVisiblesIds(req);
    const refugios = await prisma.refugio.findMany({
      where: permitidos === null ? undefined : { id: { in: permitidos } },
      orderBy: { nombre: "asc" },
      include: {
        _count: { select: { refugiados: { where: { deletedAt: null } } } },
        aulas: { orderBy: { nombre: "asc" } },
      },
    });
    res.json(
      refugios.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        capacidadEstimada: r.capacidadEstimada,
        ubicacion: r.ubicacion,
        ocupacionActual: r._count.refugiados,
        aulas: r.aulas,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/refugios/:id
refugiosRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acceso = await verificarAccesoRefugio(req, res, req.params.id);
    if (!acceso.ok) return;
    const refugio = await prisma.refugio.findUnique({
      where: { id: acceso.refugioId },
      include: {
        aulas: {
          orderBy: { nombre: "asc" },
          include: { _count: { select: { refugiados: { where: { deletedAt: null } } } } },
        },
        _count: { select: { refugiados: { where: { deletedAt: null } } } },
      },
    });
    res.json(refugio);
  } catch (err) {
    next(err);
  }
});

// GET /api/refugios/:id/ocupacion
refugiosRouter.get("/:id/ocupacion", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acceso = await verificarAccesoRefugio(req, res, req.params.id);
    if (!acceso.ok) return;
    const id = acceso.refugioId;

    const refugio = await prisma.refugio.findUniqueOrThrow({ where: { id } });

    const [total, jefes] = await Promise.all([
      prisma.refugiado.count({ where: { refugioId: id, deletedAt: null } }),
      prisma.refugiado.count({
        where: { refugioId: id, deletedAt: null, jefeFamilia: true },
      }),
    ]);

    const aulas = await prisma.aula.findMany({
      where: { refugioId: id },
      select: {
        id: true,
        nombre: true,
        capacidad: true,
        _count: { select: { refugiados: { where: { deletedAt: null } } } },
      },
      orderBy: { nombre: "asc" },
    });

    const sinAula = await prisma.refugiado.count({
      where: { refugioId: id, deletedAt: null, aulaId: null },
    });

    res.json({
      refugioId: id,
      nombre: refugio.nombre,
      capacidadEstimada: refugio.capacidadEstimada,
      ocupacionActual: total,
      jefesFamilia: jefes,
      sinAula,
      disponibles: Math.max(0, refugio.capacidadEstimada - total),
      porcentajeOcupacion:
        refugio.capacidadEstimada > 0
          ? Math.round((total / refugio.capacidadEstimada) * 100)
          : 0,
      aulas: aulas.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        capacidad: a.capacidad,
        ocupacion: a._count.refugiados,
        disponibles: a.capacidad ? Math.max(0, a.capacidad - a._count.refugiados) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/refugios  (solo admin)
refugiosRouter.post(
  "/",
  requireRole(RolUsuario.ADMINISTRADOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = crearRefugioSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Datos inválidos.", detalles: parsed.error.flatten() });
        return;
      }
      const { nombre, capacidadEstimada, ubicacion, aulas } = parsed.data;

      const refugio = await prisma.refugio.create({
        data: {
          nombre,
          capacidadEstimada,
          ubicacion,
          aulas:
            aulas.length > 0
              ? { createMany: { data: aulas.map((a) => ({ nombre: a.nombre, capacidad: a.capacidad ?? null })) } }
              : undefined,
        },
        include: { aulas: true },
      });

      await logAuditoria(req.user!.sub, "create", "refugio", refugio.id, { nombre });

      res.status(201).json(refugio);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/refugios/:id  (solo admin)
refugiosRouter.patch(
  "/:id",
  requireRole(RolUsuario.ADMINISTRADOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acceso = await verificarAccesoRefugio(req, res, req.params.id);
      if (!acceso.ok) return;
      const parsed = actualizarRefugioSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Datos inválidos.", detalles: parsed.error.flatten() });
        return;
      }
      const refugio = await prisma.refugio.update({
        where: { id: acceso.refugioId },
        data: parsed.data,
        include: { aulas: true },
      });
      await logAuditoria(req.user!.sub, "update", "refugio", refugio.id, parsed.data);
      res.json(refugio);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/refugios/:id  (solo admin) — bloquea si tiene refugiados activos
refugiosRouter.delete(
  "/:id",
  requireRole(RolUsuario.ADMINISTRADOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acceso = await verificarAccesoRefugio(req, res, req.params.id);
      if (!acceso.ok) return;
      const id = acceso.refugioId;

      const activos = await prisma.refugiado.count({ where: { refugioId: id, deletedAt: null } });
      if (activos > 0) {
        res.status(409).json({
          error: `No se puede eliminar: el refugio tiene ${activos} refugiado(s) activo(s). Reasigne o elimine primero los registros.`,
        });
        return;
      }

      await prisma.refugio.delete({ where: { id } });
      await logAuditoria(req.user!.sub, "delete", "refugio", id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Aulas ───

// POST /api/refugios/:id/aulas  (solo admin)
refugiosRouter.post(
  "/:id/aulas",
  requireRole(RolUsuario.ADMINISTRADOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acceso = await verificarAccesoRefugio(req, res, req.params.id);
      if (!acceso.ok) return;
      const parsed = aulaCrearSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Datos inválidos.", detalles: parsed.error.flatten() });
        return;
      }
      const aula = await prisma.aula.create({
        data: { refugioId: acceso.refugioId, nombre: parsed.data.nombre, capacidad: parsed.data.capacidad ?? null },
      });
      await logAuditoria(req.user!.sub, "create", "aula", aula.id, { refugioId: acceso.refugioId });
      res.status(201).json(aula);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/refugios/:refugioId/aulas/:aulaId  (solo admin)
refugiosRouter.delete(
  "/:refugioId/aulas/:aulaId",
  requireRole(RolUsuario.ADMINISTRADOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const acceso = await verificarAccesoRefugio(req, res, req.params.refugioId);
      if (!acceso.ok) return;

      const ocupada = await prisma.refugiado.count({
        where: { aulaId: req.params.aulaId, deletedAt: null },
      });
      if (ocupada > 0) {
        res.status(409).json({ error: "El aula tiene refugiados asignados. Reasigne primero." });
        return;
      }

      await prisma.aula.delete({ where: { id: req.params.aulaId } });
      await logAuditoria(req.user!.sub, "delete", "aula", req.params.aulaId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
