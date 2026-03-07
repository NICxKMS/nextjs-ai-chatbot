import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { AuthLoadingState } from "@/features/auth/components/auth-loading-state"
import { getAppSession } from "@/lib/auth/session"

export const metadata: Metadata = {
	title: "Authentication",
	description: "Sign in or create an account.",
}

// ── Auth guard (async, accesses cookies → must be inside Suspense) ──

async function AuthGuard({ children }: { children: React.ReactNode }) {
	const session = await getAppSession()

	if (session?.user.type === "authenticated") {
		redirect("/")
	}

	return <>{children}</>
}

// ── Auth layout ────────────────────────────────────────────────
// With cacheComponents enabled, dynamic APIs (cookies/headers) must be
// accessed inside <Suspense> boundaries. The static shell (centered
// container) prerenders immediately; the auth guard streams once cookies
// resolve at request time.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-4">
			<div className="w-full max-w-md">
				<Suspense fallback={<AuthLoadingState />}>
					<AuthGuard>{children}</AuthGuard>
				</Suspense>
			</div>
		</div>
	)
}
