import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getAdminWaitlist,
  getAdminAnswerReports,
  getAdminVetReviewerApplications,
  type AdminVetReviewerApplicationsPage,
  type AdminVetReviewerApplication,
  type AdminWaitlistPage,
  type AdminAnswerReportsPage,
} from "@workspace/api-client-react";

const PAGE_SIZE = 25;
type Kind = "waitlist" | "reports" | "vets";
type ListState<T> = { page: T | null; offset: number; loading: boolean; error: string };
const empty = { page: null, offset: 0, loading: false, error: "" };

const fmt = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
};
const isAuthError = (e: unknown) => {
  const status = (e as { status?: number })?.status;
  return status === 401 || status === 403;
};
const isAbort = (e: unknown) => (e as { name?: string })?.name === "AbortError";

export default function AdminInbox() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [waitlist, setWaitlist] = useState<ListState<AdminWaitlistPage>>(empty);
  const [reports, setReports] = useState<ListState<AdminAnswerReportsPage>>(empty);
  const [vets, setVets] = useState<ListState<AdminVetReviewerApplicationsPage>>(empty);
  // Session generation: bumped on lock so any in-flight response is ignored.
  const session = useRef(0);
  const requestGen = useRef<Record<Kind, number>>({ waitlist: 0, reports: 0, vets: 0 });
  const controllers = useRef<Record<Kind, AbortController | null>>({ waitlist: null, reports: null, vets: null });

  function abortAll() {
    controllers.current.waitlist?.abort();
    controllers.current.reports?.abort();
    controllers.current.vets?.abort();
    controllers.current = { waitlist: null, reports: null, vets: null };
  }

  function lock(message = "") {
    session.current++;
    requestGen.current = { waitlist: requestGen.current.waitlist + 1, reports: requestGen.current.reports + 1, vets: requestGen.current.vets + 1 };
    abortAll();
    setToken(""); setInput(""); setAuthenticating(false);
    setWaitlist(empty); setReports(empty); setVets(empty);
    setAuthError(message);
  }

  useEffect(() => () => {
    session.current++;
    controllers.current.waitlist?.abort();
    controllers.current.reports?.abort();
    controllers.current.vets?.abort();
  }, []);

  async function fetchList(kind: Kind, t: string, offset: number): Promise<"ok" | "auth" | "error" | "stale"> {
    const mySession = session.current;
    const myGen = ++requestGen.current[kind];
    controllers.current[kind]?.abort();
    const ctrl = new AbortController();
    controllers.current[kind] = ctrl;
    const set = kind === "waitlist" ? setWaitlist : kind === "vets" ? setVets : setReports;
    const stale = () => mySession !== session.current || myGen !== requestGen.current[kind] || ctrl.signal.aborted;
    set((s: ListState<never>) => ({ ...s, loading: true, error: "" }) as never);
    const opts = { headers: { "x-admin-token": t }, signal: ctrl.signal, cache: "no-store" as const };
    try {
      const params = { offset, limit: PAGE_SIZE };
      const page = kind === "waitlist" ? await getAdminWaitlist(params, opts) : kind === "vets" ? await getAdminVetReviewerApplications(params, opts) : await getAdminAnswerReports(params, opts);
      if (stale()) return "stale";
      set({ page, offset, loading: false, error: "" } as never);
      return "ok";
    } catch (e) {
      if (stale() || isAbort(e)) return "stale";
      if (isAuthError(e)) {
        lock("That token was not accepted, or it has expired. All private data was cleared.");
        return "stale";
      }
      set((s: ListState<never>) => ({ ...s, loading: false, error: kind === "waitlist" ? "Couldn't load waitlist signups." : kind === "vets" ? "Couldn't load veterinary reviewer applications." : "Couldn't load answer reports." }) as never);
      return "error";
    } finally {
      if (controllers.current[kind] === ctrl) controllers.current[kind] = null;
    }
  }

  function handle(result: string) {
    if (result === "auth") lock("That token was not accepted, or it has expired. All private data was cleared.");
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || authenticating) return;
    const mySession = session.current;
    setAuthenticating(true); setAuthError("");
    const results = await Promise.all([fetchList("waitlist", t, 0), fetchList("reports", t, 0), fetchList("vets", t, 0)]);
    if (mySession !== session.current) return;
    setAuthenticating(false);
    if (results.includes("auth")) { handle("auth"); return; }
    if (results.includes("ok")) { setToken(t); setInput(""); return; }
    if (results.every(r => r === "error")) {
      setWaitlist(empty); setReports(empty); setVets(empty);
      setAuthError("Couldn't reach the inbox. Check your connection and try again.");
    }
  }

  async function go(kind: Kind, offset: number) {
    if (!token) return;
    handle(await fetchList(kind, token, Math.max(0, offset)));
  }
  async function refreshAll() {
    if (!token) return;
    const t = token;
    const r = await Promise.all([fetchList("waitlist", t, waitlist.offset), fetchList("reports", t, reports.offset), fetchList("vets", t, vets.offset)]);
    if (r.includes("auth")) handle("auth");
  }

  const anyLoading = waitlist.loading || reports.loading || vets.loading;

  return (
    <div className="pw"><main id="main" className="pw-section"><div className="pw-wrap">
      <p className="pw-eyebrow">Admin</p>
      <h1>Private inbox</h1>
      <p><a href="/admin/promotions" data-testid="link-admin-promotions">Back to promotion leads</a></p>
      <div className="pw-state" data-testid="text-inbox-boundary">
        <p><strong>Read-only.</strong> This page lists Whisker Plus waitlist signups, wrong-answer reports and veterinary reviewer applications. Nothing here can email, delete, bill or change a record.</p>
        <p className="small-print">Reviewer applications are unverified submissions, not approved reviewers. Viewing them does not verify a licence, change status, contact applicants or publish reviewer credit.</p>
        <p className="small-print">Waitlist people agreed only to hear when Whisker Plus opens. Report emails were given for follow-up on that report, not for marketing. Free PDF signups are not shown here.</p>
      </div>

      {!token ? (
        <form className="pw-form" onSubmit={signIn} data-testid="form-admin-inbox">
          <label>Admin token<input type="password" value={input} onChange={e => setInput(e.target.value)} autoComplete="off" spellCheck={false} disabled={authenticating} data-testid="input-inbox-token" /></label>
          <p className="small-print">Held in memory only. It is cleared when you lock, leave or reload this page.</p>
          {authError && <p role="alert" className="form-error" data-testid="status-inbox-auth">{authError}</p>}
          <div className="pw-actions">
            <button type="submit" className="pw-btn" disabled={authenticating || !input.trim()} data-testid="button-open-inbox">{authenticating ? "Checking…" : "Open inbox"}</button>
            <button type="button" className="pw-btn ghost" onClick={() => lock()} data-testid="button-lock-inbox-auth">Lock</button>
          </div>
          {authenticating && <p role="status" className="small-print">Checking token…</p>}
        </form>
      ) : (
        <>
          <div className="pw-actions">
            <button type="button" className="pw-btn" onClick={refreshAll} disabled={anyLoading} data-testid="button-refresh-inbox">{anyLoading ? "Refreshing…" : "Refresh"}</button>
            <button type="button" className="pw-btn ghost" onClick={() => lock()} data-testid="button-lock-inbox">Lock</button>
          </div>
          <InboxList
            kind="vets" title="Veterinary reviewer applications" emptyText="No veterinary reviewer applications yet."
            state={vets} onPage={o => go("vets", o)}
          />
          <InboxList
            kind="waitlist" title="Whisker Plus waitlist" emptyText="No waitlist signups yet."
            state={waitlist} onPage={o => go("waitlist", o)}
          />
          <InboxList
            kind="reports" title="Wrong-answer reports" emptyText="No wrong-answer reports yet."
            state={reports} onPage={o => go("reports", o)}
          />
        </>
      )}
    </div></main></div>
  );
}

type Rec = { id: number; email: string; createdAt: string; message?: string } | AdminVetReviewerApplication;

function InboxList({ kind, title, emptyText, state, onPage }: {
  kind: Kind; title: string; emptyText: string;
  state: ListState<{ records: Rec[]; total: number; offset: number; limit: number }>;
  onPage: (offset: number) => void;
}) {
  const { page, loading, error, offset } = state;
  const total = page?.total ?? 0;
  const count = page?.records.length ?? 0;
  const from = count ? offset + 1 : 0;
  const to = offset + count;
  const headingId = `inbox-${kind}-heading`;
  const wrap = { overflowWrap: "anywhere" as const, wordBreak: "break-word" as const };

  return (
    <section className="pw-leads" aria-labelledby={headingId} aria-busy={loading}>
      <h2 id={headingId}>{title}</h2>
      <p className="small-print" aria-live="polite" data-testid={`text-${kind}-count`}>
        {page ? `Showing ${from}–${to} of ${total} total.` : loading ? "Loading…" : ""}
      </p>
      {error && (
        <div role="alert" className="form-error">
          <span>{error} </span>
          <button type="button" className="pw-btn ghost" onClick={() => onPage(offset)} data-testid={`button-retry-${kind}`}>Try again</button>
        </div>
      )}
      {loading && !page ? (
        <ul className="pw-cliniclist" aria-hidden="true">
          {[0, 1, 2].map(i => <li key={i} style={{ opacity: 0.5 }}><p>&nbsp;</p><p className="small-print">&nbsp;</p></li>)}
        </ul>
      ) : page && !count ? (
        <div className="pw-state" data-testid={`empty-${kind}`}><p>{offset > 0 ? "No records on this page." : emptyText}</p></div>
      ) : page ? (
        <ul className="pw-cliniclist" style={{ opacity: loading ? 0.6 : 1 }}>
          {page.records.map(r => (
            <li key={r.id} data-testid={`row-${kind}-${r.id}`}>
              <div className="pw-clinic-top">
                <h3 style={wrap}>{r.email}</h3>
                <span className="pw-dist">#{r.id} · <time dateTime={r.createdAt}>{fmt(r.createdAt)}</time></span>
              </div>
              {"registrationBody" in r && (
                <dl style={wrap}>
                  <dt>Name</dt><dd>{r.name}</dd>
                  <dt>Credentials (self-reported)</dt><dd>{r.credentials}</dd>
                  <dt>Registration body</dt><dd>{r.registrationBody}</dd>
                  <dt>Registration number</dt><dd>{r.registrationNumber}</dd>
                  <dt>Clinic</dt><dd>{r.clinic || "Not supplied"}</dd>
                  <dt>Clinic website (unverified)</dt><dd>{r.clinicWebsite || "Not supplied"}</dd>
                  <dt>Application contact consent</dt><dd>{r.consent ? "Given for this application only" : "Not given"}</dd>
                </dl>
              )}
              {r.message !== undefined && <p style={{ ...wrap, whiteSpace: "pre-wrap" }}>{r.message}</p>}
            </li>
          ))}
        </ul>
      ) : null}
      {page && total > PAGE_SIZE && (
        <nav className="pw-actions" aria-label={`${title} pages`}>
          <button type="button" className="pw-btn ghost" disabled={loading || offset <= 0} onClick={() => onPage(offset - PAGE_SIZE)} data-testid={`button-prev-${kind}`}>Previous</button>
          <span className="small-print" style={{ alignSelf: "center" }}>Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
          <button type="button" className="pw-btn ghost" disabled={loading || offset + PAGE_SIZE >= total || offset + PAGE_SIZE > 1_000_000} onClick={() => onPage(offset + PAGE_SIZE)} data-testid={`button-next-${kind}`}>Next</button>
        </nav>
      )}
    </section>
  );
}
