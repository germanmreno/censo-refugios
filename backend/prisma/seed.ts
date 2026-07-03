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

  const existe = await prisma.usuario.findUnique({ where: { cedula } });
  if (existe) {
    console.log(`Admin con cédula ${cedula} ya existe. Omitiendo.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

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

  console.log(`Administrador raíz creado: cédula ${cedula}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
