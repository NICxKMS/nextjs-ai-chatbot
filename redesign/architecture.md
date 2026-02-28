# System Architecture

> Complete system architecture for the Next.js 16 AI chatbot redesign.  
> Addresses: CRITICAL-1, CRITICAL-3, I-2, II-1, VIII-3, VIII-4, VIII-8

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16 | App Router, RSC, streaming, `use cache`, PPR |
| UI Library | React | 19 | Server/Client components, `useOptimistic`, `use()` |
| Language | TypeScript | 5.x | Strict mode, no implicit `any` |
| ORM | Drizzle ORM | latest | Type-safe SQL, migrations |
| Database | Supabase (PostgreSQL) | managed | Primary data store |
| Cache | Redis (Upstash) | managed | Session cache, rate limiting, data cache |
| CSS | Tailwind CSS | v4 | Utility-first styling |
| AI | Vercel AI SDK | 4.x | `useChat`, `streamText`, data parts, tool calling |
| Validation | Zod | latest | Runtime schema validation |
| Linting/Formatting | Biome | latest | Single tool for lint + format |
| Package Manager | pnpm | latest | Workspace management |

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      app/ layer                         │
│          Routing shell, layouts, pages, API routes      │
│          Imports from: features/, components/, lib/      │
├─────────────────────────────────────────────────────────┤
│                    features/ layer                       │
│          Feature modules (chat, artifacts, auth, etc.)  │
│          Imports from: components/, lib/                 │
│          Cross-feature: types-only via lib/types/        │
├─────────────────────────────────────────────────────────┤
│              components/ + lib/ layer                    │
│          Shared UI primitives    Infrastructure code     │
│          (buttons, dialogs)      (db, cache, ai, auth)  │
│          Imports from: lib/      Imports from: nothing   │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**`app/` — Routing Shell**
- Route definitions (pages, layouts, error boundaries, loading states)
- Layout composition (server layouts with client islands)
- API route handlers (`route.ts` exports)
- `proxy.js` (auth guard + rate limiting)
- Root-level config (`next.config.ts`, `biome.json`)
- Imports from `features/`, `components/`, `lib/`
- Contains NO business logic — only orchestration and data fetching

**`features/` — Feature Modules**
- Self-contained feature directories
- Each feature owns: components, hooks, actions, schemas, types, lib utilities
- Imports from `components/`, `lib/`
- Cross-feature imports: **types and schemas only** via `lib/types/`
- Implementation details (components, hooks, handlers) are feature-internal

**`components/` — Shared UI**
- Reusable UI primitives (buttons, dialogs, tooltips, inputs)
- Design system components (from shadcn/ui)
- Layout primitives (sidebar, content area)
- Contains NO business logic — purely presentational
- Imports from `lib/` only

**`lib/` — Shared Infrastructure**
- Database client and schema (`lib/db/`)
- Cache client and utilities (`lib/cache/`)
- AI SDK configuration and registries (`lib/ai/`)
- Auth utilities (`lib/auth/`)
- Shared type definitions (`lib/types/`)
- Pure utility functions (`lib/utils/`)
- Imports from: **nothing above** (leaf layer)

### Import Rules

```
ALLOWED:
  app/         → features/*, components/*, lib/*
  features/*   → components/*, lib/*
  features/X   → lib/types/* (cross-feature type contracts)
  components/* → lib/*
  lib/*        → (external packages only)

FORBIDDEN:
  lib/*        → components/*, features/*, app/*
  components/* → features/*, app/*
  features/X   → features/Y/components/*, features/Y/hooks/*
  features/*   → app/*
```

**Enforcement**: See Principle 10 (Import Boundary Enforcement) in [principles.md](./principles.md). CI script + optional Biome rule + optional TS project references.

---

## Directory Structure

```
nextjs-ai-chatbot/
├── proxy.ts                          # Next.js 16 proxy (was middleware.js)
├── next.config.ts                    # cacheComponents: true, etc.
├── biome.json                        # Lint + format config
├── package.json
├── tsconfig.json
│
├── app/
│   ├── layout.tsx                    # ROOT layout (SERVER) — ThemeProvider, SessionProvider
│   ├── global-error.tsx              # Root error boundary
│   ├── globals.css                   # Tailwind imports
│   │
│   ├── (auth)/
│   │   ├── layout.tsx                # Auth layout (SERVER)
│   │   ├── error.tsx                 # Auth error boundary
│   │   ├── login/page.tsx            # Login page
│   │   └── register/page.tsx         # Register page
│   │
│   ├── (chat)/
│   │   ├── layout.tsx                # Chat layout (SERVER) — Sidebar + PendingChats
│   │   ├── error.tsx                 # Chat error boundary
│   │   ├── page.tsx                  # New chat page (SERVER)
│   │   └── chat/
│   │       └── [id]/
│   │           └── page.tsx          # Existing chat page (SERVER)
│   │
│   └── api/
│       ├── chat/route.ts             # POST — AI chat streaming
│       ├── artifact/route.ts         # POST — artifact version save
│       ├── files/upload/route.ts     # POST — file upload
│       ├── history/route.ts          # GET — paginated chat history
│       ├── suggestions/route.ts      # GET — suggestions for artifact
│       └── health/route.ts           # GET — health check
│
├── features/
│   ├── chat/
│   │   ├── components/
│   │   │   ├── chat-shell.tsx        # Thin orchestrator (~60 lines, 'use client')
│   │   │   ├── chat-header.tsx       # Reads ChatSessionContext
│   │   │   ├── messages.tsx          # Message list (virtualized)
│   │   │   ├── message.tsx           # Single message
│   │   │   ├── message-actions.tsx   # Copy, edit, delete
│   │   │   ├── message-editor.tsx    # Inline message editing
│   │   │   ├── message-reasoning.tsx # Reasoning display
│   │   │   ├── multimodal-input.tsx  # Text + file input
│   │   │   ├── submit-button.tsx     # Send/stop button
│   │   │   ├── preview-attachment.tsx
│   │   │   ├── suggested-actions.tsx
│   │   │   ├── greeting.tsx          # Empty state
│   │   │   ├── stream-bridge.tsx  # Null-render bridge (~20 lines)
│   │   │   └── notice-handler.tsx    # URL ?notice toast (~15 lines)
│   │   ├── hooks/
│   │   │   ├── use-chat-session.ts   # useChat config + callbacks (~120 lines)
│   │   │   ├── use-chat-side-effects.ts  # Navigation effects (~40 lines)
│   │   │   ├── use-chat-session-context.ts   # ChatSessionContext + useContext
│   │   │   └── use-scroll-to-bottom.ts
│   │   ├── actions/
│   │   │   ├── delete-chat.ts        # Server Action
│   │   │   ├── delete-all-chats.ts   # Server Action
│   │   │   └── send-message.ts       # (if needed — or just POST /api/chat)
│   │   ├── lib/
│   │   │   ├── chat-callbacks.ts     # Pure functions: onData, onError, onFinish
│   │   │   ├── process-stream-deltas.ts  # Pure function: delta → artifact update
│   │   │   └── tools/
│   │   │       ├── create-artifact.ts
│   │   │       ├── update-artifact.ts
│   │   │       ├── request-suggestions.ts
│   │   │       └── weather.ts
│   │   ├── schemas/
│   │   │   └── chat.schema.ts
│   │   └── types/
│   │       └── chat.types.ts         # ChatSessionValue, etc.
│   │
│   ├── artifacts/
│   │   ├── components/
│   │   │   ├── artifact-panel.tsx     # Main artifact container
│   │   │   ├── artifact-actions.tsx   # Toolbar actions
│   │   │   ├── artifact-close-button.tsx
│   │   │   ├── artifact-preview.tsx   # Kind-specific preview (was document-preview)
│   │   │   ├── artifact-error-boundary.tsx
│   │   │   ├── version-footer.tsx
│   │   │   └── editors/
│   │   │       ├── text-editor.tsx
│   │   │       ├── code-editor.tsx
│   │   │       ├── sheet-editor.tsx
│   │   │       └── image-editor.tsx
│   │   ├── hooks/
│   │   │   ├── use-artifact.ts       # useSyncExternalStore-based
│   │   │   └── use-artifact-selector.ts
│   │   ├── handlers/
│   │   │   ├── index.ts              # Registers all handlers
│   │   │   ├── text-handler.ts
│   │   │   ├── code-handler.ts
│   │   │   ├── sheet-handler.ts
│   │   │   └── image-handler.ts
│   │   ├── lib/
│   │   │   └── artifact-store.ts     # useSyncExternalStore store
│   │   ├── schemas/
│   │   │   └── artifact.schema.ts
│   │   └── types/
│   │       └── artifact.types.ts     # UIArtifact, ArtifactKind
│   │
│   ├── auth/
│   │   ├── components/
│   │   │   ├── auth-form.tsx
│   │   │   └── session-provider.tsx
│   │   ├── actions/
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   └── logout.ts
│   │   ├── lib/
│   │   │   ├── session.ts            # getAppSession(), session resolution
│   │   │   └── guest.ts              # Guest bootstrap, token rotation
│   │   ├── schemas/
│   │   │   └── auth.schema.ts
│   │   └── types/
│   │       └── auth.types.ts         # AppSession, User
│   │
│   ├── sidebar/
│   │   ├── components/
│   │   │   ├── sidebar-shell.tsx      # SERVER — async, fetches history
│   │   │   ├── sidebar-history-client.tsx  # 'use client' — SWR pagination
│   │   │   ├── sidebar-history-item.tsx
│   │   │   ├── sidebar-user-nav.tsx   # 'use client' — theme, logout
│   │   │   └── sidebar-skeleton.tsx
│   │   ├── hooks/
│   │   │   ├── use-pending-chats.ts
│   │   │   └── use-sidebar-history.ts  # SWR infinite hook
│   │   ├── actions/
│   │   │   └── rename-chat.ts
│   │   └── types/
│   │       └── sidebar.types.ts
│   │
│   ├── voting/
│   │   ├── components/
│   │   │   └── vote-buttons.tsx
│   │   ├── hooks/
│   │   │   └── use-votes.ts
│   │   ├── actions/
│   │   │   └── vote.ts               # Server Action with updateTag
│   │   └── types/
│   │       └── vote.types.ts
│   │
│   ├── models/
│   │   ├── components/
│   │   │   └── model-selector.tsx
│   │   ├── lib/
│   │   │   └── models.ts             # Model catalog, `use cache` tagged
│   │   └── types/
│   │       └── model.types.ts
│   │
│   ├── visibility/
│   │   ├── components/
│   │   │   └── visibility-selector.tsx
│   │   ├── actions/
│   │   │   └── update-visibility.ts   # Server Action with updateTag
│   │   └── types/
│   │       └── visibility.types.ts
│   │
│   └── settings/
│       ├── components/
│       │   └── settings-panel.tsx
│       ├── hooks/
│       │   └── use-settings.ts        # useSyncExternalStore + localStorage
│       └── types/
│           └── settings.types.ts
│
├── components/
│   └── ui/                            # shadcn/ui primitives
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx                # Layout sidebar primitives
│       ├── skeleton.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── tooltip.tsx
│       └── ...
│
├── lib/
│   ├── ai/
│   │   ├── registry.ts               # AI provider registry (NO vercel-gateway)
│   │   ├── artifact-handlers.ts       # Handler registry: register/get pattern
│   │   ├── models.ts                  # Model definitions
│   │   └── prompts.ts                # System prompts
│   ├── auth/
│   │   └── session.ts                # getAppSession() infrastructure
│   ├── cache/
│   │   ├── client.ts                  # Redis client
│   │   ├── keys.ts                    # Cache key factory
│   │   ├── revalidate.ts             # updateTag/revalidateTag utilities
│   │   └── with-cache.ts             # Generic cache-through helper
│   ├── data/
│   │   ├── chat.ts                    # Chat CRUD
│   │   ├── artifact.ts               # Artifact CRUD (was document.ts)
│   │   ├── message.ts                # Message CRUD
│   │   ├── vote.ts                    # Vote CRUD
│   │   ├── suggestion.ts             # Suggestion CRUD
│   │   └── user.ts                    # User CRUD
│   ├── db/
│   │   ├── client.ts                  # Drizzle client
│   │   ├── schema.ts                  # DB schema (Artifact table, not Document)
│   │   └── migrations/               # Drizzle migrations
│   ├── errors/
│   │   ├── app-error.ts              # AppError class + codes
│   │   └── codes.ts                   # Error code registry (NO activate_gateway)
│   ├── types/
│   │   ├── artifact-handler.types.ts  # ArtifactHandler, ArtifactStreamWriter
│   │   ├── pending-chats.types.ts  # PendingChatOperations
│   │   ├── data-context.types.ts      # DataContext (userId, isGuest)
│   │   └── result.types.ts           # ActionResult<T> for Server Actions
│   └── utils/
│       ├── cn.ts                      # clsx + twMerge
│       └── format.ts                  # Date/string formatting
│
├── tests/
│   ├── setup.ts
│   ├── mocks/
│   │   ├── auth.ts                    # mockSession(), mockGuestSession()
│   │   ├── db.ts                      # createTestDb()
│   │   └── cache.ts                   # createTestCache()
│   ├── utils/
│   │   └── stream.ts                  # collectStreamEvents()
│   ├── integration/
│   └── e2e/
│
└── scripts/
    └── check-imports.mjs              # Import boundary enforcement (CI)
```

---

## Route Structure

### Route Groups

| Route Group | Purpose | Layout |
|-------------|---------|--------|
| `(auth)` | Login, register | Minimal auth layout (SERVER) |
| `(chat)` | Chat interface, sidebar | Chat layout with sidebar (SERVER) |

### Pages

| Path | Component | Rendering | Data Fetching |
|------|-----------|-----------|---------------|
| `/` | `app/(chat)/page.tsx` | SERVER | Session check, redirect or new chat |
| `/chat/[id]` | `app/(chat)/chat/[id]/page.tsx` | SERVER | `Promise.all([chat, votes])` |
| `/login` | `app/(auth)/login/page.tsx` | SERVER | None |
| `/register` | `app/(auth)/register/page.tsx` | SERVER | None |

### API Routes

| Path | Method | Purpose | Auth |
|------|--------|---------|------|
| `/api/chat` | POST | AI chat streaming | Required |
| `/api/artifact` | POST | Save artifact version | Required |
| `/api/files/upload` | POST | File upload | Required |
| `/api/history` | GET | Paginated chat history | Required |
| `/api/suggestions` | GET | Suggestions for artifact | Required |
| `/api/health` | GET | Health check | Public |

---

## proxy.js — Replacing middleware.js

> Next.js 16 renamed `middleware.js` to `proxy.js`. The API is identical: export a `proxy()` function and a `config` with `matcher`.

**Fixes:** Audit Observation E (proxy.ts legacy confusion), VIII-9

### Responsibilities

1. **Auth guard** — redirect unauthenticated users to `/login` for protected routes
2. **Rate limiting check** — 50 req/min via Redis token bucket (fast check, not full validation)
3. **Guest token rotation** — check `guest_token` cookie, refresh if near expiry (replaces old `proxy.ts`)
4. **CORS headers** — for API routes if needed

### Implementation Sketch

```typescript
// proxy.ts (project root)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Public routes — pass through
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // 2. Auth check — optimistic (fast cookie check, not full session validation)
  const hasSession = request.cookies.has('sb-access-token')
                  || request.cookies.has('guest_token')
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Guest token rotation — refresh if near expiry
  const response = NextResponse.next()
  const guestToken = request.cookies.get('guest_token')
  if (guestToken && isNearExpiry(guestToken.value)) {
    const refreshed = await rotateGuestToken(guestToken.value)
    if (refreshed) {
      response.cookies.set('guest_token', refreshed, { /* options */ })
    }
  }

  return response
}

function isPublicRoute(pathname: string): boolean {
  return pathname.startsWith('/login')
      || pathname.startsWith('/register')
      || pathname.startsWith('/api/health')
      || pathname.startsWith('/_next')
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
```

### Key Differences from Old proxy.ts

| Aspect | Old `proxy.ts` | New `proxy.ts` |
|--------|---------------|---------------|
| File convention | Custom file, imported manually | Next.js 16 convention, auto-executed |
| Auth method | Manual token parsing | Cookie presence check (optimistic) |
| Rate limiting | Not in proxy | Lightweight check (full validation in route handlers) |
| Guest tokens | Rotation on every request | Rotation only when near expiry |

**Important**: `proxy.ts` runs on the edge. Keep it fast — no database queries, minimal Redis calls. Full auth validation happens in server components and API routes.

---

## Request Flow

```
Client Request
    │
    ▼
┌─────────────┐
│  proxy.ts   │ ── Auth guard (cookie check)
│  (edge)     │ ── Guest token rotation (if near expiry)
│             │ ── Rate limit header check
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  App Router      │ ── Matches route to page/layout/API handler
│  (server)        │
└──────┬───────────┘
       │
       ├─── Page Request ──────────────────────────────┐
       │                                                │
       ▼                                                ▼
┌──────────────────┐                          ┌──────────────────┐
│  Layout (RSC)    │ ── Fetches session       │  `use cache`     │
│  server component│ ── Renders sidebar shell  │  cached layers   │
│                  │ ── Provides structure     │  (tagged data)   │
└──────┬───────────┘                          └──────────────────┘
       │
       ▼
┌──────────────────┐
│  Page (RSC)      │ ── Fetches chat + votes (parallel)
│  server component│ ── Access control check
│                  │ ── Passes data as props to client islands
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Client Islands  │ ── ChatShell (interactive chat)
│  'use client'    │ ── SidebarHistoryClient (pagination)
│                  │ ── Editors (CodeMirror, Tiptap, etc.)
└──────────────────┘
       │
       ├─── API Request ───────────────────────────────┐
       │                                                │
       ▼                                                ▼
┌──────────────────┐                          ┌──────────────────┐
│  Route Handler   │ ── Full auth validation   │  AI Provider     │
│  (route.ts)      │ ── Rate limit enforcement │  (Vercel AI SDK) │
│                  │ ── Request validation     │  (streamText)    │
└──────┬───────────┘                          └──────────────────┘
       │
       ▼
┌──────────────────┐
│  SSE Stream      │ ── Text deltas
│  (Response)      │ ── Tool calls (artifact create/update)
│                  │ ── Data parts (title, id, kind, finish)
│                  │ ── onFinish: persist messages + revalidateTag
└──────────────────┘
```

---

## Data Flow: Server Fetch → Client Hydrate → Real-Time Updates

```
Phase 1: Initial Server Render
──────────────────────────────
  Layout (SERVER)
    ├── SidebarShell (SERVER, async)
    │     'use cache' + cacheTag('chats:{userId}')
    │     Fetches: first 20 chats from DB/Redis
    │     Renders: HTML sidebar content in RSC payload
    │
    └── Page (SERVER, async)
          Promise.all([
            getCachedChat(id),     // cacheTag('chat:{id}')
            getVotes(id)           // returns Promise (deferred)
          ])
          Renders: SettingsProvider → ChatStreamProvider → ChatShell
          Passes: initialMessages, initialChatModel as props

Phase 2: Client Hydration
─────────────────────────
  ChatShell hydrates with initialMessages
    ├── Messages renders immediately (real content, no skeleton)
    ├── VoteResolver resolves votesPromise via use()
    ├── SidebarHistoryClient has initialChats (no waterfall)
    └── MultimodalInput ready for user input

Phase 3: Real-Time Streaming (user sends message)
──────────────────────────────────────────────────
  MultimodalInput → useChatSession.sendMessage()
    ├── Optimistic: addPendingChat() (if new chat)
    ├── POST /api/chat (SSE stream)
    │
    │   Server-side stream:
    │   ├── Text deltas → client receives → Messages updates
    │   ├── Tool call (createArtifact) →
    │   │     data-id, data-title, data-kind, content deltas, data-finish
    │   │     → StreamBridge → processStreamDelta() → artifactStore
    │   ├── data-chatTitle (AWAITED before stream close)
    │   │     → useChatSession.onData → updatePendingChatTitle()
    │   └── onFinish: save messages + revalidateTag('chat:{id}', 'max')
    │
    └── Cleanup: artifactStore.reset() on chat ID change

Phase 4: Mutations (delete, visibility, vote)
──────────────────────────────────────────────
  Server Action → DB write → updateTag(relevant tags)
    ├── Router Cache invalidated immediately (read-your-own-writes)
    ├── Optimistic UI update (useOptimistic / optimistic provider)
    └── Next navigation fetches fresh server-rendered data
```

---

## Import Dependency Graph

```
                    ┌──────────┐
                    │   app/   │
                    └──┬───┬───┘
             ┌────────┘   └────────┐
             ▼                      ▼
      ┌────────────┐        ┌─────────────┐
      │ features/  │        │ components/ │
      │            │        │    (UI)     │
      ├── chat/    │        └──────┬──────┘
      ├── artifacts│               │
      ├── auth/    │               │
      ├── sidebar/ │               │
      ├── voting/  │               │
      ├── models/  │               │
      ├── visibility│              │
      └── settings/│               │
             │     └───────┐       │
             │             ▼       ▼
             │        ┌──────────────┐
             └───────►│    lib/      │
                      ├── ai/       │
                      ├── auth/     │
                      ├── cache/    │
                      ├── data/     │
                      ├── db/       │
                      ├── errors/   │
                      ├── types/    │◄── Cross-feature contracts
                      └── utils/    │
                      └─────────────┘

Cross-feature types flow:
  features/chat/ ──types──► lib/types/artifact-handler.types.ts
  features/artifacts/ ──types──► lib/types/artifact-handler.types.ts

  features/chat/ ──types──► lib/types/pending-chats.types.ts
  features/sidebar/ ──types──► lib/types/pending-chats.types.ts

Handler registry flow:
  features/artifacts/handlers/ ──register──► lib/ai/artifact-handlers.ts
  features/chat/lib/tools/ ──consume──► lib/ai/artifact-handlers.ts
```

---

## Feature Module Inventory

Each feature is a self-contained module. This table lists what each feature owns.

| Feature | Components | Hooks | Actions | Handlers | Lib |
|---------|-----------|-------|---------|----------|-----|
| **chat** | ChatShell, ChatHeader, Messages, Message, MessageActions, MessageEditor, MessageReasoning, MultimodalInput, SubmitButton, PreviewAttachment, SuggestedActions, Greeting, StreamBridge, NoticeHandler | useChatSession, useChatSideEffects, useChatSessionContext, useScrollToBottom | deleteChat, deleteAllChats | — | chat-callbacks, process-stream-deltas, tools/ |
| **artifacts** | ArtifactPanel, ArtifactActions, ArtifactCloseButton, ArtifactPreview, ArtifactErrorBoundary, VersionFooter, editors/ | useArtifact, useArtifactSelector | — | text, code, sheet, image | artifactStore |
| **auth** | AuthForm, SessionProvider | — | login, register, logout | — | session, guest |
| **sidebar** | SidebarShell (SERVER), SidebarHistoryClient, SidebarHistoryItem, SidebarUserNav, SidebarSkeleton | usePendingChats, useSidebarHistory | renameChat | — | — |
| **voting** | VoteButtons | useVotes | vote | — | — |
| **models** | ModelSelector | — | — | — | models (catalog) |
| **visibility** | VisibilitySelector | — | updateVisibility | — | — |
| **settings** | SettingsPanel | useSettings | — | — | — |

---

## Server-Side Caching Strategy

### `use cache` + `cacheTag` for Server-Fetched Data

Next.js 16 provides `use cache` directive with `cacheTag()` and `cacheLife()`:

```typescript
// Cached server function
async function getCachedChats(userId: string) {
  'use cache'
  cacheTag(`chats:${userId}`)
  cacheLife('seconds')  // Short — chat list changes frequently
  return getChatsByUserId(userId, { limit: 21 })
}

// Cached server function
async function getCachedChat(chatId: string) {
  'use cache'
  cacheTag(`chat:${chatId}`)
  cacheLife('minutes')  // Medium — individual chats change less
  return getChatWithMessages(chatId)
}
```

### Revalidation Primitives

| Primitive | Context | Semantics |
|-----------|---------|-----------|
| `updateTag(tag)` | Server Actions only | Immediate expire, blocks until fresh, read-your-own-writes |
| `revalidateTag(tag, 'max')` | Route Handlers + Server Actions | Stale-while-revalidate, background refresh |

### Revalidation Matrix

| Mutation | Type | Tags Invalidated | Primitive |
|----------|------|-------------------|-----------|
| Create chat (stream) | Route Handler | `chats:{userId}` | `revalidateTag(tag, 'max')` |
| Update title (onFinish) | Route Handler | `chats:{userId}` | `revalidateTag(tag, 'max')` |
| Delete chat | Server Action | `chats:{userId}` | `updateTag(tag)` |
| Delete all chats | Server Action | `chats:{userId}` | `updateTag(tag)` |
| Update visibility | Server Action | `chat:{id}`, `chats:{userId}` | `updateTag(tag)` |
| Save messages (onFinish) | Route Handler | `chat:{id}` | `revalidateTag(tag, 'max')` |
| Vote on message | Server Action | `votes:{chatId}` | `updateTag(tag)` |
| Save artifact version | Route Handler | `artifact:{id}` | `revalidateTag(tag, 'max')` |

### Revalidation Utility

```typescript
// lib/cache/revalidate.ts
import { updateTag, revalidateTag } from 'next/cache'

// Server Actions — immediate, read-your-own-writes
export function invalidateChat(chatId: string) {
  updateTag(`chat:${chatId}`)
}
export function invalidateChatList(userId: string) {
  updateTag(`chats:${userId}`)
}
export function invalidateVotes(chatId: string) {
  updateTag(`votes:${chatId}`)
}

// Route Handlers — stale-while-revalidate, background
export function refreshChat(chatId: string) {
  revalidateTag(`chat:${chatId}`, 'max')
}
export function refreshChatList(userId: string) {
  revalidateTag(`chats:${userId}`, 'max')
}
export function refreshArtifact(artifactId: string) {
  revalidateTag(`artifact:${artifactId}`, 'max')
}
```

---

## Error Handling Architecture

### Error Boundaries

```
app/global-error.tsx                    Root — unrecoverable errors
app/(chat)/error.tsx                    Chat route group — chat-specific
app/(auth)/error.tsx                    Auth route group — auth-specific
features/artifacts/components/
  artifact-error-boundary.tsx           Artifact panel — isolated failure
```

### Error Patterns by Context

| Context | Pattern | Serialization |
|---------|---------|---------------|
| **Server Actions** | Return `ActionResult<T>` = `{ success: true, data: T }` or `{ success: false, error: { code, message } }` | Structured, client can pattern match |
| **Route Handlers** | `throw AppError` → catch → `AppError.toResponse()` → JSON | Structured JSON in response body |
| **Form Actions** | `useActionState` return value | React renders error from return value |
| **Unexpected** | `throw` → error.tsx boundary | Last resort, shows fallback UI |

### ActionResult Type

```typescript
// lib/types/result.types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

**Fixes:** VII-7 (error propagation under-specified), VII-8 (form progressive enhancement)

---

## Next.js 16 Configuration

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  experimental: {
    cacheComponents: true,  // Enable PPR and `use cache` on components
  },
}

export default config
```

---

## What's NOT in This Architecture

These items are explicitly excluded per the design constraints:

| Excluded | Reason |
|----------|--------|
| `middleware.ts` | Renamed to `proxy.ts` in Next.js 16 |
| `chat-layout-client.tsx` | Layout is a server component (CRITICAL-1 fix) |
| `vercel-gateway` provider | No credit/gateway logic (Constraint 5) |
| `activate_gateway` error code | No credit/gateway logic |
| Credit `AlertDialog` | No credit/gateway logic |
| `data-usage` credit display | Removed (token usage display evaluated separately) |
| `pollForTitle()` | Title awaited server-side before stream close |
| `window.dispatchEvent('chat-title-updated')` | Single-channel communication only |
| `Document` table/type name | Renamed to `Artifact` everywhere (Constraint 4) |
| SWR-as-state-store for artifacts | replaced by `useSyncExternalStore` (Constraint 9) |
| `dynamic(import, { ssr: false })` for sidebar | Server-rendered (Principle 1) |
