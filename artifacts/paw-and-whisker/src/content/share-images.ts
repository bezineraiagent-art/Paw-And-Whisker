import { SITE_URL } from "./settings";

const images: Record<string, string> = {
  "/": "home", "/guides": "guides",
  "/tools/toxic-food-checker": "food", "/find-a-vet": "vet",
};
export function shareImage(path: string) {
  const scene = images[path.replace(/\/+$/, "") || "/"];
  return SITE_URL + (scene ? `/og/${scene}-scene.png` : "/opengraph.jpg");
}