# AI Assistant Codebase Instructions

## Project Overview

This is a **Next.js 16 AI Chatbot** application using the Vercel AI SDK, React 19, and a cache-first data architecture. The app supports both **authenticated users** (persistent storage) and **guest users** (cache-only, ephemeral sessions).

**Tech Stack:**

- Next.js 16.0.7 with App Router and Turbopack
- React 19.2.1 with React Compiler
- TypeScript 5.6.x (strict mode)
- Drizzle ORM with PostgreSQL (NeonDB)
- Upstash Redis for caching
- Supabase for authentication
- Vercel AI SDK 5.x (`ai` package)
- UI: shadcn/ui, Radix UI, TailwindCSS 4.x, Framer Motion
- Linting: Biome (via ultracite) - NOT ESLint

---

## Directory Structure

```
app/                    # Next.js App Router pages and layouts
  (auth)/               # Auth routes (login, register)
  (chat)/               # Chat interface routes
  api/                  # API routes (auth only)
components/             # React components
  ui/                   # shadcn/ui base components (do not modify)
  elements/             # Custom reusable elements
  settings/             # Settings-related components
hooks/                  # Custom React hooks
lib/                    # Core business logic
  ai/                   # AI SDK config, models, tools, prompts
  auth/                 # Session management, middleware
  cache/                # Redis cache operations
  data/                 # Data access layer (chatData, messageData, documentData)
  db/                   # Database schema, queries, migrations
  artifacts/            # Artifact type handlers
artifacts/              # Artifact creation and rendering
docs/                   # Documentation
tests/                  # Playwright tests
```

---

## Critical Patterns

### 1. Data Access Layer (Cache-First Strategy)

**ALWAYS use the data access layer** in `lib/data/` - NEVER access cache or database directly from components or API routes.

```typescript
// ✅ CORRECT: Use data layer
import { chatData } from "@/lib/data/chat";
const chat = await chatData.getById(chatId, ctx);

// ❌ WRONG: Direct cache/DB access
import { getChatFromCache } from "@/lib/cache/operations";
import { db } from "@/lib/db/queries";
```

**Key data modules:**

- `lib/data/chat.ts` → `chatData` object for chat operations
- `lib/data/document.ts` → `documentData` object for document/artifact operations
- `lib/data/message.ts` → `messageData` object for message operations

**Context Pattern** - All data operations require a `DataContext`:

```typescript
import { createDataContext, type DataContext } from "@/lib/data/base";

// In server components/actions:
const ctx = createDataContext(session);
await chatData.getById(chatId, ctx);

// Guest vs Auth behavior is automatic:
// - Guest: Cache-only (no DB writes)
// - Authenticated: Cache + DB persistence
```

### 2. Server-Only Imports

Files in `lib/data/`, `lib/db/`, and `lib/cache/` use `import "server-only"`. These **cannot be imported in client components**.

```typescript
// ✅ CORRECT: Use in Server Components, API routes, Server Actions
import { chatData } from "@/lib/data/chat";

// ❌ WRONG: Will fail in Client Components
("use client");
import { chatData } from "@/lib/data/chat"; // ERROR!
```

### 3. Error Handling

Use `ChatSDKError` for all application errors:

```typescript
import { ChatSDKError, toDatabaseError } from "@/lib/errors";

// API/business logic errors
throw new ChatSDKError("not_found:chat", "Chat not found");

// Database errors (auto-maps Postgres codes)
try {
  await db.insert(chat).values(data);
} catch (error) {
  throw toDatabaseError("create_chat", error, "Failed to create chat");
}

// In API routes, return error response:
return error.toResponse(); // Returns proper JSON with status code
```

**Error code format**: `{type}:{surface}` or `{type}:{surface}:{reason}`

- Types: `bad_request`, `unauthorized`, `forbidden`, `not_found`, `rate_limit`, `offline`
- Surfaces: `chat`, `auth`, `api`, `stream`, `database`, `document`, etc.

### 4. Session & Authentication

```typescript
import { getAppSession } from "@/lib/auth/session";

// In Server Components/Actions:
const session = await getAppSession();

if (!session.user) {
  // Handle unauthenticated
}

// User types:
// - session.user.type === "guest" → Cache-only user
// - session.user.type === "regular" → Authenticated user with DB persistence
```

### 5. AI SDK Usage

```typescript
import { streamText, generateText } from "ai";
import { getCuratedProviders } from "@/lib/ai/providers";

// Get configured AI providers
const providers = await getCuratedProviders();

// Stream responses
const result = await streamText({
  model: providers.openai("gpt-4"),
  messages,
  tools: myTools,
});
```

---

## Code Style & Linting

This project uses **Biome** (via ultracite), NOT ESLint.

```bash
pnpm lint      # Check code
pnpm format    # Auto-fix issues
```

**Key rules (from ultracite):**

- Use `import type` for type-only imports
- Use `export type` for type-only exports
- No TypeScript enums (use `as const` objects)
- No non-null assertions (`!`)
- No namespace imports (`import * as`)
- Array types: prefer `T[]` over `Array<T>`
- Prefer `===` over `==`
- No unused variables/imports

**Formatting:**

- 4-space indentation
- LF line endings
- Biome handles all formatting (no Prettier)

---

## Component Patterns

### Server Components (Default)

```typescript
// app/(chat)/page.tsx - Server Component by default
import { chatData } from "@/lib/data/chat";

export default async function ChatPage() {
  const chats = await chatData.list(ctx);
  return <ChatList chats={chats} />;
}
```

### Client Components

```typescript
// components/chat.tsx
"use client";

import { useChat } from "@ai-sdk/react";

export function Chat({ chatId }: { chatId: string }) {
  const { messages, input, handleSubmit } = useChat({
    api: "/api/chat",
  });
  // ...
}
```

### UI Components

Base UI components are in `components/ui/` (shadcn/ui). **Do not modify these directly** - they're excluded from linting.

For custom elements, use `components/elements/` or create new files in `components/`.

---

## Database

**Schema**: `lib/db/schema.ts` (Drizzle ORM)

Key tables: `user`, `chat`, `message`, `document`, `vote`, `suggestion`

```typescript
// Running migrations
pnpm db:migrate

// Generate new migration
pnpm db:generate

// View database
pnpm db:studio
```

**Never import `db` directly in components** - use the data layer.

---

## Caching (Redis)

Cache operations are in `lib/cache/operations.ts`. **Never call these directly** - the data layer handles caching automatically.

**Cache key structure:**

- `chat:{chatId}:{userId}:meta` → Chat metadata
- `chat:{chatId}:{userId}:msgs` → Messages (Redis Sorted Set)
- `user:{userId}:chats` → User's chat list
- `doc:{documentId}:{userId}` → Document data

---

## Testing

```bash
pnpm test           # Run Playwright tests
pnpm test --debug   # Debug mode
```

Tests are in `tests/` directory using Playwright.

---

## Environment Variables

Required:

- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` - Supabase auth
- `SUPABASE_JWT_SECRET` - JWT verification
- `GUEST_JWT_SECRET` - Guest token signing
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` - Redis
- `OPENAI_API_KEY` or other AI provider keys

---

## Common Tasks

### Adding a New Data Operation

1. Add the method to the appropriate data module (`lib/data/chat.ts`, etc.)
2. Follow cache-first pattern:
   - Check cache first
   - On cache miss (for auth users): query DB, warm cache
   - Write operations: update cache + DB (auth users) or cache-only (guests)

### Adding a New API Route

1. Create in `app/api/` or `app/(chat)/api/`
2. Use `ChatSDKError` for errors
3. Access data via data layer with proper context

### Adding a New Component

1. Server component: Place in `app/` or `components/`
2. Client component: Add `"use client"` directive
3. Use hooks from `hooks/` for shared logic
4. Follow shadcn/ui patterns for UI elements

---

## Observability

- **Analytics**: `@vercel/analytics` (auto-included in layout)
- **Speed Insights**: `@vercel/speed-insights` (auto-included in layout)
- **OpenTelemetry**: `@vercel/otel` for tracing
- **Logging**: Use `lib/log.ts` for structured logging (OpenTelemetry-based)

```typescript
import { logError, logWarn } from "@/lib/log";

logError("operation_name", "Error message", { context: "data" });
```

---

## Don'ts

1. ❌ Don't use ESLint or Prettier - use Biome
2. ❌ Don't access `db` or cache directly - use data layer
3. ❌ Don't use `any` type without explicit override
4. ❌ Don't import server-only modules in client components
5. ❌ Don't use `console.log` for production logging - use `lib/log.ts`
6. ❌ Don't create new database queries in components - add to `lib/db/queries.ts`
7. ❌ Don't skip the `DataContext` pattern in data operations
