/**
 * Core TypeScript Type Definitions
 *
 * Base types used across the lib/ layer for API responses,
 * database entities, environment configuration, and utilities.
 *
 * @module lib/types
 */

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Generic API response wrapper for standardizing API responses.
 *
 * @template T - The type of data returned on success
 *
 * @example
 * ```typescript
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: { id: '123', email: 'user@example.com' }
 * };
 * ```
 */
export interface ApiResponse<T> {
	/** Whether the request was successful */
	success: boolean
	/** Response data (present when success is true) */
	data?: T
	/** Error information (present when success is false) */
	error?: ApiError
	/** Optional metadata about the response */
	meta?: ResponseMetadata
}

/**
 * Paginated list response with metadata for pagination controls.
 *
 * @template T - The type of items in the data array
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<Chat> = {
 *   success: true,
 *   data: [...chats],
 *   pagination: { page: 1, pageSize: 20, total: 100, hasMore: true }
 * };
 * ```
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	/** Pagination metadata */
	pagination: PaginationMetadata
}

/**
 * Error response structure with standardized error information.
 */
export interface ApiError {
	/** Machine-readable error code */
	code: string
	/** Human-readable error message */
	message: string
	/** Additional error details (validation errors, etc.) */
	details?: Record<string, unknown>
	/** HTTP status code */
	statusCode?: number
}

/**
 * Metadata for API responses.
 */
export interface ResponseMetadata {
	/** Request timestamp */
	timestamp?: Date
	/** Request ID for tracing */
	requestId?: string
	/** Cache hit indicator */
	cached?: boolean
}

/**
 * Pagination metadata for list responses.
 */
export interface PaginationMetadata {
	/** Current page number (1-indexed) */
	page: number
	/** Number of items per page */
	pageSize: number
	/** Total number of items */
	total: number
	/** Whether more pages exist */
	hasMore: boolean
	/** Total number of pages */
	totalPages?: number
}

// =============================================================================
// Database Entity Types
// =============================================================================

/**
 * Base interface for all database entities.
 * Provides common fields present in all database tables.
 */
export interface DatabaseEntity {
	/** Unique identifier (UUID) */
	id: string
	/** Record creation timestamp */
	createdAt: Date
	/** Record last update timestamp */
	updatedAt: Date
}

/**
 * User entity type aligned with lib/db/schema.ts
 * Represents a user account in the system.
 */
export interface UserEntity extends DatabaseEntity {
	/** User email address (unique) */
	email: string
	/** Hashed password (null for OAuth/guest users) */
	passwordHash: string | null
	/** Last successful login timestamp */
	lastLogin: Date | null
}

/**
 * Chat entity type aligned with lib/db/schema.ts
 * Represents a chat conversation.
 */
export interface ChatEntity extends DatabaseEntity {
	/** Conversation title */
	title: string
	/** Owner user ID */
	userId: string
	/** Public or private visibility */
	visibility: "public" | "private"
	/** Last context for state restoration */
	lastContext: unknown | null
}

/**
 * Message entity type aligned with lib/db/schema.ts
 * Represents a message within a chat conversation.
 */
export interface MessageEntity extends DatabaseEntity {
	/** Parent chat ID */
	chatId: string
	/** Message sender role */
	role: "user" | "assistant" | "system"
	/** Structured message parts (content blocks) */
	parts: unknown
	/** File attachments metadata */
	attachments: unknown
}

/**
 * Artifact entity type aligned with lib/db/schema.ts
 * Represents versioned content created during chats.
 */
export interface ArtifactEntity extends DatabaseEntity {
	/** Artifact title */
	title: string
	/** Artifact content (text, code, etc.) */
	content: string | null
	/** Artifact type */
	kind: "text" | "code" | "image" | "sheet"
	/** Owner user ID */
	userId: string
	/** Associated chat ID */
	chatId: string
}

/**
 * Vote entity type aligned with lib/db/schema.ts
 * Represents a message vote (upvote/downvote).
 */
export interface VoteEntity {
	/** Chat ID */
	chatId: string
	/** Message ID */
	messageId: string
	/** User who voted */
	userId: string
	/** Vote direction (true = upvote, false = downvote) */
	isUpvoted: boolean
}

/**
 * Suggestion entity type aligned with lib/db/schema.ts
 * Represents an AI-generated suggestion for artifact modification.
 */
export interface SuggestionEntity extends DatabaseEntity {
	/** Target artifact ID */
	artifactId: string
	/** Target artifact version timestamp */
	artifactCreatedAt: Date
	/** Original text to be replaced */
	originalText: string
	/** Suggested replacement text */
	suggestedText: string
	/** Optional description of the suggestion */
	description: string | null
	/** Whether the suggestion has been applied/dismissed */
	isResolved: boolean
	/** User who owns the suggestion */
	userId: string
}

// =============================================================================
// Environment Types
// =============================================================================

/**
 * Environment configuration type matching all environment variables
 * from .env.example
 *
 * @see .env.example for variable descriptions
 */
export interface EnvConfig {
	// Authentication (Auth.js / NextAuth)
	/** Auth.js URL */
	AUTH_URL?: string
	/** Auth.js secret for JWT signing */
	AUTH_SECRET?: string
	/** NextAuth URL (legacy) */
	NEXTAUTH_URL?: string
	/** Secret for guest JWT tokens */
	GUEST_JWT_SECRET?: string

	// Database (Supabase PostgreSQL)
	/** Primary database connection URL */
	DATABASE_URL?: string
	/** Postgres URL (Supabase pooled) */
	POSTGRES_URL?: string
	/** Prisma-accelerated URL */
	POSTGRES_PRISMA_URL?: string
	/** Non-pooling connection URL */
	POSTGRES_URL_NON_POOLING?: string
	/** Database host */
	POSTGRES_HOST?: string
	/** Database name */
	POSTGRES_DATABASE?: string
	/** Database user */
	POSTGRES_USER?: string
	/** Database password */
	POSTGRES_PASSWORD?: string

	// Supabase
	/** Supabase project URL (public) */
	NEXT_PUBLIC_SUPABASE_URL?: string
	/** Supabase anonymous key (public) */
	NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
	/** Supabase project URL (server) */
	SUPABASE_URL?: string
	/** Supabase anonymous key (server) */
	SUPABASE_ANON_KEY?: string
	/** Supabase JWT secret for token verification */
	SUPABASE_JWT_SECRET?: string
	/** Supabase service role key (elevated permissions) */
	SUPABASE_SERVICE_ROLE_KEY?: string

	// Redis Cache (Upstash)
	/** Redis connection URL */
	CACHE_KV_URL?: string
	/** Upstash REST API URL */
	CACHE_KV_REST_API_URL?: string
	/** Upstash REST API token */
	CACHE_KV_REST_API_TOKEN?: string
	/** Upstash REST API read-only token */
	CACHE_KV_REST_API_READ_ONLY_TOKEN?: string
	/** Redis connection URL (alternative) */
	CACHE_REDIS_URL?: string

	// AI Providers
	/** Google Gemini API key */
	GEMINI_API_KEY?: string
	/** OpenAI API key */
	OPENAI_API_KEY?: string
	/** OpenRouter API key */
	OPENROUTER_API_KEY?: string

	// Vercel Services
	/** Vercel Blob read/write token */
	BLOB_READ_WRITE_TOKEN?: string
	/** Sentry DSN for error tracking */
	NEXT_PUBLIC_SENTRY_DSN?: string
}

/**
 * Required environment variables that must be present for the app to function.
 */
export type RequiredEnvVars = Pick<
	EnvConfig,
	| "DATABASE_URL"
	| "SUPABASE_URL"
	| "SUPABASE_ANON_KEY"
	| "SUPABASE_JWT_SECRET"
>

/**
 * Optional environment variables with defaults or fallbacks.
 */
export type OptionalEnvVars = Omit<EnvConfig, keyof RequiredEnvVars>

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Optional type representing a value that may be null or undefined.
 * Use instead of `T | null | undefined` for clarity.
 *
 * @template T - The wrapped type
 *
 * @example
 * ```typescript
 * function findUser(id: string): Maybe<User> {
 *   return users.get(id) ?? null;
 * }
 * ```
 */
export type Maybe<T> = T | null | undefined

/**
 * Result type for async operations with explicit error handling.
 * Follows the Result/Either pattern from functional programming.
 *
 * @template T - Success value type
 * @template E - Error type (defaults to ApiError)
 *
 * @example
 * ```typescript
 * type Result = AsyncResult<User, ValidationError>;
 * // Success: { success: true; data: User }
 * // Error: { success: false; error: ValidationError }
 * ```
 */
export type AsyncResult<T, E = ApiError> =
	| { success: true; data: T }
	| { success: false; error: E }

/**
 * Deep partial utility type that makes all nested properties optional.
 * Useful for partial updates and merge operations.
 *
 * @template T - The type to make deeply partial
 *
 * @example
 * ```typescript
 * interface User {
 *   profile: { name: string; age: number };
 * }
 *
 * const update: DeepPartial<User> = {
 *   profile: { name: 'Updated' } // age is optional
 * };
 * ```
 */
export type DeepPartial<T> = T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T

/**
 * Make specific keys of a type optional.
 *
 * @template T - The base type
 * @template K - Keys to make optional (must be keys of T)
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type UpdatableUser = PartialBy<User, 'id'>;
 * // { id?: string; name: string; email: string }
 * ```
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific keys of a type required.
 *
 * @template T - The base type
 * @template K - Keys to make required (must be keys of T)
 *
 * @example
 * ```typescript
 * interface User {
 *   id?: string;
 *   name?: string;
 *   email: string;
 * }
 *
 * type UserWithId = RequiredBy<User, 'id' | 'name'>;
 * // { id: string; name: string; email: string }
 * ```
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Extract the element type from an array type.
 *
 * @template T - Array type to extract element from
 *
 * @example
 * ```typescript
 * type StringArray = string[];
 * type Element = ArrayElement<StringArray>; // string
 * ```
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never

/**
 * Extract the value type from a record/object type.
 *
 * @template T - Record type to extract value from
 *
 * @example
 * ```typescript
 * type UserMap = Record<string, User>;
 * type UserType = ValueOf<UserMap>; // User
 * ```
 */
export type ValueOf<T> = T[keyof T]

/**
 * Brand type for nominal typing.
 * Creates a distinct type that is structurally compatible but nominally different.
 *
 * @template T - The underlying type
 * @template B - The brand symbol
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>;
 * type ChatId = Brand<string, 'ChatId'>;
 *
 * // These won't mix even though both are strings
 * ```
 */
export type Brand<T, B extends string> = T & { readonly __brand: B }

/**
 * Extract the parameters of a function type as a tuple.
 *
 * @template T - Function type to extract parameters from
 *
 * @example
 * ```typescript
 * function greet(name: string, age: number): void {}
 * type Params = Parameters<typeof greet>; // [string, number]
 * ```
 */
export type FunctionParameters<T> = T extends (...args: infer P) => unknown
	? P
	: never

/**
 * Extract the return type of a function type.
 *
 * @template T - Function type to extract return type from
 *
 * @example
 * ```typescript
 * function createUser(): User { ... }
 * type Result = FunctionReturn<typeof createUser>; // User
 * ```
 */
export type FunctionReturn<T> = T extends (...args: unknown[]) => infer R
	? R
	: never

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is defined (not null or undefined).
 *
 * @param value - The value to check
 * @returns True if the value is defined
 *
 * @example
 * ```typescript
 * const items = [1, null, 2, undefined, 3];
 * const defined = items.filter(isDefined); // [1, 2, 3]
 * ```
 */
export function isDefined<T>(value: Maybe<T>): value is T {
	return value !== null && value !== undefined
}

/**
 * Type guard to check if a value is an ApiResponse.
 *
 * @param value - The value to check
 * @returns True if the value is an ApiResponse
 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		typeof (value as ApiResponse<T>).success === "boolean"
	)
}

/**
 * Type guard to check if a value is a PaginatedResponse.
 *
 * @param value - The value to check
 * @returns True if the value is a PaginatedResponse
 */
export function isPaginatedResponse<T>(
	value: unknown,
): value is PaginatedResponse<T> {
	return (
		isApiResponse(value) &&
		"pagination" in value &&
		typeof (value as PaginatedResponse<T>).pagination === "object"
	)
}

/**
 * Type guard to check if a value is an ApiError.
 *
 * @param value - The value to check
 * @returns True if the value is an ApiError
 */
export function isApiError(value: unknown): value is ApiError {
	return (
		typeof value === "object" &&
		value !== null &&
		"code" in value &&
		"message" in value &&
		typeof (value as ApiError).code === "string" &&
		typeof (value as ApiError).message === "string"
	)
}
