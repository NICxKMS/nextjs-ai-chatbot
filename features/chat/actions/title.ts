'use server';

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ChatMessage } from '../types';

/**
 * Extract text content from a ChatMessage
 */
function extractMessageContent(message: ChatMessage): string {
  // UIMessage uses 'parts' array, not 'content' string directly
  if (message.parts && message.parts.length > 0) {
    const textParts = message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join(' ');
    return textParts || 'New conversation';
  }
  return 'New conversation';
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: ChatMessage;
}): Promise<string> {
  const userContent = extractMessageContent(message);

  const { text: title } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Generate a short title (max 5 words) for a chat that starts with this message. 
             Only return the title, no quotes or explanation.`,
    prompt: userContent.slice(0, 500),
  });

  return title.trim() || 'New Chat';
}
