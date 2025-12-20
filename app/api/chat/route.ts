/**
 * Chat API Route
 * Ref: 05-ai-integration-optimal-design.md §4
 *
 * Handles streaming AI responses using Vercel AI SDK.
 * Uses createUIMessageStream for rich data streaming (title, usage, etc).
 * Supports multiple providers (OpenAI, Anthropic, Google).
 * Includes AI tools for document/artifact creation and updates.
 *
 * @module app/api/chat/route
 */

import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  stepCountIs,
  type UIMessage,
  type LanguageModel,
} from 'ai';
import { getSession } from '@/lib/auth';
import type { AppSession } from '@/lib/auth/types';
import { AppError, validationError } from '@/lib/errors';
import {
  getOpenAI,
  getAnthropic,
  getGoogle,
  isValidModel,
  DEFAULT_MODEL_ID,
  MODEL_REGISTRY,
  getTools,
} from '@/lib/ai';
import { generateUUID } from '@/lib/utils';

// =============================================================================
// MODEL INSTANTIATION
// =============================================================================

/**
 * Get the language model instance for a given model ID
 * Uses lazy initialization to only instantiate the provider when needed
 */
function getModel(modelId: string): LanguageModel {
  const metadata = MODEL_REGISTRY[modelId];
  if (!metadata) {
    throw validationError(`Invalid model: ${modelId}`);
  }

  switch (metadata.provider) {
    case 'openai':
      return getOpenAI().chat(modelId) as unknown as LanguageModel;
    case 'anthropic':
      return getAnthropic()(modelId) as unknown as LanguageModel;
    case 'google':
      return getGoogle()(modelId) as unknown as LanguageModel;
    default:
      throw validationError(`Unsupported provider: ${metadata.provider}`);
  }
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are a helpful AI assistant. You provide clear, accurate, and helpful responses.

Guidelines:
- Be concise but thorough
- Use markdown formatting when appropriate
- If you're unsure about something, say so
- Break down complex topics into digestible parts

Document/Artifact Guidelines:
- Use createDocument for substantial content (>10 lines) like code, documentation, or spreadsheets
- Use updateDocument to modify existing documents when the user asks for changes
- For simple inline responses, respond directly without creating a document
- Supported document kinds: text (markdown), code (programming), sheet (spreadsheets)`;

// =============================================================================
// TITLE GENERATION
// =============================================================================

/**
 * Generate a title for a new chat based on the first user message.
 * Falls back to a simple extraction if AI generation fails.
 */
async function generateTitle(userMessage: string): Promise<string> {
  // Simple title extraction: first ~50 chars of user message
  const fallbackTitle =
    userMessage.length > 50
      ? `${userMessage.substring(0, 47)}...`
      : userMessage;

  return fallbackTitle;
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

interface ChatRequestBody {
  id: string;
  messages: UIMessage[];
  modelId?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    // Get session (optional - guests can chat)
    const session = await getSession();
    const userId = session?.user?.id;

    // Parse and validate request body
    const body = (await request.json()) as ChatRequestBody;
    const { id: chatId, messages, modelId = DEFAULT_MODEL_ID } = body;

    // Validate chat ID
    if (!chatId || typeof chatId !== 'string') {
      throw validationError('Chat ID is required');
    }

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw validationError('Messages array is required and must not be empty');
    }

    // Validate model
    if (!isValidModel(modelId)) {
      throw validationError(`Invalid model: ${modelId}`);
    }

    // Get the model instance
    const model = getModel(modelId);

    // Convert messages for AI SDK
    const coreMessages = convertToModelMessages(messages);

    // Get last user message for title generation
    const lastUserMessage = messages.find(
      (m): m is UIMessage & { role: 'user'; content: string } =>
        m.role === 'user' && typeof (m as { content?: unknown }).content === 'string'
    );
    const userMessageContent = lastUserMessage?.content ?? '';

    // Check if this is a new chat (only 1 user message)
    const isNewChat = messages.filter((m) => m.role === 'user').length === 1;

    // Create session for tools (use real session or create guest session)
    const toolSession: AppSession = session ?? {
      user: {
        id: `guest:${generateUUID()}`,
        type: 'guest',
        email: null,
      },
    };

    // Create streaming response with data parts
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Generate and stream title for new chats
        if (isNewChat && userMessageContent) {
          try {
            const title = await generateTitle(userMessageContent);
            writer.write({
              type: 'data-chat-title',
              data: title,
            });
          } catch (titleError) {
            console.warn('[Chat API] Title generation failed:', titleError);
          }
        }

        // Get AI tools with current session and stream writer
        const tools = getTools({
          session: toolSession,
          dataStream: writer,
          chatId,
        });

        // Stream the AI response
        const result = streamText({
          model,
          messages: coreMessages,
          system: SYSTEM_PROMPT,
          tools,
          stopWhen: stepCountIs(5), // Allow multi-step tool calls
          onFinish: async ({ text, usage }) => {
            // Stream usage data
            if (usage) {
              writer.write({
                type: 'data-usage',
                data: {
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                  totalTokens: usage.totalTokens,
                },
              });

              console.info('[Chat API] Token usage:', {
                chatId,
                userId: userId ?? 'guest',
                modelId,
                promptTokens: usage.inputTokens,
                completionTokens: usage.outputTokens,
                totalTokens: usage.totalTokens,
              });
            }

            console.info('[Chat API] Stream complete:', {
              chatId,
              responseLength: text.length,
            });
          },
        });

        // Merge the text stream into the data stream
        writer.merge(result.toUIMessageStream());
      },
      onError: (error) => {
        console.error('[Chat API] Stream error:', error);
        return 'An error occurred while generating the response.';
      },
    });

    // Return streaming response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);

    // Handle AppError
    if (error instanceof AppError) {
      return error.toResponse();
    }

    // Handle AI SDK errors
    if (error instanceof Error) {
      // Check for rate limit errors
      if (
        error.message.includes('rate limit') ||
        error.message.includes('429')
      ) {
        return Response.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Check for authentication errors
      if (
        error.message.includes('API key') ||
        error.message.includes('authentication')
      ) {
        return Response.json(
          { error: 'AI service configuration error' },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
