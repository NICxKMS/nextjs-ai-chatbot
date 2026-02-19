# Data Layer Process Flow

## Overview

This document details the process flows within the data layer, including database connection management, transaction handling, query patterns, and data lifecycle.

---

## Database Connection Flow

### Connection Initialization

```
Application Startup
    |
    v
getDatabaseUrl() [lib/db/client.ts:27]
    |
    +---> Check DATABASE_URL env var
    +---> Fallback to POSTGRES_URL
    +---> Throw if neither set
    |
    v
getPoolConfig() [lib/db/client.ts:48]
    |
    +---> Vercel Fluid? ---> { max: 5, idle_timeout: 10 }
    +---> Production? ---> { max: 10, idle_timeout: 20 }
    +---> Development? ---> { max: 3, idle_timeout: 30 }
    |
    v
postgres(connectionString, options)
    |
    +---> Connection pool created
    +---> prepare: false (serverless optimization)
    +---> onnotice: log PostgreSQL notices
    |
    v
drizzle(pool, { schema })
    |
    v
Export as 'db'
```

### Pool Configuration Matrix

| Environment | Max Connections | Idle Timeout | Use Case |
|-------------|-----------------|--------------|----------|
| Vercel Fluid | 5 | 10s | Rapid scaling, short-lived |
| Production | 10 | 20s | Traditional serverless |
| Development | 3 | 30s | Local development |

### Connection Health Check

```typescript
// lib/db/client.ts:136
async function isHealthy(): Promise<boolean> {
  try {
    await pool`SELECT 1`
    return true
  } catch (error) {
    logError("Database health check failed", error)
    return false
  }
}
```

### Connection Cleanup

```typescript
// lib/db/client.ts:164
async function closeConnection(): Promise<void> {
  await pool.end()
  logInfo("Database connection pool closed")
}
```

---

## Transaction Flow

### Basic Transaction

```
withTransaction(fn, operation)
    |
    v
Start Performance Timer
    |
    v
Get OpenTelemetry Span
    |
    +---> Set span attributes (db.transaction, db.operation)
    |
    v
db.transaction(fn)
    |
    +---> Execute user function with transaction handle
    |         |
    |         +---> Success: Continue
    |         +---> Error: Auto-rollback by Drizzle
    |
    v
Record Duration
    |
    +---> Duration > 500ms? ---> Log slow transaction warning
    |
    v
Set Success/Failure Attributes
    |
    v
Return Result / Throw DatabaseError
```

### Transaction Example: Save Chat with Messages

```
ChatService.saveChat(params, ctx)
    |
    v
withTransaction(async (tx) => {
    |
    +---> isNewChat?
    |         |
    |         v
    |     tx.insert(chat).values({ id, userId, title, ... })
    |
    +---> tx.insert(message).values(messagesToSave)
    |
    +---> lastContext?
    |         |
    |         v
    |     tx.update(chat)
    |         .set({ lastContext })
    |         .where(eq(chat.id, chatId))
    |
    v
}) // Transaction commits or rolls back
```

### Sequential Transactions

```
withSequentialTransactions([
  { name: 'create_user', fn: async (tx) => { ... } },
  { name: 'create_profile', fn: async (tx) => { ... } }
])
    |
    v
For each operation:
    |
    +---> await withTransaction(fn, name)
    +---> Push result to array
    |
    v
Return results array
```

---

## Query Patterns

### 1. Simple Select by ID

```typescript
// Pattern: Single entity lookup
const [result] = await db
  .select()
  .from(table)
  .where(eq(table.id, id))

return result ?? null
```

### 2. Filtered Select with Pagination

```typescript
// Pattern: Cursor-based pagination
const conditions: SQL[] = [eq(table.userId, userId)]

if (searchQuery) {
  conditions.push(ilike(table.title, `%${searchQuery}%`))
}

const results = await db
  .select()
  .from(table)
  .where(and(...conditions))
  .orderBy(desc(table.updatedAt))
  .limit(limit + 1)  // Fetch N+1 for hasMore detection

const hasMore = results.length > limit
const items = hasMore ? results.slice(0, limit) : results
```

### 3. Join Query

```typescript
// Pattern: Related data fetch
const results = await db
  .select({ message, chat })
  .from(message)
  .innerJoin(chat, eq(message.chatId, chat.id))
  .where(eq(chat.userId, userId))
```

### 4. Aggregation Query

```typescript
// Pattern: Count with filters
const [result] = await db
  .select({
    total: count(),
    publicCount: sql`COUNT(*) FILTER (WHERE visibility = 'public')`
  })
  .from(chat)
  .where(eq(chat.userId, userId))
```

### 5. Upsert Pattern

```typescript
// Pattern: Insert or update on conflict
await db
  .insert(vote)
  .values({ chatId, messageId, userId, isUpvoted })
  .onConflictDoUpdate({
    target: [vote.chatId, vote.messageId, vote.userId],
    set: { isUpvoted }
  })
```

### 6. Batch Insert with Chunking

```typescript
// Pattern: Batch insert with chunking
const chunks = []
for (let i = 0; i < records.length; i += chunkSize) {
  chunks.push(records.slice(i, i + chunkSize))
}

for (const chunk of chunks) {
  await db.insert(table).values(chunk)
}
```

---

## Batch Operations Flow

### Batch Insert

```
batchInsert(table, records, options)
    |
    v
Validate records.length > 0
    |
    v
Calculate safeChunkSize = min(chunkSize, 1000)
    |
    v
Split records into chunks
    |
    v
For each chunk:
    |
    +---> db.insert(table).values(chunk).returning()
    +---> On error: continueOnError? continue : throw
    |
    v
Return { successful: [], failedChunks, errors }
```

### Batch Update

```
batchUpdate(table, updates, options)
    |
    v
Deduplicate by ID (Map)
    |
    v
Split into chunks
    |
    v
For each chunk:
    |
    +---> db.transaction(async (tx) => {
    |       for each update:
    |         tx.update(table).set(data).where(eq(id, ...))
    |     })
    |
    v
Return updateCount
```

### Batch Delete

```
batchDelete(table, ids, options)
    |
    v
Safety check: ids.length <= safetyLimit (default: 10,000)
    |
    v
Deduplicate IDs
    |
    v
Split into chunks
    |
    v
For each chunk:
    |
    +---> db.delete(table).where(inArray(id, chunk))
    |
    v
Return deleteCount
```

---

## Pagination Flow

### Cursor-Based Pagination

```
paginate(query, table, options)
    |
    v
Decode cursor (if provided)
    |
    v
Build cursor condition
    |
    +---> Forward + desc? ---> lt(column, cursorValue)
    +---> Forward + asc? ---> gt(column, cursorValue)
    +---> Backward + desc? ---> gt(column, cursorValue)
    +---> Backward + asc? ---> lt(column, cursorValue)
    |
    v
Apply cursor condition to query
    |
    v
Apply sort order (reverse for backward)
    |
    v
Fetch limit + 1 records
    |
    v
Determine hasMore = results.length > limit
    |
    v
Slice to limit if hasMore
    |
    v
Reverse results if backward pagination
    |
    v
Generate nextCursor (last record's field value)
    |
    v
Generate prevCursor (first record's field value)
    |
    v
Return { data, nextCursor, prevCursor, hasMore }
```

### Cursor Encoding

```
encodeCursor(values)
    |
    v
JSON.stringify(values)
    |
    v
Buffer.from(json).toString('base64url')
    |
    v
Return cursor string

decodeCursor(cursor)
    |
    v
Buffer.from(cursor, 'base64url').toString('utf-8')
    |
    v
JSON.parse(json)
    |
    v
Return values object
```

---

## Cache Integration Flow

### Cache-Through Read

```
Repository.findById(id, context)
    |
    v
Generate cache key (e.g., "chat:uuid")
    |
    v
cache.get(key)
    |
    +---> Cache Hit?
    |         |
    |         v
    |     Return cached value
    |
    +---> Cache Miss?
              |
              v
          doFindById(id, context)  // DB query
              |
              v
          cache.set(key, result, { ttl })
              |
              v
          Return result
```

### Write-Through Write

```
Repository.create(data, context)
    |
    v
doCreate(data, context)  // DB insert
    |
    v
cache.set(key, result, { ttl })  // Update cache
    |
    v
invalidateListCache()  // Invalidate list queries
    |
    v
Return result
```

### Cache Invalidation

```
Repository.delete(id, context)
    |
    v
doDelete(id, context)  // DB delete
    |
    v
cache.delete(key)  // Remove from cache
    |
    v
invalidateListCache()  // Invalidate lists
    |
    v
Return success
```

---

## Guest-Aware Data Flow

### Guest Read Strategy

```
guestAwareGet(key, fetcher, context)
    |
    +---> context.isGuest?
    |         |
    |         v
    |     guestCacheOnly(key, options)
    |         |
    |         +---> Check cache only
    |         +---> Return null on miss (no DB fallback)
    |
    +---> !context.isGuest?
              |
              v
          authUserGet(key, fetcher, options)
              |
              +---> Standard cache-aside
              +---> DB fallback on cache miss
```

### Guest Write Strategy

```
guestAwareWrite(key, data, persister, context)
    |
    +---> context.isGuest?
    |         |
    |         v
    |     guestCacheWrite(key, data, options)
    |         |
    |         +---> Write to cache only
    |         +---> No DB persistence
    |
    +---> !context.isGuest?
              |
              v
          authUserWrite(key, data, persister, options)
              |
              +---> persister(data)  // DB write
              +---> cache.set(key, result)  // Cache update
```

---

## Migration Flow

```
pnpm db:migrate
    |
    v
runMigrate() [lib/db/migrate.ts:25]
    |
    v
Load .env.local
    |
    v
Get DATABASE_URL
    |
    v
Create single-connection client
    |
    v
migrate(db, { migrationsFolder: './drizzle/migrations' })
    |
    v
Log completion
    |
    v
Close connection
    |
    v
Exit 0 (success) or 1 (failure)
```

---

## Error Handling Flow

### Database Error Transformation

```
DB Operation Error
    |
    v
toDatabaseError(operation, error, message)
    |
    v
Map error type:
    |
    +---> Connection error? ---> DatabaseError("connection_failed")
    +---> Constraint violation? ---> DatabaseError("constraint_violation")
    +----- Timeout? ---> DatabaseError("timeout")
    +---> Unknown? ---> DatabaseError("unknown")
    |
    v
Throw typed DatabaseError
```

### Repository Error Handling

```
Repository Method
    |
    v
try {
  // DB operation
} catch (error) {
    |
    v
  logError("Repository error", error, { context })
    |
    v
  throw new InternalServerError("Operation failed", {
    error: error.message,
    ...context
  })
}
```

---

## Data Lifecycle Summary

| Operation | DB | Cache | Transaction |
|-----------|----|----|--------------|
| **findById** | Read on miss | Read-through | No |
| **findMany** | Read | List cache | No |
| **create** | Write | Write-through | No |
| **createMany** | Sequential writes | Update each | No |
| **update** | Write | Write-through | No |
| **delete** | Write | Invalidate | No |
| **deleteMany** | Sequential writes | Invalidate each | No |
| **saveChat** | Multi-write | N/A | Yes |
| **deleteChat** | Multi-delete | N/A | Yes |
| **batchInsert** | Chunked writes | N/A | Per-chunk |
| **batchUpdate** | Chunked updates | N/A | Per-chunk |
| **batchDelete** | Chunked deletes | N/A | No |