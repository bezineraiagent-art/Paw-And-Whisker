import SiteHeader from "@/components/SiteHeader";
import { STRIPE_PAYMENT_LINK } from "@/content/site";

export default function PublicPricing() {
  return (
    <div className="pw">
      <SiteHeader />
      <main>
        <section className="pw-hero">
          <div className="pw-wrap pw-narrow pw-reveal">
            <p className="pw-eyebrow">Pricing</p>
            <h1>Start free. Upgrade only if you want to.</h1>
            <p className="pw-lede">The tools that matter most in a worrying moment cost nothing.</p>
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-plans">
              <div className="pw-card">
                <span className="pw-tag">Free</span>
                <div className="pw-price">$0</div>
                <ul className="pw-list">
                  <li>One pet profile, saved in your browser</li>
                  <li>2 AI questions per day, resetting at midnight UTC</li>
                  <li>Free symptom check</li>
                  <li>Free toxic food checker</li>
                  <li>All guides</li>
                </ul>
                <a className="pw-btn" href="/#free-chat">Try the free chat</a>
              </div>
              <div className="pw-card feature">
                <span className="pw-tag">Plus</span>
                <div className="pw-price" style={{ color: "#fbf7ea" }}>$4.99 <small style={{ color: "#cfdcc3" }}>per month</small></div>
                <ul className="pw-list">
                  <li>Unlimited chat questions</li>
                  <li>Photo questions</li>
                </ul>
                <p>Billed through Stripe. Cancel anytime. Refunds can be requested within 7 days of a charge.</p>
                <a className="pw-btn gold" href={STRIPE_PAYMENT_LINK}>See Plus on Stripe</a>
              </div>
            </div>
          </div>
        </section>
        <section className="pw-section alt">
          <div className="pw-wrap pw-narrow">
            <span className="pw-tag soon">Planned, coming soon</span>
            <h2 style={{ marginTop: ".75rem" }}>Ideas on the list</h2>
            <p>These are not available yet and are not part of any plan today.</p>
            <ul className="pw-list planned">
              <li>Multiple pet profiles</li>
              <li>Reminders</li>
              <li>Vet visit summaries</li>
            </ul>
          </div>
        </section>
        <section className="pw-section">
          <div className="pw-wrap pw-narrow">
            <h2>Puppy Survival Kit</h2>
            <p>Printable guides for the first 30 days. A separate one-time purchase, not included in Plus.</p>
            <p><a className="pw-btn ghost" href="https://pawandwhisker.net/puppy-kit/">Explore the Puppy Kit</a></p>
            <p className="pw-disc">General pet information, not veterinary advice. AI can make mistakes. For urgent signs, go to an emergency vet immediately.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
