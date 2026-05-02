import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"

import "@/app/globals.css"

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
	title: "ai-assistant",
	description: "AI assistant powered by the AI SDK.",
	openGraph: {
		title: "ai-assistant",
		description: "AI assistant powered by the AI SDK.",
		type: "website",
	},
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
}

// ── Root layout ────────────────────────────────────────────────
// Keep the root shell static so unmatched URLs and non-chat routes are not
// blocked behind auth-cookie work. Chat routes start session resolution in
// their own layout and reuse the same request-scoped server cache there.

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			suppressHydrationWarning
		>
			<head>
				{supabaseUrl && (
					<>
						<link rel="dns-prefetch" href={supabaseUrl} />
						<link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
					</>
				)}
			</head>
			<body className="antialiased">
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
				>
					Skip to main content
				</a>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<MotionProvider>
						<TooltipProvider delayDuration={0}>{children}</TooltipProvider>
						<Toaster />
					</MotionProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
