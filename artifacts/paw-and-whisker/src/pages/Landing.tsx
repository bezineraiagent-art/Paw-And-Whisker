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
      className={`inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-7 py-4 rounded-2xl shadow-md hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all duration-150 ${className}`}
    >
      {label}
    </a>
  );
}

type PreviewMessage = { role: "user" | "assistant"; content: string; imageUrl?: string; isImageResponse?: boolean };

function FreePreviewChat({ onReady }: { onReady?: (sendFn: (msg: string) => void) => void }) {
  const [messages, setMessages] = useState<PreviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [imageToSend, setImageToSend] = useState<{ dataUrl: string; name: string } | null>(null);
  const sessionRef = useRef<string>("preview-" + crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    const capturedImage = imageToSend;
    if ((!content && !capturedImage) || isStreaming || locked) return;
    setInput("");
    setImageToSend(null);

    const displayContent = content || (capturedImage ? "What do you think about this?" : "");
    setMessages((prev) => [...prev, { role: "user", content: displayContent, imageUrl: capturedImage?.dataUrl }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      let convId = conversationId;
      if (!convId) {
        const res = await fetch("/api/openai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Id": sessionRef.current },
          body: JSON.stringify({ title: displayContent.slice(0, 60) }),
        });
        const data = await res.json();
        convId = data.id;
        setConversationId(convId);
      }

      const res = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionRef.current },
        body: JSON.stringify({ content: displayContent, ...(capturedImage ? { imageBase64: capturedImage.dataUrl } : {}) }),
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
  }, [input, isStreaming, locked, conversationId, questionCount, imageToSend]);

  useEffect(() => {
    onReady?.(send);
  }, [send, onReady]);

  return (
    <div className="bg-white rounded-3xl shadow-2xl border-2 border-purple-100 overflow-hidden max-w-xl mx-auto" style={{ boxShadow: "0 8px 48px 0 rgba(147,51,234,0.13), 0 2px 8px 0 rgba(236,72,153,0.07)" }}>
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3.5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg overflow-hidden">
          <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
        </div>
        <div>
          <span className="text-white font-bold text-sm block leading-tight">Paw And Whisker AI</span>
          <span className="text-white/70 text-xs">Your pet assistant 🐾</span>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-white/80">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Online
        </span>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <p className="text-sm text-slate-500 font-medium">Ask your first question about your pet</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["My cat stopped eating — should I worry?", "My dog is limping, what should I do?", "Why is my cat hiding suddenly?"].map((q) => (
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
          <div key={i} className={`flex gap-2 msg-enter ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border border-purple-100">
                <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
              </div>
            )}
            <div className={`rounded-2xl text-sm max-w-[82%] shadow-sm overflow-hidden ${m.role === "user" ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"}`}>
              {m.role === "user" ? (
                <>
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="Pet photo" className="w-full max-h-40 object-cover rounded-t-2xl" />
                  )}
                  {m.imageUrl && <p className="text-xs text-white/70 px-4 pt-2">📸 Photo sent</p>}
                  <p className="px-4 py-3">{m.content}</p>
                </>
              ) : (
                <div className="px-4 py-3 leading-relaxed">
                  {m.content ? (
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
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {locked ? (
        <div className="p-5 border-t border-slate-100 bg-gradient-to-r from-purple-50 to-pink-50 text-center">
          <p className="text-base font-black text-slate-800 mb-1">Get unlimited answers when you need them most</p>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">Unlimited questions · Image analysis · Available 24/7</p>
          <CtaButton className="text-sm py-3 px-6 rounded-xl w-full justify-center" label="Start for $4.99/month →" />
          <p className="text-xs text-slate-400 mt-2">Cancel anytime. No commitment.</p>
        </div>
      ) : (
        <div className="border-t border-slate-100 bg-white">
          {/* Image preview strip */}
          {imageToSend && (
            <div className="px-3 pt-2 flex items-center gap-2">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-purple-200 flex-shrink-0">
                <img src={imageToSend.dataUrl} alt="preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageToSend(null)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-800/70 text-white text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-purple-600 font-medium">📸 Photo ready to send</p>
            </div>
          )}
          {/* Upload + input row */}
          <div className="p-3 flex gap-2 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-3 py-2.5 rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              📸 <span>Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  if (dataUrl) setImageToSend({ dataUrl, name: file.name });
                };
                reader.readAsDataURL(file);
              }}
            />
            <input
              ref={inputRef}
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
              disabled={isStreaming || (!input.trim() && !imageToSend)}
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 transition-opacity hover:opacity-90 flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const chatSendRef = useRef<((msg: string) => void) | null>(null);

  const handleCardClick = useCallback((message: string) => {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      chatSendRef.current?.(message);
    }, 450);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800" style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/app-logo.png" alt="Paw And Whisker" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Paw And Whisker
            </span>
          </div>
          <CtaButton className="text-sm py-2.5 px-5 rounded-xl" />
        </div>
      </header>

      <main className="flex-1">

        {/* HERO */}
        <section className="max-w-3xl mx-auto px-5 pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-purple-100">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Used by pet owners when something feels off
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5">
            Worried about your pet?{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Get answers instantly.
            </span>
          </h1>
          <p className="text-xl text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            No guessing. No stress. Just clear guidance when you need it most.
          </p>
          <CtaButton className="text-lg px-10 py-4 rounded-2xl mx-auto" />
          <p className="mt-4 text-sm text-slate-400">Cancel anytime · No commitment</p>
        </section>

        {/* EMOTIONAL TRIGGER */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 border-y border-purple-100 py-16">
          <div className="max-w-2xl mx-auto px-5 text-center">
            <h2 className="text-2xl sm:text-3xl font-black mb-6 tracking-tight text-slate-800">
              You're not alone when something feels wrong
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">Every pet owner has moments of doubt.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {["Is this serious?", "Should I wait?", "What should I do right now?"].map((q) => (
                <div key={q} className="bg-white border border-purple-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
                  {q}
                </div>
              ))}
            </div>
            <p className="text-base font-bold text-purple-700">Paw And Whisker AI helps you decide in seconds.</p>
          </div>
        </section>

        {/* REAL USE CASES — fully clickable */}
        <section className="max-w-4xl mx-auto px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-2 tracking-tight">
            Real situations pet owners face
          </h2>
          <p className="text-center text-slate-400 text-sm mb-2">The moments where you need clarity fast — not a Google rabbit hole.</p>
          <p className="text-center text-purple-600 text-xs font-bold mb-8 flex items-center justify-center gap-1">
            <span>👇</span> Tap any situation below to try it instantly
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { icon: "🍽️", text: "My pet suddenly stopped eating", message: "My pet suddenly stopped eating. What should I do?" },
              { icon: "🐾", text: "My dog is limping", message: "My dog is limping. What should I do?" },
              { icon: "😶", text: "My cat is hiding all day", message: "My cat is hiding all day. What should I do?" },
              { icon: "😟", text: "I think something is wrong but I'm not sure", message: "I think something is wrong with my pet but I'm not sure what. What should I do?" },
            ].map(({ icon, text, message }) => (
              <button
                key={text}
                onClick={() => handleCardClick(message)}
                className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm cursor-pointer text-left transition-all duration-150 hover:scale-[1.02] hover:shadow-lg hover:border-purple-300 active:scale-[0.99]"
                style={{ boxShadow: undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(147,51,234,0.25), 0 8px 24px rgba(147,51,234,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
              >
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{text}</p>
                  <p className="text-xs text-purple-500 font-medium mt-0.5">Tap to ask →</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* COMPARISON — rewritten */}
        <section className="bg-slate-50 border-y border-slate-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 tracking-tight">
              Why pet owners switch to Paw & Whisker
            </h2>
            <p className="text-center text-slate-500 text-sm mb-10">When your pet feels off, you don't want theory. You want clarity.</p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">ChatGPT</p>
                {[
                  "Too general",
                  "Too cautious",
                  "Makes you second-guess yourself",
                  "Not built for real pet situations",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 mb-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-400 text-xs font-bold">✕</span>
                    </span>
                    <p className="text-sm text-slate-500">{item}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-md">
                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-4">Paw & Whisker AI</p>
                {[
                  "Tells you what to do next",
                  "Clear, simple answers",
                  "Focused only on pets",
                  "Helps you decide fast",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 mb-3">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">✓</span>
                    </span>
                    <p className="text-sm text-slate-800 font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-slate-600 font-bold text-base mt-8">
              "When your pet feels off, you don't want theory. You want clarity."
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="max-w-4xl mx-auto px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Describe what you're seeing", desc: "Type what's going on with your pet — or send a photo for instant analysis." },
              { step: "2", title: "Get a clear answer", desc: "Receive a simple, practical response instantly — no medical jargon." },
              { step: "3", title: "Act with confidence", desc: "Know exactly what to do next, and when to contact your vet." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* DAILY USE HOOK — fully clickable */}
        <section className="bg-gradient-to-br from-slate-800 to-slate-900 py-16">
          <div className="max-w-2xl mx-auto px-5 text-center">
            <h2 className="text-2xl sm:text-3xl font-black mb-6 tracking-tight text-white">
              Use it anytime something feels off
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {[
                { label: "Middle of the night?", emoji: "🌙" },
                { label: "Weekend?", emoji: "📅" },
                { label: "No vet available?", emoji: "🏥" },
              ].map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => handleCardClick("I'm worried about my pet and can't reach a vet right now. What should I do?")}
                  className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-sm font-bold text-white/90 cursor-pointer transition-all duration-150 hover:bg-white/20 hover:border-white/40 hover:scale-[1.03] active:scale-[0.98]"
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 mb-8">
              Ask here first.
            </p>
            <CtaButton className="text-base px-8 py-3.5 rounded-2xl" label="Get instant answers — $4.99/month" />
          </div>
        </section>

        {/* LIVE CHAT PREVIEW */}
        <section ref={chatSectionRef} className="bg-gradient-to-br from-purple-50 to-pink-50 border-y border-purple-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 bg-white border border-purple-200 text-purple-700 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm mb-3">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Try it now — no signup
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
                Ask your first question free
              </h2>
              <p className="text-slate-400 text-sm mt-2">2 free questions. No account. No credit card.</p>
            </div>
            <FreePreviewChat onReady={(fn) => { chatSendRef.current = fn; }} />
          </div>
        </section>

        {/* MEET THE INSPIRATION */}
        <section className="bg-white border-y border-slate-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">Meet the inspiration</h2>
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

        {/* PRICING */}
        <section className="max-w-lg mx-auto px-5 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">Simple pricing</h2>
          <p className="text-slate-400 text-sm mb-10">No hidden fees. No surprises.</p>
          <div className="bg-white border-2 border-purple-200 rounded-3xl p-8 shadow-lg">
            <div className="mb-6">
              <span className="text-5xl font-black text-slate-800">$4.99</span>
              <span className="text-slate-400 text-lg font-medium">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-left">
              {[
                "Unlimited questions — ask as much as you need",
                "Photo analysis — send images for instant feedback",
                "All pets supported — cats, dogs & more",
                "Available 24 hours a day, 7 days a week",
                "Cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <CtaButton className="w-full justify-center text-base py-4 rounded-xl" label="Get unlimited answers — $4.99/month" />
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
