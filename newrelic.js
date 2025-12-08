/**
 * New Relic Configuration for Next.js AI Chatbot
 *
 * Place this file in your project root as newrelic.js
 * New Relic will automatically instrument your application when this file is present.
 *
 * Enhanced configuration includes:
 * - Serverless mode for Vercel deployment
 * - AI/LLM observability
 * - Enhanced datastore tracking
 * - Improved transaction tracing
 */

// CRITICAL: Force stdout logging BEFORE exports.config is read
// This prevents EROFS errors on Vercel/Lambda read-only filesystems
// The agent checks process.env before reading the config file
if (!process.env.NEW_RELIC_LOG) {
    process.env.NEW_RELIC_LOG = "stdout";
}

/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
    /**
     * Array of application names.
     */
    app_name: [process.env.NEW_RELIC_APP_NAME || "ai-assistant"],

    /**
     * Your New Relic license key.
     */
    license_key: process.env.NEW_RELIC_LICENSE_KEY || "",

    /**
     * Logging configuration
     * NOTE: Vercel has a read-only file system, so we MUST use stdout
     *
     * IMPORTANT: Also set these environment variables in Vercel:
     *   NEW_RELIC_LOG=stdout
     *   NEW_RELIC_LOG_ENABLED=true
     *
     * This ensures logging is configured before the config file is loaded.
     */
    logging: {
        /**
         * Level at which to log. 'trace' is most useful to New Relic when diagnosing
         * issues with the agent, 'info' and higher will impose the least overhead on
         * production applications.
         */
        level: process.env.NEW_RELIC_LOG_LEVEL || "info",

        /**
         * Where to put the log file -- MUST be stdout for Vercel/serverless
         * The read-only file system will cause EROFS errors if a file path is used
         */
        filepath: process.env.NEW_RELIC_LOG || "stdout",

        /**
         * Whether to enable logging
         */
        enabled: true,
    },

    /**
     * Security agent configuration
     * Disable file-based logging for serverless environments
     */
    security: {
        enabled: process.env.NEW_RELIC_SECURITY_ENABLED === "true",
        agent: {
            enabled: process.env.NEW_RELIC_SECURITY_ENABLED === "true",
        },
        // Disable security agent logging to file in serverless
        detection: {
            rxss: { enabled: true },
            deserialization: { enabled: true },
        },
    },

    /**
     * Serverless mode for Vercel/Lambda deployments
     * Automatically detected, but can be explicitly set
     */
    serverless_mode: {
        enabled:
            process.env.VERCEL === "1" ||
            process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined,
    },

    /**
     * When true, all request headers except for those listed in attributes.exclude
     * will be captured for all traces, unless otherwise specified in a destination's
     * attributes include/exclude lists.
     */
    allow_all_headers: true,

    /**
     * Attributes configuration
     */
    attributes: {
        /**
         * Prefix of attributes to exclude from all destinations. Allows * as wildcard
         * at end.
         */
        exclude: [
            "request.headers.cookie",
            "request.headers.authorization",
            "request.headers.proxyAuthorization",
            "request.headers.setCookie*",
            "request.headers.x-api-key",
            "request.headers.x-auth-*",
            "response.headers.cookie",
            "response.headers.authorization",
            "response.headers.proxyAuthorization",
            "response.headers.setCookie*",
        ],
    },

    /**
     * Application-specific settings
     */
    application_logging: {
        enabled: true,
        forwarding: {
            enabled: true,
            max_samples_stored: 10_000,
        },
        metrics: {
            enabled: true,
        },
        local_decorating: {
            enabled: false,
        },
    },

    /**
     * Distributed tracing
     */
    distributed_tracing: {
        enabled: true,
    },

    /**
     * Transaction tracer configuration
     */
    transaction_tracer: {
        enabled: true,
        transaction_threshold: "apdex_f",
        record_sql: "obfuscated",
        explain_threshold: 500,
        // Capture slow transaction traces
        top_n: 20,
        // Include more detail in traces
        attributes: {
            enabled: true,
        },
    },

    /**
     * Error collector configuration
     */
    error_collector: {
        enabled: true,
        ignore_status_codes: [404],
        expected_status_codes: [400, 401, 403],
        // Capture more error attributes
        attributes: {
            enabled: true,
        },
        /**
         * Custom error grouping for better fingerprinting
         * Groups ChatSDKError by error code for cleaner error inbox
         */
        error_group_callback: (metadata) => {
            // Group by custom error code if present
            if (metadata?.customAttributes?.code) {
                return { group: metadata.customAttributes.code };
            }
            // Group by error class for standard errors
            if (metadata?.["error.class"]) {
                return { group: metadata["error.class"] };
            }
            return null; // Use default grouping
        },
    },

    /**
     * Browser monitoring (Real User Monitoring)
     * Enabled in production for frontend visibility
     */
    browser_monitoring: {
        enable: process.env.NODE_ENV === "production",
        attributes: {
            enabled: true,
        },
    },

    /**
     * Custom instrumentation and events
     */
    custom_insights_events: {
        enabled: true,
        max_samples_stored: 30_000,
    },

    /**
     * Slow SQL configuration
     */
    slow_sql: {
        enabled: true,
        max_samples: 10,
    },

    /**
     * Datastore configuration for database tracking
     */
    datastore_tracer: {
        instance_reporting: {
            enabled: true,
        },
        database_name_reporting: {
            enabled: true,
        },
    },

    /**
     * AI Monitoring / LLM Observability
     * Track AI model calls, token usage, and response times
     */
    ai_monitoring: {
        enabled: true,
        streaming: {
            enabled: true,
        },
        record_content: {
            enabled: process.env.NODE_ENV !== "production", // Only in dev
        },
    },

    /**
     * Span events for detailed tracing
     * Balanced for cost optimization while maintaining visibility
     */
    span_events: {
        enabled: true,
        max_samples_stored: 1500,
        attributes: {
            enabled: true,
        },
    },

    /**
     * Transaction events
     * Reduced sample count for cost optimization on high-traffic endpoints
     */
    transaction_events: {
        enabled: true,
        max_samples_stored: 5000,
        attributes: {
            enabled: true,
        },
    },

    /**
     * Custom parameters
     */
    custom_parameters_enabled: true,

    /**
     * Infinite tracing (if configured)
     */
    infinite_tracing: {
        trace_observer: {
            host: process.env.NEW_RELIC_TRACE_OBSERVER_HOST || "",
        },
    },

    /**
     * Rules for naming and ignoring transactions
     */
    rules: {
        name: [
            // Group API routes for cleaner transaction naming
            { pattern: "^/api/chat.*", name: "/api/chat" },
            { pattern: "^/api/auth.*", name: "/api/auth" },
            { pattern: "^/api/health.*", name: "/api/health" },
            { pattern: "^/api/document.*", name: "/api/document" },
            { pattern: "^/api/history.*", name: "/api/history" },
            { pattern: "^/api/vote.*", name: "/api/vote" },
            { pattern: "^/api/files.*", name: "/api/files" },
            { pattern: "^/api/suggestions.*", name: "/api/suggestions" },
        ],
        ignore: [
            // Ignore static assets and internal Next.js routes
            "^/_next/static.*",
            "^/_next/image.*",
            "^/favicon.ico$",
            "^/robots.txt$",
            "^/sitemap.xml$",
        ],
    },

    /**
     * Feature flags
     */
    feature_flag: {
        // Enable new features as they become available
        undici_instrumentation: true,
        new_promise_tracking: true,
    },
};
