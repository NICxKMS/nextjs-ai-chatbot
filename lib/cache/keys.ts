export const CacheKeys = {
  chat: {
    meta: (chatId: string, userId: string) => `chat:${chatId}:${userId}:meta`,
    messages: (chatId: string, userId: string) => `chat:${chatId}:${userId}:msgs`,
  },
  user: {
    chats: (userId: string) => `user:${userId}:chats`,
    quota: (userId: string, date: string) => `quota:{${userId}}:${date}`,
  },
  document: (documentId: string, userId: string) => `document:${documentId}:${userId}`,
} as const;
