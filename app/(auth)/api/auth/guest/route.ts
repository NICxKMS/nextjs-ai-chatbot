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
		// If a session exists but the underlying DB user is missing, convert to a guest session.
		const users = token.id ? await getUserById(token.id) : [];
		if (users.length > 0) {
			return NextResponse.redirect(new URL("/", request.url));
		}
		// User record missing → create a guest session
		return signIn("guest", { redirect: true, redirectTo: redirectUrl });
	}

	return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
