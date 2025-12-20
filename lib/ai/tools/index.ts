/**
 * AI Tools - Public API
 * Ref: 05-ai-integration-optimal-design.md
 *
 * Exports all AI tools for use in chat streaming.
 *
 * @module lib/ai/tools
 */

import type { UIMessageStreamWriter } from 'ai';

import type { AppSession } from '@/lib/auth/types';
import { createDocument, type CreateDocumentToolProps } from './create-document';
import { updateDocument, type UpdateDocumentToolProps } from './update-document';

// Re-export tools and types
export { createDocument, type CreateDocumentToolProps } from './create-document';
export { updateDocument, type UpdateDocumentToolProps } from './update-document';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for getting all available tools.
 */
export interface GetToolsProps {
  /** Current user session */
  session: AppSession;
  /** UI message stream writer for sending artifact data */
  dataStream: UIMessageStreamWriter;
  /** Chat ID for associating documents */
  chatId: string;
}

// =============================================================================
// TOOL REGISTRY
// =============================================================================

/**
 * Get all available AI tools.
 *
 * Returns an object containing all registered tools, ready for use
 * in streamText calls.
 *
 * @param props - Tool configuration
 * @returns Object containing all tools
 *
 * @example
 * ```ts
 * const result = streamText({
 *   model,
 *   messages,
 *   tools: getTools({ session, dataStream, chatId }),
 * });
 * ```
 */
export function getTools({ session, dataStream, chatId }: GetToolsProps) {
  return {
    createDocument: createDocument({ session, dataStream, chatId }),
    updateDocument: updateDocument({ session, dataStream }),
  };
}
