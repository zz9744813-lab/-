import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PixelBackground } from "@/components/ui/pixel-background";
import { PixelCharacter } from "@/components/ui/pixel-character";

export const metadata: Metadata = {
  title: "Compass",
  description: "Compass × Hermes — Personal Growth OS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('compass-theme');
              if (t === 'light' || t === 'dark') {
                document.documentElement.setAttribute('data-theme', t);
              } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.documentElement.setAttribute('data-theme', 'light');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <PixelBackground />
          <PixelCharacter />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
