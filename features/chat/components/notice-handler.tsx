"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

const NOTICES: Record<string, { type: "warning" | "error"; message: string }> = {
	chat_not_found: {
		type: "warning",
		message: "This chat was not found. Redirected to the homepage.",
	},
	user_not_found: {
		type: "error",
		message: "Your account could not be found. Switched to a guest session.",
	},
}

export function NoticeHandler() {
	const searchParams = useSearchParams()

	useEffect(() => {
		const notice = searchParams.get("notice")
		const match = notice ? NOTICES[notice] : undefined
		if (!match) return

		toast[match.type](match.message)

		const url = new URL(window.location.href)
		url.searchParams.delete("notice")
		window.history.replaceState(null, "", url.toString())
	}, [searchParams])

	return null
}
