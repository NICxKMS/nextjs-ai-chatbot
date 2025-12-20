/**
 * Existing Chat Page (Dynamic Route)
 *
 * Server component that loads and displays an existing chat session.
 * Handles authentication, authorization, and message loading.
 *
 * @module app/(chat)/chat/[id]/page
 */

import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/features/chat';
import { getSession } from '@/lib/auth';
import { chatData, createContext } from '@/lib/data';
import { convertToUIMessages } from '@/lib/utils';
import type { UIMessage } from '@ai-sdk/react';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  // Get current session
  const session = await getSession();
  const user = session?.user;

  // If no session and not a guest chat, redirect to login
  if (!user && !id.startsWith('guest-')) {
    redirect('/login');
  }

  // Create data context
  const ctx = user
    ? createContext(user.id, user.type)
    : null;

  // Try to load existing chat
  const chatWithMessages = ctx ? await chatData.getWithMessages(id, ctx) : null;

  // If chat doesn't exist and not a new guest chat
  if (!chatWithMessages && !id.startsWith('guest-')) {
    notFound();
  }

  // Extract chat and messages
  const chat = chatWithMessages?.chat;
  const rawMessages = chatWithMessages?.messages ?? [];

  // Convert to UI messages format
  const messages = convertToUIMessages(rawMessages) as UIMessage[];

  // Determine readonly state
  const isReadonly = chat?.userId !== user?.id;

  // Get model from lastContext if available
  const lastContext = chat?.lastContext as { modelId?: string } | null;
  const selectedModelId = lastContext?.modelId;

  // TODO: Load votes when vote data layer is implemented
  const votes: Array<{
    chatId: string;
    messageId: string;
    vote: 'up' | 'down';
  }> = [];

  return (
    <Chat
      id={id}
      initialMessages={messages}
      selectedModelId={selectedModelId}
      isReadonly={isReadonly}
      votes={votes}
    />
  );
}
