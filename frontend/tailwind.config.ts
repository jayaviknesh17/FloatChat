import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ocean: {
          950: "#020713",
          900: "#051124",
          850: "#081832",
          800: "#0b2042",
          700: "#102f5e",
          600: "#184585",
          500: "#2263b5",
        },
        cyan: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
           glow: "#00f0ff",
        },
        glass: {
          card: "rgba(7, 24, 48, 0.65)",
          cardHover: "rgba(11, 35, 68, 0.8)",
          cardActive: "rgba(14, 44, 84, 0.9)",
          border: "rgba(56, 189, 248, 0.18)",
          borderHover: "rgba(56, 189, 248, 0.4)",
          glow: "rgba(34, 211, 238, 0.15)",
        },
      },
      backgroundImage: {
        "radial-glow": "radial-gradient(circle at center, rgba(34, 211, 238, 0.15) 0%, transparent 70%)",
        "ocean-gradient": "linear-gradient(180deg, #040d1a 0%, #06172d 40%, #030a16 100%)",
        "cyan-gradient": "linear-gradient(135deg, #38bdf8 0%, #06b6d4 50%, #0284c7 100%)",
      },
      boxShadow: {
        "cyan-glow": "0 0 25px -5px rgba(34, 211, 238, 0.3)",
        "cyan-glow-lg": "0 0 40px -5px rgba(34, 211, 238, 0.45)",
        "glass-sm": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-card": "0 10px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float-gentle": "float 6s ease-in-out infinite",
        "wave-drift": "wave 12s ease-in-out infinite",
        "glow-pulse": "glow 3s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(1deg)" },
        },
        wave: {
          "0%, 100%": { transform: "translateX(0px)" },
          "50%": { transform: "translateX(15px)" },
        },
        glow: {
          "0%": { opacity: "0.4", filter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))" },
          "100%": { opacity: "0.9", filter: "drop-shadow(0 0 20px rgba(34, 211, 238, 0.8))" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
