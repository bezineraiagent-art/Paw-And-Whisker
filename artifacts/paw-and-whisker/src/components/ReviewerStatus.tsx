import { verifiedReviewer, type Reviewer } from "@/content/reviewer";

export default function ReviewerStatus({ entry }: { entry?: Reviewer | null } = {}) {
  const review = verifiedReviewer(entry);
  return <aside className="guide-callout" aria-label="Veterinary review status" data-testid="reviewer-status">
    {review ? <p>Reviewed by {review.name}, {review.credentials} · {review.clinic} · <time dateTime={review.reviewDate}>{review.reviewDate}</time>. This credits educational content, not individual AI answers.</p>
      : <p><strong>Not yet reviewed by a veterinarian</strong>. General information only, not a clinical assessment.</p>}
    <a href="/vet-reviewers">Licensed veterinarian? Help review our guides</a>
  </aside>;
}