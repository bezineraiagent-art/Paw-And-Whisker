import type { AnchorHTMLAttributes, ReactNode } from "react";

/** Visible label for any paid or affiliate placement. */
export function SponsoredLabel({ kind = "Sponsored" }: { kind?: "Sponsored" | "Affiliate link" | "Paid placement" }) {
  return <span className="pw-sponsored-label" data-testid="label-sponsored">{kind}</span>;
}

/** Affiliate and sponsored links always carry rel="sponsored nofollow". */
export function SponsoredLink({ children, rel: _rel, target: _target, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return <a {...props} rel="sponsored nofollow noopener noreferrer" target="_blank">{children}</a>;
}

/** Visibly separated container with disclosure. Not used anywhere until a real, approved placement exists. */
export function SponsoredPlacement({ children, sponsor }: { children: ReactNode; sponsor: string }) {
  return (
    <aside className="pw-sponsored" aria-label={`Sponsored placement from ${sponsor}`}>
      <div className="pw-sponsored-head"><SponsoredLabel /><span>Paid for by {sponsor}. It does not change our health answers, symptom results or emergency advice. <a href="/sponsorship-policy">Sponsorship policy</a></span></div>
      {children}
    </aside>
  );
}
