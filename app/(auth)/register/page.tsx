import type { Metadata } from "next"
import { register } from "@/features/auth/actions/register"
import { AuthForm } from "@/features/auth/components/auth-form"

export const metadata: Metadata = {
	title: "Sign Up",
	description: "Create a free AI assistant account.",
	openGraph: {
		title: "Sign Up",
		description: "Create a free AI assistant account.",
	},
}

export default function RegisterPage() {
	return <AuthForm mode="register" action={register} />
}
