/**
 * Sincroniza el admin raíz con las credenciales del .env.
 *
 * Si el admin existe, ACTUALIZA la contraseña (no la salta como hace el seed).
 * Si no existe, lo crea.
 *
 * Diferencia con seed.ts: este script siempre aplica la contraseña actual
 * del .env al admin raíz. Útil cuando se regenera el .env y se quiere que
 * el admin pueda loguearse con la nueva contraseña sin re-sembrar la BD.
 *
 * Uso:
 *   npm run db:admin:reset
 */

import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const cedula = process.env.ADMIN_CEDULA;
  const nombre = process.env.ADMIN_NOMBRE;
  const apellido = process.env.ADMIN_APELLIDO;
  const password = process.env.ADMIN_PASSWORD;

  if (!cedula || !nombre || !apellido || !password) {
    throw new Error(
      "Faltan variables ADMIN_* en .env (ADMIN_CEDULA, ADMIN_NOMBRE, ADMIN_APELLIDO, ADMIN_PASSWORD).",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existente = await prisma.usuario.findUnique({ where: { cedula } });

  if (existente) {
    await prisma.usuario.update({
      where: { cedula },
      data: {
        nombre,
        apellido,
        passwordHash,
        rol: "administrador",
        activo: true,
      },
    });
    console.log(
      `✔ Admin "${cedula}" actualizado. Nombre: ${nombre} ${apellido}. Password sincronizado con ADMIN_PASSWORD.`,
    );
  } else {
    await prisma.usuario.create({
      data: {
        cedula,
        nombre,
        apellido,
        passwordHash,
        rol: "administrador",
        activo: true,
        refugiosPermitidos: { create: [] },
      },
    });
    console.log(`✔ Admin "${cedula}" creado. Password establecido según ADMIN_PASSWORD.`);
  }

  console.log("\n  Cédula para login:", cedula);
  console.log("  Contraseña (longitud):", password.length, "caracteres");
  console.log("\n  Si la contraseña tiene caracteres especiales, cópiela con cuidado.");
  console.log("  Para verificar el login sin frontend:");
  console.log(`    curl -X POST http://localhost:3016/api/auth/login \\`);
  console.log(`      -H "Content-Type: application/json" \\`);
  console.log(`      -d '{"cedula":"${cedula}","password":"..."}'`);
}

main()
  .catch((e) => {
    console.error("[db:admin:reset] ERROR:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
