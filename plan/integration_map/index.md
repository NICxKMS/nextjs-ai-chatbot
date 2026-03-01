> **Updated per redesign audit (2026-03-01)**

# Integration Map — Index

> Complete integration documentation for the AI chatbot rebuild.
> Every seam, data flow, API contract, and component wiring is mapped to actionable tasks.
> Updated to reflect redesign audit: artifact naming, handler registry,
> ChatStreamProvider/StreamBridge, PendingChatsProvider, Server Actions for mutations,
> useSyncExternalStore for artifact/settings state, proxy.ts, no credit/quota system.

---

## Files

| # | File | Description |
|---|------|-------------|
| 1 | [contracts.md](contracts.md) | Interface contracts: feature→feature, feature→lib, component→hook→action→data chains, streaming event types (artifact-* prefix), Server Action contracts, shared types (ChatSessionValue, ArtifactHandler, PendingChatOperations, ActionResult) |
| 2 | [data-flow-chains-01.md](data-flow-chains-01.md) | Data flow chains 1–7: New chat send, existing chat load, chat deletion, message edit+regenerate, artifact creation (createArtifact), artifact update (updateArtifact), settings change |
| 3 | [data-flow-chains-02.md](data-flow-chains-02.md) | Data flow chains 8–16: File upload, vote (Server Action + useOptimistic), suggestions, model selection, visibility toggle, title generation (single channel), auth login, auth guest, sidebar history (server-rendered + pagination) |
| 4 | [component-wiring.md](component-wiring.md) | Provider tree (server layout + client islands), context dependencies per component, parent→child data flow (ChatSessionContext), inter-component events (PendingChatsProvider), render trees |
| 5 | [api-integration.md](api-integration.md) | API endpoints (Route Handlers + Server Actions), SWR keys, SSE/streaming (ChatStreamProvider→StreamBridge→artifactStore), file uploads, auth cookies, proxy.ts |
| 6 | [ai-integration.md](ai-integration.md) | useChat config (useChatSession), StreamBridge + processStreamDelta(), tool execution (createArtifact/updateArtifact/requestSuggestions), handler registry, composeSystemPrompt(), provider/model resolution |
| 7 | [seam-inventory.md](seam-inventory.md) | 40 integration seams with ID, components, data exchanged, and required implementation task — all updated with artifact naming, handler registry, Server Actions |

---

## How to Read This Map

1. **contracts.md** — Start here to understand module boundaries and what crosses them
2. **data-flow-chains-01/02.md** — Trace any feature's data flow end-to-end (16 flows total)
3. **component-wiring.md** — Understand the React component tree and provider dependencies
4. **api-integration.md** — Map every client→server communication point
5. **ai-integration.md** — Understand the AI/streaming subsystem and handler registry
6. **seam-inventory.md** — Use this as the task source for the phase plan (40 seams → tasks)

---

## Key Integration Principles

### Feature Collocation Boundaries

```
features/chat/     ──┬── uses lib/data/ for persistence
                     ├── uses lib/ai/ for model resolution + prompts
                     ├── calls artifact handlers via registry (lib/ai/artifact-handlers.ts)
                     ├── shares data with sidebar via PendingChatsProvider context
                     └── ChatStreamProvider + StreamBridge → artifactStore (one-way)

features/artifacts/ ──┬── handlers invoked via registry (server-side only)
                      ├── uses lib/data/artifact for persistence
                      ├── artifactStore read by features/chat/ StreamBridge (one-way)
                      └── renders independently with useSyncExternalStore subscriptions

features/sidebar/   ──┬── server-rendered initial data (SidebarShell 'use cache')
                      ├── SWR infinite scroll for pagination
                      └── PendingChatsProvider for optimistic entries (shared with chat)

features/auth/      ──┬── SessionProvider context for all features
                      └── getAppSession() server-side for all mutations

features/settings/  ──── useSyncExternalStore module store (NO provider)
                         any component imports useSettings() directly

features/voting/    ──── Server Action + useOptimistic (independent leaf feature)

features/visibility/ ─── Server Action + useOptimistic (independent leaf feature)
```

### Shared Infrastructure

```
lib/data/         ← used by: chat, artifacts, voting (data access)
lib/ai/           ← used by: chat route handler (model, prompts, tools, handler registry)
lib/auth/         ← used by: auth feature, proxy.ts, all route handlers, all server actions
lib/cache/        ← used by: revalidation helpers (refreshChat, refreshChatList)
lib/errors/       ← used by: all features and routes
lib/types/        ← used by: all features (contract types)
```

### Architectural Patterns

| Pattern | Used For | Key Components |
|---------|----------|---------------|
| Server layout + client islands | Layout structure | Chat layout (SERVER), NoticeHandler island |
| ChatShell + ChatSessionContext | Chat page decomposition | ChatShell creates context, children consume |
| useSyncExternalStore | Artifact state, settings | artifactStore, settingsStore — no providers |
| Split context (state/dispatch) | ChatStreamProvider | Prevents re-render cascade |
| Handler registry (dependency inversion) | Artifact creation/update | lib/ai/artifact-handlers.ts registry |
| StreamBridge + processStreamDelta() | Stream→state bridge | Thin client + pure function  |
| PendingChatsProvider | Optimistic sidebar entries | Layout-level context |
| Server Action + useOptimistic | Mutations (vote, visibility, delete) | Idiomatic React 19 pattern |
| 'use cache' + cacheTag | Server data fetching | SidebarShell, chat page |
| updateTag/revalidateTag | Cache invalidation | All Server Actions, onFinish |
