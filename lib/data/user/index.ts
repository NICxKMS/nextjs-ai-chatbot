import 'server-only';
import { eq } from 'drizzle-orm';
import { db, user } from '@/lib/db';
import type { User, NewUser } from '@/lib/db';

export const userData = {
  async getByEmail(email: string): Promise<User | null> {
    const [result] = await db.select().from(user)
      .where(eq(user.email, email));
    
    return result ?? null;
  },
  
  async getById(userId: string): Promise<User | null> {
    const [result] = await db.select().from(user)
      .where(eq(user.id, userId));
    
    return result ?? null;
  },
  
  async create(data: NewUser): Promise<User> {
    const [result] = await db.insert(user)
      .values(data)
      .returning();
    
    if (!result) {
      throw new Error('Failed to create user');
    }
    
    return result;
  },
};
