"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "@ai-sdk/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { Menu } from "lucide-react";
import {
  getConversations,
  getConversation,
  saveConversation,
  deleteConversation,
  createConversation,
  updateConversationTitle,
  saveFeedback,
  loadFeedback,
} from "@/lib/conversations";
import type { Conversation, ConversationMeta } from "@/lib/conversations";
import { validateFile, extractText } from "@/lib/file-utils";
import { Composer } from "@/components/ui/composer";
import type { UploadedFile } from "@/components/ui/composer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sidebar } from "@/components/ui/sidebar";
import {
  AssistantMessage,
  UserMessage,
  ScrollToBottom,
} from "@/components/ui/chat-thread";

/* ------------------------------------------------------------------ */
/*  ChatView — keyed by conversation id so useChat reinitializes      */
/* ------------------------------------------------------------------ */

interface ChatViewProps {
  conversation: Conversation | null;
  feedback: Record<string, "like" | "dislike">;
  setFeedback: React.Dispatch<
    React.SetStateAction<Record<string, "like" | "dislike">>
  >;
  onMessagesChange: (messages: UIMessage[]) => void;
  onNewChat: () => void;
}

function ChatView({
  conversation,
  feedback,
  setFeedback,
  onMessagesChange,
  onNewChat,
}: ChatViewProps) {
  const { messages, sendMessage, status } = useChat({
    messages: conversation?.messages ?? [],
  });

  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";
  const prevMessagesLenRef = useRef(conversation?.messages?.length ?? 0);

  // Stable callback ref to avoid re-triggering the persist effect
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Persist messages when they change (skip mount to avoid no-op save)
  useEffect(() => {
    if (
      messages.length > 0 &&
      messages.length !== prevMessagesLenRef.current
    ) {
      prevMessagesLenRef.current = messages.length;
      onMessagesChangeRef.current(messages);
    }
  }, [messages]);

  // File selection handler
  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        continue;
      }
      try {
        const text = await extractText(file);
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: text, // extracted text stored here for later use
          },
        ]);
      } catch {
        alert("Failed to read file: " + file.name);
      }
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  };

  // Submit handler
  const onComposerSubmit = useCallback(
    (text: string) => {
      if ((!text.trim() && attachedFiles.length === 0) || isLoading) return;

      // If no conversation yet, create one first
      if (!conversation) {
        onNewChat();
        return;
      }

      // Build message with file context
      let messageText = text;
      if (attachedFiles.length > 0) {
        const fileParts = attachedFiles
          .map(
            (f) =>
              `[Attached: ${f.name}]\n<document>\n${f.url}\n</document>`,
          )
          .join("\n\n");
        messageText = fileParts + "\n\n" + text;
        setAttachedFiles([]);
      }

      sendMessage({ text: messageText });
      setInput("");
    },
    [attachedFiles, isLoading, conversation, onNewChat, sendMessage],
  );

  const hasMessages = messages.length > 0;

  // Show landing when no conversation or no messages yet
  if (!conversation || !hasMessages) {
    return (
      <>
        <main className="flex flex-1 items-center justify-center px-4">
          <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-4xl">
            How can I help with your relocation?
          </h1>
        </main>

        <div className="shrink-0 px-3 pb-2 sm:px-4 sm:pb-3">
          <div className="mx-auto w-full max-w-2xl">
            <Composer
              placeholder="Ask about work permits, visas, residence permits..."
              value={input}
              onChange={setInput}
              onSubmit={onComposerSubmit}
              onAttachClick={() => fileInputRef.current?.click()}
              attachedFiles={attachedFiles}
              onRemoveFile={(id) =>
                setAttachedFiles((prev) => prev.filter((f) => f.id !== id))
              }
              isLoading={isLoading}
              autoFocus
            />
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground sm:text-xs">
            AI-powered assistant for immigration &amp; relocation to Georgia
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </>
    );
  }

  // Chat state — messages exist
  return (
    <>
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        {/* Message thread */}
        <div className="w-full">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-0">
            {messages.map((msg, index) => {
              if (msg.role === "system") return null;

              const textParts = msg.parts.filter(
                (p): p is { type: "text"; text: string } =>
                  p.type === "text",
              );
              const text = textParts.map((p) => p.text).join("");

              const isLastAssistant =
                msg.role === "assistant" &&
                index === messages.length - 1;
              const msgIsStreaming = isLastAssistant && isLoading;

              return (
                <article key={msg.id} className="group/turn-messages">
                  {msg.role === "assistant" ? (
                    <AssistantMessage
                      id={msg.id}
                      content={text}
                      isStreaming={msgIsStreaming}
                      onCopy={(_, content) =>
                        navigator.clipboard.writeText(content)
                      }
                      feedback={feedback[msg.id] ?? null}
                      onThumbsUp={(id) =>
                        setFeedback((prev) => {
                          const next = { ...prev };
                          if (next[id] === "like") {
                            delete next[id];
                          } else {
                            next[id] = "like";
                          }
                          return next;
                        })
                      }
                      onThumbsDown={(id) =>
                        setFeedback((prev) => {
                          const next = { ...prev };
                          if (next[id] === "dislike") {
                            delete next[id];
                          } else {
                            next[id] = "dislike";
                          }
                          return next;
                        })
                      }
                    />
                  ) : (
                    <UserMessage
                      id={msg.id}
                      content={text}
                      onCopy={(_, content) =>
                        navigator.clipboard.writeText(content)
                      }
                      onEdit={(id, content) =>
                        console.log("Edit:", id, content)
                      }
                    />
                  )}
                </article>
              );
            })}
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="mx-auto flex w-full max-w-2xl px-4 pb-6 sm:px-6 lg:px-0">
            <span className="thinking-shimmer text-sm text-muted-foreground">
              Thinking
            </span>
          </div>
        )}

        {/* Scroll to bottom button */}
        <div className="pointer-events-none sticky bottom-4 left-0 right-0 flex justify-center">
          <div className="pointer-events-auto">
            <ScrollToBottom scrollRef={scrollRef} />
          </div>
        </div>
      </div>

      {/* Bottom composer */}
      <div className="relative shrink-0">
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-background to-transparent" />

        <div className="bg-background/80 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-2xl">
            <Composer
              placeholder="Ask about work permits, visas, residence permits..."
              value={input}
              onChange={setInput}
              onSubmit={onComposerSubmit}
              onAttachClick={() => fileInputRef.current?.click()}
              attachedFiles={attachedFiles}
              onRemoveFile={(id) =>
                setAttachedFiles((prev) => prev.filter((f) => f.id !== id))
              }
              isLoading={isLoading}
              autoFocus
            />
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.csv"
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Home — top-level with sidebar + conversation management           */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "like" | "dislike">>(
    () => loadFeedback(),
  );

  // Load conversations on mount
  useEffect(() => {
    const convs = getConversations();
    setConversations(convs);
    if (convs.length > 0) {
      const latest = getConversation(convs[0].id);
      if (latest) setActiveConv(latest);
    }
  }, []);

  // Persist feedback
  useEffect(() => {
    saveFeedback(feedback);
  }, [feedback]);

  const refreshConversations = useCallback(
    () => setConversations(getConversations()),
    [],
  );

  const handleNewChat = useCallback(() => {
    const conv = createConversation();
    saveConversation(conv);
    setActiveConv(conv);
    refreshConversations();
    setSidebarOpen(false);
  }, [refreshConversations]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      const conv = getConversation(id);
      if (conv) setActiveConv(conv);
      setSidebarOpen(false);
    },
    [],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      refreshConversations();
      // If we deleted the active conversation, pick the next one (or null)
      setActiveConv((prev) => {
        if (prev?.id !== id) return prev;
        const remaining = getConversations();
        if (remaining.length > 0) {
          return getConversation(remaining[0].id);
        }
        return null;
      });
    },
    [refreshConversations],
  );

  const handleMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      setActiveConv((prev) => {
        if (!prev) return prev;

        // Auto-title from first user message
        let title = prev.title;
        if (title === "New Chat" && messages.length > 0) {
          const firstUser = messages.find((m) => m.role === "user");
          if (firstUser) {
            const textParts = firstUser.parts.filter(
              (p): p is { type: "text"; text: string } => p.type === "text",
            );
            const text = textParts.map((p) => p.text).join("");
            if (text) {
              title = text.slice(0, 50) + (text.length > 50 ? "..." : "");
              updateConversationTitle(prev.id, title);
            }
          }
        }

        const updated: Conversation = {
          ...prev,
          messages,
          title,
          updatedAt: Date.now(),
        };
        saveConversation(updated);
        refreshConversations();
        return updated;
      });
    },
    [refreshConversations],
  );

  return (
    <div className="flex h-svh flex-col bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeConv?.id ?? null}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Top bar with hamburger */}
      <header className="flex shrink-0 items-center justify-between px-3 py-2 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground sm:h-8 sm:w-8">
            <span className="text-xs font-bold text-background sm:text-sm">
              R
            </span>
          </div>
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            relocation.ge
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Chat view — keyed by conversation id for clean remount */}
      <ChatView
        key={activeConv?.id ?? "empty"}
        conversation={activeConv}
        feedback={feedback}
        setFeedback={setFeedback}
        onMessagesChange={handleMessagesChange}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
