import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/3cI6oG32021Bedm1Xkgw002";
const MAX_FREE_QUESTIONS = 2;
const PREVIEW_CHAT_STORAGE_KEY = "pw-preview-chat-v1";
const PREVIEW_CHAT_TTL_MS = 24 * 60 * 60 * 1000;

type PreviewMessage = { role: "user" | "assistant"; content: string; imageUrl?: string; isImageResponse?: boolean };

type PreviewChatPersistedState = {
  sessionRef: string;
  messages: PreviewMessage[];
  questionCount: number;
  locked: boolean;
  conversationId: number | null;
  savedAt: number;
};

function loadPreviewChatState(): PreviewChatPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREVIEW_CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreviewChatPersistedState;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > PREVIEW_CHAT_TTL_MS) {
      window.localStorage.removeItem(PREVIEW_CHAT_STORAGE_KEY);
      return null;
    }
    if (typeof parsed.sessionRef !== "string" || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePreviewChatState(state: Omit<PreviewChatPersistedState, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: PreviewChatPersistedState = { ...state, savedAt: Date.now() };
    window.localStorage.setItem(PREVIEW_CHAT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / serialization errors
  }
}

type AnalyticsEventName = "nudge_shown" | "cta_click";
type CtaSource =
  | "preview_nudge"
  | "preview_paywall_card"
  | "header_nav"
  | "hero"
  | "daily_use_section"
  | "pricing_card";

const ANALYTICS_SESSION_KEY = "pw-analytics-session-v1";

function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
    if (existing) return existing;
    const fresh = "anon-" + crypto.randomUUID();
    window.localStorage.setItem(ANALYTICS_SESSION_KEY, fresh);
    return fresh;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

function trackEvent(
  eventName: AnalyticsEventName,
  source?: CtaSource,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateAnalyticsSessionId();
  // sendBeacon can't set custom headers, so we always include sessionId in the
  // body. The server reads X-Session-Id first and falls back to body.sessionId.
  const payload = JSON.stringify({
    eventName,
    source: source ?? null,
    metadata: metadata ?? null,
    sessionId,
  });
  try {
    // Prefer sendBeacon when available so the request survives navigation
    // (e.g. clicking a link that opens Stripe in a new tab).
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/events",
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // analytics is best-effort
    });
  } catch {
    // ignore
  }
}

function detectPetTerm(messages: PreviewMessage[]): string {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");
  const matches: { re: RegExp; label: string }[] = [
    { re: /\b(puppy|puppies)\b/, label: "your puppy" },
    { re: /\b(kitten|kittens)\b/, label: "your kitten" },
    { re: /\b(dog|dogs|doggie|doggy|pup|pooch)\b/, label: "your dog" },
    { re: /\b(cat|cats|kitty|feline)\b/, label: "your cat" },
    { re: /\b(rabbit|bunny)\b/, label: "your bunny" },
    { re: /\b(parrot|bird|cockatiel|budgie)\b/, label: "your bird" },
    { re: /\b(hamster|guinea pig|gerbil)\b/, label: "your little one" },
  ];
  for (const m of matches) {
    if (m.re.test(userText)) return m.label;
  }
  return "your pet";
}

// Words that look like names (capitalized) but almost certainly aren't a pet
// name — sentence starters, days/months, generic nouns, common pronouns, etc.
const NAME_BLOCKLIST = new Set([
  "I", "Im", "Ive", "Id", "Ill",
  "My", "Mine", "Our", "Ours", "Your", "Yours", "His", "Her", "Hers", "Its", "Their", "Theirs",
  "He", "She", "It", "They", "We", "You", "Me", "Us", "Them", "This", "That", "These", "Those",
  "A", "An", "The", "And", "But", "Or", "So", "If", "Then", "Than", "As", "At", "In", "On", "Of", "To", "For", "With", "From", "By",
  "Is", "Was", "Are", "Were", "Be", "Been", "Being", "Am",
  "Has", "Have", "Had", "Having",
  "Do", "Does", "Did", "Doing", "Done",
  "Will", "Would", "Should", "Could", "Can", "Cant", "Cannot", "Wont", "Wouldnt", "Shouldnt",
  "Why", "What", "When", "Where", "How", "Who", "Which", "Whose",
  "Yes", "No", "Yeah", "Yep", "Nope", "Okay", "Ok", "Sure", "Maybe", "Please", "Thanks", "Hi", "Hello", "Hey",
  "Today", "Yesterday", "Tonight", "Tomorrow", "Morning", "Afternoon", "Evening", "Night",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
  // Species / generic pet words — never treat these as names even when capitalized
  // (e.g. "My Cat won't eat" at the start of a sentence).
  "Cat", "Cats", "Kitty", "Kitten", "Kittens", "Feline",
  "Dog", "Dogs", "Doggie", "Doggy", "Puppy", "Puppies", "Pup", "Pooch",
  "Rabbit", "Bunny", "Bird", "Parrot", "Cockatiel", "Budgie",
  "Hamster", "Gerbil", "Pet", "Pets",
  "Mr", "Mrs", "Ms", "Dr",
]);

const SPECIES_WORD = "(?:cat|kitten|kitty|feline|dog|doggie|doggy|puppy|pup|pooch|rabbit|bunny|bird|parrot|cockatiel|budgie|hamster|gerbil|pet)";
// A name token: starts with a capital letter, may contain inner letters,
// apostrophes ("O'Malley") or hyphens ("Mary-Anne"). 2-20 chars total.
const NAME_TOKEN = "([A-Z][a-zA-Z'\\-]{1,19})";

function isLikelyName(candidate: string | undefined): candidate is string {
  if (!candidate) return false;
  const stripped = candidate.replace(/[^a-zA-Z]/g, "");
  if (stripped.length < 2) return false;
  if (NAME_BLOCKLIST.has(stripped)) return false;
  return true;
}

// Try to pull a pet's actual name out of the user's earlier messages so the
// nudge can say "keep helping with Whiskers?" instead of "your cat".
//
// Strategy (in confidence order):
//   1) "my cat named Whiskers" / "dog called Rex"
//   2) "my cat Whiskers" — capitalized token immediately after a species word
//   3) "Whiskers <pet-ish verb>" — e.g. "Bella keeps limping",
//      "Whiskers stopped eating". The verb list is intentionally narrow so
//      we don't latch onto unrelated capitalized words.
//
// We bail out (return null) on anything ambiguous and let the caller fall
// back to the generic species term.
function detectPetName(messages: PreviewMessage[]): string | null {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .filter((c) => typeof c === "string" && c.length > 0);
  if (userTexts.length === 0) return null;

  const namedPattern = new RegExp(
    `\\b${SPECIES_WORD}\\s+(?:named|called)\\s+${NAME_TOKEN}\\b`,
    "i",
  );
  // "my cat Whiskers" — require a possessive/article so we don't match
  // "the cat Sleeping on the rug". Determiners are written with both cases
  // explicitly so "My cat Whiskers" matches at sentence start. We deliberately
  // avoid the global `i` flag here because it would also relax NAME_TOKEN's
  // leading [A-Z], causing matches like "my cat is sick" -> "is".
  const possessiveSpeciesPattern = new RegExp(
    `\\b(?:[Mm]y|[Oo]ur|[Tt]he|[Aa])\\s+${SPECIES_WORD}\\s+${NAME_TOKEN}\\b`,
  );
  // "Whiskers stopped eating", "Bella keeps limping". Verb list is narrow on
  // purpose — these are the kinds of things people actually write to a pet
  // helper, and they're unlikely to follow a non-name capitalized word.
  const nameThenVerbPattern = new RegExp(
    `\\b${NAME_TOKEN}\\s+(?:keeps?|kept|stopped|won't|wont|isn't|isnt|doesn't|doesnt|hasn't|hasnt|seems|started|has\\s+been|been|got|gets|ate|eats|drinks?|drank|sleeps?|slept|limps?|limped|whines?|barks?|meows?|hisses?|coughs?|vomits?|vomited|threw\\s+up|throws\\s+up|scratches?|bit|bites?|won't\\s+eat|won't\\s+drink|hides?|hid|cries|cried)\\b`,
  );

  for (const text of userTexts) {
    const m = text.match(namedPattern);
    if (m && isLikelyName(m[1])) return m[1];
  }
  for (const text of userTexts) {
    const m = text.match(possessiveSpeciesPattern);
    if (m && isLikelyName(m[1])) return m[1];
  }
  for (const text of userTexts) {
    const m = text.match(nameThenVerbPattern);
    if (m && isLikelyName(m[1])) return m[1];
  }
  return null;
}

// Returns what the nudge should call the pet: the actual name when we can
// detect one confidently, otherwise the existing "your cat / your dog / your
// pet" wording.
function detectPetReference(messages: PreviewMessage[]): string {
  const name = detectPetName(messages);
  if (name) return name;
  return detectPetTerm(messages);
}

function CtaButton({
  className = "",
  label = "Start for $4.99/month",
  source,
}: {
  className?: string;
  label?: string;
  source: CtaSource;
}) {
  return (
    <a
      href={STRIPE_PAYMENT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("cta_click", source, { label })}
      className={`inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-7 py-4 rounded-2xl shadow-md hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all duration-150 ${className}`}
    >
      {label}
    </a>
  );
}

function FreePreviewChat({ onReady }: { onReady?: (sendFn: (msg: string) => void) => void }) {
  const restoredRef = useRef<PreviewChatPersistedState | null>(null);
  if (restoredRef.current === null && typeof window !== "undefined") {
    restoredRef.current = loadPreviewChatState();
  }
  const restored = restoredRef.current;

  const [messages, setMessages] = useState<PreviewMessage[]>(() => restored?.messages ?? []);
  const [input, setInput] = useState("");
  const [questionCount, setQuestionCount] = useState(() => restored?.questionCount ?? 0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(() => restored?.conversationId ?? null);
  const [locked, setLocked] = useState(() => restored?.locked ?? false);
  const [imageToSend, setImageToSend] = useState<{ dataUrl: string; name: string } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const sessionRef = useRef<string>(restored?.sessionRef ?? "preview-" + crypto.randomUUID());
  const nudgeShownTrackedRef = useRef(false);

  // Fire a one-time `nudge_shown` event whenever the locked nudge becomes visible
  // for this session. Skips the streaming window so we count it once it actually renders.
  useEffect(() => {
    if (!locked || isStreaming) return;
    if (nudgeShownTrackedRef.current) return;
    nudgeShownTrackedRef.current = true;
    const petName = detectPetName(messages);
    trackEvent("nudge_shown", undefined, {
      questionCount,
      petTerm: detectPetTerm(messages),
      petName,
      usedPetName: petName !== null,
    });
  }, [locked, isStreaming, questionCount, messages]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist conversation state across refresh (~24h) so the paywall and history survive.
  // Skip writes during streaming to avoid persisting half-streamed assistant responses.
  useEffect(() => {
    if (isStreaming) return;
    if (messages.length === 0 && questionCount === 0 && !locked) return;
    savePreviewChatState({
      sessionRef: sessionRef.current,
      messages,
      questionCount,
      locked,
      conversationId,
    });
  }, [messages, questionCount, locked, conversationId, isStreaming]);

  useEffect(() => {
    if (messages.length === 0) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: isStreaming ? "auto" : "smooth" });
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

  const resetChat = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(PREVIEW_CHAT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    setMessages([]);
    setQuestionCount(0);
    setLocked(false);
    setConversationId(null);
    setInput("");
    setImageToSend(null);
    setConfirmingReset(false);
    sessionRef.current = "preview-" + crypto.randomUUID();
  }, []);

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Animated glow ring behind the chat — draws the eye */}
      <div
        aria-hidden
        className="absolute -inset-2 rounded-[2rem] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 opacity-30 blur-2xl animate-pulse motion-reduce:animate-none pointer-events-none"
      />
      <div className="relative bg-white rounded-[2rem] shadow-2xl border-2 border-purple-200 overflow-hidden" style={{ boxShadow: "0 20px 60px 0 rgba(147,51,234,0.25), 0 8px 24px 0 rgba(236,72,153,0.15)" }}>
        <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 ring-2 ring-white/30 flex-shrink-0">
            <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-white font-black text-base block leading-tight">Paw And Whisker AI</span>
            <span className="text-white/85 text-xs font-medium">Ask anything about your pet 🐾</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-white/95 bg-white/15 px-2.5 py-1 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Online
          </span>
        </div>

        <div ref={messagesContainerRef} className="h-80 sm:h-[28rem] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md ring-2 ring-purple-100 mb-1">
              <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
            </div>
            <div>
              <p className="text-base font-black text-slate-800">👋 Hi! I'm here to help.</p>
              <p className="text-sm text-slate-500 mt-1">Ask me anything about your pet — I'll answer in seconds.</p>
            </div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mt-1">Try one of these</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["My cat stopped eating — should I worry?", "My dog is limping, what should I do?", "Why is my cat hiding suddenly?"].map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs bg-white border-2 border-purple-200 text-purple-700 px-3 py-2 rounded-full hover:bg-purple-50 hover:border-purple-400 hover:shadow-sm transition-all font-semibold"
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

        {locked && !isStreaming && (
          <div className="flex gap-2 msg-enter flex-row">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border border-purple-100">
              <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
            </div>
            <div className="rounded-2xl rounded-tl-sm text-sm max-w-[82%] shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 text-slate-700">
              <div className="px-4 py-3 leading-relaxed">
                <p className="mb-2">
                  Want me to keep helping with <strong className="font-bold text-slate-800">{detectPetReference(messages)}</strong>? I can keep going as long as you need 🐾
                </p>
                <a
                  href={STRIPE_PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent("cta_click", "preview_nudge", {
                      label: "Continue for $4.99/month →",
                      questionCount,
                    })
                  }
                  className="inline-flex items-center gap-1 text-purple-700 font-bold hover:text-purple-900 underline underline-offset-2"
                >
                  Continue for $4.99/month →
                </a>
              </div>
            </div>
          </div>
        )}
        </div>

        {locked ? (
          <div className="p-5 border-t border-slate-100 bg-gradient-to-r from-purple-50 to-pink-50 text-center">
            <p className="text-base font-black text-slate-800 mb-1">Get unlimited answers when you need them most</p>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Unlimited questions · Image analysis · Available 24/7</p>
            <CtaButton className="text-sm py-3 px-6 rounded-xl w-full justify-center" label="Start for $4.99/month →" source="preview_paywall_card" />
            <p className="text-xs text-slate-400 mt-2">Cancel anytime. No commitment.</p>
            <div className="mt-4 pt-3 border-t border-purple-100">
              {confirmingReset ? (
                <div className="flex items-center justify-center gap-3 text-xs">
                  <span className="text-slate-500">Clear this conversation?</span>
                  <button
                    onClick={resetChat}
                    className="font-bold text-purple-700 hover:text-purple-900 underline underline-offset-2"
                  >
                    Yes, reset
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="font-medium text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="text-xs text-slate-400 hover:text-purple-700 underline underline-offset-2 transition-colors"
                >
                  Start a new chat
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t-2 border-purple-100 bg-white">
            {/* Image preview strip */}
            {imageToSend && (
              <div className="px-4 pt-3 flex items-center gap-2">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-purple-200 flex-shrink-0">
                  <img src={imageToSend.dataUrl} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImageToSend(null)}
                    aria-label="Remove selected photo"
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-800/70 text-white text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-purple-600 font-medium">📸 Photo ready to send</p>
              </div>
            )}
            {/* Upload + input row */}
            <div className="p-4 flex gap-2 items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                className="flex items-center gap-1.5 text-sm font-bold text-purple-600 bg-purple-50 border-2 border-purple-200 px-3 py-3 rounded-xl hover:bg-purple-100 hover:border-purple-300 transition-all disabled:opacity-50 flex-shrink-0"
                aria-label="Add photo"
              >
                📸
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
                placeholder="Type your question about your pet..."
                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:bg-white transition-all placeholder:text-slate-400"
                disabled={isStreaming}
              />
              <button
                onClick={() => send()}
                disabled={isStreaming || (!input.trim() && !imageToSend)}
                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl px-5 py-3 text-base font-black shadow-md disabled:opacity-50 transition-all hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] flex-shrink-0"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-md ring-2 ring-purple-100">
              <img src="/app-logo.png" alt="Paw And Whisker" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
            </div>
            <span className="font-black text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Paw And Whisker
            </span>
          </div>
          <CtaButton className="text-sm py-2.5 px-5 rounded-xl" source="header_nav" />
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
          <div className="flex flex-col items-center gap-3">
            <a
              href="https://quiz.pawandwhisker.net"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-purple-300 text-purple-700 font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow-md hover:border-purple-400 hover:bg-purple-50 active:scale-[0.98] transition-all duration-150 text-sm"
            >
              <span>Is My Pet OK? Free Check</span>
              <span aria-hidden="true">→</span>
            </a>
            <CtaButton className="text-lg px-10 py-4 rounded-2xl" source="hero" />
          </div>
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
            <CtaButton className="text-base px-8 py-3.5 rounded-2xl" label="Get instant answers — $4.99/month" source="daily_use_section" />
          </div>
        </section>

        {/* LIVE CHAT PREVIEW — the centerpiece */}
        <section ref={chatSectionRef} className="bg-gradient-to-br from-purple-100 via-fuchsia-50 to-pink-100 border-y-2 border-purple-200 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-5">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 bg-white border-2 border-purple-300 text-purple-700 text-xs font-black px-4 py-2 rounded-full shadow-md mb-4 uppercase tracking-wider">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Try it now — Free, no signup
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 mb-3">
                Ask your pet question{" "}
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  right here
                </span>
              </h2>
              <p className="text-slate-600 text-base sm:text-lg max-w-md mx-auto">
                This is the heart of Paw And Whisker — type below and get a real answer in seconds.
              </p>
              <p className="text-purple-600 text-sm font-bold mt-3 flex items-center justify-center gap-1.5">
                <span className="text-xl animate-bounce motion-reduce:animate-none">👇</span>
                <span>Start typing — your first 2 questions are free</span>
              </p>
            </div>
            <FreePreviewChat onReady={(fn) => { chatSendRef.current = fn; }} />
            <p className="text-center text-xs text-slate-500 font-semibold mt-5">
              Free · No signup · Answers in seconds
            </p>
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
            <CtaButton className="w-full justify-center text-base py-4 rounded-xl" label="Get unlimited answers — $4.99/month" source="pricing_card" />
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
