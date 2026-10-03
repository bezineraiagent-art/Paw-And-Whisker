import { useLocation } from "wouter";
import { getPage, pages, type SitePage } from "@/content/site";
import SiteHeader from "@/components/SiteHeader";

const BYLINE_KINDS = ["guide", "comparison", "food"];

export function ContentDocument({ page }: { page: SitePage }) {
  const updated = (page as SitePage & { updated?: string }).updated;
  const byline = page.kind && BYLINE_KINDS.includes(page.kind);
  const isGuide = page.kind === "guide";
  return (
    <div className="pw">
      <SiteHeader />
      <main className="pw-article">
        <div className="pw-wrap pw-narrow">
          {page.path !== "/" && (
            <nav className="pw-crumbs" aria-label="Breadcrumb">
              <a href="/">Home</a> / {isGuide || page.kind === "guides" ? <><a href="/guides">Guides</a>{isGuide && <> / {page.heading}</>}</> : page.kind === "food" ? <><a href="/tools">Free tools</a> / <a href="/tools/toxic-food-checker">Food checker</a> / {page.heading}</> : page.kind === "comparison" ? <><a href="/compare">Compare</a> / {page.heading}</> : page.heading}
            </nav>
          )}
          <h1>{page.heading}</h1>
          {byline && <p className="pw-byline">By Paul, pet parent and founder{updated ? <> · Updated <time dateTime={updated}>{updated}</time></> : null}</p>}
          {!byline && updated && <p className="pw-byline">Updated <time dateTime={updated}>{updated}</time></p>}
          {page.kind === "guides" ? (
            <>
              <p className="pw-lede">Practical reading for new puppy parents. Start here, for free.</p>
              <h2 style={{ marginBottom: "1.25rem" }}>Choose a guide</h2>
              <div className="pw-grid">
                {pages.filter(p => p.kind === "guide").map(guide => (
                  <a key={guide.path} href={guide.path} className="pw-card">
                    <h3>{guide.heading}</h3><p>{guide.description}</p><span className="go">Read the free guide</span>
                  </a>
                ))}
              </div>
              <p className="guide-callout" style={{ marginTop: "2rem" }}>These guides are general information, not veterinary advice. Contact an emergency vet immediately for urgent signs.</p>
            </>
          ) : page.kind === "404" ? (
            <>
              <p className="pw-lede">This link may be out of date, or the page may have moved. You can still find free help.</p>
              <p><a className="pw-btn" href="/">Back to home</a> <a className="pw-btn ghost" href="/guides">Browse guides</a></p>
            </>
          ) : (
            <>
              {isGuide && <p className="guide-callout">General information, not veterinary advice. Puppies develop at different rates; check routines and safety choices with your vet. For urgent signs or suspected poisoning, seek an emergency vet immediately.</p>}
              <article className="content-copy" dangerouslySetInnerHTML={{ __html: page.html ?? "" }} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ContentPage() {
  const [location] = useLocation();
  return <ContentDocument page={getPage(location)} />;
}
