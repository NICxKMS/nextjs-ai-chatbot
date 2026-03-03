import type { Metadata } from "next"
import { login } from "@/features/auth/actions/login"
import { AuthForm } from "@/features/auth/components/auth-form"

export const metadata: Metadata = {
	title: "Sign In",
}

export default function LoginPage() {
	return <AuthForm mode="login" action={login} />
}
