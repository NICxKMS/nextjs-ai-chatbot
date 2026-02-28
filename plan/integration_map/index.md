# Integration Map — Index

> Complete integration documentation for the AI chatbot rebuild.
> Every seam, data flow, API contract, and component wiring is mapped to actionable tasks.

---

## Files

| # | File | Description | Lines |
|---|------|-------------|-------|
| 1 | [contracts.md](contracts.md) | Interface contracts: feature→feature, feature→lib, component→hook→action→data chains, streaming event types | 295 |
| 2 | [data-flow-chains-01.md](data-flow-chains-01.md) | Data flow chains 1–8: Chat send, stream/receive, chat history, artifact create, artifact update, auth login, auth guest, sidebar history | 303 |
| 3 | [data-flow-chains-02.md](data-flow-chains-02.md) | Data flow chains 9–15: File upload, vote, suggestions, model selection, visibility toggle, settings update, title generation | 205 |
| 4 | [component-wiring.md](component-wiring.md) | Provider tree, context dependencies per component, parent→child data flow, inter-component events, render trees | 287 |
| 5 | [api-integration.md](api-integration.md) | Every fetch/API call, SWR keys and configurations, SSE/streaming, file uploads, auth cookies | 284 |
| 6 | [ai-integration.md](ai-integration.md) | useChat config, DataStreamHandler processing, tool execution, system prompt, provider/model resolution, usage tracking | 408 |
| 7 | [seam-inventory.md](seam-inventory.md) | 40 integration seams with ID, components, data exchanged, and required implementation task | 345 |

---

## How to Read This Map

1. **contracts.md** — Start here to understand module boundaries and what crosses them
2. **data-flow-chains-01/02.md** — Trace any feature's data flow end-to-end (15 flows total)
3. **component-wiring.md** — Understand the React component tree and provider dependencies
4. **api-integration.md** — Map every client→server communication point
5. **ai-integration.md** — Understand the AI/streaming subsystem
6. **seam-inventory.md** — Use this as the task source for the phase plan (40 seams → tasks)

---

## Key Integration Principles

### Feature Collocation Boundaries

```
features/chat/     ──┬── uses lib/data/ for persistence
                     ├── uses lib/ai/ for model resolution
                     ├── uses lib/cache/ via lib/data/
                     ├── calls features/artifacts/ tools (createDocument, updateDocument)
                     └── shares data with features/sidebar/ via SWR + events

features/artifacts/ ──┬── invoked by chat AI tools (server-side)
                      ├── uses lib/data/document for persistence
                      ├── streams data to features/chat/ DataStreamHandler
                      └── renders independently of chat messages

features/sidebar/   ──┬── reads same chat data as features/chat/
                      ├── uses SWR + window events for title sync
                      └── uses OptimisticChatsProvider shared with features/chat/

features/auth/      ──┬── provides session to ALL features via AuthProvider
                      └── gates every mutation via getAppSession()

features/settings/  ──── provides settings to features/chat/ via SettingsProvider
features/models/    ──── provides model catalog to features/chat/ via props
features/voting/    ──── reads chat data from features/chat/ context
```

### Shared Infrastructure

```
lib/data/     ← used by: chat, artifacts, sidebar, voting (data access)
lib/cache/    ← used by: lib/data/ (transparent to features)
lib/db/       ← used by: lib/data/ (transparent to features)
lib/ai/       ← used by: chat actions, artifact handlers (model resolution)
lib/auth/     ← used by: auth feature, middleware, all route handlers
lib/errors/   ← used by: all features and routes
lib/api/      ← used by: all route handlers (guards, validation)
```
