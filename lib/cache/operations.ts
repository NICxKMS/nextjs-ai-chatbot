import 'server-only';
import { getRedisClient, isRedisAvailable } from './client';
import { withCircuitBreaker } from './circuit-breaker';
import { CacheKeys } from './keys';
import type { CachedChatMeta, CachedMessage, CachedChat } from './types';

export async function getChatMetaFromCache(
  chatId: string,
  userId: string
): Promise<CachedChatMeta | null> {
  if (!isRedisAvailable()) return null;
  
  return withCircuitBreaker('getChatMeta', null, async () => {
    const redis = getRedisClient()!;
    const key = CacheKeys.chat.meta(chatId, userId);
    return redis.get<CachedChatMeta>(key);
  });
}

export async function setChatMetaInCache(
  chatId: string,
  userId: string,
  meta: CachedChatMeta
): Promise<void> {
  if (!isRedisAvailable()) return;
  
  await withCircuitBreaker('setChatMeta', undefined, async () => {
    const redis = getRedisClient()!;
    const key = CacheKeys.chat.meta(chatId, userId);
    await redis.set(key, meta);
  });
}

export async function getMessagesFromCache(
  chatId: string,
  userId: string,
  count?: number
): Promise<CachedMessage[]> {
  if (!isRedisAvailable()) return [];
  
  return withCircuitBreaker('getMessages', [], async () => {
    const redis = getRedisClient()!;
    const key = CacheKeys.chat.messages(chatId, userId);
    
    if (count) {
      return redis.zrange<CachedMessage[]>(key, -count, -1);
    }
    return redis.zrange<CachedMessage[]>(key, 0, -1);
  });
}

export async function appendMessageToCache(
  chatId: string,
  userId: string,
  message: CachedMessage
): Promise<void> {
  if (!isRedisAvailable()) return;
  
  await withCircuitBreaker('appendMessage', undefined, async () => {
    const redis = getRedisClient()!;
    const key = CacheKeys.chat.messages(chatId, userId);
    const score = new Date(message.createdAt).getTime();
    await redis.zadd(key, { score, member: message });
  });
}

export async function deleteChatFromCache(
  chatId: string,
  userId: string
): Promise<void> {
  if (!isRedisAvailable()) return;
  
  await withCircuitBreaker('deleteChat', undefined, async () => {
    const redis = getRedisClient()!;
    const metaKey = CacheKeys.chat.meta(chatId, userId);
    const msgsKey = CacheKeys.chat.messages(chatId, userId);
    await redis.del(metaKey, msgsKey);
  });
}

export async function getUserQuota(userId: string): Promise<number> {
  if (!isRedisAvailable()) return 0;
  
  const date = new Date().toISOString().slice(0, 10);
  
  return withCircuitBreaker('getUserQuota', 0, async () => {
    const redis = getRedisClient()!;
    const key = CacheKeys.user.quota(userId, date);
    const count = await redis.get<number>(key);
    return count ?? 0;
  });
}

export async function incrementUserQuota(userId: string, delta = 1): Promise<number> {
  if (!isRedisAvailable()) return 0;
  
  const date = new Date().toISOString().slice(0, 10);
  
  return withCircuitBreaker('incrementQuota', 0, async () => {
    const redis = getRedisClient()!;
    const key = CacheKeys.user.quota(userId, date);
    const newCount = await redis.incrby(key, delta);
    await redis.expire(key, 25 * 60 * 60); // 25 hours TTL
    return newCount;
  });
}
