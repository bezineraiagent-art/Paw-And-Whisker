export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <a href="/" className="site-wordmark">Paw &amp; Whisker</a>
        <nav aria-label="Footer navigation">
          <a href="/guides">Guides</a>
          <a href="https://pawandwhisker.net/puppy-kit/">Puppy Kit</a>
          <a href="/pricing">Pricing</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund">Refunds</a>
          <a href="/medical-disclaimer">Medical disclaimer</a>
        </nav>
        <p>General pet information, not veterinary advice. Never replaces a vet. For urgent signs, go to an emergency vet immediately.</p>
        <p><a href="mailto:paul@pawandwhisker.net">Contact support</a> · © 2026 Paw &amp; Whisker</p>
      </div>
    </footer>
  );
}