import { createUIMessageStream } from 'ai';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getAppSession } from '@/lib/auth';
import { db, chat, message } from '@/lib/db';
import { AppError, unauthorized, forbidden } from '@/lib/errors';
import { generateTitleFromUserMessage } from '@/features/chat';
import type { ChatMessage } from '@/features/chat';

// Route config
export const maxDuration = 60;

// Request schema
const messagePartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().max(2000),
  }),
  z.object({
    type: z.literal('file'),
    name: z.string().max(100),
    url: z.string().url(),
    mimeType: z.string(),
  }),
]);

const postRequestSchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.literal('user'),
    content: z.string().max(2000).optional(),
    parts: z.array(messagePartSchema).optional(),
  }),
  selectedChatModel: z.string().min(1),
  selectedVisibilityType: z.enum(['public', 'private']).default('private'),
});

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const session = await getAppSession();
    
    if (!session?.user?.id) {
      throw unauthorized({ message: 'Authentication required' });
    }

    const userId = session.user.id;

    // 2. Parse and validate body
    const body = await request.json();
    const parseResult = postRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      throw new AppError({
        code: 'validation:invalid_input',
        message: 'Invalid request body: ' + parseResult.error.message,
      });
    }
    
    const { id: chatId, message: userMessage, selectedChatModel, selectedVisibilityType } = parseResult.data;

    // 3. Check existing chat ownership (direct db query to bypass context requirement)
    const [existingChat] = await db.select().from(chat).where(eq(chat.id, chatId));
    const isNewChat = !existingChat;
    
    if (existingChat && existingChat.userId !== userId) {
      throw forbidden({ message: 'Not authorized to access this chat' });
    }

    // 4. Create streaming response
    let generatedTitlePromise: Promise<string> | null = null;
    const chatCreatedAt = new Date();

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Generate title in parallel for new chats
        if (isNewChat) {
          // Build a ChatMessage-like object for title generation
          const chatMessage = {
            id: userMessage.id,
            role: 'user' as const,
            parts: userMessage.parts?.map(part => {
              if (part.type === 'text') {
                return { type: 'text' as const, text: part.text };
              }
              return { type: 'file' as const, name: part.name, url: part.url, mediaType: part.mimeType };
            }) || (userMessage.content ? [{ type: 'text' as const, text: userMessage.content }] : []),
            createdAt: chatCreatedAt,
          } as ChatMessage;

          generatedTitlePromise = generateTitleFromUserMessage({ message: chatMessage })
            .then((title) => {
              dataStream.write({
                type: 'data-chatTitle',
                data: title,
                transient: true,
              });
              return title;
            })
            .catch(() => 'New Chat');
        }

        // TODO: Integrate with AI provider in lib/ai/
        // For now, echo back a simple response
        dataStream.write({
          type: 'text-delta',
          delta: `Echo: ${userMessage.content || 'No content'}`,
          id: crypto.randomUUID(),
        });

        // Write usage data
        dataStream.write({
          type: 'data-usage',
          data: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
        });
      },
      generateId: () => crypto.randomUUID(),
      onFinish: async ({ messages }) => {
        const title = await generatedTitlePromise || 'New Chat';
        
        // Save chat if new
        if (isNewChat) {
          await db.insert(chat).values({
            id: chatId,
            userId,
            title,
            visibility: selectedVisibilityType,
            createdAt: chatCreatedAt,
          });
        }

        // Build parts for user message
        const userParts = userMessage.parts?.map(part => {
          if (part.type === 'text') {
            return { type: 'text' as const, text: part.text };
          }
          return { type: 'file' as const, name: part.name, url: part.url, mediaType: part.mimeType };
        }) || (userMessage.content ? [{ type: 'text' as const, text: userMessage.content }] : []);

        // Save user message
        await db.insert(message).values({
          id: userMessage.id,
          chatId,
          role: 'user',
          parts: userParts,
          createdAt: chatCreatedAt,
        });

        // Save assistant response
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage) {
            // Extract text content from parts
            const textContent = lastMessage.parts
              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map(p => p.text)
              .join('') || '';

            await db.insert(message).values({
              id: crypto.randomUUID(),
              chatId,
              role: 'assistant',
              parts: lastMessage.parts || [{ type: 'text', text: textContent }],
              createdAt: new Date(),
            });
          }
        }
      },
      onError: (error) => {
        console.error('[Chat API] Stream error:', error);
        return 'An error occurred while processing your message.';
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return error.toResponse();
    }
    
    console.error('[Chat API] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAppSession();
    
    if (!session?.user?.id) {
      throw unauthorized({ message: 'Authentication required' });
    }

    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('id');
    
    if (!chatId) {
      throw new AppError({
        code: 'validation:invalid_input',
        message: 'Chat ID is required',
      });
    }

    const [existingChat] = await db.select().from(chat).where(eq(chat.id, chatId));
    
    if (!existingChat) {
      throw new AppError({
        code: 'resource:not_found',
        message: 'Chat not found',
      });
    }
    
    if (existingChat.userId !== userId) {
      throw forbidden({ message: 'Not authorized to delete this chat' });
    }

    await db.delete(chat).where(eq(chat.id, chatId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return error.toResponse();
    }
    
    console.error('[Chat API] Delete error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
