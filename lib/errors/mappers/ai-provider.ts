/**
 * AI Provider Error Mapper
 * @module lib/errors/mappers/ai-provider
 * 
 * Maps Vercel AI SDK and provider errors to AppError instances.
 */

import { AppError } from '../app-error';
import { getMessage } from '../messages';

/**
 * Shape of AI provider errors (from Vercel AI SDK)
 */
interface AIProviderErrorLike {
  message?: string;
  status?: number;
  statusCode?: number;
  code?: string;
  type?: string;
}

/**
 * Check if error is from an AI provider
 */
export function isAIProviderError(error: unknown): error is AIProviderErrorLike {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const err = error as Record<string, unknown>;
  // AI SDK errors typically have status/statusCode or specific error types
  return (
    typeof err.status === 'number' ||
    typeof err.statusCode === 'number' ||
    err.type === 'rate_limit_error' ||
    err.code === 'context_length_exceeded' ||
    (typeof err.message === 'string' && /rate.?limit|api.?key|model|content.?filter/i.test(err.message))
  );
}

/**
 * Map AI provider errors to AppError
 * @param error - Unknown error to map
 * @returns AppError instance with appropriate code and context
 */
export function mapAIProviderError(error: unknown): AppError {
  const cause = error instanceof Error ? error : undefined;
  
  if (!isAIProviderError(error)) {
    return new AppError({
      code: 'external:ai_provider',
      message: getMessage('external:ai_provider'),
      cause,
    });
  }

  const status = error.status ?? error.statusCode;
  const message = error.message ?? '';
  const context = {
    status,
    type: error.type,
    code: error.code,
  };

  // Rate limit (429)
  if (status === 429 || error.type === 'rate_limit_error' || /rate.?limit/i.test(message)) {
    return new AppError({
      code: 'rate_limit:exceeded',
      message: 'AI provider rate limit exceeded. Please try again later.',
      context,
      cause,
    });
  }

  // Authentication errors (401)
  if (status === 401 || /invalid.?api.?key|unauthorized/i.test(message)) {
    return new AppError({
      code: 'external:ai_provider',
      message: 'AI provider authentication failed',
      severity: 'fatal',
      isOperational: false,
      context,
      cause,
    });
  }

  // Forbidden (403)
  if (status === 403 || /forbidden|access.?denied/i.test(message)) {
    return new AppError({
      code: 'external:ai_provider',
      message: 'Access denied by AI provider',
      context,
      cause,
    });
  }

  // Model not found (404)
  if (status === 404 || /model.?not.?found|model.*does.?not.?exist/i.test(message)) {
    return new AppError({
      code: 'external:ai_provider',
      message: 'Requested AI model is not available',
      context,
      cause,
    });
  }

  // Context length exceeded
  if (error.code === 'context_length_exceeded' || /context.?length|token.?limit/i.test(message)) {
    return new AppError({
      code: 'validation:invalid_input',
      message: 'Message exceeds maximum context length',
      context,
      cause,
    });
  }

  // Content filter
  if (/content.?filter|policy|safety/i.test(message)) {
    return new AppError({
      code: 'validation:invalid_input',
      message: 'Content was blocked by safety filters',
      context,
      cause,
    });
  }

  // Service unavailable (500+)
  if (status && status >= 500) {
    return new AppError({
      code: 'external:ai_provider',
      message: 'AI provider service is temporarily unavailable',
      context,
      cause,
    });
  }

  // Default: unknown AI provider error
  return new AppError({
    code: 'external:ai_provider',
    message: getMessage('external:ai_provider'),
    context,
    cause,
  });
}
