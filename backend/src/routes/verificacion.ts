import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma.js";

export const verificacionRouter = Router();

// ─── GET /api/verificar/:token  (PÚBLICO — sin auth) ───
// Devuelve los datos del refugiado para que cualquier persona
// (autoridad, familiar, prensa) pueda validar el carnet impreso.
verificacionRouter.get("/:token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) {
      res.status(400).json({ valid: false, error: "Token inválido." });
      return;
    }

    const r = await prisma.refugiado.findFirst({
      where: { verificacionToken: token, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        nacionalidadCedula: true,
        cedula: true,
        edad: true,
        etapaVida: true,
        telefono: true,
        foto: true,
        origen: true,
        jefeFamilia: true,
        parentesco: true,
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
        refugio: { select: { id: true, nombre: true, ubicacion: true } },
        aula: { select: { id: true, nombre: true } },
        jefeFamiliaRef: { select: { id: true, nombre: true, apellido: true, cedula: true } },
      },
    });

    if (!r) {
      res.status(404).json({ valid: false, error: "Registro no encontrado o inactivo." });
      return;
    }

    res.json({
      valid: true,
      emitidoEn: r.createdAt,
      refugiado: r,
    });
  } catch (err) {
    next(err);
  }
});
