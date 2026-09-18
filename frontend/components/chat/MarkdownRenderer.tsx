"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
  * Parses inline markdown elements: **bold**, *italic*, `code`
  */
function renderInlineText(text: string): React.ReactNode[] {
  // Regex matches **bold**, *italic*, `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-cyan-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  // Split by double newline or single newline to process blocks
  const blocks = content.split(/\n\n+/);

  return (
    <div className={`space-y-3 leading-relaxed text-sm text-slate-100 ${className}`}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Fenced code block check
        if (trimmed.startsWith("```")) {
          const lines = trimmed.split("\n");
          const codeContent = lines.slice(1, lines.length - (lines[lines.length - 1].startsWith("```") ? 1 : 0)).join("\n");
          return (
            <pre
              key={bIdx}
              className="p-3 my-2 rounded-xl bg-[#030d1e] border border-cyan-500/25 overflow-x-auto text-xs font-mono text-cyan-200"
            >
              <code>{codeContent}</code>
            </pre>
          );
        }

        // Headings check
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={bIdx} className="text-base font-bold text-white tracking-tight mt-3 mb-1 text-cyan-200">
              {renderInlineText(trimmed.replace(/^###\s+/, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={bIdx} className="text-lg font-bold text-white tracking-tight mt-3 mb-1">
              {renderInlineText(trimmed.replace(/^##\s+/, ""))}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={bIdx} className="text-xl font-extrabold text-white tracking-tight mt-4 mb-2">
              {renderInlineText(trimmed.replace(/^#\s+/, ""))}
            </h1>
          );
        }

        // Check for list items
        const lines = trimmed.split("\n");
        const isBulletList = lines.every((line) => /^\s*[\-\*]\s+/.test(line));
        const isNumberedList = lines.every((line) => /^\s*\d+\.\s+/.test(line));

        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-1.5 pl-4 list-disc marker:text-cyan-400">
              {lines.map((line, lIdx) => {
                const itemText = line.replace(/^\s*[\-\*]\s+/, "");
                return <li key={lIdx}>{renderInlineText(itemText)}</li>;
              })}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={bIdx} className="space-y-1.5 pl-4 list-decimal marker:text-cyan-400 font-medium">
              {lines.map((line, lIdx) => {
                const itemText = line.replace(/^\s*\d+\.\s+/, "");
                return <li key={lIdx}>{renderInlineText(itemText)}</li>;
              })}
            </ol>
          );
        }

        // Mixed block or paragraphs with line breaks
        return (
          <p key={bIdx}>
            {lines.map((line, lIdx) => {
              // Bullet item inside paragraph
              if (/^\s*[\-\*]\s+/.test(line)) {
                return (
                  <span key={lIdx} className="block pl-4 my-0.5 relative before:content-['•'] before:absolute before:left-1 before:text-cyan-400">
                    {renderInlineText(line.replace(/^\s*[\-\*]\s+/, ""))}
                  </span>
                );
              }
              // Numbered item inside paragraph
              const numMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <span key={lIdx} className="block pl-4 my-0.5">
                    <span className="text-cyan-400 font-bold mr-1">{numMatch[1]}.</span>
                    {renderInlineText(numMatch[2])}
                  </span>
                );
              }

              return (
                <React.Fragment key={lIdx}>
                  {renderInlineText(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
