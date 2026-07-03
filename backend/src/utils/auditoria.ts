import { Prisma } from "@prisma/client";
import { prisma } from "../services/prisma.js";

export async function logAuditoria(
  usuarioId: string,
  accion: string,
  entidad: string,
  entidadId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: {
        usuarioId,
        accion,
        entidad,
        entidadId: entidadId ?? null,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error("No se pudo registrar auditoría:", e);
  }
}
