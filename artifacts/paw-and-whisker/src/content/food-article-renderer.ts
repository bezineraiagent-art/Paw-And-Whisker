import type { SitePage } from "./site";
import type { Food } from "./foods";
import foodArticles from "./food-articles";

export type FoodArticle = {
  slug: string; verdict: string; mechanism: string; preparation: string; signsAndTiming: string;
  puppy: string; dog: string; cat: string; alternatives: string;
  faqs: { question: string; answer: string }[]; related: string[];
};
// Explicit imports also work in the Node-loaded Vite SEO configuration.
const articles: Record<string, FoodArticle> = Object.fromEntries(foodArticles.map(article => [article.slug, article]));
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const paragraph = (value: string) => value.split(/\n+/).filter(Boolean).map(p => `<p>${escape(p)}</p>`).join("");
export const foodEmergencyBlock = `<aside class="emergency-notice food-emergency"><strong>Possible poisoning? Call now; do not wait for signs.</strong><p>Tell your vet the food, ingredients, amount, time, species, age, weight and symptoms. Do not induce vomiting or give home remedies. US: <a href="tel:18884264435">ASPCA (888) 426-4435</a>; <a href="tel:18557667661">Pet Poison Helpline (855) 764-7661</a> (fees may apply). Elsewhere call your emergency vet. <a href=\"/find-a-vet?urgent=1\">Find an emergency vet near you</a>. General information, not diagnosis or veterinary advice.</p></aside>`;
export function buildFoodPage(food: Food, allFoods: Food[]): SitePage {
  const article = articles[food.slug];
  if (!article) throw new Error(`Missing substantive food article: ${food.slug}`);
  let description = `${food.name}: puppy, dog and cat safety, ingredient warnings, preparation, possible signs and timing, safer alternatives and answers to common food questions.`;
  if (description.length > 158) description = description.replace("possible signs and timing", "signs and timing");
  if (description.length > 158) description = description.replace("answers to common food questions", "food-specific FAQs");
  if (description.length < 140) description = description.replace("food-specific FAQs", "answers to food-specific FAQs");
  if (description.length < 140 || description.length > 158) throw new Error(`Food description length: ${food.slug} ${description.length}`);
  const related = [...new Set(article.related)].filter(slug => slug !== food.slug && allFoods.some(f => f.slug === slug)).slice(0, 4);
  const foodName = escape(food.name);
  const symbol = food.risk === "toxic" ? "!" : food.risk === "avoid" ? "!" : "✓";
  const label = food.risk === "toxic" ? "Toxic — call a vet" : food.risk === "avoid" ? "Not recommended" : food.catRisk === "avoid" ? "Dogs: safe when prepared" : "Safe when prepared";
  return {
    path: `/tools/toxic-food-checker/${food.slug}`, kind: "food",
    heading: `${food.name}: puppy, dog and cat safety`,
    title: `${food.name} Safety for Pets | Paw & Whisker`,
    description,
    html: `<p class="food-status food-status-${food.risk}"><span aria-hidden="true" class="verdict-icon">${symbol}</span><strong>${label}</strong></p>
${paragraph(article.verdict)}
<nav class="food-species-nav" aria-label="Species guidance"><a href="#puppy">Puppies</a><a href="#dog">Adult dogs</a><a href="#cat">Cats</a></nav>
<h2 id="why">Why ${foodName.toLowerCase()} needs this verdict</h2>${paragraph(article.mechanism)}
<h2 id="preparation">Parts, ingredients and preparation</h2>${paragraph(article.preparation)}
<h2 id="signs">Possible signs and timing</h2>${paragraph(article.signsAndTiming)}
<section class="species-guidance"><h2 id="puppy">Puppy guidance</h2>${paragraph(article.puppy)}<h2 id="dog">Adult dog guidance</h2>${paragraph(article.dog)}<h2 id="cat">Cat guidance</h2>${paragraph(article.cat)}</section>
<h2 id="alternatives">Safer alternatives to ${foodName.toLowerCase()}</h2>${paragraph(article.alternatives)}
<h2 id="faq">${foodName} questions</h2>${article.faqs.map(faq => `<h3>${escape(faq.question)}</h3><p>${escape(faq.answer)}</p>`).join("")}
${foodEmergencyBlock}
<h2 id="related">Related foods to check</h2><ul class="related-foods">${related.map(slug => `<li><a href="/tools/toxic-food-checker/${slug}">${escape(allFoods.find(f => f.slug === slug)!.name)}</a></li>`).join("")}</ul>
<h2 id="sources">Sources and scope</h2><p><a href="${food.source}" target="_blank" rel="noopener noreferrer">Food-safety source for ${foodName.toLowerCase()}</a> · <a href="https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets">ASPCA people-food reference</a>. This original summary distinguishes established hazards from uncertainty; source organizations have not reviewed this website.</p><p><a href="/tools/toxic-food-checker">Search another food</a> · <a href="/tools/symptom-check">Free symptom check</a></p>`,
  };
}