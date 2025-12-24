# ADR-004: Guest-to-Auth Data Migration

## Status

Accepted

## Date

2024-12-23

## Reference

ARCH-001, SEC-003

## Context

Guest users can create chats and messages without signing up. This data is stored in Redis cache under guest-prefixed keys. When a guest user decides to register or sign in, their accumulated data would be **orphaned** because:

1. Guest identity: `guest:abc123` (nanoid)
2. Auth identity: `550e8400-e29b-41d4-a716-446655440000` (Supabase UUID)

Without migration, users lose their conversation history upon registration, creating a poor user experience and potential frustration.

### Data Storage Model

```
Guest Mode:
- Redis: chat:guest:abc123:{chatId} → chat metadata
- Redis: messages:guest:abc123:{chatId} → message array
- Redis: user:chats:guest:abc123 → chat list

After Auth:
- PostgreSQL: chat table → user_id = Supabase UUID
- PostgreSQL: message table → chat_id FK
- Redis: cache mirrors DB for hot data
```

## Decision

Implement **atomic guest-to-auth data migration** triggered on successful authentication callback.

### Implementation

```typescript
// lib/data/migrate-guest.ts
export async function migrateGuestToAuthUser(
    guestId: string,      // The nanoid (NOT prefixed)
    authUserId: string    // Supabase UUID
): Promise<MigrationResult> {
    // 1. Get all guest chats from Redis cache
    const cachedChats = await getUserChatsFromCache(guestId);

    if (!cachedChats?.length) {
        return EMPTY_RESULT;  // Nothing to migrate
    }

    // 2. Collect chat data with messages
    const chatsToMigrate = [];
    for (const cachedChat of cachedChats) {
        const chatMeta = await getChatFromCache(cachedChat.chatId, guestId);
        const messages = await getMessagesFromCache(cachedChat.chatId, guestId);
        chatsToMigrate.push({ meta: chatMeta, messages });
    }

    // 3. Atomic database transaction
    await withTransaction(async (tx) => {
        // Insert chats with new user_id
        for (const chat of chatsToMigrate) {
            await tx.insert(chatTable).values({
                id: chat.meta.id,
                userId: authUserId,  // Now owned by auth user
                title: chat.meta.title,
                // ... other fields
            });

            // Insert messages
            await tx.insert(messageTable).values(
                chat.messages.map(m => ({ ...m, chatId: chat.meta.id }))
            );
        }
    });

    // 4. Clean up guest cache keys
    await deleteAllUserChatsFromCache(guestId);

    return { success: true, migratedChats: chats.length, ... };
}
```

### Trigger Points

Migration is invoked from:

- Auth callback after successful OAuth flow
- Post-registration confirmation
- First authenticated API request (fallback)

### Migration Result Type

```typescript
interface MigrationResult {
  success: boolean;
  migratedChats: number;
  migratedMessages: number;
  migratedAt: Date;
  warnings: string[];
  error?: string;
}
```

## Consequences

### Positive

- **Zero data loss** - all guest conversations preserved
- **Seamless UX** - user sees their chats immediately after sign-up
- **Atomic operation** - transaction ensures consistency
- **Idempotent** - safe to retry on failure
- **Audit trail** - migration result logged with counts

### Negative

- **Migration latency** - adds time to auth callback (typically 100-500ms)
- **Transaction size** - large guest history = larger transaction
- **Race conditions** - concurrent requests during migration need handling
- **Storage duplication** - brief window where data exists in both Redis and DB

### Neutral

- Guest cache keys cleaned up after successful migration
- Failed migrations leave data in Redis (can retry)

## Alternatives Considered

### 1. Lazy Migration on Access

- Migrate chats one-by-one as user accesses them
- **Rejected**: Poor UX (chats appear gradually), complex state management

### 2. Background Job Migration

- Queue migration job, process asynchronously
- **Rejected**: User expects immediate access, job failure handling complex

### 3. Dual-Write from Start

- Write guest data to both Redis and DB from the beginning
- **Rejected**: Unnecessary DB load for users who never register

### 4. No Migration (Accept Data Loss)

- Guest data is ephemeral, lost on registration
- **Rejected**: Poor user experience, drives away potential users

### 5. Link Guest ID to Auth Account

- Store guest ID in auth user record, query both
- **Rejected**: Complex querying, doesn't solve ownership problem

## Error Handling

### Validation

- `guestId` must be non-empty string
- `authUserId` must be valid UUID format
- Both validated before migration starts

### Partial Failure

- Transaction rollback on any insert failure
- Guest data remains in Redis (can retry)
- Error logged with context for debugging

### Concurrent Migration

- Unique constraint on chat ID prevents duplicates
- Second migration attempt sees empty cache, returns EMPTY_RESULT

## Related Files

- [lib/data/migrate-guest.ts](../../lib/data/migrate-guest.ts) - Migration implementation
- [lib/cache-ops/index.ts](../../lib/cache-ops/index.ts) - Cache access functions
- [lib/db/schema.ts](../../lib/db/schema.ts) - Database schema
- [app/api/auth/callback/route.ts](../../app/api/auth/callback/route.ts) - Migration trigger
