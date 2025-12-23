/**
 * Utility Functions
 *
 * Exports common utility functions used throughout the application.
 *
 * @module lib/utils
 */

export {
    type AnalyticsEvent,
    analytics,
    type EventCategory,
    type TimingEvent,
    trackAuthEvent,
    trackChatEvent,
    trackPerformance,
    type UserProperties,
} from "./analytics";
export { cn } from "./cn";
export { debounce, debounceLeading } from "./debounce";
export {
    type DebugState,
    debug,
    getEnvironmentInfo,
    getMemoryUsage,
    type PerformanceMark,
} from "./debug";
export {
    BORDER_RADIUS,
    type BorderRadius,
    BREAKPOINTS,
    type Breakpoint,
    cssVar,
    DURATION,
    DURATION_CSS,
    type Duration,
    EASING,
    type Easing,
    getAnimationDuration,
    MEDIA_QUERIES,
    matchesBreakpoint,
    prefersReducedMotion,
    SPACING,
    type Spacing,
    Z_INDEX,
    type ZIndex,
} from "./design-tokens";
export {
    extractErrorMessage,
    type FriendlyError,
    getFriendlyError,
    mapHttpError,
    mapSupabaseError,
} from "./error-messages";
export {
    addConditionalListener,
    addMediaQueryListener,
    addOnceListener,
    createDebouncedListener,
    createEventListenerManager,
    createThrottledListener,
    type DebouncedListener,
    type EventListenerEntry,
    type EventListenerManager,
    getPassiveOptions,
    supportsPassiveListeners,
    type ThrottledListener,
} from "./event-listener";
export {
    type FeatureFlag,
    type FeatureFlagConfig,
    type FeatureFlagValue,
    featureFlags,
    useFeatureFlag,
    withFeatureFlag,
} from "./feature-flags";
export type {
    FetchWithRetryOptions,
    RetryConfig,
} from "./fetch-with-retry";
export {
    createRetryFetch,
    createTimeoutController,
    fetchWithRetry,
} from "./fetch-with-retry";
export {
    compose,
    email,
    errorsToRecord,
    type FieldError,
    type FormState,
    getFormBoolean,
    getFormNumber,
    getFormString,
    maxLength,
    minLength,
    pattern,
    required,
    sanitizeChatInput,
    uuid,
    type ValidationResult,
    type Validator,
    validateChatInput,
    validateForm,
} from "./form-helpers";
export {
    CardSkeleton,
    clientOnlyComponent,
    createPreloader,
    EditorSkeleton,
    generatePlaceholder,
    type LazyComponentOptions,
    type LazyLoadOptions,
    LoadingSkeleton,
    lazyComponent,
    observeElement,
    type PreloadOptions,
    preloadModule,
    preloadModules,
    shimmerPlaceholder,
    supportsIntersectionObserver,
} from "./lazy";
export {
    createRequestLogger,
    type LogContext,
    type LogEntry,
    type Logger,
    type LogLevel,
    logger,
    type SerializedError,
    serializeError,
} from "./logger";
export { fetchWithErrorHandlers } from "./network";
export {
    type ApiResponse,
    type NormalizedChatItem,
    type NormalizedEntity,
    type NormalizedMessage,
    type NormalizedMessagePart,
    normalizeChatItem,
    normalizeDate,
    normalizeDateFields,
    normalizeEntities,
    normalizeEntity,
    normalizeError,
    normalizeMessage,
    normalizeMessagePart,
    normalizeOptionalString,
    normalizePaginated,
    normalizeString,
    normalizeSuccess,
    type PaginatedResponse,
} from "./normalize";
export {
    createRateLimiter,
    type RateLimitConfig,
    RateLimiters,
    type RateLimitResult,
    withRateLimit,
} from "./rate-limit-client";
export {
    isNonEmptyString,
    isPositiveInteger,
    sanitizeFilename,
    sanitizeText,
    sanitizeUrlParam,
    sanitizeUUID,
} from "./sanitize";
export {
    loadPersistedState,
    persistState,
    type SessionState,
    useClearSession,
    useDraftPersistence,
    usePersistedState,
    useSessionHydration,
    useSidebarPersistence,
} from "./session-persistence";
export {
    type StorageKey,
    StorageKeys,
    type StorageResult,
    storage,
} from "./storage";
export {
    useDynamicImport,
    useLazyLoad,
    usePreloadOnInteraction,
} from "./use-lazy-load";

/**
 * Generate a cryptographically secure UUID v4
 *
 * @returns A new UUID string
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Convert database messages to AI SDK UIMessage format.
 *
 * @param messages - Array of database message rows
 * @returns Array of UIMessage compatible objects
 */
export function convertToUIMessages<
    T extends {
        id: string;
        role: "user" | "assistant" | "system";
        parts: unknown;
        createdAt: Date;
    },
>(
    messages: T[]
): Array<{
    id: string;
    role: "user" | "assistant" | "system";
    parts: unknown[];
    createdAt: Date;
}> {
    return messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: (message.parts ?? []) as unknown[],
        createdAt: message.createdAt,
    }));
}
