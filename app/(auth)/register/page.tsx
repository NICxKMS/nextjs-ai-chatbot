import type { Metadata } from "next"
import { register } from "@/features/auth/actions/register"
import { AuthForm } from "@/features/auth/components/auth-form"

export const metadata: Metadata = {
	title: "Sign Up",
}

export default function RegisterPage() {
	return <AuthForm mode="register" action={register} />
}
