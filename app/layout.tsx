import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import { SessionWrapper } from "@/components/session-wrapper";
import { ThemeProvider } from "@/components/theme-provider";

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
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
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
			<head>
				{/* Resource hints for better CDN performance */}
				<link href="https://cdn.jsdelivr.net" rel="preconnect" />
				<link href="https://cdn.jsdelivr.net" rel="dns-prefetch" />
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
					dangerouslySetInnerHTML={{
						__html: THEME_COLOR_SCRIPT,
					}}
				/>
			</head>
			<body className="antialiased">
				<SpeedInsights />
				<Suspense>
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
							<SessionWrapper>{children}</SessionWrapper>
						</SWRConfig>
					</ThemeProvider>
				</Suspense>
			</body>
		</html>
	);
}
