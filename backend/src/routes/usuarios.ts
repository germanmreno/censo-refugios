import { z } from "zod";
import { Router } from "express";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma.js";
import { authGuard, requireRole } from "../middleware/auth.js";
import { logAuditoria } from "../utils/auditoria.js";
import { RolUsuario } from "shared";

export const usuariosRouter = Router();

usuariosRouter.use(authGuard, requireRole(RolUsuario.ADMINISTRADOR));

const rolSchema = z.enum([RolUsuario.FUNCIONARIO, RolUsuario.ADMINISTRADOR]);

const crearSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  cedula: z.string().min(1).max(20),
  password: z.string().min(8).max(128),
  rol: rolSchema,
  refugioIds: z.array(z.string().uuid()).max(50).default([]),
});

const actualizarSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  cedula: z.string().min(1).max(20).optional(),
  rol: rolSchema.optional(),
  activo: z.boolean().optional(),
  refugioIds: z.array(z.string().uuid()).max(50).optional(),
  password: z.string().min(8).max(128).optional(),
});

// GET /api/usuarios
usuariosRouter.get("/", async (_req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        cedula: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        refugiosPermitidos: {
          select: {
            refugioId: true,
            refugio: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});

// GET /api/usuarios/:id
usuariosRouter.get("/:id", async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        cedula: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        refugiosPermitidos: {
          select: {
            refugioId: true,
            refugio: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    if (!usuario) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// POST /api/usuarios
usuariosRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = crearSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos.", detalles: parsed.error.flatten() });
      return;
    }
    const { nombre, apellido, cedula, password, rol, refugioIds } = parsed.data;

    const existe = await prisma.usuario.findUnique({ where: { cedula } });
    if (existe) {
      res.status(409).json({ error: "Ya existe un usuario con esa cédula." });
      return;
    }

    // Validar que los refugios existan (si es funcionario)
    if (rol === RolUsuario.FUNCIONARIO && refugioIds.length > 0) {
      const count = await prisma.refugio.count({ where: { id: { in: refugioIds } } });
      if (count !== refugioIds.length) {
        res.status(400).json({ error: "Uno o más refugios no existen." });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        cedula,
        passwordHash,
        rol,
        refugiosPermitidos:
          rol === RolUsuario.ADMINISTRADOR || refugioIds.length === 0
            ? undefined
            : { createMany: { data: refugioIds.map((refugioId) => ({ refugioId })) } },
      },
      include: {
        refugiosPermitidos: {
          select: { refugioId: true, refugio: { select: { id: true, nombre: true } } },
        },
      },
    });

    await logAuditoria(req.user!.sub, "create", "usuario", usuario.id, { cedula, rol });

    res.status(201).json({
      id: usuario.id,
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      activo: usuario.activo,
      refugiosPermitidos: usuario.refugiosPermitidos,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/usuarios/:id
usuariosRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = actualizarSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos.", detalles: parsed.error.flatten() });
      return;
    }
    const { nombre, apellido, cedula, rol, activo, refugioIds, password } = parsed.data;
    const id = req.params.id;

    const actual = await prisma.usuario.findUnique({ where: { id } });
    if (!actual) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    if (cedula && cedula !== actual.cedula) {
      const dup = await prisma.usuario.findUnique({ where: { cedula } });
      if (dup) {
        res.status(409).json({ error: "La cédula ya está en uso." });
        return;
      }
    }

    // Proteger al último administrador activo de ser desactivado o degradado
    if (
      actual.rol === RolUsuario.ADMINISTRADOR &&
      actual.activo &&
      ((activo === false) || (rol && rol !== RolUsuario.ADMINISTRADOR))
    ) {
      const adminsActivos = await prisma.usuario.count({
        where: { rol: RolUsuario.ADMINISTRADOR, activo: true },
      });
      if (adminsActivos <= 1) {
        res.status(400).json({ error: "No se puede desactivar ni degradar al último administrador activo." });
        return;
      }
    }

    // Validar refugios nuevos si se proveen
    if (refugioIds !== undefined && rol !== RolUsuario.ADMINISTRADOR) {
      const ids = refugioIds.length > 0 ? refugioIds : (await prisma.usuarioRefugio.findMany({ where: { usuarioId: id }, select: { refugioId: true } })).map((r) => r.refugioId);
      if (ids.length > 0) {
        const count = await prisma.refugio.count({ where: { id: { in: ids } } });
        if (count !== ids.length) {
          res.status(400).json({ error: "Uno o más refugios no existen." });
          return;
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (apellido !== undefined) data.apellido = apellido;
    if (cedula !== undefined) data.cedula = cedula;
    if (rol !== undefined) data.rol = rol;
    if (activo !== undefined) data.activo = activo;
    if (password !== undefined) {
      data.passwordHash = await bcrypt.hash(password, 12);
      data.tokenVersion = { increment: 1 };
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      include: {
        refugiosPermitidos: {
          select: { refugioId: true, refugio: { select: { id: true, nombre: true } } },
        },
      },
    });

    if (refugioIds !== undefined) {
      if (rol === RolUsuario.ADMINISTRADOR || refugioIds.length === 0) {
        await prisma.usuarioRefugio.deleteMany({ where: { usuarioId: id } });
      } else {
        await prisma.$transaction([
          prisma.usuarioRefugio.deleteMany({ where: { usuarioId: id } }),
          prisma.usuarioRefugio.createMany({
            data: refugioIds.map((refugioId) => ({ usuarioId: id, refugioId })),
          }),
        ]);
      }
      usuario.refugiosPermitidos = await prisma.usuarioRefugio.findMany({
        where: { usuarioId: id },
        select: { refugioId: true, refugio: { select: { id: true, nombre: true } } },
      });
    }

    await logAuditoria(req.user!.sub, "update", "usuario", id, parsed.data);

    res.json({
      id: usuario.id,
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      activo: usuario.activo,
      refugiosPermitidos: usuario.refugiosPermitidos,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/usuarios/:id — desactivar (soft delete)
usuariosRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const actual = await prisma.usuario.findUnique({ where: { id } });
    if (!actual) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    if (actual.rol === RolUsuario.ADMINISTRADOR && actual.activo) {
      const adminsActivos = await prisma.usuario.count({
        where: { rol: RolUsuario.ADMINISTRADOR, activo: true },
      });
      if (adminsActivos <= 1) {
        res.status(400).json({ error: "No se puede desactivar al último administrador activo." });
        return;
      }
    }

    await prisma.usuario.update({
      where: { id },
      data: { activo: false, tokenVersion: { increment: 1 } },
    });

    await logAuditoria(req.user!.sub, "delete", "usuario", id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
