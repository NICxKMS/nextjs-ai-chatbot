> **Updated per redesign audit (2026-03-01)**

# Directory Structure

> The complete file tree for the rebuilt project. This is the authoritative blueprint.
> Every file listed here will exist. No `src/` directory. Feature collocation is the
> organizing principle. "artifact" naming throughout. `proxy.ts` (NOT middleware.ts).

---

## Root

```
nextjs-ai-chatbot/
├── app/                              # Next.js App Router — routing shell ONLY
├── features/                         # Feature modules — THE organizing principle
├── components/                       # Truly shared UI ONLY
├── lib/                              # Cross-cutting infrastructure
├── tests/                            # Integration + E2E tests
├── public/                           # Static assets
├── scripts/                          # CI/build scripts
├── oldapp/                           # Legacy app (read-only reference, removed post-rebuild)
├── plan/                             # Planning documents (this repo)
│
├── proxy.ts                          # Next.js 16 proxy (auth guard, guest token rotation)
├── instrumentation.ts                # Server-side OpenTelemetry setup
├── instrumentation-client.ts         # Client-side instrumentation
│
├── next.config.ts                    # Next.js config (cacheComponents: true, etc.)
├── tsconfig.json                     # TypeScript strict mode
├── biome.json                        # Biome formatter + linter
├── postcss.config.mjs                # PostCSS → Tailwind v4
├── package.json                      # Dependencies + scripts
├── pnpm-lock.yaml                    # Lockfile
├── vercel.json                       # Vercel deployment config
├── .env.example                      # Environment variable template
├── .gitignore
├── LICENSE
└── AGENTS.md                         # AI coding agent instructions
```

---

## `proxy.ts` — Next.js 16 Proxy (NOT middleware.ts)

```
proxy.ts                              # Auth guard, guest token rotation, rate-limit header check
```

> Next.js 16 renamed `middleware.js` to `proxy.js`. Exports `proxy()` function + `config.matcher`.
> Runs on the edge. No DB queries. Cookie-based auth check + guest token refresh.

---

## `app/` — Next.js App Router

Routes only. No business logic. Pages import from `features/` and `components/`.

```
app/
├── layout.tsx                        # Root layout (SERVER): html/body, ThemeProvider, SessionProvider
├── globals.css                       # Tailwind v4 imports + CSS custom properties
├── global-error.tsx                  # Root error boundary (standalone html/body)
│
├── (auth)/
│   ├── layout.tsx                    # Auth layout (SERVER): centered card container
│   ├── error.tsx                     # Auth route error boundary
│   ├── login/
│   │   └── page.tsx                  # Login page (SERVER) → renders AuthForm
│   └── register/
│       └── page.tsx                  # Register page (SERVER) → renders AuthForm
│
├── (chat)/
│   ├── layout.tsx                    # Chat layout (SERVER): sidebar + PendingChatsProvider
│   ├── loading.tsx                   # Loading skeleton while chat data loads (SERVER) (post-redesign addition: route-level loading state)
│   ├── error.tsx                     # Chat route error boundary
│   ├── page.tsx                      # New chat page (SERVER): generates UUID, renders ChatShell
│   └── chat/
│       └── [id]/
│           └── page.tsx              # Existing chat (SERVER): fetches chat+votes, renders ChatShell
│
└── api/
    ├── chat/
    │   └── route.ts                  # POST: AI chat streaming (SSE via createUIMessageStream)
    ├── artifact/
    │   └── route.ts                  # GET: artifact versions, POST: save/restore artifact version
    ├── files/
    │   └── upload/
    │       └── route.ts              # POST: file upload (Vercel Blob)
    ├── history/
    │   └── route.ts                  # GET: paginated chat history (cursor-based)
    ├── suggestions/
    │   └── route.ts                  # GET: suggestions for artifact
    └── health/
        └── route.ts                  # GET: system health check (DB + Redis ping)
```

**Key change from old plan:** No `chat-layout-client.tsx` — the chat layout is a SERVER component
with client islands. No `/api/vote` route (voting uses Server Actions). No `/api/auth/*` routes
(auth uses Server Actions + `proxy.ts` for guards).

---

## `features/` — Feature Modules

Each feature is self-contained: actions, components, hooks, schemas, types, lib.

### `features/chat/`

```
features/chat/
├── components/
│   ├── chat-shell.tsx                # Thin orchestrator (~60 lines, 'use client'), creates ChatSessionContext
│   ├── chat-header.tsx               # Header: model selector, sidebar toggle, share ('use client')
│   ├── messages.tsx                  # Virtualized message list + auto-scroll ('use client')
│   ├── message.tsx                   # Single message renderer (user/assistant) ('use client')
│   ├── message-actions.tsx           # Copy, edit, delete buttons ('use client')
│   ├── message-editor.tsx            # Inline message editing textarea ('use client')
│   ├── message-reasoning.tsx         # Collapsible reasoning/thinking display ('use client')
│   ├── multimodal-input.tsx          # Text + file input + send/stop ('use client')
│   ├── submit-button.tsx             # Send or stop button with loading state ('use client')
│   ├── preview-attachment.tsx        # File upload thumbnail preview ('use client')
│   ├── suggested-actions.tsx         # Clickable prompt suggestion buttons ('use client')
│   ├── greeting.tsx                  # Empty state welcome message (SERVER or 'use client')
│   ├── stream-bridge.tsx             # Null-render bridge: stream → artifactStore (~20 lines)
│   ├── chat-stream-provider.tsx      # Split state/dispatch contexts with RAF batching
│   └── notice-handler.tsx            # URL ?notice toast, renders null (~15 lines, 'use client')
├── hooks/
│   ├── use-chat-session.ts           # useChat config + callbacks (~120 lines)
│   ├── use-chat-side-effects.ts      # Navigation effects (URL update, abort, cleanup ~40 lines)
│   ├── use-chat-session-context.ts   # ChatSessionContext definition + useContext wrapper
│   └── use-scroll-to-bottom.ts       # Auto-scroll with manual override detection
├── actions/
│   ├── delete-chat.ts                # Server Action: delete single chat + updateTag
│   ├── delete-all-chats.ts           # Server Action: delete all user chats + updateTag
│   └── delete-trailing-messages.ts   # Server Action: delete messages after edit point + updateTag
├── lib/
│   ├── chat-callbacks.ts             # Pure functions: onData, onError, onFinish handlers
│   ├── process-stream-deltas.ts      # Pure function: delta → artifact state update (testable)
│   └── tools/
│       ├── create-artifact.ts        # createArtifact tool definition (uses handler registry)
│       ├── update-artifact.ts        # updateArtifact tool definition (uses handler registry)
│       ├── request-suggestions.ts    # requestSuggestions tool (streamObject → suggestions)
│       └── weather.ts                # getWeather tool (Open-Meteo API, self-contained)
├── schemas/
│   └── chat.schema.ts               # Chat request body validation (Zod)
└── types/
    └── chat.types.ts                 # ChatSessionValue, ArtifactDataPart, DataPart, ChatStatus
```

**Key changes from old plan:**
- `chat.tsx` (God Component) → `chat-shell.tsx` (~60 lines, thin orchestrator)
- `data-stream-handler.tsx` → `stream-bridge.tsx` (StreamBridge, null-render ~20 lines)
- `data-stream-provider.tsx` → `chat-stream-provider.tsx` (ChatStreamProvider, split contexts)
- `use-messages.ts` → `use-chat-session-context.ts` (ChatSessionContext + `useChatSessionContext()`)
- `create-document.ts` → `create-artifact.ts` (createArtifact tool)
- `update-document.ts` → `update-artifact.ts` (updateArtifact tool)
- `suggestions.ts` → `request-suggestions.ts`
- New: `chat-callbacks.ts`, `process-stream-deltas.ts` (pure, testable functions)
- New: `use-chat-session.ts` (useChat config extracted from God Component)
- New: `use-chat-side-effects.ts` (navigation effects extracted)
- New: `submit-button.tsx`, `notice-handler.tsx`
- Removed: `weather.tsx` from chat (moved to shared `components/weather.tsx`)
- Removed: `prompts.ts`, `completion.ts` from chat/lib (moved to `lib/ai/`)

### `features/artifacts/`

```
features/artifacts/
├── components/
│   ├── artifact-panel.tsx            # Main artifact side panel container ('use client')
│   ├── artifact-actions.tsx          # Toolbar: copy, run, diff, undo/redo ('use client')
│   ├── artifact-close-button.tsx     # Close button (useArtifactSelector for isVisible) ('use client')
│   ├── artifact-preview.tsx          # Inline artifact preview in messages ('use client')
│   ├── artifact-error-boundary.tsx   # Error boundary for editor crashes ('use client')
│   ├── version-footer.tsx            # Version navigation prev/next ('use client')
│   └── editors/
│       ├── text-editor.tsx           # Tiptap rich-text editor + suggestions extension ('use client')
│       ├── code-editor.tsx           # CodeMirror Python editor + Pyodide execution ('use client')
│       ├── sheet-editor.tsx          # react-data-grid spreadsheet + PapaParse CSV ('use client')
│       └── image-editor.tsx          # Image display (base64/URL) ('use client')
├── handlers/
│   ├── index.ts                      # Side-effect: registers all handlers into lib/ai/ registry
│   ├── text-handler.ts              # streamText → artifact-textDelta (APPEND)
│   ├── code-handler.ts              # streamObject → artifact-codeDelta (REPLACE)
│   ├── sheet-handler.ts             # streamObject → artifact-sheetDelta (REPLACE)
│   └── image-handler.ts             # Image handling (Pyodide-only, no server generation)
├── hooks/
│   ├── use-artifact.ts               # DEPRECATED alias → re-exports from lib/artifact-store
│   └── use-artifact-selector.ts      # DEPRECATED alias → re-exports from lib/artifact-store
├── lib/
│   └── artifact-store.ts            # useSyncExternalStore store (getSnapshot, subscribe, setState)
├── schemas/
│   └── artifact.schema.ts           # Artifact validation schemas (Zod)
└── types/
    └── artifact.types.ts            # UIArtifact, ArtifactKind, ArtifactStatus
```

**Key changes from old plan:**
- `handlers/base.ts` → `handlers/index.ts` (side-effect registration, no base class)
- Handler filenames: `text.ts` → `text-handler.ts`, etc.
- `use-artifact.ts` now uses `useSyncExternalStore` (NOT SWR synthetic key)
- New: `artifact-store.ts` under `lib/` (useSyncExternalStore store)
- `document-preview.tsx` → `artifact-preview.tsx`
- `artifact-close.tsx` → `artifact-close-button.tsx`
- Removed: `artifact-messages.tsx`, `create-artifact.tsx`, `toolbar.tsx`, `diffview.tsx`, `console.tsx`
- Removed: `actions/` directory (artifact creation/update handled via chat tools + handler registry)

### `features/auth/`

```
features/auth/
├── components/
│   ├── auth-form.tsx                 # Consolidated login/register form (mode prop, 'use client')
│   └── session-provider.tsx          # Session context provider + auth state sync ('use client')
├── actions/
│   ├── login.ts                      # Server Action: email/password login → cookie set → redirect
│   ├── register.ts                   # Server Action: registration → cookie set → redirect
│   ├── logout.ts                     # Server Action: cookie delete → redirect to /login
├── lib/
│   └── guest.ts                      # Guest bootstrap: JWT creation, token rotation
├── schemas/
│   └── auth.schema.ts               # Login/register input validation (Zod)
└── types/
    └── auth.types.ts                 # AppSession, User, GuestToken
```

**Key changes from old plan:**
- `auth-provider.tsx` → `session-provider.tsx` (SessionProvider, not AuthProvider)
- `/api/auth/*` REST routes removed — auth mutations use Server Actions (`login`, `register`, `logout`)
- Session management lives in `lib/auth/session.ts` (shared infrastructure, not feature-scoped)
- New: `guest.ts`, `auth.types.ts`
- Auth routes (`/api/auth/*`) removed — Server Actions handle all auth mutations

### `features/sidebar/`

```
features/sidebar/
├── components/
│   ├── sidebar-shell.tsx             # SERVER (async): fetches history via 'use cache', renders structure
│   ├── sidebar-history-client.tsx    # 'use client': SWR infinite pagination + optimistic merge
│   ├── sidebar-history-item.tsx      # 'use client': single chat item (link + rename + delete dropdown)
│   ├── sidebar-user-nav.tsx          # 'use client': user avatar, theme toggle, logout
│   └── sidebar-skeleton.tsx          # SERVER: loading skeleton for SSR/PPR fallback
├── hooks/
│   ├── use-pending-chats.ts          # PendingChatsProvider context + operations (add, remove, updateTitle)
│   └── use-sidebar-history.ts        # useSWRInfinite wrapper for paginated history
├── actions/
│   └── rename-chat.ts               # Server Action: rename chat title + updateTag
└── types/
    └── sidebar.types.ts              # SidebarHistoryItem, PendingChat
```

**Key changes from old plan:**
- `app-sidebar.tsx` → `sidebar-shell.tsx` (SERVER component with `'use cache'`)
- `sidebar-history.tsx` → `sidebar-history-client.tsx` (explicit client marker)
- `use-optimistic-chats.ts` → `use-pending-chats.ts` (PendingChatsProvider)
- New: `use-sidebar-history.ts`, `rename-chat.ts`, `sidebar.types.ts`
- Title sync: single channel via `chat-title` stream → `PendingChats.updateTitle()` (no polling, no window events)

### `features/voting/`

```
features/voting/
├── components/
│   ├── vote-buttons.tsx              # Upvote/downvote with useOptimistic ('use client')
│   └── vote-resolver.tsx             # (post-redesign addition) Resolves deferred vote promises via React 19 use() ('use client')
├── hooks/
│   └── use-votes.ts                  # Votes state (server-seeded + optimistic)
├── actions/
│   └── vote.ts                       # Server Action: upsert vote + updateTag('votes:{chatId}')
└── types/
    └── vote.types.ts                 # Vote type
```

**Key changes from old plan:**
- Voting uses Server Actions + `useOptimistic` (NOT PATCH `/api/vote` route)
- No `vote.schema.ts` — validation in action
- New: `vote-buttons.tsx`, `use-votes.ts`, `vote.types.ts`

### `features/models/`

```
features/models/
├── components/
│   └── model-selector.tsx            # Model dropdown grouped by provider ('use client')
├── lib/
│   └── models.ts                     # Model catalog: listChatModels() with 'use cache' + cacheTag
└── types/
    └── model.types.ts                # ModelMetadata, grouped model types
```

**Key changes from old plan:**
- `catalog.ts` + `discovery.ts` → `models.ts` (single file with `'use cache'`)
- New: `model.types.ts`

### `features/visibility/`

```
features/visibility/
├── components/
│   └── visibility-selector.tsx       # Public/private toggle dropdown ('use client')
├── actions/
│   └── update-visibility.ts          # Server Action: update chat visibility + updateTag
└── types/
    └── visibility.types.ts           # VisibilityType
```

**Key change from old plan:** Visibility is its own feature module (was inside chat).

### `features/settings/`

```
features/settings/
├── components/
│   └── settings-panel.tsx            # Settings sheet: temperature, topP, system prompt ('use client')
├── hooks/
│   └── use-settings.ts              # useSyncExternalStore + localStorage pub/sub
└── types/
    └── settings.types.ts             # SettingsState
```

**Key changes from old plan:**
- No SettingsProvider — `useSyncExternalStore` needs no provider
- `lib/defaults.ts` + `lib/types.ts` → `types/settings.types.ts` (consolidated)

---

## `components/` — Truly Shared UI

Only components used by 2+ features or genuinely app-wide.

```
components/
├── ai-elements/                       # Optional legacy reference primitives from oldapp (NOT redesign-required baseline)
│   ├── artifact.tsx                   # (128 LOC) Artifact compound component
│   ├── canvas.tsx                     # (20 LOC) Graph canvas
│   ├── chain-of-thought.tsx           # (211 LOC) CoT display
│   ├── checkpoint.tsx                 # (64 LOC) Progress indicators
│   ├── code-block.tsx                 # (182 LOC) Syntax-highlighted code
│   ├── confirmation.tsx               # (158 LOC) Tool confirmation dialog
│   ├── connection.tsx                 # (26 LOC) Graph connections
│   ├── context.tsx                    # (379 LOC) Token usage display
│   ├── controls.tsx                   # (15 LOC) Graph controls
│   ├── conversation.tsx               # (92 LOC) Conversation wrapper
│   ├── edge.tsx                       # (132 LOC) Graph edges
│   ├── image.tsx                      # (107 LOC) Image file rendering
│   ├── inline-citation.tsx            # (258 LOC) Citation display
│   ├── lazy.tsx                       # (100 LOC) Lazy-loaded heavy components
│   ├── loader.tsx                     # (92 LOC) Loading spinner
│   ├── message.tsx                    # (394 LOC) Message compound component
│   ├── model-selector.tsx             # (177 LOC) Model selector primitive
│   ├── node.tsx                       # (60 LOC) Graph nodes
│   ├── open-in-chat.tsx               # (339 LOC) Open-in external tools
│   ├── panel.tsx                      # (13 LOC) Graph panel
│   ├── plan.tsx                       # (120 LOC) Plan/step display
│   ├── prompt-input.tsx               # (1275 LOC) Rich prompt input
│   ├── queue.tsx                      # (245 LOC) Task queue display
│   ├── reasoning.tsx                  # (183 LOC) Reasoning display
│   ├── shimmer.tsx                    # (58 LOC) Streaming text shimmer
│   ├── sources.tsx                    # (68 LOC) Source citations
│   ├── suggestion.tsx                 # (56 LOC) Suggestion pills
│   ├── task.tsx                       # (80 LOC) Task/progress display
│   ├── tool.tsx                       # (156 LOC) Tool invocation display
│   ├── toolbar.tsx                    # (14 LOC) Graph toolbar
│   └── web-preview.tsx                # (243 LOC) Web preview iframe
│
├── ui/                                # shadcn/ui base components
│   ├── alert.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── button-group.tsx
│   ├── card.tsx
│   ├── carousel.tsx
│   ├── checkbox.tsx
│   ├── collapsible.tsx
│   ├── command.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── hover-card.tsx
│   ├── input.tsx
│   ├── input-group.tsx
│   ├── label.tsx
│   ├── popover.tsx
│   ├── progress.tsx
│   ├── scroll-area.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── sidebar.tsx                    # Layout sidebar primitives (SidebarProvider, SidebarInset, etc.)
│   ├── skeleton.tsx
│   ├── slider.tsx
│   ├── switch.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   ├── toggle.tsx
│   ├── toggle-group.tsx
│   ├── tooltip.tsx
│   └── visually-hidden.tsx
│
├── theme-provider.tsx                 # next-themes wrapper (attribute="class", system)
├── sidebar-toggle.tsx                 # Sidebar open/close button (used by chat + sidebar)
├── icons.tsx                          # Shared icon components (Lucide + custom)
├── weather.tsx                        # Weather tool result renderer (shared between chat + AI)
└── toaster.tsx                        # Toast notification container (Sonner)
```

**Key changes from old plan:**
- Removed `app-shell.tsx` (no monolithic provider tree — server layout composes providers)
- New: `weather.tsx` (moved from chat to shared), `toaster.tsx`

---

## `lib/` — Cross-Cutting Infrastructure

Shared by all features. No feature-specific logic. Leaf layer — imports from nothing above.

```
lib/
├── ai/
│   ├── registry.ts                   # createProviderRegistry (conditional: google, openai, openrouter — NO vercel-gateway)
│   ├── provider.ts                   # myProvider: customProvider with reasoning middleware
│   ├── models.ts                     # listChatModels() with 'use cache' + dynamic discovery
│   ├── prompts.ts                    # composeSystemPrompt() with conditional composition
│   ├── provider-options.ts           # getProviderOptions() per-provider config (temperature, reasoning)
│   ├── artifact-handlers.ts          # Handler registry: registerArtifactHandler/getArtifactHandler
│   ├── tools.ts                      # getEnabledTools() model-based tool gating
│   └── title.ts                      # generateTitle() for chat title generation
│
├── auth/
│   └── session.ts                    # getAppSession() infrastructure (cookies → session resolution)
│
├── cache/
│   ├── client.ts                     # Upstash Redis client (globalThis singleton, edge-compatible)
│   ├── keys.ts                       # Cache key factory: cacheKeys.chat(id), cacheKeys.artifact(id), etc.
│   ├── revalidate.ts                # updateTag/revalidateTag utilities (invalidateChat, refreshChat, etc.)
│   └── with-cache.ts                # withCache<T>(key, ttl, fetcher) cache-through helper
│
├── data/
│   ├── chat.ts                       # Chat CRUD: getChatById, getChatsByUserId, createChat, etc.
│   ├── artifact.ts                   # Artifact CRUD: getArtifactById, saveArtifactVersion (NOT document.ts)
│   ├── message.ts                    # Message CRUD: saveMessages, deleteTrailingMessages
│   ├── vote.ts                       # Vote CRUD: getVotesByChatId, upsertVote
│   ├── suggestion.ts                # Suggestion CRUD: getSuggestionsByArtifactId, saveSuggestions
│   └── user.ts                       # User CRUD: getUserByEmail, createUser
│
├── db/
│   ├── client.ts                     # Drizzle client (postgres driver, globalThis singleton)
│   ├── schema.ts                     # Drizzle schema: User, Chat, Message, Vote, Artifact, Suggestion (NOT Document)
│   └── migrations/                   # Drizzle migration files (generated)
│       └── ...
│
├── errors/
│   ├── app-error.ts                  # AppError class with static factories + toResponse()
│   └── codes.ts                      # Error code registry (NO activate_gateway, NO credit codes)
│
├── types/
│   ├── api.types.ts                  # (post-redesign addition) PaginatedResult<T>, PaginationParams, ErrorResponse, HealthResponse
│   ├── artifact.types.ts             # UIArtifact, ArtifactKind (canonical shared artifact types)
│   ├── artifact-handler.types.ts     # ArtifactHandler, ArtifactStreamWriter, Create/UpdateArtifactParams
│   ├── pending-chats.types.ts        # PendingChat, PendingChatOperations
│   ├── data-context.types.ts         # DataContext (userId, isGuest)
│   ├── model.types.ts                # ModelMetadata, DEFAULT_CHAT_MODEL, TITLE_MODEL, ARTIFACT_MODEL
│   ├── settings.types.ts             # SettingsState type
│   └── result.types.ts              # ActionResult<T> for Server Actions
│
├── utils/
│   ├── cn.ts                         # clsx + twMerge utility
│   ├── format.ts                     # Date/string formatting utilities
│   └── generate-uuid.ts             # UUID generation utility
│
└── hooks/
    ├── use-mobile.ts                 # Media query: max-width 768px
    └── use-debounce.ts               # Debounced value hook
```

**Key changes from old plan:**
- `lib/data/document.ts` → `lib/data/artifact.ts` (artifact naming)
- New: `lib/ai/artifact-handlers.ts` (handler registry, dependency inversion)
- New: `lib/ai/prompts.ts`, `lib/ai/tools.ts`, `lib/ai/title.ts`, `lib/ai/provider-options.ts`
- New: `lib/cache/revalidate.ts` (updateTag/revalidateTag utilities)
- New: `lib/types/artifact-handler.types.ts`, `lib/types/pending-chats.types.ts`, `lib/types/result.types.ts`
- Removed: `lib/api/` (guards, validation, response — moved to features or simplified)
- Removed: `lib/rate-limit/` (rate limiting handled in proxy.ts + route handlers directly)
- Removed: `lib/data/context.ts` (DataContext simplified to `lib/types/data-context.types.ts`)
- Removed: barrel `index.ts` files (direct imports instead — no mandatory barrel files)
- `lib/ai/providers.ts` → `lib/ai/provider.ts`
- `lib/ai/model-discovery.ts` → merged into `lib/ai/models.ts`
- `lib/auth/config.ts` → `lib/auth/session.ts`

---

## `tests/` — Test Infrastructure

```
tests/
├── setup.ts                          # Vitest global setup (env, mocks, cleanup)
├── mocks/
│   ├── auth.ts                       # mockSession(), mockGuestSession(), mockNoSession()
│   ├── db.ts                         # createTestDb() — Drizzle mock
│   ├── cache.ts                      # createTestCache() — Redis mock
│   ├── ai.ts                         # AI SDK mock (streamText, generateText)
│   └── fetch.ts                      # Global fetch mock
├── fixtures/
│   ├── chat.ts                       # Chat factory (valid chat objects)
│   ├── message.ts                    # Message factory
│   ├── artifact.ts                   # Artifact factory with versions (NOT document.ts)
│   ├── user.ts                       # User factory (auth + guest)
│   └── vote.ts                       # Vote factory
├── utils/
│   └── stream.ts                     # collectStreamEvents() — SSE test utility
├── integration/
│   ├── chat-flow.test.ts             # Chat send → stream → save lifecycle
│   ├── artifact-flow.test.ts         # Tool call → handler → stream → state
│   ├── auth-flow.test.ts             # Login → session → cookie
│   └── sidebar-flow.test.ts          # History load → pagination → delete
└── e2e/
    ├── chat.spec.ts                  # Full chat E2E (send, receive, history)
    ├── artifacts.spec.ts             # Artifact creation/editing E2E
    ├── auth.spec.ts                  # Login/register/guest E2E
    └── sidebar.spec.ts               # Sidebar navigation E2E
```

**Key changes from old plan:**
- `fixtures/document.ts` → `fixtures/artifact.ts`
- New: `fixtures/vote.ts`, `utils/stream.ts`
- New: `mocks/ai.ts`, `mocks/fetch.ts`

---

## `scripts/` — CI/Build Scripts

```
scripts/
└── check-imports.mjs                 # Import boundary enforcement (runs in pnpm lint)
```

---

## `public/` — Static Assets

```
public/
├── favicon.ico                       # Favicon
└── images/                           # Static images
    └── ...                           # Logo, OG images, etc.
```

---

## File Count Summary

| Directory | Files | Purpose |
|-----------|-------|---------|
| **Root config** | 14 | proxy.ts, next.config.ts, tsconfig, biome, package.json, etc. |
| **app/** | 16 | Routes, layouts, API handlers, error/loading boundaries |
| **features/chat/** | 21 | Chat session: components, hooks, actions, tools, schemas, types |
| **features/artifacts/** | 17 | Artifact panel: components, editors, handlers, store, schemas, types |
| **features/auth/** | 9 | Authentication: form, providers, actions, session, schemas, types |
| **features/sidebar/** | 10 | Sidebar history: components, hooks, actions, types |
| **features/voting/** | 6 | Message voting: components, hook, action, type |
| **features/models/** | 4 | Model selection: component, catalog, types |
| **features/visibility/** | 4 | Visibility toggle: component, action, types |
| **features/settings/** | 4 | User settings: component, hook, types |
| **components/ai-elements/** | optional | Legacy reference primitives (excluded from redesign baseline) |
| **components/ui/** | 32 | shadcn/ui base components |
| **components/** (root) | 5 | Theme, icons, sidebar toggle, weather, toaster |
| **lib/ai/** | 8 | AI registry, provider, models, prompts, handlers, tools, title |
| **lib/auth/** | 1 | Session infrastructure |
| **lib/cache/** | 4 | Redis client, keys, revalidation, cache-through |
| **lib/data/** | 6 | Data access: chat, artifact, message, vote, suggestion, user |
| **lib/db/** | 2+ | Drizzle client, schema, migrations |
| **lib/errors/** | 2 | AppError class, error codes |
| **lib/types/** | 8 | Shared type contracts (cross-feature) |
| **lib/utils/** | 3 | cn, format, generate-uuid |
| **lib/hooks/** | 2 | Truly generic hooks |
| **tests/** | 16 | Mocks, fixtures, utils, integration, E2E |
| **scripts/** | 1 | Import boundary enforcement |
| **public/** | 1+ | Static assets |
| **Total** | **~212** | |
