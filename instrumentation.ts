/**
 * Next.js Instrumentation
 *
 * Server-side initialization for logging, OpenTelemetry, and error handling.
 * This file runs once when the Next.js server starts.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { registerOTel } from "@vercel/otel"

/**
 * Register function called by Next.js on server startup.
 * Initializes OpenTelemetry, logging context, and global error handlers.
 */
export function register(): void {
	// OpenTelemetry for Vercel Fluid Compute tracing
	registerOTel({
		serviceName: "ai-assistant",
	})

	// Only run Node.js-specific initialization in Node.js runtime
	if (process.env.NEXT_RUNTIME === "nodejs") {
		// Inject request context getter into the log module for server-side correlation
		// This enables request-scoped logging with correlation IDs
		import("./lib/api/context")
			.then((contextMod) => {
				import("./lib/log").then((logMod) => {
					// Wrapper to convert RequestContext to Record<string, unknown>
					const contextGetter = ():
						| Record<string, unknown>
						| undefined => {
						const ctx = contextMod.getRequestContext()
						if (!ctx) return undefined
						return {
							requestId: ctx.requestId,
							userId: ctx.userId,
							isGuest: ctx.isGuest,
							startTime: ctx.startTime,
							method: ctx.method,
							path: ctx.path,
							clientIp: ctx.clientIp,
							userAgent: ctx.userAgent,
						}
					}
					logMod.injectRequestContextGetter(contextGetter)
				})
			})
			.catch((err) => {
				console.error(
					"Failed to initialize request context logging:",
					err,
				)
			})

		// Global unhandled rejection handler
		// Catches unhandled promise rejections to prevent silent failures
		// and ensure proper error logging for debugging
		process.on("unhandledRejection", (reason, promise) => {
			import("./lib/log")
				.then((logMod) => {
					logMod.logError(
						"unhandled_rejection",
						reason instanceof Error
							? reason
							: new Error(String(reason)),
						{
							type: "unhandledRejection",
							reason:
								reason instanceof Error
									? reason.message
									: String(reason),
							stack:
								reason instanceof Error
									? reason.stack
									: undefined,
						},
					)
				})
				.catch((importErr) => {
					// Fallback to console if log module fails to load
					console.error(
						"Unhandled Rejection:",
						reason,
						"Promise:",
						promise,
						"Import error:",
						importErr,
					)
				})
		})

		// Global uncaught exception handler
		// Last resort for synchronous errors that escape all try-catch blocks
		process.on("uncaughtException", (error, origin) => {
			import("./lib/log")
				.then((logMod) => {
					logMod.logError("uncaught_exception", error, {
						type: "uncaughtException",
						origin,
						message: error.message,
						stack: error.stack,
					})
				})
				.catch((importErr) => {
					// Fallback to console if log module fails to load
					console.error(
						"Uncaught Exception:",
						error,
						"Origin:",
						origin,
						"Import error:",
						importErr,
					)
				})
		})
	}
}
