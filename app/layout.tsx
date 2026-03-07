import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"

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

// ── Root layout ────────────────────────────────────────────────
// Keep the root shell static so unmatched URLs and non-chat routes are not
// blocked behind auth-cookie work. Chat routes start session resolution in
// their own layout and reuse the same request-scoped server cache there.

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
					<TooltipProvider delayDuration={0}>{children}</TooltipProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	)
}
