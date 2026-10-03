// Detects which optional photos exist in public/images so the app only requests files that are present.
import { readdir, mkdir, writeFile } from "node:fs/promises";
const wanted = ["home-sofa-night.jpg", "puppy-hub-doorframe.jpg", "food-hub-safe-counter.jpg", "vet-black-cat-clinic.jpg"];
const present = await readdir(new URL("../public/images/", import.meta.url)).catch(() => []);
await mkdir(new URL("../src/generated/", import.meta.url), { recursive: true });
await writeFile(new URL("../src/generated/image-slots.json", import.meta.url), JSON.stringify(wanted.filter(f => present.includes(f)), null, 2) + "\n");
console.info(`Optional photos present: ${wanted.filter(f => present.includes(f)).length}/${wanted.length}`);
