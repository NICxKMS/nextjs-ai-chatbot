/**
 * Configuration Module - Public API
 *
 * Centralized configuration management for the application.
 *
 * @module lib/config
 */

export type {
    ApiConfig,
    AppConfig,
    AuthConfig,
    CacheConfig,
    ChatConfig,
    DatabaseConfig,
    Environment,
    FeatureFlags,
} from "./app-config";
export {
    // Section getters
    getApiConfig,
    // Main config getter
    getAppConfig,
    getAuthConfig,
    getCacheConfig,
    getChatConfig,
    getDatabaseConfig,
    // Environment helpers
    getEnvironment,
    getFeatureFlags,
    isDevelopment,
    // Feature flag helper
    isFeatureEnabled,
    isProduction,
    isTest,
    resetConfigCache,
} from "./app-config";
// Client-side environment guard (P2-013)
export type { ClientEnvType } from "./client-env";
export {
    ClientEnvServerAccessError,
    ClientEnvValidationError,
    clientEnv,
    clientEnvSchema,
    getClientEnv,
    isClientEnvAvailable,
    resetClientEnvCache,
} from "./client-env";
// Zod-validated environment (P2-019, P2-020)
export type { ClientEnv, Env, ServerEnv } from "./env";
export {
    env,
    isDevelopment as isDevEnv,
    isProduction as isProdEnv,
    isTest as isTestEnv,
    isVercel,
} from "./env";
// Environment validation
export {
    getConfiguredProviders,
    validateEnvironment,
    validateEnvOrThrow,
} from "./env-validation";
// Security constants (P3-036)
export {
    AUTH_SESSION_TTL_SECONDS,
    CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
    CLIENT_SUBMIT_RATE_LIMIT,
    CLIENT_UPLOAD_RATE_LIMIT,
    DEFAULT_MAX_DOCUMENT_SIZE_BYTES,
    DEFAULT_NETWORK_TIMEOUT_MS,
    DOCUMENT_PREVIEW_CACHE_TTL_MS,
    GUEST_SESSION_TTL_SECONDS,
    MAX_ATTACHMENT_FILE_SIZE_BYTES,
    MAX_CHAT_MESSAGE_LENGTH,
    MAX_CODE_DOCUMENT_SIZE_BYTES,
    MAX_CONCURRENT_UPLOADS,
    MAX_CONSECUTIVE_NEWLINES,
    MAX_DISPLAY_FILENAME_LENGTH,
    MAX_FILENAME_LENGTH,
    MAX_IMAGE_DOCUMENT_SIZE_BYTES,
    MAX_REQUEST_BODY_SIZE_BYTES,
    MAX_SHEET_DOCUMENT_SIZE_BYTES,
    MAX_TEXT_DOCUMENT_SIZE_BYTES,
    MAX_UPLOAD_FILE_SIZE_BYTES,
    RATE_LIMIT_REDIS_TIMEOUT_MS,
    SESSION_CACHE_TTL_SECONDS,
    USER_RATE_LIMITS,
} from "./security-constants";
