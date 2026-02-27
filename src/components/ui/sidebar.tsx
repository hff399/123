"use client";

import { type FC } from "react";
import { Plus, Trash2, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (diff < 60_000) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

interface SidebarProps {
  conversations: ConversationMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/40 sm:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar panel */}
          <motion.aside
            key="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed left-0 top-0 z-40 flex h-full w-72 flex-col",
              "bg-[var(--sidebar)] text-[var(--sidebar-foreground)]",
              "border-r border-[var(--sidebar-border)]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-[var(--sidebar-border)]">
              <button
                onClick={onNew}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  "transition-colors hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                New Chat
              </button>

              {/* Close button - mobile only */}
              <button
                onClick={onClose}
                aria-label="Close sidebar"
                className={cn(
                  "sm:hidden flex h-8 w-8 items-center justify-center rounded-lg",
                  "transition-colors hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation list */}
            <nav className="flex-1 overflow-y-auto py-2">
              {conversations.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-[var(--sidebar-foreground)] opacity-40">
                  No conversations yet
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5 px-2">
                  {conversations.map((conv) => (
                    <li key={conv.id}>
                      <button
                        onClick={() => onSelect(conv.id)}
                        className={cn(
                          "group/item relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                          "transition-colors hover:bg-[var(--sidebar-accent)]",
                          activeId === conv.id
                            ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                            : "text-[var(--sidebar-foreground)]"
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />

                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate leading-snug">{conv.title}</span>
                          <span className="text-[11px] opacity-40 leading-tight">
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </div>

                        {/* Delete button - appears on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(conv.id);
                          }}
                          aria-label="Delete conversation"
                          className={cn(
                            "shrink-0 flex h-6 w-6 items-center justify-center rounded-md",
                            "opacity-0 group-hover/item:opacity-100 transition-opacity",
                            "hover:bg-[var(--sidebar-border)] hover:text-[var(--sidebar-accent-foreground)]"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
