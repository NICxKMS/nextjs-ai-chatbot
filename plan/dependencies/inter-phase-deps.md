# Inter-Phase Dependencies

> What each phase needs from previous phases, the specific exports/files that bridge phases,
> and entry/exit state verification for each phase boundary.

---

## Overview

```
P00 ──→ P01 ──→ P02 ──→ P03 ──→ P04 ──→ P05 ──→ P06 ──→ P07
         ↑       ↑       ↑↑      ↑↑      ↑↑↑     ↑↑↑↑    ↑↑↑↑↑
        P00    P00,P01  P00-P02  P00-P03 P00-P04 P00-P05  P00-P06
```

Each phase has a **gate task** (final task) that must pass `pnpm format && pnpm typecheck && pnpm lint` before the next phase begins.

---

## P00 → P01: Scaffold → Data Foundation

### Exports from P00

| P00 Task | Export | Consumed By |
|----------|--------|-------------|
| P00-T07 | `lib/db/schema.ts` (Drizzle schema) | P01-T01 (DB connection), P01-T02 (migrations) |
| P00-T08 | `lib/types.ts` (CustomUIDataTypes, shared types) | P01-T05 (data context), P01-T12 (API utils) |
| P00-T09 | `lib/errors.ts` (AppError, error codes) | P01-T05 (data context), P01-T12 (API utils) |
| P00-T14 | `lib/middleware/` (stub chain) | P01-T13 (rate limiter adds middleware) |
| P00-T17 | Gate G00 — all P00 passes | P01 entry condition |

### Entry State for P01

- Next.js project compiles (`next dev` starts)
- Drizzle schema defined but no connection
- Type system established (shared types, Zod patterns)
- Error handling framework in place
- UI primitives available (Tailwind, shadcn/ui)

### Exit State of P01

- Supabase connection pool active
- All data functions (user, chat, message, document, vote, suggestion) operational
- Cache layer functional (get/set/invalidate)
- Rate limiter configured
- API response utilities available

---

## P01 → P02: Data Foundation → Auth

### Exports from P01

| P01 Task | Export | Consumed By |
|----------|--------|-------------|
| P01-T05 | `lib/data/context.ts` (createDataContext) | P02-T01 (session resolution calls data ops) |
| P01-T06 | `lib/data/user.ts` (getUser, createUser) | P02-T04 (login/register actions) |
| P01-T07 | `lib/data/chat.ts` (getChatById, etc.) | P02-T03 (guest exchange migrates chats) |
| P01-T11 | `lib/auth/config.ts` (Supabase clients, guest JWT) | P02-T01 (session), P02-T07 (provider), P02-T08 (routes) |
| P01-T12 | `lib/api/response.ts` (successJson, errorJson) | P02-T08 (auth API routes) |
| P01-T13 | `lib/middleware/rate-limit.ts` | P02-T10 (middleware guest rotation) |
| P01-T16 | Gate G01 — all P01 passes | P02 entry condition |

### Entry State for P02

- Data layer fully operational
- Auth config (Supabase client factories) available
- User CRUD operations work
- Chat data operations work (needed for guest exchange)

### Exit State of P02

- Login, register, logout flows functional
- Guest auto-bootstrap on first visit
- Guest-to-auth data migration works
- Session resolution (`getAppSession()`) is single source of truth
- AuthProvider broadcasts session to client components
- Middleware refreshes tokens automatically

---

## P02 → P03: Auth → Chat Core

### Exports from P02

| P02 Task | Export | Consumed By |
|----------|--------|-------------|
| P02-T01 | `getAppSession()` | P03-T09 (stream action auth), P03-T10 (message actions), P03-T20 (API route) |
| P02-T07 | `AuthProvider` component | P03-T21 (chat layout uses provider tree) |
| P02-T12 | Gate G02 — all P02 passes | P03 entry condition |

### Exports from P01 (still needed)

| P01 Task | Export | Consumed By |
|----------|--------|-------------|
| P01-T07 | Chat data functions | P03-T09 (persist chat), P03-T22 (load chat page) |
| P01-T08 | Message data functions | P03-T09 (persist messages), P03-T10 (delete messages) |
| P01-T12 | API utils | P03-T20 (chat API route) |
| P01-T13 | Rate limiter | P03-T20 (chat API route) |
| P01-T16 | Gate G01 | P03 most tasks need P01 foundation |

### Exports from P00 (still needed)

| P00 Task | Export | Consumed By |
|----------|--------|-------------|
| P00-T08 | Shared types | P03-T04 (settings), P03-T05 (schemas), P03-T12 (DataStream) |
| P00-T11 | UI utilities (Tooltip, etc.) | P03-T13 (suggested actions), P03-T17 (input), P03-T18 (header) |
| P00-T12 | AI element primitives | P03-T14 (message), P03-T17 (input) |
| P00-T13 | Icons | P03-T18 (chat header) |

### Entry State for P03

- Auth is complete — any request can resolve to a valid session
- Data layer provides chat/message CRUD
- UI primitives and shared types available

### Exit State of P03

- Full chat flow: send message → stream AI response → persist
- All AI providers integrated (6 providers)
- Tool system operational (weather, createDocument stub, updateDocument stub)
- DataStreamProvider/Handler established
- Chat pages render at `/` and `/chat/[id]`

---

## P03 → P04: Chat Core → Artifacts

### Exports from P03

| P03 Task | Export | Consumed By |
|----------|--------|-------------|
| P03-T02 | `myProvider()` (AI wrapper) | P04-T05 (text handler), P04-T06 (code handler), P04-T07 (sheet handler) |
| P03-T07 | Chat completion logic | P04-T09 (createDocument hooks into completion) |
| P03-T09 | Stream chat action | P04-T09, T10 (tool handlers execute within stream) |
| P03-T12 | DataStreamProvider/Handler | P04-T21 (artifact stream events flow through DataStream) |
| P03-T19 | Chat component (orchestrator) | P04-T21 (artifact panel attaches to chat) |
| P03-T24 | Gate G03 — all P03 passes | P04 entry condition |

### Exports from P01 (still needed)

| P01 Task | Export | Consumed By |
|----------|--------|-------------|
| P01-T09 | Document data functions | P04-T04, T10, T11, T20 (document CRUD) |

### Entry State for P04

- Chat streaming works end-to-end
- AI provider wrapper available for handler use
- Tool stubs (createDocument, updateDocument) exist and can be upgraded
- DataStream pipeline carries typed events

### Exit State of P04

- All 4 artifact types (text, code, sheet, image) create and update
- Artifact panel renders with proper editor routing
- Version history + diff view functional
- Suggestions flow from AI → TipTap editor
- Pyodide code execution works in browser

---

## P04 → P05: Artifacts → Sidebar

### Exports from P04

| P04 Task | Export | Consumed By |
|----------|--------|-------------|
| P04-T22 | Gate G04 — all P04 passes | P05 entry condition |

### Exports from P03 (still needed)

| P03 Task | Export | Consumed By |
|----------|--------|-------------|
| P03-T19 | Chat orchestrator | P05-T08 (optimistic chat wiring) |
| P03-T21 | Chat layout | P05-T10 (sidebar injected into layout) |

### Exports from P02 (still needed)

| P02 Task | Export | Consumed By |
|----------|--------|-------------|
| P02-T07 | AuthProvider | P05-T03 (user nav shows auth state) |
| P02-T01 | `getAppSession()` | P05-T07 (history API auth) |

### Entry State for P05

- Chat + Artifacts fully functional
- Auth provider in tree
- Chat data/message data operations available

### Exit State of P05

- Sidebar renders with grouped chat history
- Optimistic chat creation works on first message
- Title sync pipeline (stream → poll → event) operational
- Delete/rename chat actions work
- Sidebar is responsive (sheet on mobile)

---

## P05 → P06: Sidebar → Enhancements

### Exports from P05

| P05 Task | Export | Consumed By |
|----------|--------|-------------|
| P05-T12 | Gate G05 — all P05 passes | P06 entry condition |

### Cross-Phase Dependencies for P06

| Source Task | Export | P06 Consumer |
|-------------|--------|-------------|
| P01-T07 | Chat data functions | P06-T01 (vote data), P06-T13 (visibility) |
| P01-T08 | Message data functions | P06-T01 (vote data) |
| P01-T10 | Vote data functions | P06-T01 (vote module) |
| P01-T13 | Rate limiter | P06-T02 (vote route), P06-T09 (upload) |
| P02-T01 | `getAppSession()` | P06-T01, T02, T09, T13 (auth gates) |
| P03-T03 | Model selector | P06-T04 (server model config) |
| P03-T04 | Settings schema | P06-T07 (settings panel) |
| P03-T15 | Message actions | P06-T03 (vote wires into actions) |
| P03-T17 | Multimodal input | P06-T06, T11 (model/upload attach to input) |
| P03-T18 | Chat header | P06-T08, T14 (settings/visibility attach to header) |
| P04-T01 | Artifact types | P06-T16 (toolbar) |
| P04-T17 | Artifact panel | P06-T16 (toolbar wires into panel) |

### Entry State for P06

- Core app fully functional (chat, artifacts, sidebar)
- All data operations available
- Auth fully operational

### Exit State of P06

- Voting, model selection, settings, file upload, visibility all work
- Health check endpoint operational
- Toast notifications system active
- Toolbar for artifact creation works

---

## P06 → P07: Enhancements → Polish

### Exports from P06

| P06 Task | Export | Consumed By |
|----------|--------|-------------|
| P06-T18 | Gate G06 — all P06 passes | P07 entry condition |

### Cross-Phase Dependencies for P07

| Source Task | Export | P07 Consumer |
|-------------|--------|-------------|
| P00-T05 | Provider tree shell | P07-T01 (global error boundary wraps providers) |
| P00-T10 | UI utilities | P07-T08 (reduced motion) |
| P00-T15 | Instrumentation stubs | P07-T09 (wire real instrumentation) |
| P03-T23 | Chat error boundary | P07-T02 (wire chat error boundary) |
| P04-T18 | Artifact error boundary | P07-T03 (wire artifact error boundary) |
| P05-T02 | Sidebar skeleton | P07-T04 (loading states) |
| P05-T10 | Sidebar in layout | P07-T02 (test error recovery) |

### Entry State for P07

- ALL features implemented and passing validation
- No known type errors or lint issues
- Application is functionally complete

### Exit State of P07

- Error boundaries at all 3 levels (global, chat, artifact)
- Full a11y compliance (keyboard nav, ARIA, focus management)
- Responsive design verified (≥320px)
- Loading states for all async operations
- Build succeeds with zero warnings
- Integration test suite passes

---

## Phase Dependency Matrix

Shows which phases each phase depends on (direct dependencies only):

| Phase | P00 | P01 | P02 | P03 | P04 | P05 | P06 |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| P01 | ✅ | — | — | — | — | — | — |
| P02 | ✅ | ✅ | — | — | — | — | — |
| P03 | ✅ | ✅ | ✅ | — | — | — | — |
| P04 | ✅ | ✅ | ✅ | ✅ | — | — | — |
| P05 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| P06 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| P07 | ✅ | — | — | ✅ | ✅ | ✅ | ✅ |

Every phase depends on P00 (scaffold). P07 does NOT depend on P01/P02 directly — it only needs their outputs through later phases.

---

## Bridge Files

Key files that serve as interfaces between phases:

| File | Created In | Used By |
|------|-----------|---------|
| `lib/db/schema.ts` | P00-T07 | P01, P02, P03+ |
| `lib/types.ts` | P00-T08 | All phases |
| `lib/errors.ts` | P00-T09 | All phases |
| `lib/auth/config.ts` | P01-T11 | P02, P03+ |
| `lib/data/context.ts` | P01-T05 | P02, P03+ |
| `lib/data/chat.ts` | P01-T07 | P02, P03, P05, P06 |
| `lib/data/message.ts` | P01-T08 | P03, P06 |
| `lib/data/document.ts` | P01-T09 | P04, P06 |
| `features/auth/lib/session.ts` | P02-T01 | P03, P04, P05, P06 |
| `features/chat/lib/ai/provider.ts` | P03-T02 | P04 |
| `features/chat/components/data-stream-handler.tsx` | P03-T12 | P04 |
| `features/chat/components/chat.tsx` | P03-T19 | P04, P05 |
