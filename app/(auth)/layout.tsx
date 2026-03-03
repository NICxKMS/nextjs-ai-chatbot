import { redirect } from "next/navigation"
import { getAppSession } from "@/lib/auth/session"

export const metadata = {
	title: "Authentication",
	description: "Sign in or create an account.",
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
	const session = await getAppSession()

	if (session?.user.type === "authenticated") {
		redirect("/")
	}

	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-4">
			<div className="w-full max-w-md">{children}</div>
		</div>
	)
}
