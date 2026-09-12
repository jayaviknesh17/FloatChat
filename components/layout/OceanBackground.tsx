"use client";

import React, { useEffect, useRef } from "react";

export default function OceanBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Subtle drifting marine particles / bubbles
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.8 + 0.4,
      speedY: -(Math.random() * 0.35 + 0.1),
      speedX: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.4 + 0.15,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < 0) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(103, 232, 249, ${p.opacity})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* High-Resolution Exact Photographic Deep Ocean Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/ocean-background.jpg')",
          backgroundPosition: "center 20%",
        }}
      />

      {/* Dark Navy Atmospheric Contrast Gradients for High Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030a17]/90 via-[#030a17]/55 to-[#020713]/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#020713]/40 via-transparent to-[#020713]/85" />

      {/* Subtle Sunbeam & Caustic Shimmer Overlay */}
      <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(34,211,238,0.18)_0%,transparent_70%)] opacity-70" />

      {/* Canvas for Floating Plankton & Marine Micro-Bubbles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />

      {/* Cursive Tagline on Right Side (Matching Reference Image) */}
      <div className="hidden lg:block absolute right-8 xl:right-14 bottom-32 xl:bottom-36 select-none pointer-events-none z-10 text-right">
        <span
          className="text-cyan-200/90 text-2xl xl:text-3xl italic block font-serif drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
          style={{
            fontFamily: "Georgia, 'Playfair Display', serif",
            textShadow: "0 0 15px rgba(34, 211, 238, 0.4)",
          }}
        >
          Deeper
        </span>
        <span
          className="text-cyan-200/90 text-2xl xl:text-3xl italic block font-serif -mt-1.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
          style={{
            fontFamily: "Georgia, 'Playfair Display', serif",
            textShadow: "0 0 15px rgba(34, 211, 238, 0.4)",
          }}
        >
          Data
        </span>
        <span
          className="text-cyan-300/90 text-3xl xl:text-4xl italic block font-serif -mt-1.5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          style={{
            fontFamily: "Georgia, 'Playfair Display', serif",
            textShadow: "0 0 20px rgba(34, 211, 238, 0.6)",
          }}
        >
          Brighter
        </span>
        <span
          className="text-cyan-300/90 text-3xl xl:text-4xl italic block font-serif -mt-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          style={{
            fontFamily: "Georgia, 'Playfair Display', serif",
            textShadow: "0 0 20px rgba(34, 211, 238, 0.6)",
          }}
        >
          Tomorrows
        </span>
      </div>

      {/* Edge Vignette */}
      <div className="absolute inset-0 ocean-vignette" />
    </div>
  );
}
