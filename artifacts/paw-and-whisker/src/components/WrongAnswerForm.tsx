import { useState, type FormEvent } from "react";
import { reportWrongAnswer } from "@workspace/api-client-react";

export default function WrongAnswerForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent || pending) return;
    setPending(true); setError("");
    const fax = String(new FormData(e.currentTarget as HTMLFormElement).get("fax") ?? "");
    try { const r = await reportWrongAnswer({ email, message: message.trim(), consent: true, fax }); setDone(r.message || "Thank you."); }
    catch { setError("We couldn't save your report. Please check the message is at least 10 characters and try again."); }
    finally { setPending(false); }
  }
  return <div className="pw-formcard" id="report-wrong-answer">
    <h3>Report a wrong or worrying answer</h3>
    <p>Your report is saved in our database for Paul to read. Nothing is emailed, and a reply is not promised. This form is not emergency help: if your pet is unwell now, call a vet.</p>
    {done ? <p role="status" className="pw-ok" data-testid="status-report">{done} Your report is saved.</p> : <form onSubmit={submit} className="pw-form">
      <label>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-report-email" /></label>
      <label>What was wrong?<textarea required minLength={10} maxLength={3000} rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="What did you ask, what did it say, and what looked wrong?" data-testid="input-report-message" /></label>
      <input type="text" name="fax" tabIndex={-1} autoComplete="off" aria-hidden="true" className="pw-hp" defaultValue="" />
      <label className="checkbox-label"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} data-testid="checkbox-report-consent" />Save my email and message so this report can be reviewed. I've read the <a href="/privacy">privacy policy</a>.</label>
      <button type="submit" className="content-button" disabled={pending || !consent || message.trim().length < 10} data-testid="button-report">{pending ? "Saving…" : "Send report"}</button>
    </form>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}
