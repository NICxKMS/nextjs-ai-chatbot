/**
 * Root Layout Component
 *
 * Root layout for the Next.js App Router with provider hierarchy,
 * font loading, metadata configuration, and performance optimizations.
 *
 * Performance Optimizations:
 * - Resource hints (preconnect, dns-prefetch) for external domains
 * - Pyodide lazy loading for Python code execution in artifacts
 *
 * @module app/layout
 */

import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import { Suspense } from "react"
import { Toaster } from "sonner"
import { SWRConfig } from "swr"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/features/auth/components/auth-provider"
import { getSession } from "@/lib/auth/session"

import "./globals.css"

// =============================================================================
// Metadata Configuration
// =============================================================================

export const metadata: Metadata = {
	metadataBase: new URL("https://chat.vercel.ai"),
	title: {
		default: "AI Assistant - Chat with AI",
		template: "%s | AI Assistant",
	},
	description:
		"AI Assistant powered by the AI SDK. Chat with multiple AI models, create artifacts, and collaborate in real-time.",
	keywords: [
		"AI",
		"chatbot",
		"artificial intelligence",
		"AI assistant",
		"chat",
		"AI SDK",
		"Next.js",
	],
	authors: [{ name: "Vercel" }],
	creator: "Vercel",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://chat.vercel.ai",
		siteName: "AI Assistant",
		title: "AI Assistant - Chat with AI",
		description:
			"AI Assistant powered by the AI SDK. Chat with multiple AI models, create artifacts, and collaborate in real-time.",
		images: [
			{
				url: "/opengraph-image.png",
				width: 1200,
				height: 630,
				alt: "AI Assistant",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "AI Assistant - Chat with AI",
		description:
			"AI Assistant powered by the AI SDK. Chat with multiple AI models, create artifacts, and collaborate in real-time.",
		images: ["/twitter-image.png"],
		creator: "@vercel",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	icons: {
		icon: "/favicon.ico",
		shortcut: "/favicon.ico",
		apple: "/apple-touch-icon.png",
	},
	manifest: "/manifest.json",
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1, // Disable auto-zoom on mobile Safari
	userScalable: false, // Prevent zooming on iOS
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "hsl(0 0% 100%)" },
		{
			media: "(prefers-color-scheme: dark)",
			color: "hsl(240deg 10% 3.92%)",
		},
	],
}

// =============================================================================
// Font Configuration
// =============================================================================

const geist = Geist({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-geist",
})

const geistMono = Geist_Mono({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-geist-mono",
})

// =============================================================================
// Theme Color Configuration
// =============================================================================

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)"
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)"

/**
 * Script to update theme-color meta tag based on dark mode state.
 * Runs before interactive to prevent flash of wrong theme color.
 */
const THEME_COLOR_SCRIPT = `
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
})();`

// =============================================================================
// Root Layout Component
// =============================================================================

/**
 * Root layout component wrapping all pages.
 *
 * Sets up:
 * - Font loading with CSS variables
 * - Theme color script for mobile browsers
 * - Provider hierarchy (Theme, Tooltip, Auth)
 * - SWR configuration for data fetching
 * - Toast notifications
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
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
			<head>
				{/* =============================================================================
				     Resource Hints for Performance Optimization
				     ============================================================================= */}

				{/* CDN for Pyodide - Python code execution in artifacts */}
				<link
					crossOrigin="anonymous"
					href="https://cdn.jsdelivr.net"
					rel="preconnect"
				/>
				<link href="https://cdn.jsdelivr.net" rel="dns-prefetch" />

				{/* Vercel Analytics & Speed Insights */}
				<link
					crossOrigin="anonymous"
					href="https://va.vercel-scripts.com"
					rel="preconnect"
				/>
				<link href="https://va.vercel-scripts.com" rel="dns-prefetch" />
				<link
					crossOrigin="anonymous"
					href="https://vitals.vercel-insights.com"
					rel="preconnect"
				/>
				<link
					href="https://vitals.vercel-insights.com"
					rel="dns-prefetch"
				/>

				{/* Google Fonts - preconnect for faster font loading */}
				<link
					crossOrigin="anonymous"
					href="https://fonts.gstatic.com"
					rel="preconnect"
				/>

				{/* AI Provider APIs - dns-prefetch only (backend calls) */}
				<link href="https://api.openai.com" rel="dns-prefetch" />
				<link
					href="https://generativelanguage.googleapis.com"
					rel="dns-prefetch"
				/>

				{/* Weather API (tool usage) */}
				<link href="https://api.open-meteo.com" rel="dns-prefetch" />
			</head>
			<body className="antialiased">
				<Script id="theme-color" strategy="beforeInteractive">
					{THEME_COLOR_SCRIPT}
				</Script>

				{/* Pyodide for Python code execution in code artifacts */}
				<Script
					src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
					strategy="lazyOnload"
				/>

				{process.env.NODE_ENV === "production" && (
					<>
						<SpeedInsights />
						<Analytics />
					</>
				)}
				<Suspense fallback={<AppShellFallback />}>
					<AppShell>{children}</AppShell>
				</Suspense>
			</body>
		</html>
	)
}

// =============================================================================
// Helper Components
// =============================================================================

/**
 * Loading fallback shown while the app shell is loading.
 */
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
	)
}

/**
 * App shell component with all providers.
 * Async to allow fetching the initial session on the server.
 */
async function AppShell({ children }: { children: React.ReactNode }) {
	const initialSession = await getSession()

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			disableTransitionOnChange
			enableSystem
		>
			<TooltipProvider delayDuration={0}>
				<Toaster position="top-center" />
				<SWRConfig
					value={{
						dedupingInterval: 10_000,
						revalidateOnFocus: false,
						revalidateOnReconnect: false,
						refreshWhenHidden: false,
						refreshWhenOffline: false,
						revalidateIfStale: true,
					}}
				>
					<AuthProvider initialSession={initialSession}>
						{children}
					</AuthProvider>
				</SWRConfig>
			</TooltipProvider>
		</ThemeProvider>
	)
}
