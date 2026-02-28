# Vertical Slices

> Every phase of the rebuild defined with entry state, scope, exit criteria,
> files touched, seams wired, and integration verification.

---

## Phase 00 — Scaffold (Blocking)

### Entry State
Empty project directory (or existing repo with `oldapp/` preserved).

### Objective
Set up the project skeleton: config, directory structure, shared types, ai-elements copy, and a minimal rendering root layout. The project must build and pass all linting.

### Scope

**Config files:**
- `package.json` — dependencies + scripts
- `next.config.ts` — React Compiler, PPR incremental
- `tsconfig.json` — strict mode, `@/*` path alias, exclude oldapp/plan
- `biome.json` — formatting + linting rules, ai-elements excluded
- `postcss.config.mjs` — Tailwind v4 plugin
- `vercel.json` — minimal

**Root app shell:**
- `app/layout.tsx` — Root layout: fonts (Geist, Geist Mono), `<html>` with suppressed hydration warning, `<body>` with `antialiased`
- `app/globals.css` — Tailwind v4 imports, CSS custom properties (light/dark themes), copied from oldapp
- `app/global-error.tsx` — Standalone html/body error boundary
- `app/head.tsx` — Metadata configuration
- `components/app-shell.tsx` — Provider tree stub (ThemeProvider → TooltipProvider → Toaster)
- `components/theme-provider.tsx` — next-themes wrapper

**Shared infrastructure (type-level only):**
- `lib/db/schema.ts` — Drizzle table definitions (users, chats, messages, votes, documents, suggestions)
- `lib/types/models.types.ts` — InferSelectModel / InferInsertModel types
- `lib/types/api.types.ts` — Request/response shapes
- `lib/types/ai.types.ts` — ModelMetadata, ProviderId, ReasoningType, CustomUIDataTypes, constants
- `lib/types/index.ts` — AppSession, DataContext, re-exports
- `lib/errors/codes.ts` — ErrorCode string literal union
- `lib/errors/app-error.ts` — AppError class with static factories + toResponse()
- `lib/errors/index.ts` — Re-exports
- `lib/utils/index.ts` — cn(), generateUUID(), formatDate (carried from oldapp)
- `lib/utils/lazy.ts` — createLazyComponentWithPreload (needed by ai-elements)
- `lib/utils/logger.ts` — Structured logger (needed by ai-elements)

**AI elements (copy):**
- Copy all 31 files from `oldapp/components/elements/` → `components/ai-elements/`
- Adjust import paths if `@/lib/utils/index` or `@/components/ui/` paths changed
- Verify no logic modifications

**shadcn/ui components (copy):**
- Copy all UI primitives from `oldapp/components/ui/` → `components/ui/`
- These are the base components ai-elements depends on (button, badge, card, collapsible, command, dialog, dropdown-menu, hover-card, input, input-group, progress, scroll-area, select, separator, tooltip, etc.)

**Shared components:**
- `components/icons.tsx` — Shared icon components (copy from oldapp)
- `components/sidebar-toggle.tsx` — Sidebar toggle button (copy from oldapp)

**Directory stubs:**
- Create empty directories for all features: `features/chat/`, `features/artifacts/`, `features/auth/`, `features/sidebar/`, `features/settings/`, `features/voting/`, `features/models/`
- Create `tests/` with `setup.ts` stub

**Middleware base:**
- `middleware.ts` — Device detection header only (rate limiting and auth added in later phases)

**Instrumentation:**
- `instrumentation.ts` — OTel skeleton
- `instrumentation-client.ts` — Empty export

### Files Created (~80+)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| Root config | 7 | package.json, next.config.ts, tsconfig.json, biome.json, postcss, vercel.json, .env.example |
| `app/` | 5 | layout.tsx, globals.css, global-error.tsx, head.tsx |
| `components/ai-elements/` | 31 | All 31 read-only primitives |
| `components/ui/` | ~32 | All shadcn/ui base components |
| `components/` | 4 | app-shell.tsx, theme-provider.tsx, icons.tsx, sidebar-toggle.tsx |
| `lib/types/` | 4 | models.types.ts, api.types.ts, ai.types.ts, index.ts |
| `lib/errors/` | 3 | codes.ts, app-error.ts, index.ts |
| `lib/utils/` | 3 | index.ts, lazy.ts, logger.ts |
| `lib/db/` | 1 | schema.ts |
| Root | 3 | middleware.ts, instrumentation.ts, instrumentation-client.ts |

### Exit Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm format` passes
- [ ] `pnpm dev` starts, root layout renders (blank page with theme provider)
- [ ] All ai-elements files exist at `@/components/ai-elements/`
- [ ] All shadcn/ui files exist at `@/components/ui/`
- [ ] `@/lib/types` exports AppSession, DataContext, ModelMetadata, etc.
- [ ] `@/lib/errors` exports AppError with factory methods
- [ ] Import `@/components/ai-elements/message` resolves without errors
- [ ] Directory structure matches scaffold/directory-structure.md

### Seams Addressed
None directly — this phase creates the foundation for all seams.

---

## Phase 01 — Data Foundation (Blocking)

### Entry State
Scaffold complete. Types, config, and ai-elements available.

### Objective
Build the entire data access layer: database client, cache client, data access functions (stubs with core implementations), auth infrastructure, and API utilities. After this phase, any feature can call data functions.

### Scope

**Database (`lib/db/`):**
- `lib/db/client.ts` — Drizzle client with postgres driver, globalThis singleton for HMR safety
- `lib/db/index.ts` — Re-export db + schema
- `lib/db/migrate.ts` — Migration runner
- `lib/db/migrations/` — Initial migration (generated from schema)

**Cache (`lib/cache/`):**
- `lib/cache/client.ts` — Upstash Redis client (HTTP-based, edge-compatible, globalThis singleton)
- `lib/cache/keys.ts` — Cache key factory (`cacheKeys.chat()`, `.userChats()`, `.document()`, `.quota()`)
- `lib/cache/with-cache.ts` — `withCache<T>(key, ttl, fetcher)` helper with failure tolerance
- `lib/cache/index.ts` — Re-exports

**Data access (`lib/data/`):**
- `lib/data/context.ts` — DataContext type + `createDataContext(session)`
- `lib/data/chat.ts` — `getChatById`, `getChatsByUserId`, `createChat`, `updateChatTitle`, `updateChatVisibility`, `deleteChatById`, `deleteAllChatsByUserId`, `getChatWithMessages`, `saveChat` (orchestrator)
- `lib/data/message.ts` — `getMessagesByChatId`, `createMessage`, `deleteTrailingMessages`, `getUserMessageCount`, `incrementMessageCount`
- `lib/data/document.ts` — `getDocumentById`, `getDocumentVersions`, `saveDocumentVersion`, `deleteDocumentVersion`
- `lib/data/vote.ts` — `upsertVote`, `getVotesByChatId`
- `lib/data/user.ts` — `getUserById`, `createUser`

All data functions implement the guest/auth branching pattern:
- Guest: cache-only reads (return null on miss), cache-only writes
- Auth: cache-first reads with DB fallback + cache warming, DB-first writes with cache update

**Auth infrastructure (`lib/auth/`):**
- `lib/auth/config.ts` — JWT secrets, cookie names/config, Supabase server client factory
- `lib/auth/index.ts` — Re-exports

**API utilities (`lib/api/`):**
- `lib/api/guards.ts` — `requireAuth()`, `requireNonGuest()`, `requireChatOwner()`, `requireMessageInChat()`
- `lib/api/validation.ts` — `parseJsonBodyForRoute(body, schema)` with Zod
- `lib/api/response.ts` — Error response helpers

**Rate limiting (`lib/rate-limit/`):**
- `lib/rate-limit/config.ts` — `RateLimiters` with chat (50/min), standard (100/min), strict (10/min), upload (10/hr) configs using @upstash/ratelimit

**Shared hooks (`lib/hooks/`):**
- `lib/hooks/use-mobile.ts` — useSyncExternalStore + matchMedia
- `lib/hooks/use-debounce.ts` — Debounced value hook

### Files Created (~25)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `lib/db/` | 4 | client.ts, index.ts, migrate.ts, migrations/ |
| `lib/cache/` | 4 | client.ts, keys.ts, with-cache.ts, index.ts |
| `lib/data/` | 6 | context.ts, chat.ts, message.ts, document.ts, vote.ts, user.ts |
| `lib/auth/` | 2 | config.ts, index.ts |
| `lib/api/` | 3 | guards.ts, validation.ts, response.ts |
| `lib/rate-limit/` | 1 | config.ts |
| `lib/hooks/` | 2 | use-mobile.ts, use-debounce.ts |
| `tests/mocks/` | 3 | cache.ts, db.ts, auth.ts |

### Exit Criteria

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] DB client connects (or mocked in test)
- [ ] Cache client connects (or mocked in test)
- [ ] `createDataContext()` produces correct context from mock session
- [ ] `getChatById` correctly branches on `isGuest`
- [ ] `withCache` handles cache miss → fetcher → cache warm
- [ ] `AppError.unauthorized().toResponse()` returns 401 JSON
- [ ] `parseJsonBodyForRoute` validates with Zod and returns parsed data
- [ ] `RateLimiters.chat` instantiates correctly
- [ ] Unit tests for data access functions pass (mocked db/cache)

### Seams Addressed
- **SEAM-023**: DataContext (session → guest/auth branching)
- **SEAM-024**: Chat data operations (partial — functions defined, full integration in P03)
- **SEAM-025**: Document data operations (partial — functions defined, full integration in P04)
- **SEAM-026**: Message persistence (partial — functions defined, full integration in P03)

---

## Phase 02 — Auth Vertical (Blocking)

### Entry State
Data foundation available. DB/cache clients work. Auth config exists.

### Objective
Complete authentication end-to-end: login, register, guest bootstrap, token exchange, session resolution, middleware auth guards. After this phase, users can authenticate and the session is available everywhere.

### Scope

**Auth feature (`features/auth/`):**
- `features/auth/lib/session.ts` — `getAppSession()`: checks sb_token → guest_token → null
- `features/auth/actions/login.ts` — Login server action (form validation)
- `features/auth/actions/register.ts` — Register server action
- `features/auth/actions/exchange.ts` — Token exchange: jwtVerify Supabase token, set httpOnly cookie
- `features/auth/actions/logout.ts` — Clear cookies, redirect
- `features/auth/components/auth-form.tsx` — Consolidated form with `mode` prop (login/register)
- `features/auth/components/auth-provider.tsx` — Session context: Supabase listener, guest bootstrap effect, session state
- `features/auth/schemas/auth.schema.ts` — Login/register Zod schemas

**Auth routes (`app/api/auth/`):**
- `app/api/auth/callback/route.ts` — OAuth callback (if needed)
- `app/api/auth/guest/route.ts` — POST: generate guest JWT, set cookie
- `app/api/auth/logout/route.ts` — POST: clear cookies

**Auth pages (`app/(auth)/`):**
- `app/(auth)/layout.tsx` — Minimal auth layout (no sidebar)
- `app/(auth)/login/page.tsx` — Login page importing AuthForm
- `app/(auth)/register/page.tsx` — Register page importing AuthForm

**Middleware updates:**
- `middleware.ts` — Add guest token rotation (if <30min remaining → resign JWT, same sub, fresh exp)

**Root layout update:**
- `app/layout.tsx` — Wire AppShell to fetch session via `getAppSession()`, pass to AuthProvider
- `components/app-shell.tsx` — Add SWRConfig + AuthProvider to provider tree

### Files Created/Modified (~14)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `features/auth/` | 8 | session.ts, login.ts, register.ts, exchange.ts, logout.ts, auth-form.tsx, auth-provider.tsx, auth.schema.ts |
| `app/(auth)/` | 3 | layout.tsx, login/page.tsx, register/page.tsx |
| `app/api/auth/` | 3 | guest/route.ts, logout/route.ts, callback/route.ts |

### Exit Criteria

- [ ] `getAppSession()` resolves Supabase JWT → authenticated session
- [ ] `getAppSession()` resolves guest JWT → guest session
- [ ] `getAppSession()` returns null when no cookies
- [ ] Login form submits → exchange route → cookie set → redirect to `/`
- [ ] Register form submits → Supabase signUp → exchange → redirect
- [ ] Guest route generates JWT → sets cookie → returns session
- [ ] AuthProvider bootstraps guest session on first visit (no cookies)
- [ ] Middleware rotates guest token when <30min remaining
- [ ] Auth pages render correctly (login, register)
- [ ] `pnpm typecheck` and `pnpm lint` pass
- [ ] Integration test: login flow end-to-end

### Seams Addressed
- **SEAM-001**: Auth provider injection (AuthProvider with context)
- **SEAM-002**: Auth exchange (client Supabase → server cookie)
- **SEAM-003**: Guest bootstrap (auto-create guest session)
- **SEAM-004**: Guest token rotation (middleware)
- **SEAM-005**: Session resolution (getAppSession)

---

## Phase 03 — Chat Core Vertical (Blocking)

### Entry State
Auth works. Users can log in, register, or browse as guest. Session available everywhere.

### Objective
Build the complete chat feature: send a message, receive a streaming AI response, display it with markdown/reasoning, persist to DB/cache, load existing chats. This is the most complex phase.

### Scope

**AI infrastructure (`lib/ai/`):**
- `lib/ai/providers.ts` — `myProvider`: registry wrapper with reasoning middleware
- `lib/ai/registry.ts` — `createProviderRegistry()` with 6 conditional providers
- `lib/ai/model-discovery.ts` — Dynamic model discovery from provider APIs
- `lib/ai/index.ts` — Re-exports

**Chat feature (`features/chat/`):**
- `features/chat/actions/stream-chat.ts` — `streamChatAction()`: validate, auth, rate limit, quota, createUIMessageStream, executeChatCompletion, saveChat onFinish
- `features/chat/actions/save-message.ts` — Message persistence orchestration
- `features/chat/actions/delete-trailing-messages.ts` — Delete messages after edit point
- `features/chat/components/chat.tsx` — Main orchestrator: useChat hook, transport config, onData/onFinish/onError handlers, URL state management
- `features/chat/components/chat-header.tsx` — Header with sidebar toggle, model display
- `features/chat/components/messages.tsx` — Message list with Virtuoso, auto-scroll, thinking indicator
- `features/chat/components/message.tsx` — Single message renderer (wraps ai-elements)
- `features/chat/components/message-actions.tsx` — Copy, edit, regenerate buttons (vote in P06)
- `features/chat/components/message-editor.tsx` — Inline edit textarea
- `features/chat/components/message-reasoning.tsx` — Collapsible reasoning display
- `features/chat/components/multimodal-input.tsx` — Text input + submit (file upload in P06, model selector in P06)
- `features/chat/components/greeting.tsx` — Empty chat welcome
- `features/chat/components/suggested-actions.tsx` — Quick action buttons
- `features/chat/components/data-stream-handler.tsx` — SSE → SWR bridge
- `features/chat/components/data-stream-provider.tsx` — Split state/dispatch contexts
- `features/chat/components/weather.tsx` — Weather tool result renderer
- `features/chat/hooks/use-messages.ts` — Context: share messages between components
- `features/chat/hooks/use-scroll-to-bottom.ts` — Auto-scroll with override
- `features/chat/schemas/chat.schema.ts` — Chat request body validation
- `features/chat/schemas/message.schema.ts` — Message validation
- `features/chat/lib/prompts.ts` — System prompt composition (regular + geo + user + artifacts)
- `features/chat/lib/completion.ts` — executeChatCompletion (model, tools, settings, stream)
- `features/chat/lib/tools/weather.ts` — getWeather tool definition

**Settings feature (minimal for chat):**
- `features/settings/hooks/use-settings.ts` — useSyncExternalStore + localStorage pub/sub
- `features/settings/lib/defaults.ts` — Default settings values
- `features/settings/lib/types.ts` — SettingsState type

**Chat routes:**
- `app/api/chat/route.ts` — POST: streaming chat (delegates to streamChatAction)
- `app/(chat)/layout.tsx` — Server side: cookies, session, mobile detection
- `app/(chat)/chat-layout-client.tsx` — Client: SettingsProvider → DataStreamProvider → provider stack
- `app/(chat)/page.tsx` — New chat: UUID, model cookie, Chat + DataStreamHandler
- `app/(chat)/chat/[id]/page.tsx` — Existing chat: fetch data, access control, Chat + DataStreamHandler
- `app/(chat)/loading.tsx` — Loading spinner
- `app/(chat)/error.tsx` — Chat error boundary

**Data layer completion:**
- `lib/data/chat.ts` — Full implementation with guest/auth branching
- `lib/data/message.ts` — Full implementation

**Note on tools**: Only `getWeather` is implemented in this phase. `createDocument`, `updateDocument`, `requestSuggestions` are stubs that return "not yet available" — they require artifacts infrastructure from Phase 04.

### Files Created/Modified (~35)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `lib/ai/` | 4 | providers.ts, registry.ts, model-discovery.ts, index.ts |
| `features/chat/` | ~20 | All actions, components, hooks, schemas, lib |
| `features/settings/` | 3 | use-settings.ts, defaults.ts, types.ts |
| `app/(chat)/` | 6 | layout.tsx, chat-layout-client.tsx, page.tsx, chat/[id]/page.tsx, loading.tsx, error.tsx |
| `app/api/chat/` | 1 | route.ts |

### Exit Criteria

- [ ] New chat page renders with greeting + suggested actions
- [ ] User can type a message and submit
- [ ] URL updates to `/chat/{id}` on first message (no reload)
- [ ] POST /api/chat returns SSE stream
- [ ] AI response streams token-by-token in the message area
- [ ] Reasoning/thinking is collapsible and renders correctly
- [ ] Messages persist to DB (auth) or cache (guest)
- [ ] Existing chat loads from DB/cache with correct messages
- [ ] Weather tool works (user asks about weather, gets response)
- [ ] Chat header shows (sidebar toggle, model name)
- [ ] Message actions (copy, edit) work
- [ ] Settings (temperature, system prompt) affect AI responses
- [ ] `pnpm typecheck` and `pnpm lint` pass
- [ ] DataStreamHandler processes custom data parts
- [ ] Error boundary catches and displays chat errors

### Seams Addressed
- **SEAM-006**: Chat request pipeline (useChat → POST /api/chat → SSE)
- **SEAM-007**: DataStream pipeline (SSE → DataStreamProvider → DataStreamHandler → SWR)
- **SEAM-008**: Chat completion execution (model, tools, settings, streaming)
- **SEAM-015**: Settings pipeline (localStorage → useChat → server → streamText config)
- **SEAM-028**: Client error handling (useChat.onError → toast)
- **SEAM-029**: Provider tree assembly (root + chat layout provider stacks)
- **SEAM-031**: URL state management (history.replaceState for chat nav)
- **SEAM-038**: Message edit + regenerate (edit → delete trailing → regenerate)

---

## Phase 04 — Artifacts Vertical

### Entry State
Chat works end-to-end. Messages stream and persist. DataStreamHandler processes data parts.

### Objective
Build the artifact system: AI can create documents (text, code, sheet), user can edit them, versions are tracked. This wires the most complex cross-feature seam (chat tools → artifact handlers → data stream → artifact panel).

### Scope

**Artifact feature (`features/artifacts/`):**
- `features/artifacts/handlers/base.ts` — DocumentHandler interface + factory + handler registration
- `features/artifacts/handlers/text.ts` — Text handler: streamText → data-textDelta
- `features/artifacts/handlers/code.ts` — Code handler: streamObject({code}) → data-codeDelta
- `features/artifacts/handlers/sheet.ts` — Sheet handler: streamObject({csv}) → data-sheetDelta
- `features/artifacts/handlers/image.ts` — Image handler (Pyodide-only, no server generation)
- `features/artifacts/components/artifact-panel.tsx` — Overlay panel with AnimatePresence
- `features/artifacts/components/artifact-actions.tsx` — Per-kind action buttons
- `features/artifacts/components/artifact-close.tsx` — Close/reset button
- `features/artifacts/components/artifact-error-boundary.tsx` — Editor crash boundary
- `features/artifacts/components/artifact-messages.tsx` — Mini message sidebar in panel
- `features/artifacts/components/create-artifact.tsx` — Manual creation UI
- `features/artifacts/components/document-preview.tsx` — Inline preview in messages
- `features/artifacts/components/version-footer.tsx` — Version navigation
- `features/artifacts/components/toolbar.tsx` — Draggable action toolbar
- `features/artifacts/components/diffview.tsx` — Version diff comparison
- `features/artifacts/components/editors/text-editor.tsx` — TipTap with suggestions extension
- `features/artifacts/components/editors/code-editor.tsx` — CodeMirror + Pyodide
- `features/artifacts/components/editors/sheet-editor.tsx` — react-data-grid + PapaParse
- `features/artifacts/components/editors/image-editor.tsx` — Image display
- `features/artifacts/components/editors/console.tsx` — Code execution output
- `features/artifacts/hooks/use-artifact.ts` — SWR-based state
- `features/artifacts/hooks/use-artifact-selector.ts` — Derived slice selector
- `features/artifacts/schemas/artifact.schema.ts` — Validation
- `features/artifacts/types/artifact.types.ts` — UIArtifact, ArtifactKind, ArtifactDefinition

**Chat tools (completing stubs from P03):**
- `features/chat/lib/tools/create-document.ts` — createDocument tool (→ handler factory)
- `features/chat/lib/tools/update-document.ts` — updateDocument tool (→ handler factory)
- `features/chat/lib/tools/suggestions.ts` — requestSuggestions tool (streamObject → data-suggestion)

**Routes:**
- `app/api/artifact/route.ts` — GET/POST/DELETE document CRUD
- `app/api/suggestions/route.ts` — GET suggestions

**Data layer:**
- `lib/data/document.ts` — Full implementation (versioned saves, version retrieval)

### Files Created/Modified (~28)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `features/artifacts/` | 22 | handlers, components, editors, hooks, schemas, types |
| `features/chat/lib/tools/` | 3 | create-document.ts, update-document.ts, suggestions.ts |
| `app/api/` | 2 | artifact/route.ts, suggestions/route.ts |

### Exit Criteria

- [ ] AI can call `createDocument` tool → artifact panel opens
- [ ] Text artifacts stream with data-textDelta, render in TipTap
- [ ] Code artifacts stream with data-codeDelta, render in CodeMirror
- [ ] Sheet artifacts stream with data-sheetDelta, render in react-data-grid
- [ ] User can edit artifact content directly in editor
- [ ] Edits create new versions (composite PK: id + createdAt)
- [ ] Version footer shows "Version X of Y" with prev/next buttons
- [ ] Version restore works (DELETE later versions)
- [ ] AI can call `updateDocument` → existing content updated
- [ ] Suggestions stream as data-suggestion, display in text editor
- [ ] Artifact panel has AnimatePresence open/close animation
- [ ] Artifact error boundary catches editor crashes
- [ ] Document inline preview renders in message area
- [ ] Code execution via Pyodide works (run button → console output)
- [ ] `pnpm typecheck` and `pnpm lint` pass

### Seams Addressed
- **SEAM-009**: createDocument tool → artifact handlers
- **SEAM-010**: updateDocument tool → artifact handlers
- **SEAM-011**: requestSuggestions tool → text editor
- **SEAM-012**: Artifact stream → artifact panel (DataStreamHandler → useArtifact → panel)
- **SEAM-021**: Document version fetch
- **SEAM-032**: Text editor (TipTap + suggestions extension)
- **SEAM-033**: Code editor (CodeMirror + Pyodide)
- **SEAM-034**: Sheet editor (react-data-grid + PapaParse)
- **SEAM-035**: Image editor
- **SEAM-037**: Pyodide script loading
- **SEAM-039**: Version navigation + restore
- **SEAM-040**: Inline document preview → artifact panel

---

## Phase 05 — Sidebar & Navigation Vertical

### Entry State
Chat + artifacts work. Users can send messages, AI responds, documents are created.

### Objective
Build sidebar chat history with infinite scroll, optimistic updates, date grouping, chat switching, and delete. After this phase, full navigation works.

### Scope

**Sidebar feature (`features/sidebar/`):**
- `features/sidebar/components/app-sidebar.tsx` — Shell: header (brand, new chat), content (history), footer (user nav)
- `features/sidebar/components/sidebar-history.tsx` — SWR infinite scroll + GroupedVirtuoso + date grouping
- `features/sidebar/components/sidebar-history-item.tsx` — Chat link + dropdown (share, delete)
- `features/sidebar/components/sidebar-skeleton.tsx` — Loading skeleton
- `features/sidebar/components/sidebar-user-nav.tsx` — Avatar, theme toggle, login/logout
- `features/sidebar/hooks/use-optimistic-chats.ts` — Context provider with Set-based dedup, auto-cleanup

**Route:**
- `app/api/history/route.ts` — GET (paginated, guest/auth branching) + DELETE (all chats)

**Wiring updates:**
- `app/(chat)/chat-layout-client.tsx` — Wire OptimisticChatsProvider + SidebarProvider + dynamic AppSidebar import
- `features/chat/components/chat.tsx` — Wire `addOptimisticChat()` on first message submit
- `features/chat/components/chat.tsx` — Wire `updateOptimisticChat()` on data-chatTitle
- Title sync: pollForTitle in onFinish, dispatch `chat-title-updated` event, sidebar listens

### Files Created/Modified (~8)

| Directory | Count | Key Files |
|-----------|-------|-----------|
| `features/sidebar/` | 6 | All components + hooks |
| `app/api/history/` | 1 | route.ts |
| Modified | 1 | chat-layout-client.tsx |

### Exit Criteria

- [ ] Sidebar renders with chat history (grouped by date: Today, Yesterday, Last 7/30 days, Older)
- [ ] Infinite scroll loads more chats on scroll
- [ ] New chat creates optimistic sidebar entry immediately
- [ ] Title updates stream from AI → sidebar entry
- [ ] Click a chat → navigates to `/chat/{id}`, loads messages
- [ ] Delete a chat → optimistic removal + server delete
- [ ] Delete all chats → redirect to `/` + clear history
- [ ] New chat button → navigates to `/`
- [ ] User nav shows avatar, theme toggle, login/logout
- [ ] Guest: sidebar shows cache-only chats
- [ ] Auth: sidebar shows DB-backed chats with cursor pagination
- [ ] Active chat highlighted in sidebar
- [ ] `pnpm typecheck` and `pnpm lint` pass

### Seams Addressed
- **SEAM-013**: Optimistic chat creation (Chat → OptimisticChatsProvider → SidebarHistory)
- **SEAM-014**: Title sync (stream + poll + event)
- **SEAM-020**: Sidebar history pagination (SWR infinite → GET /api/history)
- **SEAM-030**: Theme system (provider + toggle in user nav)

---

## Phase 06 — Enhancement Vertical

### Entry State
Core features work: auth, chat, artifacts, sidebar. Users can have complete conversations with AI-created documents and navigate between chats.

### Objective
Build all secondary features that augment the core experience: voting, model selection, settings panel, file upload, visibility toggle. These are independent enough to potentially parallelize.

### Scope (6 Sub-Tasks)

**06a. Voting (`features/voting/` + message-actions update):**
- `features/voting/actions/vote.ts` — Server: auth, non-guest, ownership, membership, upsert
- `features/voting/schemas/vote.schema.ts` — Zod validation
- `app/api/vote/route.ts` — PATCH route
- Update `features/chat/components/message-actions.tsx` — Add vote buttons with SWR optimistic

**06b. Model Selection (`features/models/`):**
- `features/models/components/model-selector.tsx` — Dropdown with provider grouping, compact variant
- `features/models/lib/catalog.ts` — `listChatModels()`: curated + discovered merge
- `features/models/lib/discovery.ts` — Dynamic discovery from provider APIs
- Wire model selector into `multimodal-input.tsx`
- Wire cookie `chat-model` persistence

**06c. Settings Panel (`features/settings/`):**
- `features/settings/components/settings-panel.tsx` — Sheet with temperature, topP, maxOutputTokens, system prompt, toggles
- Complete settings hook (already stubbed in P03)
- Wire settings panel into chat layout

**06d. File Upload:**
- `app/api/files/upload/route.ts` — POST: auth, rate limit, Vercel Blob put()
- `features/chat/components/preview-attachment.tsx` — Upload thumbnail
- Update `features/chat/components/multimodal-input.tsx` — Add file picker, upload queue, attachment previews

**06e. Visibility Toggle:**
- Add `features/chat/components/visibility-selector.tsx` — Private/Public dropdown
- Add hook `use-chat-visibility.ts` in `features/chat/hooks/` — SWR optimistic + server action
- Update `features/chat/chat-header.tsx` — Wire visibility selector (desktop only)

**06f. Health Check:**
- `app/api/health/route.ts` — DB ping, cache ping, env var check

### Files Created/Modified (~18)

| Sub-Task | Files | Key Files |
|----------|-------|-----------|
| 06a Voting | 3+1 | vote.ts, vote.schema.ts, vote/route.ts, message-actions update |
| 06b Models | 3+1 | model-selector.tsx, catalog.ts, discovery.ts, multimodal-input update |
| 06c Settings | 1+1 | settings-panel.tsx, chat layout update |
| 06d Upload | 1+2 | upload/route.ts, preview-attachment.tsx, multimodal-input update |
| 06e Visibility | 2+1 | visibility-selector.tsx, use-chat-visibility.ts, chat-header update |
| 06f Health | 1 | health/route.ts |

### Exit Criteria

- [ ] **Voting**: Thumbs up/down on assistant messages works, optimistic SWR update, persisted to DB
- [ ] **Voting**: Guest cannot vote (returns 403)
- [ ] **Models**: Model dropdown shows grouped, searchable models
- [ ] **Models**: Selection persists to cookie + localStorage
- [ ] **Models**: Different models produce different responses
- [ ] **Settings**: Temperature, topP, maxOutputTokens affect AI output
- [ ] **Settings**: Custom system prompt injected into AI context
- [ ] **Settings**: Enable reasoning toggle works on supported models
- [ ] **Upload**: File picker opens, file uploads to Vercel Blob
- [ ] **Upload**: Attachment preview shows before send
- [ ] **Upload**: Attachments sent as message parts
- [ ] **Visibility**: Toggle between public/private with optimistic update
- [ ] **Visibility**: Rollback on failure with toast
- [ ] **Health**: GET /api/health returns status with DB + cache latency
- [ ] All features work together without conflicts
- [ ] `pnpm typecheck` and `pnpm lint` pass

### Seams Addressed
- **SEAM-016**: Model catalog → selector → chat
- **SEAM-017**: AI provider registry (fully wired with all providers)
- **SEAM-018**: Vote mutation (optimistic + server + DB)
- **SEAM-019**: File upload → message attachment
- **SEAM-022**: Visibility toggle (optimistic + server action)
- **SEAM-036**: Rate limiting pipeline (all per-route limiters active)

---

## Phase 07 — Polish Vertical

### Entry State
All features working. Auth, chat, artifacts, sidebar, voting, models, settings, upload, visibility, health.

### Objective
Production-readiness: error boundaries, loading states, accessibility, responsive design, performance. After this phase, the app is deployable.

### Scope

**Error boundaries:**
- Finalize `app/global-error.tsx` — Standalone HTML wrapper
- Finalize `app/(chat)/error.tsx` — Preserves sidebar, retry + home buttons
- Finalize `features/artifacts/components/artifact-error-boundary.tsx` — Prevents editor crash propagation

**Loading states:**
- Finalize `app/(chat)/loading.tsx` — Full-viewport centered spinner
- Finalize `features/sidebar/components/sidebar-skeleton.tsx` — Animated sidebar placeholders
- `components/app-shell.tsx` — AppShellFallback (full-viewport spinner)

**Accessibility:**
- ARIA labels on all interactive elements
- Focus management for modal dialogs (artifact panel, settings sheet)
- Keyboard navigation for sidebar, message actions, model selector
- Screen reader support for streaming messages
- Color contrast verification
- `maximumScale: 1` in viewport (prevents mobile Safari zoom)

**Responsive design:**
- Mobile: full-screen artifact panel (no message sidebar)
- Mobile: sidebar as sheet overlay
- Mobile: compact model selector
- Tablet: adaptive layout breakpoints
- Touch-friendly interaction targets (44px minimum)

**Performance:**
- Verify lazy loading: CodeMirror, react-data-grid, Pyodide, ai-elements heavy components
- Verify adaptive throttle for streaming (50/100/150ms by connection)
- Verify SWR dedup and stale-while-revalidate
- Bundle analysis (ensure no large dependencies in critical path)

**Pyodide integration:**
- `<Script src="pyodide.js" strategy="lazyOnload" />` in ChatLayoutClient
- Module cache for CodeMirror (prevent re-initialization)

**Final CI/CD:**
- Import boundary check script (~50 lines, validates layer rules)
- `pnpm build` succeeds
- E2E test suite completion

### Files Created/Modified (~10)

| Area | Count | Key Files |
|------|-------|-----------|
| Error boundaries | 3 | global-error, chat error, artifact error boundary |
| Loading states | 3 | loading.tsx, sidebar-skeleton, app-shell fallback |
| Tests | 4 | E2E specs (chat, artifacts, auth, sidebar) |

### Exit Criteria

- [ ] Error boundary catches and displays errors at all 3 levels
- [ ] Loading states render for all route transitions
- [ ] Sidebar skeleton shows during initial load
- [ ] App is usable on mobile (320px width)
- [ ] Artifact panel is full-screen on mobile
- [ ] All interactive elements have ARIA labels
- [ ] Keyboard navigation works throughout
- [ ] `pnpm build` succeeds with zero errors
- [ ] E2E tests pass for all core flows
- [ ] No console errors in production build
- [ ] Import boundary script passes
- [ ] Bundle size is reasonable (no unexpected large deps)
- [ ] Core Web Vitals are acceptable

### Seams Addressed
- **SEAM-027**: Error boundaries (all 3 levels)
- **SEAM-030**: Theme system (fully polished)
- **SEAM-037**: Pyodide script loading (finalized)
