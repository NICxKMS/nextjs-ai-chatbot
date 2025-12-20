import 'server-only';
import { eq, and, gt, desc } from 'drizzle-orm';
import { db, message } from '@/lib/db';
import type { Message, NewMessage } from '@/lib/db';
import type { DataContext } from '../types';
import { chatData } from '../chat';

export const messageData = {
  async getForChat(chatId: string, ctx: DataContext): Promise<Message[]> {
    const chatExists = await chatData.exists(chatId, ctx);
    if (!chatExists && !ctx.isGuest) return [];
    
    return db.select().from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(message.createdAt);
  },
  
  async getCount(chatId: string, ctx: DataContext): Promise<number> {
    const messages = await this.getForChat(chatId, ctx);
    return messages.length;
  },
  
  async getByChatIdWithLimit(chatId: string, limit: number, ctx: DataContext): Promise<Message[]> {
    const chatExists = await chatData.exists(chatId, ctx);
    if (!chatExists && !ctx.isGuest) return [];
    
    return db.select().from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(desc(message.createdAt))
      .limit(limit);
  },
  
  async save(messages: NewMessage[], ctx: DataContext): Promise<void> {
    if (messages.length === 0) return;
    
    await db.insert(message).values(messages);
  },
  
  async deleteAfterTimestamp(chatId: string, timestamp: Date, ctx: DataContext): Promise<void> {
    const chatExists = await chatData.exists(chatId, ctx);
    if (!chatExists) return;
    
    await db.delete(message)
      .where(and(eq(message.chatId, chatId), gt(message.createdAt, timestamp)));
  },
};
