import 'server-only';
import { eq, and, desc } from 'drizzle-orm';
import { db, chat, message } from '@/lib/db';
import type { Chat, NewChat, Message } from '@/lib/db';
import type { DataContext, PaginationParams, PaginatedResult, ChatWithMessages } from '../types';
import { AppError, notFound, forbidden } from '@/lib/errors';

export const chatData = {
  async get(chatId: string, ctx: DataContext): Promise<Chat | null> {
    if (ctx.isGuest) return null;
    
    const [result] = await db.select().from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));
    
    return result ?? null;
  },
  
  async getWithMessages(chatId: string, ctx: DataContext): Promise<ChatWithMessages | null> {
    const chatResult = await this.get(chatId, ctx);
    if (!chatResult) return null;
    
    const messages = await db.select().from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(message.createdAt);
    
    return { chat: chatResult, messages };
  },
  
  async list(ctx: DataContext, params: PaginationParams): Promise<PaginatedResult<Chat>> {
    if (ctx.isGuest) return { items: [], hasMore: false };
    
    const items = await db.select().from(chat)
      .where(eq(chat.userId, ctx.userId))
      .orderBy(desc(chat.createdAt))
      .limit(params.limit + 1);
    
    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();
    
    return { items, hasMore };
  },
  
  async exists(chatId: string, ctx: DataContext): Promise<boolean> {
    const result = await this.get(chatId, ctx);
    return result !== null;
  },
  
  async getPublic(chatId: string): Promise<Chat | null> {
    const [result] = await db.select().from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.visibility, 'public')));
    
    return result ?? null;
  },
  
  async create(params: Omit<NewChat, 'userId'>, ctx: DataContext): Promise<Chat> {
    const [result] = await db.insert(chat)
      .values({ ...params, userId: ctx.userId })
      .returning();
    
    if (!result) {
      throw new AppError({ code: 'internal:database', message: 'Failed to create chat' });
    }
    
    return result;
  },
  
  async delete(chatId: string, ctx: DataContext): Promise<void> {
    const existing = await this.get(chatId, ctx);
    if (!existing) throw notFound('chat');
    
    await db.delete(chat).where(eq(chat.id, chatId));
  },
  
  async deleteAll(ctx: DataContext): Promise<void> {
    if (ctx.isGuest) return;
    await db.delete(chat).where(eq(chat.userId, ctx.userId));
  },
  
  async updateTitle(chatId: string, title: string, ctx: DataContext): Promise<void> {
    const existing = await this.get(chatId, ctx);
    if (!existing) throw notFound('chat');
    
    await db.update(chat)
      .set({ title, updatedAt: new Date() })
      .where(eq(chat.id, chatId));
  },
  
  async updateVisibility(chatId: string, visibility: 'public' | 'private', ctx: DataContext): Promise<void> {
    const existing = await this.get(chatId, ctx);
    if (!existing) throw notFound('chat');
    
    await db.update(chat)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(chat.id, chatId));
  },
};
