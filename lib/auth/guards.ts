/**
 * Authorization Guards
 *
 * Provides authorization guard functions for protecting server actions,
 * API routes, and page components.
 *
 * @module lib/auth/guards
 */

import { redirect } from "next/navigation"
import {
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	UnauthorizedError,
	ValidationError,
} from "@/lib/errors"
import {
	getRateLimiter,
	type RateLimitConfig,
	type RateLimiterName,
	type RateLimitResult,
} from "@/lib/rate-limit"
import type { AppSession } from "./session"
import { getSession, getUserId, isAuthenticated, isGuest } from "./session"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for guard functions
 */
export interface GuardOptions {
	/** URL to redirect to if not authenticated (for server components) */
	redirectTo?: string
}

/**
 * Resource with owner ID for ownership checks
 */
export interface OwnedResource {
	/** ID of the user who owns the resource */
	userId: string
}

/**
 * Chat resource for access control
 */
export interface ChatResource extends OwnedResource {
	/** Chat visibility setting */
	visibility?: "public" | "private"
}

// =============================================================================
// Authentication Guards
// =============================================================================

/**
 * Guard for server components - redirects if not authenticated
 *
 * Use in server components that require authentication.
 * For server actions, use requireAuthAction instead.
 *
 * @param options - Guard options including redirect URL
 * @returns Object containing the session and user ID
 * @throws Redirects to login page if not authenticated
 *
 * @example
 * ```typescript
 * // In a server component
 * export default async function ProtectedPage() {
 *   const { session, userId } = await requireAuth({ redirectTo: '/login' });
 *   // ...render protected content with full session access
 * }
 * ```
 */
export async function requireAuth(
	options: GuardOptions = {},
): Promise<{ session: AppSession; userId: string }> {
	const session = await getSession()

	if (!session?.user.id) {
		if (options.redirectTo) {
			redirect(options.redirectTo)
		}
		throw new UnauthorizedError("Authentication required")
	}

	return {
		session,
		userId: session.user.id,
	}
}

/**
 * Guard for server actions - throws if not authenticated
 *
 * Use in server actions that require authentication.
 * Returns the user ID for use in the action.
 *
 * @returns The authenticated user ID
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * 'use server'
 * import { requireAuthAction } from '@/lib/auth/guards';
 *
 * export async function deleteChat(chatId: string) {
 *   const userId = await requireAuthAction();
 *   // ...perform action with userId
 * }
 * ```
 */
export async function requireAuthAction(): Promise<string> {
	const userId = await getUserId()

	if (!userId) {
		throw new UnauthorizedError("Authentication required")
	}

	return userId
}

/**
 * Require authenticated (non-guest) session
 *
 * Use when guest access is not allowed for an operation.
 *
 * @returns The authenticated user ID
 * @throws UnauthorizedError if not authenticated or is a guest
 *
 * @example
 * ```typescript
 * // For operations that require full authentication
 * const userId = await requireAuthenticatedUser();
 * ```
 */
export async function requireAuthenticatedUser(): Promise<string> {
	const session = await getSession()

	if (!session || session.user.type === "guest") {
		throw new UnauthorizedError("Authentication required")
	}

	return session.user.id
}

/**
 * Optional auth - returns userId or null without throwing
 *
 * Use when authentication is optional but you want the user ID if available.
 *
 * @returns Object containing userId (or null) and authentication status
 *
 * @example
 * ```typescript
 * const { userId, isAuthenticated } = await optionalAuth();
 * if (isAuthenticated) {
 *   // User-specific logic
 * }
 * ```
 */
export async function optionalAuth(): Promise<{
	userId: string | null
	isAuthenticated: boolean
}> {
	const userId = await getUserId()
	const authenticated = await isAuthenticated()

	return {
		userId,
		isAuthenticated: authenticated,
	}
}

// =============================================================================
// Authorization Guards
// =============================================================================

/**
 * Verify resource ownership
 *
 * Checks if the current user owns a resource.
 * Throws ForbiddenError if ownership check fails.
 *
 * @param resourceOwnerId - ID of the resource owner
 * @param userId - ID of the current user (optional, uses session if not provided)
 * @throws ForbiddenError if the user doesn't own the resource
 *
 * @example
 * ```typescript
 * const chat = await getChat(chatId);
 * await requireOwnership(chat.userId);
 * // User owns the chat, proceed with operation
 * ```
 */
export async function requireOwnership(
	resourceOwnerId: string,
	userId?: string,
): Promise<void> {
	const currentUserId = userId ?? (await getUserId())

	if (!currentUserId) {
		throw new UnauthorizedError("Authentication required")
	}

	if (currentUserId !== resourceOwnerId) {
		throw new ForbiddenError("You do not have access to this resource")
	}
}

/**
 * Check if a user can access a chat (read permission)
 *
 * Users can access chats if:
 * - They own the chat
 * - The chat is public
 *
 * @param chat - The chat resource to check access for
 * @param userId - ID of the current user (optional, uses session if not provided)
 * @returns true if the user can access the chat
 *
 * @example
 * ```typescript
 * const chat = await getChat(chatId);
 * if (canAccessChat(chat)) {
 *   // User can read the chat
 * }
 * ```
 */
export async function canAccessChat(
	chat: ChatResource,
	userId?: string,
): Promise<boolean> {
	const currentUserId = userId ?? (await getUserId())

	// No session - can only access public chats
	if (!currentUserId) {
		return chat.visibility === "public"
	}

	// Owner can always access
	if (currentUserId === chat.userId) {
		return true
	}

	// Non-owners can access public chats
	return chat.visibility === "public"
}

/**
 * Check if a user can modify a chat (write permission)
 *
 * Users can modify chats only if they own them.
 *
 * @param chat - The chat resource to check modification access for
 * @param userId - ID of the current user (optional, uses session if not provided)
 * @returns true if the user can modify the chat
 *
 * @example
 * ```typescript
 * const chat = await getChat(chatId);
 * if (canModifyChat(chat)) {
 *   // User can edit/delete the chat
 * }
 * ```
 */
export async function canModifyChat(
	chat: ChatResource,
	userId?: string,
): Promise<boolean> {
	const currentUserId = userId ?? (await getUserId())

	// Must be authenticated to modify
	if (!currentUserId) {
		return false
	}

	// Only owner can modify
	return currentUserId === chat.userId
}

/**
 * Require chat access (read permission)
 *
 * @param chat - The chat resource to check access for
 * @throws ForbiddenError if the user cannot access the chat
 *
 * @example
 * ```typescript
 * const chat = await getChat(chatId);
 * await requireChatAccess(chat);
 * // User can read the chat
 * ```
 */
export async function requireChatAccess(chat: ChatResource): Promise<void> {
	const hasAccess = await canAccessChat(chat)

	if (!hasAccess) {
		throw new ForbiddenError("You do not have access to this chat")
	}
}

/**
 * Require chat modification access (write permission)
 *
 * @param chat - The chat resource to check modification access for
 * @throws ForbiddenError if the user cannot modify the chat
 *
 * @example
 * ```typescript
 * const chat = await getChat(chatId);
 * await requireChatModification(chat);
 * // User can edit/delete the chat
 * ```
 */
export async function requireChatModification(
	chat: ChatResource,
): Promise<void> {
	const canModify = await canModifyChat(chat)

	if (!canModify) {
		throw new ForbiddenError(
			"You do not have permission to modify this chat",
		)
	}
}

// =============================================================================
// Guest Session Guards
// =============================================================================

/**
 * Check if the current session is a guest session
 *
 * @returns true if the current user is a guest
 *
 * @example
 * ```typescript
 * if (await isGuestSession()) {
 *   // Apply guest limitations
 * }
 * ```
 */
export async function isGuestSession(): Promise<boolean> {
	const session = await getSession()
	return isGuest(session)
}

/**
 * Require non-guest session
 *
 * @throws UnauthorizedError if the current session is a guest
 *
 * @example
 * ```typescript
 * await requireNonGuest();
 * // User is fully authenticated
 * ```
 */
export async function requireNonGuest(): Promise<void> {
	const session = await getSession()

	if (!session || session.user.type === "guest") {
		throw new UnauthorizedError("Please sign in to continue")
	}
}

// =============================================================================
// Higher-Order Guard Functions
// =============================================================================

/**
 * Higher-order function wrapping server actions with auth
 *
 * @param action - The server action to wrap
 * @returns Wrapped action that requires authentication
 *
 * @example
 * ```typescript
 * export const deleteChat = withAuth(async (chatId: string, userId: string) => {
 *   // userId is guaranteed to be authenticated
 *   await chatRepository.delete(chatId, userId);
 * });
 * ```
 */
export function withAuth<TArgs extends unknown[], TResult>(
	action: (userId: string, ...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
	return async (...args: TArgs) => {
		const userId = await requireAuthAction()
		return action(userId, ...args)
	}
}

/**
 * Higher-order function wrapping server actions with ownership check
 *
 * @param getResourceOwnerId - Function to extract owner ID from args
 * @param action - The server action to wrap
 * @returns Wrapped action that requires ownership
 *
 * @example
 * ```typescript
 * export const updateChat = withOwnership(
 *   (chatId: string) => getChatOwnerId(chatId),
 *   async (chatId: string, updates: Updates, userId: string) => {
 *     // userId is guaranteed to own the resource
 *   }
 * );
 * ```
 */
export function withOwnership<TArgs extends unknown[], TResult>(
	getResourceOwnerId: (...args: TArgs) => Promise<string>,
	action: (...args: [...TArgs, string]) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
	return async (...args: TArgs) => {
		const userId = await requireAuthAction()
		const ownerId = await getResourceOwnerId(...args)

		await requireOwnership(ownerId, userId)

		return action(...args, userId)
	}
}

// =============================================================================
// Rate Limiting Guards
// =============================================================================

/**
 * Enforce rate limiting for an identifier.
 * Throws RateLimitError if rate limit exceeded.
 *
 * @param limiterName - Name of the pre-configured rate limiter
 * @param identifier - User ID or other unique identifier
 * @returns RateLimitResult if allowed
 * @throws RateLimitError if rate limit exceeded
 *
 * @example
 * ```typescript
 * await requireRateLimit('chat', session.user.id);
 * // Request allowed, proceed with operation
 * ```
 */
export async function requireRateLimit(
	limiterName: RateLimiterName,
	identifier: string,
): Promise<RateLimitResult> {
	const limiter = getRateLimiter(limiterName)
	const result = await limiter.consumeToken(identifier)

	if (!result.success) {
		const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
		throw new RateLimitError(
			`Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
			{
				limit: result.limit,
				remaining: result.remaining,
				reset: result.reset,
				retryAfter,
			},
		)
	}

	return result
}

/**
 * Enforce rate limiting with custom configuration.
 * Throws RateLimitError if rate limit exceeded.
 *
 * @param config - Custom rate limit configuration
 * @param identifier - User ID or other unique identifier
 * @returns RateLimitResult if allowed
 * @throws RateLimitError if rate limit exceeded
 *
 * @example
 * ```typescript
 * await requireCustomRateLimit(
 *   { limit: 5, window: 60, prefix: 'custom' },
 *   session.user.id
 * );
 * ```
 */
export async function requireCustomRateLimit(
	config: RateLimitConfig,
	identifier: string,
): Promise<RateLimitResult> {
	const limiter = getRateLimiter("api") // Use api limiter as base
	const result = await limiter.consumeToken(
		`${config.prefix ?? "custom"}:${identifier}`,
	)

	if (!result.success) {
		const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
		throw new RateLimitError(
			`Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
			{
				limit: result.limit,
				remaining: result.remaining,
				reset: result.reset,
				retryAfter,
			},
		)
	}

	return result
}

// =============================================================================
// Resource Guards
// =============================================================================

/**
 * Require that a resource exists.
 * Throws NotFoundError if resource is null/undefined.
 *
 * @typeParam T - The expected resource type
 * @param resource - Resource to check (may be null/undefined)
 * @param resourceType - Name of the resource type for error message
 * @returns The resource (guaranteed non-null)
 * @throws NotFoundError if resource doesn't exist
 *
 * @example
 * ```typescript
 * const chat = requireResource(await chatRepository.findById(chatId), 'Chat');
 * // chat is guaranteed to be non-null here
 * ```
 */
export function requireResource<T>(
	resource: T | null | undefined,
	resourceType: string,
): T {
	if (resource === null || resource === undefined) {
		throw new NotFoundError(resourceType)
	}
	return resource
}

/**
 * Require that a resource exists with an identifier.
 * Throws NotFoundError with identifier if resource is null/undefined.
 *
 * @typeParam T - The expected resource type
 * @param resource - Resource to check (may be null/undefined)
 * @param resourceType - Name of the resource type for error message
 * @param identifier - Resource identifier for error details
 * @returns The resource (guaranteed non-null)
 * @throws NotFoundError if resource doesn't exist
 *
 * @example
 * ```typescript
 * const chat = requireResourceWithId(
 *   await chatRepository.findById(chatId),
 *   'Chat',
 *   chatId
 * );
 * ```
 */
export function requireResourceWithId<T>(
	resource: T | null | undefined,
	resourceType: string,
	identifier: string,
): T {
	if (resource === null || resource === undefined) {
		throw new NotFoundError(resourceType, identifier)
	}
	return resource
}

// =============================================================================
// Request Validation Guards
// =============================================================================

/**
 * Parse and validate a timestamp string.
 * Throws ValidationError if the timestamp is invalid.
 *
 * @param value - ISO timestamp string to parse
 * @returns Parsed Date object
 * @throws ValidationError if timestamp is invalid
 *
 * @example
 * ```typescript
 * const timestamp = parseTimestamp('2024-01-15T10:30:00Z');
 * // timestamp is a valid Date object
 * ```
 */
export function parseTimestamp(value: string): Date {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		throw new ValidationError("Invalid timestamp format", {
			value,
			expected: "ISO 8601 timestamp string",
		})
	}

	return date
}

/**
 * Extract a required query parameter from a URL.
 * Throws ValidationError if the parameter is missing.
 *
 * @param url - URL object to extract from
 * @param name - Name of the query parameter
 * @returns The parameter value
 * @throws ValidationError if parameter is missing
 *
 * @example
 * ```typescript
 * const url = new URL(request.url);
 * const chatId = requireQueryParam(url, 'chatId');
 * // chatId is guaranteed to be a non-empty string
 * ```
 */
export function requireQueryParam(url: URL, name: string): string {
	const value = url.searchParams.get(name)

	if (!value || value.trim() === "") {
		throw new ValidationError(`Missing required query parameter: ${name}`, {
			parameter: name,
		})
	}

	return value
}

/**
 * Extract an optional query parameter from a URL.
 * Returns null if the parameter is missing or empty.
 *
 * @param url - URL object to extract from
 * @param name - Name of the query parameter
 * @returns The parameter value or null
 *
 * @example
 * ```typescript
 * const url = new URL(request.url);
 * const limit = getQueryParam(url, 'limit');
 * // limit is string | null
 * ```
 */
export function getQueryParam(url: URL, name: string): string | null {
	const value = url.searchParams.get(name)
	return value && value.trim() !== "" ? value : null
}

// =============================================================================
// Full Session Auth Guard
// =============================================================================

/**
 * Require authentication and return full session.
 * Use when you need access to the complete session object.
 *
 * @returns Object containing session and userId
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * const { session, userId } = await requireAuthWithSession();
 * console.log(session.user.email); // Access full session data
 * ```
 *
 * @deprecated Use `requireAuth()` instead - it now returns the same type.
 * This function is kept for backward compatibility.
 */
export async function requireAuthWithSession(): Promise<{
	session: AppSession
	userId: string
}> {
	return requireAuth()
}
