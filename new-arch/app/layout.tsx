import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/providers";
import { sessionManager } from "@/lib/auth/session-manager";

import "./globals.css";

// ============================================================================
// Metadata
// ============================================================================

export const metadata: Metadata = {
    metadataBase: new URL("https://chat.vercel.ai"),
    title: "AI Assistant",
    description: "AI Assistant using the AI SDK.",
};

export const viewport: Viewport = {
    maximumScale: 1, // Disable auto-zoom on mobile Safari
};

// ============================================================================
// Fonts
// ============================================================================

const geist = Geist({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-geist",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-geist-mono",
});

// ============================================================================
// Theme Color Script
// ============================================================================

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  const html = document.documentElement;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    const isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  const observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

// ============================================================================
// Loading Fallback
// ============================================================================

function AppShellFallback() {
    return (
        <div className="flex h-dvh w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <span className="text-muted-foreground text-sm">
                    Loading...
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// App Shell
// ============================================================================

async function AppShell({ children }: { children: React.ReactNode }) {
    // Fetch session using SessionManager (supports both Supabase and guest sessions)
    const initialSession = await sessionManager.getSession();

    return (
        <AppProviders initialSession={initialSession}>
            <Toaster position="top-center" />
            {children}
        </AppProviders>
    );
}

// ============================================================================
// Root Layout
// ============================================================================

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            className={`${geist.variable} ${geistMono.variable}`}
            lang="en"
            suppressHydrationWarning
        >
            <body className="antialiased">
                <Script id="theme-color" strategy="beforeInteractive">
                    {THEME_COLOR_SCRIPT}
                </Script>
                <SpeedInsights />
                <Analytics />
                <Suspense fallback={<AppShellFallback />}>
                    <AppShell>{children}</AppShell>
                </Suspense>
            </body>
        </html>
    );
}
