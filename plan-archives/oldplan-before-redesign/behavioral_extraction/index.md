# Behavioral Extraction Index

> Complete behavioral analysis of `oldapp/` for rebuild planning.

## Files

| # | File | Summary |
|---|------|---------|
| 1 | [features.md](features.md) | **Feature Inventory** — 12 user-facing features documented with entry points, user flows, data requirements, AI interactions, and edge cases. Covers: Chat, Auth, History/Sidebar, Artifacts, Voting, File Upload, Model Selection, Visibility, Suggestions, Weather, Settings, Health Check. |
| 2 | [data-flows.md](data-flows.md) | **Data Flows** — Database schema (6 tables), data access layer architecture, cache-first strategy, Redis key patterns, circuit breaker, TTL strategy. End-to-end flow diagrams for: Send Message, Load Chat Page, Save Document, Chat History Pagination, Token Exchange. |
| 3 | [ai-sdk-usage.md](ai-sdk-usage.md) | **AI SDK Usage** — Vercel AI SDK v5 integration. Provider registry (6 providers), model catalog with capabilities/reasoning types, 4 tool definitions, streaming patterns (streamText/streamObject/generateText), data stream protocol (14 custom parts), system prompt composition, TokenLens usage tracking, entitlements. |
| 4 | [api-contracts.md](api-contracts.md) | **API Contracts** — Every route documented with method, auth requirements, request schema, response shape, validation steps, side effects, and error codes. 10 endpoints: chat (POST), chat/[id] (DELETE), history (GET/DELETE), document (GET/POST/DELETE), vote (PATCH), suggestions (GET), files/upload (POST), health (GET), auth/exchange (POST). |
| 5 | [state-management.md](state-management.md) | **State Management** — All hooks (useChat, useArtifact, useChatVisibility, useOptimisticChats, useMessages, useScrollToBottom, useMobile, useWindowSize), context providers (DataStream split state/dispatch, OptimisticChats, Auth, Theme), Settings in localStorage, URL state management, SWR keys, DataStreamHandler bridge pattern. |
| 6 | [auth-system.md](auth-system.md) | **Auth System** — Dual auth architecture (Supabase + Guest JWT), session resolution, token exchange flow, guest auto-creation in proxy.ts, token rotation, guest limitations table, middleware (edge + application rate limiting), auth guards, security considerations (IDOR, JWT, cookies), environment variables. |
| 7 | [artifacts-system.md](artifacts-system.md) | **Artifacts System** — 4 artifact types (text/TipTap, code/CodeMirror+Pyodide, sheet/react-data-grid, image), document handler factory, server/client split, versioning via composite PK, cache versioning, suggestions flow, diff view, toolbar system, panel UI layout/visibility logic, error boundaries. |
| 8 | [edge-cases.md](edge-cases.md) | **Edge Cases** — ChatSDKError system, error boundaries (global, chat, artifact), loading states, empty states, network error handling, AbortController usage, rate limiting behavior, cache failure modes (circuit breaker), data integrity (dedup, optimistic rollback, race conditions), specific edge cases (Pyodide, concurrent tabs, file uploads). |

## Key Architectural Patterns

1. **Cache-First Data Access**: All reads go through Redis first. Guest users are cache-only (no DB). Authenticated users fall back to DB with background cache warming.

2. **Dual Auth**: Supabase for registered users, auto-created Guest JWT for anonymous. Both produce consistent `AppSession` shape.

3. **Split State/Dispatch Context**: DataStreamProvider splits into two contexts to prevent re-render cascades.

4. **Optimistic UI**: Chat list (useOptimisticChats), visibility toggle (useChatVisibility) with rollback on failure.

5. **Streaming Protocol**: Custom data parts layered on top of AI SDK's UIMessageStream. DataStreamHandler bridges SSE to SWR state.

6. **Document Versioning**: Composite PK `(id, createdAt)` — each save is a new row. Version navigation is client-side.

7. **Provider Registry**: Dynamic model discovery + curated catalog. Reasoning middleware wraps models transparently.

8. **Structured Errors**: `ChatSDKError` with typed codes, surface-based visibility, HTTP response serialization.

## Dependency Map

```
App Layout
├── AuthProvider (Supabase client)
├── ThemeProvider (next-themes)
└── (chat) Layout
    ├── OptimisticChatsProvider
    ├── AppSidebar (history, nav)
    └── Chat Page
        ├── DataStreamProvider
        ├── Chat Component
        │   ├── useChat (AI SDK)
        │   ├── Messages
        │   │   ├── Message (markdown, reasoning, tool calls)
        │   │   └── MessageActions (vote, copy, reload)
        │   ├── MultimodalInput
        │   │   ├── ModelSelector
        │   │   ├── VisibilitySelector
        │   │   └── FileUpload
        │   └── DataStreamHandler (stream→state bridge)
        └── Artifact Panel
            ├── ArtifactErrorBoundary
            ├── Text/Code/Sheet/Image Editor
            ├── Toolbar (per-type actions)
            └── VersionFooter
```

## Critical Integration Points

| From | To | Mechanism |
|------|----|-----------|
| Chat → AI | POST /api/chat → streamText | SSE stream |
| Stream → UI | DataStreamHandler → useArtifact SWR | Custom data parts |
| Chat → Sidebar | onFinish → addOptimisticChat | Context |
| Title → Sidebar | data-chatTitle → updateOptimisticChat | Stream + Context |
| Settings → Server | request body → temperature/topP/prompt | Per-request |
| Auth → Everything | getAppSession() → AppSession | Cookie + JWT |
| Cache → DB | cache-first reads, write-through on mutations | Redis + Drizzle |
