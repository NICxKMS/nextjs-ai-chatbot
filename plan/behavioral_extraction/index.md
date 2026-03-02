# Behavioral Extraction Index

> **Updated per redesign audit (2026-03-01)**

> Complete behavioral analysis of `oldapp/` for rebuild planning. File/path references are normalized to the target rebuild layout (`app/**`, `features/**`) while preserving oldapp behavior semantics.

## Files

| # | File | Summary |
|---|------|---------|
| 1 | [features.md](features.md) | **Feature Inventory** — 12 user-facing features documented with entry points, user flows, data requirements, AI interactions, and edge cases. Covers: Chat, Auth, History/Sidebar, Artifacts, Voting, File Upload, Model Selection, Visibility, Suggestions, Weather, Settings, Health Check. |
| 2 | [data-flows.md](data-flows.md) | **Data Flows** — Database schema (6 tables), data access layer architecture, cache-first strategy, Redis key patterns, circuit breaker, TTL strategy. End-to-end flow diagrams for: Send Message, Load Chat Page, Save Artifact, Chat History Pagination, Token Exchange. Revalidation matrix and mutation architecture. |
| 3 | [ai-sdk-usage.md](ai-sdk-usage.md) | **AI SDK Usage** — Vercel AI SDK v5 integration. Provider registry, model catalog with capabilities/reasoning types, 4 tool definitions (`getWeather`, `createArtifact`, `updateArtifact`, `requestSuggestions`), streaming patterns (streamText/streamObject/generateText), data stream protocol (`artifact-*` parts), system prompt composition. *Redesign: tools renamed to artifact terminology, handler registry in `lib/ai/`, credit/gateway logic removed.* |
| 4 | [api-contracts.md](api-contracts.md) | **API Contracts** — Every route documented with method, auth requirements, request schema, response shape, validation steps, side effects, and error codes. Key endpoints: chat (POST), history (GET), artifact (GET/POST), suggestions (GET), files/upload (POST), health (GET). Server Actions: `deleteChat`, `deleteAllChats`, `voteOnMessage`, `updateChatVisibility`, `deleteTrailingMessages`, `login`, `register`, `logout`. `ActionResult<T>` return type. |
| 5 | [state-management.md](state-management.md) | **State Management** — Complete state inventory table. Hooks: useChat, useArtifact (useSyncExternalStore), useChatVisibility (useOptimistic), usePendingChats, useScrollToBottom, useMobile, useWindowSize. Providers: ChatStreamProvider (split state/dispatch, page-scoped), PendingChatsProvider, SessionProvider, ThemeProvider. Settings via `useSyncExternalStore` + localStorage (no provider). StreamBridge → artifactStore. |
| 6 | [auth-system.md](auth-system.md) | **Auth System** — Dual auth architecture (Supabase + Guest JWT), session resolution, Server Action auth mutations (`login`, `register`, `logout`), guest auto-creation in proxy.ts, token rotation, guest limitations table, rate limiting, auth guards, security considerations (IDOR, JWT, cookies). SessionProvider wraps app. |
| 7 | [artifacts-system.md](artifacts-system.md) | **Artifacts System** — 4 artifact types (text/TipTap, code/CodeMirror+Pyodide, sheet/react-data-grid, image), ArtifactHandler registry with `.create()`/`.update()` methods, server/client split, versioning via composite PK, `artifact-*` stream parts, artifactStore (useSyncExternalStore), suggestions flow, diff view, toolbar system, panel UI layout/visibility logic, error boundaries. |
| 8 | [edge-cases.md](edge-cases.md) | **Edge Cases** — ChatSDKError system, error boundaries (global, chat, artifact), loading states, empty states, network error handling, AbortController usage, rate limiting behavior, cache failure modes (circuit breaker), data integrity (dedup, optimistic rollback, race conditions), specific edge cases (Pyodide, concurrent tabs, file uploads). |

## Key Architectural Patterns

1. **Server Cache-Tagged Data Access**: Reads use Next.js `'use cache'` + `cacheTag`; both guest and authenticated sessions are DB-backed with cache revalidation.

2. **Dual Auth**: Supabase for registered users, auto-created Guest JWT for anonymous. Both produce consistent `AppSession` shape. SessionProvider wraps the entire app.

3. **Split State/Dispatch Context**: ChatStreamProvider splits into two contexts (state + dispatch) to prevent re-render cascades. Scoped to page level, not layout level.

4. **Optimistic UI**: Chat list (PendingChatsProvider), visibility toggle (`useChatVisibility` with `useOptimistic`) with rollback on failure. Single-channel title update via `chat-title` stream part → `PendingChats.updateTitle()`.

5. **Streaming Protocol**: Custom `artifact-*` data parts layered on top of AI SDK's UIMessageStream. StreamBridge bridges SSE stream to `artifactStore` (useSyncExternalStore) via pure `processStreamDelta()` function.

6. **Artifact Versioning**: Composite PK `(id, createdAt)` — each save is a new row. Version navigation is client-side.

7. **Provider Registry**: Dynamic model discovery + curated catalog. Reasoning middleware wraps models transparently via `myProvider` in `lib/ai/provider.ts`.

8. **Structured Errors**: `ChatSDKError` / `AppError` with typed codes, surface-based visibility, HTTP response serialization. Server Actions return `ActionResult<T>` instead of throwing.

## Dependency Map

> *Layout is a server component. ChatStreamProvider is page-scoped. ChatShell is a thin orchestrator replacing the monolithic Chat component.*

```
Root Layout (SERVER)
├── ThemeProvider
├── SessionProvider
└── (chat) Layout (SERVER)
    ├── PendingChatsProvider
    ├── SidebarProvider
    │   ├── SidebarShell (SERVER — fetches initial data)
    │   └── SidebarInset → {children}
    └── Chat Page (SERVER)
        ├── ChatStreamProvider (page-scoped)
        ├── ChatShell (thin orchestrator ~60 lines)
        │   ├── ChatSessionContext (inline provider)
        │   │   ├── ChatHeader
        │   │   ├── Messages
        │   │   ├── MultimodalInput
        │   │   └── ArtifactPanel
        │   └── useChatSession (extracted hook)
        ├── StreamBridge (stream→artifactStore)
        └── VoteResolver (deferred, Suspense-wrapped)
```

## Critical Integration Points

> *StreamBridge uses pure `processStreamDelta()` + `artifactStore` (useSyncExternalStore). Title flow: `chat-title` stream part → `PendingChats.updateTitle()`. Every mutation uses `revalidateTag`/`updateTag`.*

| From | To | Mechanism |
|------|----|-----------||
| Chat → AI | POST /api/chat → streamText | SSE stream |
| Stream → UI | StreamBridge → artifactStore (useSyncExternalStore) | `artifact-*` data parts |
| Chat → Sidebar | PendingChats.add() on first message | Context (PendingChatsProvider) |
| Title → Sidebar | `chat-title` stream part → PendingChats.updateTitle() | Single-channel (stream + context) |
| Settings → Server | request body → temperature/topP/prompt | Per-request (useSyncExternalStore + localStorage) |
| Auth → Everything | getAppSession() → AppSession | Cookie + JWT (SessionProvider) |
| Cache → DB | `'use cache'` + `cacheTag`, write-through + `revalidateTag`/`updateTag` | Next.js cache + Drizzle |
