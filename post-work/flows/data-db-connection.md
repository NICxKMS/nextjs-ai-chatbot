FLOW: DB Connection
ENTRY: `lib/db/client.ts` — module-level singleton initialization
STEPS:
  1. Module loads → checks `DATABASE_URL` env var → throws Error if missing
  2. `getPoolConfig()` → selects pool parameters based on environment:
     - Vercel Fluid: `{ max: 5, idle_timeout: 10 }`
     - Production: `{ max: 10, idle_timeout: 20 }`
     - Development: `{ max: 3, idle_timeout: 30 }`
  3. Singleton guard → `globalForDb.pgClient` checked on `globalThis`:
     - If exists (HMR reuse): skips creation, reuses existing `postgres()` client
     - If absent: creates new `postgres(DATABASE_URL, { ...poolConfig, connect_timeout: 10, prepare: false })`
  4. `prepare: false` → required for PgBouncer transaction mode compatibility (also safe in session mode)
  5. In non-production → assigns client to `globalForDb.pgClient` for HMR singleton persistence
  6. `drizzle(client, { schema })` → creates Drizzle ORM instance with full schema binding → exported as `db`
  7. All data layer functions (`lib/data/*.ts`) import `db` from this module → share the single pool

BOTTLENECKS:
  - PgBouncer session mode limits total connections to `pool_size` — if Supabase pooler is in session mode, 
    dev's 3-connection max can be exhausted by HMR + `'use cache'` worker environments evaluating the module
    in parallel. The singleton guard on `globalThis` mitigates this but only within the same process.
  - `connect_timeout: 10` (seconds) — a cold Supabase database can take several seconds to wake, which may
    cause connection timeouts on the first request after idle. No retry logic on connection establishment.

WASTE:
  - `getPoolConfig()` is called on every module evaluation but always returns the same result for a given
    `NODE_ENV` / `VERCEL_FLUID` combination. Minor — function is trivial.
  - No connection health check or keepalive ping — idle connections may be silently dropped by PgBouncer
    after its server-side idle timeout, causing a surprise error on the next query.

SIMPLIFICATION OPPORTUNITIES:
  - The `getPoolConfig()` function could be a `const` lookup map instead of branching logic, but the 
    current form is clear enough.
  - Consider adding `idle_timeout` alignment with Supabase PgBouncer's `server_idle_timeout` to prevent
    stale connection errors.

EXIT: `db` (Drizzle instance) exported as a singleton, ready for queries in `lib/data/*.ts`

---

## Schema Overview (6 tables)

| Table       | PK                     | Notable Indexes                           | FK Cascades         |
|-------------|------------------------|-------------------------------------------|---------------------|
| `User`      | `id` (uuid)            | `email` unique                            | —                   |
| `Chat`      | `id` (uuid)            | `(userId, createdAt)`, `(userId, updatedAt DESC, id DESC)` | `userId → User.id` CASCADE |
| `Message_v2`| `id` (uuid)            | `(chatId, createdAt)`, `(chatId, createdAt, role)` | `chatId → Chat.id` CASCADE |
| `Vote_v2`   | `(chatId, messageId, userId)` composite | —                              | `chatId → Chat`, `messageId → Message`, `userId → User` all CASCADE |
| `Artifact`  | `(id, createdAt)` composite | `userId`, `chatId`                    | `userId → User`, `chatId → Chat` both CASCADE |
| `Suggestion`| `id`                   | `artifactId`, FK `(artifactId, artifactCreatedAt) → Artifact(id, createdAt)` | `userId → User` CASCADE |

### Index Analysis
- **Chat cursor pagination** uses `chat_user_updated_idx ON (userId, updatedAt DESC, id DESC)` — perfect compound index for the cursor query pattern.
- **Message queries** use `message_chat_created_idx ON (chatId, createdAt)` — covers all ordered message reads.
- **Votes** have no standalone index beyond the composite PK — `getVotesByChatId` filters on `(chatId, userId)` which is a prefix of the PK, so Postgres can use the PK index efficiently.
- **Artifacts** have `artifact_chat_idx ON (chatId)` — covers `getLatestArtifactByChatId` which filters on `(chatId, userId)`. The index only covers `chatId`; the `userId` filter requires a post-filter. For high-artifact-count chats this could matter, but typical usage is low.
- **Suggestions** have `suggestion_artifact_idx ON (artifactId)` — `getSuggestionsByArtifactVersion` filters on `(artifactId, artifactCreatedAt)`: the index covers the first column, second column requires post-filter.

### Missing Index Risks
- **Suggestion lookups by (artifactId, artifactCreatedAt)**: The index is only on `artifactId`. A composite index `(artifactId, artifactCreatedAt)` would be more efficient for version-specific queries, though row counts per artifact are typically tiny.
- **Artifact lookups by (chatId, userId)**: `artifact_chat_idx` covers `chatId` only. A composite `(chatId, userId)` index would eliminate the row-level `userId` filter in `getLatestArtifactByChatId`. Again, low row counts make this minor.
