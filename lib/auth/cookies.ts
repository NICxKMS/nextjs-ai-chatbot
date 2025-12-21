/**
 * Cookie Utilities
 * Ref: 02-authentication-optimal-design.md §6
 */

import { cookies } from "next/headers";
import {
    GUEST_TOKEN_COOKIE,
    getCookieOptions,
    isProductionEnvironment,
} from "./constants";

/**
 * Get guest token from cookies (Server Component / Server Action)
 */
export async function getGuestTokenCookie(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
}

/**
 * Set guest token cookie (Server Action only)
 */
export async function setGuestTokenCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    const options = getCookieOptions(isProductionEnvironment());

    cookieStore.set(GUEST_TOKEN_COOKIE, token, options);
}

/**
 * Delete guest token cookie (Server Action only)
 */
export async function deleteGuestTokenCookie(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(GUEST_TOKEN_COOKIE, "", {
        ...getCookieOptions(isProductionEnvironment()),
        maxAge: 0,
    });
}

/**
 * Get Supabase access token cookie name
 */
export function getSupabaseCookieName(): string {
    const projectId = process.env.SUPABASE_PROJECT_ID || "supabase";
    return `sb-${projectId}-auth-token`;
}
