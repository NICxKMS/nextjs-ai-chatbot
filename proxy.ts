import { type NextRequest, NextResponse } from "next/server";

// Content Security Policy header for enhanced security
const CSP_DIRECTIVES = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' blob: data: https://avatar.vercel.sh https://*.blob.vercel-storage.com",
	"font-src 'self' data:",
	"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
].join("; ");

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	/*
	 * Playwright starts the dev server and requires a 200 status to
	 * begin the tests, so this ensures that the tests can start
	 */
	if (pathname.startsWith("/ping")) {
		return new Response("pong", { status: 200 });
	}

	// Add security headers to all responses
	const response = NextResponse.next();
	response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("X-DNS-Prefetch-Control", "on");
	
	return response;
}

export const config = {
	matcher: [
		"/",
		"/chat/:id",
		"/api/:path*",
		"/login",
		"/register",

		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
		 */
		"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
};
