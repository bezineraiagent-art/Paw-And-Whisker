import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pages, guideRedirects, SITE_URL, metadata, renderPage } from "../dist/server/prerender.js";

const root = fileURLToPath(new URL("../dist/public/", import.meta.url));
const template = await readFile(path.join(root, "index.html"), "utf8");
function documentFor(route) {
  return template.replace(/<title>[\s\S]*?<\/title>/, metadata(route))
    .replace('<div id="root"></div>', `<div id="root">${renderPage(route)}</div>`);
}
const routeFiles = {};
for (const page of pages) {
  const relative = page.path === "/" ? "index.html" : page.path.replace(/^\/|\/$/g, "") + "/index.html";
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await writeFile(path.join(root, relative), documentFor(page.path));
  routeFiles[page.path] = relative;
}
await writeFile(path.join(root, "404.html"), documentFor("/404"));
await writeFile(path.join(root, "routes.json"), JSON.stringify({ routeFiles, guideRedirects, privatePaths: pages.filter(p => p.noindex).map(p => p.path) }, null, 2));
await writeFile(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /chat\nDisallow: /success\nSitemap: ${SITE_URL}/sitemap.xml\n`);
await writeFile(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(p => !p.noindex).map(p => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${p.updated}</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.info(`Generated ${pages.length} route documents, a friendly 404, robots.txt and sitemap.xml.`);