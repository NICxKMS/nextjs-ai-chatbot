import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
	title: "Sign Up",
	description:
		"Create an account to start new AI chats and save your conversation history.",
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
	return children
}
