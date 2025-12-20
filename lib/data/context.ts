import 'server-only';
import { getAppSession } from '@/lib/auth';
import type { DataContext } from './types';

export async function createContext(): Promise<DataContext | null> {
  const session = await getAppSession();
  
  if (!session) {
    return null;
  }
  
  return {
    userId: session.user.id,
    isGuest: session.user.type === 'guest',
  };
}

export function isGuest(ctx: DataContext): boolean {
  return ctx.isGuest;
}
