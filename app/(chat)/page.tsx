/**
 * New Chat Page (Home)
 *
 * Server component that renders a new chat session.
 * Generates a fresh UUID for each new chat.
 *
 * @module app/(chat)/page
 */

import { Chat } from '@/features/chat';
import { generateUUID } from '@/lib/utils';

export default async function NewChatPage() {
  // Generate new chat ID for new conversations
  const chatId = generateUUID();

  return <Chat id={chatId} initialMessages={[]} />;
}
