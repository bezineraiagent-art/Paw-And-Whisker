import { getPage, SITE_URL } from "./site";
import { faqs as homeFaqs } from "../components/faqData";

const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#(?:39|x27);/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
export function structuredData(path: string) {
  const page = getPage(path);
  if (page.noindex) return [];
  const canonical = SITE_URL + page.path;
  const author = { "@type": "Person", name: "Paul", url: SITE_URL + "/about" };
  const publisher = { "@type": "Organization", name: "Paw & Whisker", url: SITE_URL, founder: author, logo: { "@type": "ImageObject", url: SITE_URL + "/app-logo.png" } };
  const schema: object[] = [];
  const crumbs = [{ name: "Home", path: "/" }];
  if (page.path !== "/") {
    if (page.path.startsWith("/guides/")) crumbs.push({ name: "Guides", path: "/guides" });
    if (page.path.startsWith("/compare/")) crumbs.push({ name: "Compare", path: "/compare" });
    if (page.path.startsWith("/tools/")) crumbs.push({ name: "Free tools", path: "/tools" });
    if (page.kind === "food") crumbs.push({ name: "Food checker", path: "/tools/toxic-food-checker" });
    if (page.kind === "symptom-results") crumbs.push({ name: "Symptom check", path: "/tools/symptom-check" });
    crumbs.push({ name: page.heading, path: page.path });
  }
  schema.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: SITE_URL + c.path })) });
  schema.push({ "@context": "https://schema.org", "@type": ["guide", "food", "comparison"].includes(page.kind ?? "") ? "Article" : "WebPage", name: page.title, headline: page.heading, description: page.description, url: canonical, mainEntityOfPage: canonical, author, publisher, dateModified: page.updated });
  if (page.path === "/") {
    schema.push({ "@context": "https://schema.org", "@type": "WebSite", name: "Paw & Whisker", url: SITE_URL, publisher });
    schema.push({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Paw & Whisker", applicationCategory: "LifestyleApplication", operatingSystem: "Web", url: SITE_URL, description: "Educational pet information, free daily-capped AI chat and pet-care reference tools. Not veterinary care.", offers: [{ "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" }, { "@type": "Offer", name: "Plus monthly subscription", price: "4.99", priceCurrency: "USD", url: SITE_URL + "/pricing" }] });
  }
  // Only encode FAQs which are actually visible as question/answer pairs in the page.
  const faq = [...(page.html ?? "").matchAll(/<h3>([^<]*\?)<\/h3><p>([\s\S]*?)<\/p>/g)].map(match => ({ "@type": "Question", name: text(match[1]), acceptedAnswer: { "@type": "Answer", text: text(match[2]) } }));
  if (page.path === "/") faq.push(...homeFaqs.map(item => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })));
  if (page.kind === "food-checker") faq.push(
    { "@type": "Question", name: "Does a green label mean completely safe?", acceptedAnswer: { "@type": "Answer", text: "No. Preparation, swallowing ability, amount, allergies and the rest of your pet's diet all matter. Cats do not need fruit or vegetables as treats." } },
    { "@type": "Question", name: "Should I wait until my pet looks ill?", acceptedAnswer: { "@type": "Answer", text: "No. Suspected poisoning needs prompt professional advice even without symptoms." } },
  );
  if (faq.length) schema.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq });
  return schema;
}