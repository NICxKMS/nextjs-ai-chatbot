import { registerOTel } from "@vercel/otel";

export function register() {
    // Enhanced configuration for Vercel Fluid Compute tracing
    registerOTel({
        serviceName: "ai-chatbot",
    });

    // Inject request context getter into the log module for server-side correlation
    // Only run in Node.js runtime (not Edge) since request-context uses Node.js APIs
    if (process.env.NEXT_RUNTIME === "nodejs") {
        import("./lib/request-context").then((mod) => {
            import("./lib/log").then((logMod) => {
                logMod.injectRequestContextGetter(mod.getRequestContext);
            });
        });
    }
}
