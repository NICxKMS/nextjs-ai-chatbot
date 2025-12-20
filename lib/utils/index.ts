/**
 * Utility Functions
 *
 * Exports common utility functions used throughout the application.
 *
 * @module lib/utils
 */

export { cn } from './cn';

/**
 * Generate a cryptographically secure UUID v4
 *
 * @returns A new UUID string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Convert database messages to AI SDK UIMessage format.
 *
 * @param messages - Array of database message rows
 * @returns Array of UIMessage compatible objects
 */
export function convertToUIMessages<
  T extends {
    id: string;
    role: 'user' | 'assistant' | 'system';
    parts: unknown;
    createdAt: Date;
  },
>(messages: T[]): Array<{
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: unknown[];
  createdAt: Date;
}> {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: (message.parts ?? []) as unknown[],
    createdAt: message.createdAt,
  }));
}
