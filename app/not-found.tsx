import Link from "next/link"

import { Button } from "@/components/ui/button"

/**
 * Custom 404 page — rendered when `notFound()` is called or a route is unmatched.
 * Server Component — no client-side JavaScript required.
 */
export default function NotFound() {
	return (
		<div className="flex h-dvh w-full flex-col items-center justify-center gap-6 px-4">
			<div className="flex flex-col items-center gap-2 text-center">
				<p className="font-medium text-muted-foreground text-sm tracking-wide">
					ai-assistant
				</p>
				<h2 className="font-semibold text-xl">Page not found</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					The page you're looking for doesn't exist or has been moved.
				</p>
			</div>
			<Button asChild variant="outline">
				<Link href="/">Go Home</Link>
			</Button>
		</div>
	)
}
