/**
 * Services Layer - Public API
 *
 * This module exports business logic services that sit between the API/action
 * layer and the data layer. Services handle validation, authorization,
 * business rules, and provide a clean interface for operations.
 *
 * @module lib/services
 */

// =============================================================================
// AUTH SERVICE
// =============================================================================

export type {
    AuthServiceResult,
    MigrateGuestParams,
} from "./auth-service";
export { AuthService, migrateGuestToAuthUser } from "./auth-service";

// =============================================================================
// CHAT SERVICE
// =============================================================================

export type {
    ChatServiceResult,
    ChatWithMeta,
    CreateChatParams,
    ListChatsOptions,
    UpdateChatParams,
} from "./chat-service";
export {
    // Main service object
    ChatService,
    // Individual functions
    createChat,
    deleteAllUserChats,
    deleteChat,
    generateChatTitle,
    getChat,
    getChatWithMessages,
    listChats,
    updateChat,
    verifyChatOwnership,
} from "./chat-service";

// =============================================================================
// DOCUMENT SERVICE
// =============================================================================

export type {
    AppendVersionParams,
    CreateDocumentParams,
    DocumentServiceResult,
    DocumentWithMeta,
} from "./document-service";
export {
    // Individual functions
    appendDocumentVersion,
    createDocument,
    // Main service object
    DocumentService,
    deleteDocument,
    deleteDocumentVersionsAfterTimestamp,
    getAllDocumentVersions,
    getDocument,
    getDocumentKindLabel,
    getDocumentSuggestions,
    getLatestDocument,
    verifyDocumentOwnership,
} from "./document-service";

// =============================================================================
// ERROR LOGGER SERVICE
// =============================================================================

export type {
    ErrorLogEntry,
    ErrorLogLevel,
    ErrorLogOptions,
    ScopedErrorLogger,
} from "./error-logger";
export { errorLogger } from "./error-logger";

// =============================================================================
// API METRICS SERVICE
// =============================================================================

export type {
    ApiMetricsConfig,
    EndpointMetrics,
    ErrorMetric,
    MetricsSummary,
    RequestMetric,
} from "./api-metrics";
export { ApiMetricsCollector, apiMetrics, withMetrics } from "./api-metrics";

// =============================================================================
// RE-EXPORT CONFIG
// =============================================================================

export type {
    ApiConfig,
    AppConfig,
    AuthConfig,
    CacheConfig,
    ChatConfig,
    DatabaseConfig,
    Environment,
    FeatureFlags,
} from "@/lib/config/app-config";
export {
    getApiConfig,
    getAppConfig,
    getAuthConfig,
    getCacheConfig,
    getChatConfig,
    getDatabaseConfig,
    getFeatureFlags,
    isDevelopment,
    isFeatureEnabled,
    isProduction,
    isTest,
} from "@/lib/config/app-config";
