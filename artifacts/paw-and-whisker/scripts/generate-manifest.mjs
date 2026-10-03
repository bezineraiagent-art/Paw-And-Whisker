import { mkdir, writeFile } from "node:fs/promises";
import { pages } from "../dist/server/prerender.js";

// The homepage needs route metadata, not every full article in its JavaScript.
const metadata = pages.map(({ html, ...page }) => page);
const destination = new URL("../src/generated/site-manifest.json", import.meta.url);
await mkdir(new URL("../src/generated/", import.meta.url), { recursive: true });
await writeFile(destination, JSON.stringify(metadata, null, 2) + "\n");
console.info(`Generated lightweight client metadata for ${metadata.length} routes.`);