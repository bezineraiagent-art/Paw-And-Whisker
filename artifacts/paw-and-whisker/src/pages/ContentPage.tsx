import { useLocation } from "wouter";
import { getPage, pages, type SitePage } from "@/content/site";
import SiteHeader from "@/components/SiteHeader";

export function ContentDocument({ page }: { page: SitePage }) {
  return (
    <div className="content-shell">
      <SiteHeader />
      <main className="content-main">
        <p className="content-eyebrow">{page.kind === "guide" || page.kind === "guides" ? "Free puppy guides" : "Paw & Whisker"}</p>
        <h1>{page.heading}</h1>
        {page.kind === "guides" ? (
          <>
            <p>Practical reading for new puppy parents. Start here, for free.</p>
            <div className="guide-list">
              {pages.filter(p => p.kind === "guide").map(guide => (
                <a key={guide.path} href={guide.path}>
                  <h2>{guide.heading}</h2><p>{guide.description}</p><span>Read the free guide →</span>
                </a>
              ))}
            </div>
            <p className="guide-callout">These guides are general information, not veterinary advice. Contact an emergency vet immediately for urgent signs.</p>
          </>
        ) : page.kind === "404" ? (
          <><p>This link may be out of date, or the page may have moved. You can still find free help below.</p><p><a className="content-button" href="/">Back to home</a> <a href="/guides">Browse free puppy guides →</a></p></>
        ) : (
          <>
            {page.kind === "guide" && <p className="guide-callout">General information, not veterinary advice. Puppies develop at different rates; check routines and safety choices with your vet. For urgent signs or suspected poisoning, seek an emergency vet immediately.</p>}
            <article className="content-copy" dangerouslySetInnerHTML={{ __html: page.html ?? "" }} />
          </>
        )}
      </main>
    </div>
  );
}

export default function ContentPage() {
  const [location] = useLocation();
  return <ContentDocument page={getPage(location)} />;
}