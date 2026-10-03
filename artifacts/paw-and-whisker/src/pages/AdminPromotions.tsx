import { useRef, useState, type FormEvent } from "react";
import { getPromotionLeads, type PromotionLeads } from "@workspace/api-client-react";

export default function AdminPromotions() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState("");
  const [data, setData] = useState<PromotionLeads | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);

  async function load(t: string) {
    const mine = ++generation.current;
    setLoading(true); setError("");
    try {
      const result = await getPromotionLeads({ headers: { "x-admin-token": t } });
      if (mine !== generation.current) return;
      setData(result); setToken(t); setInput("");
    }
    catch (e) {
      if (mine !== generation.current) return;
      const status = (e as { status?: number }).status;
      setData(null); setToken("");
      setError(status === 401 || status === 403 ? "That token was not accepted. Leads stay protected." : "Couldn't load leads. Try again.");
    } finally { if (mine === generation.current) setLoading(false); }
  }
  function signIn(e: FormEvent) { e.preventDefault(); if (input.trim()) load(input.trim()); }
  function lock() { generation.current++; setToken(""); setData(null); setInput(""); setError(""); setLoading(false); }
  const fmt = (s: string) => new Date(s).toLocaleString();

  return (
    <div className="pw"><main id="main" className="pw-section"><div className="pw-wrap">
      <p className="pw-eyebrow">Admin</p>
      <h1>Promotion leads</h1>
      <p><a href="/admin/analytics">Open the analytics dashboard</a></p>
      {!token ? (
        <form className="pw-form" onSubmit={signIn} data-testid="form-admin-leads">
          <label>Admin token<input type="password" value={input} onChange={e => setInput(e.target.value)} autoComplete="off" data-testid="input-leads-token" /></label>
          <p className="small-print">Held in memory only. It is cleared when you lock or reload.</p>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button className="pw-btn" disabled={loading || !input.trim()}>{loading ? "Checking…" : "Show leads"}</button>
        </form>
      ) : (
        <>
          <div className="pw-actions">
            <button className="pw-btn" onClick={() => load(token)} disabled={loading} data-testid="button-refresh-leads">{loading ? "Refreshing…" : "Refresh"}</button>
            <button className="pw-btn ghost" onClick={lock} data-testid="button-lock-leads">Lock</button>
          </div>
          {error && <p role="alert" className="form-error">{error}</p>}
          {data && [
            { title: "Clinic applications", shown: data.clinicApplications.length, total: data.clinicTotal, rows: data.clinicApplications.map(a => ({ id: a.id, createdAt: a.createdAt, name: a.clinicName, extra: `${a.city} / ${a.intent ?? "claim"}`, a })) },
            { title: "Advertiser inquiries", shown: data.advertiserInquiries.length, total: data.advertiserTotal, rows: data.advertiserInquiries.map(a => ({ id: a.id, createdAt: a.createdAt, name: a.brandName, extra: (a.placements ?? []).join(", ") || "no placements chosen", a })) },
          ].map(g => (
            <section key={g.title} className="pw-leads">
              <h2>{g.title}</h2>
              <p className="small-print">Showing {g.shown} of {g.total} total. Only the latest 100 of each kind are returned.</p>
              {!g.rows.length ? <div className="pw-state"><p>No leads yet.</p></div> : (
                <ul className="pw-cliniclist">{g.rows.map(r => (
                  <li key={r.id}><div className="pw-clinic-top"><h3>{r.name}</h3><span className="pw-dist">#{r.id} · {fmt(r.createdAt)}</span></div>
                    <p className="small-print">{r.extra}</p>
                    <p>{r.a.contactName ? `${r.a.contactName}, ` : ""}<a href={`mailto:${r.a.contactEmail}`}>{r.a.contactEmail}</a>{r.a.website ? <> · <a href={r.a.website} rel="noopener noreferrer nofollow">{r.a.website}</a></> : null}</p>
                    <p>{r.a.message}</p></li>
                ))}</ul>
              )}
            </section>
          ))}
        </>
      )}
    </div></main></div>
  );
}
