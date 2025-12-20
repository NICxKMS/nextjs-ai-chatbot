'use client';

import React from 'react';
import type { ErrorCode } from '@/lib/errors';

interface ErrorToastProps {
  code?: ErrorCode;
  message: string;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast notification for displaying errors
 */
export function ErrorToast({ code, message, onDismiss, action }: ErrorToastProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-red-200 bg-white p-4 shadow-lg dark:border-red-800 dark:bg-zinc-900"
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
        <svg
          className="h-4 w-4 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{message}</p>
        {code && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{code}</p>
        )}

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
          >
            {action.label}
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
