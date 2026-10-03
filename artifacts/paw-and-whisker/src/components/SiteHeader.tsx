export default function SiteHeader() {
  return (
    <header className="content-header">
      <a href="/" className="site-wordmark">Paw &amp; Whisker</a>
      <nav aria-label="Main navigation">
        <a href="/guides">Guides</a>
        <a href="/tools/symptom-check">Symptom check</a>
        <a href="/tools/toxic-food-checker">Toxic foods</a>
        <a href="https://pawandwhisker.net/puppy-kit/">Puppy Kit</a>
        <a href="/pricing">Pricing</a>
        <a href="/about">About</a>
        <a href="/#free-chat" className="content-secondary">Start free</a>
      </nav>
    </header>
  );
}
