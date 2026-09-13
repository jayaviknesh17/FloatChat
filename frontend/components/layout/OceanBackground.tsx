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

    // Subtle gentle marine snow / ambient micro-particles
    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.3,
      speedY: -(Math.random() * 0.25 + 0.08),
      speedX: (Math.random() - 0.5) * 0.1,
      opacity: Math.random() * 0.35 + 0.1,
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
      {/* Exact Photographic Deep Ocean Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/ocean-background.jpg')",
          backgroundPosition: "center center",
        }}
      />

      {/* Soft Localized Radial Contrast Treatment Centered around Hero (No Global Darkening) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 65% 50% at 50% 32%, rgba(2, 10, 24, 0.42) 0%, rgba(2, 10, 24, 0.18) 45%, transparent 75%)",
        }}
      />

      {/* Animated Subtle Ambient Marine Particles Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-35" />

      {/* Cursive Tagline on Lower Right Side (Exact Match with Reference Image) */}
      <div className="hidden lg:block absolute right-8 xl:right-12 bottom-20 xl:bottom-24 select-none pointer-events-none z-10 text-right">
        <span
          className="text-cyan-100 text-2xl xl:text-3xl italic block font-serif tracking-normal leading-none"
          style={{
            fontFamily: "'Brush Script MT', 'Segoe Script', 'Caveat', 'Playfair Display', Georgia, cursive, serif",
            textShadow: "0 0 16px rgba(34, 211, 238, 0.7), 0 2px 6px rgba(0,0,0,0.8)",
          }}
        >
          Deeper
        </span>
        <span
          className="text-cyan-100 text-2xl xl:text-3xl italic block font-serif tracking-normal leading-tight -mt-0.5"
          style={{
            fontFamily: "'Brush Script MT', 'Segoe Script', 'Caveat', 'Playfair Display', Georgia, cursive, serif",
            textShadow: "0 0 16px rgba(34, 211, 238, 0.7), 0 2px 6px rgba(0,0,0,0.8)",
          }}
        >
          Data
        </span>
        <span
          className="text-cyan-200 text-3xl xl:text-4xl italic block font-serif tracking-normal leading-tight -mt-0.5"
          style={{
            fontFamily: "'Brush Script MT', 'Segoe Script', 'Caveat', 'Playfair Display', Georgia, cursive, serif",
            textShadow: "0 0 20px rgba(34, 211, 238, 0.8), 0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          Brighter
        </span>
        <span
          className="text-cyan-200 text-3xl xl:text-4xl italic block font-serif tracking-normal leading-tight -mt-1.5"
          style={{
            fontFamily: "'Brush Script MT', 'Segoe Script', 'Caveat', 'Playfair Display', Georgia, cursive, serif",
            textShadow: "0 0 20px rgba(34, 211, 238, 0.8), 0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          Tomorrows
        </span>
      </div>
    </div>
  );
}
