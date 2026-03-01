> **Updated per redesign audit (2026-03-01)**

# Feature-to-Task Traceability Matrix

> Maps every feature from behavioral extraction to its implementing tasks.
> 19 features tracked (credit/usage alert removed per redesign).
> Task IDs: P0-T01 through P7-T13. "artifact" naming throughout.
> ChatStreamProvider (not DataStreamProvider), StreamBridge (not DataStreamHandler),
> SessionProvider (not AuthProvider), PendingChatsProvider (not OptimisticChatsProvider).

---

## Matrix

| # | Feature | Phase Tasks | Key Files | Integration Tasks |
|---|---------|-------------|-----------|-------------------|
| 1 | Chat messaging (send, receive, stream) | P3-T01, T02, T05, T08, T09, T10, T11, T12, T14, T15, T16, T17, T18, T19, T20, T21, T23, T25 | features/chat/\*, app/api/chat/, app/(chat)/ | P3-T21 (ChatShell), P3-T23 (API route), P3-T25 (pages) |
| 2 | Auth (login, register, guest) | P1-T05, P2-T01..T09 | features/auth/\*, lib/auth/, app/(auth)/ | P2-T08 (wire layout) |
| 3 | Chat history / sidebar | P5-T01..T12 | features/sidebar/\*, app/api/history/ | P5-T08, P5-T11 |
| 4 | Artifacts (code, text, image, sheet) | P4-T01..T11, T14..T17 | features/artifacts/\*, features/chat/lib/tools/, app/api/artifact/ | P4-T06, P4-T17 |
| 5 | Artifact versioning | P4-T12, T15 | features/artifacts/components/version-footer.tsx, app/api/artifact/ | P4-T17 |
| 6 | Artifact suggestions | P4-T16 | features/chat/lib/tools/request-suggestions.ts, features/artifacts/components/editors/text-editor.tsx | P4-T16 |
| 7 | Message voting | P1-T09, P6-T01, T02, T03 | features/voting/\*, lib/data/vote.ts | P6-T03 (VoteResolver) |
| 8 | File upload | P6-T09, T10, T11 | app/api/files/upload/, features/chat/components/preview-attachment.tsx | P6-T11 |
| 9 | Model selection | P3-T01, P6-T04, T05 | features/models/\*, lib/ai/models.ts | P6-T05 |
| 10 | Chat visibility | P6-T06, T07, T08 | features/visibility/\* | P6-T08 |
| 11 | Settings (sampling, system prompt) | P3-T06, P3-T07 | features/settings/hooks/use-settings.ts, features/settings/components/settings-panel.tsx | — (via P3-T06 useSyncExternalStore) |
| 12 | Weather tool | P3-T13, P6-T12 | features/chat/lib/tools/weather.ts, components/weather.tsx | — (via P3-T23) |
| 13 | Title generation | P3-T23, P5-T02 | app/api/chat/route.ts (onFinish awaits title), features/sidebar/hooks/use-pending-chats.ts | P5-T02 (PendingChats.updateTitle) |
| 14 | Message actions (copy, edit, delete) | P3-T16, P3-T15 | features/chat/components/message-actions.tsx, message-editor.tsx | P3-T16 |
| 15 | Suggested actions | P3-T14 | features/chat/components/suggested-actions.tsx | — (via P3-T21 ChatShell) |
| 16 | Chat streaming (ChatStreamProvider/StreamBridge) | P3-T10, P3-T20 | features/chat/components/chat-stream-provider.tsx, stream-bridge.tsx | P3-T21, P4-T17 |
| 17 | Error handling (boundaries) | P0-T13, P0-T08, P3-T26, P4-T13, P7-T01, T02 | app/global-error.tsx, app/(chat)/error.tsx, lib/errors/, artifact-error-boundary.tsx | P7-T01, P7-T02 |
| 18 | Reconnection / resilience | P3-T11 (partial), P3-T21 (partial), P7-T03 (partial) | features/chat/hooks/use-chat-session.ts (AbortSignal), chat-shell.tsx (onError) | — (see uncovered-features.md) |
| 19 | Theme switching | P0-T12, P5-T06 | components/theme-provider.tsx, features/sidebar/components/sidebar-user-nav.tsx | P5-T06 |

> **Note:** Feature #20 (Health check) renumbered to standalone. Credit/usage alert UI feature removed per redesign — no credit/gateway/quota system exists.

---

## Detailed Feature Breakdowns

### Feature 1: Chat Messaging

| Task | Title | Role |
|------|-------|------|
| P3-T01 | AI model catalog | Model list with `use cache` |
| P3-T02 | System prompts + provider options | System prompt composition ("artifact" not "document") |
| P3-T05 | Chat types + schemas | Zod validation, ChatSessionValue, ArtifactDataPart |
| P3-T08 | ChatSessionContext | Context + `useChatSessionContext()` (NOT prop drilling) |
| P3-T09 | Chat pure functions | `chat-callbacks.ts`, `process-stream-deltas.ts` (testable) |
| P3-T10 | ChatStreamProvider | Split state/dispatch contexts, RAF batching |
| P3-T11 | useChatSession hook | `useChat` config + callbacks (~120 lines) |
| P3-T12 | Chat side-effect hooks | `use-chat-side-effects.ts`, `use-scroll-to-bottom.ts` |
| P3-T15 | Message display | Message + reasoning rendering |
| P3-T17 | Messages list | Virtualized list + auto-scroll |
| P3-T18 | Multimodal input | Text + file + paste |
| P3-T19 | Chat header | Reads ChatSessionContext, sidebar toggle |
| P3-T20 | StreamBridge | Thin bridge ~20 lines → `processStreamDelta` → `artifactStore` |
| P3-T21 | ChatShell orchestrator | ~60 lines, creates `ChatSessionContext.Provider` |
| P3-T23 | Chat API route | `createUIMessageStream`, `streamText`, tools, `onFinish` revalidation |
| P3-T25 | Chat pages | `/` (new) and `/chat/[id]` (`use cache` + `cacheTag`) |

### Feature 2: Authentication

| Task | Title | Role |
|------|-------|------|
| P1-T05 | User data access | `getUserByEmail`, `createUser` |
| P2-T01 | Session resolution | `getAppSession()` — single source of truth |
| P2-T02 | Auth types + schemas | Zod login/register schemas |
| P2-T03 | Guest bootstrap | JWT creation, token rotation |
| P2-T04 | Auth actions | Login, register, logout Server Actions |
| P2-T05 | Auth form | Client form with `useActionState` |
| P2-T06 | SessionProvider (NOT AuthProvider) | Session context, guest bootstrap effect |
| P2-T07 | Auth layout + pages | `/login`, `/register`, layout |
| P2-T08 | Wire root layout | SessionProvider in layout |

### Feature 3: Chat History / Sidebar

| Task | Title | Role |
|------|-------|------|
| P5-T01 | Sidebar types | Type definitions |
| P5-T02 | PendingChatsProvider (NOT OptimisticChats) | Context: `add`, `remove`, `updateTitle`, `markConfirmed` |
| P5-T03 | useSidebarHistory | `useSWRInfinite` wrapper for pagination |
| P5-T04 | SidebarHistoryItem | Link + rename + delete dropdown |
| P5-T05 | SidebarHistoryClient | Initial data from server + SWR pagination + optimistic merge |
| P5-T06 | SidebarUserNav | Avatar, theme toggle, logout |
| P5-T07 | SidebarSkeleton | PPR fallback (SERVER) |
| P5-T08 | SidebarShell (SERVER) | `use cache` + `cacheTag('chats:{userId}')` |
| P5-T09 | Rename chat action | Server Action + `updateTag` |
| P5-T10 | History API route | GET cursor-based paginated |
| P5-T11 | Wire sidebar into chat layout | `SidebarProvider` → `Suspense` → `SidebarShell` |

### Feature 4: Artifacts (All 4 Types)

| Task | Title | Role |
|------|-------|------|
| P4-T01 | Artifact types + schemas | ArtifactKind, UIArtifact |
| P4-T02 | Artifact store | `useSyncExternalStore`: getSnapshot, subscribe, setState, reset |
| P4-T03 | Artifact hook aliases | `useArtifact`, `useArtifactSelector` (re-exports from store) |
| P4-T04 | Text + code handlers | ArtifactHandler interface: `streamText` → `artifact-textDelta` APPEND, `streamObject` → `artifact-codeDelta` REPLACE |
| P4-T05 | Sheet + image handlers | `streamObject` → `artifact-sheetDelta` REPLACE, image handler |
| P4-T06 | Handler registration | Side-effect import registers into `lib/ai/artifact-handlers.ts` |
| P4-T07 | Text editor | TipTap + suggestions extension |
| P4-T08 | Code editor | CodeMirror + Pyodide execution |
| P4-T09 | Sheet editor | react-data-grid + PapaParse CSV |
| P4-T10 | Image editor | Base64/URL display |
| P4-T11 | Artifact panel | Main container, kind-specific editor switch |
| P4-T14 | Artifact preview | Inline in messages, `useArtifactSelector` |
| P4-T15 | Artifact API route | POST: save edits, `revalidateTag('artifact:{id}', 'max')` |
| P4-T17 | Wire into ChatShell | Conditionally render `ArtifactPanel` + wire `StreamBridge` → `artifactStore` |

---

## Coverage Summary

| Feature | Task Count | Phase(s) | Status |
|---------|-----------|----------|--------|
| Chat messaging | 16 | P3 | ✅ Full |
| Auth | 9 | P1, P2 | ✅ Full |
| Chat history / sidebar | 11 | P5 | ✅ Full |
| Artifacts (4 types) | 14 | P4 | ✅ Full |
| Artifact versioning | 2 | P4 | ✅ Full |
| Artifact suggestions | 1 | P4 | ✅ Full |
| Message voting | 4 | P1, P6 | ✅ Full |
| File upload | 3 | P6 | ✅ Full |
| Model selection | 3 | P3, P6 | ✅ Full |
| Chat visibility | 3 | P6 | ✅ Full |
| Settings | 2 | P3 | ✅ Full |
| Weather tool | 2 | P3, P6 | ✅ Full |
| Title generation | 2 | P3, P5 | ✅ Full |
| Message actions | 2 | P3 | ✅ Full |
| Suggested actions | 1 | P3 | ✅ Full |
| Chat streaming (ChatStreamProvider/StreamBridge) | 2 | P3 | ✅ Full |
| Error handling | 6 | P0, P3, P4, P7 | ✅ Full |
| Reconnection / resilience | 3 (partial) | P3, P7 | ⚠️ Partial |
| Theme switching | 2 | P0, P5 | ✅ Full |

**18/19 features fully covered. 1 feature (reconnection) partially covered. Credit/usage alert removed.**
