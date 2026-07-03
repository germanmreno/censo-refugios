import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../services/prisma.js";
import { authGuard } from "../middleware/auth.js";
import { refugiosVisiblesIds, verificarAccesoRefugio } from "../services/refugioAccess.js";

export const statsRouter = Router();

statsRouter.use(authGuard);

// GET /api/stats  — resumen global (admin: todos los refugios; funcionario: solo los suyos)
statsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permitidos = await refugiosVisiblesIds(req);
    const whereRefugio = permitidos === null ? undefined : { id: { in: permitidos } };

    const refugios = await prisma.refugio.findMany({
      where: whereRefugio,
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        capacidadEstimada: true,
        _count: { select: { refugiados: { where: { deletedAt: null } } } },
      },
    });

    const totalRefugiados = refugios.reduce((s, r) => s + r._count.refugiados, 0);
    const capacidadTotal = refugios.reduce((s, r) => s + r.capacidadEstimada, 0);

    res.json({
      totalRefugios: refugios.length,
      totalRefugiados,
      capacidadTotal,
      disponibles: Math.max(0, capacidadTotal - totalRefugiados),
      porcentajeOcupacion: capacidadTotal > 0 ? Math.round((totalRefugiados / capacidadTotal) * 100) : 0,
      refugios: refugios.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        capacidadEstimada: r.capacidadEstimada,
        ocupacionActual: r._count.refugiados,
        porcentajeOcupacion:
          r.capacidadEstimada > 0 ? Math.round((r._count.refugiados / r.capacidadEstimada) * 100) : 0,
        disponibles: Math.max(0, r.capacidadEstimada - r._count.refugiados),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/:refugioId — estadísticas detalladas de un refugio
statsRouter.get("/:refugioId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acceso = await verificarAccesoRefugio(req, res, req.params.refugioId);
    if (!acceso.ok) return;
    const refugioId = acceso.refugioId;

    const refugio = await prisma.refugio.findUniqueOrThrow({ where: { id: refugioId } });

    const baseWhere = { refugioId, deletedAt: null };

    const [
      total,
      jefes,
      porEtapa,
      porParentesco,
      porEstatusVivienda,
      patologias,
      sectores,
      porEdad,
      estadosAfectados,
    ] = await Promise.all([
      prisma.refugiado.count({ where: baseWhere }),
      prisma.refugiado.count({ where: { ...baseWhere, jefeFamilia: true } }),
      prisma.refugiado.groupBy({
        by: ["etapaVida"],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { etapaVida: "asc" },
      }),
      prisma.refugiado.groupBy({
        by: ["parentesco"],
        where: { ...baseWhere, jefeFamilia: false },
        _count: { _all: true },
      }),
      prisma.refugiado.groupBy({
        by: ["estatusActual"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.refugiado.findMany({
        where: { ...baseWhere, patologia: true },
        select: { patologiaDescripcion: true },
      }),
      prisma.refugiado.groupBy({
        by: ["sector"],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.refugiado.groupBy({
        by: ["edad"],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { edad: "asc" },
      }),
      prisma.refugiado.groupBy({
        by: ["estado"],
        where: baseWhere,
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    // Procesar patologías: normalizar texto y agrupar por frecuencia
    const conteoPatologias = new Map<string, number>();
    for (const p of patologias) {
      const nombre = (p.patologiaDescripcion ?? "").trim().toLowerCase();
      if (!nombre) continue;
      conteoPatologias.set(nombre, (conteoPatologias.get(nombre) ?? 0) + 1);
    }
    const patologiasTop = [...conteoPatologias.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    // Pirámide poblacional por rangos de edad
    const rangos = [
      { rango: "0-4", min: 0, max: 4 },
      { rango: "5-11", min: 5, max: 11 },
      { rango: "12-17", min: 12, max: 17 },
      { rango: "18-25", min: 18, max: 25 },
      { rango: "26-40", min: 26, max: 40 },
      { rango: "41-60", min: 41, max: 60 },
      { rango: "60+", min: 60, max: 200 },
    ];
    const piramide = rangos.map((r) => {
      let cantidad = 0;
      for (const e of porEdad) {
        if (e.edad >= r.min && e.edad <= r.max) cantidad += e._count._all;
      }
      return { rango: r.rango, cantidad };
    });

    res.json({
      refugioId,
      nombre: refugio.nombre,
      resumen: {
        totalRefugiados: total,
        jefesFamilia: jefes,
        familiares: total - jefes,
        conPatologia: patologias.length,
        capacidadEstimada: refugio.capacidadEstimada,
        disponibles: Math.max(0, refugio.capacidadEstimada - total),
        porcentajeOcupacion:
          refugio.capacidadEstimada > 0 ? Math.round((total / refugio.capacidadEstimada) * 100) : 0,
      },
      porEtapaVida: porEtapa.map((e) => ({ etapa: e.etapaVida, cantidad: e._count._all })),
      porParentesco: porParentesco.map((p) => ({ parentesco: p.parentesco, cantidad: p._count._all })),
      porEstatusVivienda: porEstatusVivienda.map((e) => ({
        estatus: e.estatusActual,
        cantidad: e._count._all,
      })),
      patologiasTop,
      sectoresMasAfectados: sectores.map((s) => ({ sector: s.sector, cantidad: s._count._all })),
      estadosMasAfectados: estadosAfectados.map((e) => ({
        estado: e.estado,
        cantidad: e._count._all,
      })),
      piramidePoblacional: piramide,
    });
  } catch (err) {
    next(err);
  }
});
