"use client"

import { useEffect } from "react"

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
		console.error("Global error:", error)
	}, [error])

	return (
		<html lang="en">
			<body>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "100vh",
						fontFamily: "system-ui, -apple-system, sans-serif",
						gap: "0.75rem",
						padding: "1rem",
						color: "#111",
						backgroundColor: "#fafafa",
					}}
				>
					<p
						style={{
							fontSize: "0.875rem",
							fontWeight: 500,
							letterSpacing: "0.025em",
							color: "#666",
						}}
					>
						ai-assistant
					</p>
					<h2
						style={{
							fontSize: "1.25rem",
							fontWeight: 600,
							margin: 0,
						}}
					>
						Something went wrong
					</h2>
					<p
						style={{
							fontSize: "0.875rem",
							color: "#666",
							margin: 0,
							textAlign: "center",
							maxWidth: "28rem",
						}}
					>
						A critical error occurred. You can try again or return to the home page.
					</p>
					{error.digest && (
						<p
							style={{
								fontSize: "0.75rem",
								color: "#999",
								margin: 0,
							}}
						>
							Error ID: {error.digest}
						</p>
					)}
					<div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
						<a
							href="/"
							style={{
								padding: "0.5rem 1rem",
								borderRadius: "0.375rem",
								border: "1px solid #ddd",
								cursor: "pointer",
								backgroundColor: "#fff",
								color: "#111",
								fontSize: "0.875rem",
								textDecoration: "none",
							}}
						>
							Go Home
						</a>
						<button
							type="button"
							onClick={() => reset()}
							style={{
								padding: "0.5rem 1rem",
								borderRadius: "0.375rem",
								border: "1px solid transparent",
								cursor: "pointer",
								backgroundColor: "#111",
								color: "#fff",
								fontSize: "0.875rem",
							}}
						>
							Try Again
						</button>
					</div>
				</div>
			</body>
		</html>
	)
}
