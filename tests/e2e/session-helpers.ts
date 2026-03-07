import { createRequire } from "node:module"

import type { BrowserContext, Page } from "@playwright/test"
import { SignJWT } from "jose"
import { GUEST_COOKIE_NAME, GUEST_TOKEN_TTL_SECONDS } from "@/lib/auth/constants"
import { ensureTestAuthEnvironment } from "../test-env"

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require("@next/env") as {
	loadEnvConfig: (dir: string) => void
}

loadEnvConfig(process.cwd())
ensureTestAuthEnvironment()

const APP_URL = `http://localhost:${process.env.PORT ?? "3000"}`

type BrowserCookie = Parameters<BrowserContext["addCookies"]>[0][number]

function getGuestJwtSecret(): Uint8Array {
	const secret = process.env.GUEST_JWT_SECRET?.trim()

	if (!secret) {
		throw new Error("GUEST_JWT_SECRET is required for Playwright guest-session isolation")
	}

	return new TextEncoder().encode(secret)
}

async function createGuestToken(userId: string): Promise<string> {
	const nowSeconds = Math.floor(Date.now() / 1000)

	return new SignJWT({ sub: userId, type: "guest" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt(nowSeconds)
		.setExpirationTime(nowSeconds + GUEST_TOKEN_TTL_SECONDS)
		.sign(getGuestJwtSecret())
}

function toCookie(name: string, value: string): BrowserCookie {
	return {
		name,
		value,
		url: APP_URL,
		httpOnly: true,
		sameSite: "Lax",
		secure: false,
	}
}

export async function seedGuestSession(
	context: BrowserContext,
	additionalCookies: BrowserCookie[] = [],
): Promise<{ guestId: string }> {
	const guestId = crypto.randomUUID()
	const guestToken = await createGuestToken(guestId)

	await context.addCookies([toCookie(GUEST_COOKIE_NAME, guestToken), ...additionalCookies])

	return { guestId }
}

export async function gotoIsolatedGuestHome(
	page: Page,
	additionalCookies: BrowserCookie[] = [],
	path = "/",
) {
	await seedGuestSession(page.context(), additionalCookies)
	await page.goto(path, { waitUntil: "domcontentloaded" })
}

export { APP_URL, toCookie }
