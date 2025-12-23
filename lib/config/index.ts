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
// Environment validation
export {
    getConfiguredProviders,
    validateEnvironment,
    validateEnvOrThrow,
} from "./env-validation";
