/** User classification for session resolution. */
export type UserType = "authenticated" | "guest"

export type AppSession = {
	user: {
		id: string
		type: UserType
		email?: string
	}
}
