"use client";

import { useState, useEffect, useRef } from "react";

export function useTypewriter(fullText: string, speedMs: number = 14, animate: boolean = true) {
  const [displayedText, setDisplayedText] = useState(() => (animate ? "" : fullText));
  const [isTyping, setIsTyping] = useState(() => animate && fullText.length > 0);
  const textRef = useRef(fullText);

  useEffect(() => {
    textRef.current = fullText;
    if (!animate || !fullText) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);

    let currIdx = 0;
    const totalLength = fullText.length;
    // Step size: if text is long, reveal slightly faster
    const chunkSize = totalLength > 300 ? 3 : totalLength > 100 ? 2 : 1;

    const interval = setInterval(() => {
      currIdx = Math.min(currIdx + chunkSize, totalLength);
      setDisplayedText(textRef.current.slice(0, currIdx));

      if (currIdx >= totalLength) {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [fullText, animate, speedMs]);

  return { displayedText, isTyping };
}
