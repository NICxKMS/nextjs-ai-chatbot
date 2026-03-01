# Directory Structure

> The complete file tree for the rebuilt project. This is the authoritative blueprint.
> Every file listed here will exist. No `src/` directory. Feature collocation is the
> organizing principle.

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
├── oldapp/                           # Legacy app (read-only reference, removed post-rebuild)
├── plan/                             # Planning documents (this repo)
│
├── middleware.ts                      # Edge: rate limiting + auth guard
├── instrumentation.ts                # Server-side OpenTelemetry setup
├── instrumentation-client.ts         # Client-side instrumentation
│
├── next.config.ts                     # Next.js configuration
├── tsconfig.json                      # TypeScript strict mode
├── biome.json                         # Biome formatter + linter
├── postcss.config.mjs                 # PostCSS → Tailwind v4
├── package.json                       # Dependencies + scripts
├── pnpm-lock.yaml                     # Lockfile
├── vercel.json                        # Vercel deployment config
├── .env.example                       # Environment variable template
├── .gitignore
├── LICENSE
└── AGENTS.md                          # AI coding agent instructions
```

---

## `app/` — Next.js App Router

Routes only. No business logic. Pages import from `features/` and `components/`.

```
app/
├── layout.tsx                         # Root layout: fonts, meta, AppShell provider tree
├── globals.css                        # Tailwind v4 imports + CSS custom properties
├── global-error.tsx                   # Root error boundary (standalone html/body)
├── head.tsx                           # Metadata configuration
│
├── (auth)/
│   ├── layout.tsx                     # Auth layout (minimal, no sidebar)
│   ├── login/
│   │   └── page.tsx                   # Login page → imports AuthForm
│   └── register/
│       └── page.tsx                   # Register page → imports AuthForm
│
├── (chat)/
│   ├── layout.tsx                     # Chat layout (server): reads cookies, fetches session
│   ├── chat-layout-client.tsx         # Chat layout (client): provider stack, Pyodide script
│   ├── loading.tsx                    # Chat route loading spinner
│   ├── error.tsx                      # Chat route error boundary
│   ├── page.tsx                       # New chat page (/) → generates UUID, reads model cookie
│   └── chat/
│       └── [id]/
│           └── page.tsx               # Existing chat (/chat/[id]) → fetches chat+messages+votes
│
└── api/
    ├── chat/
    │   ├── route.ts                   # POST: streaming chat (SSE)
    │   └── [id]/
    │       ├── messages/
    │       │   └── route.ts           # GET: paginated messages
    │       └── reconnect/
    │           └── route.ts           # GET: SSE reconnect
    ├── artifact/
    │   └── route.ts                   # GET/POST/DELETE: document CRUD
    ├── files/
    │   └── upload/
    │       └── route.ts               # POST: file upload (Vercel Blob)
    ├── health/
    │   └── route.ts                   # GET: system health check
    ├── history/
    │   └── route.ts                   # GET/DELETE: chat history
    ├── suggestions/
    │   └── route.ts                   # GET: document suggestions
    ├── vote/
    │   └── route.ts                   # PATCH: message voting
    └── auth/
        ├── callback/
        │   └── route.ts               # GET: OAuth callback
        ├── guest/
        │   └── route.ts               # POST: guest JWT creation
        └── logout/
            └── route.ts               # POST: session termination
```

---

## `features/` — Feature Modules

Each feature is self-contained: actions, components, hooks, schemas, types, lib.

### `features/chat/`

```
features/chat/
├── actions/
│   ├── stream-chat.ts                 # Server: createUIMessageStream, executeChatCompletion
│   ├── save-message.ts                # Server: save user/assistant messages + quota
│   └── delete-trailing-messages.ts    # Server: delete messages after edit point
├── components/
│   ├── chat.tsx                       # Main chat component (useChat hook, orchestrator)
│   ├── chat-header.tsx                # Header: model display, visibility selector, sidebar toggle
│   ├── messages.tsx                   # Message list (Virtuoso), auto-scroll, thinking indicator
│   ├── message.tsx                    # Single message renderer (user/assistant/system)
│   ├── message-actions.tsx            # Copy, vote, edit, regenerate buttons
│   ├── message-editor.tsx             # Inline message editor (textarea, cancel, send)
│   ├── message-reasoning.tsx          # Collapsible reasoning/thinking display
│   ├── multimodal-input.tsx           # Text input + file picker + model select + submit
│   ├── greeting.tsx                   # Empty chat welcome message
│   ├── suggested-actions.tsx          # Suggested prompt buttons (4-card grid)
│   ├── data-stream-handler.tsx        # Bridge: SSE data parts → SWR artifact state
│   ├── data-stream-provider.tsx       # Split state/dispatch contexts for data stream
│   ├── preview-attachment.tsx         # File upload thumbnail preview
│   └── weather.tsx                    # Weather tool result renderer
├── hooks/
│   ├── use-messages.ts                # Context: share messages between Chat + DataStreamHandler
│   └── use-scroll-to-bottom.ts        # Auto-scroll with manual override detection
├── schemas/
│   ├── chat.schema.ts                 # Chat request body validation (postRequestBodySchema)
│   └── message.schema.ts             # Message validation schemas
└── lib/
    ├── tools/
    │   ├── weather.ts                 # getWeather tool definition
    │   ├── create-document.ts         # createDocument tool (→ artifact handlers)
    │   ├── update-document.ts         # updateDocument tool (→ artifact handlers)
    │   └── suggestions.ts            # requestSuggestions tool
    ├── prompts.ts                     # System prompt composition (regular + artifacts + user)
    └── completion.ts                  # executeChatCompletion logic (model, tools, settings)
```

### `features/artifacts/`

```
features/artifacts/
├── actions/
│   ├── create-artifact.ts             # Server: artifact creation orchestration
│   └── update-artifact.ts             # Server: artifact update orchestration
├── components/
│   ├── artifact-panel.tsx             # Main artifact panel (overlay, AnimatePresence)
│   ├── artifact-actions.tsx           # Per-kind action buttons (copy, run, diff, etc.)
│   ├── artifact-close.tsx             # Close button (reset state or hide)
│   ├── artifact-error-boundary.tsx    # Error boundary for editor crashes
│   ├── artifact-messages.tsx          # Mini message list inside artifact panel
│   ├── create-artifact.tsx            # Artifact creation UI (if manually triggered)
│   ├── document-preview.tsx           # Inline preview in messages (mini editor + skeleton)
│   ├── version-footer.tsx             # Version navigation (prev/next/restore/latest)
│   ├── toolbar.tsx                    # Draggable toolbar with artifact actions
│   ├── diffview.tsx                   # Version diff comparison view
│   └── editors/
│       ├── text-editor.tsx            # TipTap rich-text editor + suggestions extension
│       ├── code-editor.tsx            # CodeMirror Python editor + Pyodide execution
│       ├── sheet-editor.tsx           # react-data-grid spreadsheet + PapaParse CSV
│       ├── image-editor.tsx           # Image display (base64/URL, inline/full modes)
│       └── console.tsx               # Code execution output (stdout, stderr, images)
├── handlers/
│   ├── base.ts                        # DocumentHandler interface + factory
│   ├── text.ts                        # Text handler: streamText → data-textDelta
│   ├── code.ts                        # Code handler: streamObject({code}) → data-codeDelta
│   ├── image.ts                       # Image handler: (Pyodide-only, no server generation)
│   └── sheet.ts                       # Sheet handler: streamObject({csv}) → data-sheetDelta
├── hooks/
│   ├── use-artifact.ts                # SWR-based artifact state (documentId, content, status)
│   └── use-artifact-selector.ts       # Derived slice selector for artifact state
├── schemas/
│   └── artifact.schema.ts            # Document/artifact validation schemas
└── types/
    └── artifact.types.ts              # UIArtifact, ArtifactKind, ArtifactDefinition types
```

### `features/auth/`

```
features/auth/
├── actions/
│   ├── login.ts                       # Server: login orchestration
│   ├── register.ts                    # Server: registration orchestration
│   ├── exchange.ts                    # Server: Supabase token → httpOnly cookie
│   └── logout.ts                      # Server: session termination
├── components/
│   ├── auth-form.tsx                  # Consolidated login/register form (mode prop)
│   └── auth-provider.tsx              # Session context provider (guest bootstrap, Supabase listener)
├── schemas/
│   └── auth.schema.ts                # Login/register input validation
└── lib/
    └── session.ts                     # getAppSession(): resolve session from cookies
```

### `features/sidebar/`

```
features/sidebar/
├── components/
│   ├── app-sidebar.tsx                # Main sidebar shell (header, content, footer)
│   ├── sidebar-history.tsx            # Chat list with SWR infinite scroll + date grouping
│   ├── sidebar-history-item.tsx       # Single chat item (link + dropdown: share, delete)
│   ├── sidebar-skeleton.tsx           # Loading skeleton for sidebar
│   └── sidebar-user-nav.tsx           # User avatar, theme toggle, login/logout
└── hooks/
    └── use-optimistic-chats.ts        # Context provider: optimistic sidebar entries with dedup
```

### `features/settings/`

```
features/settings/
├── components/
│   └── settings-panel.tsx             # Settings sheet (temperature, topP, system prompt, etc.)
├── hooks/
│   └── use-settings.ts               # useSyncExternalStore + localStorage pub/sub
└── lib/
    ├── defaults.ts                    # Default settings values
    └── types.ts                       # SettingsState type definition
```

### `features/voting/`

```
features/voting/
├── actions/
│   └── vote.ts                        # Server: upsert vote (auth, ownership, membership checks)
└── schemas/
    └── vote.schema.ts                 # Vote input validation ({ chatId, messageId, type })
```

### `features/models/`

```
features/models/
├── components/
│   └── model-selector.tsx             # Model dropdown (grouped by provider, compact variant)
└── lib/
    ├── catalog.ts                     # listChatModels(): curated + discovered merge
    └── discovery.ts                   # Dynamic model discovery from provider APIs
```

---

## `components/` — Truly Shared UI

Only components used by 2+ features or genuinely app-wide.

```
components/
├── ai-elements/                       # Read-only AI primitives — NEVER MODIFY
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
│   ├── sidebar.tsx
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
├── sidebar-toggle.tsx                 # Sidebar open/close button (used by chat + artifacts)
├── icons.tsx                          # Shared icon components
└── app-shell.tsx                      # Async server component: session fetch + provider tree
```

---

## `lib/` — Cross-Cutting Infrastructure

Shared by all features. No feature-specific logic.

```
lib/
├── data/                              # Shared data access functions
│   ├── chat.ts                        # getChatById, getChatsByUserId, createChat, updateTitle, etc.
│   ├── message.ts                     # getMessagesByChatId, createMessage, deleteTrailing
│   ├── document.ts                    # getDocumentById, saveDocumentVersion, getDocumentVersions
│   ├── user.ts                        # getUserById, createUser (Supabase-backed)
│   ├── vote.ts                        # upsertVote, getVotesByChatId
│   └── context.ts                     # DataContext type, createDataContext(session)
│
├── db/
│   ├── index.ts                       # Re-export db client + schema
│   ├── client.ts                      # Drizzle client (postgres driver, globalThis singleton)
│   ├── schema.ts                      # Drizzle schema: User, Chat, Message_v2, Vote_v2, Document, Suggestion
│   ├── migrate.ts                     # Migration runner script
│   └── migrations/                    # Drizzle migration files (generated)
│       └── ...
│
├── cache/
│   ├── index.ts                       # Re-export cache client + utilities
│   ├── client.ts                      # Upstash Redis client (globalThis singleton, edge-compatible)
│   ├── keys.ts                        # Cache key factory: cacheKeys.chat(id), cacheKeys.userChats(userId), etc.
│   └── with-cache.ts                  # withCache<T>(key, ttl, fetcher) helper
│
├── ai/
│   ├── index.ts                       # Re-export provider + registry
│   ├── providers.ts                   # myProvider: registry wrapper + reasoning middleware
│   ├── registry.ts                    # createProviderRegistry with conditional providers
│   └── model-discovery.ts             # Dynamic model discovery from provider APIs
│
├── auth/
│   ├── index.ts                       # Re-export auth utilities
│   └── config.ts                      # JWT secrets, cookie config, Supabase client factory
│
├── errors/
│   ├── index.ts                       # Re-export AppError + codes
│   ├── app-error.ts                   # AppError class with static factories + toResponse()
│   └── codes.ts                       # ErrorCode string literal union type
│
├── api/
│   ├── guards.ts                      # requireAuth, requireNonGuest, requireChatOwner, etc.
│   ├── validation.ts                  # parseJsonBodyForRoute, Zod integration helpers
│   └── response.ts                    # Response.json helpers, error response formatting
│
├── rate-limit/
│   └── config.ts                      # RateLimiters: chat (50/min), standard (100/min), strict (10/min), upload (10/hr)
│
├── types/
│   ├── index.ts                       # Re-export all shared types
│   ├── models.types.ts                # Drizzle-inferred types: Chat, Message, Document, Vote, User, Suggestion
│   ├── api.types.ts                   # API response types, ChatRequestBody, PaginatedResult
│   └── ai.types.ts                    # ModelMetadata, ModelCapability, ReasoningType, AppUsage, ProviderId
│
├── utils/
│   ├── index.ts                       # cn(), generateUUID(), formatDate, etc.
│   ├── lazy.ts                        # createLazyComponentWithPreload() utility
│   └── logger.ts                      # Structured logger (for ai-elements dependency)
│
└── hooks/                             # ONLY truly generic hooks (used by 3+ features)
    ├── use-mobile.ts                  # Media query: max-width 768px
    └── use-debounce.ts                # Debounced value hook
```

---

## `tests/` — Test Infrastructure

```
tests/
├── setup.ts                           # Vitest global setup (mocks, env)
├── mocks/
│   ├── cache.ts                       # Redis client mock
│   ├── db.ts                          # Drizzle client mock
│   ├── ai.ts                          # AI SDK mock (streamText, generateText)
│   ├── auth.ts                        # Session mock (authenticated, guest, null)
│   └── fetch.ts                       # Global fetch mock
├── fixtures/
│   ├── chat.ts                        # Chat factory (valid chat objects)
│   ├── message.ts                     # Message factory
│   ├── document.ts                    # Document factory with versions
│   └── user.ts                        # User factory (auth + guest)
├── integration/
│   ├── chat-flow.test.ts              # Chat send → stream → save flow
│   ├── artifact-flow.test.ts          # Tool call → handler → stream → state
│   ├── auth-flow.test.ts              # Login → exchange → session
│   └── sidebar-flow.test.ts           # History load → pagination → delete
└── e2e/
    ├── chat.spec.ts                   # Full chat E2E (send, receive, history)
    ├── artifacts.spec.ts              # Artifact creation/editing E2E
    ├── auth.spec.ts                   # Login/register/guest E2E
    └── sidebar.spec.ts                # Sidebar navigation E2E
```

---

## `public/` — Static Assets

```
public/
└── images/
    └── ... (logo, favicons, etc.)
```

---

## File Count Summary

| Directory | Files | Purpose |
|-----------|-------|---------|
| `app/` | ~22 | Routes, layouts, API handlers |
| `features/chat/` | ~20 | Chat feature (components, actions, hooks, tools) |
| `features/artifacts/` | ~22 | Artifact feature (editors, handlers, panel) |
| `features/auth/` | ~8 | Authentication (form, provider, session) |
| `features/sidebar/` | ~6 | Sidebar history + navigation |
| `features/settings/` | ~5 | User settings |
| `features/voting/` | ~2 | Message voting |
| `features/models/` | ~3 | Model selection + catalog |
| `components/ai-elements/` | 31 | Read-only AI primitives (copied) |
| `components/ui/` | ~32 | shadcn/ui base components |
| `components/` root | ~4 | Theme, icons, sidebar toggle, app shell |
| `lib/` | ~28 | Infrastructure (data, db, cache, ai, auth, errors, api, types, utils) |
| `tests/` | ~16 | Mocks, fixtures, integration, E2E |
| Root config | ~10 | Config files (next, ts, biome, postcss, etc.) |
| **Total** | **~209** | |
