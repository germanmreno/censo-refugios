/**
 * Servidor estático mínimo para el frontend, gestionado por PM2.
 *
 * Sirve los archivos de frontend/dist/ en el puerto indicado, sin
 * compresión ni cache avanzado. Para producción se recomienda Nginx
 * delante de este proceso.
 *
 * Variables de entorno:
 *   PORT_FRONTEND (default 3017)
 */

import { createReadStream, statSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT_FRONTEND ?? 3017);
// Raíz del frontend = directorio donde está este script. Acepta tanto
// ejecución con cwd=frontend (PM2) como cwd=raíz del repo.
const SCRIPT_DIR = new URL(".", import.meta.url).pathname.replace(/^\//, "");
const ROOT = join(SCRIPT_DIR, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

function contentType(file) {
  return MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = normalize(join(root, decoded));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

const server = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }
  let filePath = safeJoin(ROOT, req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, "index.html");
    }
  } catch {
    // Continuar al fallback
  }

  if (!existsSync(filePath)) {
    filePath = join(ROOT, "index.html");
  }

  try {
    const stat = statSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end("Internal Server Error");
    console.error("[frontend-static]", e);
  }
});

server.listen(PORT, () => {
  if (!existsSync(ROOT)) {
    console.warn(`[frontend-static] ADVERTENCIA: ${ROOT} no existe. Ejecuta "npm run build" en el frontend.`);
  }
  console.log(`[frontend-static] Sirviendo ${ROOT} en http://localhost:${PORT}`);
});
