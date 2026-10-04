/**
 * The single reviewer entry. Leave null until a licensed veterinarian has
 * actually completed the agreed review. Rebuild after changing this file.
 * This credits educational pages, never real-time AI answers.
 */
export type Reviewer = { name: string; credentials: string; clinic: string; reviewDate: string };
export const reviewer: Reviewer | null = null;

export function verifiedReviewer(entry: Reviewer | null = reviewer): Reviewer | null {
  if (!entry || Object.values(entry).every(value => !value.trim())) return null;
  if (![entry.name, entry.credentials, entry.clinic, entry.reviewDate].every(value => typeof value === "string" && value.trim())) {
    throw new Error("Reviewer configuration requires name, credentials, clinic and reviewDate");
  }
  const parsed = new Date(`${entry.reviewDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== entry.reviewDate || parsed.getTime() > Date.now()) {
    throw new Error("Reviewer reviewDate must be a real, non-future YYYY-MM-DD date");
  }
  return { ...entry, name: entry.name.trim(), credentials: entry.credentials.trim(), clinic: entry.clinic.trim() };
}

export function hasReviewerStatus(page: { path: string; kind?: string }) {
  return ["/about", "/how-it-works"].includes(page.path) || ["guide", "guides", "food", "food-checker"].includes(page.kind ?? "");
}
export function reviewerSchema(entry: Reviewer | null = reviewer) {
  const review = verifiedReviewer(entry);
  return review ? {
    reviewedBy: { "@type": "Person", name: review.name, honorificSuffix: review.credentials, affiliation: { "@type": "Organization", name: review.clinic } },
    lastReviewed: review.reviewDate,
  } : {};
}