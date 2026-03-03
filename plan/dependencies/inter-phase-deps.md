> **Updated per redesign audit (2026-03-01)**

# Inter-Phase Dependencies

> What each phase needs from previous phases, the specific exports/files that bridge phases,
> and entry/exit state verification for each phase boundary.
> Task IDs: P0-T01 through P7-T13. "artifact" naming throughout. No credit/gateway logic.
> proxy.ts (not middleware.ts). SessionProvider (not AuthProvider). ChatStreamProvider/StreamBridge.
> useSyncExternalStore for artifact state. ChatShell + ChatSessionContext.

---

## Overview

```
P0 ──→ P1 ──→ P2 ──→ P3 ──┬→ P4 ──┬→ P6 ──→ P7
                            └→ P5 ──┘
        ↑      ↑      ↑↑     ↑↑     ↑↑     ↑↑↑↑   ↑↑↑↑↑
       P0   P0,P1  P0-P2  P0-P3  P0-P3   P0-P5   P0-P6
```

Each phase has a **gate task** (final task) that must pass `pnpm format && pnpm typecheck && pnpm lint` before any dependent phase begins.

---

## P0 → P1: Scaffold & Infrastructure → Data Foundation

### Exports from P0

| P0 Task | Export | Consumed By |
|---------|--------|-------------|
| P0-T04 | `lib/db/schema.ts` (Drizzle schema, Artifact table — NOT Document) | P1-T01 (DB migration), P1-T05–T10 (data access) |
| P0-T05 | `lib/types/result.types.ts`, `model.types.ts`, `api.types.ts` | P1-T05–T10 (data access), P1-T11 (AI registry) |
| P0-T06 | `lib/types/artifact.types.ts`, `artifact-handler.types.ts` (ArtifactHandler) | P1-T08 (artifact data access) |
| P0-T08 | `lib/errors/app-error.ts`, `codes.ts` (NO activate_gateway) | P1-T05–T10 (data access) |
| P0-T14 | `proxy.ts` (auth guard, guest token rotation, rate-limit check) | P2-T01 (session resolution) |
| P0-T16 | `tests/setup.ts`, `tests/mocks/` | P1-T13 (test fixtures) |
| P0-T18 | Gate G00 — all P0 passes | P1 entry condition |

### Entry State for P1

- Next.js project compiles (`next dev` starts)
- Drizzle schema uses `Artifact` table (NOT `Document`)
- Type system established (shared types, artifact types, Zod patterns)
- Error handling framework in place (no credit/gateway error codes)
- UI primitives available (Tailwind, shadcn/ui)
- P0 output includes `proxy.ts` at project root (NOT `middleware.ts`)

### Exit State of P1

- Supabase connection pool active via `lib/db/client.ts`
- All data functions operational: user, chat, message, artifact (NOT document), vote, suggestion
- Cache layer functional (Upstash Redis via `lib/cache/`)
- Revalidation utilities: `invalidateChat`, `refreshChat`, etc.
- AI provider registry + wrapper ready (`lib/ai/registry.ts`, `lib/ai/provider.ts`)

---

## P1 → P2: Data Foundation → Auth Vertical

### Exports from P1

| P1 Task | Export | Consumed By |
|---------|--------|-------------|
| P1-T05 | `lib/data/user.ts` (getUserByEmail, createUser) | P2-T04 (auth actions: login/register) |
| P1-T06 | `lib/data/chat.ts` (getChatById, getChatsByUserId, etc.) | P3/P5 chat and sidebar data flows |
| P1-T14 | Gate G01 — all P1 passes | P2 entry condition |

### Entry State for P2

- Data layer fully operational
- User CRUD operations work
- Chat data operations work
- `proxy.ts` available for auth guard integration

### Exit State of P2

- Login, register, logout flows functional (Server Actions, NOT API routes)
- Guest auto-bootstrap via `proxy.ts` at edge
- `getAppSession()` in `lib/auth/session.ts` is single source of truth
- `SessionProvider` (NOT AuthProvider) broadcasts session to client components
- Auth pages render at `/login`, `/register`

---

## P2 → P3: Auth Vertical → Chat Core Vertical

### Exports from P2

| P2 Task | Export | Consumed By |
|---------|--------|-------------|
| P2-T01 | `lib/auth/session.ts` (`getAppSession()`) | P3-T23 (chat API route auth), P3-T22 (server actions) |
| P2-T09 | Gate G02 — all P2 passes | P3 entry condition |

### Exports from P1 (still needed)

| P1 Task | Export | Consumed By |
|---------|--------|-------------|
| P1-T06 | Chat data functions | P3-T22 (server actions), P3-T25 (chat pages `use cache`) |
| P1-T07 | Message data functions | P3-T22 (delete trailing messages) |
| P1-T08 | Artifact data functions (NOT document) | P3-T13 (tools: createArtifact, updateArtifact) |
| P1-T12 | AI provider wrapper (`myProvider`) | P3-T01 (model catalog), P3-T23 (chat API route) |

### Exports from P0 (still needed)

| P0 Task | Export | Consumed By |
|---------|--------|-------------|
| P0-T06 | Artifact types (ArtifactKind, ArtifactHandler) | P3-T04 (handler registry), P3-T05 (chat types) |
| P0-T07 | State types (pending-chats.types.ts) | P3-T06 (settings) |
| P0-T11 | UI components (shadcn/ui, sidebar.tsx) | P3-T14 (suggested actions), P3-T18 (input) |
| P0-T12 | Shared components (icons, theme-provider) | P3-T19 (chat header) |

### Entry State for P3

- Auth is complete — any request can resolve to a valid session
- Data layer provides chat/message/artifact CRUD
- AI provider registry + wrapper available
- UI primitives and shared types available

### Exit State of P3

- Full chat flow: send message → stream AI response → persist
- AI providers integrated (google, openai, openrouter — NO vercel-gateway)
- Tool system operational (weather, createArtifact stub, updateArtifact stub)
- ChatStreamProvider (NOT DataStreamProvider) with split state/dispatch + RAF batching
- StreamBridge (NOT DataStreamHandler) — thin bridge ~20 lines + pure `processStreamDelta()`
- ChatShell orchestrator (~60 lines, NOT God Component)
- ChatSessionContext provides intent-based callbacks (NOT prop drilling)
- Settings: `useSyncExternalStore` + localStorage (NO SettingsProvider)
- Chat pages render at `/` and `/chat/[id]` using `'use cache'` + `cacheTag`
- System prompt uses "artifact" (not "document")

---

## P3 → P4: Chat Core Vertical → Artifacts Vertical

### Exports from P3

| P3 Task | Export | Consumed By |
|---------|--------|-------------|
| P3-T04 | `lib/ai/artifact-handlers.ts` (handler registry: `registerArtifactHandler`, `getArtifactHandler`) | P4-T06 (handler registration side-effect) |
| P3-T09 | `features/chat/lib/chat-callbacks.ts`, `process-stream-deltas.ts` | P4-T17 (wire StreamBridge → artifactStore) |
| P3-T10 | `features/chat/components/chat-stream-provider.tsx` (ChatStreamProvider) | P4-T17 (artifact stream events) |
| P3-T20 | `features/chat/components/stream-bridge.tsx` (StreamBridge, ~20 lines) | P4-T17 (wire → artifactStore.setState) |
| P3-T21 | `features/chat/components/chat-shell.tsx` (ChatShell, ~60 lines) | P4-T17 (artifact panel attaches to ChatShell) |
| P3-T27 | Gate G03 — all P3 passes | P4 entry condition |

### Exports from P1 (still needed)

| P1 Task | Export | Consumed By |
|---------|--------|-------------|
| P1-T08 | Artifact data functions (`getArtifactById`, `saveArtifactVersion`) | P4-T15 (artifact API route) |
| P1-T10 | Suggestion data functions | P4-T16 (suggestions API route) |
| P1-T12 | AI provider wrapper | P4-T04, T05 (text/code/sheet handlers) |

### Entry State for P4

- Chat streaming works end-to-end
- AI provider wrapper available for handler use
- Handler registry exists (`lib/ai/artifact-handlers.ts`) with dependency inversion
- Tool stubs (createArtifact, updateArtifact) exist and can be upgraded
- ChatStreamProvider pipeline carries typed events
- StreamBridge processes deltas via pure function

### Exit State of P4

- All 4 artifact types (text, code, sheet, image) create and update via ArtifactHandler
- `artifactStore` uses `useSyncExternalStore` (NOT SWR synthetic key)
- `useArtifactSelector` re-renders only on selected state change
- All handlers register via side-effect import
- Text handler: APPEND delta; code/sheet: REPLACE delta
- Artifact panel renders with kind-specific editor routing
- Artifact API route calls `revalidateTag` on save
- Zero "document" identifiers anywhere

---

## P3 → P5 (parallel with P4): Chat Core → Sidebar & Navigation

### Exports from P3 (still needed)

| P3 Task | Export | Consumed By |
|---------|--------|-------------|
| P3-T21 | ChatShell (~60 lines) | P5-T11 (sidebar injected into chat layout) |
| P3-T24 | Chat layout (SERVER) | P5-T11 (sidebar wire) |

### Exports from P2 (still needed)

| P2 Task | Export | Consumed By |
|---------|--------|-------------|
| P2-T04 | logout Server Action | P5-T06 (user nav logout action) |
| P2-T01 | `getAppSession()` | P5-T10 (history API auth) |

### Entry State for P5

- Chat core functional (P3 gate passed)
- Artifacts may proceed in parallel (P4 is not a hard prerequisite for P5)
- SessionProvider in tree
- Chat data/message data operations available

### Exit State of P5

- SidebarShell is SERVER component with `'use cache'` + `cacheTag` (NOT `dynamic(import, { ssr: false })`)
- Initial 20 chats fetched server-side (no client waterfall)
- PendingChatsProvider (NOT OptimisticChatsProvider) provides `add`, `remove`, `updateTitle`
- Title flows via single channel: `chat-title` stream → `PendingChats.updateTitle()` (no polling, no window events)
- Delete/rename chat actions work via Server Actions + `updateTag`
- Sidebar is responsive (sheet on mobile)

---

## P5 → P6: Sidebar & Navigation → Enhancements

### Exports from P5

| P5 Task | Export | Consumed By |
|---------|--------|-------------|
| P5-T12 | Gate G05 — all P5 passes | P6 entry prerequisite (requires G04 + G05) |

### Cross-Phase Dependencies for P6

| Source Task | Export | P6 Consumer |
|-------------|--------|-------------|
| P1-T06 | Chat data functions | P6-T06 (visibility action) |
| P1-T09 | Vote data functions | P6-T01 (voting types + action) |
| P1-T02 | Cache client | P6-T13 (health check) |
| P2-T01 | `getAppSession()` | P6-T01, T09 (auth gates) |
| P3-T01 | Model catalog | P6-T04 (ModelSelector) |
| P3-T13 | Chat tools (weather) | P6-T12 (Weather component) |
| P3-T15 | Message display | P6-T03 (VoteResolver wires into messages) |
| P3-T18 | Multimodal input | P6-T11 (file upload attaches to input) |
| P3-T19 | Chat header | P6-T05 (ModelSelector wires into header) |
| P3-T25 | Chat pages | P6-T03 (VoteResolver), P6-T08 (VisibilitySelector) |

### Entry State for P6

- Core app fully functional (chat, artifacts, sidebar)
- All data operations available
- Auth fully operational

### Exit State of P6

- Voting uses Server Action + `useOptimistic` (NOT `PATCH /api/vote`) + VoteResolver
- ModelSelector persists to cookie + localStorage
- Visibility uses Server Action + `updateTag`
- File upload returns blob URL, preview renders thumbnail
- Weather component renders tool results
- Health check pings DB + Redis
- All Server Actions return `ActionResult<T>` (never throw)

---

## P6 → P7: Enhancements → Polish & Production

### Exports from P6

| P6 Task | Export | Consumed By |
|---------|--------|-------------|
| P6-T14 | Gate G06 — all P6 passes | P7 entry condition |

### Cross-Phase Dependencies for P7

| Source Task | Export | P7 Consumer |
|-------------|--------|-------------|
| P0-T13 | Root layout + global error | P7-T01 (finalize error boundaries) |
| P0-T15 | Instrumentation stubs | P7-T05 (finalize instrumentation) |
| P0-T17 | Import boundary script | P7-T09 (verify import boundaries) |
| P3-T21 | ChatShell | P7-T03 (a11y across chat components) |
| P3-T26 | Chat error boundary | P7-T01 (finalize) |
| P4-T13 | Artifact error boundary | P7-T02 (finalize) |
| P5-T11 | Sidebar in layout | P7-T03, T04 (a11y + responsive) |

### Entry State for P7

- ALL features implemented and passing validation
- No known type errors or lint issues
- Application is functionally complete

### Exit State of P7

- Error boundaries at all 4 levels (global, chat, auth, artifact) <!-- C2-W4: SEAM-027 fix -->
- Full a11y compliance (keyboard nav, ARIA, focus management)
- Responsive design verified (≥320px)
- `scripts/check-imports.mjs` reports zero violations
- Zero occurrences of "document" in code identifiers
- Zero occurrences of credit/gateway/quota terminology
- `proxy.ts` exists (not `middleware.ts`)
- Build succeeds with zero warnings (`pnpm build`)
- E2E test specs cover: auth, chat, artifacts, sidebar

---

## Phase Dependency Matrix

Shows which phases each phase depends on (direct dependencies only):

| Phase | P0 | P1 | P2 | P3 | P4 | P5 | P6 |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| P1 | ✅ | — | — | — | — | — | — |
| P2 | ✅ | ✅ | — | — | — | — | — |
| P3 | ✅ | ✅ | ✅ | — | — | — | — |
| P4 | ✅ | ✅ | — | ✅ | — | — | — |
| P5 | ✅ | ✅ | ✅ | ✅ | — | — | — |
| P6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| P7 | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |

Every phase depends on P0 (scaffold). P7 has one direct P2 dependency (`P2-T07`) for auth-route typecheck/lint baseline in final verification.

---

## Bridge Files

Key files that serve as interfaces between phases:

| File | Created In | Used By |
|------|-----------|---------|
| `lib/db/schema.ts` (Artifact table) | P0-T04 | P1, P2, P3+ |
| `lib/types/result.types.ts` | P0-T05 | All phases |
| `lib/types/artifact.types.ts` (ArtifactKind) | P0-T06 | P3, P4, P5+ |
| `lib/types/artifact-handler.types.ts` (ArtifactHandler) | P0-T06 | P3-T04, P4 |
| `lib/errors/app-error.ts` | P0-T08 | All phases |
| `proxy.ts` | P0-T14 | P2 (auth), runtime |
| `lib/data/user.ts` | P1-T05 | P2, P3+ |
| `lib/data/chat.ts` | P1-T06 | P2, P3, P5, P6 |
| `lib/data/message.ts` | P1-T07 | P3, P6 |
| `lib/data/artifact.ts` (NOT document.ts) | P1-T08 | P4, P6 |
| `lib/ai/provider.ts` (`myProvider`) | P1-T12 | P3, P4 |
| `lib/auth/session.ts` (`getAppSession()`) | P2-T01 | P3, P4, P5, P6 |
| `features/auth/components/session-provider.tsx` | P2-T06 | P3, P5 |
| `lib/ai/artifact-handlers.ts` (handler registry) | P3-T04 | P4 |
| `features/chat/components/chat-stream-provider.tsx` (ChatStreamProvider) | P3-T10 | P4 |
| `features/chat/components/stream-bridge.tsx` (StreamBridge) | P3-T20 | P4 |
| `features/chat/components/chat-shell.tsx` (ChatShell) | P3-T21 | P4, P5 |
