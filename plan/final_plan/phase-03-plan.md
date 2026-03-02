> **Updated per redesign audit (2026-03-01)**

# Phase 3 — Chat Core Vertical

> AI integration, settings, streaming, ChatShell + ChatSessionContext decomposition, message display, input, tool stubs, server layout, and chat pages.

---

## Objective

Implement the complete chat experience — AI integration, settings (`useSyncExternalStore` + localStorage, NO SettingsProvider), streaming (ChatStreamProvider with split contexts + RAF batching), message display, input, tool stubs, ChatShell + ChatSessionContext decomposition, StreamBridge, server layout, and chat pages. ChatShell is a thin ~60-line orchestrator that creates `ChatSessionContext.Provider`. Business logic lives in `useChatSession` hook and pure functions. System prompt uses "artifact" (not "document"). Chat tools: `createArtifact`, `updateArtifact` (not createDocument/updateDocument).

**Entry state:** P2 complete — auth works, session resolution functional, data layer ready
**Exit state:** Users can chat with AI, see streaming responses; ChatShell ~60 lines; all "artifact" naming; `pnpm typecheck && pnpm lint && pnpm format` pass
**Tasks:** 27

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P3-T01 | Create AI model catalog | IMPL | `lib/ai/models.ts`, `features/models/lib/models.ts` (`listChatModels` with `use cache`), `features/models/types/model.types.ts` | P1-T12 | M |
| P3-T02 | Create system prompts + provider options | IMPL | `lib/ai/prompts.ts` (`composeSystemPrompt` — uses "artifact" NOT "document"), `lib/ai/provider-options.ts` | P3-T01 | M |
| P3-T03 | Create tool enablement + title gen | IMPL | `lib/ai/tools.ts` (`getEnabledTools`), `lib/ai/title.ts` (`generateTitle`) | P1-T12 | S |
| P3-T04 | Create artifact handler registry | IMPL | `lib/ai/artifact-handlers.ts` (`registerArtifactHandler`, `getArtifactHandler`) | P0-T06 | M |
| P3-T05 | Create chat types + schemas | IMPL | `features/chat/types/chat.types.ts` (`ChatSessionValue`, `ArtifactDataPart`), `features/chat/schemas/chat.schema.ts` | P0-T06 | M |
| P3-T06 | Create settings store + hooks | IMPL | `features/settings/hooks/use-settings.ts` (`useSyncExternalStore` + localStorage, NO SettingsProvider), `features/settings/types/settings.types.ts` | P0-T07 | M |
| P3-T07 | Create settings panel | IMPL | `features/settings/components/settings-panel.tsx` (sheet UI, reads from `useSettings()`) | P3-T06 | M |
| P3-T08 | Create ChatSessionContext | IMPL | `features/chat/hooks/use-chat-session-context.ts` (`ChatSessionContext` + `useChatSessionContext()`) | P3-T05 | S |
| P3-T09 | Create chat pure functions | IMPL | `features/chat/lib/chat-callbacks.ts`, `features/chat/lib/process-stream-deltas.ts` | P3-T05 | M |
| P3-T10 | Create ChatStreamProvider | IMPL | `features/chat/components/chat-stream-provider.tsx` (split state/dispatch contexts, RAF batching) | P3-T05 | L |
| P3-T11 | Create useChatSession hook | IMPL | `features/chat/hooks/use-chat-session.ts` (`useChat` config + callbacks, ~120 lines) | P3-T08, P3-T09, P3-T10 | L |
| P3-T12 | Create chat side-effect hooks | IMPL | `features/chat/hooks/use-chat-side-effects.ts` (~40 lines), `features/chat/hooks/use-scroll-to-bottom.ts` | P3-T08 | M |
| P3-T13 | Create chat tools | IMPL | `features/chat/lib/tools/weather.ts`, `create-artifact.ts`, `update-artifact.ts`, `request-suggestions.ts` | P3-T04, P1-T08 | L |
| P3-T14 | Create empty state components | IMPL | `features/chat/components/greeting.tsx`, `features/chat/components/suggested-actions.tsx`, `features/chat/components/notice-handler.tsx` | P3-T08 | S |
| P3-T15 | Create message display | IMPL | `features/chat/components/message.tsx`, `features/chat/components/message-reasoning.tsx` | P3-T08 | M |
| P3-T16 | Create message interactions | IMPL | `features/chat/components/message-actions.tsx`, `features/chat/components/message-editor.tsx` | P3-T15 | M |
| P3-T17 | Create messages list | IMPL | `features/chat/components/messages.tsx` (virtualized + auto-scroll) | P3-T15, P3-T12 | L |
| P3-T18 | Create multimodal input | IMPL | `features/chat/components/multimodal-input.tsx`, `features/chat/components/submit-button.tsx` | P3-T08 | L |
| P3-T19 | Create chat header | IMPL | `features/chat/components/chat-header.tsx` (reads ChatSessionContext, sidebar toggle) | P3-T08 | M |
| P3-T20 | Create StreamBridge | IMPL | `features/chat/components/stream-bridge.tsx` (thin bridge ~20 lines → `processStreamDelta` → `artifactStore`) | P3-T09, P3-T10 | S |
| P3-T21 | Create ChatShell orchestrator | INTEG | `features/chat/components/chat-shell.tsx` (~60 lines, creates `ChatSessionContext.Provider`) | P3-T11, P3-T12, P3-T17, P3-T18, P3-T19 | L |
| P3-T22 | Create chat server actions | IMPL | `features/chat/actions/delete-chat.ts`, `delete-all-chats.ts`, `delete-trailing-messages.ts` (each calls `updateTag`) | P1-T06, P1-T03 | M |
| P3-T23 | Create chat API route | IMPL | `app/api/chat/route.ts` (`createUIMessageStream`, `streamText`, tools, `onFinish` with `revalidateTag`) | P3-T13, P3-T02 | L |
| P3-T24 | Create chat layout (SERVER) | INTEG | `app/(chat)/layout.tsx` (SERVER: SidebarProvider, Suspense→SidebarSkeleton stub, PendingChatsProvider stub, NoticeHandler) | P3-T14, P0-T11 | M |
| P3-T25 | Create chat pages | IMPL | `app/(chat)/page.tsx` (new chat; reads `?q=` query parameter and auto-submits via `useChatSession.sendMessage()` if present), `app/(chat)/chat/[id]/page.tsx` (existing: `Promise.all`, `use cache`) | P3-T21, P3-T10 | M |
| P3-T26 | Create chat error boundary | IMPL | `app/(chat)/error.tsx` | P0-T08 | S |
| P3-T27 | Verification gate G03 | VERIFY | — | P3-T01..T26 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| Phase naming | P03 | P3 |
| Task count | 24 | 27 (more granular decomposition) |
| Chat orchestrator | "Chat orchestrator (wires everything)" P03-T19 | ChatShell ~60 lines (P3-T21) + ChatSessionContext (P3-T08) + useChatSession (P3-T11) |
| DataStreamProvider | `DataStreamProvider` + `DataStreamHandler` (P03-T12) | `ChatStreamProvider` (split contexts, RAF batching, P3-T10) + `StreamBridge` (~20 lines, P3-T20) |
| Settings | `Settings module (localStorage + pub/sub)` (P03-T04) | `useSyncExternalStore` + localStorage (P3-T06), NO SettingsProvider |
| Chat context | `ChatContext` / `useChatContext` | `ChatSessionContext` / `useChatSessionContext` (P3-T08) |
| Context value type | `ChatContextValue` | `ChatSessionValue` |
| Tool names | `createDocument` / `updateDocument` stubs | `createArtifact` / `updateArtifact` (P3-T13) |
| System prompt | Unspecified naming | Uses "artifact" not "document" (P3-T02) |
| Handler registry | Not in P03 | `lib/ai/artifact-handlers.ts` (P3-T04) — dependency inversion |
| Chat layout | "Chat layouts (server + client split)" P03-T21 | SERVER layout (P3-T24) — no `'use client'` on layout |
| Revalidation | Not specified | Server actions call `updateTag`; API route calls `revalidateTag` (P3-T22, P3-T23) |
| Title delivery | Credit/usage alert, `pollForTitle` | Title AWAITED server-side before stream close; delivered via single channel |
| Credit/usage | `data-usage` stream part triggers AlertDialog | REMOVED — no credit/gateway logic |
| Pure functions | Not explicit | `processStreamDelta()` + `chat-callbacks.ts` (P3-T09) — testable without React |

---

## ChatShell Decomposition

The old 524-line God Component is replaced by a thin orchestrator pattern:

```
ChatShell (~60 lines)             # Creates ChatSessionContext.Provider
├── useChatSession() (~120 lines)    # useChat config + callbacks (hook)
├── useChatSideEffects() (~40 lines) # Navigation effects (hook)
├── chat-callbacks.ts              # Pure functions: onData, onError, onFinish
├── process-stream-deltas.ts       # Pure function: delta → artifact update
├── ChatHeader                     # Reads ChatSessionContext
├── Messages                       # Reads ChatSessionContext (3 own props max)
├── MultimodalInput                # Reads ChatSessionContext (2 own props max)
├── StreamBridge                   # ~20 lines, processStreamDelta → artifactStore
└── ArtifactPanel                  # Reads ChatSessionContext (2 own props max)
```

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P2 gate passed; auth works; data layer operational |
| Exit | ChatShell creates `ChatSessionContext.Provider` (~60 lines); `useChatSession` encapsulates `useChat` config; `ChatStreamProvider` uses split contexts; `processStreamDelta()` is pure testable; `StreamBridge` is ~20 lines; chat API route uses `createUIMessageStream` with `onFinish` revalidation; title awaited server-side; system prompt uses "artifact"; chat tools: `createArtifact`/`updateArtifact`; chat pages use `'use cache'` + `cacheTag`; `pnpm typecheck && pnpm lint` pass |

---

## Exit Criteria

- [ ] ChatShell creates `ChatSessionContext.Provider` (~60 lines, NOT a God Component)
- [ ] `useChatSession` encapsulates `useChat` config + callbacks
- [ ] `ChatStreamProvider` uses split contexts (state/dispatch) with RAF batching
- [ ] `processStreamDelta()` is a pure testable function
- [ ] `StreamBridge` is a thin bridge (~20 lines)
- [ ] Chat API route uses `createUIMessageStream` with `onFinish` revalidation
- [ ] Title is AWAITED server-side before stream close (no polling)
- [ ] System prompt uses "artifact" (not "document")
- [ ] Chat tools: `createArtifact`, `updateArtifact` (not createDocument/updateDocument)
- [ ] ArtifactHandler registry in `lib/ai/artifact-handlers.ts` (dependency inversion)
- [ ] Chat pages use `'use cache'` + `cacheTag` for fetching
- [ ] Cross-tab settings synchronization works via `StorageEvent` listener in `useSyncExternalStore` subscribe function (P3-T06)
- [ ] New chat page reads `?q=` query parameter and auto-submits if present (P3-T25)
- [ ] `pnpm typecheck && pnpm lint` pass

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-006 | Chat request pipeline (client → server → SSE) | P3-T11, P3-T21, P3-T23 |
| SEAM-007 | ChatStreamProvider pipeline (server → provider → StreamBridge → artifactStore) | P3-T10, P3-T20 |
| SEAM-008 | Chat Completion Execution (streamText + tools + settings) | P3-T02, P3-T23 |
| SEAM-015 | Settings pipeline (localStorage → useSyncExternalStore → hook) | P3-T06, P3-T07, P3-T21 |
| SEAM-028 | Client Error Handling (useChat.onError → toast) | P3-T21, P3-T26 |
| SEAM-029 | Provider scoping (ChatStreamProvider at page level) | P3-T24, P3-T25 |
| SEAM-031 | URL State Management (history.replaceState + NoticeHandler) | P3-T21, P3-T25 |
| SEAM-038 | Message edit + regenerate flow | P3-T16, P3-T22 |
