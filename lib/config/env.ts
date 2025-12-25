/**
 * Environment Variable Validation with Zod
 *
 * Centralized, type-safe environment configuration.
 * Validates at import time and provides typed access.
 *
 * @module lib/config/env
 *
 * P2-019: DATABASE_URL validation
 * P2-020: Supabase env var validation
 */

import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Server-side environment variables schema.
 * These are validated at startup on the server.
 */
const serverEnvSchema = z.object({
    // REQUIRED - Database connection string (postgres:// or postgresql://)
    DATABASE_URL: z
        .string()
        .min(1, "DATABASE_URL is required")
        .url("DATABASE_URL must be a valid URL")
        .refine(
            (url) =>
                url.startsWith("postgres://") ||
                url.startsWith("postgresql://"),
            "DATABASE_URL must be a postgres:// or postgresql:// URL"
        ),

    // REQUIRED - JWT signing secret (minimum 32 characters for security)
    AUTH_SECRET: z
        .string()
        .min(32, "AUTH_SECRET must be at least 32 characters"),

    // OPTIONAL - Node environment, defaults to 'development'
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    // OPTIONAL - Set to '1' when deployed on Vercel
    VERCEL: z.string().optional(),

    // ==========================================================================
    // REDIS / CACHE CONFIGURATION (P4-019)
    // ==========================================================================

    // OPTIONAL - Upstash Redis REST API URL for caching
    CACHE_KV_REST_API_URL: z.string().url().optional(),

    // OPTIONAL - Upstash Redis REST API token
    CACHE_KV_REST_API_TOKEN: z.string().optional(),

    // ==========================================================================
    // EMAIL CONFIGURATION (P4-019)
    // ==========================================================================

    // OPTIONAL - SMTP host for email sending
    EMAIL_SMTP_HOST: z.string().optional(),

    // OPTIONAL - SMTP port (default: 587)
    EMAIL_SMTP_PORT: z.coerce.number().int().positive().optional(),

    // OPTIONAL - SMTP username for authentication
    EMAIL_SMTP_USER: z.string().optional(),

    // OPTIONAL - SMTP password for authentication
    EMAIL_SMTP_PASS: z.string().optional(),

    // OPTIONAL - Default "from" address for outgoing emails
    EMAIL_FROM: z.string().email().optional(),
});

/**
 * Client-side (public) environment variables schema.
 * Prefixed with NEXT_PUBLIC_ and safe to expose to browser.
 */
const clientEnvSchema = z.object({
    // REQUIRED - Supabase project URL (must be https://)
    NEXT_PUBLIC_SUPABASE_URL: z
        .string()
        .min(1, "NEXT_PUBLIC_SUPABASE_URL is required")
        .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
        .refine(
            (url) => url.startsWith("https://"),
            "NEXT_PUBLIC_SUPABASE_URL must be an https:// URL"
        ),

    // REQUIRED - Supabase anonymous key for client-side auth
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
        .string()
        .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

/**
 * Combined environment schema for full validation.
 */
const envSchema = serverEnvSchema.merge(clientEnvSchema);

// =============================================================================
// TYPES
// =============================================================================

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = z.infer<typeof envSchema>;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates environment variables and returns typed result.
 * Logs detailed errors on failure.
 */
function validateEnv(): Env {
    // Skip validation in test environment - tests set their own env vars
    if (process.env.NODE_ENV === "test") {
        return {
            DATABASE_URL:
                process.env.DATABASE_URL ??
                "postgres://test:test@localhost:5432/test",
            AUTH_SECRET:
                process.env.AUTH_SECRET ??
                "test-secret-key-for-jwt-signing-32chars",
            NODE_ENV: "test",
            VERCEL: process.env.VERCEL,
            NEXT_PUBLIC_SUPABASE_URL:
                process.env.NEXT_PUBLIC_SUPABASE_URL ??
                "https://test.supabase.co",
            NEXT_PUBLIC_SUPABASE_ANON_KEY:
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key",
            // Redis/Cache (optional in test)
            CACHE_KV_REST_API_URL: process.env.CACHE_KV_REST_API_URL,
            CACHE_KV_REST_API_TOKEN: process.env.CACHE_KV_REST_API_TOKEN,
            // Email (optional in test)
            EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
            EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT
                ? Number(process.env.EMAIL_SMTP_PORT)
                : undefined,
            EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER,
            EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS,
            EMAIL_FROM: process.env.EMAIL_FROM,
        };
    }

    const result = envSchema.safeParse({
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_SECRET: process.env.AUTH_SECRET,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        // Redis/Cache
        CACHE_KV_REST_API_URL: process.env.CACHE_KV_REST_API_URL,
        CACHE_KV_REST_API_TOKEN: process.env.CACHE_KV_REST_API_TOKEN,
        // Email
        EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
        EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT,
        EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER,
        EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS,
        EMAIL_FROM: process.env.EMAIL_FROM,
    });

    if (!result.success) {
        const formatted = result.error.format();
        console.error("❌ Invalid environment variables:");
        console.error(JSON.stringify(formatted, null, 2));

        // In development, log helpful message but don't throw
        if (process.env.NODE_ENV === "development") {
            console.warn(
                "\n⚠️  Environment validation failed. Check your .env file.\n"
            );
            // Return partial env with defaults in development to allow startup
            return {
                DATABASE_URL: process.env.DATABASE_URL ?? "",
                AUTH_SECRET: process.env.AUTH_SECRET ?? "",
                NODE_ENV: "development",
                VERCEL: process.env.VERCEL,
                NEXT_PUBLIC_SUPABASE_URL:
                    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
                NEXT_PUBLIC_SUPABASE_ANON_KEY:
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
                // Redis/Cache (optional)
                CACHE_KV_REST_API_URL: process.env.CACHE_KV_REST_API_URL,
                CACHE_KV_REST_API_TOKEN: process.env.CACHE_KV_REST_API_TOKEN,
                // Email (optional)
                EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
                EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT
                    ? Number(process.env.EMAIL_SMTP_PORT)
                    : undefined,
                EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER,
                EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS,
                EMAIL_FROM: process.env.EMAIL_FROM,
            };
        }

        // In production, fail fast
        throw new Error(
            `Invalid environment configuration:\n${JSON.stringify(formatted, null, 2)}`
        );
    }

    return result.data;
}

/**
 * Validated environment variables.
 * Fails fast at import time if validation fails (production).
 * In development/test, provides defaults to allow startup.
 */
export const env = validateEnv();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if running in production.
 */
export function isProduction(): boolean {
    return env.NODE_ENV === "production";
}

/**
 * Check if running in development.
 */
export function isDevelopment(): boolean {
    return env.NODE_ENV === "development";
}

/**
 * Check if running in test.
 */
export function isTest(): boolean {
    return env.NODE_ENV === "test";
}

/**
 * Check if deployed on Vercel.
 */
export function isVercel(): boolean {
    return env.VERCEL === "1";
}
