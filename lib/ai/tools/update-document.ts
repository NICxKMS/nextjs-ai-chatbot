/**
 * Update Document AI Tool
 * Ref: 05-ai-integration-optimal-design.md
 *
 * AI tool for updating existing documents/artifacts during chat.
 * Fetches existing document, streams update through document handler.
 *
 * @module lib/ai/tools/update-document
 */

import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';

import { documentHandlersByArtifactKind } from '@/features/artifacts/handlers';
import type { AppSession } from '@/lib/auth/types';
import { createContext } from '@/lib/data/base';
import { documentData } from '@/lib/data/documents';
import { AppError } from '@/lib/errors';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for creating the updateDocument tool.
 */
export interface UpdateDocumentToolProps {
  /** Current user session */
  session: AppSession;
  /** UI message stream writer for sending artifact data */
  dataStream: UIMessageStreamWriter;
}

// =============================================================================
// TOOL
// =============================================================================

/**
 * Create the updateDocument AI tool.
 *
 * This tool allows the AI to update existing documents/artifacts.
 * It fetches the document, finds the appropriate handler, and streams
 * the update to the client.
 *
 * @param props - Tool configuration
 * @returns AI tool definition
 *
 * @example
 * ```ts
 * const tools = {
 *   updateDocument: updateDocument({ session, dataStream }),
 * };
 * ```
 */
export function updateDocument({ session, dataStream }: UpdateDocumentToolProps) {
  return tool({
    description:
      'Update an existing document. Provide a clear description of the changes required.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      // Create data context from session
      const ctx = createContext(session.user.id, session.user.type);

      // Fetch the existing document
      const document = await documentData.get(id, ctx);

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      // Clear existing content before streaming update
      dataStream.write({
        type: 'data-clear',
        data: null,
      });

      // Find the appropriate document handler
      const documentHandler = documentHandlersByArtifactKind.find(
        (handler) => handler.kind === document.kind
      );

      if (!documentHandler) {
        throw new AppError({
          code: 'validation:invalid_input',
          message: `No document handler found for kind: ${document.kind}`,
        });
      }

      // Execute the document handler's update callback
      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        session,
      });

      // Signal completion
      dataStream.write({
        type: 'data-finish',
        data: null,
      });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated successfully.',
      };
    },
  });
}
