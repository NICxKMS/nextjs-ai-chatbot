/**
 * Type Definitions and Guards
 *
 * Central export point for all shared TypeScript types and runtime type guards.
 * Use these types for API responses, database entities, and cross-module interfaces.
 *
 * @example
 * ```typescript
 * import type { ApiMessage, ApiChat, PaginatedResponse } from '@/lib/types';
 * import { isApiMessage, safeJsonParse, assertType } from '@/lib/types';
 *
 * // Runtime validation
 * const data = await response.json();
 * if (isApiMessage(data)) {
 *   // data is typed as ApiMessage
 * }
 *
 * // Safe JSON parsing with type guard
 * const message = safeJsonParse(jsonString, isApiMessage);
 * ```
 *
 * @module lib/types
 */

// AI SDK extended types for forward compatibility
export {
    type ExtendedToolState,
    isApprovalState,
    isCompletedState,
    isPendingState,
    type ToolUIPart,
} from "./ai-sdk";
// Shared artifact types (used by lib/ and features/)
export type { ArtifactKind } from "./artifacts";
// Runtime type guards for API responses
export {
    type ApiChat,
    type ApiDocument,
    type ApiErrorResponse,
    // API response types
    type ApiMessage,
    type ApiVote,
    assertType,
    // Paginated response utilities
    createPaginatedResponseGuard,
    isApiChat,
    isApiChatArray,
    isApiDocument,
    isApiErrorResponse,
    // API response guards
    isApiMessage,
    isApiMessageArray,
    isApiVote,
    isApiVoteArray,
    isArray,
    isBoolean,
    isNumber,
    // Primitive guards
    isObject,
    isString,
    type PaginatedResponse,
    // Utility functions
    safeJsonParse,
} from "./guards";
// Shared model types (used by lib/ and features/)
export type { ModelCapabilities, ModelMetadata } from "./models";
