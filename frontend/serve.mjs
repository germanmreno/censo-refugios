/**
 * Servidor estático mínimo para el frontend, gestionado por PM2.
 *
 * Sirve los archivos de frontend/dist/ en el puerto indicado, sin
 * compresión ni cache avanzado. Para producción se recomienda Nginx
 * delante de este proceso.
 *
 * Variables de entorno:
 *   PORT_FRONTEND       (default 3017)
 *   FRONTEND_DIST_DIR   (opcional: ruta absoluta a la carpeta dist)
 *
 * Uso típico:
 *   pm2 start ecosystem.config.cjs  # arranca con FRONTEND_DIST_DIR preconfigurado
 */

import { createReadStream, statSync, existsSync } from "node:fs";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT_FRONTEND ?? 3017);

// Resolución robusta del directorio dist/.
// Probamos en orden:
//   1. Variable de entorno FRONTEND_DIST_DIR
//   2. <carpeta del script>/dist
//   3. <cwd>/dist
//   4. <cwd>/../frontend/dist (por si se ejecuta desde la raíz)
function resolveDistDir() {
  const candidates = [];
  if (process.env.FRONTEND_DIST_DIR) {
    candidates.push(process.env.FRONTEND_DIST_DIR);
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  candidates.push(join(__dirname, "dist"));
  candidates.push(join(process.cwd(), "dist"));
  candidates.push(resolve(process.cwd(), "../frontend/dist"));

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // Si no existe, devolvemos la primera (la del script) para que el log
  // muestre la ruta esperada, pero el server responderá 503 hasta que
  // se haga `npm run build`.
  return candidates[1];
}

const ROOT = resolveDistDir();
const ROOT_RESOLVED = resolve(ROOT);

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

  // Si el dist/ no existe, devolver 503 con mensaje claro
  if (!existsSync(ROOT_RESOLVED)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      `Frontend dist/ no encontrado en: ${ROOT}\nEjecuta 'npm run build' en la raíz del monorepo.\n`,
    );
    return;
  }

  let filePath = safeJoin(ROOT_RESOLVED, req.url);
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

  // SPA fallback: si el archivo no existe y no es un asset, devolver index.html
  if (!existsSync(filePath)) {
    const ext = extname(filePath).toLowerCase();
    if (ext === "" || ext === ".html") {
      filePath = join(ROOT_RESOLVED, "index.html");
    } else {
      // Es un asset (.css, .js, .png) que no existe → 404
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
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
    console.error(`[frontend-static] Error sirviendo ${filePath}:`, e.message);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Internal Server Error: ${e.message}\n`);
  }
});

server.listen(PORT, () => {
  if (!existsSync(ROOT_RESOLVED)) {
    console.warn(
      `[frontend-static] ADVERTENCIA: ${ROOT} no existe. Ejecuta 'npm run build' en la raíz del monorepo.`,
    );
  } else {
    console.log(`[frontend-static] Sirviendo ${ROOT} en http://localhost:${PORT}`);
  }
});
