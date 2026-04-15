import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "wouter";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  useGetOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const STRIPE_LINK = "https://buy.stripe.com/3cI6oG32021Bedm1Xkgw002";
const FREE_LIMIT = 2;
const FREE_COUNT_KEY = "paw_free_count";
const SUBSCRIBED_KEY = "paw_subscribed";
const PET_PROFILE_KEY = "paw_pet_profile";

type PetProfile = { petType: string; age: string; concern: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  id?: number;
  imageUrl?: string;
};

const QUICK_REPLIES = [
  "Is this serious?",
  "What else should I watch for?",
  "How can I prevent this?",
  "What should I avoid giving my pet?",
];

const SUGGESTED_QUESTIONS = [
  "Why is my cat scratching the furniture?",
  "What foods are toxic to dogs?",
  "How do I travel with my pet safely?",
  "My rabbit stopped eating — what should I do?",
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function LogoAvatar() {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-purple-100 bg-purple-50">
      <img
        src="/app-logo.png"
        alt=""
        className="w-full h-full object-cover"
        style={{ transform: "scale(1.42)", transformOrigin: "center" }}
      />
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-bold text-slate-800">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="mt-1 mb-2 space-y-1">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="flex gap-2">
            <span className="mt-0.5 text-purple-500 flex-shrink-0">•</span>
            <span>{children}</span>
          </li>
        ),
        h2: ({ children }) => (
          <h2 className="font-bold text-sm text-slate-800 mt-3 mb-1 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-bold text-sm text-slate-800 mt-2 mb-1 first:mt-0">
            {children}
          </h3>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function PetOnboardingCard({
  onSave,
  onSkip,
}: {
  onSave: (p: PetProfile) => void;
  onSkip: () => void;
}) {
  const [petType, setPetType] = useState("");
  const [age, setAge] = useState("");
  const [concern, setConcern] = useState("");

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-3xl p-6 mb-6 w-full max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🐾</span>
        <h3 className="font-bold text-slate-800 text-sm">
          Tell us about your pet
        </h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        We'll personalize every answer to your specific pet.
      </p>
      <div className="space-y-2.5">
        <input
          type="text"
          value={petType}
          onChange={(e) => setPetType(e.target.value)}
          placeholder="Pet type (e.g. cat, dog, rabbit)"
          className="w-full bg-white border border-purple-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
        />
        <input
          type="text"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Age (e.g. 2 years, 6 months)"
          className="w-full bg-white border border-purple-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
        />
        <input
          type="text"
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          placeholder="Main concern (e.g. diet, behavior, health)"
          className="w-full bg-white border border-purple-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
        />
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => {
            if (petType.trim()) {
              onSave({
                petType: petType.trim(),
                age: age.trim(),
                concern: concern.trim(),
              });
            } else {
              onSkip();
            }
          }}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          Start chat
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function PaywallOverlay() {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] z-40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4 text-2xl">
          🔒
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2">
          You've used your 2 free questions
        </h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Get unlimited pet health answers, 24/7 support, and advice
          personalized to your pet for just $4.99/month.
        </p>
        <a
          href={STRIPE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3.5 rounded-2xl text-sm hover:opacity-95 transition-opacity"
        >
          Unlock unlimited answers — $4.99/month
        </a>
        <p className="text-xs text-slate-400 mt-3">
          Cancel anytime. No commitment.
        </p>
      </div>
    </div>
  );
}

export default function Chat() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageToSend, setImageToSend] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [petProfile, setPetProfile] = useState<PetProfile | null>(() => {
    try {
      const raw = localStorage.getItem(PET_PROFILE_KEY);
      if (!raw || raw === "null") return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem(PET_PROFILE_KEY);
    } catch {
      return true;
    }
  });

  const [isSubscribed] = useState(() => {
    try {
      return localStorage.getItem(SUBSCRIBED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [freeCount, setFreeCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem(FREE_COUNT_KEY) || "0", 10);
    } catch {
      return 0;
    }
  });

  const [showPaywall, setShowPaywall] = useState(false);

  const { data: conversations = [] } = useListOpenaiConversations();
  const { data: activeConversation } = useGetOpenaiConversation(
    activeConversationId ?? 0,
    {
      query: {
        enabled: !!activeConversationId,
        queryKey: getGetOpenaiConversationQueryKey(activeConversationId ?? 0),
      },
    }
  );
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  useEffect(() => {
    if (activeConversation?.messages) {
      setLocalMessages(
        activeConversation.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          id: m.id,
        }))
      );
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isStreaming]);

  const savePetProfile = (profile: PetProfile) => {
    setPetProfile(profile);
    setShowOnboarding(false);
    localStorage.setItem(PET_PROFILE_KEY, JSON.stringify(profile));
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(PET_PROFILE_KEY, "skipped");
  };

  const startNewConversation = useCallback(
    async (firstMessage?: string) => {
      const title = firstMessage
        ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "..." : "")
        : "New conversation";
      const newConv = await createConversation.mutateAsync({
        data: { title },
      });
      setActiveConversationId(newConv.id);
      setLocalMessages([]);
      queryClient.invalidateQueries({
        queryKey: getListOpenaiConversationsQueryKey(),
      });
      setSidebarOpen(false);
      return newConv.id;
    },
    [createConversation, queryClient]
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageToSend({ url, name: file.name });
    e.target.value = "";
  };

  const sendMessage = useCallback(
    async (content: string) => {
      const hasImage = !!imageToSend;
      const trimmedContent = content.trim();
      if (!trimmedContent && !hasImage) return;
      if (isStreaming) return;

      if (!isSubscribed && freeCount >= FREE_LIMIT) {
        setShowPaywall(true);
        return;
      }

      const isFirstMsg = localMessages.length === 0;
      let convId = activeConversationId;

      if (!convId) {
        convId = await startNewConversation(
          trimmedContent || "Image question"
        );
      }

      let apiContent = trimmedContent;
      if (hasImage) {
        apiContent = `[Image of pet shared: ${imageToSend!.name}]\n\n${trimmedContent || "Please analyze this image and give me your best advice about my pet."}`;
      }
      if (
        isFirstMsg &&
        petProfile &&
        (petProfile.petType || petProfile.age || petProfile.concern)
      ) {
        const petDesc = [petProfile.age, petProfile.petType]
          .filter(Boolean)
          .join(" ");
        const ctx = `[Pet profile: ${petDesc || "pet"}${petProfile.concern ? `. Concern: ${petProfile.concern}` : ""}]\n\n`;
        apiContent = ctx + apiContent;
      }

      const displayContent = hasImage
        ? trimmedContent || "Shared a photo"
        : trimmedContent;
      const userMessage: Message = {
        role: "user",
        content: displayContent,
        imageUrl: hasImage ? imageToSend!.url : undefined,
      };
      setLocalMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      if (hasImage) setImageToSend(null);
      setIsStreaming(true);
      setLocalMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      if (!isSubscribed) {
        const newCount = freeCount + 1;
        setFreeCount(newCount);
        localStorage.setItem(FREE_COUNT_KEY, String(newCount));
      }

      try {
        const response = await fetch(
          `/api/openai/conversations/${convId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: apiContent }),
          }
        );

        if (!response.ok)
          throw new Error(`Request failed: ${response.status}`);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
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
                  setLocalMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: last.content + data.content,
                      };
                    }
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      } catch {
        setLocalMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            updated[updated.length - 1] = {
              ...last,
              content: "Sorry, something went wrong. Please try again.",
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        queryClient.invalidateQueries({
          queryKey: getGetOpenaiConversationQueryKey(convId!),
        });
      }
    },
    [
      activeConversationId,
      isStreaming,
      startNewConversation,
      queryClient,
      imageToSend,
      petProfile,
      isSubscribed,
      freeCount,
      localMessages,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleDeleteConversation = async (
    id: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({
      queryKey: getListOpenaiConversationsQueryKey(),
    });
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setLocalMessages([]);
    }
  };

  const selectConversation = (id: number) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
  };

  const lastMsg = localMessages[localMessages.length - 1];
  const showQuickReplies =
    lastMsg?.role === "assistant" && !isStreaming && !!lastMsg?.content;

  const freeLeft = Math.max(0, FREE_LIMIT - freeCount);

  return (
    <div className="h-screen flex overflow-hidden bg-background relative">
      {showPaywall && <PaywallOverlay />}

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed sm:relative z-30 sm:z-auto h-full w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src="/app-logo.png"
                alt=""
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.42)", transformOrigin: "center" }}
              />
            </div>
            <span className="font-black text-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
              Paw And Whisker
            </span>
          </Link>
          <button
            onClick={() => {
              setActiveConversationId(null);
              setLocalMessages([]);
              setSidebarOpen(false);
              if (petProfile) setShowOnboarding(false);
              else setShowOnboarding(true);
            }}
            className="w-full flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold px-3 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New conversation
          </button>
        </div>

        {petProfile && (petProfile.petType || petProfile.age) && (
          <div className="mx-3 mt-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl">
            <p className="text-xs font-semibold text-purple-700">
              {[petProfile.age, petProfile.petType].filter(Boolean).join(" ")}
            </p>
            {petProfile.concern && (
              <p className="text-xs text-purple-400 truncate">
                {petProfile.concern}
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 mt-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-3">
              No conversations yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    activeConversationId === conv.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-sidebar-accent text-sidebar-foreground"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-xs">
                      {conv.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conv.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <button
            className="sm:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="sm:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <img
                src="/app-logo.png"
                alt=""
                className="w-full h-full object-cover"
                style={{ transform: "scale(1.42)", transformOrigin: "center" }}
              />
            </div>
            <span className="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
              Paw And Whisker
            </span>
          </div>
          <div className="hidden sm:block text-sm text-muted-foreground font-medium">
            {activeConversation?.title ?? "New conversation"}
          </div>
          {!isSubscribed ? (
            <div
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                freeLeft === 0
                  ? "bg-red-50 text-red-500 border border-red-200"
                  : "bg-purple-50 text-purple-600 border border-purple-100"
              }`}
            >
              {freeLeft === 0
                ? "Free limit reached"
                : `${freeLeft} free ${freeLeft === 1 ? "question" : "questions"} left`}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          {localMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6 py-10">
              {showOnboarding && (
                <PetOnboardingCard
                  onSave={savePetProfile}
                  onSkip={skipOnboarding}
                />
              )}
              {!showOnboarding && (
                <>
                  <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 border border-purple-100">
                    <img
                      src="/app-logo.png"
                      alt="Paw And Whisker"
                      className="w-full h-full object-cover"
                      style={{
                        transform: "scale(1.42)",
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                  <h2 className="text-xl font-black mb-2 text-center text-slate-800">
                    {petProfile?.petType
                      ? `Ask about your ${petProfile.petType}`
                      : "How can I help your pet today?"}
                  </h2>
                  <p className="text-muted-foreground text-center mb-6 max-w-sm text-sm font-medium">
                    Ask me anything about your pet's health, behavior, diet, or
                    daily care.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 max-w-xl w-full">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-left text-sm px-4 py-3 rounded-2xl border border-purple-100 bg-white hover:bg-purple-50 hover:border-purple-300 transition-all text-slate-700 font-medium shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
              {localMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {msg.role === "assistant" ? (
                      <LogoAvatar />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-100 flex items-center justify-center text-sm flex-shrink-0">
                        😊
                      </div>
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-tr-sm"
                        : "bg-white border border-slate-100 text-foreground rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="p-2 pb-1">
                        <img
                          src={msg.imageUrl}
                          alt="Pet photo"
                          className="w-full max-w-xs rounded-xl object-cover max-h-48"
                        />
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 ${msg.imageUrl ? "pt-1.5" : ""}`}
                    >
                      {msg.role === "user" ? (
                        <span className="whitespace-pre-wrap">
                          {msg.content}
                        </span>
                      ) : (
                        <MarkdownMessage content={msg.content} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isStreaming &&
                localMessages[localMessages.length - 1]?.content === "" && (
                  <div className="flex gap-3">
                    <LogoAvatar />
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}

              {showQuickReplies && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 hover:border-purple-300 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {imageToSend && (
          <div className="px-4 pt-3 max-w-3xl mx-auto w-full">
            <div className="relative inline-block">
              <img
                src={imageToSend.url}
                alt="Preview"
                className="h-20 w-auto rounded-xl object-cover border border-purple-200 shadow-sm"
              />
              <button
                onClick={() => setImageToSend(null)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-slate-900 transition-colors leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-border p-4 bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-background border border-border rounded-xl shadow-sm focus-within:border-primary/50 transition-colors p-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                title="Upload pet photo"
                className="flex-shrink-0 w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-slate-700 flex items-center justify-center transition-all disabled:opacity-40"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your pet..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32 px-2 py-1.5 disabled:opacity-60"
                style={{ height: "auto", minHeight: "36px" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={(!inputValue.trim() && !imageToSend) || isStreaming}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isStreaming ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Paw &amp; Whisker AI provides guidance, not diagnosis. Always
              consult a licensed vet for serious issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
