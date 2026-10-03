import SiteHeader from "@/components/SiteHeader";
import { getPage } from "@/content/site";

export default function PublicAbout() {
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-hero pw-sky small">
          <div className="pw-wrap pw-hero-grid">
            <div className="pw-reveal">
              <p className="pw-eyebrow">About</p>
              <h1>Made by Paul, a pet parent who worries too.</h1>
              <p className="pw-lede">I'm the founder of Paw &amp; Whisker. I'm a pet parent, not a veterinarian.</p>
            </div>
            <img className="pw-photo pw-reveal" loading="lazy" src="/cats.jpg" alt="Two cats resting side by side: Lucky, a black cat with green eyes, and Sugar, a brown tabby" width="816" height="1024" />
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap pw-narrow">
            <article className="content-copy" dangerouslySetInnerHTML={{ __html: getPage("/about").html ?? "" }} />
            <p><a className="pw-btn" href="/#free-chat">Start free</a> <a className="pw-btn ghost" href="/guides">Read the guides</a> <a className="pw-btn ghost" href="/how-it-works">How it works</a></p>
          </div>
        </section>
      </main>
    </div>
  );
}
