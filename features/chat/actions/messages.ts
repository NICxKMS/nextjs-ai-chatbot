'use server';

import { revalidatePath } from 'next/cache';
import { db, message } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { chatData } from '@/lib/data';
import { AppError, forbidden, notFound } from '@/lib/errors';
import type { DataContext } from '@/lib/data/types';
import { eq, and, gte } from 'drizzle-orm';

export async function deleteTrailingMessages({
  chatId,
  messageId,
}: {
  chatId: string;
  messageId: string;
}): Promise<{ success: boolean }> {
  const { session } = await requireAuth();

  const ctx: DataContext = {
    userId: session.user.id,
    isGuest: session.user.type === 'guest',
  };

  // Verify chat ownership
  const chat = await chatData.get(chatId, ctx);
  if (!chat) {
    throw forbidden({ message: 'You do not have permission to modify this chat' });
  }

  // Get the target message to find its position
  const targetMessage = await db
    .select()
    .from(message)
    .where(and(eq(message.chatId, chatId), eq(message.id, messageId)))
    .limit(1);

  if (!targetMessage.length) {
    throw notFound('message');
  }

  // Delete the target message and all messages after it
  const targetCreatedAt = targetMessage[0]?.createdAt;
  if (targetCreatedAt) {
    await db
      .delete(message)
      .where(
        and(
          eq(message.chatId, chatId),
          gte(message.createdAt, targetCreatedAt)
        )
      );
  }

  revalidatePath(`/chat/${chatId}`);
  
  return { success: true };
}
