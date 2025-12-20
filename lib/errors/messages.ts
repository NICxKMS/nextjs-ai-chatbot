/**
 * Error Message Catalog
 * @module lib/errors/messages
 * 
 * Centralized error message management with support for:
 * - User type variations (guest vs regular)
 * - Resource-specific variants
 * - Internationalization-ready structure
 */

import type { ErrorCode } from './types';

/**
 * Message configuration with optional variants
 */
interface MessageConfig {
  /** Default message for all users */
  default: string;
  /** Message for guest/unauthenticated users */
  guest?: string;
  /** Resource-specific message variants */
  variants?: { [key: string]: string | undefined };
}

/**
 * Options for message retrieval
 */
interface GetMessageOptions {
  /** User authentication status */
  userType?: 'guest' | 'regular';
  /** Resource variant (e.g., 'chat', 'document') */
  variant?: string;
}

/**
 * Error message catalog
 * Maps error codes to user-friendly messages
 */
const messages: Partial<Record<ErrorCode, MessageConfig>> = {
  // Authentication errors
  'auth:unauthorized': {
    default: 'Please sign in to continue.',
    guest: 'Sign in to access this feature.',
  },
  'auth:forbidden': {
    default: "You don't have permission to access this resource.",
  },
  'auth:session_expired': {
    default: 'Your session has expired. Please sign in again.',
  },
  'auth:invalid_credentials': {
    default: 'Invalid email or password.',
  },

  // Validation errors
  'validation:invalid_input': {
    default: 'Please check your input and try again.',
  },
  'validation:missing_field': {
    default: 'Required field is missing.',
  },
  'validation:invalid_format': {
    default: 'The provided value has an invalid format.',
  },

  // Resource errors
  'resource:not_found': {
    default: 'The requested resource was not found.',
    variants: {
      chat: 'This chat no longer exists.',
      document: 'This document was not found.',
      user: 'User not found.',
    },
  },
  'resource:conflict': {
    default: 'This resource already exists.',
  },
  'resource:deleted': {
    default: 'This resource has been deleted.',
  },

  // Rate limiting
  'rate_limit:exceeded': {
    default: 'Too many requests. Please wait before trying again.',
    guest: 'Daily limit reached. Sign in for more requests.',
  },
  'rate_limit:quota_exceeded': {
    default: 'You have exceeded your usage quota.',
    guest: 'Sign in to get more usage quota.',
  },

  // External service errors
  'external:ai_provider': {
    default: 'AI service temporarily unavailable. Please try again.',
  },
  'external:timeout': {
    default: 'Request timed out. Please try again.',
  },
  'external:service_unavailable': {
    default: 'External service is currently unavailable.',
  },

  // Internal errors
  'internal:database': {
    default: 'A database error occurred. Please try again.',
  },
  'internal:unknown': {
    default: 'An unexpected error occurred. Please try again.',
  },
  'internal:configuration': {
    default: 'Server configuration error. Please contact support.',
  },
};

/**
 * Default fallback message for unknown error codes
 */
const FALLBACK_MESSAGE: MessageConfig = {
  default: 'An unexpected error occurred. Please try again.',
};

/**
 * Get user-friendly message for an error code
 * 
 * @param code - Error code to look up
 * @param options - Options for message variants
 * @returns User-friendly error message
 * 
 * @example
 * ```ts
 * getMessage('auth:unauthorized')
 * // => 'Please sign in to continue.'
 * 
 * getMessage('auth:unauthorized', { userType: 'guest' })
 * // => 'Sign in to access this feature.'
 * 
 * getMessage('resource:not_found', { variant: 'chat' })
 * // => 'This chat no longer exists.'
 * ```
 */
export function getMessage(
  code: ErrorCode,
  options?: GetMessageOptions
): string {
  const config = messages[code] ?? FALLBACK_MESSAGE;

  // Check for resource-specific variant first
  if (options?.variant) {
    const variantMessage = config.variants?.[options.variant];
    if (variantMessage) {
      return variantMessage;
    }
  }

  // Check for guest-specific message
  if (options?.userType === 'guest' && config.guest) {
    return config.guest;
  }

  return config.default;
}

/**
 * Check if an error code has a registered message
 */
export function hasMessage(code: ErrorCode): boolean {
  return code in messages;
}
