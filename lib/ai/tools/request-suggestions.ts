/**
 * Request Suggestions AI Tool
 * Ref: 05-ai-integration-optimal-design.md
 *
 * AI tool for generating text improvement suggestions for documents.
 * Streams suggestions via dataStream for client-side rendering.
 *
 * @module lib/ai/tools/request-suggestions
 */

import { streamObject, tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';

import type { AppSession } from '@/lib/auth/types';
import { createContext, isGuest } from '@/lib/data/base';
import { documentData, saveSuggestions } from '@/lib/data/documents';
import type { Suggestion } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';
import { getOpenAI } from '../providers';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for creating the requestSuggestions tool.
 */
export interface RequestSuggestionsToolProps {
  /** Current user session */
  session: AppSession;
  /** UI message stream writer for sending suggestion data */
  dataStream: UIMessageStreamWriter;
}

/**
 * Suggestion without user/timestamp fields (streamed to client).
 */
type StreamSuggestion = Omit<
  Suggestion,
  'userId' | 'createdAt' | 'documentCreatedAt'
>;

// =============================================================================
// TOOL
// =============================================================================

/**
 * Create the requestSuggestions AI tool.
 *
 * This tool generates text improvement suggestions for a document.
 * It streams each suggestion to the client via dataStream and saves
 * them to the database for authenticated users.
 *
 * @param props - Tool configuration
 * @returns AI tool definition
 *
 * @example
 * ```ts
 * const tools = {
 *   requestSuggestions: requestSuggestions({ session, dataStream }),
 * };
 * ```
 */
export function requestSuggestions({
  session,
  dataStream,
}: RequestSuggestionsToolProps) {
  return tool({
    description:
      'Generate suggestions to improve the current document\'s content.',
    inputSchema: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to request edits'),
    }),
    execute: async ({ documentId }) => {
      const ctx = createContext(session.user.id, session.user.type);
      const document = await documentData.get(documentId, ctx);

      if (!document || !document.content) {
        return {
          error: 'Document not found',
        };
      }

      const suggestions: StreamSuggestion[] = [];

      const { elementStream } = streamObject({
        model: getOpenAI()('gpt-4o-mini'),
        system:
          'You are a writing assistant. Analyze the text and provide up to 5 specific suggestions for improvement. Ensure suggestions are complete sentences and clearly describe the change.',
        prompt: document.content,
        output: 'array',
        schema: z.object({
          originalSentence: z.string().describe('The original sentence'),
          suggestedSentence: z.string().describe('The suggested sentence'),
          description: z.string().describe('The description of the suggestion'),
        }),
      });

      for await (const element of elementStream) {
        const suggestion: StreamSuggestion = {
          originalText: element.originalSentence,
          suggestedText: element.suggestedSentence,
          description: element.description,
          id: generateUUID(),
          documentId,
          isResolved: false,
        };

        dataStream.write({
          type: 'data-suggestion',
          data: suggestion,
        });

        suggestions.push(suggestion);
      }

      // Only save suggestions to database for authenticated users
      // Guest users cannot persist suggestions (cache-only constraint)
      if (session.user?.id && !isGuest(ctx)) {
        await saveSuggestions(
          suggestions.map((s) => ({
            ...s,
            userId: session.user.id,
            createdAt: new Date(),
            documentCreatedAt: document.createdAt,
          }))
        );
      }

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: 'Suggestions have been added to the document',
      };
    },
  });
}
