import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
	title: "Sign In",
	description:
		"Sign in to continue your AI conversations and access your chat history.",
}

export default function LoginLayout({ children }: { children: ReactNode }) {
	return children
}
