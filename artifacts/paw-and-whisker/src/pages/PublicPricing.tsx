import SiteHeader from "@/components/SiteHeader";
import WaitlistForm from "@/components/WaitlistForm";
import { getPage } from "@/content/site";

export default function PublicPricing() {
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-hero pw-sky small">
          <div className="pw-wrap pw-narrow pw-reveal">
            <p className="pw-eyebrow onDark">Pricing</p>
            <h1>Free today. Whisker Plus is coming soon.</h1>
            <p className="pw-lede onDark">The tools that matter most in a worrying moment cost nothing, and nothing here is a subscription.</p>
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-plans">
              <div className="pw-card">
                <span className="pw-tag">Free today</span>
                <div className="pw-price">$0</div>
                <ul className="pw-list">
                  <li>One pet profile, saved in your browser</li>
                  <li>2 AI questions a day, text or photo, resetting at midnight UTC</li>
                  <li>Free symptom check</li>
                  <li>Free toxic food checker</li>
                  <li>All guides</li>
                </ul>
                <a className="pw-btn" href="/#free-chat">Try the free chat</a>
              </div>
              <div className="pw-card">
                <span className="pw-tag soon">Coming soon</span>
                <div className="pw-price">Whisker Plus</div>
                <p>Not for sale and no price yet. Joining the waitlist only saves your email so we can tell you when it opens.</p>
                <a className="pw-btn ghost" href="#plus-waitlist">Join the waitlist</a>
              </div>
            </div>
            <div className="pw-narrow" style={{ marginTop: "2rem" }}><WaitlistForm id="plus-waitlist" /></div>
          </div>
        </section>
        <section className="pw-section"><div className="pw-wrap pw-narrow"><article className="content-copy" dangerouslySetInnerHTML={{ __html: getPage("/pricing").html ?? "" }} /></div></section>
        <section className="pw-section alt">
          <div className="pw-wrap pw-narrow">
            <span className="pw-tag soon">Ideas only</span>
            <h2 style={{ marginTop: ".75rem" }}>Not available, not promised</h2>
            <p>These are ideas, not features and not part of anything you can buy today.</p>
            <ul className="pw-list planned"><li>Multiple pet profiles</li><li>Reminders</li><li>Vet visit summaries</li></ul>
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap pw-narrow">
            <h2>Puppy Survival Kit</h2>
            <p>Printable guides for the first 30 days. A separate one-time $12 purchase.</p>
            <p><a className="pw-btn ghost" href="/puppy-kit/">Explore the Puppy Kit</a></p>
            <p className="pw-disc">General pet information, not veterinary advice. AI can make mistakes. For urgent signs, go to an emergency vet immediately.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
