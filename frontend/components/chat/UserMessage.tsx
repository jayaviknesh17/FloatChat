"use client";

import React from "react";
import { User } from "lucide-react";

interface UserMessageProps {
  text: string;
  timestamp: string;
}

export default function UserMessage({ text, timestamp }: UserMessageProps) {
  return (
    <div className="flex justify-end items-start gap-3 my-4 pl-8 max-w-4xl mx-auto w-full select-text animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
        <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#0c3160] to-[#082245] border border-cyan-400/30 text-white text-sm font-normal leading-relaxed shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          {text}
        </div>
        <span className="text-[10px] text-slate-400 font-mono-sci mt-1 px-1">
          {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
        U
      </div>
    </div>
  );
}
