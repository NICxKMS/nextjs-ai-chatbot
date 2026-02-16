/**
 * API Utilities
 *
 * Standardized API response builders, validation helpers, and request context.
 * Provides consistent patterns for API routes and server actions.
 *
 * @module lib/api
 *
 * @example
 * ```typescript
 * // In an API route
 * import { success, error, validateBody, withRequestContext } from '@/lib/api';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * export const POST = withRequestContext(async (request) => {
 *   try {
 *     const body = await validateBody(request, schema);
 *     // Process body...
 *     return success({ userId: '123' });
 *   } catch (err) {
 *     return error(err);
 *   }
 * });
 * ```
 */

// =============================================================================
// Response Builders
// =============================================================================

export {
	// Error responses
	error,
	forbidden,
	// Utilities
	json,
	notFound,
	// Paginated response
	paginated,
	rateLimit,
	redirect,
	// Streaming response
	stream,
	// Success responses
	success,
	successNoContent,
	unauthorized,
	validationError,
	withRequestId,
} from "./response"

// =============================================================================
// Validation Helpers
// =============================================================================

// Export validation result type
export type { ValidationResult } from "./validation"
export {
	artifactKindSchema,
	chatIdParamSchema,
	createRequiredStringSchema,
	createUUIDSchema,
	idParamSchema,
	isValidEmail,
	isValidUrl,
	// Utility functions
	isValidUUID,
	paginationSchema,
	// Common schemas
	uuidSchema,
	// Body validation
	validateBody,
	validateBodySafe,
	// Form data validation
	validateFormData,
	// Params validation
	validateParams,
	validateParamsSafe,
	// Query validation
	validateQuery,
	validateQuerySafe,
	visibilitySchema,
	voteTypeSchema,
} from "./validation"

// =============================================================================
// Request Context
// =============================================================================

// Export context types
export type {
	ApiContext,
	ContextOptions,
	RequestContext,
} from "./context"
export {
	// Context creation
	createRequestContext,
	// Formatting
	formatRequestContext,
	// ID generation
	generateRequestId,
	getApiContext,
	// Request utilities
	getClientIp,
	getCurrentUserId,
	getOrCreateRequestId,
	// Context accessors
	getRequestContext,
	getRequestDuration,
	getRequestId,
	getSearchParams,
	// Context execution
	runWithRequestContext,
	runWithRequestContextAsync,
	setRequestUser,
	// Context updates
	updateRequestContext,
	validateOrigin,
	// Route wrapper
	withRequestContext,
} from "./context"
