'use server';

import { revalidateTag } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { chatData } from '@/lib/data';
import { forbidden } from '@/lib/errors';
import type { DataContext } from '@/lib/data/types';

export async function deleteChat(chatId: string): Promise<{ success: boolean }> {
  const { session } = await requireAuth();

  const ctx: DataContext = {
    userId: session.user.id,
    isGuest: session.user.type === 'guest',
  };

  const chat = await chatData.get(chatId, ctx);
  if (!chat) {
    throw forbidden({ message: 'You do not have permission to delete this chat' });
  }

  await chatData.delete(chatId, ctx);

  revalidateTag(`chat-${chatId}`, 'default');
  revalidateTag(`chats-${session.user.id}`, 'default');

  return { success: true };
}

export async function deleteAllChats(): Promise<{ success: boolean }> {
  const { session } = await requireAuth();

  const ctx: DataContext = {
    userId: session.user.id,
    isGuest: session.user.type === 'guest',
  };

  await chatData.deleteAll(ctx);

  revalidateTag(`chats-${session.user.id}`, 'default');

  return { success: true };
}

export async function renameChat(
  chatId: string,
  title: string
): Promise<{ success: boolean }> {
  const { session } = await requireAuth();

  const ctx: DataContext = {
    userId: session.user.id,
    isGuest: session.user.type === 'guest',
  };

  const chat = await chatData.get(chatId, ctx);
  if (!chat) {
    throw forbidden({ message: 'You do not have permission to rename this chat' });
  }

  await chatData.updateTitle(chatId, title, ctx);

  revalidateTag(`chat-${chatId}`, 'default');
  revalidateTag(`chats-${session.user.id}`, 'default');

  return { success: true };
}
