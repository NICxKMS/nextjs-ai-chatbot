import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getAppSession } from '@/lib/auth';
import { ChatContainer } from '@/features/chat';
import { chatData, messageData } from '@/lib/data';
import { createContext } from '@/lib/data';
import type { Message } from '@/lib/db';
import type { ChatMessage } from '@/features/chat';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Mark as dynamic - we need to read cookies/db
  await connection();
  
  const { id } = await params;
  const session = await getAppSession();
  const ctx = await createContext();

  // Try to get chat as owner first, then as public
  let chat = ctx ? await chatData.get(id, ctx) : null;
  let isOwner = !!chat;
  
  // If not owner, try public access
  if (!chat) {
    chat = await chatData.getPublic(id);
  }
  
  if (!chat) {
    notFound();
  }

  // Fetch messages - for public chats, create a guest context
  const messageCtx = ctx ?? { userId: '', isGuest: true };
  const messages = await messageData.getForChat(id, messageCtx);

  // Convert to ChatMessage format
  const initialMessages: ChatMessage[] = messages.map((msg: Message) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: Array.isArray(msg.parts) ? msg.parts : [],
    createdAt: msg.createdAt,
  }));

  return (
    <ChatContainer
      chatId={id}
      initialMessages={initialMessages}
      modelId="gpt-4o"
      visibility={chat.visibility}
      isReadonly={!isOwner}
      isGuest={!session?.user.id}
    />
  );
}
