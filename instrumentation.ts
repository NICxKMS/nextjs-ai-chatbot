import { registerOTel } from "@vercel/otel";

// Set New Relic logging to stdout BEFORE the agent initializes
// This MUST happen before any require('newrelic') call
// Vercel/Lambda have read-only filesystems - cannot write log files
if (!process.env.NEW_RELIC_LOG) {
    process.env.NEW_RELIC_LOG = "stdout";
}

export async function register() {
    // Enhanced configuration for Vercel Fluid Compute tracing
    registerOTel({
        serviceName: "ai-assistant",
    });

    // Only run in Node.js runtime (not Edge)
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Initialize New Relic agent early
        // Only if license key is configured
        if (
            process.env.NEW_RELIC_LICENSE_KEY &&
            process.env.NEW_RELIC_LICENSE_KEY.length > 0
        ) {
            try {
                // Use dynamic import to load newrelic
                // This works with serverExternalPackages in next.config.ts
                await import("newrelic");
                console.log("[New Relic] Agent initialized successfully");
            } catch (error) {
                console.warn("[New Relic] Failed to initialize agent:", error);
            }
        }

        // Inject request context getter into the log module for server-side correlation
        import("./lib/request-context").then((mod) => {
            import("./lib/log").then((logMod) => {
                logMod.injectRequestContextGetter(mod.getRequestContext);
            });
        });
    }
}
