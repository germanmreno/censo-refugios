import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma.js";
import { RolUsuario } from "shared";

// Devuelve los refugios que el usuario autenticado puede ver/operar.
// El admin ve todos; el funcionario sólo los de su lista.
async function refugiosVisiblesIds(req: Request): Promise<string[] | null> {
  if (!req.user) return [];
  if (req.user.rol === RolUsuario.ADMINISTRADOR) return null; // null = sin filtro
  return req.user.refugiosPermitidos;
}

// 404 si el refugio no existe o el funcionario no tiene acceso.
async function verificarAccesoRefugio(
  req: Request,
  res: Response,
  refugioId: string,
): Promise<{ ok: false } | { ok: true; refugioId: string }> {
  const permitidos = await refugiosVisiblesIds(req);
  const refugio = await prisma.refugio.findUnique({ where: { id: refugioId } });
  if (!refugio) {
    res.status(404).json({ error: "Refugio no encontrado." });
    return { ok: false };
  }
  if (permitidos !== null && !permitidos.includes(refugioId)) {
    res.status(403).json({ error: "No tiene acceso a este refugio." });
    return { ok: false };
  }
  return { ok: true, refugioId };
}

export { refugiosVisiblesIds, verificarAccesoRefugio };
