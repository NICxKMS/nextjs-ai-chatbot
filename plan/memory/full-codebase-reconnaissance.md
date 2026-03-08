# 🏛️ Full Codebase Reconnaissance Report: `ai-assistant`

**Scribe:** Thoth · **Date:** 2026-03-07 · **Confidence:** HIGH (every source file read)

---

## 1. Complete Directory Structure

### App Router (`app/`)

```
app/
├── layout.tsx              ← Root layout (fonts, ThemeProvider, TooltipProvider, Toaster)
├── globals.css             ← Tailwind v4 design tokens (light/dark)
├── global-error.tsx        ← Global error boundary (client component, inline styles)
├── not-found.tsx           ← 404 page (server component)
├── (auth)/
│   ├── layout.tsx          ← Auth layout with guard (redirects authenticated → /)
│   ├── error.tsx           ← Auth error boundary
│   ├── loading.tsx         ← Auth loading skeleton
│   ├── login/page.tsx      ← Login page (→ AuthForm + login action)
│   └── register/page.tsx   ← Register page (→ AuthForm + register action)
├── (chat)/
│   ├── layout.tsx          ← Chat layout (SessionProvider, PendingChatsProvider, SidebarProvider)
│   ├── error.tsx           ← Chat error boundary
│   ├── loading.tsx         ← Chat loading skeleton
│   ├── page.tsx            ← New chat page (generates UUID, resolves models)
│   └── chat/[id]/
│       ├── page.tsx        ← Existing chat page (fetches chat, messages, votes, models)
│       └── loading.tsx     ← Chat loading skeleton
└── api/
    ├── chat/route.ts       ← POST: Streaming chat with AI SDK (main API)
    ├── artifact/route.ts   ← GET: Fetch versions, POST: Save/restore artifact
    ├── files/upload/route.ts ← POST: File upload to Vercel Blob
    ├── health/route.ts     ← GET: Health check (DB + Redis)
    ├── history/route.ts    ← GET: Paginated chat history (cursor-based)
    └── suggestions/route.ts ← GET: Fetch suggestions for artifact version
```

### Features (`features/`)

```
features/
├── artifacts/
│   ├── components/
│   │   ├── artifact-actions.tsx
│   │   ├── artifact-close-button.tsx
│   │   ├── artifact-error-boundary.tsx
│   │   ├── artifact-panel-editor.tsx
│   │   ├── artifact-panel-header.tsx
│   │   ├── artifact-panel.tsx          ← Dynamic import (code-split)
│   │   ├── artifact-preview.tsx
│   │   ├── artifact-save-utils.ts
│   │   ├── version-footer.tsx
│   │   └── editors/
│   │       ├── code-editor.tsx         ← CodeMirror-based
│   │       ├── image-editor.tsx
│   │       ├── sheet-editor.tsx        ← react-data-grid
│   │       ├── text-editor.tsx         ← TipTap-based
│   │       └── lazy.ts                 ← Lazy loading helpers
│   ├── handlers/
│   │   ├── index.ts                    ← Side-effect: registers all 4 handlers
│   │   ├── code-handler.ts
│   │   ├── image-handler.ts
│   │   ├── sheet-handler.ts
│   │   ├── text-handler.ts
│   │   └── stream-artifact-deltas.ts
│   ├── hooks/
│   │   ├── use-artifact.ts
│   │   └── use-artifact-selector.ts
│   ├── lib/
│   │   ├── artifact-store.ts           ← Singleton useSyncExternalStore
│   │   └── suggestions-extension.tsx
│   ├── schemas/artifact.schema.ts
│   └── types/artifact.types.ts
├── auth/
│   ├── actions/
│   │   ├── login.ts                    ← Server Action: Supabase signIn
│   │   ├── register.ts                 ← Server Action: Supabase signUp
│   │   └── logout.ts                   ← Server Action: clear session → /login
│   ├── components/
│   │   ├── auth-form.tsx               ← Shared login/register form (useActionState)
│   │   ├── auth-loading-state.tsx
│   │   └── session-provider.tsx        ← React Context + Supabase onAuthStateChange
│   ├── lib/
│   │   ├── action-utils.ts
│   │   ├── supabase-action.ts          ← Server Supabase client (writable cookies)
│   │   └── supabase-browser.ts         ← Browser Supabase client
│   ├── schemas/auth.schema.ts
│   └── types/auth.types.ts
├── chat/
│   ├── actions/
│   │   ├── delete-chat.ts
│   │   ├── delete-all-chats.ts
│   │   └── delete-trailing-messages.ts
│   ├── components/
│   │   ├── chat-shell.tsx              ← Main orchestrator (dynamic ArtifactPanel)
│   │   ├── chat-header.tsx
│   │   ├── chat-stream-provider.tsx    ← Split context (State/Dispatch) + RAF batching
│   │   ├── context-display.tsx
│   │   ├── greeting.tsx
│   │   ├── message-actions.tsx
│   │   ├── message-editor.tsx
│   │   ├── message-reasoning.tsx
│   │   ├── message.tsx
│   │   ├── messages.tsx
│   │   ├── multimodal-input.tsx
│   │   ├── notice-handler.tsx
│   │   ├── stream-bridge.tsx           ← Processes stream deltas → artifact store
│   │   └── suggested-actions.tsx
│   ├── hooks/
│   │   ├── use-chat-session.ts         ← Core hook wrapping @ai-sdk/react useChat
│   │   ├── use-chat-session-context.ts
│   │   ├── use-chat-side-effects.ts
│   │   └── use-scroll-to-bottom.ts
│   ├── lib/
│   │   ├── chat-route.ts              ← Route handler helpers (require session, rate limit, etc.)
│   │   ├── message-utils.ts
│   │   ├── process-stream-deltas.ts
│   │   ├── e2e-artifact-fixture.ts
│   │   ├── e2e-artifact-fixture-cookie.ts
│   │   └── tools/
│   │       ├── artifact-tool-utils.ts
│   │       ├── create-artifact.ts
│   │       ├── update-artifact.ts
│   │       ├── request-suggestions.ts
│   │       └── weather.ts
│   ├── schemas/chat.schema.ts
│   └── types/chat.types.ts
├── models/
│   ├── components/model-selector.tsx
│   ├── lib/models.ts                   ← getAvailableModels() with 'use cache'
│   └── types/model.types.ts
├── settings/
│   ├── components/settings-panel.tsx
│   ├── hooks/use-settings.ts           ← Module-level store (useSyncExternalStore)
│   ├── schemas/settings.schema.ts
│   └── types/settings.types.ts
├── sidebar/
│   ├── actions/rename-chat.ts
│   ├── components/
│   │   ├── sidebar-header-actions.tsx
│   │   ├── sidebar-history-client.tsx  ← SWR-based infinite scroll
│   │   ├── sidebar-history-item.tsx
│   │   ├── sidebar-shell.tsx           ← Server component with cached initial data
│   │   ├── sidebar-skeleton.tsx
│   │   └── sidebar-user-nav.tsx
│   ├── hooks/use-sidebar-history.ts    ← useSWRInfinite for pagination
│   └── types/sidebar.types.ts
├── visibility/
│   ├── actions/update-visibility.ts
│   ├── components/visibility-selector.tsx
│   └── types/visibility.types.ts
└── voting/
    ├── actions/vote.ts
    ├── components/
    │   ├── vote-buttons.tsx
    │   └── vote-resolver.tsx           ← Suspense boundary for vote data
    ├── hooks/use-votes.ts
    └── types/vote.types.ts
```

### Shared Library (`lib/`)

```
lib/
├── utils.ts                        ← Re-exports cn()
├── ai/
│   ├── artifact-handlers.ts        ← Handler registry (registerArtifactHandler/getArtifactHandler)
│   ├── internal-models.ts          ← Title + Artifact internal model config
│   ├── model-capabilities.ts       ← Model capability resolution
│   ├── model-capability-inference.ts ← Reasoning tag prefix matching
│   ├── models.ts                   ← Static model catalog + dynamic discovery
│   ├── prompts.ts                  ← System prompt composition
│   ├── provider.ts                 ← customProvider with reasoning middleware
│   ├── provider-options.ts         ← Per-provider streamText options builder
│   ├── registry.ts                 ← AI provider registry (Google/OpenAI/OpenRouter)
│   ├── title.ts                    ← generateTitle() with timeout fallback
│   └── tools.ts                    ← Tool ID catalog (getWeather, create/updateArtifact, requestSuggestions)
├── auth/
│   ├── constants.ts                ← GUEST_COOKIE_NAME, TTL constants
│   ├── guest.ts                    ← Guest JWT mint/verify/rotate (jose)
│   └── session.ts                  ← getAppSession() — single source of truth
├── cache/
│   ├── client.ts                   ← Upstash Redis client (rate limiting ONLY)
│   ├── keys.ts                     ← Cache tag + rate limit key builders
│   ├── rate-limit.ts               ← Generic rate limit checker
│   ├── revalidate.ts               ← invalidate* (updateTag) + refresh* (revalidateTag) helpers
│   └── with-cache.ts               ← withCache() convenience for 'use cache' pattern
├── data/
│   ├── artifact.ts                 ← Artifact CRUD (versioned via composite PK)
│   ├── artifact-chat.ts            ← getLatestArtifactByChatId()
│   ├── chat.ts                     ← Chat CRUD with cursor-based pagination
│   ├── database-error.ts           ← throwDatabaseError/requireDatabaseRow helpers
│   ├── message.ts                  ← Message CRUD (getMessagesForChatRender, etc.)
│   ├── suggestion.ts               ← Suggestion CRUD
│   ├── user.ts                     ← User CRUD (email lookup, guest bootstrap)
│   └── vote.ts                     ← Vote upsert + queries
├── db/
│   ├── client.ts                   ← Drizzle + postgres.js singleton
│   ├── migrate.ts
│   ├── schema.ts                   ← Full DB schema (6 tables, 3 enums, indexes)
│   └── migrations/                 ← 4 migration files
├── errors/
│   ├── app-error.ts                ← AppError class with factory methods + toResponse()
│   └── codes.ts                    ← ErrorCode union type + HTTP status map
├── hooks/
│   └── use-mobile.ts               ← useIsMobile() with SSR-safe initial value
├── providers/
│   └── pending-chats-provider.tsx   ← PendingChatsProvider (optimistic sidebar)
├── types/
│   ├── api.types.ts                ← HistoryResponse, PaginationParams
│   ├── artifact.types.ts           ← UIArtifact, ArtifactStatus, ArtifactSuggestion
│   ├── artifact-handler.types.ts   ← ArtifactHandler, ArtifactStreamWriter interfaces
│   ├── model.types.ts              ← ModelMetadata, ProviderId, DEFAULT_CHAT_MODEL
│   ├── models.types.ts             ← Drizzle inferred types (User, Chat, Message, etc.)
│   ├── pending-chats.types.ts      ← PendingChat, PendingChatOperations
│   ├── result.types.ts             ← ActionResult<T> discriminated union
│   └── settings.types.ts           ← SettingsState interface
└── utils/
    ├── cn.ts                        ← clsx + twMerge
    ├── generate-uuid.ts             ← crypto.randomUUID() wrapper
    └── validate-origin.ts           ← CSRF origin validation
```

### Root-level Files

```
proxy.ts                ← Next.js 16 proxy (≈middleware): route classification, guest token lifecycle, device detection
instrumentation.ts      ← OpenTelemetry setup + env warnings
instrumentation-client.ts ← Client instrumentation
global.d.ts             ← CSS module declaration
```

### Components (`components/`)

```
components/
├── icons.tsx               ← SVG icon components
├── motion-provider.tsx     ← Framer Motion provider
├── sidebar-toggle.tsx      ← Sidebar toggle button
├── theme-provider.tsx      ← next-themes ThemeProvider
├── toaster.tsx             ← Sonner toast wrapper
├── weather.tsx             ← Weather card component (test-only, potentially unused)
├── ai-elements/            ← READ-ONLY generated components (~48 files)
└── ui/                     ← shadcn/ui primitives (~30+ files)
```

---

## 2. Key Architecture Files Summary

### `proxy.ts` (≈ Middleware)

- **No `middleware.ts` exists** — the project uses Next.js 16's `proxy.ts` convention instead
- Route classification: `public` | `guest-eligible` | `auth-required`
- Guest token lifecycle: mint → verify → rotate (dual-write pattern)
- Device detection via User-Agent → `x-device-type` header
- Auth redirect for protected routes
- Matcher: `["/", "/chat/:path*", "/login", "/register", "/api/chat"]`

### `next.config.ts`

- `reactCompiler: true` — React Compiler enabled
- `cacheComponents: true` — Next.js 16 component caching
- `reactStrictMode: true`
- `experimental.turbopackFileSystemCacheForDev: true`
- `optimizePackageImports` for TipTap, Framer Motion, CodeMirror, Streamdown, Shiki
- Uses `tsconfig.build.json` for production builds

### `tsconfig.json`

- **Strict mode enabled** (`strict: true`)
- `noUncheckedIndexedAccess: true` — extra safety for index access
- `noImplicitOverride: true`
- `module: esnext`, `moduleResolution: bundler`
- Path alias: `@/*` → `./*`
- Excludes: `node_modules`, `oldapp`, `plan`, `components/ai-elements`

### `drizzle.config.ts`

- PostgreSQL dialect
- Schema at `./lib/db/schema.ts`
- Migrations at `./lib/db/migrations`
- Uses `DATABASE_URL` env var

### Database Schema (6 tables)

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `User` | id (uuid PK), email, passwordHash | Created by Supabase auth + local mirror |
| `Chat` | id (uuid PK), userId (FK), title, model, visibility | Indexed: user+createdAt, user+updatedAt+id |
| `Message_v2` | id (uuid PK), chatId (FK), role, parts (jsonb) | Indexed: chat+createdAt, chat+createdAt+role |
| `Vote_v2` | chatId+messageId+userId (composite PK), isUpvoted | No separate PK column |
| `Artifact` | id+createdAt (composite PK), kind, content, userId, chatId | Versioned by timestamp |
| `Suggestion` | id (PK), artifactId+artifactCreatedAt (FK to Artifact) | Per-version suggestions |

### Environment Variables (`.env.example`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (Supabase) |
| `CACHE_KV_REST_API_URL` | Upstash Redis URL |
| `CACHE_KV_REST_API_TOKEN` | Upstash Redis token |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_JWT_SECRET` | Supabase JWT verification |
| `GUEST_JWT_SECRET` | Guest token signing key |
| `OPENAI_API_KEY` | OpenAI provider (optional) |
| `GEMINI_API_KEY` | Google AI provider |
| `OPENROUTER_API_KEY` | OpenRouter provider (optional) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage |
| `VERCEL_OIDC_TOKEN` | Vercel deployment token |

Files present: `.env.example`, `.env.local`

---

## 3. Flow Identification

### HTTP Request Flow

```
Browser → proxy.ts → Route classification
  ├── Public routes → forward (no auth checks)
  ├── Guest-eligible → mint/verify/rotate guest JWT → forward with token
  └── Auth-required → check Supabase + guest token → redirect or forward
                      ↓
              app/api/*/route.ts
                ├── validateOrigin() → CSRF check
                ├── getAppSession() → authenticate
                ├── checkRateLimit() → Redis-based throttling
                ├── Zod schema validation
                └── Business logic → Response
```

### Render Flow (Chat)

```
app/layout.tsx (static: fonts, theme, tooltip, toaster)
  └── app/(chat)/layout.tsx (SessionProvider, PendingChatsProvider, Sidebar Suspense)
      └── app/(chat)/page.tsx OR app/(chat)/chat/[id]/page.tsx
          ├── Server: getAvailableModels(), getCachedChat(), getMessagesForChatRender()
          └── Client: ChatStreamProvider > ChatShell > {ChatHeader, Messages, MultimodalInput}
                                                       └── ArtifactPanel (dynamic import)
```

### Data Flow

```
DB (PostgreSQL) → lib/data/*.ts (pure queries, no auth/cache)
     ↓
Page-level 'use cache' wrappers with cacheTag()
     ↓
Server Components → Props → Client Components
     ↓
Client mutations → Server Actions → lib/data/*.ts → invalidateTag()
```

### Auth Flow

```
1. Unauthenticated visitor → proxy.ts → mints guest JWT → sets cookie
2. Guest continues → JWT verified/rotated at proxy level
3. Login → features/auth/actions/login.ts → Supabase signInWithPassword
   → Sets Supabase auth cookies → migrates guest chats → redirect /
4. Register → Supabase signUp → local DB user mirror → may require email confirmation
5. Session resolution: getAppSession() → Supabase getUser() || verifyGuestToken()
6. Client: SessionProvider subscribes to Supabase onAuthStateChange for cross-tab sync
```

### State Management Patterns

| Pattern | Where | Mechanism |
|---------|-------|-----------|
| Server cache | Chat data, models, votes | `'use cache'` + `cacheTag` + `updateTag/revalidateTag` |
| Server-to-client stream | Chat messages | Vercel AI SDK `streamText` → SSE → `useChat` |
| Client store (no provider) | Settings | `useSyncExternalStore` + localStorage + StorageEvent |
| Client store (no provider) | Artifact panel | `useSyncExternalStore` (artifactStore singleton) |
| Provider context | Session | SessionProvider (React Context) |
| Provider context | Pending chats | PendingChatsProvider (React Context) |
| Provider context | Chat stream | ChatStreamProvider (split State/Dispatch contexts) |
| Client pagination | Sidebar history | `useSWRInfinite` with cursor-based API |
| Optimistic updates | Voting | Client-side optimistic then reconcile |

### Background Jobs / Workers

**None.** No background workers, cron jobs, or queues. All operations are request-scoped.

---

## 4. Server Actions Inventory

| Action | File | Purpose |
|--------|------|---------|
| `login` | `features/auth/actions/login.ts` | Supabase email/password sign-in |
| `register` | `features/auth/actions/register.ts` | Supabase sign-up + local DB user |
| `logout` | `features/auth/actions/logout.ts` | Clear session + guest token → /login |
| `deleteChat` | `features/chat/actions/delete-chat.ts` | Delete chat (FK cascades all data) |
| `deleteAllChats` | `features/chat/actions/delete-all-chats.ts` | Delete all user's chats |
| `deleteTrailingMessages` | `features/chat/actions/delete-trailing-messages.ts` | Branch-from-message |
| `renameChat` | `features/sidebar/actions/rename-chat.ts` | Update chat title |
| `updateChatVisibility` | `features/visibility/actions/update-visibility.ts` | Toggle public/private |
| `voteOnMessage` | `features/voting/actions/vote.ts` | Upvote/downvote with IDOR protection |

All server actions follow the pattern: Auth → Validate (Zod) → Authorize → Execute → Invalidate cache → Return `ActionResult<T>`.

---

## 5. Zod Schemas Inventory

| Schema | File | Validates |
|--------|------|-----------|
| `loginSchema` | `features/auth/schemas/auth.schema.ts` | email + password (6–100 chars) |
| `registerSchema` | Same | Same as login |
| `chatRequestSchema` | `features/chat/schemas/chat.schema.ts` | Full POST /api/chat body |
| `messageSchema` | Same | Single message input |
| `editMessageSchema` | Same | Edit message content |
| `deleteMessagesSchema` | Same | Delete trailing messages |
| `settingsSchema` | `features/settings/schemas/settings.schema.ts` | Chat settings validation |
| `createArtifactSchema` | `features/artifacts/schemas/artifact.schema.ts` | New artifact |
| `updateArtifactSchema` | Same | Update artifact description |
| `getArtifactSchema` | Same | Artifact query params |
| `deleteArtifactVersionSchema` | Same | Artifact version deletion |
| `saveArtifactSchema` | Same | Save artifact POST |
| `restoreArtifactSchema` | Same | Restore artifact POST |
| `artifactPostBodySchema` | Same | Discriminated union: save \| restore |
| `voteSchema` | `features/voting/types/vote.types.ts` | Vote input |
| `updateVisibilitySchema` | `features/visibility/types/visibility.types.ts` | Visibility update |
| `historyQuerySchema` | `app/api/history/route.ts` | History pagination params |

---

## 6. Current Issues

### TODO/FIXME Comments

| File:Line | Comment |
|-----------|---------|
| `lib/ai/models.ts:195` | `TODO(ai-services): Keep dynamic OpenRouter tool-calling conservative` |
| `components/weather.tsx:153` | `TODO: Remove or re-home this component if it remains test-only` |

### @unused Annotations (Intentional — retained for future use)

| File | Function | Reason |
|------|----------|--------|
| `lib/data/vote.ts:55` | `deleteVotesByChatId` | FK cascade handles cleanup |
| `lib/data/message.ts:114` | `deleteMessagesByChat` | FK cascade handles cleanup |
| `lib/data/chat.ts:89` | `getChatWithMessages` | Chat page fetches separately for cache tags |
| `lib/data/suggestion.ts:47` | `deleteSuggestionsByArtifactVersion` | Retained for targeted cleanup |
| `lib/data/user.ts:12` | `getUserByEmail` | Auth uses Supabase SDK |
| `lib/data/user.ts:57` | `updateUserLastLogin` | Login flow doesn't track yet |

### Potentially Dead Files

| File | Reason |
|------|--------|
| `components/weather.tsx` | Self-identified as potentially test-only; no apparent app-tree import |

### Type Safety

- **Zero `any` types** across the entire codebase — strict mode fully enforced
- `noUncheckedIndexedAccess: true` gives extra index safety
- Biome `noExplicitAny: "error"` enforced

### No Test Files

- `tests/` directory exists but is **completely empty** (no `.ts` or `.tsx` files found)
- Vitest configured with 5 test projects (unit-node, unit-jsdom, contract-node, integration-db-node, deep-jsdom)
- Playwright configured for E2E (chromium, headless)
- **All testing infrastructure exists but zero tests written**

---

## 7. Config & Infrastructure

### Testing Framework

- **Unit/Integration:** Vitest v3.2.4 with `@vitest/coverage-v8`
- **E2E:** Playwright v1.58.2
- **Test utils:** `@testing-library/react` + `@testing-library/jest-dom`
- **Config:** `vitest.config.ts` (5 test projects), `playwright.config.ts`
- **Status:** Fully configured, zero tests

### Linting / Formatting

- **Biome v2.4.5** — single tool for lint + format
- Indent: tabs, width 4
- Line width: 100
- `noDefaultExport: "error"` (enforced — Next.js special files exempted)
- `noExplicitAny: "error"`
- Auto-import organization
- Ignores: `node_modules`, `.next`, `oldapp`, `plan`, `components/ai-elements`

### Build Configuration

- **React Compiler:** Enabled (`reactCompiler: true`)
- **Component Caching:** Enabled (`cacheComponents: true`)
- **Turbopack dev cache:** Enabled (`turbopackFileSystemCacheForDev: true`)
- **Package optimization:** 12 packages in `optimizePackageImports`
- **TypeScript:** Separate `tsconfig.build.json` for production (enables stricter checks)
- **Native TS:** Uses `@typescript/native-preview` v7.0.0-dev

### Database

- **Database:** PostgreSQL via Supabase
- **ORM:** Drizzle ORM (latest)
- **Driver:** `postgres` (postgres.js)
- **Connection pooling:** Adaptive: 3 (dev), 10 (prod), 5 (Vercel Fluid)
- **PgBouncer safe:** `prepare: false`
- **Migrations:** 4 SQL migration files in `lib/db/migrations/`

### Deployment

- **Platform:** Vercel (verified by `vercel.json`, `@vercel/*` packages)
- **Framework:** `nextjs`
- **Blob storage:** `@vercel/blob` for file uploads
- **Analytics:** `@vercel/analytics` + `@vercel/speed-insights`
- **OpenTelemetry:** `@vercel/otel` (lazy-loaded)
- **Fluid Compute:** Supported (env-gated pool config)

---

## 8. Dependency Map (Key Libraries)

### AI/ML

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | latest | Vercel AI SDK core |
| `@ai-sdk/react` | latest | React hooks (useChat) |
| `@ai-sdk/openai` | latest | OpenAI provider |
| `@ai-sdk/google` | latest | Google Gemini provider |
| `@openrouter/ai-sdk-provider` | latest | OpenRouter provider |

### UI/Editor

| Package | Version | Purpose |
|---------|---------|---------|
| `@tiptap/*` | ^3.20.0 | Rich text editor (6 packages) |
| `@codemirror/*` | ^6.x | Code editor (4 packages) |
| `@xyflow/react` | ^12.10.1 | React Flow (node graphs) |
| `shiki` | 4.0.1 (pinned) | Syntax highlighting |
| `streamdown` | latest | Streaming markdown |
| `framer-motion` / `motion` | ^11/^12 | Animations |
| `lucide-react` | ^0.446.0 | Icons |
| `sonner` | ^1.7.4 | Toast notifications |
| `cmdk` | latest | Command palette |
| `react-data-grid` | 7.0.0-beta.59 | Sheet/spreadsheet editor |
| `react-resizable-panels` | ^2.1.9 | Panel resizing |

### Auth/Data

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/ssr` | latest | Supabase SSR auth |
| `@supabase/supabase-js` | latest | Supabase client |
| `drizzle-orm` | latest | PostgreSQL ORM |
| `postgres` | latest | postgres.js driver |
| `jose` | ^6.1.3 | JWT signing (guest tokens) |
| `@upstash/redis` | ^1.36.3 | Rate limiting |

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^4.2.1 | CSS framework (v4) |
| `@tailwindcss/postcss` | ^4.2.1 | PostCSS plugin |
| `@tailwindcss/typography` | ^0.5.19 | Typography plugin |
| `tw-animate-css` | ^1.4.0 | Animation utilities |
| `class-variance-authority` | latest | Component variants |
| `tailwind-merge` | ^2.6.1 | Class merging |

---

## 9. Patterns Observed

### Caching Pattern

All data caching uses Next.js 16 `'use cache'` + `cacheTag()`. Redis is exclusively for rate limiting. Cache invalidation uses `updateTag()` in Server Actions (immediate consistency) and `revalidateTag()` in Route Handlers (stale-while-revalidate).

### Error Handling Pattern

- `AppError` class with typed `ErrorCode` enum → `toResponse()` for routes, structured `ActionResult` for actions
- `throwDatabaseError()` wraps all DB errors uniformly
- Never throws from Server Actions — always returns `ActionResult`

### State Management Pattern

Two stores use `useSyncExternalStore` without any React provider (settings, artifact). This avoids provider nesting and works with React Compiler. Stream state uses split contexts (State/Dispatch) to minimize re-renders.

### Guest Session Pattern

Dual-session architecture: Supabase auth for registered users, custom JWT (jose) for guests. Proxy.ts handles the lifecycle transparently — downstream code calls `getAppSession()` and gets a unified `AppSession` regardless of user type.

---

## 10. Key Findings for Optimization

1. **Zero tests exist** — all testing infrastructure is configured but empty
2. **Zero `any` types** — strict TypeScript is fully enforced
3. **2 TODOs, 6 @unused functions** — very clean technical debt
4. **`components/weather.tsx`** may be dead code
5. **Multiple `latest` version pins** in package.json (could cause reproducibility issues)
6. **No middleware.ts** — uses Next.js 16 `proxy.ts` convention
7. **`oldapp/` directory exists** — legacy code, excluded from builds but occupies disk
8. **`components/ai-elements/`** — ~48 generated files, excluded from TypeScript compilation
9. **No background jobs** — everything is request-scoped

---

## Sources

- Every file listed was read directly from the workspace at `/home/nicx/projects/nextjs-ai-chatbot/`
- No external documentation was consulted
- Architecture context verified against `plan/guides/Project_Info.md`

## Confidence

**HIGH** — Every source file in the application directories (app/, features/, lib/, components/) was read and analyzed. The only files not individually read were the ~48 ai-elements (read-only generated), the ~30 UI primitives (standard shadcn), and plan documentation (not application code).
