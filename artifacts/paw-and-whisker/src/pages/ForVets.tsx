import { useState } from "react";
import { createClinicApplication, type ClinicApplicationInput } from "@workspace/api-client-react";
import SiteHeader from "@/components/SiteHeader";
import { BizShell, useBizSubmit } from "@/components/BizForm";

export default function ForVets() {
  const biz = useBizSubmit<ClinicApplicationInput>(b => createClinicApplication(b));
  const [intent, setIntent] = useState<"claim" | "featured" | "both">("claim");
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-hero pw-sky small"><div className="pw-wrap pw-reveal">
          <p className="pw-eyebrow">For vets</p>
          <h1>Claim your clinic listing, free</h1>
          <p className="pw-lede">Pet parents use our <a href="/find-a-vet">vet finder</a> when they are worried. If your clinic appears with old details, or is missing, tell us. Claiming a listing is free.</p>
        </div></section>
        <section className="pw-section"><div className="pw-wrap pw-two">
          <div className="content-copy">
            <h2>What this is today</h2>
            <p>This is groundwork. Your application is stored so Paul can review it by hand. Nothing is published automatically and no clinic details change because you applied.</p>
            <h2>Free listing claim</h2>
            <p>Ask us to correct your clinic's name, phone, hours or emergency status, or to add a clinic we've missed.</p>
            <h2>Featured clinic</h2>
            <p>Featured is a paid, clearly labelled placement we are exploring. It is never shown to someone searching in urgent mode, and results in urgent mode stay sorted strictly by distance. It never affects AI answers, symptom results or emergency advice. Read the <a href="/sponsorship-policy">sponsorship policy</a>.</p>
            <p>No rates are listed here. If you apply for Featured, we will reply with details first.</p>
          </div>
          <div>
            <h2>Apply</h2>
            <BizShell testid="clinic" state={biz} submitLabel="Send application" onSubmit={e => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const s = (k: string) => String(f.get(k) ?? "").trim();
              const body: ClinicApplicationInput = { clinicName: s("clinicName"), contactEmail: s("contactEmail"), city: s("city"), message: s("message"), intent, consent: f.get("consent") === "on", fax: s("fax") };
              if (s("contactName")) body.contactName = s("contactName");
              if (s("website")) body.website = s("website");
              biz.submit(body);
            }}>
              <label>Clinic name<input name="clinicName" required minLength={2} maxLength={180} /></label>
              <label>Your name (optional)<input name="contactName" maxLength={120} /></label>
              <label>Contact email<input name="contactEmail" type="email" required /></label>
              <label>City<input name="city" required minLength={2} maxLength={120} /></label>
              <label>Website (optional)<input name="website" type="url" placeholder="https://" /></label>
              <label>What would you like?<select value={intent} onChange={e => setIntent(e.target.value as typeof intent)}><option value="claim">Claim a free listing</option><option value="featured">Apply for Featured</option><option value="both">Both</option></select></label>
              <label>Message<textarea name="message" required minLength={10} maxLength={2000} rows={4} placeholder="Tell us what to correct or add." /></label>
              <label className="pw-consent"><input type="checkbox" name="consent" required /> I agree Paw &amp; Whisker may store these details to review my request. No marketing is sent.</label>
            </BizShell>
          </div>
        </div></section>
      </main>
    </div>
  );
}
