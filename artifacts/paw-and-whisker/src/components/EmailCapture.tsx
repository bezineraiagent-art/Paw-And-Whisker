import { useState, type FormEvent } from "react";
import { capturePdfEmail } from "@workspace/api-client-react";
export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [download, setDownload] = useState("");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent || pending) return;
    setPending(true); setError("");
    try { const result = await capturePdfEmail({ email }); setDownload(result.downloadUrl); }
    catch { setError("We couldn't save your email. Please try again; your PDF isn't unlocked yet."); }
    finally { setPending(false); }
  }
  return <div className="email-capture">
    <h3>Keep the late-night checklist close.</h3>
    <p>Get the free PDF: <strong>10 pet symptoms that usually aren't emergencies</strong>. Includes warning signs that mean you should call a vet instead of waiting.</p>
    {!download ? <form onSubmit={submit}>
      <label>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label className="checkbox-label"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} />Save my email to unlock this download. I've read the <a href="/privacy">privacy policy</a>.</label>
      <button type="submit" className="content-button" disabled={pending || !consent}>{pending ? "Saving…" : "Get the free PDF"}</button>
      <p className="small-print">Download immediately after submitting. Automated email delivery is not enabled; we won't claim a message has been sent.</p>
    </form> : <p role="status">Your email has been saved. <a className="content-button" href={download} download>Download your free PDF</a></p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}