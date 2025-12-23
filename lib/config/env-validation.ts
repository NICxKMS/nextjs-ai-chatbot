/**
 * Environment Variable Validation
 *
 * Validates required environment variables at application startup.
 * Prevents runtime crashes from missing configuration.
 *
 * @module lib/config/env-validation
 */

import { logger } from "@/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

type EnvVarConfig = {
    /** Environment variable name */
    name: string;
    /** Whether the variable is required (error if missing) */
    required: boolean;
    /** Description for error messages */
    description: string;
    /** Optional validator function */
    validate?: (value: string) => boolean;
};

type ValidationResult = {
    /** Whether validation passed */
    valid: boolean;
    /** Missing required variables */
    missing: string[];
    /** Invalid variables (failed validation) */
    invalid: string[];
    /** Warnings for optional missing variables */
    warnings: string[];
};

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Required and optional environment variables.
 * Required variables will cause startup failure if missing.
 */
const ENV_CONFIG: EnvVarConfig[] = [
    // Database
    {
        name: "POSTGRES_URL",
        required: true,
        description: "PostgreSQL connection URL for database",
    },
    // Auth
    {
        name: "AUTH_SECRET",
        required: true,
        description:
            "Secret key for session encryption (generate with openssl)",
        validate: (v) => v.length >= 32,
    },
    // AI Providers (at least one should be configured)
    {
        name: "OPENAI_API_KEY",
        required: false,
        description: "OpenAI API key for GPT models",
        validate: (v) => v.startsWith("sk-"),
    },
    {
        name: "ANTHROPIC_API_KEY",
        required: false,
        description: "Anthropic API key for Claude models",
        validate: (v) => v.startsWith("sk-ant-"),
    },
    {
        name: "GOOGLE_GENERATIVE_AI_API_KEY",
        required: false,
        description: "Google AI API key for Gemini models",
    },
    {
        name: "OPENROUTER_API_KEY",
        required: false,
        description: "OpenRouter API key for multi-provider access",
        validate: (v) => v.startsWith("sk-or-"),
    },
    // Redis/Cache (optional)
    {
        name: "CACHE_KV_REST_API_URL",
        required: false,
        description: "Vercel KV REST API URL for caching",
    },
    {
        name: "CACHE_KV_REST_API_TOKEN",
        required: false,
        description: "Vercel KV REST API token",
    },
    // Blob Storage (optional)
    {
        name: "BLOB_READ_WRITE_TOKEN",
        required: false,
        description: "Vercel Blob storage token for file uploads",
    },
];

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if at least one AI provider is configured.
 */
function hasAIProvider(): boolean {
    const providers = [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
        "OPENROUTER_API_KEY",
    ];
    return providers.some((key) => !!process.env[key]);
}

/**
 * Validate all environment variables.
 *
 * @returns Validation result with missing/invalid variables
 */
export function validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
        valid: true,
        missing: [],
        invalid: [],
        warnings: [],
    };

    for (const config of ENV_CONFIG) {
        const value = process.env[config.name];

        if (!value) {
            if (config.required) {
                result.missing.push(`${config.name}: ${config.description}`);
                result.valid = false;
            } else {
                result.warnings.push(`${config.name}: ${config.description}`);
            }
            continue;
        }

        // Run validator if provided
        if (config.validate && !config.validate(value)) {
            result.invalid.push(`${config.name}: Invalid format or value`);
            result.valid = false;
        }
    }

    // Special check: At least one AI provider must be configured
    if (!hasAIProvider()) {
        result.missing.push(
            "AI_PROVIDER: At least one AI provider API key is required (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or OPENROUTER_API_KEY)"
        );
        result.valid = false;
    }

    return result;
}

/**
 * Validate environment and throw if critical variables are missing.
 *
 * Called at application startup in instrumentation.ts.
 * In development, logs warnings. In production, throws errors.
 *
 * @throws Error if required environment variables are missing in production
 */
export function validateEnvOrThrow(): void {
    const result = validateEnvironment();
    const isProduction = process.env.NODE_ENV === "production";
    const isTest = process.env.NODE_ENV === "test";

    // Skip validation in test environment
    if (isTest) {
        return;
    }

    // Log warnings for optional missing variables
    if (result.warnings.length > 0) {
        logger.warn("[Env] Optional environment variables not set:", {
            warnings: result.warnings,
        });
    }

    // Handle validation failures
    if (result.valid) {
        logger.info("[Env] Environment validation passed");
    } else {
        const errorMessage = [
            "Environment validation failed:",
            "",
            ...(result.missing.length > 0
                ? [
                      "Missing required variables:",
                      ...result.missing.map((m) => `  - ${m}`),
                  ]
                : []),
            ...(result.invalid.length > 0
                ? [
                      "Invalid variables:",
                      ...result.invalid.map((i) => `  - ${i}`),
                  ]
                : []),
        ].join("\n");

        if (isProduction) {
            // In production, fail fast
            logger.error("[Env] " + errorMessage);
            throw new Error(errorMessage);
        }
        // In development, warn but continue
        logger.warn("[Env] " + errorMessage);
        console.warn(
            "\n⚠️  Environment validation warnings (non-fatal in development):\n" +
                errorMessage +
                "\n"
        );
    }
}

/**
 * Get a summary of configured providers for logging.
 */
export function getConfiguredProviders(): string[] {
    const providers: string[] = [];
    if (process.env.OPENAI_API_KEY) providers.push("OpenAI");
    if (process.env.ANTHROPIC_API_KEY) providers.push("Anthropic");
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) providers.push("Google");
    if (process.env.OPENROUTER_API_KEY) providers.push("OpenRouter");
    return providers;
}
