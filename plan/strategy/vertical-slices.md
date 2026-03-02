> **Updated per redesign audit (2026-03-01)**

# Vertical Slices

> Every phase of the rebuild defined with entry state, scope, exit criteria,
> files touched, and integration verification.
> 125 tasks across 8 phases. ~210 files. "artifact" naming throughout.
> ChatShell + ChatSessionContext, proxy.ts, useSyncExternalStore, handler registry.

---

## Phase 0 — Scaffold & Infrastructure (Blocking)

### Entry State
Empty project directory (or existing repo with `oldapp/` preserved as read-only reference).

### Objective
Create the project skeleton — config, shared types, error handling, utilities, UI primitives, root layout, proxy, and test infrastructure. No `app-shell.tsx`, no barrel `index.ts` files.

### Scope

**Config files:**
- `package.json` — dependencies + scripts
- `next.config.ts` — `cacheComponents: true`, React Compiler
- `tsconfig.json` — strict mode, `@/*` path alias, exclude oldapp/plan
- `biome.json` — formatting + linting rules, ai-elements excluded
- `postcss.config.mjs` — Tailwind v4 plugin
- `vercel.json` — minimal

**Root app shell:**
- `app/layout.tsx` — Root layout (SERVER): `<html>` with `suppressHydrationWarning`, `<body>` with `antialiased`, ThemeProvider stub
- `app/globals.css` — Tailwind v4 imports, CSS custom properties (light/dark themes), copied from oldapp
- `app/global-error.tsx` — Standalone html/body error boundary

**Shared infrastructure (type-level only):**
- `lib/db/schema.ts` — Drizzle table definitions (users, chats, messages, votes, **artifacts** (NOT documents), suggestions)
- `lib/types/models.types.ts` — InferSelectModel / InferInsertModel types (Artifact, NOT Document)
- `lib/types/result.types.ts` — `ActionResult<T>` for Server Actions
- `lib/types/data-context.types.ts` — DataContext (userId, isGuest)
- `lib/types/artifact.types.ts` — UIArtifact, ArtifactKind, ArtifactStatus
- `lib/types/artifact-handler.types.ts` — ArtifactHandler, ArtifactStreamWriter interfaces
- `lib/types/pending-chats.types.ts` — PendingChat, PendingChatOperations
- `lib/types/model.types.ts` — ModelMetadata, ProviderId (NO vercel-gateway), constants
- `lib/types/settings.types.ts` — UserSettings type
- `lib/errors/codes.ts` — ErrorCode union (NO activate_gateway, NO credit codes)
- `lib/errors/app-error.ts` — AppError class with static factories + toResponse()
- `lib/utils/cn.ts` — clsx + twMerge
- `lib/utils/format.ts` — Date/string formatting
- `lib/utils/generate-uuid.ts` — UUID generation

**AI elements (copy):**
- Copy all 31 files from `oldapp/components/elements/` → `components/ai-elements/`
- Verify import paths match `@/components/ui/` and `@/lib/utils/`

**shadcn/ui components (copy):**
- Copy all UI primitives from `oldapp/components/ui/` → `components/ui/` (~32 files including sidebar.tsx)

**Shared components:**
- `components/theme-provider.tsx` — next-themes wrapper
- `components/icons.tsx` — Shared icon components (copy from oldapp)
- `components/sidebar-toggle.tsx` — Sidebar toggle button
- `components/toaster.tsx` — Toast notification container (Sonner)

**Shared hooks:**
- `lib/hooks/use-mobile.ts` — Media query: max-width 768px
- `lib/hooks/use-debounce.ts` — Debounced value hook

**proxy.ts (Next.js 16):**
- `proxy.ts` — Exports `proxy()` function + `config.matcher`. Auth guard, guest token rotation. NOT middleware.ts.

**Instrumentation:**
- `instrumentation.ts` — OTel skeleton
- `instrumentation-client.ts` — Empty export

**Test infrastructure:**
- `tests/setup.ts` — Vitest global setup stub

**Import boundary script:**
- `scripts/check-imports.mjs` — Validates import hierarchy (runs in `pnpm lint`)

### Files Created (~55)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| Root config | 7 | package.json, next.config.ts, tsconfig.json, biome.json, postcss, vercel.json, .env.example |
| `app/` | 3 | layout.tsx, globals.css, global-error.tsx |
| `components/ai-elements/` | 31 | All 31 read-only primitives |
| `components/ui/` | ~32 | All shadcn/ui base components |
| `components/` | 4 | theme-provider.tsx, icons.tsx, sidebar-toggle.tsx, toaster.tsx |
| `lib/types/` | 7 | models.types.ts, result.types.ts, data-context.types.ts, artifact.types.ts, artifact-handler.types.ts, pending-chats.types.ts, model.types.ts, settings.types.ts |
| `lib/errors/` | 2 | codes.ts, app-error.ts |
| `lib/utils/` | 3 | cn.ts, format.ts, generate-uuid.ts |
| `lib/hooks/` | 2 | use-mobile.ts, use-debounce.ts |
| `lib/db/` | 1 | schema.ts |
| Root | 3 | proxy.ts, instrumentation.ts, instrumentation-client.ts |
| Scripts | 1 | check-imports.mjs |
| Tests | 1 | setup.ts |

### Exit Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm format` passes
- [ ] `pnpm dev` starts, root layout renders
- [ ] `proxy.ts` exports `proxy()` function + `config.matcher`
- [ ] DB schema uses `Artifact` table (NOT `Document`)
- [ ] `lib/errors/codes.ts` has zero credit/gateway codes
- [ ] All ai-elements files exist at `@/components/ai-elements/`
- [ ] All shadcn/ui files exist at `@/components/ui/`
- [ ] `@/lib/types/artifact.types` exports UIArtifact, ArtifactKind
- [ ] `@/lib/types/result.types` exports ActionResult<T>
- [ ] Import `@/components/ai-elements/message` resolves without errors
- [ ] Directory structure matches scaffold/directory-structure.md

### 18 Tasks (P0-T01 through P0-T18)

See `../../plan-archives/redesign/phase-plan.md` for complete task table with IDs, types, files, dependencies, and complexity ratings.

---

## Phase 1 — Data Foundation (Blocking)

### Entry State
Scaffold complete. Types, config, proxy, and ai-elements available.

### Objective
Create the database migration infrastructure, cache layer, all data access functions, revalidation utilities, and AI provider foundation. After this phase, any feature can call data functions and invalidate caches.

### Scope

**Database (`lib/db/`):**
- `lib/db/client.ts` — Drizzle client with postgres driver, globalThis singleton
- `lib/db/migrate.ts` — Migration runner
- `drizzle.config.ts` — Drizzle config at root
- `lib/db/migrations/` — Initial migration (generated from schema)

**Cache (`lib/cache/`):**
- `lib/cache/client.ts` — Upstash Redis client (HTTP-based, edge-compatible, globalThis singleton)
- `lib/cache/keys.ts` — Cache key factory (`cacheKeys.chat()`, `.chats()`, `.artifact()`, `.votes()`)
- `lib/cache/revalidate.ts` — `updateTag`/`revalidateTag` utilities: `invalidateChat()`, `invalidateChatList()`, `refreshChat()`, `refreshArtifact()`, etc.
- `lib/cache/with-cache.ts` — `withCache<T>(key, ttl, fetcher)` helper with failure tolerance

**Data access (`lib/data/`):**
- `lib/data/user.ts` — `getUserByEmail`, `createUser`
- `lib/data/chat.ts` — `getChatById`, `getChatsByUserId`, `createChat`, `updateChatTitle`, `deleteChat`, `deleteAllChats`, `getChatWithMessages`
- `lib/data/message.ts` — `saveMessages`, `deleteTrailingMessages`
- `lib/data/artifact.ts` — `getArtifactById`, `getArtifactVersions`, `saveArtifactVersion` (NOT document.ts — zero "document" identifiers)
- `lib/data/vote.ts` — `upsertVote`, `getVotesByChatId`
- `lib/data/suggestion.ts` — `getSuggestionsByArtifactId`, `saveSuggestions`

**AI infrastructure:**
- `lib/ai/registry.ts` — `createProviderRegistry` (conditional: google, openai, openrouter — NO vercel-gateway)
- `lib/ai/provider.ts` — `myProvider`: customProvider with reasoning middleware

**Test fixtures:**
- `tests/fixtures/chat.ts`, `tests/fixtures/artifact.ts`, `tests/fixtures/user.ts`, `tests/fixtures/vote.ts`
- `tests/mocks/auth.ts`, `tests/mocks/db.ts`, `tests/mocks/cache.ts`

### Files Created (~22)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `lib/db/` | 3 | client.ts, migrate.ts, drizzle.config.ts |
| `lib/cache/` | 4 | client.ts, keys.ts, revalidate.ts, with-cache.ts |
| `lib/data/` | 6 | user.ts, chat.ts, message.ts, artifact.ts, vote.ts, suggestion.ts |
| `lib/ai/` | 2 | registry.ts, provider.ts |
| `tests/` | 7 | fixtures + mocks |

### Exit Criteria

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] All `lib/data/*.ts` functions type-check with Drizzle schema
- [ ] `lib/cache/revalidate.ts` exports both `invalidate*` (SA) and `refresh*` (RH) functions
- [ ] `lib/ai/registry.ts` has NO `vercel-gateway` provider
- [ ] `lib/data/artifact.ts` (NOT `document.ts`) — zero "document" identifiers
- [ ] DB client connects (or mocked in test)
- [ ] Cache client connects (or mocked in test)
- [ ] Unit tests for data access functions pass (mocked db/cache)

### 14 Tasks (P1-T01 through P1-T14)

See `../../plan-archives/redesign/phase-plan.md` for complete task table.

---

## Phase 2 — Auth Vertical (Blocking)

### Entry State
Data foundation available. DB/cache clients work. User CRUD available.

### Objective
Implement complete authentication — session resolution, login/register/logout, guest bootstrap, SessionProvider, auth pages, and proxy wiring. After this phase, users can authenticate and the session is available everywhere.

### Scope

**Auth feature (`features/auth/`):**
- `features/auth/types/auth.types.ts` — AppSession, User, GuestToken types
- `features/auth/schemas/auth.schema.ts` — Login/register Zod schemas
- `lib/auth/session.ts` — `getAppSession()`: checks sb_token → guest_token → null
- `features/auth/lib/guest.ts` — Guest bootstrap: JWT creation, token rotation
- `features/auth/actions/login.ts` — Server Action: email/password login → cookie set → redirect
- `features/auth/actions/register.ts` — Server Action: registration → cookie set → redirect
- `features/auth/actions/logout.ts` — Server Action: cookie delete → redirect to /login
- `features/auth/components/auth-form.tsx` — Consolidated form with `mode` prop, `useActionState`
- `features/auth/components/session-provider.tsx` — Session context provider + auth state sync (guest bootstrap handled by `proxy.ts`) (NOT auth-provider.tsx)

**Auth pages (`app/(auth)/`):**
- `app/(auth)/layout.tsx` — Auth layout (SERVER): centered card container
- `app/(auth)/login/page.tsx` — Login page importing AuthForm
- `app/(auth)/register/page.tsx` — Register page importing AuthForm
- `app/(auth)/error.tsx` — Auth route error boundary

**Root layout update:**
- `app/layout.tsx` — Wire with `SessionProvider(session)` — server-fetched session passed as prop

### Files Created/Modified (~14)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `features/auth/` | 9 | types, schemas, lib (session, guest), actions (login, register, logout), components (auth-form, session-provider) |
| `app/(auth)/` | 4 | layout.tsx, login/page.tsx, register/page.tsx, error.tsx |
| Modified | 1 | app/layout.tsx (wire SessionProvider) |

### Exit Criteria

- [ ] `getAppSession()` resolves Supabase JWT → authenticated session
- [ ] `getAppSession()` resolves guest JWT → guest session
- [ ] `getAppSession()` returns null when no cookies
- [ ] Login form submits via `useActionState` → cookie set → redirect to `/`
- [ ] Register form submits → registration → cookie set → redirect
- [ ] Auth actions return `ActionResult<T>` (never throw)
- [ ] Root layout passes server-fetched session to `SessionProvider`
- [ ] `proxy.ts` redirects unauthenticated users to `/login`
- [ ] Auth pages render correctly (login, register)
- [ ] `pnpm typecheck` and `pnpm lint` pass

### 9 Tasks (P2-T01 through P2-T09)

See `../../plan-archives/redesign/phase-plan.md` for complete task table.

---

## Phase 3 — Chat Core Vertical (Blocking)

### Entry State
Auth works. Users can log in, register, or browse as guest. Session available everywhere.

### Objective
Build the complete chat experience — AI integration, settings, streaming, message display, input, ChatShell + ChatSessionContext decomposition, handler registry, server layout, and chat pages. This is the most complex phase (27 tasks).

### Scope

**AI infrastructure (`lib/ai/`):**
- `lib/ai/models.ts` — `listChatModels()` with `'use cache'` + model catalog
- `lib/ai/prompts.ts` — `composeSystemPrompt()` with conditional composition ("artifact" not "document")
- `lib/ai/provider-options.ts` — `getProviderOptions()` per-provider config
- `lib/ai/tools.ts` — `getEnabledTools()` model-based tool gating
- `lib/ai/title.ts` — `generateTitle()` for chat title generation
- `lib/ai/artifact-handlers.ts` — Handler registry: `registerArtifactHandler()`, `getArtifactHandler()` (dependency inversion)

**Chat feature (`features/chat/`):**
- **Types/Schemas:** `chat.types.ts` (ChatSessionValue, ArtifactDataPart, DataPart, ChatStatus), `chat.schema.ts`
- **Context:** `use-chat-session-context.ts` (ChatSessionContext + `useChatSessionContext()` wrapper)
- **Pure functions:** `chat-callbacks.ts` (onData, onError, onFinish handlers), `process-stream-deltas.ts` (delta → artifact state update)
- **Streaming:** `chat-stream-provider.tsx` (ChatStreamProvider: split state/dispatch contexts, RAF batching)
- **Hooks:** `use-chat-session.ts` (useChat config + callbacks ~120 lines), `use-chat-side-effects.ts` (navigation effects ~40 lines), `use-scroll-to-bottom.ts`
- **Tools:** `create-artifact.ts`, `update-artifact.ts` (use handler registry), `request-suggestions.ts`, `weather.ts`
- **Components:**
  - `greeting.tsx`, `suggested-actions.tsx`, `notice-handler.tsx` (empty state + notifications)
  - `message.tsx`, `message-reasoning.tsx` (single message rendering)
  - `message-actions.tsx`, `message-editor.tsx` (message interactions)
  - `messages.tsx` (virtualized list + auto-scroll)
  - `multimodal-input.tsx`, `submit-button.tsx` (input area)
  - `chat-header.tsx` (header with sidebar toggle)
  - `stream-bridge.tsx` (StreamBridge: thin null-render bridge ~20 lines → processStreamDelta → artifactStore)
  - `chat-shell.tsx` (ChatShell: thin orchestrator ~60 lines, creates `ChatSessionContext.Provider`)
- **Actions:** `delete-chat.ts`, `delete-all-chats.ts`, `delete-trailing-messages.ts` (each calls `updateTag`)

**Settings feature (minimal for chat):**
- `features/settings/hooks/use-settings.ts` — `useSyncExternalStore` + localStorage pub/sub (NO SettingsProvider needed)
- `features/settings/types/settings.types.ts`
- `features/settings/components/settings-panel.tsx`

**Chat routes:**
- `app/api/chat/route.ts` — POST: `createUIMessageStream`, `streamText`, tools, `onFinish` with title AWAITED server-side + revalidation
- `app/(chat)/layout.tsx` — SERVER: SidebarProvider, Suspense → SidebarSkeleton stub, PendingChatsProvider stub, NoticeHandler
- `app/(chat)/page.tsx` — New chat: generates UUID, renders ChatStreamProvider → ChatShell
- `app/(chat)/chat/[id]/page.tsx` — Existing chat: `Promise.all([chat, votes])`, `'use cache'` + `cacheTag`, renders ChatStreamProvider → ChatShell
- `app/(chat)/error.tsx` — Chat error boundary

**Data layer completion:**
- `lib/data/chat.ts` — Full implementation with guest/auth branching
- `lib/data/message.ts` — Full implementation

**Note on tools:** `createArtifact` and `updateArtifact` tools are created with handler registry calls, but handler implementations are stubs until Phase 4. `getWeather` is fully functional.

### Files Created/Modified (~42)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `lib/ai/` | 6 | models.ts, prompts.ts, provider-options.ts, artifact-handlers.ts, tools.ts, title.ts |
| `features/chat/` | ~21 | All components, hooks, actions, lib, schemas, types |
| `features/settings/` | 3 | use-settings.ts, settings.types.ts, settings-panel.tsx |
| `app/(chat)/` | 5 | layout.tsx, page.tsx, chat/[id]/page.tsx, error.tsx |
| `app/api/chat/` | 1 | route.ts |

### Exit Criteria

- [ ] ChatShell creates `ChatSessionContext.Provider` (~60 lines, NOT a God Component)
- [ ] `useChatSession` encapsulates `useChat` config + callbacks
- [ ] `ChatStreamProvider` uses split contexts (state/dispatch) with RAF batching
- [ ] `processStreamDelta()` is a pure testable function
- [ ] `StreamBridge` is a thin null-render bridge (~20 lines)
- [ ] Chat API route uses `createUIMessageStream` with `onFinish` revalidation
- [ ] Title is AWAITED server-side before stream close (no polling)
- [ ] System prompt uses "artifact" (not "document")
- [ ] Chat tools: `createArtifact`, `updateArtifact` (not createDocument/updateDocument)
- [ ] Handler registry in `lib/ai/artifact-handlers.ts` (dependency inversion)
- [ ] Chat pages use `'use cache'` + `cacheTag` for fetching
- [ ] New chat page renders with greeting + suggested actions
- [ ] User can type a message, submit, and see streaming response
- [ ] URL updates to `/chat/{id}` on first message
- [ ] Messages persist to DB (auth) or cache (guest)
- [ ] Settings (temperature, system prompt) affect AI responses
- [ ] `pnpm typecheck && pnpm lint && pnpm format` pass

### 27 Tasks (P3-T01 through P3-T27)

See `../../plan-archives/redesign/phase-plan.md` for complete task table.

---

## Phase 4 — Artifacts Vertical

### Entry State
Chat works end-to-end. StreamBridge processes stream deltas. Handler registry exists. Tool stubs call registry.

### Objective
Build the artifact system: `useSyncExternalStore` store, handler implementations, editors, artifact panel, versioning, and API routes. This wires the complete cross-feature pipeline (chat tools → handler registry → stream → artifact store → panel).

### Scope

**Artifact feature (`features/artifacts/`):**
- **Types/Schemas:** `artifact.types.ts` (UIArtifact, ArtifactKind, ArtifactStatus), `artifact.schema.ts`
- **Store:** `artifact-store.ts` (`useSyncExternalStore`: getSnapshot, subscribe, setState, reset)
- **Hook aliases:** `use-artifact.ts`, `use-artifact-selector.ts` (re-exports from store)
- **Handlers:**
  - `text-handler.ts` — streamText → artifact-textDelta (APPEND)
  - `code-handler.ts` — streamObject → artifact-codeDelta (REPLACE)
  - `sheet-handler.ts` — streamObject → artifact-sheetDelta (REPLACE)
  - `image-handler.ts` — Image handling (Pyodide-only)
  - `index.ts` — Side-effect: registers all handlers into `lib/ai/artifact-handlers.ts` registry
- **Editors:**
  - `text-editor.tsx` — Tiptap rich-text + suggestions extension
  - `code-editor.tsx` — CodeMirror Python + Pyodide execution
  - `sheet-editor.tsx` — react-data-grid + PapaParse CSV
  - `image-editor.tsx` — Image display (base64/URL)
- **Panel components:**
  - `artifact-panel.tsx` — Main container (kind-specific editor switch)
  - `artifact-actions.tsx` — Toolbar: copy, run, diff, undo/redo
  - `artifact-close-button.tsx` — Close button (`useArtifactSelector` for isVisible)
  - `artifact-error-boundary.tsx` — Error boundary for editor crashes
  - `artifact-preview.tsx` — Inline preview in messages
  - `version-footer.tsx` — Version navigation (prev/next)

**Routes:**
- `app/api/artifact/route.ts` — POST: save artifact version, `revalidateTag('artifact:{id}', 'max')`
- `app/api/suggestions/route.ts` — GET: suggestions by artifactId

**Data layer:**
- `lib/data/artifact.ts` — Full implementation (versioned saves, retrieval)

**Integration:**
- Update `features/chat/components/chat-shell.tsx` to conditionally render `ArtifactPanel` + wire `StreamBridge` → `artifactStore`

### Files Created/Modified (~28)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `features/artifacts/` | 17 | types, schemas, lib (store), hooks (aliases), handlers (5), components (6), editors (4) |
| `app/api/` | 2 | artifact/route.ts, suggestions/route.ts |
| Modified | 1 | chat-shell.tsx (wire artifact panel) |

### Exit Criteria

- [ ] `artifactStore` uses `useSyncExternalStore` (NOT SWR synthetic key)
- [ ] `useArtifactSelector(s => s.isVisible)` re-renders ONLY on visibility change
- [ ] All 4 handlers register via side-effect import in `handlers/index.ts`
- [ ] Handler registry uses `getArtifactHandler(kind)` pattern (dependency inversion)
- [ ] Text handler uses APPEND delta, code/sheet use REPLACE delta
- [ ] AI can call `createArtifact` tool → artifact panel opens
- [ ] Text artifacts stream and render in Tiptap editor
- [ ] Code artifacts stream and render in CodeMirror editor
- [ ] User can edit artifact content directly in editor
- [ ] Edits create new versions (composite PK: id + createdAt)
- [ ] Version footer shows "Version X of Y" with prev/next
- [ ] Artifact API route calls `revalidateTag('artifact:{id}', 'max')` on save
- [ ] Suggestions API uses `artifactId` parameter
- [ ] All files/types use "artifact" naming (zero "document")
- [ ] `pnpm typecheck && pnpm lint && pnpm format` pass

### 18 Tasks (P4-T01 through P4-T18)

See `../../plan-archives/redesign/phase-plan.md` for complete task table.

---

## Phase 5 — Sidebar & Navigation Vertical

### Entry State
Chat + artifacts work. Users can send messages, AI responds, artifacts are created/edited.

### Objective
Implement the server-rendered sidebar with client pagination, PendingChatsProvider for optimistic operations, chat history, and user navigation. SidebarShell is a SERVER component with `'use cache'`.

### Scope

**Sidebar feature (`features/sidebar/`):**
- `features/sidebar/types/sidebar.types.ts` — SidebarHistoryItem, PendingChat types
- `features/sidebar/hooks/use-pending-chats.ts` — PendingChatsProvider context: `add`, `remove`, `updateTitle`, `markConfirmed`
- `features/sidebar/hooks/use-sidebar-history.ts` — `useSWRInfinite` wrapper for cursor-based pagination
- `features/sidebar/components/sidebar-history-item.tsx` — Single chat item (link + rename + delete dropdown)
- `features/sidebar/components/sidebar-history-client.tsx` — `'use client'`: initial data from server + SWR pagination + optimistic merge with PendingChatsProvider
- `features/sidebar/components/sidebar-user-nav.tsx` — User avatar, theme toggle, logout
- `features/sidebar/components/sidebar-skeleton.tsx` — Loading skeleton (SERVER, PPR fallback)
- `features/sidebar/components/sidebar-shell.tsx` — SERVER (async): `'use cache'` + `cacheTag('chats:{userId}')`, fetches first 20 chats, renders sidebar structure
- `features/sidebar/actions/rename-chat.ts` — Server Action: rename chat title + `updateTag`

**Route:**
- `app/api/history/route.ts` — GET: cursor-based paginated chat history (guest/auth branching)

**Wiring updates:**
- `app/(chat)/layout.tsx` — Replace stubs with `SidebarProvider` → `Suspense` → `SidebarShell`, `PendingChatsProvider`
- Title sync: single channel via `chat-title` stream part → `useChatSession.onData` → `PendingChats.updateTitle()` (NO polling, NO window events)

### Files Created/Modified (~12)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `features/sidebar/` | 10 | types, hooks (2), components (5), actions (1) |
| `app/api/history/` | 1 | route.ts |
| Modified | 1 | app/(chat)/layout.tsx |

### Exit Criteria

- [ ] `SidebarShell` is a SERVER component with `'use cache'` + `cacheTag`
- [ ] Initial 20 chats fetched server-side (no client waterfall)
- [ ] `SidebarHistoryClient` uses `useSWRInfinite` only for pagination (not initial load)
- [ ] `PendingChatsProvider` provides `add`, `remove`, `updateTitle` operations
- [ ] Title flows via single channel: `chat-title` stream → `PendingChats.updateTitle()` (no polling, no window events)
- [ ] `SidebarSkeleton` renders as Suspense fallback
- [ ] Chat layout is a SERVER component (no `'use client'` on layout)
- [ ] Click a chat → navigates to `/chat/{id}`, loads messages
- [ ] Delete a chat → optimistic removal + server delete + `updateTag`
- [ ] New chat button → navigates to `/`
- [ ] Active chat highlighted in sidebar
- [ ] `pnpm typecheck && pnpm lint && pnpm format` pass

### 12 Tasks (P5-T01 through P5-T12)

See `../../plan-archives/redesign/phase-plan.md` for complete task table.

---

## Phase 6 — Enhancements

### Entry State
Core features work: auth, chat, artifacts, sidebar. Users can have complete conversations with AI-created artifacts and navigate between chats.

### Objective
Build all secondary features that augment the core experience: voting, model selection, visibility toggle, file upload, weather UI, and health check. These are independent enough to parallelize.

### Scope

**Voting (`features/voting/`):**
- `features/voting/types/vote.types.ts` — Vote type
- `features/voting/actions/vote.ts` — Server Action: auth, non-guest check, upsert vote + `useOptimistic` + `updateTag('votes:{chatId}')`
- `features/voting/components/vote-buttons.tsx` — Thumbs up/down with `useOptimistic`
- `features/voting/hooks/use-votes.ts` — Votes state (server-seeded + optimistic)
- Wire VoteButtons into `message.tsx`, add VoteResolver to chat pages

**Model Selection (`features/models/`):**
- `features/models/components/model-selector.tsx` — Dropdown with provider grouping
- `features/models/lib/models.ts` — Model catalog with `'use cache'`
- `features/models/types/model.types.ts` — Model display types
- Wire model selector into `chat-header.tsx`
- Cookie `chat-model` + localStorage persistence

**Visibility (`features/visibility/`):**
- `features/visibility/types/visibility.types.ts` — VisibilityType
- `features/visibility/actions/update-visibility.ts` — Server Action + `updateTag` on both chat and chat-list tags
- `features/visibility/components/visibility-selector.tsx` — `useOptimistic` toggle
- Wire into `chat/[id]/page.tsx`

**File Upload:**
- `app/api/files/upload/route.ts` — POST: multipart → Vercel Blob
- `features/chat/components/preview-attachment.tsx` — Upload thumbnail
- Wire into `multimodal-input.tsx` with attachment handling

**Weather UI:**
- `components/weather.tsx` — Weather tool result renderer (shared component)

**Health Check:**
- `app/api/health/route.ts` — DB + Redis ping

### Files Created/Modified (~17)

| Sub-Task | Files | Key Files |
|----------|-------|-----------|
| Voting | 5 | types, action, component, hook, message.tsx update |
| Models | 3+1 | component, lib, types, chat-header update |
| Visibility | 3+1 | types, action, component, chat page update |
| Upload | 1+2 | route.ts, preview-attachment.tsx, multimodal-input update |
| Weather | 1 | weather.tsx |
| Health | 1 | health/route.ts |

### Exit Criteria

- [ ] **Voting**: Server Action + `useOptimistic` (NOT `PATCH /api/vote`) — thumbs up/down works
- [ ] **Voting**: Guest cannot vote (returns `ActionResult` with `FORBIDDEN`)
- [ ] **Models**: Selection persists to cookie (server-readable) + localStorage
- [ ] **Visibility**: Server Action + `updateTag` on both `chat:{id}` and `chats:{userId}` tags
- [ ] **Upload**: File uploads to Vercel Blob, preview renders thumbnail
- [ ] **Weather**: Weather tool result renders in messages
- [ ] **Health**: GET /api/health returns status with DB + cache latency
- [ ] All Server Actions return `ActionResult<T>` (never throw)
- [ ] All features work together without conflicts
- [ ] `pnpm typecheck && pnpm lint && pnpm format` pass

### 14 Tasks (P6-T01 through P6-T14)

See `../../plan-archives/redesign/phase-plan.md` for complete task table.

---

## Phase 7 — Polish & Production

### Entry State
All features working: auth, chat, artifacts, sidebar, voting, models, settings, upload, visibility, health.

### Objective
Production-readiness: error boundaries, accessibility, responsive design, instrumentation, testing, import boundary enforcement, naming verification, and final build. After this phase, the app is deployable.

### Scope

**Error boundaries:**
- Finalize `app/global-error.tsx` — Standalone HTML wrapper
- Finalize `app/(chat)/error.tsx` — Preserves sidebar, retry + home buttons
- Finalize `app/(auth)/error.tsx` — Auth-specific error handling
- Finalize `features/artifacts/components/artifact-error-boundary.tsx` — Editor crash isolation

**Accessibility:**
- ARIA labels on all interactive elements
- Focus management for modal dialogs (artifact panel, settings sheet)
- Keyboard navigation for sidebar, message actions, model selector

**Responsive design:**
- Mobile: full-screen artifact panel
- Mobile: sidebar as sheet overlay
- Touch-friendly interaction targets (44px minimum)

**Instrumentation:**
- Complete `instrumentation.ts` (OpenTelemetry)
- Complete `instrumentation-client.ts`

**Testing:**
- E2E specs: `tests/e2e/chat.spec.ts`, `artifacts.spec.ts`, `auth.spec.ts`, `sidebar.spec.ts`
- Integration tests: `tests/integration/chat-flow.test.ts`, `artifact-flow.test.ts`, `auth-flow.test.ts`, `sidebar-flow.test.ts`
- Stream test utility: `tests/utils/stream.ts`, mocks: `tests/mocks/ai.ts`, `tests/mocks/fetch.ts`

**Pyodide & lazy loading:**
- Code editor artifact component loads Pyodide via `<Script src="pyodide.js" strategy="lazyOnload" />`
- Module cache for CodeMirror bundle (dynamic import, not eagerly loaded)

**Verification gates:**
- `scripts/check-imports.mjs` — zero import boundary violations
- `grep -r "document"` in code — zero results (excluding .next-docs, oldapp, node_modules)
- `grep -rE "credit|gateway|quota|entitlement|AppUsage|activate_gateway"` — zero results
- `proxy.ts` exists (not `middleware.ts`)
- `pnpm format && pnpm typecheck && pnpm lint` — all pass
- `pnpm build` — clean production build

### Files Created/Modified (~20)

| Area | Count | Key Files |
|------|-------|-----------|
| Error boundaries | 4 | global-error, chat error, auth error, artifact error boundary |
| Tests | 12 | E2E specs (4), integration tests (4), utils/mocks (4) |
| Instrumentation | 2 | instrumentation.ts, instrumentation-client.ts |
| Responsive | ~3 | Layout adjustments across chat, sidebar, artifact |

### Exit Criteria

- [ ] All error boundaries render standalone with recovery actions
- [ ] `scripts/check-imports.mjs` reports zero violations
- [ ] Zero occurrences of "document" in code identifiers
- [ ] Zero occurrences of credit/gateway/quota terminology
- [ ] `proxy.ts` exists (not `middleware.ts`)
- [ ] `pnpm format && pnpm typecheck && pnpm lint` all pass
- [ ] `pnpm build` succeeds cleanly
- [ ] E2E test specs cover: auth flow, chat send/receive, artifact create/edit, sidebar navigation
- [ ] App is usable on mobile (320px width)
- [ ] Core Web Vitals are acceptable
- [ ] Lazy loading verified: CodeMirror, react-data-grid, Pyodide via dynamic import
- [ ] Bundle analysis passes (`next build` + `ANALYZE=true`), no regression > 5% from baseline
- [ ] Adaptive streaming throttle verified (50/100/150ms based on message length)
- [ ] SWR deduplication confirmed on sidebar pagination

### 13 Tasks (P7-T01 through P7-T13)

See `../../plan-archives/redesign/phase-plan.md` for complete task table.

---

## Task Count Summary

| Phase | Name | Tasks | Est. Files | Focus |
|---|---|---|---|---|
| P0 | Scaffold & Infrastructure | 18 | ~55 | Config, types, errors, utils, UI primitives, root layout, proxy |
| P1 | Data Foundation | 14 | ~22 | DB, cache, data access, AI providers, test fixtures |
| P2 | Auth Vertical | 9 | ~14 | Session, auth actions, auth UI, proxy wiring |
| P3 | Chat Core Vertical | 27 | ~42 | AI integration, settings, streaming, ChatShell, messages, input, pages |
| P4 | Artifacts Vertical | 18 | ~28 | Store, handlers, editors, artifact panel, API routes |
| P5 | Sidebar & Navigation | 12 | ~12 | Server-rendered sidebar, PendingChatsProvider, history pagination |
| P6 | Enhancements | 14 | ~17 | Voting, model selector, visibility, file upload, weather |
| P7 | Polish & Production | 13 | ~20 | Error boundaries, a11y, tests, verification, build |
| **Total** | | **125** | **~210** | |
