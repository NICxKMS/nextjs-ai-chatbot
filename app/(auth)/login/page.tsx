import type { Metadata } from "next"
import { login } from "@/features/auth/actions/login"
import { AuthForm } from "@/features/auth/components/auth-form"

export const metadata: Metadata = {
	title: "Sign In",
	description: "Sign in to your AI assistant account.",
	openGraph: {
		title: "Sign In",
		description: "Sign in to your AI assistant account.",
	},
}

export default function LoginPage() {
	return <AuthForm mode="login" action={login} />
}
