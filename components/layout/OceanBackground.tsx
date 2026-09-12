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

    // Marine snow particles
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.5,
      speedY: Math.random() * 0.4 + 0.15,
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    // Soft drifting fish silhouettes
    const fish = Array.from({ length: 9 }, (_, i) => ({
      x: Math.random() * width,
      y: height * 0.15 + Math.random() * (height * 0.55),
      speed: (Math.random() * 0.4 + 0.2) * (i % 2 === 0 ? 1 : -0.8),
      size: Math.random() * 14 + 10,
      opacity: Math.random() * 0.18 + 0.08,
      wobble: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render marine snow / plankton particles
      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y > height) {
          p.y = -5;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(103, 232, 249, ${p.opacity})`;
        ctx.fill();
      }

      // Render drifting fish silhouettes
      for (const f of fish) {
        f.x += f.speed;
        f.wobble += 0.03;
        const currentY = f.y + Math.sin(f.wobble) * 4;

        if (f.speed > 0 && f.x > width + 50) f.x = -50;
        if (f.speed < 0 && f.x < -50) f.x = width + 50;

        ctx.save();
        ctx.translate(f.x, currentY);
        if (f.speed < 0) ctx.scale(-1, 1);

        ctx.fillStyle = `rgba(3, 16, 36, ${f.opacity})`;
        ctx.beginPath();
        // Fish body
        ctx.ellipse(0, 0, f.size, f.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fish tail
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.8, 0);
        ctx.lineTo(-f.size * 1.35, -f.size * 0.4);
        ctx.lineTo(-f.size * 1.35, f.size * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
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
      {/* Deep Ocean Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020817] via-[#04162e] to-[#020712]" />

      {/* Sunbeam Caustics from Ocean Surface */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(34,211,238,0.2)_0%,rgba(6,182,212,0.08)_40%,transparent_75%)] opacity-80" />

      {/* Angular Light Shafts */}
      <div className="absolute top-0 left-1/4 w-96 h-[80vh] bg-gradient-to-b from-cyan-400/15 via-sky-500/5 to-transparent transform -rotate-12 blur-3xl opacity-60" />
      <div className="absolute top-0 right-1/3 w-80 h-[70vh] bg-gradient-to-b from-cyan-300/10 via-sky-600/5 to-transparent transform rotate-6 blur-2xl opacity-50" />

      {/* Animated Canvas for Marine Particles & Fish */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />

      {/* Underwater Coral Reef Seabed Silhouette at the Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-48 sm:h-64 opacity-50 pointer-events-none">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1440 320"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0,288L24,272C48,256,96,224,144,218.7C192,213,240,235,288,245.3C336,256,384,256,432,240C480,224,528,192,576,192C624,192,672,224,720,234.7C768,245,816,235,864,208C912,181,960,139,1008,138.7C1056,139,1104,181,1152,197.3C1200,213,1248,203,1296,202.7C1344,203,1392,213,1416,218.7L1440,224L1440,320L0,320Z"
            fill="#010610"
          />
          <path
            d="M0,300 C200,280 400,310 600,285 C800,260 1000,295 1200,270 C1350,250 1400,280 1440,290 L1440,320 L0,320 Z"
            fill="#020917"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* ARGO Profiling Float Floating Graphic on Right Side (Exact Match with Reference Image) */}
      <div className="hidden lg:block absolute right-8 xl:right-16 top-28 xl:top-36 w-60 xl:w-72 z-10 pointer-events-none opacity-90 transition-transform duration-700 hover:scale-105">
        <div className="relative animate-float-gentle flex flex-col items-center">
          {/* Subtle Hydrodynamic Light Glow */}
          <div className="absolute -inset-6 bg-cyan-400/15 rounded-full blur-2xl -z-10" />

          {/* ARGO Float SVG Illustration */}
          <svg
            viewBox="0 0 160 480"
            className="w-36 xl:w-44 h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] filter"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Top Antenna / Communications Mast */}
            <line x1="80" y1="20" x2="80" y2="85" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            <circle cx="80" cy="18" r="4" fill="#38bdf8" className="animate-ping opacity-75" />
            <circle cx="80" cy="18" r="3" fill="#22d3ee" />
            <path d="M74 35 L86 35 M76 50 L84 50" stroke="#64748b" strokeWidth="2" />

            {/* CTD Sensor Head / Temperature & Salinity Sensor */}
            <rect x="70" y="85" width="20" height="22" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="80" cy="96" r="3" fill="#38bdf8" />

            {/* Float Cap & Collar */}
            <path d="M62 107 H98 L94 130 H66 Z" fill="#334155" stroke="#475569" strokeWidth="1.5" />

            {/* Main Aluminum Pressure Hull Body (High-Visibility ARGO Ocean Yellow) */}
            <defs>
              <linearGradient id="argoHull" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#854d0e" />
                <stop offset="25%" stopColor="#ca8a04" />
                <stop offset="60%" stopColor="#eab308" />
                <stop offset="85%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#713f12" />
              </linearGradient>
              <linearGradient id="argoBlackRing" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#091424" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#091424" />
              </linearGradient>
            </defs>

            {/* Main Yellow Cylinder */}
            <rect x="58" y="130" width="44" height="200" rx="8" fill="url(#argoHull)" />

            {/* Top Hull Highlight */}
            <rect x="64" y="130" width="8" height="200" fill="rgba(255,255,255,0.25)" />

            {/* Bold ARGO Stencil Text on Hull */}
            <g transform="translate(80, 230) rotate(90)">
              <text
                x="0"
                y="6"
                fill="#0f172a"
                fontSize="22"
                fontWeight="900"
                fontFamily="system-ui, sans-serif"
                letterSpacing="3"
                textAnchor="middle"
                opacity="0.9"
              >
                ARGO
              </text>
            </g>

            {/* Middle and Lower Reinforcement Rings */}
            <rect x="56" y="270" width="48" height="12" rx="2" fill="url(#argoBlackRing)" stroke="#38bdf8" strokeWidth="0.8" />
            <rect x="56" y="325" width="48" height="12" rx="2" fill="url(#argoBlackRing)" stroke="#38bdf8" strokeWidth="0.8" />

            {/* Lower External Bladder Section */}
            <path d="M60 337 Q80 375 100 337 Z" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />

            {/* Bottom Stability Weights & Oil Reservoir */}
            <rect x="74" y="365" width="12" height="40" rx="4" fill="#475569" />
            <circle cx="80" cy="405" r="7" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />

            {/* Subtle Scientific Measurement Axis Ticks */}
            <line x1="102" y1="150" x2="108" y2="150" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="102" y1="180" x2="106" y2="180" stroke="#38bdf8" strokeWidth="1" />
            <line x1="102" y1="210" x2="108" y2="210" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="102" y1="240" x2="106" y2="240" stroke="#38bdf8" strokeWidth="1" />
            <line x1="102" y1="270" x2="108" y2="270" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="102" y1="300" x2="106" y2="300" stroke="#38bdf8" strokeWidth="1" />
          </svg>

          {/* Elegant Reference Image Tagline in Cursive / Handcrafted Font */}
          <div className="mt-4 text-center select-none">
            <span
              className="text-cyan-200/90 text-lg xl:text-xl italic font-serif tracking-wide block drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              style={{
                fontFamily: "Georgia, 'Playfair Display', serif",
                textShadow: "0 0 12px rgba(34, 211, 238, 0.4)",
              }}
            >
              Deeper Data
            </span>
            <span
              className="text-cyan-300/90 text-xl xl:text-2xl italic font-serif tracking-wide block -mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              style={{
                fontFamily: "Georgia, 'Playfair Display', serif",
                textShadow: "0 0 16px rgba(34, 211, 238, 0.5)",
              }}
            >
              Brighter Tomorrows
            </span>
          </div>
        </div>
      </div>

      {/* Dark Oceanic Edge Vignette */}
      <div className="absolute inset-0 ocean-vignette" />
    </div>
  );
}
