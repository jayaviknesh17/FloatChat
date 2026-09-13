"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage, ArgoFloat } from "@/lib/types";
import UserMessage from "./UserMessage";
import FloatChatMessage from "./FloatChatMessage";
import HomeGreeting from "./HomeGreeting";
import { Loader2 } from "lucide-react";

interface ChatContainerProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSelectQuery: (queryText: string) => void;
  onSelectFloat: (argoFloat: ArgoFloat) => void;
  onOpenEvidence: (argoFloat: ArgoFloat) => void;
}

export default function ChatContainer({
  messages,
  isLoading,
  onSelectQuery,
  onSelectFloat,
  onOpenEvidence,
}: ChatContainerProps) {
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message when messages change or loading starts
  useEffect(() => {
    if (messages.length > 0) {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 scrollbar-thin scrollbar-thumb-cyan-500/20">
      {messages.length === 0 ? (
        /* Empty / New Chat Initial Greeting Screen */
        <div className="min-h-full flex items-center justify-center py-6">
          <HomeGreeting onSelectQuery={onSelectQuery} />
        </div>
      ) : (
        /* Active Conversation Message Stream */
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {messages.map((msg) => {
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
              return (
                <FloatChatMessage
                  key={msg.id}
                  result={msg.result}
                  onSelectFloat={onSelectFloat}
                  onOpenEvidence={onOpenEvidence}
                />
              );
            }

            return null;
          })}

          {/* Loading Indicator when Query is being analyzed */}
          {isLoading && (
            <div className="flex items-center gap-3 my-4 pr-8 max-w-4xl mx-auto select-none animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shrink-0">
                <div className="w-full h-full bg-[#051428] rounded-[9px] flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#061c38]/70 border border-cyan-500/20 text-xs text-cyan-300 font-mono-sci flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Querying ARGO Core profiling telemetry & TEOS-10 data...</span>
              </div>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>
      )}
    </div>
  );
}
