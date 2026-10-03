import manifest from "../generated/site-manifest.json";
import type { SitePage } from "./site";
export { SITE_URL } from "./settings";

export const pageMetadata: SitePage[] = manifest;
export function getPage(path: string): SitePage {
  const normalized = path.replace(/\/+$/, "") || "/";
  return pageMetadata.find(page => page.path === (normalized === "/puppy-kit" ? "/puppy-kit/" : normalized)) ?? {
    path, title: "Page Not Found | Paw & Whisker", heading: "We couldn't find that page",
    description: "This page may have moved or no longer exist. Find free puppy guides and general pet-care help on Paw & Whisker.",
    noindex: true, kind: "404",
  };
}