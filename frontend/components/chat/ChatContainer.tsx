"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { ChatMessage, ArgoFloat } from "@/lib/types";
import UserMessage from "./UserMessage";
import FloatChatMessage from "./FloatChatMessage";
import HomeGreeting from "./HomeGreeting";

interface ChatContainerProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSelectQuery: (queryText: string) => void;
  onSelectFloat: (argoFloat: ArgoFloat) => void;
  onOpenEvidence: (argoFloat: ArgoFloat) => void;
  onRegenerate?: (queryText: string) => void;
}

export default function ChatContainer({
  messages,
  isLoading,
  onSelectQuery,
  onSelectFloat,
  onOpenEvidence,
  onRegenerate,
}: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);

  // Track scroll position to prevent forced auto-scrolling when user scrolled up
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserAtBottomRef.current = distanceToBottom < 90;
  };

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Auto scroll when messages change or loading starts, if user is near bottom
  useEffect(() => {
    if (isUserAtBottomRef.current) {
      scrollToBottom(true);
    }
  }, [messages, isLoading, scrollToBottom]);

  const handleTypewriterUpdate = useCallback(() => {
    if (isUserAtBottomRef.current) {
      scrollToBottom(false);
    }
  }, [scrollToBottom]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 scrollbar-thin scrollbar-thumb-cyan-500/20"
    >
      {messages.length === 0 ? (
        /* Empty / New Chat Initial Greeting Screen */
        <div className="min-h-full flex items-center justify-center py-6">
          <HomeGreeting onSelectQuery={onSelectQuery} />
        </div>
      ) : (
        /* Active Conversation Message Stream */
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {messages.map((msg, index) => {
            if (msg.sender === "user") {
              return (
                <UserMessage
                  key={msg.id}
                  text={msg.text || ""}
                  timestamp={msg.timestamp}
                />
              );
            }

            if (msg.result) {
              const isLastMessage = index === messages.length - 1;
              return (
                <FloatChatMessage
                  key={msg.id}
                  result={msg.result}
                  onSelectFloat={onSelectFloat}
                  onOpenEvidence={onOpenEvidence}
                  onRegenerate={onRegenerate}
                  isNew={isLastMessage}
                  onTypewriterUpdate={handleTypewriterUpdate}
                />
              );
            }

            return null;
          })}

          {/* Typing Indicator when Query is being analyzed */}
          {isLoading && (
            <div className="flex items-center gap-3 my-4 pr-8 max-w-4xl mx-auto select-none animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <div className="w-full h-full bg-[#051428] rounded-[9px] flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-cyan-300 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path d="M2 12c4-4 8 4 12 0" />
                    <path d="M2 17c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
                  </svg>
                </div>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-[#051833]/80 border border-cyan-500/20 text-xs text-cyan-200 flex items-center gap-2 shadow-lg">
                <span className="text-slate-300 font-medium">Analyzing ARGO telemetry</span>
                <div className="flex items-center gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>
      )}
    </div>
  );
}
