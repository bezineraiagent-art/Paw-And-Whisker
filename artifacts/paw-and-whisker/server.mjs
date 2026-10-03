import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { securityHeaders } from "../../scripts/security-headers.mjs";

const publicRoot = path.resolve(fileURLToPath(new URL("./dist/public/", import.meta.url)));
const manifest = JSON.parse(await readFile(path.join(publicRoot, "routes.json"), "utf8"));
const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0) throw new Error("A valid PORT is required.");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".pdf": "application/pdf" };

// Importable handler so verification can exercise the actual production server.
export async function handleRequest(req, res) {
  for (const [name, value] of Object.entries(securityHeaders())) res.setHeader(name, value);
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method not allowed");
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400); res.end("Invalid URL"); return; }
  const query = new URL(req.url, "http://localhost").search;
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/chat") {
    res.writeHead(301, { Location: "/#free-chat" }); res.end(); return;
  }
  const route = clean === "/puppy-kit" ? "/puppy-kit/" : clean;
  const oldGuide = manifest.guideRedirects[clean];
  if (oldGuide || (Object.hasOwn(manifest.routeFiles, route) && pathname !== route)) {
    res.writeHead(301, { Location: (oldGuide || route) + query });
    res.end();
    return;
  }
  const known = Object.hasOwn(manifest.routeFiles, route);
  let file = known ? path.join(publicRoot, manifest.routeFiles[route]) : path.resolve(publicRoot, "." + pathname);
  let status = 200;
  // Never serve arbitrary HTML, generated manifests, or directory indexes as public routes.
  const isAsset = file.startsWith(publicRoot + path.sep) && !pathname.endsWith(".html")
    && !pathname.endsWith("/") && pathname !== "/routes.json";
  if (!known) {
    let exists = false;
    if (isAsset) {
      try { exists = (await stat(file)).isFile(); } catch { /* Missing asset: friendly 404 below. */ }
    }
    if (!exists) { status = 404; file = path.join(publicRoot, "404.html"); }
  }
  if (status === 404 || manifest.privatePaths.includes(route)) res.setHeader("X-Robots-Tag", "noindex, follow");
  try {
    const body = await readFile(file);
    res.writeHead(status, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": pathname.startsWith("/assets/") && status === 200 ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Unable to load the page.");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer(handleRequest).listen(port, "0.0.0.0", () => console.info(`Paw & Whisker serving built pages on port ${port}`));
}