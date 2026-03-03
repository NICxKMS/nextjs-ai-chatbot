"use client"

import { useEffect } from "react"

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
						fontFamily: "system-ui, sans-serif",
						gap: "1rem",
					}}
				>
					<h2>Something went wrong!</h2>
					<button
						type="button"
						onClick={() => reset()}
						style={{
							padding: "0.5rem 1rem",
							borderRadius: "0.375rem",
							border: "1px solid #ccc",
							cursor: "pointer",
							backgroundColor: "#fff",
						}}
					>
						Try Again
					</button>
				</div>
			</body>
		</html>
	)
}
