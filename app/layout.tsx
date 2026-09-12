import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="bg-[#030a17] text-slate-100 min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
