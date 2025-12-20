/**
 * Chat Update Operations
 * Ref: 03-data-layer-optimal-design.md §9.3
 */
import 'server-only';

import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import type { Chat, Visibility } from '@/lib/db';
import type { DataContext } from '../types';
import { requireNonGuest } from '../base';

const { chat } = schema;

/**
 * Update chat title
 */
export async function updateChatTitle(
  chatId: string,
  title: string,
  ctx: DataContext
): Promise<Chat | null> {
  requireNonGuest(ctx);

  const db = getDb();
  const [result] = await db
    .update(chat)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)))
    .returning();

  return result ?? null;
}

/**
 * Update chat visibility
 */
export async function updateChatVisibility(
  chatId: string,
  visibility: Visibility,
  ctx: DataContext
): Promise<Chat | null> {
  requireNonGuest(ctx);

  const db = getDb();
  const [result] = await db
    .update(chat)
    .set({ visibility, updatedAt: new Date() })
    .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)))
    .returning();

  return result ?? null;
}

/**
 * Update chat context (for AI continuation)
 */
export async function updateChatContext(
  chatId: string,
  context: Record<string, unknown>,
  ctx: DataContext
): Promise<Chat | null> {
  requireNonGuest(ctx);

  const db = getDb();
  const [result] = await db
    .update(chat)
    .set({ lastContext: context, updatedAt: new Date() })
    .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)))
    .returning();

  return result ?? null;
}

/**
 * Touch chat (update timestamp without changing data)
 */
export async function touchChat(
  chatId: string,
  ctx: DataContext
): Promise<boolean> {
  requireNonGuest(ctx);

  const db = getDb();
  const [result] = await db
    .update(chat)
    .set({ updatedAt: new Date() })
    .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)))
    .returning({ id: chat.id });

  return !!result;
}
