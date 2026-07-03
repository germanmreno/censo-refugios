import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "../services/prisma.js";
import { authGuard, requireRole } from "../middleware/auth.js";
import { logAuditoria } from "../utils/auditoria.js";
import { refugiosVisiblesIds, verificarAccesoRefugio } from "../services/refugioAccess.js";
import { RolUsuario } from "shared";
import {
  crearRefugiadoSchema,
  actualizarRefugiadoSchema,
} from "../schemas/refugiado.js";

export const refugiadosRouter = Router();

function generarVerificacionToken(): string {
  return randomBytes(24).toString("base64url");
}

refugiadosRouter.use(authGuard);

// ─── GET /api/refugiados?refugioId=&page=&pageSize=&filters= ───
refugiadosRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permitidos = await refugiosVisiblesIds(req);
    const refugioId = typeof req.query.refugioId === "string" ? req.query.refugioId : undefined;

    if (refugioId && permitidos !== null && !permitidos.includes(refugioId)) {
      res.status(403).json({ error: "No tiene acceso a este refugio." });
      return;
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 25)));

    const where: Record<string, unknown> = { deletedAt: null };
    if (refugioId) where.refugioId = refugioId;
    else if (permitidos !== null) where.refugioId = { in: permitidos };

    if (typeof req.query.jefeFamilia === "string") {
      where.jefeFamilia = req.query.jefeFamilia === "true";
    }
    if (typeof req.query.buscar === "string" && req.query.buscar.trim()) {
      const q = req.query.buscar.trim();
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
        { cedula: { contains: q, mode: "insensitive" } },
      ];
    }
    if (typeof req.query.parentesco === "string") where.parentesco = req.query.parentesco;
    if (typeof req.query.etapaVida === "string") where.etapaVida = req.query.etapaVida;
    if (typeof req.query.estado === "string") where.estado = req.query.estado;

    const [total, items] = await Promise.all([
      prisma.refugiado.count({ where }),
      prisma.refugiado.findMany({
        where,
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          refugioId: true,
          aulaId: true,
          origen: true,
          jefeFamilia: true,
          jefeFamiliaId: true,
          parentesco: true,
          nombre: true,
          apellido: true,
          nacionalidadCedula: true,
          cedula: true,
          telefono: true,
          edad: true,
          etapaVida: true,
          patologia: true,
          patologiaDescripcion: true,
          estado: true,
          municipio: true,
          parroquia: true,
          sector: true,
          direccion: true,
          tipoVivienda: true,
          estatusPropiedad: true,
          estatusActual: true,
          createdAt: true,
          updatedAt: true,
          refugio: { select: { id: true, nombre: true } },
          aula: { select: { id: true, nombre: true } },
          jefeFamiliaRef: { select: { id: true, nombre: true, apellido: true, cedula: true } },
          familiares: {
            select: { id: true, nombre: true, apellido: true, cedula: true, parentesco: true },
          },
        },
      }),
    ]);

    res.json({ total, page, pageSize, items });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/refugiados/:id ───
refugiadosRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refugiado = await prisma.refugiado.findUnique({
      where: { id: req.params.id },
      include: {
        refugio: { select: { id: true, nombre: true } },
        aula: { select: { id: true, nombre: true } },
        jefeFamiliaRef: { select: { id: true, nombre: true, apellido: true, cedula: true } },
        familiares: {
          select: { id: true, nombre: true, apellido: true, cedula: true, parentesco: true, edad: true },
        },
      },
    });
    if (!refugiado || refugiado.deletedAt) {
      res.status(404).json({ error: "Refugiado no encontrado." });
      return;
    }
    const permitidos = await refugiosVisiblesIds(req);
    if (permitidos !== null && !permitidos.includes(refugiado.refugioId)) {
      res.status(403).json({ error: "No tiene acceso a este refugio." });
      return;
    }
    res.json(refugiado);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/refugiados/:id/carnet  (datos completos + foto + token para impresión) ───
refugiadosRouter.get("/:id/carnet", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await prisma.refugiado.findUnique({
      where: { id: req.params.id },
      include: {
        refugio: { select: { id: true, nombre: true, ubicacion: true } },
        aula: { select: { id: true, nombre: true } },
      },
    });
    if (!r || r.deletedAt) {
      res.status(404).json({ error: "Refugiado no encontrado." });
      return;
    }
    const permitidos = await refugiosVisiblesIds(req);
    if (permitidos !== null && !permitidos.includes(r.refugioId)) {
      res.status(403).json({ error: "No tiene acceso a este refugio." });
      return;
    }
    res.json({
      id: r.id,
      verificacionToken: r.verificacionToken,
      nombre: r.nombre,
      apellido: r.apellido,
      nacionalidadCedula: r.nacionalidadCedula,
      cedula: r.cedula,
      edad: r.edad,
      etapaVida: r.etapaVida,
      telefono: r.telefono,
      foto: r.foto,
      refugio: r.refugio,
      aula: r.aula,
      createdAt: r.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/refugiados/jefes?q=&refugioId=  (autocomplete para enlazar familiares) ───
refugiadosRouter.get("/jefes/buscador", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permitidos = await refugiosVisiblesIds(req);
    const refugioId = typeof req.query.refugioId === "string" ? req.query.refugioId : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (refugioId && permitidos !== null && !permitidos.includes(refugioId)) {
      res.status(403).json({ error: "No tiene acceso a este refugio." });
      return;
    }

    const where: Record<string, unknown> = {
      jefeFamilia: true,
      deletedAt: null,
    };
    if (refugioId) where.refugioId = refugioId;
    else if (permitidos !== null) where.refugioId = { in: permitidos };

    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
        { cedula: { contains: q, mode: "insensitive" } },
      ];
    }

    const jefes = await prisma.refugiado.findMany({
      where,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      take: 20,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        cedula: true,
        nacionalidadCedula: true,
        edad: true,
        refugio: { select: { id: true, nombre: true } },
      },
    });
    res.json(jefes);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/refugiados ───
refugiadosRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = crearRefugiadoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos.", detalles: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;

    // Verificar acceso al refugio
    const acceso = await verificarAccesoRefugio(req, res, d.refugioId);
    if (!acceso.ok) return;

    // Validar aula pertenezca al refugio
    if (d.aulaId) {
      const aula = await prisma.aula.findUnique({ where: { id: d.aulaId } });
      if (!aula || aula.refugioId !== d.refugioId) {
        res.status(400).json({ error: "El aula no pertenece al refugio indicado." });
        return;
      }
    }

    // Validar jefe de familia referenciado (solo si lo trae)
    if (!d.jefeFamilia && d.jefeFamiliaId) {
      const jefe = await prisma.refugiado.findUnique({ where: { id: d.jefeFamiliaId } });
      if (!jefe || !jefe.jefeFamilia || jefe.deletedAt) {
        res.status(400).json({ error: "El jefe de familia referenciado no existe o no es jefe." });
        return;
      }
      if (jefe.refugioId !== d.refugioId) {
        res.status(400).json({ error: "El jefe de familia pertenece a otro refugio." });
        return;
      }
    }

    // Validar cédula única (si está presente)
    if (d.cedula && d.nacionalidadCedula) {
      const dup = await prisma.refugiado.findFirst({
        where: { nacionalidadCedula: d.nacionalidadCedula, cedula: d.cedula, deletedAt: null },
      });
      if (dup) {
        res.status(409).json({ error: "Ya existe un refugiado activo con esa cédula." });
        return;
      }
    }

    const refugiado = await prisma.refugiado.create({
      data: {
        refugioId: d.refugioId,
        aulaId: d.aulaId ?? null,
        origen: d.origen,
        jefeFamilia: d.jefeFamilia,
        jefeFamiliaId: d.jefeFamilia ? null : (d.jefeFamiliaId ?? null),
        parentesco: d.jefeFamilia ? null : (d.parentesco ?? null),
        nombre: d.nombre,
        apellido: d.apellido,
        nacionalidadCedula: d.nacionalidadCedula ?? null,
        cedula: d.cedula ?? null,
        telefono: d.telefono ?? null,
        edad: d.edad,
        etapaVida: d.etapaVida,
        patologia: d.patologia,
        patologiaDescripcion: d.patologia ? (d.patologiaDescripcion ?? null) : null,
        foto: d.foto ?? null,
        verificacionToken: generarVerificacionToken(),
        estado: d.estado,
        municipio: d.municipio,
        parroquia: d.parroquia,
        sector: d.sector,
        direccion: d.direccion,
        tipoVivienda: d.tipoVivienda,
        estatusPropiedad: d.estatusPropiedad,
        estatusActual: d.estatusActual,
        registradoPorId: req.user!.sub,
      },
      include: {
        refugio: { select: { id: true, nombre: true } },
        aula: { select: { id: true, nombre: true } },
      },
    });

    await logAuditoria(req.user!.sub, "create", "refugiado", refugiado.id, {
      refugioId: d.refugioId,
      jefeFamilia: d.jefeFamilia,
    });

    res.status(201).json({
      ...refugiado,
      foto: refugiado.foto,
      verificacionToken: refugiado.verificacionToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/refugiados/:id  (solo admin) ───
refugiadosRouter.patch(
  "/:id",
  requireRole(RolUsuario.ADMINISTRADOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existente = await prisma.refugiado.findUnique({ where: { id: req.params.id } });
      if (!existente || existente.deletedAt) {
        res.status(404).json({ error: "Refugiado no encontrado." });
        return;
      }
      const permitidos = await refugiosVisiblesIds(req);
      if (permitidos !== null && !permitidos.includes(existente.refugioId)) {
        res.status(403).json({ error: "No tiene acceso a este refugio." });
        return;
      }

      const parsed = actualizarRefugiadoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Datos inválidos.", detalles: parsed.error.flatten() });
        return;
      }
      const d = parsed.data;

      if (d.aulaId !== undefined && d.aulaId !== null) {
        const aula = await prisma.aula.findUnique({ where: { id: d.aulaId } });
        if (!aula || aula.refugioId !== existente.refugioId) {
          res.status(400).json({ error: "El aula no pertenece al refugio del refugiado." });
          return;
        }
      }

      if (d.jefeFamiliaId !== undefined && d.jefeFamiliaId !== null) {
        const jefe = await prisma.refugiado.findUnique({ where: { id: d.jefeFamiliaId } });
        if (!jefe || !jefe.jefeFamilia || jefe.deletedAt) {
          res.status(400).json({ error: "El jefe de familia referenciado no existe o no es jefe." });
          return;
        }
        if (jefe.refugioId !== existente.refugioId) {
          res.status(400).json({ error: "El jefe de familia pertenece a otro refugio." });
          return;
        }
      }

      if (d.cedula && d.nacionalidadCedula) {
        const dup = await prisma.refugiado.findFirst({
          where: {
            nacionalidadCedula: d.nacionalidadCedula,
            cedula: d.cedula,
            deletedAt: null,
            NOT: { id: req.params.id },
          },
        });
        if (dup) {
          res.status(409).json({ error: "Ya existe otro refugiado activo con esa cédula." });
          return;
        }
      }

      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(d)) {
        if (v !== undefined) {
          if (k === "jefeFamilia") data.jefeFamilia = v;
          else if (k === "jefeFamiliaId") data.jefeFamiliaId = v;
          else if (k === "parentesco") data.parentesco = v;
          else data[k] = v;
        }
      }
      // Coherencia jefe/familiar
      if (data.jefeFamilia === true) {
        data.jefeFamiliaId = null;
        data.parentesco = null;
      }

      const refugiado = await prisma.refugiado.update({
        where: { id: req.params.id },
        data,
        include: {
          refugio: { select: { id: true, nombre: true } },
          aula: { select: { id: true, nombre: true } },
        },
      });

      await logAuditoria(req.user!.sub, "update", "refugiado", refugiado.id, d);
      res.json(refugiado);
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/refugiados/:id  (soft delete, solo admin) ───
refugiadosRouter.delete(
  "/:id",
  requireRole(RolUsuario.ADMINISTRADOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existente = await prisma.refugiado.findUnique({ where: { id: req.params.id } });
      if (!existente || existente.deletedAt) {
        res.status(404).json({ error: "Refugiado no encontrado." });
        return;
      }
      const permitidos = await refugiosVisiblesIds(req);
      if (permitidos !== null && !permitidos.includes(existente.refugioId)) {
        res.status(403).json({ error: "No tiene acceso a este refugio." });
        return;
      }

      // Si es jefe de familia con familiares activos, advertir
      if (existente.jefeFamilia) {
        const countFamiliares = await prisma.refugiado.count({
          where: { jefeFamiliaId: existente.id, deletedAt: null },
        });
        if (countFamiliares > 0) {
          res.status(409).json({
            error: `Es jefe de familia de ${countFamiliares} refugiado(s). Reasigne un nuevo jefe o elimine primero los familiares.`,
          });
          return;
        }
      }

      await prisma.refugiado.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });

      await logAuditoria(req.user!.sub, "delete", "refugiado", req.params.id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
