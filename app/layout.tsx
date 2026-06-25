import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pollux Astro — Tarot & Spiritüel Rehberlik",
  description: "Evrenin aynasında kendini keşfet. Kişisel tarot okumaları, Lyra ile AI rehberlik ve derin spiritüel yolculuklar.",
  keywords: ["tarot", "astroloji", "kehanet", "günlük kart", "spiritüel"],
  authors: [{ name: "Pollux Astro" }],
  openGraph: {
    title: "Pollux Astro — Tarot & Kehanet",
    description: "Evrenin aynasında kendini keşfet.",
    type: "website",
    locale: "tr_TR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0A1E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${cormorant.variable} ${inter.variable} h-full`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
