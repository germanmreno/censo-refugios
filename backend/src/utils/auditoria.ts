import { prisma } from "../services/prisma.js";

export async function logAuditoria(
  usuarioId: string,
  accion: string,
  entidad: string,
  entidadId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    // Cast a `never` (compatible con cualquier shape JSON) para evitar
    // acoplamiento al namespace `Prisma` que ha cambiado entre versiones
    // del cliente (InputJsonValue / InputJsonObject / JsonValue).
    await prisma.auditoria.create({
      data: {
        usuarioId,
        accion,
        entidad,
        entidadId: entidadId ?? null,
        metadata: (metadata ?? undefined) as never,
      },
    });
  } catch (e) {
    console.error("No se pudo registrar auditoría:", e);
  }
}
