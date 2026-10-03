export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <a href="/" className="site-wordmark">Paw &amp; Whisker</a>
        <nav aria-label="Footer navigation">
          <a href="/guides">Guides</a>
          <a href="/tools/symptom-check">Symptom check</a>
          <a href="/tools/toxic-food-checker">Toxic food checker</a>
          <a href="/compare">Compare</a>
          <a href="https://pawandwhisker.net/puppy-kit/">Puppy Kit</a>
          <a href="/pricing">Pricing</a>
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund">Refunds</a>
          <a href="/medical-disclaimer">Medical disclaimer</a>
        </nav>
        <p>General pet information, not veterinary advice. AI can make mistakes and never replaces a vet. For urgent signs or suspected poisoning, go to an emergency vet immediately.</p>
        <p><a href="mailto:paul@pawandwhisker.net">Contact Paul</a> · © 2026 Paw &amp; Whisker</p>
      </div>
    </footer>
  );
}
