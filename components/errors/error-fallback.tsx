'use client';

import React from 'react';
import { RecoveryActions } from './recovery-actions';
import type { AppError } from '@/lib/errors';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
  title?: string;
  showDetails?: boolean;
}

function isAppError(error: Error): error is AppError {
  return 'code' in error && 'isOperational' in error;
}

/**
 * Fallback UI displayed when an error is caught
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  showDetails = process.env.NODE_ENV === 'development',
}: ErrorFallbackProps) {
  const userMessage = isAppError(error)
    ? error.message
    : 'An unexpected error occurred. Please try again.';

  const errorCode = isAppError(error) ? error.code : undefined;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[200px] items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900 dark:bg-red-950">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">{title}</h2>
        </div>

        <p className="mb-4 text-sm text-red-700 dark:text-red-300">{userMessage}</p>

        {errorCode && (
          <p className="mb-4 text-xs text-red-500 dark:text-red-400">
            Error code: {errorCode}
          </p>
        )}

        {showDetails && (
          <details className="mb-4">
            <summary className="cursor-pointer text-xs text-red-600 hover:underline dark:text-red-400">
              Technical details
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
              {error.stack || error.message}
            </pre>
          </details>
        )}

        <RecoveryActions
          onRetry={resetErrorBoundary}
          showRetry={!!resetErrorBoundary}
          showGoHome={true}
          showReport={false}
        />
      </div>
    </div>
  );
}
