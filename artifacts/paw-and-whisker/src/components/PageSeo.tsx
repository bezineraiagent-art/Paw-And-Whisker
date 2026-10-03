import { useEffect } from "react";
import { useLocation } from "wouter";
import { getPage, SITE_URL } from "@/content/site";
import { structuredData } from "@/content/structured-data";

export default function PageSeo() {
  const [location] = useLocation();
  useEffect(() => {
    const page = getPage(location);
    const canonical = SITE_URL + page.path;
    document.title = page.title;
    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    setMeta("name", "description", page.description);
    setMeta("name", "robots", page.noindex ? "noindex, follow" : "index, follow");
    for (const prefix of ["og", "twitter"]) {
      const attribute = prefix === "og" ? "property" : "name";
      setMeta(attribute, `${prefix}:title`, page.title);
      setMeta(attribute, `${prefix}:description`, page.description);
      setMeta(attribute, `${prefix}:image`, `${SITE_URL}/opengraph.jpg`);
      setMeta(attribute, `${prefix}:url`, canonical);
    }
    setMeta("property", "og:type", page.kind === "guide" ? "article" : "website");
    setMeta("property", "og:site_name", "Paw & Whisker");
    setMeta("name", "twitter:card", "summary_large_image");
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
    let schema = document.head.querySelector<HTMLScriptElement>("#page-schema");
    if (!schema) { schema = document.createElement("script"); schema.id = "page-schema"; schema.type = "application/ld+json"; document.head.appendChild(schema); }
    schema.textContent = JSON.stringify(structuredData(page.path));
  }, [location]);
  return null;
}