import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Nytka — AI meeting analyst",
  description: "Upload a meeting recording, get a transcript and AI-drafted tasks you review and approve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/*
          Nytka v2 fonts, loaded via a linked stylesheet rather than
          `next/font/google` (which causes Next.js 16 prerender failures here).
          Instrument Serif is the display/wordmark serif (and its italic accent),
          Space Grotesk is the UI body face, IBM Plex Mono is used for eyebrows,
          labels and badges (uppercase + tracked, see globals.css).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
        <style>{`
          :root {
            --font-display-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
            --font-body-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
            --font-mono-family: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
          }
        `}</style>
      </head>
      <body className="h-full antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
