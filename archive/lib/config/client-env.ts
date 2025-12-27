/**
 * Client-Side Environment Configuration
 *
 * Runtime-guarded environment variables for client components.
 * Only exposes NEXT_PUBLIC_* variables that are safe for the browser.
 *
 * @module lib/config/client-env
 *
 * P2-013: Client environment guard
 *
 * @example
 * ```tsx
 * // In a client component
 * 'use client';
 * import { clientEnv } from '@/lib/config/client-env';
 *
 * export function MyComponent() {
 *   const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
 *   // ...
 * }
 * ```
 */

import { z } from "zod";

// =============================================================================
// ERROR CLASSES
// =============================================================================

/**
 * Error thrown when client environment is accessed on the server.
 */
export class ClientEnvServerAccessError extends Error {
    constructor() {
        super(
            "getClientEnv() called on server - use `env` from lib/config/env.ts instead. " +
                "Client environment is only available in the browser."
        );
        this.name = "ClientEnvServerAccessError";
    }
}

/**
 * Error thrown when client environment validation fails.
 */
export class ClientEnvValidationError extends Error {
    constructor(message: string) {
        super(`Client environment validation failed: ${message}`);
        this.name = "ClientEnvValidationError";
    }
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Schema for client-side (public) environment variables.
 * Only NEXT_PUBLIC_* variables should be included here.
 */
export const clientEnvSchema = z.object({
    /**
     * Supabase project URL for client-side operations.
     */
    NEXT_PUBLIC_SUPABASE_URL: z
        .string()
        .min(1, "NEXT_PUBLIC_SUPABASE_URL is required")
        .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),

    /**
     * Supabase anonymous key for public client operations.
     */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
        .string()
        .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

// =============================================================================
// TYPES
// =============================================================================

/**
 * Type-safe client environment object.
 */
export type ClientEnvType = z.infer<typeof clientEnvSchema>;

// =============================================================================
// RUNTIME GUARD
// =============================================================================

/**
 * Checks if code is running in a browser environment.
 */
function isBrowser(): boolean {
    return typeof window !== "undefined";
}

/**
 * Get validated client environment variables.
 *
 * @throws {ClientEnvServerAccessError} If called on the server
 * @throws {ClientEnvValidationError} If environment validation fails
 * @returns Validated client environment object
 */
export function getClientEnv(): ClientEnvType {
    // Runtime guard - prevent server-side access
    if (!isBrowser()) {
        throw new ClientEnvServerAccessError();
    }

    const rawEnv = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    const result = clientEnvSchema.safeParse(rawEnv);

    if (!result.success) {
        const formatted = result.error.format();
        throw new ClientEnvValidationError(JSON.stringify(formatted, null, 2));
    }

    return result.data;
}

// =============================================================================
// LAZY CLIENT ENV
// =============================================================================

/**
 * Lazily initialized client environment.
 * Only validates when first accessed in the browser.
 */
let _clientEnv: ClientEnvType | null = null;

/**
 * Get or initialize the client environment.
 * Caches the result after first validation.
 *
 * @throws {ClientEnvServerAccessError} If called on the server
 * @throws {ClientEnvValidationError} If environment validation fails
 */
function getOrInitClientEnv(): ClientEnvType {
    if (_clientEnv === null) {
        _clientEnv = getClientEnv();
    }
    return _clientEnv;
}

/**
 * Proxy-based client environment that validates on first access.
 * Provides runtime guards and type-safe access to public env vars.
 *
 * @throws {ClientEnvServerAccessError} If accessed on the server
 * @throws {ClientEnvValidationError} If environment validation fails
 *
 * @example
 * ```tsx
 * 'use client';
 * import { clientEnv } from '@/lib/config/client-env';
 *
 * // Type-safe access to public env vars
 * const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
 * ```
 */
export const clientEnv: ClientEnvType = new Proxy({} as ClientEnvType, {
    get(_target, prop: string) {
        const env = getOrInitClientEnv();
        return env[prop as keyof ClientEnvType];
    },
    // Prevent setting values
    set() {
        throw new Error("clientEnv is read-only");
    },
    // Prevent deleting values
    deleteProperty() {
        throw new Error("clientEnv is read-only");
    },
});

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if client environment is available (running in browser).
 * Use this to conditionally access clientEnv.
 *
 * @example
 * ```tsx
 * import { isClientEnvAvailable, clientEnv } from '@/lib/config/client-env';
 *
 * if (isClientEnvAvailable()) {
 *   // Safe to access clientEnv
 *   console.log(clientEnv.NEXT_PUBLIC_SUPABASE_URL);
 * }
 * ```
 */
export function isClientEnvAvailable(): boolean {
    return isBrowser();
}

/**
 * Reset the cached client environment.
 * Useful for testing purposes.
 */
export function resetClientEnvCache(): void {
    _clientEnv = null;
}
