import { OptionalPhoto } from "@/components/Art";
import { photoSlots } from "@/content/slots";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { foods, foodPath, riskFor, riskLabels, type Species } from "@/content/foods";
export default function FoodChecker() {
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState<Species>("puppy");
  const selected = foods.filter(food => [food.name, ...(food.aliases ?? [])].join(" ").toLowerCase().includes(query.toLowerCase().trim()));
  return <div className="pw"><SiteHeader /><main id="main" className="tool-main">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/tools">Free tools</a> / Food checker</nav>
    <p className="content-eyebrow">Free food-safety reference</p><h1>Can my pet eat this?</h1>
    <p className="pw-byline">By Paul, pet parent and founder · Updated <time dateTime="2026-10-03">3 October 2026</time></p>
    <p>Check {foods.length} foods for puppies, dogs and cats. Learn what to avoid, what needs plain preparation and when to call for help.</p>
    <div className="emergency-notice"><strong>Already eaten something potentially poisonous?</strong><p>Call an emergency vet now. Do not wait for symptoms, use this checker to calculate a dose or induce vomiting.</p><a href="tel:18884264435">US ASPCA: (888) 426-4435</a> · <a href="tel:18557667661">US Pet Poison Helpline: (855) 764-7661</a><p>Fees may apply. Outside the US, call your local emergency vet. <a href="/find-a-vet?urgent=1">Find an emergency vet near you</a>.</p></div>
    <OptionalPhoto {...photoSlots.food} fallback="bowl" />
    <div className="tool-filters"><label>Pet type<select value={species} onChange={e => setSpecies(e.target.value as Species)}><option value="puppy">Puppy</option><option value="dog">Dog</option><option value="cat">Cat</option></select></label><label>Search foods<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try chocolate, grapes or carrots" /></label></div>
    <p aria-live="polite">{selected.length} foods found. “Generally non-toxic” never means unlimited or suitable for every pet.</p>
    {!selected.length && <div className="tool-empty"><h2>That food isn't in our reference yet.</h2><p>No result does not mean safe. Check all ingredients and contact your vet if your pet has eaten something uncertain.</p></div>}
    <div className="food-grid">{selected.map(food => <a href={foodPath(food, species)} key={food.slug} className="food-card"><span className={`food-status food-status-${riskFor(food, species)}`}>{riskLabels[riskFor(food, species)]}</span><h2>{food.name}</h2><p>{species === "cat" && food.catNote ? food.catNote : food.summary}</p><span>Read {species} guidance →</span></a>)}</div>
    <section className="content-copy"><h2>How this checker works</h2><p>Entries summarize ASPCA and Pet Poison Helpline hazard information, with AKC preparation advice for common dog-friendly produce. Dog-specific poison evidence is not automatically applied to cats. Puppy pages add growth and small-size cautions. This is a reference, not a personalized poisoning assessment.</p><h2>Frequently asked questions</h2><h3>Does a green label mean completely safe?</h3><p>No. Preparation, swallowing ability, amount, allergies and the rest of your pet's diet all matter. Cats do not need fruit or vegetables as treats.</p><h3>Should I wait until my pet looks ill?</h3><p>No. Suspected poisoning needs prompt professional advice even without symptoms.</p><p><a href="/guides/toxic-foods-for-puppies">Read the recovered toxic foods guide</a> · <a href="/tools/symptom-check">Try the symptom check</a></p></section>
  </main></div>;
}