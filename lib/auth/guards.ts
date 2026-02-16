/**
 * Authorization Guards
 *
 * Provides authorization guard functions for protecting server actions,
 * API routes, and page components.
 *
 * @module lib/auth/guards
 */

import { redirect } from "next/navigation"
import { ForbiddenError, UnauthorizedError } from "@/lib/errors"
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
 * @returns Object containing the user ID
 * @throws Redirects to login page if not authenticated
 *
 * @example
 * ```typescript
 * // In a server component
 * export default async function ProtectedPage() {
 *   const { userId } = await requireAuth({ redirectTo: '/login' });
 *   // ...render protected content
 * }
 * ```
 */
export async function requireAuth(
	options: GuardOptions = {},
): Promise<{ userId: string }> {
	const session = await getSession()

	if (!session?.user.id) {
		if (options.redirectTo) {
			redirect(options.redirectTo)
		}
		throw new UnauthorizedError("Authentication required")
	}

	return { userId: session.user.id }
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
