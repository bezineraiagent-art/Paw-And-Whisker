import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { STRIPE_PAYMENT_LINK } from "@/content/site";
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
  // Pet name + species the server's LLM extractor returned on the first turn.
  // Stored so subsequent turns (and resumed sessions) reuse it instead of
  // re-running detection.
  serverPetName?: string | null;
  serverPetSpecies?: string | null;
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

type AnalyticsEventName =
  | "nudge_shown"
  | "cta_click"
  | "preview_chat_reset"
  | "preview_chat_resumed";
type CtaSource =
  | "preview_nudge"
  | "preview_paywall_card"
  | "header_nav"
  | "hero"
  | "daily_use_section"
  | "pricing_card";

const ANALYTICS_SESSION_KEY = "pw-analytics-session-v1";
const AB_VARIANT_KEY = "pw-ab-nudge-variant-v1";
const AB_RESET_VARIANT_KEY = "pw-ab-reset-variant-v1";

type NudgeVariant = "nudge_on" | "nudge_off";
type ResetVariant = "reset_on" | "reset_off";

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

// Persisted ~50/50 split between "nudge_on" (sees the inline nudge bubble) and
// "nudge_off" (only sees the locked paywall card). Assignment happens on first
// visit and survives reloads via localStorage so the same visitor always sees
// the same experience while the experiment runs.
function getOrCreateNudgeVariant(): NudgeVariant {
  if (typeof window === "undefined") return "nudge_on";
  try {
    const existing = window.localStorage.getItem(AB_VARIANT_KEY);
    if (existing === "nudge_on" || existing === "nudge_off") return existing;
    const fresh: NudgeVariant = Math.random() < 0.5 ? "nudge_on" : "nudge_off";
    window.localStorage.setItem(AB_VARIANT_KEY, fresh);
    return fresh;
  } catch {
    return Math.random() < 0.5 ? "nudge_on" : "nudge_off";
  }
}

// Independent ~50/50 split for the "Start a new chat" reset affordance under
// the locked paywall. "reset_on" sees the link (current behavior); "reset_off"
// never sees it. Assigned independently from the nudge variant so we can
// measure the reset link's effect on conversion in isolation. Persisted in
// its own localStorage key so it survives reloads and stays stable per visitor.
function getOrCreateResetVariant(): ResetVariant {
  if (typeof window === "undefined") return "reset_on";
  try {
    const existing = window.localStorage.getItem(AB_RESET_VARIANT_KEY);
    if (existing === "reset_on" || existing === "reset_off") return existing;
    const fresh: ResetVariant = Math.random() < 0.5 ? "reset_on" : "reset_off";
    window.localStorage.setItem(AB_RESET_VARIANT_KEY, fresh);
    return fresh;
  } catch {
    return Math.random() < 0.5 ? "reset_on" : "reset_off";
  }
}

function trackEvent(
  eventName: AnalyticsEventName,
  source?: CtaSource,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateAnalyticsSessionId();
  const variant = getOrCreateNudgeVariant();
  const resetVariant = getOrCreateResetVariant();
  // sendBeacon can't set custom headers, so we always include sessionId in the
  // body. The server reads X-Session-Id first and falls back to body.sessionId.
  // `variant` rides on its own column so the summary endpoint can group by it
  // cheaply (that's the nudge experiment). The reset experiment piggybacks on
  // metadata.resetVariant — the analytics summary reads it back out of jsonb.
  const payload = JSON.stringify({
    eventName,
    source: source ?? null,
    variant,
    metadata: { ...(metadata ?? {}), variant, resetVariant },
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
// pet" wording. Server-extracted values take precedence over the regex.
function detectPetReference(
  messages: PreviewMessage[],
  serverPetName: string | null,
  serverPetSpecies: string | null,
): string {
  if (serverPetName) return serverPetName;
  const name = detectPetName(messages);
  if (name) return name;
  if (serverPetSpecies) return speciesToTerm(serverPetSpecies);
  return detectPetTerm(messages);
}

// Map an LLM-extracted species label to the same "your cat / your dog / your
// pet" wording the regex heuristic produces.
function speciesToTerm(species: string): string {
  switch (species) {
    case "cat":
    case "kitten":
      return species === "kitten" ? "your kitten" : "your cat";
    case "dog":
    case "puppy":
      return species === "puppy" ? "your puppy" : "your dog";
    case "rabbit":
      return "your bunny";
    case "bird":
      return "your bird";
    case "hamster":
    case "guinea pig":
    case "gerbil":
      return "your little one";
    default:
      return "your pet";
  }
}

function CtaButton({
  className = "",
  label = "Start for $4.99/month",
  source,
  extraMetadata,
}: {
  className?: string;
  label?: string;
  source: CtaSource;
  extraMetadata?: Record<string, unknown>;
}) {
  return (
    <a
      href={STRIPE_PAYMENT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("cta_click", source, { label, ...extraMetadata })}
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
  // Pet name + species the server's LLM extractor returned. Preferred over the
  // client-side regex when present so we catch lowercase names ("whiskers"),
  // titled names ("Mr. Whiskers"), and indirectly-introduced names. Hydrated
  // from localStorage so a returning visitor keeps the personalization.
  const [serverPetName, setServerPetName] = useState<string | null>(() => restored?.serverPetName ?? null);
  const [serverPetSpecies, setServerPetSpecies] = useState<string | null>(() => restored?.serverPetSpecies ?? null);
  // Mirror in a ref so the streaming send() callback (which closes over an
  // older render) can read the latest server-extracted name without re-running.
  const serverPetNameRef = useRef<string | null>(serverPetName);
  useEffect(() => { serverPetNameRef.current = serverPetName; }, [serverPetName]);
  const sessionRef = useRef<string>(restored?.sessionRef ?? "preview-" + crypto.randomUUID());
  // Resolved on first render and never changed for the rest of the session so
  // the inline nudge doesn't pop in/out if storage is cleared mid-session.
  const variantRef = useRef<NudgeVariant>(getOrCreateNudgeVariant());
  const variant = variantRef.current;
  // Same idea for the reset-link experiment — pinned at first render so the
  // "Start a new chat" affordance doesn't appear/disappear mid-session.
  const resetVariantRef = useRef<ResetVariant>(getOrCreateResetVariant());
  const resetVariant = resetVariantRef.current;
  const nudgeShownTrackedRef = useRef(false);
  // Tracks resets done within this page session so we can stamp subsequent
  // events with `afterReset` metadata. This lets the analytics dashboard see,
  // per session, whether a reset led to another preview chat, a subscribe
  // click, or abandonment.
  const resetCountRef = useRef(0);
  // Set to true the moment a reset happens; flipped back to false once we've
  // fired the `preview_chat_resumed` event for the next message send.
  const pendingResumeRef = useRef(false);

  // Fire a one-time `nudge_shown` event whenever the locked nudge becomes visible
  // for this session. Skips the streaming window so we count it once it actually renders.
  // Only the "nudge_on" variant actually renders the inline nudge, so we skip
  // the event for "nudge_off" — that variant is supposed to never see it.
  useEffect(() => {
    if (variant !== "nudge_on") return;
    if (!locked || isStreaming) return;
    if (nudgeShownTrackedRef.current) return;
    nudgeShownTrackedRef.current = true;
    // Prefer the server-extracted name (catches lowercase + titled names the
    // regex misses); fall back to the regex heuristic otherwise.
    const regexName = detectPetName(messages);
    const petName = serverPetName ?? regexName;
    trackEvent("nudge_shown", undefined, {
      questionCount,
      petTerm: detectPetTerm(messages),
      petName,
      usedPetName: petName !== null,
      petNameSource: petName ? (serverPetName ? "server_llm" : "client_regex") : null,
      serverPetSpecies,
      afterReset: resetCountRef.current > 0,
      resetCount: resetCountRef.current,
    });
  }, [variant, locked, isStreaming, questionCount, messages, serverPetName, serverPetSpecies]);
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
      serverPetName,
      serverPetSpecies,
    });
  }, [messages, questionCount, locked, conversationId, isStreaming, serverPetName, serverPetSpecies]);

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

    // If the user just hit reset and is now starting another preview chat,
    // record that so we can distinguish "reset → resumed chatting" from
    // "reset → abandoned" in the analytics.
    if (pendingResumeRef.current) {
      pendingResumeRef.current = false;
      trackEvent("preview_chat_resumed", undefined, {
        resetCount: resetCountRef.current,
        sessionRef: sessionRef.current,
      });
    }

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

      // Pick a pet name to send to the server so it can address the pet by
      // name in its reply (e.g. "It sounds like Whiskers..."). Prefer the
      // server's LLM-extracted name from a previous turn (catches lowercase /
      // titled names) and fall back to the regex heuristic otherwise. Run the
      // regex on messages *plus* the latest user turn so a name introduced in
      // the very first message still gets picked up.
      const messagesForNameDetection: PreviewMessage[] = [
        ...messages,
        { role: "user", content: displayContent },
      ];
      const detectedPetName = serverPetNameRef.current ?? detectPetName(messagesForNameDetection);

      const res = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionRef.current },
        body: JSON.stringify({
          content: displayContent,
          ...(capturedImage ? { imageBase64: capturedImage.dataUrl } : {}),
          ...(detectedPetName ? { petName: detectedPetName } : {}),
        }),
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
              // Server's LLM-extracted pet info from the first user turn. Stash
              // it so subsequent sends and the nudge prefer it over the regex.
              if (data.petInfo && typeof data.petInfo === "object") {
                const incomingName = typeof data.petInfo.petName === "string" ? data.petInfo.petName : null;
                const incomingSpecies = typeof data.petInfo.species === "string" ? data.petInfo.species : null;
                if (incomingName) setServerPetName(incomingName);
                if (incomingSpecies) setServerPetSpecies(incomingSpecies);
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
    const previousSessionRef = sessionRef.current;
    const previousQuestionCount = questionCount;
    const previousResetCount = resetCountRef.current;

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
    setServerPetName(null);
    setServerPetSpecies(null);
    sessionRef.current = "preview-" + crypto.randomUUID();
    // Allow the next nudge_shown to fire again for the fresh chat.
    nudgeShownTrackedRef.current = false;
    resetCountRef.current = previousResetCount + 1;
    pendingResumeRef.current = true;

    trackEvent("preview_chat_reset", undefined, {
      questionCountAtReset: previousQuestionCount,
      previousSessionRef,
      newSessionRef: sessionRef.current,
      resetCount: resetCountRef.current,
    });
  }, [questionCount]);

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
            <span className="text-white/85 text-xs font-medium">Ask about your puppy</span>
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
              <p className="text-base font-black text-slate-800">Hi! I'm here to help.</p>
              <p className="text-sm text-slate-500 mt-1">Ask a general question about your puppy. Not medical advice; for urgent signs, see an emergency vet now.</p>
            </div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mt-1">Try one of these</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["How do I start potty training?", "Why does my puppy bite so much?", "How often should a puppy eat?"].map((q) => (
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
                  {m.imageUrl && <p className="text-xs text-white/70 px-4 pt-2">Photo sent</p>}
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

        {locked && !isStreaming && variant === "nudge_on" && (
          <div className="flex gap-2 msg-enter flex-row">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border border-purple-100">
              <img src="/app-logo.png" alt="" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
            </div>
            <div className="rounded-2xl rounded-tl-sm text-sm max-w-[82%] shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 text-slate-700">
              <div className="px-4 py-3 leading-relaxed">
                <p className="mb-2">
                  Want me to keep helping with <strong className="font-bold text-slate-800">{detectPetReference(messages, serverPetName, serverPetSpecies)}</strong>? I can keep going with general information.
                </p>
                <a
                  href={STRIPE_PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent("cta_click", "preview_nudge", {
                      label: "Continue for $4.99/month →",
                      questionCount,
                      afterReset: resetCountRef.current > 0,
                      resetCount: resetCountRef.current,
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
            <p className="text-base font-black text-slate-800 mb-1">Want to keep chatting?</p>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Unlimited questions and photo upload. General information only.</p>
            <CtaButton
              className="text-sm py-3 px-6 rounded-xl w-full justify-center"
              label="Start for $4.99/month →"
              source="preview_paywall_card"
              extraMetadata={{
                questionCount,
                afterReset: resetCountRef.current > 0,
                resetCount: resetCountRef.current,
              }}
            />
            <p className="text-xs text-slate-400 mt-2">Cancel anytime. No commitment.</p>
            {resetVariant === "reset_on" && (
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
            )}
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
                <p className="text-xs text-purple-600 font-medium">Photo ready to send</p>
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
                Photo
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
                placeholder="Type your question about your puppy..."
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

const QUIZ_URL = "https://quiz.pawandwhisker.net";

const FAQS = [
  {
    q: "Does this replace my vet?",
    a: "No. Paw & Whisker gives general information only and never replaces a veterinarian. It can't examine your puppy or diagnose anything. If you see urgent signs such as trouble breathing, collapse, seizures, repeated vomiting, a swollen belly, pale gums, possible poisoning or a serious injury, contact an emergency vet now instead of using chat.",
  },
  {
    q: "What does it cost?",
    a: "The AI chat is free to try: your first 2 questions need no signup. The symptom check is free too. If you want to keep chatting and send photos, it's $4.99/month and you can cancel anytime.",
  },
  {
    q: "Is my data private?",
    a: "We only collect what's needed to run the chat and understand how the site is used. Avoid sharing details you wouldn't want stored. You can ask for an export or deletion of your data any time by emailing paul@pawandwhisker.net.",
  },
];

export default function Landing() {
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const chatSendRef = useRef<((msg: string) => void) | null>(null);

  const scrollToChat = useCallback(() => {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleCardClick = useCallback((message: string) => {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      chatSendRef.current?.(message);
    }, 450);
  }, []);

  const primaryBtn =
    "inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-7 py-4 rounded-2xl shadow-md hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all duration-150";
  const outlineBtn =
    "inline-flex items-center justify-center bg-white border-2 border-purple-300 text-purple-700 font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow-md hover:border-purple-400 hover:bg-purple-50 active:scale-[0.98] transition-all duration-150";

  const FreeChatBtn = ({ source, className = "" }: { source: CtaSource; className?: string }) => (
    <button
      type="button"
      data-testid={`button-free-chat-${source}`}
      onClick={() => {
        trackEvent("cta_click", source, { label: "Try the free AI chat", target: "free_chat" });
        scrollToChat();
      }}
      className={`${primaryBtn} ${className}`}
    >
      Try the free AI chat
    </button>
  );

  const QuizLink = ({ source, className = "" }: { source: CtaSource; className?: string }) => (
    <a
      href={QUIZ_URL}
      data-testid={`link-free-quiz-${source}`}
      onClick={() => trackEvent("cta_click", source, { label: "Free symptom check", target: "quiz" })}
      className={`${outlineBtn} ${className}`}
    >
      Free symptom check
      <span aria-hidden="true" className="ml-2">→</span>
    </a>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800" style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-md ring-2 ring-purple-100">
              <img src="/app-logo.png" alt="Paw And Whisker" className="w-full h-full object-cover" style={{ transform: "scale(1.42)", transformOrigin: "center" }} />
            </div>
            <span className="hidden sm:inline font-black text-xl tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Paw And Whisker
            </span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-5 text-sm font-semibold text-slate-600" aria-label="Main">
            <a href="/guides" data-testid="link-nav-guides" className="hover:text-purple-700">Guides</a>
            <a href="https://pawandwhisker.net/puppy-kit/" data-testid="link-nav-puppy-kit" className="hover:text-purple-700">Puppy Kit</a>
            <a href="/pricing" data-testid="link-nav-pricing" className="hover:text-purple-700">Pricing</a>
            <button
              type="button"
              data-testid="button-nav-free-chat"
              onClick={() => {
                trackEvent("cta_click", "header_nav", { label: "Try free chat", target: "free_chat" });
                scrollToChat();
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
            >
              Try free chat
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* HERO */}
        <section className="max-w-3xl mx-auto px-5 pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-purple-100">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            For new puppy owners
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-5">
            New puppy, endless questions?{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Start with free, friendly answers.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto mb-4 leading-relaxed">
            Ask about feeding, potty training, sleep, chewing and everyday puppy worries. Plain-language general information, free to try.
          </p>
          <p className="text-sm text-slate-500 max-w-lg mx-auto mb-10">
            General information only, not medical advice, and never a replacement for your vet. If you see urgent signs, call an emergency vet now.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <FreeChatBtn source="hero" className="text-lg px-9" />
            <QuizLink source="hero" className="py-4 rounded-2xl" />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Both are free. Want more later?{" "}
            <a
              href={STRIPE_PAYMENT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-hero-paid"
              onClick={() => trackEvent("cta_click", "hero", { label: "Unlimited for $4.99/month", target: "stripe" })}
              className="text-purple-700 font-semibold underline underline-offset-2"
            >
              Unlimited chat is $4.99/month
            </a>
          </p>
        </section>

        {/* URGENT SIGNS */}
        <section className="max-w-2xl mx-auto px-5 pb-10">
          <div className="border-2 border-pink-200 bg-pink-50 rounded-2xl px-5 py-4 text-sm text-slate-700 leading-relaxed" data-testid="notice-emergency">
            <p className="font-black text-pink-700 mb-1">Urgent signs? Call an emergency vet now.</p>
            Trouble breathing, collapse, seizures, repeated vomiting or diarrhea, a swollen belly, pale gums, suspected poisoning or serious injury. Don't wait on a chat for these.
          </div>
        </section>

        {/* EMOTIONAL TRIGGER */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 border-y border-purple-100 py-16">
          <div className="max-w-2xl mx-auto px-5 text-center">
            <h2 className="text-2xl sm:text-3xl font-black mb-6 tracking-tight text-slate-800">
              Every new puppy owner has these moments
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">Is this normal? Should I wait? What do I do next?</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {["Is this normal puppy behavior?", "How much should they eat?", "When should I call the vet?"].map((q) => (
                <div key={q} className="bg-white border border-purple-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
                  {q}
                </div>
              ))}
            </div>
            <p className="text-base font-bold text-purple-700">Get general, approachable information to help you prepare your questions for the vet.</p>
          </div>
        </section>

        {/* REAL USE CASES */}
        <section className="max-w-4xl mx-auto px-5 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-2 tracking-tight">
            Common puppy questions
          </h2>
          <p className="text-center text-slate-400 text-sm mb-2">Tap one to ask the free chat.</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
            {[
              { text: "My puppy won't stop biting", message: "My puppy won't stop biting. What are some general tips?" },
              { text: "How do I start potty training?", message: "How do I start potty training my new puppy?" },
              { text: "My puppy cries at night", message: "My puppy cries at night in the crate. What are some general tips?" },
              { text: "What should I feed my puppy?", message: "What general things should I know about feeding a new puppy?" },
            ].map(({ text, message }) => (
              <button
                key={text}
                data-testid={`button-puppy-question-${text.slice(0, 12).replace(/\W+/g, "-").toLowerCase()}`}
                onClick={() => handleCardClick(message)}
                className="flex items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm cursor-pointer text-left transition-all duration-150 hover:scale-[1.02] hover:shadow-lg hover:border-purple-300 active:scale-[0.99]"
              >
                <p className="text-sm font-semibold text-slate-700">{text}</p>
                <span className="text-xs text-purple-500 font-medium flex-shrink-0">Ask →</span>
              </button>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-slate-50 border-y border-slate-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Describe what you're seeing", desc: "Type your question, or add a photo, in your own words." },
                { step: "2", title: "Read general information", desc: "Get a plain-language answer with things to consider. It can be wrong, so double-check what matters." },
                { step: "3", title: "Talk to your vet", desc: "Use it to prepare questions. For anything worrying or urgent, contact a vet directly." },
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
          </div>
        </section>

        {/* LIVE CHAT */}
        <section ref={chatSectionRef} id="free-chat" className="bg-gradient-to-br from-purple-100 via-fuchsia-50 to-pink-100 border-y-2 border-purple-200 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-5">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 bg-white border-2 border-purple-300 text-purple-700 text-xs font-black px-4 py-2 rounded-full shadow-md mb-4 uppercase tracking-wider">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Free, no signup
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 mb-3">
                Ask your puppy question{" "}
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  right here
                </span>
              </h2>
              <p className="text-slate-600 text-base sm:text-lg max-w-md mx-auto">
                Type below to get general information in seconds. Your first 2 questions are free.
              </p>
              <p className="text-slate-500 text-xs max-w-md mx-auto mt-3">
                Not medical advice and not a substitute for a vet. For urgent signs, go to an emergency vet now rather than chatting first.
              </p>
            </div>
            <FreePreviewChat onReady={(fn) => { chatSendRef.current = fn; }} />
            <div className="text-center mt-6">
              <QuizLink source="daily_use_section" className="text-sm" />
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="bg-slate-50 border-b border-slate-100 py-16">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 tracking-tight">
              Paw & Whisker vs. ChatGPT
            </h2>
            <p className="text-center text-slate-500 text-sm mb-10">Both are AI chat tools and both can make mistakes. Here are the factual differences.</p>
            <div className="max-w-2xl mx-auto overflow-x-auto rounded-2xl border border-slate-200 bg-white text-sm">
              <table className="w-full text-left">
                <caption className="sr-only">ChatGPT and Paw &amp; Whisker feature comparison</caption>
                <thead className="bg-slate-100 font-bold text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="p-3">Feature</th>
                    <th scope="col" className="p-3">ChatGPT</th>
                    <th scope="col" className="p-3 text-purple-700">Paw &amp; Whisker</th>
                  </tr>
                </thead>
                <tbody>
              {[
                ["Built for", "General topics", "Pet owners, puppies first"],
                ["Free to try", "Yes, with limits", "2 free questions, no signup"],
                ["Paid plan", "Varies by plan", "$4.99/month"],
                ["Photo upload", "Yes", "Yes"],
                ["Replaces a vet", "No", "No"],
              ].map(([label, a, b]) => (
                <tr key={label} className="border-t border-slate-100">
                  <th scope="row" className="p-3 font-semibold text-slate-700">{label}</th>
                  <td className="p-3 text-slate-500">{a}</td>
                  <td className="p-3 text-slate-800">{b}</td>
                </tr>
              ))}
                </tbody>
              </table>
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">ChatGPT details can change; check OpenAI's site for current plans.</p>
          </div>
        </section>

        {/* PRICING */}
        <section className="max-w-lg mx-auto px-5 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">Free first. Upgrade if it helps.</h2>
          <p className="text-slate-400 text-sm mb-10">The chat preview and symptom check cost nothing.</p>
          <div className="bg-white border-2 border-purple-200 rounded-3xl p-8 shadow-lg">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">Optional</p>
            <div className="mb-6">
              <span className="text-5xl font-black text-slate-800">$4.99</span>
              <span className="text-slate-400 text-lg font-medium">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-left">
              {[
                "Unlimited chat questions",
                "Photo upload in chat",
                "Puppies, dogs, cats and more",
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
            <FreeChatBtn source="pricing_card" className="w-full text-base py-3.5 rounded-xl mb-3" />
            <CtaButton
              className="w-full justify-center text-sm py-3 rounded-xl !bg-none !bg-white !text-purple-700 border-2 border-purple-300 !shadow-none"
              label="Subscribe for $4.99/month"
              source="pricing_card"
            />
            <p className="mt-3 text-xs text-slate-400">Checkout via Stripe</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-5 pb-20" id="faq">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8 tracking-tight">Quick questions</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <details key={f.q} data-testid={`faq-item-${i}`} className="group bg-white border border-purple-100 rounded-2xl px-5 py-4 shadow-sm open:border-purple-300">
                <summary className="cursor-pointer font-bold text-slate-800 list-none flex items-center justify-between gap-3">
                  {f.q}
                  <span aria-hidden="true" className="text-purple-500 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="text-sm text-slate-600 leading-relaxed mt-3">
                  {f.a.includes("paul@pawandwhisker.net") ? (
                    <>
                      {f.a.split("paul@pawandwhisker.net")[0]}
                      <a href="mailto:paul@pawandwhisker.net" className="text-purple-700 font-semibold underline">paul@pawandwhisker.net</a>
                      {f.a.split("paul@pawandwhisker.net")[1]}
                    </>
                  ) : (
                    f.a
                  )}
                </p>
              </details>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
