import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/3cI6oG32021Bedm1Xkgw002";
const MAX_FREE_QUESTIONS = 2;

function CtaButton({ className = "", label = "Start for $4.99/month" }: { className?: string; label?: string }) {
  return (
    <a
      href={STRIPE_PAYMENT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-7 py-4 rounded-2xl shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-150 ${className}`}
    >
      {label}
    </a>
  );
}

type PreviewMessage = { role: "user" | "assistant"; content: string };

function FreePreviewChat() {
  const [messages, setMessages] = useState<PreviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const sessionRef = useRef<string>("preview-" + crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming || locked) return;
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      let convId = conversationId;
      if (!convId) {
        const res = await fetch("/api/openai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Id": sessionRef.current },
          body: JSON.stringify({ title: content.slice(0, 60) }),
        });
        const data = await res.json();
        convId = data.id;
        setConversationId(convId);
      }

      const res = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionRef.current },
        body: JSON.stringify({ content }),
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: last.content + data.content };
                  }
                  return updated;
                });
              }
            } catch { }
          }
        }
      }

      const newCount = questionCount + 1;
      setQuestionCount(newCount);
      if (newCount >= MAX_FREE_QUESTIONS) setLocked(true);
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          updated[updated.length - 1] = { ...last, content: "Something went wrong. Please try again." };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, locked, conversationId, questionCount]);

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden max-w-xl mx-auto">
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3.5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg overflow-hidden">
          <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
        </div>
        <span className="text-white font-bold text-sm">Paw And Whisker AI</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-white/80">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          Live preview
        </span>
      </div>

      <div className="h-72 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <p className="text-sm text-slate-500 font-medium">Ask your first question about your pet</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Why is my cat hiding?", "What foods are toxic to dogs?", "How do I calm an anxious pet?"].map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
              </div>
            )}
            <div className={`px-3 py-2 rounded-2xl text-sm max-w-[80%] leading-relaxed ${m.role === "user" ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"}`}>
              {m.role === "user" ? (
                m.content || ""
              ) : m.content ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
                    ul: ({ children }) => <ul className="mt-1 mb-1.5 space-y-0.5">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex gap-1.5">
                        <span className="text-purple-500 flex-shrink-0">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : isStreaming && i === messages.length - 1 ? (
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : ""}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {locked ? (
        <div className="p-4 border-t border-slate-100 bg-gradient-to-r from-purple-50 to-pink-50 text-center">
          <p className="text-sm font-bold text-slate-800 mb-1">You've used your free preview</p>
          <p className="text-xs text-slate-500 mb-3">Unlock unlimited answers for just $4.99/month</p>
          <CtaButton className="text-sm py-2.5 px-6 rounded-xl" />
        </div>
      ) : (
        <div className="p-3 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your pet..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
            disabled={isStreaming}
          />
          <button
            onClick={() => send()}
            disabled={isStreaming || !input.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800" style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}>

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
              <img
                src="/app-logo.png"
                alt="Paw And Whisker"
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.42)", transformOrigin: "center" }}
              />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Paw And Whisker
            </span>
          </div>
          <CtaButton className="text-sm py-2.5 px-5 rounded-xl" />
        </div>
      </header>

      <main className="flex-1">

        <section className="max-w-3xl mx-auto px-5 pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-purple-100">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            AI-powered pet care · Available 24/7
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            Your pet's personal{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              AI health expert
            </span>
          </h1>

          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-3 leading-relaxed">
            Get clear, reliable answers for your pet's behavior, health, and daily care in seconds.
          </p>

          <p className="text-sm font-bold text-purple-700 mb-10 tracking-wide uppercase">
            Built for pet owners. Not general AI.
          </p>

          <CtaButton className="text-lg px-10 py-4 rounded-2xl mx-auto" />

          <p className="mt-4 text-sm text-slate-400">
            Cancel anytime · No commitment
          </p>
        </section>

        <section className="bg-slate-50 border-y border-slate-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 tracking-tight">
              Why not just use ChatGPT?
            </h2>
            <p className="text-center text-slate-500 text-sm mb-10">General AI is a generalist. Your pet deserves a specialist.</p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-5 border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">General AI</p>
                {[
                  "Generic answers not tailored to pets",
                  "You have to explain pet context every time",
                  "No focus — covers everything, masters nothing",
                  "Responses can be vague or overly cautious",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 mb-2">
                    <span className="text-slate-300 mt-0.5 flex-shrink-0">✕</span>
                    <p className="text-sm text-slate-500">{item}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-5 border-2 border-purple-200">
                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">Paw And Whisker AI</p>
                {[
                  "Focused only on pet health, behavior & care",
                  "Clear, simple, practical answers you can act on",
                  "Designed for real-life pet situations",
                  "Knows when to tell you to call the vet",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 mb-2">
                    <span className="text-pink-500 mt-0.5 flex-shrink-0">✓</span>
                    <p className="text-sm text-slate-700 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">
            How it works
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Ask any question", desc: "Type anything about your pet's health, behavior, diet, or daily care." },
              { step: "2", title: "Get a clear answer", desc: "Receive a simple, practical response instantly — no medical jargon." },
              { step: "3", title: "Act with confidence", desc: "Know exactly what to do next, and when to contact your vet." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white font-black text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 border-y border-slate-100 py-16">
          <div className="max-w-2xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 tracking-tight">
              See it in action
            </h2>
            <p className="text-center text-slate-400 text-sm mb-10">A real example — the kind of answer you get every time</p>

            <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg overflow-hidden">
                  <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
                </div>
                <span className="text-white font-bold text-sm">Paw And Whisker AI</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm flex-shrink-0">😊</div>
                  <div className="bg-slate-100 text-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-xs leading-relaxed">
                    My cat is hiding and not eating. Should I worry?
                  </div>
                </div>

                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
                  </div>
                  <div className="bg-purple-50 text-slate-700 rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-sm border border-purple-100 leading-relaxed">
                    This can be stress-related. Check for recent changes in environment. If it lasts more than 24 hours or includes vomiting or lethargy, contact a vet.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">
            Everything your pet needs
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "⚡", title: "Instant answers 24/7", desc: "No waiting rooms. No hold music. Guidance whenever you need it." },
              { icon: "🐾", title: "Built for all pets", desc: "Cats, dogs, birds, rabbits, reptiles — every species covered." },
              { icon: "💬", title: "No confusing jargon", desc: "Clear, plain-English answers you can actually act on." },
              { icon: "🏥", title: "Always available", desc: "Midnight worry? Weekend scare? We're here every single time." },
            ].map((b) => (
              <div key={b.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-xl mb-4">
                  {b.icon}
                </div>
                <h3 className="font-bold text-slate-800 mb-1.5">{b.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-br from-purple-50 to-pink-50 border-y border-purple-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 tracking-tight">
              Try it free
            </h2>
            <p className="text-center text-slate-400 text-sm mb-10">Ask up to 2 questions — no account needed</p>
            <FreePreviewChat />
          </div>
        </section>

        <section className="bg-white border-y border-slate-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">
              Meet the inspiration
            </h2>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 flex-shrink-0">
                <div className="rounded-3xl overflow-hidden shadow-lg border-4 border-white">
                  <img src="/cats.jpg" alt="Lucky and her sister" className="w-full h-auto" />
                </div>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">🖤</span>
                    <p className="font-black text-slate-800">Lucky</p>
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">1 yr old</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">Energetic, curious, playful — and always finding new ways to cause mischief.</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">🐱</span>
                    <p className="font-black text-slate-800">Lucky's Sister</p>
                    <span className="text-xs font-semibold text-pink-700 bg-pink-100 px-2.5 py-0.5 rounded-full">7 yrs old</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">Calm, experienced, observant — the wise elder who inspired this whole service.</p>
                </div>

                <p className="text-xs text-slate-400 italic pl-1">
                  "We built Paw And Whisker because every pet parent deserves instant, trustworthy answers."
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-lg mx-auto px-5 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">Simple pricing</h2>
          <p className="text-slate-400 text-sm mb-10">No hidden fees. No surprises.</p>

          <div className="bg-white border-2 border-purple-200 rounded-3xl p-8 shadow-md">
            <div className="mb-6">
              <span className="text-5xl font-black text-slate-800">$4.99</span>
              <span className="text-slate-400 text-lg font-medium">/month</span>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              {[
                "Unlimited questions — ask as much as you need",
                "All pets supported — cats, dogs & more",
                "Available 24 hours a day, 7 days a week",
                "Instant access — start right away",
                "Cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <CtaButton className="w-full justify-center text-base py-4 rounded-xl" />
            <p className="mt-3 text-xs text-slate-400">Secure checkout via Stripe</p>
          </div>
        </section>

      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden">
              <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
            </div>
            <span className="font-bold text-white text-sm">Paw And Whisker</span>
          </div>
          <p className="text-xs text-slate-500 text-center max-w-sm">
            Paw &amp; Whisker AI provides guidance, not veterinary diagnosis. Always consult a licensed vet for serious issues. · © 2026
          </p>
        </div>
      </footer>

    </div>
  );
}
