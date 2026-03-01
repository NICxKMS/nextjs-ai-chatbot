# Directory Structure

> Complete file tree for the rebuilt Next.js 16 AI chatbot.
> Every file listed. "artifact" naming throughout. No `src/` directory.
> Feature collocation is the organizing principle.
> Addresses: CRITICAL-1, CRITICAL-2, VIII-1, VIII-2, VIII-4, VIII-8, all redesign specs.

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
├── .gitignore                        # Git ignore
├── LICENSE                           # License file
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
    │   └── route.ts                  # POST: save artifact version (user edits)
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
│   ├── stream-bridge.tsx       # Null-render bridge: stream → artifactStore (~20 lines)
│   ├── chat-stream-provider.tsx      # Split state/dispatch contexts with RAF batching
│   └── notice-handler.tsx            # URL ?notice toast, renders null (~15 lines, 'use client')
├── hooks/
│   ├── use-chat-session.ts           # useChat config + callbacks (~120 lines)
│   ├── use-chat-side-effects.ts      # Navigation effects (URL update, abort, cleanup ~40 lines)
│   ├── use-chat-session-context.ts           # ChatSessionContext definition + useContext wrapper
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

### `features/auth/`

```
features/auth/
├── components/
│   ├── auth-form.tsx                 # Consolidated login/register form (mode prop, 'use client')
│   └── session-provider.tsx             # Session context provider + guest bootstrap ('use client')
├── actions/
│   ├── login.ts                      # Server Action: email/password login → cookie set → redirect
│   ├── register.ts                   # Server Action: registration → cookie set → redirect
│   └── logout.ts                     # Server Action: cookie delete → redirect to /login
├── lib/
│   ├── session.ts                    # getAppSession(): resolve session from cookies (server-only)
│   └── guest.ts                      # Guest bootstrap: JWT creation, token rotation
├── schemas/
│   └── auth.schema.ts               # Login/register input validation (Zod)
└── types/
    └── auth.types.ts                 # AppSession, User, GuestToken
```

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
│   ├── use-pending-chats.ts       # PendingChatsProvider context + operations (add, remove, updateTitle)
│   └── use-sidebar-history.ts        # useSWRInfinite wrapper for paginated history
├── actions/
│   └── rename-chat.ts               # Server Action: rename chat title + updateTag
└── types/
    └── sidebar.types.ts              # SidebarHistoryItem, PendingChat
```

### `features/voting/`

```
features/voting/
├── components/
│   └── vote-buttons.tsx              # Upvote/downvote with useOptimistic ('use client')
├── hooks/
│   └── use-votes.ts                  # Votes state (server-seeded + optimistic)
├── actions/
│   └── vote.ts                       # Server Action: upsert vote + updateTag('votes:{chatId}')
└── types/
    └── vote.types.ts                 # Vote type
```

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

### `features/settings/`

```
features/settings/
├── components/
│   └── settings-panel.tsx            # Settings sheet: temperature, topP, system prompt ('use client')
├── hooks/
│   └── use-settings.ts              # useSyncExternalStore + localStorage pub/sub
└── types/
    └── settings.types.ts             # UserSettings, SettingsState
```

---

## `components/` — Truly Shared UI

Only components used by 2+ features or genuinely app-wide.

```
components/
├── ui/                               # shadcn/ui base components
│   ├── alert.tsx                     # Alert component
│   ├── avatar.tsx                    # Avatar component
│   ├── badge.tsx                     # Badge component
│   ├── button.tsx                    # Button component
│   ├── button-group.tsx              # Button group component
│   ├── card.tsx                      # Card component
│   ├── carousel.tsx                  # Carousel component
│   ├── checkbox.tsx                  # Checkbox component
│   ├── collapsible.tsx               # Collapsible component
│   ├── command.tsx                   # Command palette component
│   ├── dialog.tsx                    # Dialog/modal component
│   ├── dropdown-menu.tsx             # Dropdown menu component
│   ├── hover-card.tsx                # Hover card component
│   ├── input.tsx                     # Text input component
│   ├── input-group.tsx               # Input group component
│   ├── label.tsx                     # Form label component
│   ├── popover.tsx                   # Popover component
│   ├── progress.tsx                  # Progress bar component
│   ├── scroll-area.tsx               # Scrollable area component
│   ├── select.tsx                    # Select dropdown component
│   ├── separator.tsx                 # Visual separator component
│   ├── sheet.tsx                     # Slide-over sheet component
│   ├── sidebar.tsx                   # Layout sidebar primitives (SidebarProvider, SidebarInset, etc.)
│   ├── skeleton.tsx                  # Loading skeleton component
│   ├── slider.tsx                    # Range slider component
│   ├── switch.tsx                    # Toggle switch component
│   ├── tabs.tsx                      # Tabs component
│   ├── textarea.tsx                  # Textarea component
│   ├── toggle.tsx                    # Toggle button component
│   ├── toggle-group.tsx              # Toggle group component
│   ├── tooltip.tsx                   # Tooltip component
│   └── visually-hidden.tsx           # Accessibility hidden component
│
├── theme-provider.tsx                # next-themes wrapper (attribute="class", system)
├── sidebar-toggle.tsx                # Sidebar open/close button (used by chat + sidebar)
├── icons.tsx                         # Shared icon components (Lucide + custom)
├── weather.tsx                       # Weather tool result renderer (shared between chat + AI)
└── toaster.tsx                       # Toast notification container (Sonner)
```

---

## `lib/` — Cross-Cutting Infrastructure

Shared by all features. No feature-specific logic. Leaf layer — imports from nothing above.

```
lib/
├── ai/
│   ├── registry.ts                   # createProviderRegistry (conditional: google, openai, openrouter)
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
│   ├── revalidate.ts                 # updateTag/revalidateTag utilities (invalidateChat, refreshChat, etc.)
│   └── with-cache.ts                 # withCache<T>(key, ttl, fetcher) cache-through helper
│
├── data/
│   ├── chat.ts                       # Chat CRUD: getChatById, getChatWithMessages, getChatsByUserId, createChat, updateChatTitle, deleteChat, deleteAllChats
│   ├── artifact.ts                   # Artifact CRUD: getArtifactById, getArtifactVersions, saveArtifactVersion (NOT document.ts)
│   ├── message.ts                    # Message CRUD: getMessagesByChatId, saveMessages, deleteTrailingMessages
│   ├── vote.ts                       # Vote CRUD: getVotesByChatId, upsertVote
│   ├── suggestion.ts                 # Suggestion CRUD: getSuggestionsByArtifactId, saveSuggestions
│   └── user.ts                       # User CRUD: getUserByEmail, createUser
│
├── db/
│   ├── client.ts                     # Drizzle client (postgres driver, globalThis singleton)
│   ├── schema.ts                     # Drizzle schema: User, Chat, Message, Vote, Artifact, Suggestion (NOT Document)
│   └── migrations/                   # Drizzle migration files (generated)
│       └── ...                       # Migration SQL files
│
├── errors/
│   ├── app-error.ts                  # AppError class with static factories + toResponse()
│   └── codes.ts                      # Error code registry (NO activate_gateway, NO credit codes)
│
├── types/
│   ├── artifact.types.ts             # UIArtifact, ArtifactKind (re-exported from features scope)
│   ├── artifact-handler.types.ts     # ArtifactHandler, ArtifactStreamWriter, Create/UpdateArtifactParams
│   ├── pending-chats.types.ts     # PendingChat, PendingChatOperations
│   ├── data-context.types.ts         # DataContext (userId, isGuest)
│   ├── model.types.ts                # ModelMetadata, DEFAULT_CHAT_MODEL, TITLE_MODEL, ARTIFACT_MODEL
│   ├── settings.types.ts             # UserSettings type
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

## Config Files (Root)

```
proxy.ts                              # Next.js 16 proxy (auth guard, rate limiting, guest token rotation)
instrumentation.ts                    # Server-side OpenTelemetry setup
instrumentation-client.ts             # Client-side instrumentation
next.config.ts                        # Next.js config (cacheComponents: true, experimental flags)
tsconfig.json                         # TypeScript strict mode, path aliases (@/* → ./*)
biome.json                            # Biome formatter + linter config
postcss.config.mjs                    # PostCSS → Tailwind v4
package.json                          # Dependencies + scripts
pnpm-lock.yaml                        # pnpm lockfile
vercel.json                           # Vercel deployment config
.env.example                          # Environment variable template
.gitignore                            # Git ignore rules
LICENSE                               # License file
AGENTS.md                             # AI coding agent instructions
```

---

## File Count Summary

| Directory | Files | Purpose |
|-----------|-------|---------|
| **Root config** | 14 | proxy.ts, next.config.ts, tsconfig, biome, package.json, etc. |
| **app/** | 15 | Routes, layouts, API handlers, error boundaries |
| **features/chat/** | 21 | Chat session: components, hooks, actions, tools, schemas, types |
| **features/artifacts/** | 17 | Artifact panel: components, editors, handlers, store, schemas, types |
| **features/auth/** | 9 | Authentication: form, providers, actions, session, schemas, types |
| **features/sidebar/** | 10 | Sidebar history: components, hooks, actions, types |
| **features/voting/** | 5 | Message voting: component, hook, action, type |
| **features/models/** | 4 | Model selection: component, catalog, types |
| **features/visibility/** | 4 | Visibility toggle: component, action, types |
| **features/settings/** | 4 | User settings: component, hook, types |
| **components/ui/** | 32 | shadcn/ui base components |
| **components/** (root) | 5 | Theme, icons, sidebar toggle, weather, toaster |
| **lib/ai/** | 8 | AI registry, provider, models, prompts, handlers, tools, title |
| **lib/auth/** | 1 | Session infrastructure |
| **lib/cache/** | 4 | Redis client, keys, revalidation, cache-through |
| **lib/data/** | 6 | Data access: chat, artifact, message, vote, suggestion, user |
| **lib/db/** | 2+ | Drizzle client, schema, migrations |
| **lib/errors/** | 2 | AppError class, error codes |
| **lib/types/** | 7 | Shared type contracts (cross-feature) |
| **lib/utils/** | 3 | cn, format, generate-uuid |
| **lib/hooks/** | 2 | Truly generic hooks |
| **tests/** | 16 | Mocks, fixtures, utils, integration, E2E |
| **scripts/** | 1 | Import boundary enforcement |
| **public/** | 1+ | Static assets |
| **Total** | **~193** | |

---

## Key Design Decisions

### proxy.ts NOT middleware.ts

Next.js 16 renamed `middleware.js` to `proxy.js`. The file exports a `proxy()` function and a `config` with `matcher`. Identical API, new name. All references use `proxy.ts`.

### "artifact" EVERYWHERE — No "document"

| Layer | Uses "artifact" |
|-------|----------------|
| Database table | `Artifact` (not `Document`) |
| Database enum | `artifact_kind` (not `document_kind`) |
| Data file | `lib/data/artifact.ts` (not `document.ts`) |
| Functions | `getArtifactById()`, `saveArtifactVersion()` |
| AI tools | `createArtifact`, `updateArtifact` |
| Tool files | `create-artifact.ts`, `update-artifact.ts` |
| Handler registry | `lib/ai/artifact-handlers.ts` |
| Handler interface | `ArtifactHandler` |
| Stream parts | `artifact-id`, `artifact-textDelta`, etc. |
| Components | `artifact-panel.tsx`, `artifact-preview.tsx` |
| Types | `ArtifactKind`, `UIArtifact`, `ArtifactStatus` |
| Cache keys | `artifact:{id}` |
| API route | `/api/artifact` |
| Test fixtures | `tests/fixtures/artifact.ts` |

### No Credit/Gateway Logic

These items are NOT present anywhere in the tree:

- No `vercel-gateway` provider
- No `activate_gateway` error code
- No credit depletion AlertDialog
- No `data-usage` stream part (credit display)
- No `AppUsage` type
- No `incrementQuota()` function
- No entitlements check in streaming
- No gateway-specific error handling

### No Barrel Files (Default)

No `index.ts` barrel files are used except:

| Exception | Reason |
|-----------|--------|
| `features/artifacts/handlers/index.ts` | Side-effect registration module (3+ handlers registered) |

All other imports use direct file paths. This prevents circular dependency issues, enables tree-shaking, and keeps import intent clear.

### Import Hierarchy

```
ALLOWED:
  app/           → features/*, components/*, lib/*
  features/*     → components/*, lib/*
  features/X     → lib/types/* (cross-feature type contracts ONLY)
  components/*   → lib/*
  lib/*          → (external packages only)

FORBIDDEN:
  lib/*          → components/*, features/*, app/*
  components/*   → features/*, app/*
  features/X     → features/Y/components/*, features/Y/hooks/*, features/Y/actions/*
  features/*     → app/*

ONE EXCEPTION:
  features/chat/components/stream-bridge.tsx → features/artifacts/lib/artifact-store.ts
  (artifact store is the declared public API of the artifacts feature for state updates)
```

Enforced by `scripts/check-imports.mjs` in `pnpm lint`.
