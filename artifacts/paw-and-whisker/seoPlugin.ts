import type { Plugin } from "vite";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pages, getPage, guideRedirects, normalizePath, SITE_URL } from "./src/content/site";

// Development uses the same page metadata, prerenderer and redirect map as the build.
export default function seoPlugin(): Plugin {
  return {
    name: "paw-route-documents",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !["GET", "HEAD"].includes(req.method ?? "GET")) return next();
        let url: URL;
        try { url = new URL(req.url, "http://localhost"); } catch { return next(); }
        const pathname = url.pathname;
        if (pathname.startsWith("/api") || pathname.startsWith("/src/") || pathname.startsWith("/@") || pathname.startsWith("/node_modules/") || pathname.startsWith("/__")) return next();
        if (pathname === "/robots.txt") {
          res.setHeader("Content-Type", "text/plain");
          res.end(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /chat\nDisallow: /success\nSitemap: ${SITE_URL}/sitemap.xml\n`);
          return;
        }
        if (pathname === "/sitemap.xml") {
          res.setHeader("Content-Type", "application/xml");
          res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(p => !p.noindex).map(p => `<url><loc>${SITE_URL}${p.path}</loc><lastmod>${p.updated}</lastmod></url>`).join("")}</urlset>`);
          return;
        }
        const normalized = normalizePath(pathname);
        const redirect = guideRedirects[pathname.replace(/\/+$/, "")];
        const known = pages.some(page => page.path === normalized);
        if (redirect || (known && pathname !== normalized)) {
          res.writeHead(301, { Location: (redirect || normalized) + url.search });
          res.end();
          return;
        }
        if (!known) {
          // Public files still use Vite's asset handling. No SPA fallback for missing files.
          const publicFile = path.resolve(server.config.publicDir, "." + pathname);
          if (publicFile.startsWith(server.config.publicDir + path.sep)) {
            try { await readFile(publicFile); return next(); } catch { /* Not an asset. */ }
          }
        }
        try {
          const renderer = await server.ssrLoadModule("/src/prerender.tsx");
          const template = await readFile(path.join(server.config.root, "index.html"), "utf8");
          let html = template.replace(/<title>[\s\S]*?<\/title>/, renderer.metadata(pathname))
            .replace('<div id="root"></div>', `<div id="root">${renderer.renderPage(pathname)}</div>`);
          html = await server.transformIndexHtml(pathname, html);
          res.statusCode = known ? 200 : 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          if (!known || getPage(pathname).noindex) res.setHeader("X-Robots-Tag", "noindex, follow");
          res.end(req.method === "HEAD" ? undefined : html);
        } catch (error) { next(error); }
      });
    },
  };
}