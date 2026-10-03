import SiteHeader from "@/components/SiteHeader";
import FreeCompanion from "@/components/FreeCompanion";
import EmailCapture from "@/components/EmailCapture";

const paths = [
  { href: "/tools/symptom-check", t: "Free symptom check", d: "Answer a few questions and get general guidance on how urgent something may be.", f: true },
  { href: "/tools/toxic-food-checker", t: "Toxic food checker", d: "Check ingredients before sharing food. Suspected poisoning? Call a vet now, even without symptoms." },
  { href: "/guides", t: "Free puppy guides", d: "Checklists and first-30-days plans written for people who are nervous and trying hard." },
  { href: "/compare", t: "Comparisons", d: "Side-by-side looks at pet-care choices, without the sales pressure." },
];

export default function PublicHome() {
  return (
    <div className="pw">
      <SiteHeader />
      <main>
        <section className="pw-hero">
          <div className="pw-wrap pw-hero-grid">
            <div className="pw-reveal">
              <p className="pw-eyebrow">For new puppy parents and cat families</p>
              <h1>Worried at 2am? Start with <em>free</em> help.</h1>
              <p className="pw-lede">Paw &amp; Whisker is a calm companion for the first weeks with a dog or cat. Ask two AI questions a day, run a symptom check, look up a food. None of it needs a card.</p>
              <div className="pw-actions">
                <a className="pw-btn" href="#free-chat">Ask a free question</a>
                <a className="pw-btn ghost" href="/tools/symptom-check">Run the symptom check</a>
              </div>
              <p className="pw-note">General information only, not veterinary advice. If your pet struggles to breathe, collapses, or may have eaten poison, go to an emergency vet now.</p>
            </div>
            <img className="pw-photo pw-reveal" src="/cats.jpg" alt="Two cats resting side by side: a black cat with green eyes and a brown tabby" width="816" height="1024" />
          </div>
        </section>

        <section className="pw-section">
          <div className="pw-wrap">
            <p className="pw-eyebrow">Free, start anywhere</p>
            <h2>Four ways in, all free</h2>
            <div className="pw-grid two">
              {paths.map(p => (
                <a key={p.href} href={p.href} className={"pw-card" + (p.f ? " feature" : "")}>
                  <h3>{p.t}</h3><p>{p.d}</p><span className="go">Open it</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="pw-section alt" id="free-chat">
          <div className="pw-wrap">
            <p className="pw-eyebrow">Free chat</p>
            <h2>Ask your question</h2>
            <p className="pw-lede">Two free AI questions each day, resetting at midnight UTC.</p>
            <FreeCompanion />
          </div>
        </section>

        <section className="pw-section">
          <div className="pw-wrap pw-split">
            <div>
              <p className="pw-eyebrow">Why it exists</p>
              <h2>Built by a pet parent, not a vet</h2>
            </div>
            <div>
              <p>I'm Paul. I made this after living with my cats, Lucky and her sister, and learning how fast small worries turn big when you have no one to ask. I'm not a veterinarian, and this site says so everywhere.</p>
              <p><a href="/about">Read more about Paul and the cats</a></p>
            </div>
          </div>
        </section>

        <section className="pw-section dark">
          <div className="pw-wrap pw-split">
            <div>
              <h2>Want more later?</h2>
              <p>Plus is $4.99 a month for unlimited chat and photo questions. The free tools stay free.</p>
            </div>
            <div className="pw-actions">
              <a className="pw-btn gold" href="/pricing">See pricing</a>
              <a className="pw-btn ghost" style={{ color: "#fbf7ea", borderColor: "#fbf7ea" }} href="https://pawandwhisker.net/puppy-kit/">Puppy Kit</a>
            </div>
          </div>
        </section>

        <section className="pw-section">
          <div className="pw-wrap pw-narrow">
            <EmailCapture />
          </div>
        </section>
      </main>
    </div>
  );
}
