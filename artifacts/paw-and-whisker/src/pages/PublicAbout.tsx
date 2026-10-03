import SiteHeader from "@/components/SiteHeader";

export default function PublicAbout() {
  return (
    <div className="pw">
      <SiteHeader />
      <main>
        <section className="pw-hero">
          <div className="pw-wrap pw-hero-grid">
            <div className="pw-reveal">
              <p className="pw-eyebrow">About</p>
              <h1>Made by Paul, a pet parent who worries too.</h1>
              <p className="pw-lede">I'm the founder of Paw &amp; Whisker. I'm a pet parent, not a veterinarian.</p>
            </div>
            <img className="pw-photo pw-reveal" src="/cats.jpg" alt="Two cats resting side by side: a black cat with green eyes and a brown tabby" width="816" height="1024" />
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap pw-narrow">
            <h2>The cats behind it</h2>
            <p>Lucky is curious and playful. Her older sister is calm and observant. Living with them is what made me want a gentler place to ask the small questions that come with caring for an animal.</p>
            <h2 style={{ marginTop: "2.5rem" }}>What this is and isn't</h2>
            <p>It's a free-first companion with general pet information, guides and simple tools. It does not diagnose, treat, or replace your vet.</p>
            <p><strong>Reviewed by a licensed veterinarian: coming soon</strong></p>
            <p><a className="pw-btn" href="/#free-chat">Start free</a> <a className="pw-btn ghost" href="/guides">Read the guides</a></p>
          </div>
        </section>
      </main>
    </div>
  );
}
