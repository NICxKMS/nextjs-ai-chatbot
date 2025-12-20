export { getRedisClient, isRedisAvailable } from './client';
export { withCircuitBreaker, isCircuitOpen } from './circuit-breaker';
export { CacheKeys } from './keys';
export type { 
  CachedChat, 
  CachedChatMeta, 
  CachedMessage, 
  CachedDocument,
  CacheOptions 
} from './types';
export { TTL } from './types';

export {
  getChatMetaFromCache,
  setChatMetaInCache,
  getMessagesFromCache,
  appendMessageToCache,
  deleteChatFromCache,
  getUserQuota,
  incrementUserQuota,
} from './operations';
