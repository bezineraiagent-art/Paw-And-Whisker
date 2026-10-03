import { useState } from "react";
import { createAdvertiserInquiry, type AdvertiserInquiryInput } from "@workspace/api-client-react";
import SiteHeader from "@/components/SiteHeader";
import { BizShell, useBizSubmit } from "@/components/BizForm";

const opts = [["tools-guides", "Tools and guides"], ["product-box", "Recommended product box"], ["newsletter", "Newsletter"]] as const;

export default function Advertise() {
  const biz = useBizSubmit<AdvertiserInquiryInput>(b => createAdvertiserInquiry(b));
  const [placements, setPlacements] = useState<AdvertiserInquiryInput["placements"]>([]);
  const toggle = (v: (typeof opts)[number][0]) => setPlacements(p => (p ?? []).includes(v) ? (p ?? []).filter(x => x !== v) : [...(p ?? []), v]);
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main">
        <section className="pw-hero pw-sky small"><div className="pw-wrap pw-reveal">
          <p className="pw-eyebrow">Advertise</p>
          <h1>Request the media kit</h1>
          <p className="pw-lede">Paw &amp; Whisker is a small, independent site made by one pet parent. Paid placements are possible, always labelled, and kept apart from health guidance.</p>
        </div></section>
        <section className="pw-section"><div className="pw-wrap pw-two">
          <div className="content-copy">
            <h2>What to expect</h2>
            <p>Rates are shared on request. We don't publish audience numbers or prices on this page. Send a note about your brand and we will reply with what is available.</p>
            <h2>Rules that don't bend</h2>
            <ul>
              <li>Every paid or affiliate placement carries a visible Sponsored label.</li>
              <li>Sponsors never affect AI health answers, symptom results or emergency advice.</li>
              <li>A product shown as recommended by us needs an independent editorial choice first, with the paid or affiliate relationship disclosed.</li>
              <li>No paid placement appears in urgent vet search.</li>
            </ul>
            <p>Full detail: <a href="/sponsorship-policy">sponsorship policy</a>. This form only stores your request. Nothing is sent outward and nothing goes live.</p>
          </div>
          <div>
            <h2>Request the kit</h2>
            <BizShell testid="advertiser" state={biz} submitLabel="Request media kit" onSubmit={e => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const s = (k: string) => String(f.get(k) ?? "").trim();
              const body: AdvertiserInquiryInput = { brandName: s("brandName"), contactEmail: s("contactEmail"), message: s("message"), placements, consent: f.get("consent") === "on", fax: s("fax") };
              if (s("contactName")) body.contactName = s("contactName");
              if (s("website")) body.website = s("website");
              biz.submit(body);
            }}>
              <label>Brand name<input name="brandName" required minLength={2} maxLength={180} /></label>
              <label>Your name (optional)<input name="contactName" maxLength={120} /></label>
              <label>Contact email<input name="contactEmail" type="email" required /></label>
              <label>Website (optional)<input name="website" type="url" placeholder="https://" /></label>
              <fieldset className="pw-checks"><legend>Placements you're curious about</legend>
                {opts.map(([v, l]) => <label key={v}><input type="checkbox" checked={(placements ?? []).includes(v)} onChange={() => toggle(v)} /> {l}</label>)}
              </fieldset>
              <label>Message<textarea name="message" required minLength={10} maxLength={2000} rows={4} /></label>
              <label className="pw-consent"><input type="checkbox" name="consent" required /> I agree Paw &amp; Whisker may store these details to reply to my request.</label>
            </BizShell>
          </div>
        </div></section>
      </main>
    </div>
  );
}
