/**
 * Bootstrap de base de datos para producción.
 *
 * Crea el rol de aplicación y la base de datos si no existen, otorga los
 * permisos necesarios y aplica las migraciones Prisma. Tras ejecutarlo una
 * vez, el backend queda listo para arrancar con `npm run start` (o PM2).
 *
 * Uso:
 *   npm run db:bootstrap
 *
 * Variables de entorno requeridas (en `backend/.env`):
 *   - PG_SUPERUSER_URL  conexión de superusuario (rol `postgres` o similar)
 *   - DATABASE_URL      conexión que usará la aplicación en runtime
 *
 * El script extrae de DATABASE_URL el nombre de usuario, contraseña y
 * nombre de la base a crear. No hardcodea credenciales.
 */

import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { execSync } from "node:child_process";

function parsePgUrl(url: string): { user: string; password: string; db: string } {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    db: (u.pathname || "/").replace(/^\//, "") || "postgres",
  };
}

function log(prefix: string, msg: string) {
  console.log(`[${prefix}] ${msg}`);
}

async function main() {
  const superUrl = process.env.PG_SUPERUSER_URL;
  const appUrl = process.env.DATABASE_URL;
  if (!superUrl || !appUrl) {
    throw new Error(
      "Faltan PG_SUPERUSER_URL o DATABASE_URL en el .env. Revisa backend/.env.",
    );
  }

  const target = parsePgUrl(appUrl);
  if (!target.user || !target.db) {
    throw new Error("DATABASE_URL malformada: debe incluir usuario y base.");
  }

  // ─── 1. Crear rol y base de datos con el superusuario ─────────────────────
  const superClient = new PrismaClient({
    datasources: { db: { url: superUrl } },
    log: ["error", "warn"],
  });

  log("bootstrap", `Conectando como superusuario…`);
  await superClient.$connect();

  // ¿Ya existe el rol?
  const rolExiste = await superClient.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::int AS count FROM pg_roles WHERE rolname = $1`,
    target.user,
  );
  const rolYa = Number(rolExiste[0]?.count ?? 0) > 0;
  if (rolYa) {
    log("bootstrap", `Rol "${target.user}" ya existe.`);
    // Sincronizamos la contraseña por si cambió en .env.
    await superClient.$executeRawUnsafe(
      `ALTER ROLE "${target.user}" WITH LOGIN PASSWORD '${target.password.replace(/'/g, "''")}'`,
    );
  } else {
    log("bootstrap", `Creando rol "${target.user}"…`);
    await superClient.$executeRawUnsafe(
      `CREATE ROLE "${target.user}" WITH LOGIN PASSWORD '${target.password.replace(/'/g, "''")}' SUPERUSER`,
    );
  }

  // Garantizar que el rol target tenga atributo SUPERUSER. Esto simplifica la
  // administración: la app puede ejecutar DDL (incluidas las migraciones Prisma
  // sobre la tabla `_prisma_migrations`) sin que tengamos que gestionar GRANTs
  // granulares por tabla. Postgres 15+ ya no otorga CREATE en `public` al rol
  // PUBLIC, lo cual complica la operativa; SUPERUSER esquiva ese problema.
  log("bootstrap", `Asegurando atributo SUPERUSER en "${target.user}"…`);
  await superClient.$executeRawUnsafe(`ALTER ROLE "${target.user}" WITH SUPERUSER`);

  // ¿Ya existe la base?
  const baseExiste = await superClient.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::int AS count FROM pg_database WHERE datname = $1`,
    target.db,
  );
  if (Number(baseExiste[0]?.count ?? 0) > 0) {
    log("bootstrap", `Base de datos "${target.db}" ya existe.`);
  // Reasignamos owner al rol target para que pueda ejecutar DDL (CREATE TABLE,
  // ALTER TABLE, etc.) sin necesidad de superusuario.
  log("bootstrap", `Reasignando owner de "${target.db}" a "${target.user}"…`);
  await superClient.$executeRawUnsafe(`ALTER DATABASE "${target.db}" OWNER TO "${target.user}"`);
  } else {
    log("bootstrap", `Creando base de datos "${target.db}"…`);
    await superClient.$executeRawUnsafe(`CREATE DATABASE "${target.db}" OWNER "${target.user}"`);
  }

  // Otorgar privilegios totales sobre la base al rol de la app.
  // (El OWNER ya los da, pero GRANT explícito documenta la intención y
  //  cubre migraciones futuras donde Prisma pueda necesitar GRANT extra.)
  await superClient.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON DATABASE "${target.db}" TO "${target.user}"`);

  // En PostgreSQL ≥ 15 el rol PUBLIC ya no recibe CREATE en el schema public
  // por defecto. Sin este GRANT, `prisma migrate deploy` no puede crear la
  // tabla `_prisma_migrations` y falla con "permiso denegado". Lo otorgamos
  // explícitamente al rol target.
  await superClient.$executeRawUnsafe(`GRANT CREATE ON SCHEMA public TO "${target.user}"`);
  await superClient.$executeRawUnsafe(`GRANT USAGE, CREATE ON SCHEMA public TO "${target.user}"`);

  // Para bases ya existentes creadas por otro owner, transferimos la
  // propiedad de las tablas/secuencias/vistas del schema `public` al rol
  // target, una por una. Luego — y esto es crítico en PostgreSQL ≥ 15 —
  // otorgamos explícitamente los privilegios a TODAS las tablas del schema,
  // porque `ALTER TABLE … OWNER TO` cambia el owner pero no garantiza que
  // el nuevo owner tenga los privilegios de lectura/escritura (cambio de
  // comportamiento reciente en Postgres).
  log("bootstrap", `Reasignando owner de objetos del schema public al rol target…`);
  await superClient.$executeRawUnsafe(
    `DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT n.nspname, c.relname, c.relkind
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                  AND c.relkind IN ('r', 'S', 'v', 'm', 'f', 'p')
                  AND pg_get_userbyid(c.relowner) <> '${target.user}'
      LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I.%I OWNER TO %I', r.nspname, r.relname, '${target.user}');
      END LOOP;
    END $$`,
  );

  // Grant explícito de TODOS los privilegios sobre TODAS las tablas/sequences
  // existentes en el schema public. Aplica tanto si reasignamos el owner como
  // si la tabla ya era del target pero no tenía privilegios (caso Postgres 18).
  log("bootstrap", `Otorgando privilegios al rol target sobre todos los objetos…`);
  await superClient.$executeRawUnsafe(
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${target.user}"`,
  );
  await superClient.$executeRawUnsafe(
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${target.user}"`,
  );
  await superClient.$executeRawUnsafe(
    `GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "${target.user}"`,
  );
  // Y para objetos futuros (importante para migraciones que Prisma aplique
  // durante ESTA misma corrida del bootstrap).
  await superClient.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "${target.user}"`,
  );
  await superClient.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO "${target.user}"`,
  );
  await superClient.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO "${target.user}"`,
  );
  // Los ALTER DEFAULT PRIVILEGES sólo aplican a objetos creados por el rol
  // que ejecuta la sentencia (postgres, en este caso). Para que también
  // apliquen al rol target si crea objetos, lo repetimos como censo:
  await superClient.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES FOR ROLE "${target.user}" IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "${target.user}"`,
  );
  await superClient.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES FOR ROLE "${target.user}" IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO "${target.user}"`,
  );

  // Y los esquemas (Prisma usa public, pero por si acaso)
  await superClient.$executeRawUnsafe(
    `DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT nspname FROM pg_namespace
                 WHERE nspname NOT IN ('pg_catalog','information_schema','pg_toast')
                   AND pg_get_userbyid(nspowner) <> '${target.user}'
      LOOP
        EXECUTE format('ALTER SCHEMA %I OWNER TO %I', r.nspname, '${target.user}');
      END LOOP;
    END $$`,
  );
  await superClient.$executeRawUnsafe(
    `GRANT USAGE, CREATE ON SCHEMA public TO "${target.user}"`,
  );

  await superClient.$disconnect();
  log("bootstrap", `Rol y base listos.`);

  // ─── 2. Aplicar migraciones con la URL de la app ──────────────────────────
  log("bootstrap", `Aplicando migraciones Prisma…`);
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  } catch {
    throw new Error(
      "Falló `prisma migrate deploy`. Revisa los logs anteriores. " +
        "Si acabas de crear la BD, asegúrate de que las migraciones existen en backend/prisma/migrations.",
    );
  }

  log("bootstrap", `Generando Prisma Client (idempotente)…`);
  try {
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch {
    // No es fatal: el cliente puede estar ya generado.
    log("bootstrap", `Aviso: prisma generate no se pudo ejecutar (puede ser benigno).`);
  }

  // ─── 3. Sembrar el admin raíz ─────────────────────────────────────────────
  log("bootstrap", `Sembrando administrador raíz (si no existe)…`);
  try {
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  } catch {
    log(
      "bootstrap",
      `Aviso: el seed no se ejecutó (puede que el admin ya exista o falte config). Continúa.`,
    );
  }

  log("bootstrap", `✔ Base de datos lista. Ya puedes arrancar el backend.`);
}

main()
  .catch((e) => {
    console.error(`[bootstrap] ERROR: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
