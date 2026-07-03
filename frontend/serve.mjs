/**
 * Servidor estático para el frontend + proxy /api al backend.
 *
 * - Sirve los archivos de frontend/dist/ en el puerto indicado.
 * - Hace proxy de cualquier ruta /api/* hacia el backend en BACKEND_URL
 *   (default http://localhost:3016), preservando método, headers y body.
 *
 * Variables de entorno:
 *   PORT_FRONTEND     (default 3017)
 *   FRONTEND_DIST_DIR (opcional: ruta absoluta a la carpeta dist)
 *   BACKEND_URL       (default http://localhost:3016)
 *
 * Para producción seria se recomienda Nginx (caché + compresión), pero
 * este server basta para entornos internos y testing.
 */

import {
  createReadStream,
  statSync,
  existsSync,
} from "node:fs";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const PORT = Number(process.env.PORT_FRONTEND ?? 3017);
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3016";
const BACKEND = new URL(BACKEND_URL);

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

function proxyToBackend(req, res) {
  const isHttps = BACKEND.protocol === "https:";
  const proxyLib = isHttps ? httpsRequest : httpRequest;
  const options = {
    hostname: BACKEND.hostname,
    port: BACKEND.port || (isHttps ? 443 : 80),
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: BACKEND.host },
  };

  const proxyReq = proxyLib(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[frontend-static] proxy error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
    }
    res.end(`Bad Gateway: ${err.message}\n`);
  });

  req.pipe(proxyReq);
}

const server = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }

  // Proxy de /api/* al backend
  if (req.url.startsWith("/api/") || req.url === "/api") {
    proxyToBackend(req, res);
    return;
  }

  // Si el dist/ no existe, devolver 503
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

  if (!existsSync(filePath)) {
    const ext = extname(filePath).toLowerCase();
    if (ext === "" || ext === ".html") {
      filePath = join(ROOT_RESOLVED, "index.html");
    } else {
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
  console.log(`[frontend-static] Proxy /api/* -> ${BACKEND_URL}`);
});
