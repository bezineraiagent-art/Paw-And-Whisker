import { Moon, Paw } from "@/components/Art";

const cols = [
  { h: "Free tools", l: [["/tools/symptom-check", "Symptom check"], ["/tools/toxic-food-checker", "Toxic food checker"], ["/#free-chat", "Free chat"], ["/find-a-vet", "Find a vet"], ["/tools", "All tools"]] },
  { h: "Read", l: [["/guides", "Guides"], ["/compare", "Compare"], ["/puppy-kit/", "Puppy Kit"], ["/pricing", "Pricing and Plus waitlist"]] },
  { h: "About", l: [["/about", "Paul and the cats"], ["/how-it-works", "How it works"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/refund", "Puppy Kit refunds"], ["/medical-disclaimer", "Medical disclaimer"], ["/sponsorship-policy", "Sponsorship policy"]]},
  { h: "Business", l: [["/for-vets", "For vets"], ["/advertise", "Advertise"], ["/sponsorship-policy", "Sponsorship policy"]] },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="sf-top">
          <div className="sf-brand">
            <Moon className="sf-moon" />
            <a href="/" className="site-wordmark">Paw &amp; Whisker</a>
            <p>A calm place to start when something about your pet worries you. Made by Paul, a pet parent, not a veterinarian.</p>
          </div>
          <nav aria-label="Footer navigation" className="sf-cols">
            {cols.map(c => (
              <div key={c.h}>
                <h2>{c.h}</h2>
                <ul>{c.l.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="sf-urgent" role="note">
          <Paw className="sf-paw" />
          <p><strong>Urgent signs or a suspected poisoning?</strong> General pet information, not veterinary advice. AI can make mistakes and never replaces a vet. Go to an emergency vet immediately.</p>
        </div>
        <p className="sf-fine"><span>Any paid placement is labelled Sponsored and never affects health advice. <a href="/sponsorship-policy">Policy</a></span> · <a href="mailto:paul@pawandwhisker.net">Contact Paul</a> · © 2026 Paw &amp; Whisker</p>
      </div>
    </footer>
  );
}
