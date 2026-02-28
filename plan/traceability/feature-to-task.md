# Feature-to-Task Traceability Matrix

> Maps every feature from behavioral extraction to its implementing tasks.
> 100% coverage of all 20 identified features.

---

## Matrix

| # | Feature | Phase Tasks | Key Files | Integration Tasks |
|---|---------|-------------|-----------|-------------------|
| 1 | Chat messaging (send, receive, stream) | P03-T01, T02, T05, T06, T07, T09, T11, T14, T16, T17, T18, T19, T20, T21, T22 | features/chat/\*, app/api/chat/, app/(chat)/ | P03-T19, P03-T20, P03-T22 |
| 2 | Auth (login, register, guest) | P01-T11, P02-T01..T12 | features/auth/\*, lib/auth/, app/(auth)/, app/api/auth/ | P02-T10, P02-T11 |
| 3 | Chat history / sidebar | P05-T01..T12 | features/sidebar/\*, app/api/history/ | P05-T08, P05-T09, P05-T10 |
| 4 | Artifacts (code, text, image, sheet) | P04-T01..T10, T12..T21 | features/artifacts/\*, features/chat/lib/tools/, app/api/artifact/ | P04-T09, P04-T10, P04-T21 |
| 5 | Artifact versioning | P04-T18, T19, T20 | features/artifacts/components/version-footer.tsx, diffview.tsx, app/api/artifact/ | P04-T21 |
| 6 | Artifact suggestions | P04-T11, T12 | features/chat/lib/tools/suggestions.ts, features/artifacts/components/editors/text-editor.tsx | P04-T11 |
| 7 | Message voting | P01-T10, P06-T01, T02, T03 | features/voting/\*, lib/data/vote.ts, app/api/vote/ | P06-T03 |
| 8 | File upload | P06-T09, T10, T11 | app/api/files/upload/, features/chat/components/preview-attachment.tsx | P06-T11 |
| 9 | Model selection | P03-T03, P06-T04, T05, T06 | features/models/\*, lib/ai/model-discovery.ts | P06-T06 |
| 10 | Chat visibility | P06-T12, T13, T14 | features/chat/components/visibility-selector.tsx, use-chat-visibility.ts | P06-T14 |
| 11 | Settings (sampling, system prompt) | P03-T04, P06-T07, T08 | features/settings/\* | P06-T08 |
| 12 | Weather tool | P03-T08, T18 | features/chat/lib/tools/weather.ts, features/chat/components/weather.tsx | — (via P03-T07) |
| 13 | Title generation | P03-T09, P05-T09 | features/chat/actions/stream-chat.ts, features/chat/components/chat.tsx | P05-T09 |
| 14 | Message actions (copy, edit, delete) | P03-T10, T15 | features/chat/components/message-actions.tsx, message-editor.tsx | P03-T15 |
| 15 | Suggested actions | P03-T13 | features/chat/components/suggested-actions.tsx | — (via P03-T19) |
| 16 | Data streaming (Provider/Handler) | P03-T12 | features/chat/components/data-stream-provider.tsx, data-stream-handler.tsx | P03-T19, P04-T21 |
| 17 | Error handling (boundaries) | P00-T04, T09, P03-T23, P04-T18, P07-T01, T02, T03 | app/global-error.tsx, app/(chat)/error.tsx, lib/errors/, artifact-error-boundary.tsx | P07-T01, P07-T02, P07-T03 |
| 18 | Reconnection / resilience | P03-T07 (partial), P03-T19 (partial), P03-T23 (partial) | features/chat/lib/completion.ts (AbortSignal), chat.tsx (onError) | — (see uncovered-features.md) |
| 19 | Theme switching | P00-T05, P05-T03 | components/theme-provider.tsx, features/sidebar/components/sidebar-user-nav.tsx | P05-T03 |
| 20 | Health check | P06-T17 | app/api/health/route.ts | — (standalone) |

---

## Detailed Feature Breakdowns

### Feature 1: Chat Messaging

| Task | Title | Role |
|------|-------|------|
| P03-T01 | AI provider registry | Provider initialization (6 providers) |
| P03-T02 | AI provider wrapper | Model resolution + reasoning middleware |
| P03-T05 | Chat schemas | Zod validation for chat request/messages |
| P03-T06 | System prompts | System prompt composition |
| P03-T07 | Chat completion logic | `streamText()` orchestration |
| P03-T09 | Stream chat action | Server action: auth + validate + stream + persist |
| P03-T11 | Chat hooks | `useMessages`, `useScrollToBottom` |
| P03-T14 | Message display | Message + reasoning rendering |
| P03-T16 | Messages list | Virtualized list + scroll FAB |
| P03-T17 | Chat input | Multimodal input (text + file + paste) |
| P03-T18 | Chat header + weather | Header bar + weather result display |
| P03-T19 | Chat orchestrator | Wires useChat + DataStream + Messages + Input |
| P03-T20 | Chat API route | `POST /api/chat` SSE endpoint |
| P03-T21 | Chat layouts | Server + client layout split |
| P03-T22 | Chat pages | `/` (new) and `/chat/[id]` (existing) |

### Feature 2: Authentication

| Task | Title | Role |
|------|-------|------|
| P01-T11 | Auth config | Supabase client + guest JWT helpers |
| P02-T01 | Session resolution | `getAppSession()` — single source of truth |
| P02-T02 | Auth schemas | Zod login/register schemas |
| P02-T03 | Token exchange | Guest-to-auth data migration |
| P02-T04 | Login + register actions | Server actions for auth flows |
| P02-T05 | Logout action | Session clear + guest mint |
| P02-T06 | Auth form component | Client form with useActionState |
| P02-T07 | Auth provider | React context for session broadcasting |
| P02-T08 | Auth API routes | Guest mint, OAuth callback, logout |
| P02-T09 | Auth pages | `/login`, `/register`, layout |
| P02-T10 | Middleware guest rotation | Auto-bootstrap + token refresh |
| P02-T11 | Wire root layout | AuthProvider in provider tree |

### Feature 3: Chat History / Sidebar

| Task | Title | Role |
|------|-------|------|
| P05-T01 | Optimistic chats provider | Context + Set-based dedup |
| P05-T02 | Sidebar skeleton | Loading fallback |
| P05-T03 | Sidebar user nav | Theme toggle + logout |
| P05-T04 | Sidebar history item | Memo item + dropdown actions |
| P05-T05 | Sidebar history list | SWRInfinite + GroupedVirtuoso |
| P05-T06 | App sidebar shell | Header + content + footer |
| P05-T07 | History API route | GET paginated + DELETE all |
| P05-T08 | Wire optimistic chats | First-message sidebar entry |
| P05-T09 | Wire title sync | Stream → poll → event pipeline |
| P05-T10 | Wire sidebar into layout | Provider tree + dynamic import |
| P05-T11 | Sidebar toggle | Shared toggle component |

### Feature 4: Artifacts (All 4 Types)

| Task | Title | Role |
|------|-------|------|
| P04-T01 | Artifact types | ArtifactKind, UIArtifact, definitions |
| P04-T02 | Artifact schemas | Zod for CRUD endpoints |
| P04-T03 | Artifact hooks | `useArtifact` SWR + selector |
| P04-T04 | Handler factory | `createDocumentHandler` + registration map |
| P04-T05 | Text handler | `streamText` → data-textDelta |
| P04-T06 | Code handler | `streamObject({code})` → data-codeDelta |
| P04-T07 | Sheet handler | `streamObject({csv})` → data-sheetDelta |
| P04-T08 | Image handler | No-op save (Pyodide-only) |
| P04-T09 | Wire createDocument | Stub → full tool with handlers |
| P04-T10 | Wire updateDocument | Stub → full tool with existing content |
| P04-T12 | Text editor | TipTap + SuggestionsExtension |
| P04-T13 | Code editor | CodeMirror + Pyodide execution |
| P04-T14 | Console | Resizable stdout/stderr/image output |
| P04-T15 | Sheet editor | react-data-grid + PapaParse CSV |
| P04-T16 | Image editor | Base64/URL image display |
| P04-T17 | Artifact panel | Fixed overlay, editor routing, animations |
| P04-T18 | Supporting components | Actions, close, error boundary, version footer |
| P04-T19 | Document preview + diff | Inline preview + version diff |
| P04-T20 | Artifact API routes | GET/POST/DELETE + suggestions |
| P04-T21 | Wire into chat | Dynamic import + Pyodide script |

---

## Coverage Summary

| Feature | Task Count | Phase(s) | Status |
|---------|-----------|----------|--------|
| Chat messaging | 15 | P03 | ✅ Full |
| Auth | 13 | P01, P02 | ✅ Full |
| Chat history / sidebar | 12 | P05 | ✅ Full |
| Artifacts (4 types) | 20 | P04 | ✅ Full |
| Artifact versioning | 3 | P04 | ✅ Full |
| Artifact suggestions | 2 | P04 | ✅ Full |
| Message voting | 4 | P01, P06 | ✅ Full |
| File upload | 3 | P06 | ✅ Full |
| Model selection | 4 | P03, P06 | ✅ Full |
| Chat visibility | 3 | P06 | ✅ Full |
| Settings | 3 | P03, P06 | ✅ Full |
| Weather tool | 2 | P03 | ✅ Full |
| Title generation | 2 | P03, P05 | ✅ Full |
| Message actions | 2 | P03 | ✅ Full |
| Suggested actions | 1 | P03 | ✅ Full |
| Data streaming | 1 | P03 | ✅ Full |
| Error handling | 7 | P00, P03, P04, P07 | ✅ Full |
| Reconnection / resilience | 3 (partial) | P03 | ⚠️ Partial |
| Theme switching | 2 | P00, P05 | ✅ Full |
| Health check | 1 | P06 | ✅ Full |

**19/20 features fully covered. 1 feature (reconnection) partially covered.**
