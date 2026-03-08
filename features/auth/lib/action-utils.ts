import "server-only"

import { cookies, headers } from "next/headers"

import type { AuthActionData } from "@/features/auth/types/auth.types"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { verifyGuestToken } from "@/lib/auth/guest"
import { checkRateLimit } from "@/lib/cache/rate-limit"
import { transferGuestChats } from "@/lib/data/chat"
import { deleteGuestUser } from "@/lib/data/user"
import type { ErrorCode } from "@/lib/errors/codes"
import type { ActionResult } from "@/lib/types/result.types"
import { logger } from "@/lib/utils/logger"

type AuthRateLimitConfig = {
	createKey(ip: string): string
	limit: number
	windowSeconds: number
	errorCode: ErrorCode
	errorMessage: string
}

function createActionErrorResult(code: ErrorCode, message: string): ActionResult<AuthActionData> {
	return {
		success: false,
		error: { code, message },
	}
}

async function getClientIp(): Promise<string> {
	const headerStore = await headers()
	return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}

export function authServiceUnavailableResult(): ActionResult<AuthActionData> {
	return createActionErrorResult("offline:api:service_unavailable", "Auth service is unavailable")
}

export async function enforceAuthRateLimit(
	config: AuthRateLimitConfig,
): Promise<ActionResult<AuthActionData> | null> {
	const allowed = await checkRateLimit(
		config.createKey(await getClientIp()),
		config.limit,
		config.windowSeconds,
	)

	if (allowed) return null

	return createActionErrorResult(config.errorCode, config.errorMessage)
}

export async function migrateGuestChatsAndClearToken(
	userId: string | null | undefined,
	logPrefix: "login" | "register",
): Promise<void> {
	const cookieStore = await cookies()
	const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value

	if (!guestToken) {
		return
	}

	try {
		if (userId) {
			const guest = await verifyGuestToken(guestToken)
			if (guest) {
				const migratedChatCount = await transferGuestChats(guest.userId, userId)
				if (migratedChatCount > 0) {
					logger.info(
						`[${logPrefix}] Migrated ${migratedChatCount} guest chat(s) to user ${userId}`,
					)
				}

				// Clean up the orphaned guest user row after successful migration.
				// Non-critical: if this fails, the guest row is harmless dead data.
				try {
					await deleteGuestUser(guest.userId)
				} catch {
					logger.warn(`[${logPrefix}] Failed to delete orphaned guest user`, {
						guestUserId: guest.userId,
					})
				}
			}
		}
	} catch (migrationError) {
		logger.error(`[${logPrefix}] Guest data migration failed`, {
			error: String(migrationError),
		})
	} finally {
		cookieStore.delete(GUEST_COOKIE_NAME)
	}
}
