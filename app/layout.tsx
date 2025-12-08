import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getAppSession } from "@/lib/auth/session";

import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://chat.vercel.ai"),
    title: "Ai Assistant",
    description: "Ai Assistant using the AI SDK.",
};

export const viewport = {
    maximumScale: 1, // Disable auto-zoom on mobile Safari
};

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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            className={`${geist.variable} ${geistMono.variable}`}
            // `next-themes` injects an extra classname to the body element to avoid
            // visual flicker before hydration. Hence the `suppressHydrationWarning`
            // prop is necessary to avoid the React hydration mismatch warning.
            lang="en"
            suppressHydrationWarning
        >
            <body className="antialiased">
                <Script id="theme-color" strategy="beforeInteractive">
                    {THEME_COLOR_SCRIPT}
                </Script>
                <SpeedInsights />
                <Suspense fallback={<AppShellFallback />}>
                    <AppShell>{children}</AppShell>
                </Suspense>
            </body>
        </html>
    );
}

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

async function AppShell({ children }: { children: React.ReactNode }) {
    const initialSession = await getAppSession();

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
        >
            <Toaster position="top-center" />
            <SWRConfig
                value={{
                    dedupingInterval: 10_000,
                    revalidateOnFocus: false,
                    revalidateOnReconnect: false,
                    refreshWhenHidden: false,
                    refreshWhenOffline: false,
                    revalidateIfStale: true,
                    // revalidateOnMount: false,
                }}
            >
                <AuthProvider initialSession={initialSession}>
                    {children}
                </AuthProvider>
            </SWRConfig>
        </ThemeProvider>
    );
}
