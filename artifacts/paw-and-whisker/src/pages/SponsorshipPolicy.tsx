import SiteHeader from "@/components/SiteHeader";
import { SponsoredLabel } from "@/components/Sponsored";

export default function SponsorshipPolicy() {
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-hero pw-sky small"><div className="pw-wrap pw-reveal">
          <p className="pw-eyebrow">Policy</p>
          <h1>Sponsorship and advertising policy</h1>
          <p className="pw-lede">How money can and can't appear on Paw &amp; Whisker. Short version: it never touches health advice.</p>
        </div></section>
        <section className="pw-section"><div className="pw-wrap pw-narrow content-copy">
          <h2>Today</h2>
          <p>No sponsors are live. We have set up the groundwork for labelled placements and a <a href="/for-vets">clinic listing</a> and <a href="/advertise">advertiser</a> enquiry. Requests are stored for review only.</p>
          <h2>What is always disclosed</h2>
          <p>Anything paid for or earning us a commission carries a visible label, <SponsoredLabel />, and sits in a separate box. Paid and affiliate links use rel="sponsored nofollow".</p>
          <h2>What sponsors never change</h2>
          <ul>
            <li>AI health answers.</li>
            <li>Symptom-check results.</li>
            <li>Emergency advice or its wording.</li>
            <li>Urgent vet search: results stay strictly sorted by distance, and no featured or sponsored clinic is shown.</li>
          </ul>
          <h2>Recommended product boxes</h2>
          <p>A product described as recommended by us must first be chosen independently by Paul. Payment or affiliate income can't buy that choice, and the relationship is disclosed beside the box.</p>
          <h2>Featured clinics</h2>
          <p>A Featured clinic would be labelled and kept out of urgent mode. Being featured doesn't imply our endorsement of care quality.</p>
          <h2>Contact</h2>
          <p>Questions or concerns: <a href="mailto:paul@pawandwhisker.net">paul@pawandwhisker.net</a>.</p>
        </div></section>
      </main>
    </div>
  );
}
