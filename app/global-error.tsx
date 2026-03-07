"use client"

import { type CSSProperties, useEffect } from "react"

const PAGE_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	minHeight: "100dvh",
	fontFamily: "system-ui, -apple-system, sans-serif",
	gap: "0.75rem",
	padding: "1rem",
	color: "#111",
	backgroundColor: "#fafafa",
}

const LABEL_STYLE: CSSProperties = {
	fontSize: "0.875rem",
	fontWeight: 500,
	letterSpacing: "0.025em",
	color: "#666",
}

const TITLE_STYLE: CSSProperties = {
	fontSize: "1.25rem",
	fontWeight: 600,
	margin: 0,
}

const BODY_STYLE: CSSProperties = {
	fontSize: "0.875rem",
	color: "#666",
	margin: 0,
	textAlign: "center",
	maxWidth: "28rem",
}

const DIGEST_STYLE: CSSProperties = {
	fontSize: "0.75rem",
	color: "#999",
	margin: 0,
}

const ACTION_ROW_STYLE: CSSProperties = {
	display: "flex",
	gap: "0.75rem",
	marginTop: "0.5rem",
}

const LINK_STYLE: CSSProperties = {
	padding: "0.5rem 1rem",
	borderRadius: "0.375rem",
	border: "1px solid #ddd",
	cursor: "pointer",
	backgroundColor: "#fff",
	color: "#111",
	fontSize: "0.875rem",
	textDecoration: "none",
}

const BUTTON_STYLE: CSSProperties = {
	padding: "0.5rem 1rem",
	borderRadius: "0.375rem",
	border: "1px solid transparent",
	cursor: "pointer",
	backgroundColor: "#111",
	color: "#fff",
	fontSize: "0.875rem",
}

/**
 * Global error boundary — replaces the root layout when it crashes.
 * Renders its own <html>/<body> since the root layout is unavailable.
 * Must NOT import layout-level providers (SessionProvider, ThemeProvider, etc.).
 * Uses inline styles since Tailwind/CSS isn't available when root layout fails.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error("Global error:", error.digest ?? error.message)
	}, [error])

	return (
		<html lang="en">
			<body>
				<div style={PAGE_STYLE}>
					<p style={LABEL_STYLE}>ai-assistant</p>
					<h2 style={TITLE_STYLE}>Something went wrong</h2>
					<p style={BODY_STYLE}>
						A critical error occurred. You can try again or return to the home page.
					</p>
					{error.digest && <p style={DIGEST_STYLE}>Error ID: {error.digest}</p>}
					<div style={ACTION_ROW_STYLE}>
						<a href="/" style={LINK_STYLE}>
							Go Home
						</a>
						<button type="button" onClick={reset} style={BUTTON_STYLE}>
							Try Again
						</button>
					</div>
				</div>
			</body>
		</html>
	)
}
