import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { foods, foodPath, riskFor, type Species } from "@/content/foods";
import RiskBadge from "@/components/RiskBadge";
import { Bowl, Cat } from "@/components/Art";

const speciesList: { v: Species; l: string }[] = [{ v: "puppy", l: "Puppy" }, { v: "dog", l: "Dog" }, { v: "cat", l: "Cat" }];

/** Real, keyboard-operable combobox over the full food reference. */
export default function FoodSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState<Species>("puppy");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const q = query.toLowerCase().trim();
  const results = useMemo(() => {
    if (!q) return [];
    return foods
      .filter(f => [f.name, f.slug.replace(/-/g, " "), ...(f.aliases ?? [])].join(" ").toLowerCase().includes(q))
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
      .slice(0, 6);
  }, [q]);
  const showList = open && q.length > 0;
  function go(i: number) {
    const f = results[i];
    if (f) window.location.assign(foodPath(f, species));
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(a => (results.length ? (a + 1) % results.length : -1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (results.length ? (a <= 0 ? results.length - 1 : a - 1) : -1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(active >= 0 ? active : 0); }
    else if (e.key === "Escape") { setOpen(false); setActive(-1); }
  }
  return (
    <section className={"pw-foodsearch" + (compact ? " compact" : "")} aria-labelledby={`${id}-h`} data-testid="food-search">
      <div className="pw-fs-head">
        <Bowl className="pw-fs-art" />
        <div>
          <h2 id={`${id}-h`}>Ate something odd? Check the food first.</h2>
          <p>Search {foods.length} common foods. If your pet may have eaten something poisonous, call an emergency vet now, without waiting for signs.</p>
        </div>
      </div>
      <div className="pw-fs-row">
        <div className="pw-fs-species" role="radiogroup" aria-label="Pet type" onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const current = speciesList.findIndex(item => item.v === species);
          const index = event.key === "Home" ? 0 : event.key === "End" ? 2 : (current + (event.key === "ArrowRight" ? 1 : 2)) % 3;
          setSpecies(speciesList[index].v);
          event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
        }}>
          {speciesList.map(s => (
            <button key={s.v} type="button" role="radio" aria-checked={species === s.v} className={species === s.v ? "on" : ""} onClick={() => setSpecies(s.v)}>{s.l}</button>
          ))}
        </div>
        <div className="pw-fs-field">
          <label htmlFor={`${id}-in`} className="pw-sr">Search foods</label>
          <Search aria-hidden="true" size={20} className="pw-fs-icon" />
          <input
            ref={input}
            id={`${id}-in`}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${id}-o${active}` : undefined}
            autoComplete="off"
            placeholder="Try chocolate, grapes, carrots"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKey}
            data-testid="input-food-search"
          />
          {showList && (
            <ul id={`${id}-list`} role="listbox" aria-label="Matching foods" className="pw-fs-list">
              {results.map((f, i) => (
                <li key={f.slug} id={`${id}-o${i}`} role="option" aria-selected={i === active} className={i === active ? "on" : ""} onMouseEnter={() => setActive(i)} onMouseDown={e => { e.preventDefault(); go(i); }}>
                  <span className="n">{f.name}</span>
                  <RiskBadge risk={riskFor(f, species)} />
                </li>
              ))}
              {!results.length && <li role="option" aria-selected="false" aria-disabled="true" className="none"><Cat className="pw-empty-art" />Not in our reference yet. No result does not mean safe; check the ingredients and ask a vet if unsure.</li>}
            </ul>
          )}
        </div>
      </div>
      <p className="pw-fs-foot" aria-live="polite">
        {q ? `${results.length ? "Press Enter to open the first match." : "No matches."}` : "General information, not veterinary advice."}{" "}
        <a href="/tools/toxic-food-checker">Browse all foods</a>
      </p>
    </section>
  );
}
