import { useState, useRef, useEffect, useCallback } from "react";
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

type Message = {
  role: "user" | "assistant";
  content: string;
  id?: number;
};

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
          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  "Why is my cat scratching the furniture?",
  "What foods are toxic to dogs?",
  "How do I travel with my pet safely?",
  "My rabbit stopped eating — what should I do?",
];

export default function Chat() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useListOpenaiConversations();
  const { data: activeConversation } = useGetOpenaiConversation(
    activeConversationId ?? 0,
    { query: { enabled: !!activeConversationId } }
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

  const startNewConversation = useCallback(async (firstMessage?: string) => {
    const title = firstMessage
      ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "..." : "")
      : "New conversation";

    const newConv = await createConversation.mutateAsync({ title });
    setActiveConversationId(newConv.id);
    setLocalMessages([]);
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    setSidebarOpen(false);
    return newConv.id;
  }, [createConversation, queryClient]);

  const sendMessage = useCallback(async (content: string, conversationId?: number) => {
    if (!content.trim() || isStreaming) return;

    let convId = conversationId ?? activeConversationId;

    if (!convId) {
      convId = await startNewConversation(content);
    }

    const userMessage: Message = { role: "user", content };
    setLocalMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setLocalMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

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
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
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
      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(convId!) });
    }
  }, [activeConversationId, isStreaming, startNewConversation, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setLocalMessages([]);
    }
  };

  const selectConversation = (id: number) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
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
          <Link href="/" className="flex items-center gap-2 mb-4">
            <span className="text-xl">🐾</span>
            <span className="font-semibold tracking-tight">Paw & Whisker AI</span>
          </Link>
          <button
            onClick={() => { setActiveConversationId(null); setLocalMessages([]); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-3">No conversations yet</p>
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
                    <p className="truncate font-medium text-xs">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(conv.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="sm:hidden flex items-center gap-2">
            <span className="text-lg">🐾</span>
            <span className="font-semibold text-sm">Paw & Whisker AI</span>
          </div>
          <div className="hidden sm:block text-sm text-muted-foreground">
            {activeConversation?.title ?? "New conversation"}
          </div>
          <div className="w-8" />
        </header>

        <div className="flex-1 overflow-y-auto">
          {localMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-5 border border-primary/25">
                <span className="text-3xl">🐾</span>
              </div>
              <h2 className="text-xl font-bold mb-2 text-center">How can I help your pet today?</h2>
              <p className="text-muted-foreground text-center mb-8 max-w-sm">
                Ask me anything about your pet's health, behavior, diet, or daily care.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-xl w-full">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary/60 hover:border-primary/30 transition-all text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {localMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm ${
                      msg.role === "assistant"
                        ? "bg-primary/15 border border-primary/25"
                        : "bg-secondary border border-border"
                    }`}
                  >
                    {msg.role === "assistant" ? "🐾" : "😊"}
                  </div>
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-card-border text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isStreaming && localMessages[localMessages.length - 1]?.content === "" && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-sm">
                    🐾
                  </div>
                  <div className="bg-card border border-card-border rounded-2xl rounded-tl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-background border border-border rounded-xl shadow-sm focus-within:border-primary/50 transition-colors p-2">
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
                disabled={!inputValue.trim() || isStreaming}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isStreaming ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Not a substitute for veterinary care. In emergencies, always contact your vet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
