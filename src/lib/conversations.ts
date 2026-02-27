import type { UIMessage } from "@ai-sdk/react";

const CONVERSATIONS_KEY = "relocation-conversations";
const FEEDBACK_KEY = "relocation-chat-feedback";

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type Conversation = ConversationMeta & {
  messages: UIMessage[];
};

function convMessagesKey(id: string): string {
  return `relocation-conv-${id}`;
}

export function getConversations(): ConversationMeta[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ConversationMeta[];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getConversation(id: string): Conversation | null {
  try {
    const metas = getConversations();
    const meta = metas.find((m) => m.id === id);
    if (!meta) return null;
    const raw = localStorage.getItem(convMessagesKey(id));
    const messages: UIMessage[] = raw ? (JSON.parse(raw) as UIMessage[]) : [];
    return { ...meta, messages };
  } catch {
    return null;
  }
}

export function saveConversation(conversation: Conversation): void {
  try {
    localStorage.setItem(
      convMessagesKey(conversation.id),
      JSON.stringify(conversation.messages)
    );
    const metas = getConversations();
    const idx = metas.findIndex((m) => m.id === conversation.id);
    const meta: ConversationMeta = {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
    if (idx >= 0) {
      metas[idx] = meta;
    } else {
      metas.push(meta);
    }
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(metas));
  } catch {
    // localStorage unavailable or quota exceeded — silently ignore
  }
}

export function deleteConversation(id: string): void {
  try {
    localStorage.removeItem(convMessagesKey(id));
    const metas = getConversations().filter((m) => m.id !== id);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(metas));
  } catch {
    // silently ignore
  }
}

export function createConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New Chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateConversationTitle(id: string, title: string): void {
  try {
    const metas = getConversations();
    const idx = metas.findIndex((m) => m.id === id);
    if (idx < 0) return;
    metas[idx] = { ...metas[idx], title, updatedAt: Date.now() };
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(metas));
  } catch {
    // silently ignore
  }
}

export function saveFeedback(
  feedback: Record<string, "like" | "dislike">
): void {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
  } catch {
    // silently ignore
  }
}

export function loadFeedback(): Record<string, "like" | "dislike"> {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, "like" | "dislike">;
  } catch {
    return {};
  }
}
