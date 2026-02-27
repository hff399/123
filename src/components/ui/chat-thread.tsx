"use client";

import { useState, useEffect, type FC, type ReactNode } from "react";
import { Copy, ThumbsUp, ThumbsDown, Share2, ChevronDown, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { MessageResponse } from "@/components/ai-elements/message";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AssistantMessageProps {
  id: string;
  content: string;
  isStreaming?: boolean;
  onCopy?: (messageId: string, content: string) => void;
  onThumbsUp?: (messageId: string) => void;
  onThumbsDown?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  children?: ReactNode;
  feedback?: "like" | "dislike" | null;
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
  id,
  content,
  isStreaming = false,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onShare,
  children,
  feedback,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(id, content);
    } else {
      navigator.clipboard.writeText(content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Message content - full width, markdown rendered */}
      <div className="prose-chat text-base leading-relaxed text-foreground">
        <MessageResponse>{content}</MessageResponse>
      </div>

      {/* Inline children (e.g. tool results) */}
      {children}

      {/* Action bar - visible on touch, hover-reveal on desktop */}
      <div className="flex items-center gap-1 sm:opacity-0 transition-opacity duration-200 sm:group-hover/turn-messages:opacity-100 sm:group-focus-within/turn-messages:opacity-100">
        <ActionButton
          onClick={handleCopy}
          icon={copied ? Check : Copy}
          label={copied ? "Copied" : "Copy"}
        />
        <ActionButton
          onClick={() => onThumbsUp?.(id)}
          icon={ThumbsUp}
          label="Good response"
          active={feedback === "like"}
        />
        <ActionButton
          onClick={() => onThumbsDown?.(id)}
          icon={ThumbsDown}
          label="Bad response"
          active={feedback === "dislike"}
        />
        {onShare && (
          <ActionButton
            onClick={() => onShare(id)}
            icon={Share2}
            label="Share"
          />
        )}
      </div>
    </div>
  );
};

interface UserMessageProps {
  id: string;
  content: string;
  onCopy?: (messageId: string, content: string) => void;
  onEdit?: (messageId: string, currentContent: string) => void;
}

export const UserMessage: FC<UserMessageProps> = ({
  id,
  content,
  onCopy,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(id, content);
    } else {
      navigator.clipboard.writeText(content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start justify-end gap-2 pt-4">
      {/* Action buttons - left of message on hover */}
      <div className="flex items-center gap-1 sm:opacity-0 transition-opacity duration-200 sm:group-hover/turn-messages:opacity-100 sm:group-focus-within/turn-messages:opacity-100 pt-2">
        <ActionButton
          onClick={handleCopy}
          icon={copied ? Check : Copy}
          label={copied ? "Copied" : "Copy"}
          size="sm"
        />
        {onEdit && (
          <ActionButton
            onClick={() => onEdit(id, content)}
            icon={Pencil}
            label="Edit"
            size="sm"
          />
        )}
      </div>

      {/* User message bubble */}
      <div
        className="max-w-[85%] sm:max-w-[70%] rounded-[20px] bg-foreground px-4 py-3 text-base leading-relaxed text-background whitespace-pre-wrap"
      >
        {content}
      </div>
    </div>
  );
};

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  size?: "sm" | "md";
  active?: boolean;
}

export const ActionButton: FC<ActionButtonProps> = ({ onClick, icon: Icon, label, size = "md", active }) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors",
        active
          ? "text-foreground bg-secondary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        size === "sm" ? "h-7 w-7" : "h-8 w-8"
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
    </button>
  );
};

interface ScrollToBottomProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const ScrollToBottom: FC<ScrollToBottomProps> = ({ scrollRef, className }) => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowButton(!isNearBottom);
    };

    scrollElement.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {showButton && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToBottom}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-lg transition-colors hover:bg-secondary",
            className
          )}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
