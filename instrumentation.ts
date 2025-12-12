import { registerOTel } from "@vercel/otel";

export function register() {
    // OpenTelemetry for Vercel Fluid Compute tracing
    registerOTel({
        serviceName: "ai-assistant",
    });

    // Inject request context getter into the log module for server-side correlation
    if (process.env.NEXT_RUNTIME === "nodejs") {
        import("./lib/request-context").then((mod) => {
            import("./lib/log").then((logMod) => {
                logMod.injectRequestContextGetter(mod.getRequestContext);
            });
        });

        // Task 9.16: Global unhandled rejection handler
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
                        }
                    );
                })
                .catch((importErr) => {
                    // Fallback to console if log module fails to load
                    console.error(
                        "Unhandled Rejection:",
                        reason,
                        "Promise:",
                        promise,
                        "Import error:",
                        importErr
                    );
                });
        });

        // Task 9.16: Global uncaught exception handler
        // Last resort for synchronous errors that escape all try-catch blocks
        process.on("uncaughtException", (error, origin) => {
            import("./lib/log")
                .then((logMod) => {
                    logMod.logError("uncaught_exception", error, {
                        type: "uncaughtException",
                        origin,
                        message: error.message,
                        stack: error.stack,
                    });
                })
                .catch((importErr) => {
                    // Fallback to console if log module fails to load
                    console.error(
                        "Uncaught Exception:",
                        error,
                        "Origin:",
                        origin,
                        "Import error:",
                        importErr
                    );
                });
        });
    }
}
