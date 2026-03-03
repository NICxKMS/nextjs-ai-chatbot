import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SessionProvider } from "@/features/auth/components/session-provider"
import { getAppSession } from "@/lib/auth/session"

import "@/app/globals.css"

export const metadata: Metadata = {
	title: "ai-assistant",
	description: "AI assistant powered by the AI SDK.",
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const session = await getAppSession()

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
					<SessionProvider session={session}>
						<TooltipProvider delayDuration={0}>{children}</TooltipProvider>
					</SessionProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	)
}
