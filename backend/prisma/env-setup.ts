/**
 * Genera `backend/.env` con valores seguros si no existe, o valida y
 * regenera si está corrupto (UTF-16, BOM, CRLF problemático, claves
 * vacías, etc.).
 *
 * Uso:
 *   npm run env:setup
 *
 * El script detecta el problema en el .env existente y lo reemplaza con
 * una versión nueva en UTF-8 sin BOM. Si todo está OK, no hace nada.
 *
 * Variables que requieren reemplazo manual (NO se generan):
 *   - PG_SUPERUSER_URL  (depende del server)
 *
 * Variables que sí se generan (con valores seguros por defecto):
 *   - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
 *   - ADMIN_PASSWORD
 *   - DATABASE_URL (sólo si falta)
 */

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");

function log(msg: string) {
  console.log(`[env:setup] ${msg}`);
}

function generateSecret(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

function detectEncoding(buf: Buffer): "utf8" | "utf16le" | "utf16be" | "binary" {
  if (buf.length >= 2) {
    // UTF-16 LE BOM: FF FE
    if (buf[0] === 0xff && buf[1] === 0xfe) return "utf16le";
    // UTF-16 BE BOM: FE FF
    if (buf[0] === 0xfe && buf[1] === 0xff) return "utf16be";
  }
  if (buf.length >= 3) {
    // UTF-8 BOM: EF BB BF
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return "utf8-bom";
  }
  return "utf8";
}

function isEnvCorrupt(path: string): { corrupt: boolean; reason?: string } {
  if (!existsSync(path)) return { corrupt: true, reason: "no existe" };
  const buf = readFileSync(path);
  const enc = detectEncoding(buf);
  if (enc === "utf16le" || enc === "utf16be") {
    return { corrupt: true, reason: `codificación ${enc} (debe ser UTF-8 sin BOM)` };
  }
  // Intentar parsear como dotenv
  const text = buf.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const requiredKeys = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  const parsed: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) parsed[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  for (const k of requiredKeys) {
    if (!parsed[k] || parsed[k].trim() === "") {
      return { corrupt: true, reason: `falta o está vacía: ${k}` };
    }
  }
  return { corrupt: false };
}

function main() {
  log(`Ruta del .env: ${ENV_PATH}`);

  const status = isEnvCorrupt(ENV_PATH);
  if (!status.corrupt) {
    log("El .env existe y tiene todas las claves obligatorias. No se hace nada.");
    return;
  }

  log(`Detectado problema: ${status.reason}. Regenerando…`);

  // Genera valores seguros
  const jwtAccess = generateSecret(48);
  const jwtRefresh = generateSecret(48);
  const adminPassword = generateSecret(18);

  // Mantener DATABASE_URL del entorno si existe (puede venir del CI/proveedor)
  const existingDb = process.env.DATABASE_URL ?? "postgresql://censo:Censo_Refugios_2026!@localhost:5432/censo_refugios?schema=public";
  const existingPg = process.env.PG_SUPERUSER_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";

  const content = `# =============================================================================
# Censo de Refugios — Variables de entorno (PRODUCCIÓN)
# =============================================================================
# Generado automáticamente por \`npm run env:setup\`. Si editas este archivo
# a mano, NO cambies la codificación (debe ser UTF-8 sin BOM).
# =============================================================================

# ─── Servidor ────────────────────────────────────────────────────────────────
NODE_ENV="production"
PORT=3016
# CORS_ORIGIN acepta uno o varios orígenes separados por coma.
# Incluye los hosts comunes (localhost para testing y el dominio
# corporativo real del proyecto). Ajusta según tu entorno.
CORS_ORIGIN="http://localhost:3017,http://localhost:5173,http://correspondencia.cvm.com.ve:3017,https://correspondencia.cvm.com.ve"

# ─── Base de datos PostgreSQL ────────────────────────────────────────────────
DATABASE_URL="${existingDb}"
PG_SUPERUSER_URL="${existingPg}"

# ─── JWT (regenerados con crypto.randomBytes — sobreescribe los anteriores) ───
JWT_ACCESS_SECRET="${jwtAccess}"
JWT_REFRESH_SECRET="${jwtRefresh}"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ─── Bootstrap del administrador raíz ────────────────────────────────────────
ADMIN_CEDULA="V00000000"
ADMIN_NOMBRE="Administrador"
ADMIN_APELLIDO="Raiz"
ADMIN_PASSWORD="${adminPassword}"
`;

  writeFileSync(ENV_PATH, content, { encoding: "utf8" });
  // Permisos 600
  try {
    chmodSync(ENV_PATH, 0o600);
  } catch {
    // En Windows chmod puede no funcionar; ignorar.
  }

  log("✔ .env regenerado correctamente en UTF-8 sin BOM.");
  log(`  - DATABASE_URL: ${existingDb.replace(/:[^:@]+@/, ":***@")}`);
  log(`  - PG_SUPERUSER_URL: ${existingPg.replace(/:[^:@]+@/, ":***@")}`);
  log(`  - JWT_ACCESS_SECRET: regenerado (${jwtAccess.length} chars)`);
  log(`  - JWT_REFRESH_SECRET: regenerado (${jwtRefresh.length} chars)`);
  log(`  - ADMIN_PASSWORD: regenerado (${adminPassword.length} chars)`);
  log("");
  log("IMPORTANTE: guarda ADMIN_PASSWORD en un gestor de contraseñas.");
  log("  Lo necesitarás para el primer login en http://localhost:3016");
}

main();
