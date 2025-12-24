# Fix Plan: MEDIUM Database & Configuration Issues

**Issues**: Database (#248-260), Config (#262-279), Misc (#13-25)
**Priority**: 🟡 MEDIUM
**Total Effort**: ~5-6 hours
**Created**: 2025-12-22

---

## Summary

### Database Schema Issues

| #    | Issue                            | Location               | Effort | Status    |
| ---- | -------------------------------- | ---------------------- | ------ | --------- |
| #248 | passwordHash length insufficient | lib/db/schema.ts:34    | 15m    | OPEN      |
| #249 | Missing index on vote.messageId  | lib/db/schema.ts:96-99 | 10m    | OPEN      |
| #252 | JSON columns unvalidated         | lib/db/schema.ts:80    | 30m    | OPEN      |
| #254 | Document content allows null     | lib/db/schema.ts:133   | 10m    | OPEN      |
| #258 | Naming convention inconsistency  | lib/db/schema.ts       | 30m    | OPEN      |
| #260 | Duplicate of #252                | -                      | -      | DUPLICATE |

### Configuration Issues

| #    | Issue                       | File             | Effort | Status |
| ---- | --------------------------- | ---------------- | ------ | ------ |
| #262 | Source maps disabled        | next.config.ts   | 10m    | OPEN   |
| #265 | Missing security headers    | next.config.ts   | 30m    | OPEN   |
| #270 | noExplicitAny disabled      | biome.jsonc      | 1h     | OPEN   |
| #279 | Coverage exclude incomplete | vitest.config.ts | 15m    | OPEN   |

### Misc Issues

| #   | Issue                        | Category      | Effort | Status |
| --- | ---------------------------- | ------------- | ------ | ------ |
| #13 | Vote toggle state management | UI State      | 30m    | OPEN   |
| #14 | Document preview cache       | Cache         | 45m    | OPEN   |
| #17 | OpenTelemetry not connected  | Observability | 1h     | OPEN   |
| #21 | Streaming abort handling     | AI            | 30m    | OPEN   |
| #22 | Tool call timeout            | AI            | 30m    | OPEN   |
| #25 | Search not implemented       | Feature       | 2h     | OPEN   |

---

## Database Fixes

### Issue #248: passwordHash Length

**File**: `lib/db/schema.ts`
**Effort**: 15 minutes

```typescript
// Before (may truncate future algo outputs)
passwordHash: varchar("password_hash", { length: 100 }),

// After (Argon2id can be 97+ chars, bcrypt 60)
passwordHash: varchar("password_hash", { length: 255 }),
```

**Migration**:

```sql
ALTER TABLE "user" ALTER COLUMN "password_hash" TYPE varchar(255);
```

---

### Issue #249: Missing Index on vote.messageId

**File**: `lib/db/schema.ts`
**Effort**: 10 minutes

```typescript
// Add index for vote queries by message
export const vote = pgTable(
  "vote",
  {
    chatId: uuid("chat_id").references(() => chat.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").notNull(),
    isUpvoted: boolean("is_upvoted").notNull(),
  },
  (table) => ({
    messageIdx: index("vote_message_idx").on(table.messageId),
  })
);
```

**Migration**:

```sql
CREATE INDEX "vote_message_idx" ON "vote" ("message_id");
```

---

### Issue #252: JSON Columns Unvalidated

**File**: `lib/db/schema.ts`
**Effort**: 30 minutes

```typescript
// Define Zod schemas for JSON columns
import { z } from "zod";

const MessagePartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image"), url: z.string().url() }),
  z.object({
    type: z.literal("tool-call"),
    toolName: z.string(),
    args: z.record(z.unknown()),
  }),
]);

const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string().url(),
  size: z.number(),
});

// Validation wrapper
export function validateMessageParts(parts: unknown): MessagePart[] {
  return z.array(MessagePartSchema).parse(parts);
}

export function validateAttachments(attachments: unknown): Attachment[] {
  return z.array(AttachmentSchema).parse(attachments);
}

// Use in queries
const message = await db.query.message.findFirst({ where: eq(message.id, id) });
const validatedParts = validateMessageParts(message.parts);
```

---

### Issue #254: Document Content Allows Null

**File**: `lib/db/schema.ts`
**Effort**: 10 minutes

```typescript
// Before (allows null unexpectedly)
content: text("content"),

// After (explicit handling)
content: text("content").notNull().default(''),

// Or if null is intentional, add comment
content: text("content"), // null = document not yet loaded
```

---

### Issue #258: Naming Convention Inconsistency

**File**: `lib/db/schema.ts`
**Effort**: 30 minutes

Standardize on snake_case for database columns:

```typescript
// Current mix
userId: uuid("user_id"),      // ✅ snake_case
isUpvoted: boolean("isUpvoted"), // ❌ camelCase

// Standardized
userId: uuid("user_id"),
isUpvoted: boolean("is_upvoted"),
createdAt: timestamp("created_at"),
```

---

## Configuration Fixes

### Issue #262: Source Maps Disabled

**File**: `next.config.ts`
**Effort**: 10 minutes

```typescript
// next.config.ts
const nextConfig = {
  productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === "true",

  webpack: (config, { dev }) => {
    if (!dev && process.env.ENABLE_SOURCE_MAPS === "true") {
      config.devtool = "source-map";
    }
    return config;
  },
};
```

---

### Issue #265: Missing Security Headers

**File**: `next.config.ts`
**Effort**: 30 minutes

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
```

---

### Issue #270: noExplicitAny Disabled

**File**: `biome.jsonc`
**Effort**: 1 hour (gradual)

Track and fix explicit `any` usages:

```jsonc
{
  "linter": {
    "rules": {
      "suspicious": {
        // Phase 1: Warn only
        "noExplicitAny": "warn"
        // Phase 2 (after fixes): "error"
      }
    }
  }
}
```

Common replacements:

```typescript
// any → unknown (for truly unknown data)
function parseJSON(data: string): unknown { ... }

// any → generic (for flexible but typed)
function wrap<T>(value: T): { value: T } { ... }

// any → specific type (when type is known)
function handleEvent(event: MouseEvent) { ... }
```

---

### Issue #279: Coverage Exclude Incomplete

**File**: `vitest.config.ts`
**Effort**: 15 minutes

```typescript
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules/**",
        "tests/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/types/**",
        "oldapp/**", // Add: legacy code
        "test-results/**", // Add: test outputs
        "prompt-genome/**", // Add: prompt experiments
        ".ouroboros/**", // Add: spec files
      ],
    },
  },
});
```

---

## Misc Fixes

### Issue #13: Vote Toggle State Management

**Effort**: 30 minutes

```typescript
// features/chat/hooks/use-vote.ts
function useVote(messageId: string) {
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");
  const [vote, setVote] = useState<boolean | null>(null);

  async function toggleVote(isUpvote: boolean) {
    const previousVote = vote;
    setState("pending");
    setVote(isUpvote);

    try {
      await submitVote(messageId, isUpvote);
      setState("idle");
    } catch {
      setVote(previousVote); // Rollback
      setState("error");
    }
  }

  return { vote, state, toggleVote };
}
```

---

### Issue #14: Document Preview Cache

**Effort**: 45 minutes

```typescript
// lib/cache/document-preview.ts
import { LRUCache } from "lru-cache";

const previewCache = new LRUCache<
  string,
  { html: string; generatedAt: number }
>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function getDocumentPreview(documentId: string): Promise<string> {
  const cached = previewCache.get(documentId);
  if (cached) return cached.html;

  const html = await generatePreview(documentId);
  previewCache.set(documentId, { html, generatedAt: Date.now() });
  return html;
}

export function invalidatePreview(documentId: string) {
  previewCache.delete(documentId);
}
```

---

### Issue #21: Streaming Abort Handling

**Effort**: 30 minutes

```typescript
// features/chat/hooks/use-chat.ts
const abortController = useRef<AbortController | null>(null);

async function sendMessage(content: string) {
  // Cancel any in-flight request
  abortController.current?.abort();
  abortController.current = new AbortController();

  try {
    await streamChat(content, { signal: abortController.current.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // User cancelled - not an error
      return;
    }
    throw error;
  }
}

function stopGeneration() {
  abortController.current?.abort();
}
```

---

### Issue #22: Tool Call Timeout

**Effort**: 30 minutes

```typescript
// lib/ai/tools/execute.ts
const TOOL_TIMEOUT_MS = 30000; // 30 seconds

async function executeToolWithTimeout<T>(
  tool: () => Promise<T>,
  timeoutMs = TOOL_TIMEOUT_MS
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Tool execution timed out")), timeoutMs);
  });

  return Promise.race([tool(), timeoutPromise]);
}

// Usage
const result = await executeToolWithTimeout(
  () => searchWeb(query),
  10000 // Custom timeout for search
);
```

---

## Implementation Order

### Week 1 (Infrastructure)

- [ ] #265 - Security headers (blocks deployment)
- [ ] #248, #249 - DB migrations (quick wins)
- [ ] #252 - JSON validation (data integrity)

### Week 2 (DX)

- [ ] #262 - Source maps
- [ ] #279 - Coverage config
- [ ] #258 - Naming conventions

### Week 3 (Features)

- [ ] #13 - Vote state
- [ ] #14 - Preview cache
- [ ] #21, #22 - AI improvements
- [ ] #270 - noExplicitAny (gradual)
