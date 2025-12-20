'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { chatData } from '@/lib/data';
import { forbidden } from '@/lib/errors';
import type { DataContext } from '@/lib/data/types';
import type { VisibilityType } from '../types';

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
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

  await chatData.updateVisibility(chatId, visibility, ctx);
  
  revalidatePath(`/chat/${chatId}`);
  revalidatePath('/');
  
  return { success: true };
}
