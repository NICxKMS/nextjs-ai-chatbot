import 'server-only';
import { eq, and } from 'drizzle-orm';
import { db, vote } from '@/lib/db';
import type { Vote, NewVote } from '@/lib/db';
import type { DataContext } from '../types';

export const voteData = {
  async getForMessage(chatId: string, messageId: string, ctx: DataContext): Promise<Vote | null> {
    const [result] = await db.select().from(vote)
      .where(and(
        eq(vote.chatId, chatId),
        eq(vote.messageId, messageId),
        eq(vote.userId, ctx.userId)
      ));
    
    return result ?? null;
  },
  
  async upsert(data: NewVote, ctx: DataContext): Promise<Vote> {
    const existing = await this.getForMessage(data.chatId, data.messageId, ctx);
    
    if (existing) {
      await db.update(vote)
        .set({ isUpvoted: data.isUpvoted })
        .where(and(
          eq(vote.chatId, data.chatId),
          eq(vote.messageId, data.messageId),
          eq(vote.userId, ctx.userId)
        ));
      return { ...existing, isUpvoted: data.isUpvoted };
    }
    
    const [result] = await db.insert(vote)
      .values({ ...data, userId: ctx.userId })
      .returning();
    
    return result!;
  },
};
