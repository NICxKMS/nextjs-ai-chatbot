import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { signIn } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getUserById } from "@/lib/db/queries";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const redirectUrl = searchParams.get("redirectUrl") || "/";

	const token = await getToken({
		req: request,
		secret: process.env.AUTH_SECRET,
		secureCookie: !isDevelopmentEnvironment,
	});

	if (token) {
		// If a session exists:
		// - If DB user is missing, convert to a guest session
		// - If DB user exists (including guest user), just go to the target page
		const users = token.id ? await getUserById(token.id) : [];
		if (users.length === 0) {
			// User record missing → create a guest session
			return signIn("guest", { redirect: true, redirectTo: redirectUrl });
		}
		// User exists (regular or guest) → respect the original redirect target
		return NextResponse.redirect(new URL(redirectUrl, request.url));
	}

	return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
