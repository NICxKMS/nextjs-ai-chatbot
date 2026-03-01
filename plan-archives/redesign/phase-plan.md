# Execution Phase Plan

> Complete ground-up rebuild of the Next.js 16 AI chatbot.
> **~193 files** across 8 phases. "artifact" naming throughout. No credit/gateway logic.
> `proxy.ts` (not middleware.ts). Server layouts + client islands. ChatShell + ChatSessionContext.
> `useSyncExternalStore` for artifact state. `revalidateTag`/`updateTag` after every mutation.

**Decision hierarchy:** Correctness → Architecture → Consistency → Performance → Speed
**Reuse hierarchy:** Reuse → Extend → Refactor → Create

---

## Phase 0 — Scaffold & Infrastructure

**Objective:** Create the project skeleton — config, shared types, error handling, utilities, UI primitives, root layout, proxy, and test infrastructure.

**Entry State:** Empty project directory. `oldapp/` preserved as read-only reference.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P0-T01 | Initialize project config | SCAFFOLD | `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json` | none | M |
| P0-T02 | Create tooling config | SCAFFOLD | `postcss.config.mjs`, `vercel.json`, `.env.example`, `.gitignore` | P0-T01 | S |
| P0-T03 | Create Tailwind CSS | SCAFFOLD | `app/globals.css` | P0-T02 | S |
| P0-T04 | Create Drizzle schema + client | IMPL | `lib/db/schema.ts` (Artifact table, NOT Document), `lib/db/client.ts` | P0-T01 | L |
| P0-T05 | Define core shared types | IMPL | `lib/types/result.types.ts`, `lib/types/data-context.types.ts`, `lib/types/model.types.ts` | P0-T01 | M |
| P0-T06 | Define artifact shared types | IMPL | `lib/types/artifact.types.ts`, `lib/types/artifact-handler.types.ts` | P0-T05 | M |
| P0-T07 | Define state shared types | IMPL | `lib/types/pending-chats.types.ts`, `lib/types/settings.types.ts` | P0-T05 | S |
| P0-T08 | Create error handling | IMPL | `lib/errors/app-error.ts`, `lib/errors/codes.ts` (NO activate_gateway) | P0-T05 | M |
| P0-T09 | Create utility functions | IMPL | `lib/utils/cn.ts`, `lib/utils/format.ts`, `lib/utils/generate-uuid.ts` | P0-T01 | S |
| P0-T10 | Create shared hooks | IMPL | `lib/hooks/use-mobile.ts`, `lib/hooks/use-debounce.ts` | P0-T01 | S |
| P0-T11 | Copy shadcn/ui components | SCAFFOLD | `components/ui/*.tsx` (~32 files incl. sidebar.tsx) | P0-T09 | M |
| P0-T12 | Create shared components | IMPL | `components/theme-provider.tsx`, `components/icons.tsx`, `components/sidebar-toggle.tsx`, `components/toaster.tsx` | P0-T11 | M |
| P0-T13 | Create root layout + global error | IMPL | `app/layout.tsx` (SERVER: html/body, ThemeProvider stub), `app/global-error.tsx` | P0-T12 | M |
| P0-T14 | Create proxy.ts (Next.js 16) | IMPL | `proxy.ts` (auth guard, guest token rotation, rate-limit check) | P0-T01 | M |
| P0-T15 | Create instrumentation stubs | SCAFFOLD | `instrumentation.ts`, `instrumentation-client.ts` | P0-T01 | S |
| P0-T16 | Create test infrastructure | SCAFFOLD | `tests/setup.ts`, `tests/mocks/auth.ts`, `tests/mocks/db.ts`, `tests/mocks/cache.ts` | P0-T04 | M |
| P0-T17 | Create import boundary script | IMPL | `scripts/check-imports.mjs` | P0-T01 | S |
| P0-T18 | Verification gate G00 | VERIFY | — | P0-T01..T17 | S |

**Exit Criteria:**
- [ ] `pnpm install` completes
- [ ] `pnpm typecheck` passes (all shared types resolve)
- [ ] `pnpm format` passes
- [ ] `pnpm lint` passes (import boundary script runs)
- [ ] `proxy.ts` exports `proxy()` function + `config.matcher`
- [ ] DB schema uses `Artifact` table (NOT `Document`)
- [ ] `lib/errors/codes.ts` has zero credit/gateway codes
- [ ] Root layout renders without errors

**Verification:** `pnpm install && pnpm format && pnpm typecheck && pnpm lint`

---

## Phase 1 — Data Foundation

**Objective:** Create the database migration infrastructure, cache layer, all data access functions, and AI provider foundation.

**Entry State:** P0 complete — project scaffolded, types/errors/utils defined, schema exists.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P1-T01 | Create DB migration infra | IMPL | `lib/db/migrate.ts`, `drizzle.config.ts` | P0-T04 | M |
| P1-T02 | Create cache client + keys | IMPL | `lib/cache/client.ts` (Upstash Redis), `lib/cache/keys.ts` | P0-T01 | M |
| P1-T03 | Create revalidation utilities | IMPL | `lib/cache/revalidate.ts` (`invalidateChat`, `refreshChat`, etc.) | P1-T02 | M |
| P1-T04 | Create cache-through helper | IMPL | `lib/cache/with-cache.ts` | P1-T02 | S |
| P1-T05 | Create user data access | IMPL | `lib/data/user.ts` (`getUserByEmail`, `createUser`) | P0-T04 | S |
| P1-T06 | Create chat data access | IMPL | `lib/data/chat.ts` (CRUD + `getChatWithMessages`) | P0-T04, P1-T02 | L |
| P1-T07 | Create message data access | IMPL | `lib/data/message.ts` (`saveMessages`, `deleteTrailingMessages`) | P0-T04 | M |
| P1-T08 | Create artifact data access | IMPL | `lib/data/artifact.ts` (NOT document.ts — `getArtifactById`, `saveArtifactVersion`) | P0-T04 | L |
| P1-T09 | Create vote data access | IMPL | `lib/data/vote.ts` (`getVotesByChatId`, `upsertVote`) | P0-T04 | S |
| P1-T10 | Create suggestion data access | IMPL | `lib/data/suggestion.ts` (`getSuggestionsByArtifactId`, `saveSuggestions`) | P0-T04 | S |
| P1-T11 | Create AI provider registry | IMPL | `lib/ai/registry.ts` (conditional: google, openai, openrouter — NO vercel-gateway) | P0-T01 | M |
| P1-T12 | Create AI provider wrapper | IMPL | `lib/ai/provider.ts` (`myProvider` with reasoning middleware) | P1-T11 | M |
| P1-T13 | Create test fixtures | IMPL | `tests/fixtures/chat.ts`, `tests/fixtures/artifact.ts`, `tests/fixtures/user.ts`, `tests/fixtures/vote.ts` | P0-T16 | M |
| P1-T14 | Verification gate G01 | VERIFY | — | P1-T01..T13 | S |

**Exit Criteria:**
- [ ] All `lib/data/*.ts` functions type-check with Drizzle schema
- [ ] `lib/cache/revalidate.ts` exports both `invalidate*` (SA) and `refresh*` (RH) functions
- [ ] `lib/ai/registry.ts` has NO `vercel-gateway` provider
- [ ] `lib/data/artifact.ts` (NOT `document.ts`) — zero "document" identifiers
- [ ] `pnpm typecheck` passes

**Verification:** `pnpm typecheck && pnpm lint`

---

## Phase 2 — Auth Vertical

**Objective:** Implement complete authentication — session resolution, login/register/logout, guest bootstrap, auth provider, auth pages, and proxy wiring.

**Entry State:** P1 complete — data layer ready, cache wired, user CRUD available.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P2-T01 | Create session resolution | IMPL | `lib/auth/session.ts` (`getAppSession()`: cookies → session) | P1-T05 | M |
| P2-T02 | Create auth types + schemas | IMPL | `features/auth/types/auth.types.ts`, `features/auth/schemas/auth.schema.ts` | P0-T05 | S |
| P2-T03 | Create guest bootstrap | IMPL | `features/auth/lib/guest.ts` (JWT creation, token rotation), `features/auth/lib/session.ts` | P2-T01 | M |
| P2-T04 | Create auth actions | IMPL | `features/auth/actions/login.ts`, `features/auth/actions/register.ts`, `features/auth/actions/logout.ts` | P2-T01, P2-T02 | M |
| P2-T05 | Create auth form | IMPL | `features/auth/components/auth-form.tsx` (`mode` prop, `useActionState`) | P2-T04 | L |
| P2-T06 | Create auth provider | IMPL | `features/auth/components/session-provider.tsx` (session context, guest bootstrap effect) | P2-T03 | M |
| P2-T07 | Create auth layout + pages | IMPL | `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/error.tsx` | P2-T05 | M |
| P2-T08 | Wire root layout with auth | INTEG | Update `app/layout.tsx` to use `SessionProvider(session)` | P2-T06 | M |
| P2-T09 | Verification gate G02 | VERIFY | — | P2-T01..T08 | S |

**Exit Criteria:**
- [ ] `getAppSession()` resolves from cookies (Supabase + guest fallback)
- [ ] Login/register forms render and submit via `useActionState`
- [ ] Auth actions return `ActionResult<T>` (never throw)
- [ ] Root layout passes server-fetched session to `SessionProvider`
- [ ] `proxy.ts` redirects unauthenticated users to `/login`

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Phase 3 — Chat Core Vertical

**Objective:** Implement the complete chat experience — AI integration, settings, streaming, message display, input, tool stubs, ChatShell + ChatSessionContext decomposition, server layout, and chat pages.

**Entry State:** P2 complete — auth works, session resolution functional, data layer ready.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P3-T01 | Create AI model catalog | IMPL | `lib/ai/models.ts`, `features/models/lib/models.ts` (`listChatModels` with `use cache`), `features/models/types/model.types.ts` | P1-T12 | M |
| P3-T02 | Create system prompts + provider options | IMPL | `lib/ai/prompts.ts` (`composeSystemPrompt`), `lib/ai/provider-options.ts` | P3-T01 | M |
| P3-T03 | Create tool enablement + title gen | IMPL | `lib/ai/tools.ts` (`getEnabledTools`), `lib/ai/title.ts` (`generateTitle`) | P1-T12 | S |
| P3-T04 | Create artifact handler registry | IMPL | `lib/ai/artifact-handlers.ts` (`registerArtifactHandler`, `getArtifactHandler`) | P0-T06 | M |
| P3-T05 | Create chat types + schemas | IMPL | `features/chat/types/chat.types.ts` (`ChatSessionValue`, `ArtifactDataPart`), `features/chat/schemas/chat.schema.ts` | P0-T06 | M |
| P3-T06 | Create settings store + hooks | IMPL | `features/settings/hooks/use-settings.ts` (`useSyncExternalStore` + localStorage), `features/settings/types/settings.types.ts` | P0-T07 | M |
| P3-T07 | Create settings panel + provider | IMPL | `features/settings/components/settings-panel.tsx` (sheet UI) | P3-T06 | M |
| P3-T08 | Create chat context | IMPL | `features/chat/hooks/use-chat-session-context.ts` (`ChatSessionContext` + `useChatSessionContext()`) | P3-T05 | S |
| P3-T09 | Create chat pure functions | IMPL | `features/chat/lib/chat-callbacks.ts`, `features/chat/lib/process-stream-deltas.ts` | P3-T05 | M |
| P3-T10 | Create ChatStreamProvider | IMPL | `features/chat/components/chat-stream-provider.tsx` (split state/dispatch contexts, RAF batching) | P3-T05 | L |
| P3-T11 | Create useChatSession hook | IMPL | `features/chat/hooks/use-chat-session.ts` (`useChat` config + callbacks, ~120 lines) | P3-T08, P3-T09, P3-T10 | L |
| P3-T12 | Create chat side-effect hooks | IMPL | `features/chat/hooks/use-chat-side-effects.ts`, `features/chat/hooks/use-scroll-to-bottom.ts` | P3-T08 | M |
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
| P3-T23 | Create chat API route | IMPL | `app/api/chat/route.ts` (`createUIMessageStream`, `streamText`, tools, `onFinish` with revalidation) | P3-T13, P3-T02 | L |
| P3-T24 | Create chat layout (SERVER) | INTEG | `app/(chat)/layout.tsx` (SERVER: SidebarProvider, Suspense→SidebarSkeleton stub, PendingChatsProvider stub, NoticeHandler) | P3-T14, P0-T11 | M |
| P3-T25 | Create chat pages | IMPL | `app/(chat)/page.tsx` (new chat), `app/(chat)/chat/[id]/page.tsx` (existing: `Promise.all`, `use cache`) | P3-T21, P3-T10 | M |
| P3-T26 | Create chat error boundary | IMPL | `app/(chat)/error.tsx` | P0-T08 | S |
| P3-T27 | Verification gate G03 | VERIFY | — | P3-T01..T26 | S |

**Exit Criteria:**
- [ ] ChatShell creates `ChatSessionContext.Provider` (~60 lines, NOT a God Component)
- [ ] `useChatSession` encapsulates `useChat` config + callbacks
- [ ] `ChatStreamProvider` uses split contexts (state/dispatch) with RAF batching
- [ ] `processStreamDelta()` is a pure testable function
- [ ] `StreamBridge` is a thin bridge (~20 lines)
- [ ] Chat API route uses `createUIMessageStream` with `onFinish` revalidation
- [ ] Title is AWAITED server-side before stream close (no polling)
- [ ] System prompt uses "artifact" (not "document")
- [ ] Chat tools: `createArtifact`, `updateArtifact` (not createDocument/updateDocument)
- [ ] Handler registry in `lib/ai/artifact-handlers.ts` (dependency inversion)
- [ ] Chat pages use `'use cache'` + `cacheTag` for fetching
- [ ] `pnpm typecheck && pnpm lint` pass

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Phase 4 — Artifacts Vertical

**Objective:** Implement the complete artifact system — `useSyncExternalStore` store, handler implementations, editors, artifact panel, versioning, and API routes.

**Entry State:** P3 complete — chat streams, StreamBridge processes deltas, handler registry exists, tool stubs call registry.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P4-T01 | Create artifact types + schemas | IMPL | `features/artifacts/types/artifact.types.ts`, `features/artifacts/schemas/artifact.schema.ts` | P0-T06 | M |
| P4-T02 | Create artifact store | IMPL | `features/artifacts/lib/artifact-store.ts` (`useSyncExternalStore`: getSnapshot, subscribe, setState, reset) | P4-T01 | L |
| P4-T03 | Create artifact hook aliases | IMPL | `features/artifacts/hooks/use-artifact.ts`, `features/artifacts/hooks/use-artifact-selector.ts` (re-exports from store) | P4-T02 | S |
| P4-T04 | Create text + code handlers | IMPL | `features/artifacts/handlers/text-handler.ts` (`streamText` → `artifact-textDelta` APPEND), `features/artifacts/handlers/code-handler.ts` (`streamObject` → `artifact-codeDelta` REPLACE) | P3-T04, P1-T12 | M |
| P4-T05 | Create sheet + image handlers | IMPL | `features/artifacts/handlers/sheet-handler.ts` (`streamObject` → `artifact-sheetDelta` REPLACE), `features/artifacts/handlers/image-handler.ts` | P3-T04 | M |
| P4-T06 | Create handler registration | IMPL | `features/artifacts/handlers/index.ts` (side-effect: registers all handlers into `lib/ai/artifact-handlers.ts`) | P4-T04, P4-T05 | S |
| P4-T07 | Create text editor | IMPL | `features/artifacts/components/editors/text-editor.tsx` (Tiptap + suggestions extension) | P4-T02 | L |
| P4-T08 | Create code editor | IMPL | `features/artifacts/components/editors/code-editor.tsx` (CodeMirror + Pyodide execution) | P4-T02 | L |
| P4-T09 | Create sheet editor | IMPL | `features/artifacts/components/editors/sheet-editor.tsx` (react-data-grid + PapaParse CSV) | P4-T02 | L |
| P4-T10 | Create image editor | IMPL | `features/artifacts/components/editors/image-editor.tsx` (base64/URL display) | P4-T02 | S |
| P4-T11 | Create artifact panel | IMPL | `features/artifacts/components/artifact-panel.tsx` (main container, kind-specific editor switch) | P4-T07..T10, P4-T03 | L |
| P4-T12 | Create artifact support components | IMPL | `features/artifacts/components/artifact-actions.tsx`, `artifact-close-button.tsx` (`useArtifactSelector`), `version-footer.tsx` | P4-T03 | M |
| P4-T13 | Create artifact error boundary | IMPL | `features/artifacts/components/artifact-error-boundary.tsx` | P0-T08 | S |
| P4-T14 | Create artifact preview | IMPL | `features/artifacts/components/artifact-preview.tsx` (inline in messages, uses `useArtifactSelector`) | P4-T03 | M |
| P4-T15 | Create artifact API route | IMPL | `app/api/artifact/route.ts` (POST: save user edits, `revalidateTag('artifact:{id}', 'max')`) | P1-T08, P1-T03 | M |
| P4-T16 | Create suggestions API route | IMPL | `app/api/suggestions/route.ts` (GET: suggestions by artifactId) | P1-T10 | M |
| P4-T17 | Wire artifact panel into ChatShell | INTEG | Update `features/chat/components/chat-shell.tsx` to conditionally render `ArtifactPanel` + wire `StreamBridge` → `artifactStore` | P4-T11, P3-T20 | M |
| P4-T18 | Verification gate G04 | VERIFY | — | P4-T01..T17 | S |

**Exit Criteria:**
- [ ] `artifactStore` uses `useSyncExternalStore` (NOT SWR synthetic key)
- [ ] `useArtifactSelector(s => s.isVisible)` re-renders ONLY on visibility change
- [ ] All 4 handlers register via side-effect import in `handlers/index.ts`
- [ ] Handler registry uses `getArtifactHandler(kind)` pattern (dependency inversion)
- [ ] Text handler uses APPEND delta, code/sheet use REPLACE delta
- [ ] Artifact API route calls `revalidateTag('artifact:{id}', 'max')` on save
- [ ] Suggestions API uses `artifactId` parameter (not `artifactId`)
- [ ] All files/types use "artifact" naming (zero "document")
- [ ] `pnpm typecheck && pnpm lint` pass

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Phase 5 — Sidebar & Navigation

**Objective:** Implement the server-rendered sidebar with client pagination, optimistic chat operations, chat history, and user navigation.

**Entry State:** P4 complete — chat + artifacts work end-to-end, layout has sidebar stub.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P5-T01 | Create sidebar types | IMPL | `features/sidebar/types/sidebar.types.ts` | P0-T07 | S |
| P5-T02 | Create PendingChatsProvider | IMPL | `features/sidebar/hooks/use-pending-chats.ts` (context: `add`, `remove`, `updateTitle`, `markConfirmed`) | P0-T07 | L |
| P5-T03 | Create useSidebarHistory hook | IMPL | `features/sidebar/hooks/use-sidebar-history.ts` (`useSWRInfinite` wrapper) | P5-T01 | M |
| P5-T04 | Create SidebarHistoryItem | IMPL | `features/sidebar/components/sidebar-history-item.tsx` (link + rename + delete dropdown) | P5-T01 | M |
| P5-T05 | Create SidebarHistoryClient | IMPL | `features/sidebar/components/sidebar-history-client.tsx` (initial data from server + SWR pagination + optimistic merge) | P5-T02, P5-T03, P5-T04 | L |
| P5-T06 | Create SidebarUserNav | IMPL | `features/sidebar/components/sidebar-user-nav.tsx` (avatar, theme toggle, logout) | P2-T04 | M |
| P5-T07 | Create SidebarSkeleton | IMPL | `features/sidebar/components/sidebar-skeleton.tsx` (PPR fallback, SERVER) | P0-T11 | S |
| P5-T08 | Create SidebarShell (SERVER) | IMPL | `features/sidebar/components/sidebar-shell.tsx` (async, `use cache` + `cacheTag('chats:{userId}')`, renders structure) | P1-T06, P5-T05, P5-T06 | L |
| P5-T09 | Create rename chat action | IMPL | `features/sidebar/actions/rename-chat.ts` (Server Action + `updateTag`) | P1-T06, P1-T03 | S |
| P5-T10 | Create history API route | IMPL | `app/api/history/route.ts` (GET: cursor-based paginated chat history) | P1-T06 | M |
| P5-T11 | Wire sidebar into chat layout | INTEG | Update `app/(chat)/layout.tsx`: replace stub with `SidebarProvider` → `Suspense` → `SidebarShell`, `PendingChatsProvider` | P5-T08, P5-T02 | L |
| P5-T12 | Verification gate G05 | VERIFY | — | P5-T01..T11 | S |

**Exit Criteria:**
- [ ] `SidebarShell` is a SERVER component with `'use cache'` + `cacheTag`
- [ ] Initial 20 chats fetched server-side (no client waterfall)
- [ ] `SidebarHistoryClient` uses `useSWRInfinite` only for pagination (not initial load)
- [ ] `PendingChatsProvider` provides `add`, `remove`, `updateTitle` operations
- [ ] Title flows via single channel: `chat-title` stream → `PendingChats.updateTitle()` (no polling, no window events)
- [ ] `SidebarSkeleton` renders as Suspense fallback
- [ ] Chat layout is a SERVER component (no `'use client'` on layout)

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Phase 6 — Enhancements

**Objective:** Implement all secondary features — voting, model selector, visibility toggle, file upload, weather UI, and health check.

**Entry State:** P5 complete — full navigation works, chat + artifacts + sidebar functional.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P6-T01 | Create voting types + action | IMPL | `features/voting/types/vote.types.ts`, `features/voting/actions/vote.ts` (Server Action + `useOptimistic` + `updateTag`) | P1-T09 | M |
| P6-T02 | Create VoteButtons + useVotes | IMPL | `features/voting/components/vote-buttons.tsx`, `features/voting/hooks/use-votes.ts` | P6-T01 | M |
| P6-T03 | Wire voting into messages | INTEG | Update `message.tsx` to render `VoteButtons`, add `VoteResolver` to chat pages | P6-T02, P3-T15, P3-T25 | M |
| P6-T04 | Create ModelSelector | IMPL | `features/models/components/model-selector.tsx` (grouped by provider, cookie + localStorage persistence) | P3-T01 | L |
| P6-T05 | Wire model selector into ChatHeader | INTEG | Update `chat-header.tsx` to render `ModelSelector` | P6-T04, P3-T19 | S |
| P6-T06 | Create visibility types + action | IMPL | `features/visibility/types/visibility.types.ts`, `features/visibility/actions/update-visibility.ts` (SA + `updateTag`) | P1-T06, P1-T03 | M |
| P6-T07 | Create VisibilitySelector | IMPL | `features/visibility/components/visibility-selector.tsx` (`useOptimistic` toggle) | P6-T06 | M |
| P6-T08 | Wire visibility into chat page | INTEG | Update `chat/[id]/page.tsx` to render `VisibilitySelector` | P6-T07, P3-T25 | S |
| P6-T09 | Create file upload route | IMPL | `app/api/files/upload/route.ts` (multipart → Vercel Blob) | P2-T01 | M |
| P6-T10 | Create PreviewAttachment | IMPL | `features/chat/components/preview-attachment.tsx` (file thumbnail) | P3-T18 | S |
| P6-T11 | Wire file upload into MultimodalInput | INTEG | Update `multimodal-input.tsx` with attachment handling + `PreviewAttachment` | P6-T09, P6-T10 | M |
| P6-T12 | Create Weather component | IMPL | `components/weather.tsx` (weather tool result renderer) | P3-T13 | S |
| P6-T13 | Create health check route | IMPL | `app/api/health/route.ts` (DB + Redis ping) | P1-T02 | S |
| P6-T14 | Verification gate G06 | VERIFY | — | P6-T01..T13 | S |

**Exit Criteria:**
- [ ] Voting uses Server Action + `useOptimistic` (NOT `PATCH /api/vote`)
- [ ] Visibility uses Server Action + `updateTag` on both chat and chat-list tags
- [ ] `ModelSelector` persists to cookie (server-readable) + localStorage
- [ ] File upload returns blob URL, preview renders thumbnail
- [ ] Health check pings DB + Redis
- [ ] All Server Actions return `ActionResult<T>` (never throw)

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Phase 7 — Polish & Production

**Objective:** Finalize error boundaries, accessibility, responsive design, instrumentation, testing, and import boundary enforcement for production readiness.

**Entry State:** P6 complete — all features functional.

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P7-T01 | Finalize error boundaries | IMPL | Polish `app/global-error.tsx`, `app/(chat)/error.tsx`, `app/(auth)/error.tsx` | P0-T13, P3-T26, P2-T07 | M |
| P7-T02 | Finalize artifact error boundary | IMPL | Polish `features/artifacts/components/artifact-error-boundary.tsx` | P4-T13 | S |
| P7-T03 | Add accessibility + keyboard nav | IMPL | ARIA attributes across chat, sidebar, artifact components (~8 files) | P3-T21, P5-T11 | M |
| P7-T04 | Verify responsive design | VERIFY | Mobile layout adjustments across chat, sidebar, artifact (~5 files) | P5-T11 | M |
| P7-T05 | Finalize instrumentation | IMPL | Complete `instrumentation.ts`, `instrumentation-client.ts` (OpenTelemetry) | P0-T15 | M |
| P7-T06 | Create E2E test specs | IMPL | `tests/e2e/chat.spec.ts`, `artifacts.spec.ts`, `auth.spec.ts`, `sidebar.spec.ts` | all phases | L |
| P7-T07 | Create integration tests | IMPL | `tests/integration/chat-flow.test.ts`, `artifact-flow.test.ts`, `auth-flow.test.ts`, `sidebar-flow.test.ts` | all phases | L |
| P7-T08 | Create stream test utility | IMPL | `tests/utils/stream.ts` (`collectStreamEvents`), `tests/mocks/ai.ts`, `tests/mocks/fetch.ts` | P0-T16 | M |
| P7-T09 | Verify import boundaries | VERIFY | Run `scripts/check-imports.mjs` — zero violations | P0-T17 | S |
| P7-T10 | Verify "artifact" naming | VERIFY | `grep -r "document"` in code — zero results (excl. .next-docs, oldapp, node_modules) | all phases | S |
| P7-T11 | Verify no credit/gateway logic | VERIFY | `grep -rE "credit\|gateway\|quota\|entitlement\|AppUsage\|activate_gateway"` — zero results | all phases | S |
| P7-T12 | Full build verification | VERIFY | `pnpm build` — clean production build | all phases | M |
| P7-T13 | Verification gate G07 (final) | VERIFY | — | P7-T01..T12 | S |

**Exit Criteria:**
- [ ] All 3 error boundaries render standalone with recovery actions
- [ ] `scripts/check-imports.mjs` reports zero violations
- [ ] Zero occurrences of "document" in code identifiers
- [ ] Zero occurrences of credit/gateway/quota terminology
- [ ] `proxy.ts` exists (not `middleware.ts`)
- [ ] `pnpm format && pnpm typecheck && pnpm lint` all pass
- [ ] `pnpm build` succeeds cleanly
- [ ] E2E test specs cover: auth flow, chat send/receive, artifact create/edit, sidebar navigation

**Verification:**
```bash
pnpm format && pnpm typecheck && pnpm lint
node scripts/check-imports.mjs
pnpm build
pnpm test:unit
```

---

## Task Count Summary

| Phase | Name | Tasks | Est. Files | Focus |
|---|---|---|---|---|
| P0 | Scaffold & Infrastructure | 18 | ~55 | Config, types, errors, utils, UI primitives, root layout, proxy |
| P1 | Data Foundation | 14 | ~22 | DB, cache, data access, AI providers, test fixtures |
| P2 | Auth Vertical | 9 | ~14 | Session, auth actions, auth UI, proxy wiring |
| P3 | Chat Core Vertical | 27 | ~42 | AI integration, settings, streaming, ChatShell, messages, input, pages |
| P4 | Artifacts Vertical | 18 | ~28 | Store, handlers, editors, artifact panel, API routes |
| P5 | Sidebar & Navigation | 12 | ~12 | Server-rendered sidebar, optimistic chats, history pagination |
| P6 | Enhancements | 14 | ~17 | Voting, model selector, visibility, file upload, weather |
| P7 | Polish & Production | 13 | ~20 | Error boundaries, a11y, tests, verification, build |
| **Total** | | **125** | **~210** | |

---

## Key Architectural Decisions (Enforced Throughout)

| Decision | Enforcement |
|---|---|
| `proxy.ts` NOT `middleware.ts` | P0-T14 creates it; P7-T11 verifies no middleware.ts |
| "artifact" EVERYWHERE | Every task uses artifact naming; P7-T10 grep verification |
| No credit/gateway/quota | No tasks create credit logic; P7-T11 grep verification |
| Server layout + client islands | Chat layout is SERVER (P3-T24); ChatShell is `'use client'` (P3-T21) |
| ChatShell ~60 lines (not God Component) | P3-T21 creates thin orchestrator; logic in hooks/pure functions |
| `useSyncExternalStore` for artifact state | P4-T02 creates store; P4-T03 creates selector hooks |
| `revalidateTag`/`updateTag` after EVERY mutation | P1-T03 creates utilities; every SA/RH task uses them |
| Handler registry (dependency inversion) | P3-T04 creates registry; P4-T06 registers handlers; P3-T13 tools consume via registry |
| Providers scoped as siblings | P3-T24 places SidebarProvider at layout; P3-T25 places ChatStreamProvider at page |
| Single-channel title delivery | P3-T23 awaits title server-side; P5-T02 receives via `PendingChats.updateTitle()` |
| Import boundaries enforced | P0-T17 creates script; P7-T09 runs verification |

---

## Dependency Graph (Critical Path)

```
P0 ──────────────────────────────────────────────────────────────────►
  └── P1 ────────────────────────────────────────────────────────────►
        └── P2 ──────────────────────────────────────────────────────►
              └── P3 ────────────────────────────────────────────────►
                    ├── P4 ──────────────────────────────────────────►
                    │     └── P5 ────────────────────────────────────►
                    │           └── P6 ──────────────────────────────►
                    │                 └── P7 ────────────────────────►
                    └── P5 (can start after P3-T24 layout stub)
```

**Critical path:** P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7

P5 can begin _partially_ after P3 completes (sidebar needs chat layout stub from P3-T24), and P4 work can overlap with P5 setup.
