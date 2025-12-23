/**
 * Application Configuration
 *
 * Centralized configuration management with type-safe access to environment
 * variables and application settings. Provides defaults and validation.
 *
 * @module lib/config/app-config
 */

// =============================================================================
// ENVIRONMENT
// =============================================================================

/**
 * Environment mode
 */
export type Environment = "development" | "production" | "test";

/**
 * Get current environment
 */
export function getEnvironment(): Environment {
    const env = process.env.NODE_ENV;
    if (env === "production") {
        return "production";
    }
    if (env === "test") {
        return "test";
    }
    return "development";
}

/**
 * Environment checks
 */
export const isProduction = () => getEnvironment() === "production";
export const isDevelopment = () => getEnvironment() === "development";
export const isTest = () => getEnvironment() === "test";

// =============================================================================
// APPLICATION CONFIG
// =============================================================================

/**
 * Application configuration interface
 */
export interface AppConfig {
    /** Environment mode */
    readonly environment: Environment;

    /** Application name */
    readonly appName: string;

    /** Base URL for the application */
    readonly baseUrl: string;

    /** API configuration */
    readonly api: ApiConfig;

    /** Authentication configuration */
    readonly auth: AuthConfig;

    /** Cache configuration */
    readonly cache: CacheConfig;

    /** Chat configuration */
    readonly chat: ChatConfig;

    /** Database configuration */
    readonly database: DatabaseConfig;

    /** Feature flags */
    readonly features: FeatureFlags;
}

/**
 * API configuration
 */
export interface ApiConfig {
    /** API rate limit per minute */
    readonly rateLimitPerMinute: number;

    /** API request timeout in ms */
    readonly requestTimeoutMs: number;

    /** Max request body size in bytes */
    readonly maxBodySizeBytes: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
    /** JWT expiration in seconds */
    readonly jwtExpirationSeconds: number;

    /** Guest session TTL in seconds */
    readonly guestTtlSeconds: number;

    /** Session rotation threshold in seconds */
    readonly rotationThresholdSeconds: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
    /** Default cache TTL in seconds */
    readonly defaultTtlSeconds: number;

    /** Chat cache TTL in seconds */
    readonly chatTtlSeconds: number;

    /** Message cache TTL in seconds */
    readonly messageTtlSeconds: number;

    /** Whether Redis is enabled */
    readonly redisEnabled: boolean;
}

/**
 * Chat configuration
 */
export interface ChatConfig {
    /** Maximum messages per chat */
    readonly maxMessagesPerChat: number;

    /** Maximum chat history items to show */
    readonly maxHistoryItems: number;

    /** Default page size for pagination */
    readonly defaultPageSize: number;

    /** Maximum page size for pagination */
    readonly maxPageSize: number;

    /** Title generation minimum length */
    readonly titleMinLength: number;

    /** Title generation maximum length */
    readonly titleMaxLength: number;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
    /** Connection pool size */
    readonly poolSize: number;

    /** Connection timeout in ms */
    readonly connectionTimeoutMs: number;

    /** Whether to use SSL */
    readonly ssl: boolean;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
    /** Enable guest mode */
    readonly guestMode: boolean;

    /** Enable chat history */
    readonly chatHistory: boolean;

    /** Enable document artifacts */
    readonly documentArtifacts: boolean;

    /** Enable suggestions */
    readonly suggestions: boolean;

    /** Enable analytics */
    readonly analytics: boolean;

    /** Enable debug mode */
    readonly debug: boolean;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_API_CONFIG: ApiConfig = {
    rateLimitPerMinute: 60,
    requestTimeoutMs: 30_000,
    maxBodySizeBytes: 10 * 1024 * 1024, // 10MB
};

const DEFAULT_AUTH_CONFIG: AuthConfig = {
    jwtExpirationSeconds: 3600,
    guestTtlSeconds: 86_400 * 7, // 7 days
    rotationThresholdSeconds: 300,
};

const DEFAULT_CACHE_CONFIG: CacheConfig = {
    defaultTtlSeconds: 3600,
    chatTtlSeconds: 86_400, // 24 hours
    messageTtlSeconds: 3600,
    redisEnabled: false,
};

const DEFAULT_CHAT_CONFIG: ChatConfig = {
    maxMessagesPerChat: 1000,
    maxHistoryItems: 50,
    defaultPageSize: 20,
    maxPageSize: 100,
    titleMinLength: 10,
    titleMaxLength: 100,
};

const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
    poolSize: 10,
    connectionTimeoutMs: 10_000,
    ssl: true,
};

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
    guestMode: true,
    chatHistory: true,
    documentArtifacts: true,
    suggestions: true,
    analytics: false,
    debug: false,
};

// =============================================================================
// CONFIG BUILDER
// =============================================================================

/**
 * Parse integer from environment with fallback
 */
function parseIntEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) {
        return defaultValue;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean from environment with fallback
 */
function parseBoolEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) {
        return defaultValue;
    }
    return value.toLowerCase() === "true" || value === "1";
}

/**
 * Build application configuration from environment
 */
function buildConfig(): AppConfig {
    const environment = getEnvironment();

    return {
        environment,
        appName: process.env.NEXT_PUBLIC_APP_NAME || "AI Chatbot",
        baseUrl:
            process.env.NEXT_PUBLIC_BASE_URL ||
            (isProduction() ? "https://example.com" : "http://localhost:3000"),

        api: {
            rateLimitPerMinute: parseIntEnv(
                "API_RATE_LIMIT_PER_MINUTE",
                DEFAULT_API_CONFIG.rateLimitPerMinute
            ),
            requestTimeoutMs: parseIntEnv(
                "API_REQUEST_TIMEOUT_MS",
                DEFAULT_API_CONFIG.requestTimeoutMs
            ),
            maxBodySizeBytes: parseIntEnv(
                "API_MAX_BODY_SIZE_BYTES",
                DEFAULT_API_CONFIG.maxBodySizeBytes
            ),
        },

        auth: {
            jwtExpirationSeconds: parseIntEnv(
                "JWT_EXPIRATION_SECONDS",
                DEFAULT_AUTH_CONFIG.jwtExpirationSeconds
            ),
            guestTtlSeconds: parseIntEnv(
                "GUEST_TTL_SECONDS",
                DEFAULT_AUTH_CONFIG.guestTtlSeconds
            ),
            rotationThresholdSeconds: parseIntEnv(
                "ROTATION_THRESHOLD_SECONDS",
                DEFAULT_AUTH_CONFIG.rotationThresholdSeconds
            ),
        },

        cache: {
            defaultTtlSeconds: parseIntEnv(
                "CACHE_DEFAULT_TTL_SECONDS",
                DEFAULT_CACHE_CONFIG.defaultTtlSeconds
            ),
            chatTtlSeconds: parseIntEnv(
                "CACHE_CHAT_TTL_SECONDS",
                DEFAULT_CACHE_CONFIG.chatTtlSeconds
            ),
            messageTtlSeconds: parseIntEnv(
                "CACHE_MESSAGE_TTL_SECONDS",
                DEFAULT_CACHE_CONFIG.messageTtlSeconds
            ),
            redisEnabled: parseBoolEnv(
                "REDIS_ENABLED",
                !!process.env.CACHE_KV_REST_API_URL
            ),
        },

        chat: {
            maxMessagesPerChat: parseIntEnv(
                "CHAT_MAX_MESSAGES",
                DEFAULT_CHAT_CONFIG.maxMessagesPerChat
            ),
            maxHistoryItems: parseIntEnv(
                "CHAT_MAX_HISTORY_ITEMS",
                DEFAULT_CHAT_CONFIG.maxHistoryItems
            ),
            defaultPageSize: parseIntEnv(
                "CHAT_DEFAULT_PAGE_SIZE",
                DEFAULT_CHAT_CONFIG.defaultPageSize
            ),
            maxPageSize: parseIntEnv(
                "CHAT_MAX_PAGE_SIZE",
                DEFAULT_CHAT_CONFIG.maxPageSize
            ),
            titleMinLength: parseIntEnv(
                "CHAT_TITLE_MIN_LENGTH",
                DEFAULT_CHAT_CONFIG.titleMinLength
            ),
            titleMaxLength: parseIntEnv(
                "CHAT_TITLE_MAX_LENGTH",
                DEFAULT_CHAT_CONFIG.titleMaxLength
            ),
        },

        database: {
            poolSize: parseIntEnv(
                "DATABASE_POOL_SIZE",
                DEFAULT_DATABASE_CONFIG.poolSize
            ),
            connectionTimeoutMs: parseIntEnv(
                "DATABASE_CONNECTION_TIMEOUT_MS",
                DEFAULT_DATABASE_CONFIG.connectionTimeoutMs
            ),
            ssl: parseBoolEnv("DATABASE_SSL", DEFAULT_DATABASE_CONFIG.ssl),
        },

        features: {
            guestMode: parseBoolEnv(
                "FEATURE_GUEST_MODE",
                DEFAULT_FEATURE_FLAGS.guestMode
            ),
            chatHistory: parseBoolEnv(
                "FEATURE_CHAT_HISTORY",
                DEFAULT_FEATURE_FLAGS.chatHistory
            ),
            documentArtifacts: parseBoolEnv(
                "FEATURE_DOCUMENT_ARTIFACTS",
                DEFAULT_FEATURE_FLAGS.documentArtifacts
            ),
            suggestions: parseBoolEnv(
                "FEATURE_SUGGESTIONS",
                DEFAULT_FEATURE_FLAGS.suggestions
            ),
            analytics: parseBoolEnv(
                "FEATURE_ANALYTICS",
                DEFAULT_FEATURE_FLAGS.analytics
            ),
            debug: parseBoolEnv(
                "DEBUG",
                environment === "development" || DEFAULT_FEATURE_FLAGS.debug
            ),
        },
    };
}

// =============================================================================
// SINGLETON CONFIG
// =============================================================================

let cachedConfig: AppConfig | null = null;

/**
 * Get application configuration
 *
 * Returns a cached singleton instance of the app configuration.
 * Configuration is built from environment variables on first access.
 *
 * @returns Application configuration
 *
 * @example
 * ```ts
 * const config = getAppConfig();
 * console.log(config.chat.maxMessagesPerChat);
 * ```
 */
export function getAppConfig(): AppConfig {
    if (!cachedConfig) {
        cachedConfig = buildConfig();
    }
    return cachedConfig;
}

/**
 * Reset configuration cache
 *
 * Useful for testing when environment variables change.
 * Should not be called in production code.
 */
export function resetConfigCache(): void {
    cachedConfig = null;
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get a specific config section
 */
export const getApiConfig = () => getAppConfig().api;
export const getAuthConfig = () => getAppConfig().auth;
export const getCacheConfig = () => getAppConfig().cache;
export const getChatConfig = () => getAppConfig().chat;
export const getDatabaseConfig = () => getAppConfig().database;
export const getFeatureFlags = () => getAppConfig().features;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return getAppConfig().features[feature];
}
