/**
 * New Relic Configuration for Next.js AI Chatbot
 *
 * Place this file in your project root as newrelic.js
 * New Relic will automatically instrument your application when this file is present.
 */

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
	app_name: [process.env.NEW_RELIC_APP_NAME || "nextjs-ai-chatbot"],

	/**
	 * Your New Relic license key.
	 */
	license_key: process.env.NEW_RELIC_LICENSE_KEY || "",

	/**
	 * Logging configuration
	 */
	logging: {
		/**
		 * Level at which to log. 'trace' is most useful to New Relic when diagnosing
		 * issues with the agent, 'info' and higher will impose the least overhead on
		 * production applications.
		 */
		level: process.env.NEW_RELIC_LOG_LEVEL || "info",

		/**
		 * Where to put the log file -- by default just logs to stdout
		 */
		filepath: process.env.NEW_RELIC_LOG || "stdout",
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
			"request.headers.x*",
			"response.headers.cookie",
			"response.headers.authorization",
			"response.headers.proxyAuthorization",
			"response.headers.setCookie*",
			"response.headers.x*",
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
	},

	/**
	 * Error collector configuration
	 */
	error_collector: {
		enabled: true,
		ignore_status_codes: [404],
		expected_status_codes: [400, 401, 403],
	},

	/**
	 * Browser monitoring
	 */
	browser_monitoring: {
		enable: false, // Set to true to enable Real User Monitoring
	},

	/**
	 * Custom instrumentation
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
	},

	/**
	 * Custom parameters
	 */
	custom_parameters_enabled: true,
};
