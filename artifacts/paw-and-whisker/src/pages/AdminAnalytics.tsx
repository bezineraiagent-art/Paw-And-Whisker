import { useCallback, useEffect, useMemo, useState } from "react";

const TOKEN_STORAGE_KEY = "pw-admin-analytics-token";

type AnalyticsSummary = {
  period: { since: string | null; until: string | null };
  totalSessions: number;
  totalCtaClicks: number;
  nudge: {
    views: number;
    viewSessions: number;
    clicks: number;
    clickSessions: number;
    clickThroughRate: number;
    sessionClickThroughRate: number;
  };
  paywallCard: {
    clicks: number;
    clickSessions: number;
    sessionConversionRate: number;
  };
  ctaClicksBySource: Array<{
    source: string | null;
    clicks: number;
    sessions: number;
  }>;
  eventCountsByName: Record<string, number>;
};

function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function loadToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore quota / serialization errors
  }
}

export default function AdminAnalytics() {
  const [token, setToken] = useState<string>(() => loadToken());
  const [tokenInput, setTokenInput] = useState<string>(() => loadToken());
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        params.set("since", sinceDate.toISOString());
      }
    }
    if (until) {
      const untilDate = new Date(until);
      if (!Number.isNaN(untilDate.getTime())) {
        params.set("until", untilDate.toISOString());
      }
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [since, until]);

  const fetchSummary = useCallback(async () => {
    if (!token) {
      setError("Enter your admin token to view analytics.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/analytics/summary${queryString}`, {
        headers: { "x-admin-token": token },
      });
      if (res.status === 401) {
        setError("Invalid admin token.");
        setData(null);
        return;
      }
      if (res.status === 503) {
        setError(
          "Analytics dashboard is not configured on the server. Set ANALYTICS_ADMIN_TOKEN.",
        );
        setData(null);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? `Request failed (${res.status}).`);
        setData(null);
        return;
      }
      const json = (await res.json()) as AnalyticsSummary;
      setData(json);
    } catch {
      setError("Could not reach the analytics endpoint.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryString, token]);

  useEffect(() => {
    if (token) {
      void fetchSummary();
    }
  }, [token, fetchSummary]);

  function handleSaveToken(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    saveToken(trimmed);
    setToken(trimmed);
  }

  function handleClearToken() {
    saveToken("");
    setToken("");
    setTokenInput("");
    setData(null);
    setError("");
  }

  function handleApplyDates(e: React.FormEvent) {
    e.preventDefault();
    void fetchSummary();
  }

  function handleQuickRange(days: number) {
    const now = new Date();
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const toLocalInput = (d: Date) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    setSince(toLocalInput(start));
    setUntil(toLocalInput(now));
  }

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}
      data-testid="admin-analytics-page"
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Nudge Conversion Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Internal admin view — Paw &amp; Whisker AI
            </p>
          </div>
          {token && (
            <button
              type="button"
              onClick={handleClearToken}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              data-testid="button-clear-token"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {!token && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-md mx-auto">
            <h2 className="text-base font-bold mb-1">Admin token required</h2>
            <p className="text-sm text-slate-500 mb-4">
              Enter the value of <code>ANALYTICS_ADMIN_TOKEN</code> to view the
              dashboard.
            </p>
            <form onSubmit={handleSaveToken} className="space-y-3">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Admin token"
                autoComplete="off"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                data-testid="input-admin-token"
              />
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                data-testid="button-save-token"
              >
                Continue
              </button>
            </form>
          </section>
        )}

        {token && (
          <>
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <form
                onSubmit={handleApplyDates}
                className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end"
              >
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Since
                  </span>
                  <input
                    type="datetime-local"
                    value={since}
                    onChange={(e) => setSince(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                    data-testid="input-since"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Until
                  </span>
                  <input
                    type="datetime-local"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                    data-testid="input-until"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                  data-testid="button-apply-dates"
                >
                  {loading ? "Loading…" : "Apply"}
                </button>
              </form>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSince("");
                    setUntil("");
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100"
                  data-testid="button-range-all"
                >
                  All time
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange(1)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100"
                  data-testid="button-range-24h"
                >
                  Last 24h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange(7)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100"
                  data-testid="button-range-7d"
                >
                  Last 7d
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange(30)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100"
                  data-testid="button-range-30d"
                >
                  Last 30d
                </button>
              </div>
            </section>

            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm"
                data-testid="text-error"
              >
                {error}
              </div>
            )}

            {data && (
              <>
                <section
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                  data-testid="section-summary-cards"
                >
                  <StatCard
                    label="Total sessions"
                    value={formatNumber(data.totalSessions)}
                    testId="stat-total-sessions"
                  />
                  <StatCard
                    label="Nudge views"
                    value={formatNumber(data.nudge.views)}
                    sub={`${formatNumber(data.nudge.viewSessions)} sessions`}
                    testId="stat-nudge-views"
                  />
                  <StatCard
                    label="Nudge clicks (CTR)"
                    value={`${formatNumber(data.nudge.clicks)}`}
                    sub={`${formatPercent(data.nudge.clickThroughRate)} of views · ${formatPercent(data.nudge.sessionClickThroughRate)} of sessions`}
                    testId="stat-nudge-clicks"
                  />
                  <StatCard
                    label="Paywall card clicks"
                    value={formatNumber(data.paywallCard.clicks)}
                    sub={`${formatPercent(data.paywallCard.sessionConversionRate)} of nudge-viewing sessions`}
                    testId="stat-paywall-clicks"
                  />
                </section>

                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-base font-bold">
                      CTA clicks by source
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Compares the nudge vs. the paywall card and any other
                      sources tracked.
                    </p>
                  </div>
                  {data.ctaClicksBySource.length === 0 ? (
                    <p
                      className="px-6 py-8 text-sm text-slate-500 text-center"
                      data-testid="text-no-cta-data"
                    >
                      No CTA clicks recorded for this period.
                    </p>
                  ) : (
                    <table
                      className="w-full text-sm"
                      data-testid="table-cta-by-source"
                    >
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-6 py-3 font-semibold">
                            Source
                          </th>
                          <th className="text-right px-6 py-3 font-semibold">
                            Clicks
                          </th>
                          <th className="text-right px-6 py-3 font-semibold">
                            Unique sessions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ctaClicksBySource.map((row, idx) => (
                          <tr
                            key={`${row.source ?? "null"}-${idx}`}
                            className="border-t border-slate-100"
                            data-testid={`row-source-${row.source ?? "none"}`}
                          >
                            <td className="px-6 py-3 font-medium">
                              {row.source ?? (
                                <span className="text-slate-400 italic">
                                  (unspecified)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums">
                              {formatNumber(row.clicks)}
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums">
                              {formatNumber(row.sessions)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-base font-bold">Event counts</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total events recorded per event name in this period.
                    </p>
                  </div>
                  {Object.keys(data.eventCountsByName).length === 0 ? (
                    <p
                      className="px-6 py-8 text-sm text-slate-500 text-center"
                      data-testid="text-no-event-data"
                    >
                      No events recorded for this period.
                    </p>
                  ) : (
                    <table
                      className="w-full text-sm"
                      data-testid="table-event-counts"
                    >
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-6 py-3 font-semibold">
                            Event
                          </th>
                          <th className="text-right px-6 py-3 font-semibold">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(data.eventCountsByName)
                          .sort((a, b) => b[1] - a[1])
                          .map(([name, value]) => (
                            <tr
                              key={name}
                              className="border-t border-slate-100"
                              data-testid={`row-event-${name}`}
                            >
                              <td className="px-6 py-3 font-medium">{name}</td>
                              <td className="px-6 py-3 text-right tabular-nums">
                                {formatNumber(value)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <p className="text-xs text-slate-400">
                  Period:{" "}
                  {data.period.since
                    ? new Date(data.period.since).toLocaleString()
                    : "all time"}{" "}
                  →{" "}
                  {data.period.until
                    ? new Date(data.period.until).toLocaleString()
                    : "now"}
                  {" · "}
                  {formatNumber(data.totalCtaClicks)} total CTA clicks
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  testId: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
      data-testid={testId}
    >
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-black tracking-tight mt-2 tabular-nums">
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}
