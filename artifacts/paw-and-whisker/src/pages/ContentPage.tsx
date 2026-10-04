import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { getPage, pages, type SitePage } from "@/content/site";
import SiteHeader from "@/components/SiteHeader";
import { Bowl, Cat, Doorframe, NightScene, Puppy } from "@/components/Art";
import SceneIllustration from "@/components/SceneIllustration";
import ReviewerStatus from "@/components/ReviewerStatus";
import { hasReviewerStatus } from "@/content/reviewer";

const BYLINE_KINDS = ["guide", "comparison", "food"];

function slug(s: string) { return s.toLowerCase().replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section"; }

/** Derives the TOC from real h2/h3 headings and gives each a stable id. */
export function withToc(html: string) {
  const used = new Set<string>();
  const toc: { id: string; text: string; level: number }[] = [];
  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").trim();
    const existing = /\sid="([^"]+)"/.exec(attrs);
    let id = existing ? existing[1] : slug(text);
    if (!existing) { let n = 2; const b = id; while (used.has(id)) id = `${b}-${n++}`; }
    used.add(id);
    toc.push({ id, text, level: Number(lvl) });
    return existing ? _m : `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

function Hero({ page }: { page: SitePage }) {
  const art = page.kind === "guides" ? <Puppy /> : page.kind === "tools" ? <Bowl /> : page.kind === "kit" ? <Doorframe /> : page.kind === "404" ? <NightScene title="A cat sitting under the moon" /> : page.path === "/compare" ? <Cat /> : null;
  return art ? <div className="pw-hub-art">{art}</div> : null;
}

export function ContentDocument({ page }: { page: SitePage }) {
  const updated = (page as SitePage & { updated?: string }).updated;
  const byline = page.kind && BYLINE_KINDS.includes(page.kind);
  const isGuide = page.kind === "guide";
  const body = useMemo(() => withToc(page.html ?? ""), [page.html]);
  const showToc = !!page.kind && ["guide", "comparison", "food", "about"].includes(page.kind) && body.toc.length >= 3;
  const [tocOpen, setTocOpen] = useState(false);
  useEffect(() => { setTocOpen(window.matchMedia("(min-width: 900px)").matches); }, [page.path]);

  useEffect(() => {
    if (!showToc || typeof IntersectionObserver === "undefined") return;
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".pw-toc a"));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); });
    }, { rootMargin: "-90px 0px -70% 0px" });
    body.toc.forEach(t => { const el = document.getElementById(t.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [showToc, body]);

  const copy = (
    <>
      {isGuide && <p className="guide-callout">General information, not veterinary advice. Puppies develop at different rates; check routines and safety choices with your vet. For urgent signs or suspected poisoning, seek an emergency vet immediately.</p>}
      <article className="content-copy" dangerouslySetInnerHTML={{ __html: body.html }} />
    </>
  );
  return (
    <div className="pw">
      <SiteHeader />
      <main id="main" className="pw-article">
        <div className={"pw-wrap " + (showToc ? "pw-article-wide" : "pw-narrow")}>
          {page.path !== "/" && (
            <nav className="pw-crumbs" aria-label="Breadcrumb">
              <a href="/">Home</a> / {isGuide || page.kind === "guides" ? <><a href="/guides">Guides</a>{isGuide && <> / {page.heading}</>}</> : page.kind === "food" ? <><a href="/tools">Free tools</a> / <a href="/tools/toxic-food-checker">Food checker</a> / {page.heading}</> : page.kind === "comparison" ? <><a href="/compare">Compare</a> / {page.heading}</> : page.heading}
            </nav>
          )}
          <div className={Hero({ page }) ? "pw-hub-hero" : undefined}>
            <div>
              <h1>{page.heading}</h1>
              {byline && <p className="pw-byline"><span className="av" aria-hidden="true">P</span><span>By Paul, pet parent and founder{updated ? <> · Updated <time dateTime={updated}>{updated}</time></> : null}<small>Not a veterinarian. General information only.</small></span></p>}
              {!byline && updated && <p className="pw-byline">Updated <time dateTime={updated}>{updated}</time></p>}
            </div>
            <Hero page={page} />
          </div>
          {hasReviewerStatus(page) && <ReviewerStatus />}
          {page.path === "/guides/puppy-first-30-days" && <SceneIllustration scene="guides" />}
          {page.kind === "guides" ? (
            <>
              <p className="pw-lede">Practical reading for new puppy parents. Start here, for free.</p>
              <h2 style={{ marginBottom: "1.25rem" }}>Choose a guide</h2>
              <div className="pw-grid two">
                {pages.filter(p => p.kind === "guide").map(guide => (
                  <a key={guide.path} href={guide.path} className="pw-card">
                    <h3>{guide.heading}</h3><p>{guide.description}</p><span className="go">Read the free guide</span>
                  </a>
                ))}
              </div>
              <p className="guide-callout" style={{ marginTop: "2rem" }}>These guides are general information, not veterinary advice. Contact an emergency vet immediately for urgent signs.</p>
              <div style={{ marginTop: "2.5rem" }}><SceneIllustration scene="guides" /></div>
            </>
          ) : page.kind === "404" ? (
            <>
              <p className="pw-lede">This link may be out of date, or the page may have moved. You can still find free help.</p>
              <p className="pw-actions"><a className="pw-btn" href="/">Back to home</a> <a className="pw-btn ghost" href="/guides">Browse guides</a></p>
            </>
          ) : showToc ? (
            <div className="pw-toc-wrap">
              <details className="pw-toc" open={tocOpen} onToggle={event => setTocOpen(event.currentTarget.open)}>
                <summary>On this page</summary>
                <ol>{body.toc.map(t => <li key={t.id} className={"h" + t.level}><a href={"#" + t.id}>{t.text}</a></li>)}</ol>
              </details>
              <div>{copy}</div>
            </div>
          ) : copy}
        </div>
      </main>
    </div>
  );
}

export default function ContentPage() {
  const [location] = useLocation();
  return <ContentDocument page={getPage(location)} />;
}
