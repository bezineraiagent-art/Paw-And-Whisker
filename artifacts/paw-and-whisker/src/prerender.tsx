import { renderToStaticMarkup } from "react-dom/server";
import { ContentDocument } from "./pages/ContentPage";
import SiteFooter from "./components/SiteFooter";
import PublicHome from "./pages/PublicHome";
import PublicPricing from "./pages/PublicPricing";
import PublicAbout from "./pages/PublicAbout";
import FoodChecker from "./pages/FoodChecker";
import SymptomCheck from "./pages/SymptomCheck";
import { structuredData } from "./content/structured-data";
import { getPage, pages, guideRedirects, SITE_URL, notFoundPage } from "./content/site";

export { pages, guideRedirects, SITE_URL };
export { foods, riskFor } from "./content/foods";
export { symptomResult, symptomQuestions } from "./content/symptoms";

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function metadata(path: string) {
  const page = getPage(path);
  const canonical = SITE_URL + page.path;
  return `<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="${page.noindex ? "noindex, follow" : "index, follow"}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:type" content="${page.kind === "guide" ? "article" : "website"}">
<meta property="og:site_name" content="Paw &amp; Whisker">
<meta property="og:image" content="${SITE_URL}/opengraph.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(page.title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
<meta name="twitter:url" content="${escapeHtml(canonical)}">
<meta name="twitter:image" content="${SITE_URL}/opengraph.jpg">
<script type="application/ld+json" id="page-schema">${JSON.stringify(structuredData(page.path)).replace(/</g, "\\u003c")}</script>`;
}

export function renderPage(path: string) {
  const page = path === "/404" ? notFoundPage : getPage(path);
  const publicComponent = page.kind === "home" ? <PublicHome /> : page.kind === "pricing" ? <PublicPricing /> : page.kind === "about" ? <PublicAbout /> : page.kind === "food-checker" ? <FoodChecker /> : page.kind === "symptom-check" ? <SymptomCheck /> : page.kind === "symptom-results" ? <SymptomCheck results /> : null;
  if (publicComponent) return renderToStaticMarkup(<>{publicComponent}<SiteFooter /></>);
  // Every public route has full HTML before any browser JavaScript executes.
  if (page.kind) return renderToStaticMarkup(<><ContentDocument page={page} /><SiteFooter /></>);
  return "";
}