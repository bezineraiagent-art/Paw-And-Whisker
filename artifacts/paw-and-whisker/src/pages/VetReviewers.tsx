import { useState, type FormEvent } from "react";
import { submitVetReviewerApplication, type VetReviewerApplicationInput } from "@workspace/api-client-react";
import SiteHeader from "@/components/SiteHeader";

export default function VetReviewers() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const t = (k: string) => String(fd.get(k) ?? "").trim();
    const data: VetReviewerApplicationInput = {
      name: t("name"),
      email: t("email").toLowerCase(),
      credentials: t("credentials"),
      registrationBody: t("registrationBody"),
      registrationNumber: t("registrationNumber"),
      message: t("message"),
      consent: fd.get("consent") === "on",
      fax: String(fd.get("fax") ?? ""),
    };
    if (t("clinic")) data.clinic = t("clinic");
    if (t("clinicWebsite")) data.clinicWebsite = t("clinicWebsite");
    if (!data.consent) { setError("Please tick the consent box to apply."); return; }
    setPending(true); setError(""); setDone("");
    try {
      const r = await submitVetReviewerApplication(data);
      if (r.success !== true || !r.message) throw new Error("No saved-application confirmation was received.");
      setDone(r.message);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your application. Please check the details and try again in a moment.");
    } finally { setPending(false); }
  }

  return (
    <div className="pw">
      <SiteHeader />
      <main id="main" className="pw-article">
        <div className="pw-wrap pw-narrow">
          <nav className="pw-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Vet reviewers</nav>
          <h1>Review our guides as a licensed vet</h1>
          <p className="pw-lede">Paw &amp; Whisker publishes free educational guides for new pet parents. They are written by a pet parent, not a vet, and display their current veterinary review status. We invite licensed veterinarians to review that educational content, one guide at a time.</p>

          <section className="pw-section" style={{ paddingInline: 0 }}>
            <h2>What a review covers</h2>
            <ul className="pw-list">
              <li>Factual accuracy of the guide against current veterinary knowledge.</li>
              <li>Food preparation and risk statements, including what is said about amounts and plain preparation.</li>
              <li>Escalation wording: when the guide tells readers to call a vet or an emergency clinic.</li>
              <li>Whether the public sources cited are appropriate and correctly described.</li>
            </ul>
            <h2>What it does not cover</h2>
            <p>You would not be reviewing individual AI answers, offering clinical consultations to readers, or giving a blanket endorsement of Paw &amp; Whisker. A review applies only to the specific guide and version you checked.</p>
            <h2>Time, scope and credit</h2>
            <p>A short guide usually takes roughly 30 to 60 minutes. Complex guides take longer. Scope, timing and any compensation are agreed with you before any work starts; applying does not promise paid work.</p>
            <p>If a review is published, the guide keeps a byline with your name, credentials and the review date. You may choose to link to your clinic. Nothing is published automatically: every application is checked privately by hand first.</p>
          </section>

          <section className="pw-formcard" id="apply" aria-labelledby="apply-h">
            <h2 id="apply-h">Apply to review</h2>
            {done && <p role="status" className="pw-ok" data-testid="status-reviewer-application">{done} Your application is saved for manual review. We do not send an automatic confirmation email.</p>}
            <form className="pw-form" onSubmit={submit} data-testid="form-vet-reviewer">
              <label>Full name<input name="name" required minLength={2} maxLength={120} autoComplete="name" data-testid="input-reviewer-name" /></label>
              <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" data-testid="input-reviewer-email" /></label>
              <label>Credentials<input name="credentials" required minLength={2} maxLength={120} placeholder="e.g. BVSc, MRCVS" data-testid="input-reviewer-credentials" /></label>
              <label>Registration or licensing body<input name="registrationBody" required minLength={2} maxLength={180} data-testid="input-reviewer-registration-body" /></label>
              <label>Registration or licence number<input name="registrationNumber" required minLength={2} maxLength={100} autoComplete="off" data-testid="input-reviewer-registration-number" /></label>
              <label>Clinic (optional)<input name="clinic" maxLength={180} data-testid="input-reviewer-clinic" /></label>
              <label>Clinic website (optional)<input name="clinicWebsite" type="url" maxLength={2048} placeholder="https://" pattern="https?://.+" data-testid="input-reviewer-website" /></label>
              <label>Tell us about your interest and availability<textarea name="message" required minLength={10} maxLength={3000} rows={6} data-testid="input-reviewer-message" /></label>
              <input type="text" name="fax" tabIndex={-1} autoComplete="off" aria-hidden="true" className="pw-hp" defaultValue="" />
              <label className="pw-consent"><input type="checkbox" name="consent" required data-testid="checkbox-reviewer-consent" /><span>I agree that Paw &amp; Whisker may store this application to contact me about reviewing. I've read the <a href="/privacy" style={{ textDecoration: "underline" }}>privacy policy</a>.</span></label>
              <button type="submit" className="pw-btn" disabled={pending} data-testid="button-reviewer-apply">{pending ? "Sending…" : "Send application"}</button>
              {error && <p role="alert" className="form-error">{error}</p>}
            </form>
            <p className="pw-disc">We store your application so it can be checked manually. No email is sent automatically. Your registration details are not published. Applying does not verify your registration; we check it separately before any review is credited.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
