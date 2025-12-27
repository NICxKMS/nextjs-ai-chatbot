/**
 * Next.js Instrumentation
 *
 * Server-side initialization that runs once when the Next.js server starts.
 * Used for environment validation, telemetry setup, and global error handlers.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @module instrumentation
 */

export async function register() {
    // Only run in Node.js runtime (not Edge)
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Validate environment variables at startup
        const { validateEnvOrThrow, getConfiguredProviders } = await import(
            "@/lib/config/env-validation"
        );

        try {
            validateEnvOrThrow();

            // Log configured providers
            const providers = getConfiguredProviders();
            console.log(
                `✅ Environment validated. AI Providers: ${providers.join(", ") || "None"}`
            );
        } catch (error) {
            // In production, this will throw and prevent startup
            // In development, it will warn but continue
            console.error("❌ Environment validation failed:", error);
            if (process.env.NODE_ENV === "production") {
                throw error;
            }
        }

        // Global unhandled rejection handler for debugging
        process.on("unhandledRejection", (reason, promise) => {
            console.error(
                "Unhandled Rejection at:",
                promise,
                "reason:",
                reason
            );
        });

        // Global uncaught exception handler
        process.on("uncaughtException", (error) => {
            console.error("Uncaught Exception:", error);
            // Don't exit in development for better DX
            if (process.env.NODE_ENV === "production") {
                process.exit(1);
            }
        });
    }
}
