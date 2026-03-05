import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SessionProvider } from "@/features/auth/components/session-provider"
import { getAppSession } from "@/lib/auth/session"

import "@/app/globals.css"

export const metadata: Metadata = {
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

// ── Session shell (async, accesses cookies → must be inside Suspense) ──

async function SessionShell({ children }: { children: React.ReactNode }) {
	const session = await getAppSession()
	return (
		<SessionProvider session={session}>
			<TooltipProvider delayDuration={0}>{children}</TooltipProvider>
		</SessionProvider>
	)
}

// ── Root layout ────────────────────────────────────────────────
// With cacheComponents enabled, dynamic APIs (cookies/headers) must be
// accessed inside <Suspense> boundaries. The static shell (html, body,
// ThemeProvider) prerenders immediately; session-dependent content streams
// once cookies resolve at request time.

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			suppressHydrationWarning
		>
			<body className="antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<MotionProvider>
						<Suspense fallback={null}>
							<SessionShell>{children}</SessionShell>
						</Suspense>
					</MotionProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	)
}
