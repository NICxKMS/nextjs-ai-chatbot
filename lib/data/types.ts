import 'server-only';
import type { Chat, Message, Document, Vote, User } from '@/lib/db';

export interface DataContext {
  userId: string;
  isGuest: boolean;
}

export interface PaginationParams {
  limit: number;
  startingAfter?: string | null;
  endingBefore?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
}

export type ChatWithMessages = {
  chat: Chat;
  messages: Message[];
};

export type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
