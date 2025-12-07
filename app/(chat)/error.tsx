"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/log";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log error to monitoring service
		logError("Chat error boundary caught error", error);
	}, [error]);

	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-4 p-4">
			<h2 className="text-xl font-semibold">Something went wrong</h2>
			<p className="max-w-md text-center text-muted-foreground">
				An unexpected error occurred. Please try again.
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
