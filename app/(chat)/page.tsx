/**
 * New Chat Page (Home)
 *
 * Server component that renders a new chat session.
 * Generates a fresh UUID for each new chat.
 *
 * @module app/(chat)/page
 */

import { cookies } from 'next/headers';

import { Chat, DataStreamHandler } from '@/features/chat';
import { getAvailableModels, DEFAULT_MODEL_ID } from '@/lib/ai';
import { generateUUID } from '@/lib/utils';

export default async function NewChatPage() {
  // Access request data before using random values to satisfy Next.js
  // cache constraints for server components.
  const cookieStore = await cookies();
  
  // Get available models and determine initial model
  const availableModels = getAvailableModels();
  const selectedModelId = cookieStore.get('chat-model')?.value;
  const initialModelId =
    selectedModelId && availableModels.some((model) => model.id === selectedModelId)
      ? selectedModelId
      : DEFAULT_MODEL_ID;

  // Generate new chat ID for new conversations
  const chatId = generateUUID();

  return (
    <>
      <Chat
        id={chatId}
        initialMessages={[]}
        selectedModelId={initialModelId}
        isReadonly={false}
        votes={[]}
        selectedVisibilityType="private"
      />
      <DataStreamHandler />
    </>
  );
}
