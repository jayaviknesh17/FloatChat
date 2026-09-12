import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#030a17",
};

export const metadata: Metadata = {
  title: "FloatChat — Ask. Explore. Understand. The Ocean.",
  description:
    "An AI-powered ocean intelligence platform to query, analyze, and visualize real ARGO oceanographic data using natural language and interactive 4D visualizations.",
  keywords: [
    "ARGO Float",
    "Ocean Intelligence",
    "Bay of Bengal",
    "Arabian Sea",
    "Thermocline",
    "Marine Heatwaves",
    "Ocean Salinity",
    "INCOIS",
    "CTD Profile",
    "Geospatial AI",
  ],
  authors: [{ name: "FloatChat Ocean Intelligence Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${jakarta.variable} ${mono.variable}`}>
      <body className="bg-[#030a17] text-slate-100 min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
