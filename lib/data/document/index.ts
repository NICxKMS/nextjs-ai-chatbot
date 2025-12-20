import 'server-only';
import { eq, and, desc } from 'drizzle-orm';
import { db, document } from '@/lib/db';
import type { Document, NewDocument } from '@/lib/db';
import type { DataContext } from '../types';
import { notFound } from '@/lib/errors';

export const documentData = {
  async get(documentId: string, ctx: DataContext): Promise<Document | null> {
    const [result] = await db.select().from(document)
      .where(and(eq(document.id, documentId), eq(document.userId, ctx.userId)));
    
    return result ?? null;
  },
  
  async getVersions(documentId: string, ctx: DataContext): Promise<Document[]> {
    return db.select().from(document)
      .where(and(eq(document.id, documentId), eq(document.userId, ctx.userId)))
      .orderBy(desc(document.createdAt));
  },
  
  async create(data: Omit<NewDocument, 'userId'>, ctx: DataContext): Promise<Document> {
    const [result] = await db.insert(document)
      .values({ ...data, userId: ctx.userId })
      .returning();
    
    return result!;
  },
  
  async update(documentId: string, content: string, ctx: DataContext): Promise<Document> {
    const existing = await this.get(documentId, ctx);
    if (!existing) throw notFound('document');
    
    const [result] = await db.update(document)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(document.id, documentId), eq(document.userId, ctx.userId)))
      .returning();
    
    return result!;
  },
  
  async delete(documentId: string, ctx: DataContext): Promise<void> {
    const existing = await this.get(documentId, ctx);
    if (!existing) throw notFound('document');
    
    await db.delete(document)
      .where(and(eq(document.id, documentId), eq(document.userId, ctx.userId)));
  },
};
