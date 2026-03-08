# Flow Map Master Index

> Generated from 57 flow map files in `/post-work/flows/`. Each flow documents a complete application pipeline with entry/exit points, bottlenecks, waste, and simplification opportunities.

---

## Summary

| Metric | Count |
|--------|-------|
| Total flows documented | 57 |
| Critical bottlenecks identified | 28 |
| Waste items identified | 71 |
| Simplification opportunities | 62 |
| Dead code references | 12 |
| Cross-flow patterns | 12 |

### Flow Categories

| Category | Flows | Description |
|----------|-------|-------------|
| Infrastructure | 6 | Request pipeline, API routes, CSRF, rate limiting, file upload, health check |
| Auth | 6 | Login, register, logout, guest lifecycle, session resolution, CSRF |
| Chat | 8 | API pipeline, send message, persistence, title gen, tool execution, model resolution, delete, delete trailing |
| Data Layer | 8 | Artifacts, chat, DB connection, messages, pagination, persistence retry, users, votes |
| Artifact | 10 | Creation, editor loading, handler registry, panel lifecycle, restore, save, store, suggestions, update, version nav |
| Cache | 2 | Cache layer, cache invalidation |
| Render | 7 | First paint, hydration, loading states, metadata, sidebar, streaming, error boundaries, existing chat, auth pages |
| State | 8 | Artifact store, chat stream, form, pending chats, server hydration, session, settings store, sidebar history, voting |

---

## Critical Bottlenecks

The highest-impact performance bottlenecks across all flows, ranked by blast radius (how many flows they affect).

| # | Bottleneck | Affected Flows | Impact | Severity |
|---|-----------|----------------|--------|----------|
| B1 | **`getAppSession()` Supabase `getUser()` HTTP round-trip on every request** | request-pipeline, api-route-pipeline, auth-session-resolution, chat-api-pipeline, render-first-paint, render-existing-chat, render-sidebar, state-session, state-server-hydration, render-metadata | Adds 50-200ms latency to every authenticated request. Sequential pipeline — nothing can proceed until session resolves. | 🔴 CRITICAL |
| B2 | **Triple JWT verification for guest users** (proxy → rotateGuestToken → resolveGuestSession) | request-pipeline, auth-guest-lifecycle, auth-session-resolution | Same JWT verified 3 times per guest request. Adds ~30-90ms of redundant crypto per request. | 🔴 CRITICAL |
| B3 | **Sequential API pipeline** (CSRF → Auth → Rate Limit → Validate → Execute) | api-route-pipeline, chat-api-pipeline, file-upload | Every POST request traverses 4-5 strictly serial async steps before any business logic executes. | 🟠 HIGH |
| B4 | **Existing chat page sequential await chain** (session → chat → access → messages → models) | render-existing-chat, render-loading-states, state-server-hydration | Up to 500ms blocking time. All data must resolve before any real content replaces skeleton. | 🟠 HIGH |
| B5 | **Artifact DB save blocks stream finish signal** | artifact-creation, artifact-update, artifact-save, chat-tool-execution, chat-persistence | DB INSERT in execute callback / onFinish delays stream completion, blocking client-side finalization. | 🟠 HIGH |
| B6 | **REPLACE streaming sends full content on every delta** (code/sheet artifacts) | artifact-handler-registry, artifact-update, artifact-editor-loading | N full-content replacements transmitted for code/sheet types. Bandwidth and processing waste scales with content size. | 🟠 HIGH |
| B7 | **Three-frame pipeline for artifact state** (SSE → RAF batch → StreamBridge effect → store → UI) | state-chat-stream, state-artifact-store, render-streaming | Artifact updates arrive 3 frames (~48ms) after SSE delivery due to context → effect → store indirection. | 🟡 MEDIUM |
| B8 | **Full chat/entity fetch for ownership checks** | chat-delete, chat-delete-trailing, artifact-restore, artifact-save, artifact-update, data-votes | Nearly every mutation fetches a full row (including content) just to compare `userId`. Could be lightweight `SELECT userId` query. | 🟡 MEDIUM |
| B9 | **SidebarShell two-layer Suspense waterfall** (cookies → session + chats) | render-sidebar, render-loading-states, render-first-paint | Outer Suspense blocks on `cookies()`, then inner blocks on `getAppSession()` + `getCachedChats()`. Sequential, not parallel. Double SidebarSkeleton render. | 🟡 MEDIUM |
| B10 | **Model catalog full linear scan for single ID** | chat-model-resolution, chat-api-pipeline | `getAvailableModels()` fetches full catalog, then linear scan to find one model. Capabilities computed up to 3 times per request. | 🟡 MEDIUM |
| B11 | **First-time editor chunk downloads** (TipTap ~100KB+, CodeMirror ~150KB+, Pyodide ~15MB) | artifact-editor-loading, artifact-panel-lifecycle | Cold cache penalty 100-500ms for editors, 15MB WASM for code execution. No loading indicators on dynamic imports. | 🟡 MEDIUM |
| B12 | **onFinish blocks stream close** (persistence retry up to 550ms) | chat-persistence, data-persistence-retry | Retry delays (100+150+300ms) block the stream from closing. Double retry on failure = 6 total attempts. | 🟡 MEDIUM |

---

## Critical Waste

Items consuming resources with zero or near-zero value, ranked by elimination priority.

| # | Waste Item | Location | Type | Priority |
|---|-----------|----------|------|----------|
| W1 | **Triple JWT verification per guest request** — same token verified 3 separate times | auth-guest-lifecycle, request-pipeline | Redundant computation | 🔴 HIGH |
| W2 | **StreamBridge render-null component exists solely to bridge React context → module store** — adds frame of latency, context re-render cycle | state-chat-stream, render-streaming | Unnecessary indirection | 🔴 HIGH |
| W3 | **Full entity fetch for ownership checks** — content-heavy rows fetched just for userId comparison | chat-delete, artifact-restore, artifact-save, artifact-update | Redundant I/O | 🔴 HIGH |
| W4 | **Dead code across data layer** — 8+ unused exported functions | data-users, data-messages, data-votes, cache-invalidation | Dead code | 🟠 MEDIUM |
| W5 | **Environment variable re-computation on every call** — CSRF origins, Supabase cookie base name | csrf-protection, request-pipeline | Redundant computation | 🟠 MEDIUM |
| W6 | **processStreamDelta creates new UIArtifact object on EVERY delta** — hundreds of allocations for text streaming | artifact-creation, state-artifact-store | GC pressure | 🟠 MEDIUM |
| W7 | **Artifact DB save — image handler saves identical content as new version** (no-op update still persists) | artifact-update | Wasted I/O | 🟠 MEDIUM |
| W8 | **Rate limiting INCR+EXPIRE as two serial Redis calls** — could be atomic | rate-limiting | Redundant I/O | 🟠 MEDIUM |
| W9 | **SessionProvider initializes session=null, isLoading=true** — authenticated users briefly appear as guests | state-session, state-server-hydration | UI flash | 🟠 MEDIUM |
| W10 | **Cookie maxAge 7d vs JWT TTL 1h mismatch** — orphans guest data, causes verify-fail+re-mint cycles | auth-guest-lifecycle | Data orphaning | 🟠 MEDIUM |
| W11 | **SidebarSkeleton rendered TWICE** — outer fallback then inner fallback, DOM replacement flash | render-sidebar, render-loading-states | Redundant render | 🟡 LOW |
| W12 | **data.flatMap(page => page.chats) recomputes on every render** — no memoization | state-sidebar-history | Redundant computation | 🟡 LOW |
| W13 | **IntersectionObserver recreated on every loadMore change** — unstable callback dependencies | state-sidebar-history | Redundant allocation | 🟡 LOW |
| W14 | **CSV re-parsed on every streaming delta** for sheet artifacts | artifact-editor-loading | Redundant computation | 🟡 LOW |
| W15 | **registerSchema/loginSchema identical** — duplicated Zod schema definitions | auth-register, state-form | Duplication | 🟡 LOW |

### Dead Code Inventory

| Function | File (probable) | Flows Referencing |
|----------|----------------|-------------------|
| `getUserByEmail` | lib/data/users | data-users |
| `updateUserLastLogin` | lib/data/users | data-users |
| `getUserById` | lib/data/users | data-users |
| `deleteVotesByChatId` | lib/data/votes | data-votes |
| `getMessagesByChatId` | lib/data/messages | data-messages |
| `deleteMessagesByChatId` | lib/data/messages | data-messages |
| `refreshVotes` | features/voting | cache-invalidation |
| `saveMessages` return value | lib/data/messages | data-messages |

---

## Flow Index

### Infrastructure & Middleware

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| HTTP Request Pipeline | `request-pipeline.md` | Browser HTTP request | NextResponse to client | JWT verify every non-public request; 2 async jose ops on guest routes; URL parsing per invocation | isSupabaseAuthCookieName re-derives base name; cookie maxAge/JWT TTL mismatch; dead rate-limit exempt check | Cache `getSupabaseAuthCookieBaseName()` at module level |
| API Route Pipeline | `api-route-pipeline.md` | HTTP to app/api/*/route.ts | HTTP Response (JSON + status) | getAppSession() on every handler; sequential CSRF→Auth→Rate→Validate→Execute | No rate limiting on Artifact POST or GET routes; Supabase client recreated per request; guests get empty suggestions after full auth | Create shared `withApiPipeline()` middleware wrapper |
| CSRF Protection | `csrf-protection.md` | POST request at API Handler | boolean (allow/deny) | new URL() on every POST; allowed origins rebuilt every call | Duplicate entries in origins Set; env var re-computation | Pre-compute allowed origins at module level |
| Rate Limiting | `rate-limiting.md` | checkRateLimit() call | boolean or ActionResult | HTTP to Upstash Redis per check; INCR+EXPIRE as 2 serial commands; headers() async for IP | INCR+EXPIRE non-atomic; unused rateLimitKeys; fixed window burst at boundaries | Atomic Redis EVAL or SET with EX+NX |
| File Upload | `file-upload.md` | POST /api/files/upload | JSON {url, pathname, contentType} | Sequential pipeline; file buffered before validation; Vercel Blob upload | Full file buffer before type check; unreachable contentType fallback | Check Content-Type/Content-Length before parsing FormData |
| Health Check | `health-check.md` | GET /api/health | JSON {status, timestamp, checks} | Real SQL + Redis HTTP (parallel, latency=max) | SELECT 1 doesn't validate schema; hardcoded 1000ms threshold; cache always "degraded" without Redis | Make latency threshold configurable via env var |

### Authentication

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| Login | `auth-login.md` | User submits email+password | Redirect "/" or ActionResult error | 5 sequential async I/O ops; D012 reconciliation on every login | D012 runs for rare edge case; double Zod validation; getClientIp() async | Make D012 reconciliation conditional (first login only) |
| Register | `auth-register.md` | User submits email+password | Redirect or confirmation required | Same sequential chain as login; signUp may send email | registerSchema = identical to loginSchema; confusing "try logging in" UX | Parallel signUp + guest token verification |
| Logout | `auth-logout.md` | Logout server action | Redirect to "/login" | signOut HTTP call; two async cookie ops | Supabase client constructed for guest-only users | Check session type before constructing Supabase client |
| Guest Lifecycle | `auth-guest-lifecycle.md` | Request to guest-eligible route | Token minted/rotated/unchanged/deleted | JWT verified up to 3 TIMES per request | Triple verification; maxAge/TTL mismatch orphans data; dual-write cookie reconstruction | Forward verify result via `x-guest-user-id` header |
| Session Resolution | `auth-session-resolution.md` | getAppSession() call | AppSession or null | Supabase getUser() HTTP on every request; sequential Supabase→guest; cookies() twice | Guests wait for full Supabase check to fail first; Supabase client recreated; read-only setAll no-op | Forward session type hint via `x-session-type` header |
| Auth Guard (render) | `render-auth-pages.md` | /login or /register navigation | Auth form displayed | getAppSession() sole blocking async | AuthGuard runs even with no cookies; Toaster rarely needed | Short-circuit AuthGuard if no Supabase cookies |

### Chat

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| Chat API Pipeline | `chat-api-pipeline.md` | POST /api/chat | SSE Response streaming | Steps 1-4 strictly sequential; DB write before streaming blocks TTFT | Full model catalog for one ID validation; 500 messages fetched+double-converted; no max parts validation | Run rate limit + body parse in parallel |
| Send Message | `chat-send-message.md` | User submits in multimodal input | Messages rendered, artifact updated, sidebar title updated | File upload sequential before send; useChat throttle; sidebar notification sync | setChatStream grows linearly with spread; StreamBridge slice allocates; MessageItem deep-equal O(n) | Parallelize file upload with message send |
| Message Persistence | `chat-persistence.md` | onFinish callback | Messages persisted + cache revalidated | onFinish blocks stream close; retry delays 550ms; DB transaction locks chat | Recovery tombstone duplicates retry; empty attachments array; title race condition | Write persistence to queue (fire-and-forget) |
| Title Generation | `chat-title-generation.md` | isNewChat===true in POST /api/chat | Title in SSE + persisted to DB | 5-second timeout; separate AI model call; must resolve before onFinish | Always uses Google provider regardless of selection; complex closure pattern | Simplify canEmitGeneratedTitle to single Promise |
| Tool Execution | `chat-tool-execution.md` | AI returns tool_call | Tool result → model loop or finish | Artifact DB save blocks finish; getArtifactById roundtrip before generation; requestSuggestions=second AI call | updateArtifact fetches full row for kind/title; content loaded twice conceptually | Artifact DB save fire-and-forget; shared session/ownership middleware |
| Model Resolution | `chat-model-resolution.md` | Model selection → POST body → server | Language model instance to streamText | First getAvailableModels triggers OpenRouter HTTP; full catalog linear scan; reasoning middleware per request | getModelCapabilities computed up to 3x; unnecessary customProvider wrapper; mergeAvailableModels filters every fetch | Pre-compute capabilities in ModelMetadata; use Set for lookup |
| Delete Chat | `chat-delete.md` | deleteChat Server Action | Chat+related data deleted, cache invalidated | FK CASCADE slow for many messages/artifacts; no batching in deleteAllChats | Full Chat fetched for userId check; individual chat cache not invalidated | Lightweight getChatOwnerId query; withChatOwnership helper |
| Delete Trailing | `chat-delete-trailing.md` | User edits a message | Server messages deleted, client trimmed | Server round-trip before client trim; two-phase SELECT+DELETE | Full chat for ownership; createdAt>= may over-delete; redundant cache invalidation | Single SQL with subquery; optimistic client trim |

### Data Layer

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| Artifact Data | `data-artifacts.md` | API routes, AI tool calls | JSON or tool results | handleSave 2 sequential DB calls; GET fetches ALL versions; reads uncached | Redundant fallback to getArtifactById; getArtifactVersions returns full content for list | Remove redundant fallback; getArtifactVersionsMeta for list |
| Chat Data | `data-chat.md` | Actions, handlers, pages | Chat objects, serialized JSON | getChatById uncached on every POST; history no cache; deleteAllChats slow | Stale individual caches after deleteAllChats; minimal transaction overhead | Dual memoization correct; no major simplification |
| DB Connection | `data-db-connection.md` | Module-level singleton init | db (Drizzle) singleton | PgBouncer connection limits; 10s connect_timeout; cold Supabase wake | getPoolConfig called every module eval; no connection health check | Align idle_timeout with PgBouncer server_idle_timeout |
| Message Data | `data-messages.md` | Chat page, streaming, editing | UIMessage[] or DB rows | getMessagesForChatRender uncached; 500 message limit; deleteMessagesByIdAfter two queries | saveMessages returns unused; getMessagesByChatId unused; deleteMessagesByChatId unused | Single subquery delete; reduced ChatRenderMessage type is good |
| Pagination | `data-pagination.md` | GET /api/history, getCachedChats | {chats, hasMore, nextCursor} | Cursor resolution = extra DB per paginated request; over-fetch by 1; full Chat objects | db.query.chats.findFirst for simple PK lookup; complex historyQuerySchema | Compound cursor encoding to eliminate resolution query |
| Persistence Retry | `data-persistence-retry.md` | persistChatResponse() in onFinish | Messages persisted or tombstone | 550ms total retry delay; blocking onFinish; 6 total retry attempts | Recovery tombstone noise; no transient vs permanent error distinction | Error classification to short-circuit permanent failures (FK errors) |
| User Data | `data-users.md` | Auth flows, user lookups | User objects as session context | getAppSession on every auth op; ensureGuestUser on every new guest chat | getUserByEmail/updateUserLastLogin unused; getUserById not called; guest user rows never cleaned | Call ensureGuestUser once during guest token creation |
| Vote Data | `data-votes.md` | voteOnMessage (write), page (read) | Votes as {messageId, type} | Sequential getChatById then getMessageById; no pagination on reads | Full Vote objects returned; deleteVotesByChatId unused | Parallelize getChatById + getMessageById with Promise.all |

### Artifacts

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| Artifact Creation | `artifact-creation.md` | AI invokes createArtifact tool | Panel visible, persisted, SWR populated | DB write blocks execute callback; SWR fetch waterfall after finish; RAF 16ms batching | processStreamDelta new UIArtifact on every delta; SWR re-fetch partially redundant; 4 separate prelude parts | Merge 4 prelude parts into single artifact-open event |
| Editor Loading | `artifact-editor-loading.md` | ArtifactPanelEditor renders | Editor mounted with content, save wired | First-time chunk download (TipTap/CodeMirror/Pyodide); CodeMirror 5-package Promise.all; full state recreation on extension change | onSaveContent triggers full editor rebuild; CSV re-parsed per delta; no loading indicator; TextEditor memo forces re-render during stream | Add loading components to dynamic(); use CodeMirror Compartment |
| Handler Registry | `artifact-handler-registry.md` | Module evaluation (side-effect import) | 4 handlers registered in Map | Side-effect import adds cold start; REPLACE sends full content per delta | Image handler registered but returns ""; each intermediate REPLACE fully transmitted | REPLACE with delta compression; use Record instead of Map |
| Panel Lifecycle | `artifact-panel-lifecycle.md` | isVisible→true in store | Panel unmounted, focus restored, timers cleared | ArtifactPanel chunk loads on first page load; RAF focus 16ms; SWR activation gap | Eager chunk load on every page visit; preserved state on close not useful; always fullscreen | Gate `<ArtifactPanel/>` behind `useArtifactSelector(s => s.isVisible)` |
| Restore | `artifact-restore.md` | User clicks "Restore this version" | Later versions deleted, SWR refreshed | getArtifactById before delete; DELETE potentially large; SWR full re-fetch | Full content fetched for userId check; +1ms timestamp offset fragile | Lightweight ownership query; use gt() instead of gte+offset |
| Save | `artifact-save.md` | User edits content in editor | New version persisted, SWR optimistically updated | fetch+DB INSERT during 2000ms debounce; ownership check extra query | Ownership re-fetches full row; content comparison per keystroke; sheet no debounce | Skip ownership check for loaded artifacts; add sheet debounce |
| Suggestions | `artifact-suggestions.md` | AI invokes requestSuggestions tool | Suggestions as TipTap decorations | streamObject for up to 5 sequential; linear scan findTextPositions; saveSuggestions deferred | Each suggestion creates new array (spread); projectWithPositions re-runs on every change; createRoot per widget | Trust server positions; skip double position resolution |
| Update | `artifact-update.md` | AI invokes updateArtifact tool | Updated content, new version persisted | getArtifactById blocks before streaming; saveArtifactVersion blocks finish; deferred clear whitespace buffering | Image handler no-op saves identical content; N full-content replacements for code/sheet | Skip intermediate REPLACE; add NOOP for image handler |
| Version Navigation | `artifact-version-nav.md` | User interacts with version controls | Selected version in read-only mode | SWR inactive until streaming finishes; .reverse() O(n) per update; CodeEditor full rebuild per version | Client reverses array (server could return ASC); version sync runs frequently; no content memoization | Server accept order param; lazy-load version content |
| Artifact Store | `state-artifact-store.md` | StreamBridge.onArtifactDelta() | UI reflects current artifact state | emitChange() iterates all listeners; N store updates per RAF batch | Per-delta setState in loop (10=10 updates, only last matters); useArtifact() full snapshot sub; wrapper object GC | Batch deltas → single setState per RAF batch |

### Cache

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| Cache Layer | `cache-layer.md` | 'use cache' directive in functions | Cached data to RSC pipeline | cacheLife('seconds') frequent revalidation; model catalog first call triggers network | withCache vs direct pattern inconsistency; votes tag may invalidate across users | Standardize on one cache pattern |
| Cache Invalidation | `cache-invalidation.md` | Server Actions / Route Handlers | Cache tags invalidated | updateTag cold cache miss; revalidateTag stale to current requestor | refreshVotes() defined but never used (dead code); deleteChat doesn't invalidate individual chat tag | Remove refreshVotes(); add invalidateChat to deleteChat |

### Render

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| First Paint | `render-first-paint.md` | `/` navigation | New-chat UI (sidebar+header+greeting+input) | page.tsx awaits models behind loading.tsx; cookies() forces request-time eval; SidebarShell sequential awaits; Supabase getUser() round-trip | ThemeProvider/TooltipProvider always hydrated; ChatLayoutFallback potential SidebarProvider re-mount | Remove unused `_session` param from getDefaultModel |
| Hydration | `render-hydration.md` | Server HTML arrives | Fully interactive app | React JS bundle size; SessionProvider promise resolution; useSyncExternalStore overhead when visible | SidebarUserNav mounted guard extra render; useScrollToBottom on empty chat; adaptive throttle during hydration | Remove dead non-promise code path from SessionProvider |
| Loading States | `render-loading-states.md` | loading.tsx as Suspense fallbacks | Appropriate skeleton per route | Double SidebarSkeleton; existing chat blocks on all data; no progressive message rendering | Auth loading.tsx redundant with layout Suspense; hardcoded defaultOpen=true layout shift | Collapse sidebar Suspense boundaries into one |
| Metadata | `render-metadata.md` | generateMetadata calls | `<title>` + `<meta>` in `<head>` | Existing chat needs session+chat before head streaming; cold cache DB roundtrip | Auth layout metadata never reaches browser | React.cache pattern already efficient; no major change |
| Sidebar Render | `render-sidebar.md` | ChatLayout → ChatLayoutShell → SidebarShell | Interactive sidebar with history | Two-layer Suspense waterfall; cold cache DB hit; SWR focus revalidation flash | Double SidebarSkeleton render; SidebarUserNav empty flash; pendingToChat fake fields | Collapse two-layer Suspense into one |
| Streaming Render | `render-streaming.md` | sendMessage() → SSE | Message rendered, artifacts updated | File upload sequential; useChat throttle; StreamBridge O(n) per batch; ArtifactPanel cold chunk load | StreamBridge subscribes with no artifacts; ChatStreamProvider naming mismatch; JSON-parsed usage | Skip StreamBridge processing with fast ref check |
| Error Boundaries | `render-error-boundaries.md` | Runtime error during render/fetch/action | Contextual error page | Global error replaces entire page; chat error replaces all content | All boundaries log to console only; error.digest exposed to users | Shared ErrorFallback component |
| Existing Chat | `render-existing-chat.md` | /chat/[id] navigation | Two-column layout with messages | Sequential await chain (5 steps); getAppSession network; cold cache misses; 500 messages in-memory | Models fetched for readonly chats; StreamBridge for readonly chats | Inline getVisibleChat; guest vote short-circuit |
| Auth Pages | `render-auth-pages.md` | /login or /register | Centered auth form | getAppSession() sole blocking async | AuthGuard runs with no cookies; Toaster rarely needed | Short-circuit if no Supabase cookies |

### State Management

| Flow | File | Entry | Exit | Bottlenecks | Waste | Top Simplification |
|------|------|-------|------|-------------|-------|---------------------|
| Artifact Store | `state-artifact-store.md` | StreamBridge/ChatShell calls setState | UI reflects artifact state | emitChange sync to all listeners; N updates per RAF batch | Per-delta setState loop; useArtifact() full snapshot; wrapper object GC | Accumulate → single setState per batch |
| Chat Stream | `state-chat-stream.md` | sendMessage → SSE connection | Stream data distributed, cleared on finish | RAF 1-frame latency; StreamBridge effect +1 frame; three-frame pipeline total | StreamBridge exists as context→store bridge; double spread; chatStream grows unbounded | Eliminate StreamBridge — onData writes to artifactStore directly |
| Form State | `state-form.md` | /login or /register visit | Redirect or error/success state | Server action 200-1000ms; redirect throws special error | Double Zod validation; unused neutral prevState; D012 every login | AuthFormState as discriminated union |
| Pending Chats | `state-pending-chats.md` | First message in new chat | Optimistic sidebar → server-backed | Reconciliation O(n*m); SWR revalidation timing; single title event | reservedIds never cleaned; overlay creates new objects; pendingToChat fake fields | Collapse two-phase confirmation to one; trigger SWR mutate() |
| Server Hydration | `state-server-hydration.md` | Server component render | Hydrated client tree | getAppSession critical path; cold cache DB roundtrip; sidebar waterfalls; metadata serial | SessionProvider brief guest flash; getVisibleChat extra abstraction; convertToUIMessages no cache | React 19 use() for session; lift ChatStreamProvider to layout |
| Session State | `state-session.md` | ChatLayout renders SessionProvider | {session, isLoading, isGuest} via useSession() | getAppSession Supabase round-trip; router.refresh() full tree re-render; onAuthStateChange all events | isGuest true during loading; try/catch swallows init errors; sequential resolution wastes guest time | React 19 use(); filter TOKEN_REFRESHED from refresh; parallel Promise.any |
| Settings Store | `state-settings-store.md` | Module load or updateSettings() | Settings in API requests, cross-tab synced | localStorage.setItem sync disk write; parseStoredSettings merges+Zod every read; storage event fires for all keys | Identity selector overhead; full settings sub for API-only fields; double Zod on write | Direct useSyncExternalStore for useSettings() |
| Sidebar History | `state-sidebar-history.md` | SidebarShell → SWR fallback → infinite scroll | Scrollable date-grouped chat list | revalidateFirstPage:false stale data; flatMap no memo; IntersectionObserver recreated; groupChatsByDate per change | Client-side nextCursor inference; no abort controller; filter runs with empty deletedIds; retry revalidates all | Stabilize loadMore with useCallback+ref; memoize flatMap |
| Voting | `state-voting.md` | ExistingChatPage starts votesPromise | Per-message vote state with optimistic updates | useLayoutEffect sync after mutations; hasVoteMapChanged O(n); VoteResolver extra render cycle | Vote objects with userId:""; VotesStore for new chats; EMPTY_VOTES_STORE defensive; discarded isPending | VoteResolver sync during render; single context |

---

## Cross-Flow Patterns

### Pattern 1: Session Resolution as Universal Bottleneck
**Scope**: 15+ flows  
**Description**: `getAppSession()` is called in nearly every server-side flow. It always triggers `supabase.auth.getUser()` — an HTTP round-trip to Supabase servers — before trying guest JWT resolution. This is the single most impactful latency source in the application.  
**Mitigation**: Forward session type hint from proxy via `x-session-type` header. For guests, skip Supabase entirely. For auth users, explore Supabase JWT validation without network call.

### Pattern 2: Triple JWT Verification for Guests
**Scope**: request-pipeline, auth-guest-lifecycle, auth-session-resolution  
**Description**: Guest JWT is verified in `proxy.ts`, then again in `rotateGuestToken()`, then a third time in `resolveGuestSession()`. Each verification is a crypto operation (~10-30ms).  
**Mitigation**: Forward verification result from proxy via `x-guest-user-id` header. Downstream code trusts the proxy's verification.

### Pattern 3: Full Entity Fetch for Ownership Validation
**Scope**: chat-delete, chat-delete-trailing, artifact-restore, artifact-save, artifact-update, data-votes  
**Description**: Before any mutation, the full entity (including content, potentially KB of data) is fetched from DB solely to compare `userId`. A `SELECT userId FROM table WHERE id = ?` would suffice.  
**Mitigation**: Create lightweight `getChatOwnerId(chatId)` and `getArtifactOwnerId(artifactId)` queries. Extract `withChatOwnership(chatId, userId)` helper.

### Pattern 4: Sequential Steps That Could Be Parallelized
**Scope**: api-route-pipeline, chat-api-pipeline, auth-login, auth-register, data-votes, chat-send-message  
**Description**: Multiple flows execute independent async operations sequentially: CSRF+Auth+RateLimit, Auth+ChatFetch, getChatById+getMessageById, file upload+message send.  
**Mitigation**: Use `Promise.all()` for independent operations. Create `withApiPipeline()` that parallelizes CSRF+RateLimit while Auth runs.

### Pattern 5: Env Var Re-Computation on Every Call
**Scope**: csrf-protection, request-pipeline, rate-limiting  
**Description**: Values derived from environment variables (CSRF allowed origins, Supabase cookie base name, rate limit keys) are recomputed on every invocation despite never changing at runtime.  
**Mitigation**: Compute at module level and export as constants.

### Pattern 6: StreamBridge Context→Store Indirection
**Scope**: state-chat-stream, state-artifact-store, render-streaming  
**Description**: SSE artifact data flows: `onData → ChatStreamProvider (context) → StreamBridge (useEffect) → artifactStore (module store) → UI`. The React context + effect bridge adds a full frame of latency and an unnecessary re-render cycle. `onData` already has access to the data — it could write directly to the store.  
**Mitigation**: Eliminate `StreamBridge` and `ChatStreamProvider`. Have `useChatSession.onData` call `processStreamDelta()` + `artifactStore.setState()` directly.

### Pattern 7: Artifact REPLACE Streaming Overhead
**Scope**: artifact-handler-registry, artifact-update, artifact-editor-loading  
**Description**: Code and sheet artifact handlers use REPLACE strategy — every `streamObject` partial sends the FULL content. For a 500-line code file, this means 500 full transmissions. Text uses APPEND (efficient); code/sheet do not.  
**Mitigation**: Implement delta compression for REPLACE strategy. Or switch to APPEND with clear+rebuild pattern.

### Pattern 8: No Rate Limiting on Many Endpoints
**Scope**: api-route-pipeline, data-artifacts  
**Description**: Artifact POST has no rate limiting. All GET routes (history, suggestions, artifact) have no rate limiting. Only auth actions and POST /api/chat are rate-limited.  
**Mitigation**: Add read rate limits to GET endpoints. Add write rate limit to artifact POST.

### Pattern 9: Inconsistent Cache Strategies
**Scope**: cache-layer, cache-invalidation, data-chat, data-messages, data-artifacts  
**Description**: Some functions use `'use cache'` + cacheTag, others use `React.cache` (request-scope), others are uncached. `getChatById` is uncached despite being called on every POST. Messages are always uncached. Votes use `'use cache'` but `cacheLife('seconds')`.  
**Mitigation**: Audit all data access functions. Apply `'use cache'` to hot read paths. Align cache lifetimes to data volatility.

### Pattern 10: Persistence Blocking Stream Completion
**Scope**: chat-persistence, data-persistence-retry, artifact-creation, artifact-update  
**Description**: `onFinish` blocks the SSE stream from closing until DB persistence completes (including up to 550ms of retries). Artifact saves in `execute` callbacks also block tool completion. Users wait for DB writes they don't need to wait for.  
**Mitigation**: Fire-and-forget persistence with client-visible status. Use background queue or `waitUntil()` for DB writes after stream closes.

### Pattern 11: Double SidebarSkeleton / Two-Layer Suspense
**Scope**: render-sidebar, render-loading-states, render-first-paint  
**Description**: The sidebar has outer Suspense (blocks on `cookies()`) and inner Suspense (blocks on session+chats). Both use `SidebarSkeleton` as fallback. The outer resolves → replaces skeleton → inner shows skeleton again. DOM replacement may cause flash.  
**Mitigation**: Combine `getSidebarDefaultOpen()` and `SidebarShell` data fetching into one async function. One Suspense boundary serves both.

### Pattern 12: React 19 `use()` vs Promise Pattern
**Scope**: state-session, state-server-hydration, state-voting  
**Description**: `SessionProvider` receives a Promise and resolves it via `useEffect` with `isLoading` state, `isActive` cleanup flags, and `isPromiseLike` checks. React 19 `use()` could handle this natively with Suspense, eliminating the loading state, stale-promise cancellation, and dead non-promise code path.  
**Mitigation**: Adopt React 19 `use()` for SessionProvider. Already used successfully in `VoteResolver`.

---

## Priority Optimization Targets

Ranked by impact × effort ratio. Each target references specific flows and actions.

### Tier 1 — High Impact, Low-Medium Effort

| # | Target | Flows | Action | Expected Impact |
|---|--------|-------|--------|-----------------|
| T1 | **Eliminate triple guest JWT verification** | auth-guest-lifecycle, request-pipeline, auth-session-resolution | Forward `x-guest-user-id` header from proxy.ts after first verification | ~60ms saved per guest request |
| T2 | **Pre-compute env-derived constants at module level** | csrf-protection, request-pipeline | Move `getSupabaseAuthCookieBaseName()` and CSRF allowed origins to module-level constants | Eliminates per-request URL parsing + Set construction |
| T3 | **Lightweight ownership queries** | chat-delete, artifact-restore, artifact-save, artifact-update | Create `SELECT userId` queries instead of full entity fetch | Reduces DB I/O by 10-100x per mutation |
| T4 | **Atomic rate limiting** | rate-limiting | Replace INCR+EXPIRE with Redis EVAL or SET EX NX | Eliminates race condition + halves Redis round-trips |
| T5 | **Batch artifact store updates** | state-artifact-store, state-chat-stream | Accumulate final artifact state per RAF frame, call setState once | Reduces N store updates to 1 per frame |
| T6 | **Remove dead code** | data-users, data-messages, data-votes, cache-invalidation | Delete unused functions: getUserByEmail, updateUserLastLogin, etc. | Reduces bundle, removes maintenance burden |

### Tier 2 — High Impact, Medium-High Effort

| # | Target | Flows | Action | Expected Impact |
|---|--------|-------|--------|-----------------|
| T7 | **Eliminate StreamBridge indirection** | state-chat-stream, render-streaming, state-artifact-store | Move processStreamDelta + artifactStore.setState into onData callback directly | Removes 1 frame latency + ChatStreamProvider entirely |
| T8 | **Adopt React 19 `use()` for SessionProvider** | state-session, state-server-hydration | Replace promise useEffect with `use()` inside Suspense | Eliminates isLoading state, guest flash, dead code paths |
| T9 | **Session type forwarding from proxy** | auth-session-resolution, request-pipeline | Add `x-session-type: guest|auth` header from proxy.ts | Skip Supabase getUser() for guests (~100ms saved) |
| T10 | **Collapse sidebar Suspense boundaries** | render-sidebar, render-loading-states | Combine getSidebarDefaultOpen + SidebarShell into single async function | One Suspense boundary, no double skeleton |
| T11 | **Parallelize independent API pipeline steps** | api-route-pipeline, chat-api-pipeline | Run CSRF+RateLimit in parallel while Auth resolves; create `withApiPipeline()` | Reduces serial pipeline by ~50ms |
| T12 | **Compound cursor encoding** | data-pagination, state-sidebar-history | Encode `updatedAt|chatId` in cursor string, skip resolution query | Eliminates extra DB call per paginated request |

### Tier 3 — Medium Impact, Various Effort

| # | Target | Flows | Action | Expected Impact |
|---|--------|-------|--------|-----------------|
| T13 | **Fire-and-forget persistence** | chat-persistence, data-persistence-retry | Use `waitUntil()` or background queue for DB writes after streaming | Removes 200-550ms from stream close |
| T14 | **Merge artifact prelude parts** | artifact-creation | Combine 4 prelude data parts (id, title, kind, clear) into single artifact-open event | Reduces SSE messages from 4 to 1 |
| T15 | **REPLACE delta compression** | artifact-handler-registry, artifact-update | Send diffs instead of full content for code/sheet REPLACE | Reduces bandwidth O(n²) → O(n) |
| T16 | **Add rate limiting to unprotected endpoints** | api-route-pipeline, data-artifacts | Add read limits to GET routes, write limit to artifact POST | Prevents abuse vectors |
| T17 | **Stabilize SWR infinite scroll** | state-sidebar-history | useCallback+ref for loadMore; memoize flatMap; single transform pass | Stops IntersectionObserver recreation |
| T18 | **Filter TOKEN_REFRESHED from router.refresh()** | state-session | Only trigger refresh for SIGNED_IN/SIGNED_OUT, not token refreshes | Prevents unnecessary full server re-renders |
| T19 | **ensureGuestUser at token creation, not per-chat** | data-users, auth-guest-lifecycle | Move ensureGuestUser call to guest token minting, not chat creation | Eliminates repeated DB upsert per chat |
| T20 | **Parallelize vote ownership check** | data-votes | Promise.all([getChatById, getMessageById]) instead of sequential | Saves ~50ms per vote action |

---

## File Listing

All 57 flow files in alphabetical order:

| # | File | Flow Name |
|---|------|-----------|
| 1 | `api-route-pipeline.md` | API Route Pipeline |
| 2 | `artifact-creation.md` | Artifact Creation |
| 3 | `artifact-editor-loading.md` | Editor Loading |
| 4 | `artifact-handler-registry.md` | Handler Registry |
| 5 | `artifact-panel-lifecycle.md` | Artifact Panel Lifecycle |
| 6 | `artifact-restore.md` | Artifact Restore |
| 7 | `artifact-save.md` | Artifact Manual Save |
| 8 | `artifact-store.md` | Artifact Store |
| 9 | `artifact-suggestions.md` | Artifact Suggestions |
| 10 | `artifact-update.md` | Artifact Update |
| 11 | `artifact-version-nav.md` | Artifact Version Navigation |
| 12 | `auth-guest-lifecycle.md` | Guest Token Lifecycle |
| 13 | `auth-login.md` | Login Flow |
| 14 | `auth-logout.md` | Logout Flow |
| 15 | `auth-register.md` | Registration Flow |
| 16 | `auth-session-resolution.md` | Session Resolution |
| 17 | `cache-invalidation.md` | Cache Invalidation |
| 18 | `cache-layer.md` | Cache Layer |
| 19 | `chat-api-pipeline.md` | Chat API Pipeline |
| 20 | `chat-delete.md` | Delete Chat |
| 21 | `chat-delete-trailing.md` | Delete Trailing Messages |
| 22 | `chat-model-resolution.md` | Model Resolution |
| 23 | `chat-persistence.md` | Message Persistence |
| 24 | `chat-send-message.md` | Send Message |
| 25 | `chat-title-generation.md` | Title Generation |
| 26 | `chat-tool-execution.md` | Tool Execution |
| 27 | `csrf-protection.md` | CSRF Protection |
| 28 | `data-artifacts.md` | Artifact Data |
| 29 | `data-chat.md` | Chat Data |
| 30 | `data-db-connection.md` | DB Connection |
| 31 | `data-messages.md` | Message Data |
| 32 | `data-pagination.md` | Cursor-Based Pagination |
| 33 | `data-persistence-retry.md` | Persistence Retry |
| 34 | `data-users.md` | User Data |
| 35 | `data-votes.md` | Vote Data |
| 36 | `file-upload.md` | File Upload Pipeline |
| 37 | `health-check.md` | Health Check |
| 38 | `rate-limiting.md` | Rate Limiting |
| 39 | `render-auth-pages.md` | Auth Pages Render |
| 40 | `render-error-boundaries.md` | Error Boundaries |
| 41 | `render-existing-chat.md` | Existing Chat Page Load |
| 42 | `render-first-paint.md` | First Paint (New Chat) |
| 43 | `render-hydration.md` | Client Hydration |
| 44 | `render-loading-states.md` | Loading States |
| 45 | `render-metadata.md` | generateMetadata |
| 46 | `render-sidebar.md` | Sidebar Render |
| 47 | `render-streaming.md` | Streaming Render |
| 48 | `request-pipeline.md` | HTTP Request Pipeline |
| 49 | `state-artifact-store.md` | Artifact Store (Singleton) |
| 50 | `state-chat-stream.md` | Chat Stream State |
| 51 | `state-form.md` | Form State |
| 52 | `state-pending-chats.md` | Pending Chats |
| 53 | `state-server-hydration.md` | Server → Client Hydration |
| 54 | `state-session.md` | Session State |
| 55 | `state-settings-store.md` | Settings Store |
| 56 | `state-sidebar-history.md` | Sidebar History |
| 57 | `state-voting.md` | Voting State |
