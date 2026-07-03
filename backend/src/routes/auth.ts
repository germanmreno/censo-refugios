import { z } from "zod";
import bcrypt from "bcryptjs";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from "../services/jwt.js";
import { logAuditoria } from "../utils/auditoria.js";
import { authGuard } from "../middleware/auth.js";
import { loginRateLimit } from "../middleware/rateLimit.js";

export const authRouter = Router();

const REFRESH_COOKIE = "rt";

const loginSchema = z.object({
  cedula: z.string().min(1),
  password: z.string().min(1),
});

function buildAccessTokenPayload(u: {
  id: string;
  cedula: string;
  rol: string;
  refugiosPermitidos: { refugioId: string }[];
}): AccessTokenPayload {
  return {
    sub: u.id,
    cedula: u.cedula,
    rol: u.rol,
    refugiosPermitidos:
      u.rol === "administrador"
        ? ["*"]
        : u.refugiosPermitidos.map((r) => r.refugioId),
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Cédula y contraseña son obligatorias." });
      return;
    }
    const { cedula, password } = parsed.data;

    const usuario = await prisma.usuario.findUnique({
      where: { cedula },
      include: { refugiosPermitidos: { select: { refugioId: true } } },
    });

    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: "Credenciales inválidas." });
      return;
    }

    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Credenciales inválidas." });
      return;
    }

    const payload = buildAccessTokenPayload(usuario);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({
      sub: usuario.id,
      tokenVersion: usuario.tokenVersion,
    });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAuditoria(usuario.id, "login", "usuario", usuario.id);

    res.json({
      accessToken,
      user: {
        id: usuario.id,
        cedula: usuario.cedula,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        refugiosPermitidos: payload.refugiosPermitidos,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: "Refresh token faltante." });
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.status(401).json({ error: "Refresh token inválido o expirado." });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { refugiosPermitidos: { select: { refugioId: true } } },
    });

    if (!usuario || !usuario.activo || usuario.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({ error: "Sesión revocada. Inicie sesión nuevamente." });
      return;
    }

    const accessPayload = buildAccessTokenPayload(usuario);
    const accessToken = signAccessToken(accessPayload);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

authRouter.post("/login", loginRateLimit, login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "No autorizado." });
      return;
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        cedula: true,
        nombre: true,
        apellido: true,
        rol: true,
        refugiosPermitidos: { select: { refugioId: true, refugio: { select: { nombre: true } } } },
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
