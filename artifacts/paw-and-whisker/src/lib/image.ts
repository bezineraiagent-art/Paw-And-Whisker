export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT = 10 * 1024 * 1024;
const MAX_URL = 4_000_000;

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file could not be read as an image.")); };
    img.src = url;
  });
}

/** Resizes to max 1600px and re-encodes as JPEG on a canvas, which drops EXIF and location data. Kept in memory only. */
export async function preparePhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error("Please choose a JPEG, PNG or WebP photo.");
  if (file.size > MAX_INPUT) throw new Error("That photo is over 10 MB. Please choose a smaller one.");
  const img = await load(file);
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process that photo.");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  for (const q of [0.85, 0.7, 0.55, 0.4, 0.3]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < MAX_URL) return url;
  }
  throw new Error("That photo is still too large after resizing. Please try another.");
}
