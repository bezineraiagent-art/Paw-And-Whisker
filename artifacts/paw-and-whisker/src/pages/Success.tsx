import { useState, useEffect } from "react";
import { Link } from "wouter";

const WHAT_YOU_CAN_ASK = [
  "Why is my pet acting different",
  "Is this symptom serious",
  "What should I do right now",
  "How can I help my pet feel better",
];

export default function Success() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("paw_subscribed", "true");
    localStorage.removeItem("paw_free_count");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}
    >
      <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src="/app-logo.png"
            alt="Paw And Whisker"
            className="w-full h-full object-cover"
            style={{ transform: "scale(1.42)", transformOrigin: "center" }}
          />
        </div>
        <span className="font-extrabold text-base bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          Paw And Whisker
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-bold px-4 py-2 rounded-full mb-6 border border-green-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              You're in
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-slate-800 leading-tight">
              Your pet assistant{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                is ready.
              </span>
            </h1>

            <p className="text-slate-500 text-base leading-relaxed">
              Ask anything about your pet's behavior, health, or care.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-3xl p-5 mb-5">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">
              What you can ask
            </p>
            <ul className="space-y-2.5">
              {WHAT_YOU_CAN_ASK.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-5">
            {submitted ? (
              <div className="text-center py-3">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-slate-800 mb-1">You're all set!</p>
                <p className="text-sm text-slate-500">
                  We'll send updates to{" "}
                  <span className="font-semibold text-slate-700">{email}</span>
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Get updates and tips
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  We'll send helpful pet care tips and product updates.
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                  {error && (
                    <p className="text-red-500 text-xs font-medium">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-95 transition-opacity disabled:opacity-60"
                  >
                    {loading ? "Saving..." : "Save my email"}
                  </button>
                </form>
              </>
            )}
          </div>

          <Link
            href="/chat"
            className="flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-4 rounded-2xl text-base hover:bg-slate-800 transition-colors w-full"
          >
            Start Chat
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <p className="text-center text-xs text-slate-400 mt-4">
            Paw &amp; Whisker AI provides guidance, not veterinary diagnosis.
          </p>
        </div>
      </main>
    </div>
  );
}
