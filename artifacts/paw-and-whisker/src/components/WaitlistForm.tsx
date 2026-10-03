import { useState, type FormEvent } from "react";
import { joinPlusWaitlist } from "@workspace/api-client-react";

export default function WaitlistForm({ id = "plus-waitlist" }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent || pending) return;
    setPending(true); setError("");
    const fax = String(new FormData(e.currentTarget as HTMLFormElement).get("fax") ?? "");
    try { const r = await joinPlusWaitlist({ email, consent: true, fax }); setDone(r.message || "You're on the list."); }
    catch { setError("We couldn't save your email. Please try again in a moment."); }
    finally { setPending(false); }
  }
  return <div className="pw-formcard" id={id}>
    <h3>Join the Whisker Plus waitlist</h3>
    <p>Whisker Plus is coming soon and is not for sale yet. Leave your email and we will save it so Paul can tell you when it opens. No payment is taken.</p>
    {done ? <p role="status" className="pw-ok" data-testid="status-waitlist">{done} Your email is saved. We do not send a confirmation message.</p> : <form onSubmit={submit} className="pw-form">
      <label>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-waitlist-email" /></label>
      <input type="text" name="fax" tabIndex={-1} autoComplete="off" aria-hidden="true" className="pw-hp" defaultValue="" />
      <label className="checkbox-label"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} data-testid="checkbox-waitlist-consent" />Save my email for the Whisker Plus waitlist. I've read the <a href="/privacy">privacy policy</a>.</label>
      <button type="submit" className="content-button" disabled={pending || !consent} data-testid="button-waitlist">{pending ? "Saving…" : "Join the waitlist"}</button>
    </form>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}
