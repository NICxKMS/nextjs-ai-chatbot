/**
 * HTTP Error Mapper
 * @module lib/errors/mappers/http
 * 
 * Maps HTTP response and network errors to AppError instances.
 */

import { AppError } from '../app-error';
import { getMessage } from '../messages';

/**
 * Map HTTP response errors to AppError
 * @param response - Fetch Response object
 * @returns AppError instance with appropriate code
 */
export function mapHttpError(response: Response): AppError {
  const status = response.status;
  const context = {
    status,
    statusText: response.statusText,
    url: response.url,
  };

  switch (status) {
    case 400:
      return new AppError({
        code: 'validation:invalid_input',
        message: getMessage('validation:invalid_input'),
        context,
      });

    case 401:
      return new AppError({
        code: 'auth:unauthorized',
        message: getMessage('auth:unauthorized'),
        context,
      });

    case 403:
      return new AppError({
        code: 'auth:forbidden',
        message: getMessage('auth:forbidden'),
        context,
      });

    case 404:
      return new AppError({
        code: 'resource:not_found',
        message: getMessage('resource:not_found'),
        context,
      });

    case 409:
      return new AppError({
        code: 'resource:conflict',
        message: 'Resource conflict',
        context,
      });

    case 422:
      return new AppError({
        code: 'validation:invalid_input',
        message: 'Unprocessable entity',
        context,
      });

    case 429:
      return new AppError({
        code: 'rate_limit:exceeded',
        message: getMessage('rate_limit:exceeded'),
        context,
      });

    case 500:
      return new AppError({
        code: 'internal:server',
        message: 'Internal server error',
        isOperational: false,
        context,
      });

    case 502:
      return new AppError({
        code: 'external:network',
        message: 'Bad gateway',
        context,
      });

    case 503:
      return new AppError({
        code: 'external:network',
        message: 'Service temporarily unavailable',
        context,
      });

    case 504:
      return new AppError({
        code: 'external:network',
        message: 'Gateway timeout',
        context,
      });

    default:
      if (status >= 500) {
        return new AppError({
          code: 'internal:server',
          message: `Server error: ${status}`,
          isOperational: false,
          context,
        });
      }
      if (status >= 400) {
        return new AppError({
          code: 'external:network',
          message: `HTTP error: ${status}`,
          context,
        });
      }
      return new AppError({
        code: 'internal:unknown',
        message: `Unexpected HTTP status: ${status}`,
        context,
      });
  }
}

/**
 * Map fetch/network errors to AppError
 * @param error - Unknown network error
 * @returns AppError instance with appropriate code
 */
export function mapNetworkError(error: unknown): AppError {
  const cause = error instanceof Error ? error : undefined;
  const message = error instanceof Error ? error.message : 'Network error';
  const name = error instanceof Error ? error.name : '';

  // Abort/timeout errors
  if (name === 'AbortError' || /abort|timeout/i.test(message)) {
    return new AppError({
      code: 'external:network',
      message: 'Request timed out',
      context: { errorType: 'timeout' },
      cause,
    });
  }

  // TypeError typically indicates network failure
  if (name === 'TypeError' || /fetch|network|failed to fetch/i.test(message)) {
    return new AppError({
      code: 'external:network',
      message: 'Network connection failed',
      context: { errorType: 'network_failure' },
      cause,
    });
  }

  // DNS or SSL errors
  if (/dns|certificate|ssl|tls/i.test(message)) {
    return new AppError({
      code: 'external:network',
      message: 'Connection security error',
      context: { errorType: 'security' },
      cause,
    });
  }

  // Default network error
  return new AppError({
    code: 'external:network',
    message: 'Network request failed',
    cause,
  });
}
