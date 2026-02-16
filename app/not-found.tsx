/**
 * Not Found Page (404)
 *
 * Displayed when a route is not found. Provides a centered layout
 * with a link to return home.
 *
 * @module app/not-found
 */

import { Home } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

/**
 * 404 Not Found page component.
 */
export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
			<div className="flex flex-col items-center gap-6 text-center">
				<div className="flex flex-col items-center gap-2">
					<h1 className="text-6xl font-bold text-foreground">404</h1>
					<h2 className="text-2xl font-semibold text-muted-foreground">
						Page Not Found
					</h2>
				</div>

				<p className="max-w-md text-muted-foreground">
					The page you're looking for doesn't exist or has been moved.
					Please check the URL or return to the home page.
				</p>

				<Button asChild size="lg">
					<Link href="/">
						<Home className="mr-2 h-4 w-4" />
						Return Home
					</Link>
				</Button>
			</div>
		</div>
	)
}
