# Phase P6 — Enhancements Vertical

> **Updated per redesign audit (2026-03-01)**

> Enhancement phase. Implements all secondary features that augment the core experience:
> voting (Server Action + useOptimistic), model selection, visibility toggle, file upload, weather UI, health check.
>
> **Entry state**: P4 + P5 complete — artifacts and sidebar/navigation are both available for enhancement wiring.
> **Exit state**: All enhancement features work — voting, model selection, upload, visibility, weather, health.
> **Est. duration**: ~1.75 days
> **Tasks**: 14
> **Files created**: ~17

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P6-T01 | Create voting types + action | IMPL | M | 2 |
| P6-T02 | Create VoteButtons + useVotes | IMPL | M | 2 |
| P6-T03 | Wire voting into messages | INTEG | M | 2 |
| P6-T04 | Create ModelSelector | IMPL | L | 1 |
| P6-T05 | Wire model selector into ChatHeader | INTEG | S | 1 |
| P6-T06 | Create visibility types + action | IMPL | M | 2 |
| P6-T07 | Create VisibilitySelector | IMPL | M | 1 |
| P6-T08 | Wire visibility into chat page | INTEG | S | 1 |
| P6-T09 | Create file upload route | IMPL | M | 1 |
| P6-T10 | Create PreviewAttachment | IMPL | S | 1 |
| P6-T11 | Wire file upload into MultimodalInput | INTEG | M | 1 |
| P6-T12 | Create Weather component | IMPL | S | 1 |
| P6-T13 | Create health check route | IMPL | S | 1 |
| P6-T14 | Verification gate G06 | VERIFY | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-016 | Model catalog → selector → chat | P6-T04, P6-T05 |
| SEAM-018 | Vote mutation (Server Action + useOptimistic) | P6-T01, P6-T02, P6-T03 |
| SEAM-019 | File upload → message attachment | P6-T09, P6-T10, P6-T11 |
| SEAM-022 | Visibility toggle (Server Action + updateTag) | P6-T06, P6-T07, P6-T08 |
| SEAM-017 | AI Provider Registry (model discovery + registration) | P6-T04 |
| SEAM-036 | Rate limiting pipeline (per-route limiters) | P6-T09, P6-T13 |

---

## Tasks

---

### TASK: [ID: P6-T01]
Title: Create voting types and Server Action
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: features.md (vote on messages, auth only, non-guest)
Architecture ref: conventions.md (Zod schemas, Server Actions for mutations); redesign (Server Action + useOptimistic, NOT API route + SWR)

Action: Create 2 files. (1) features/voting/types/vote.types.ts — Vote types and Zod schema: voteSchema (chatId string uuid, messageId string uuid, type enum "up" | "down"). Export inferred VoteRequest type. (2) features/voting/actions/vote.ts — "use server" action voteOnMessage(input: unknown). Flow: auth check (non-guest required — guests cannot vote), validate with voteSchema, verify chat ownership (user owns the chat), verify message belongs to chat (IDOR protection), upsert vote via lib/data/vote.ts upsertVote(), call `updateTag` to invalidate vote cache. Returns `ActionResult<{ messageId: string; type: "up" | "down" }>` for optimistic reconciliation. This is a Server Action — NOT an API route. Voting uses `useOptimistic` on the client for immediate feedback.

Output files:
- features/voting/types/vote.types.ts
- features/voting/actions/vote.ts

Inputs: lib/data/vote.ts (P1-T09), lib/auth/session.ts (P2-T01), lib/data/chat.ts (P1-T06), lib/cache/revalidate.ts (P1-T03)
Outputs: Vote action consumed by VoteButtons (P6-T02) and message integration (P6-T03)

AI layer handling: NEW

Dependencies: P1-T09
Dependents: P6-T02, P6-T03

Success criteria:
- voteSchema validates chatId + messageId + type ("up" | "down")
- `voteOnMessage` is a Server Action ("use server") — NOT an API route <!-- audit: VO-6 -->
- Auth check rejects guests (AppError.forbidden)
- Chat ownership verified before voting
- Message membership in chat verified (IDOR protection)
- Vote upserted via lib/data/vote.ts
- updateTag called to invalidate vote cache
- Returns ActionResult (never throws)
- NO PATCH /api/vote route exists
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P6-T02]
Title: Create VoteButtons component and useVotes hook
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: features.md (upvote/downvote on assistant messages)
Architecture ref: redesign (useOptimistic for instant feedback, Server Action for persistence)

Action: Create 2 files. (1) features/voting/hooks/use-votes.ts — "use client" hook useVotes(chatId: string, initialVotes: Vote[]). Uses React 19 `useOptimistic` for instant vote state updates. On vote: optimistically updates local vote state, then calls `voteOnMessage` Server Action. <!-- audit: VO-6 --> On failure: reverts optimistic state + shows toast error. Returns: votes, submitVote(messageId, type). (2) features/voting/components/vote-buttons.tsx — "use client" component. Props: chatId, messageId, isAssistant, isLoading. Renders ThumbsUp and ThumbsDown buttons with aria-pressed state matching current vote. Filled/highlighted icon when active vote exists. Only shown for assistant messages. Voting disabled for guest users (buttons hidden).

Output files:
- features/voting/hooks/use-votes.ts
- features/voting/components/vote-buttons.tsx

Inputs: features/voting/actions/vote.ts (P6-T01), features/voting/types/vote.types.ts (P6-T01)
Outputs: VoteButtons consumed by message integration (P6-T03) <!-- audit: VO-4 — cross-feature import exception: VoteButtons consumed by chat/message.tsx -->

AI layer handling: NEW

Dependencies: P6-T01, P0-T11
Dependents: P6-T03

Success criteria:
- useVotes uses React 19 `useOptimistic` (NOT SWR optimistic mutate)
- Optimistic update on vote click
- Server Action called for persistence
- Revert on failure + toast error
- Vote buttons render with aria-pressed state
- Filled icon when active vote exists
- Only shown for assistant messages
- Guest users cannot vote (buttons hidden)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P6-T03]
Title: Wire voting into messages with VoteResolver
Phase: 6 — Enhancements Vertical
Type: INTEG

Behavior ref: features.md (voting in message actions)
Architecture ref: redesign (VoteResolver using React 19 use() for deferred data, NOT VoteHydrator)

Action: Update 2 areas. (1) features/chat/components/message.tsx — Render VoteButtons component for assistant messages. Pass chatId, messageId. <!-- audit: VO-4 — cross-feature import exception documented --> (2) Create features/voting/components/vote-resolver.tsx <!-- audit: VO-2 --> — VoteResolver component that uses React 19 `use()` to resolve a deferred vote data promise. (3) app/(chat)/chat/[id]/page.tsx — Use `getCachedVotes()` wrapper (`'use cache'` + `cacheTag('votes:{chatId}')` + `cacheLife('seconds')`) <!-- audit: VO-1 --> to create a votes promise. Only fetch votes for non-guest authenticated users <!-- audit: VO-7 -->. Pass unresolved `votesPromise` to VoteResolver (wrapped in Suspense). VoteResolver resolves with `use()` inside Suspense, then renders VoteButtons directly with `initialVotes` as props. NO vote store — props-only seeding. <!-- audit: VO-3 / SC-3 -->

Output files:
- features/chat/components/message.tsx (modify)
- features/voting/components/vote-resolver.tsx (new) <!-- audit: VO-2 -->
- app/(chat)/chat/[id]/page.tsx (modify)

Inputs: features/voting/components/vote-buttons.tsx (P6-T02), features/voting/hooks/use-votes.ts (P6-T02), lib/data/vote.ts (P1-T09)
Outputs: Functional voting in messages

AI layer handling: NEW

Dependencies: P6-T02, P1-T09, P3-T15, P3-T25
Dependents: P6-T14

Success criteria:
- VoteButtons render on assistant messages
- VoteResolver lives at `features/voting/components/vote-resolver.tsx` <!-- audit: VO-2 -->
- VoteResolver uses React 19 `use()` for deferred vote data (NOT VoteHydrator)
- VoteResolver receives `votesPromise`, resolves with `use()` inside Suspense, then passes `initialVotes` as props to VoteButtons. NO vote store. VoteResolver renders VoteButtons directly <!-- audit: VO-3 / SC-3 -->
- `getCachedVotes()` wrapper uses `'use cache'` + `cacheTag('votes:{chatId}')` + `cacheLife('seconds')` <!-- audit: VO-1 -->
- Vote fetch only for non-guest authenticated users <!-- audit: VO-7 -->
- Vote data loads in parallel with page render (non-blocking)
- Optimistic updates via useOptimistic
- Server Action used for persistence (NOT PATCH /api/vote)
- Guest users cannot vote
- Named VoteResolver (NOT VoteHydrator)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P6-T04]
Title: Create ModelSelector component
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: features.md (model selection UI)
Architecture ref: SEAM-016 (model catalog → selector → chat); redesign (grouped by provider, cookie + localStorage persistence)

Action: Create features/models/components/model-selector.tsx — "use client" component. Searchable dropdown with filter input, models grouped by provider. Each model shows name, description, provider logo, capabilities badges. Props: selectedModelId, onModelChange, models (ModelMetadata[]). Selection flow: user picks model → onModelChange(newModelId) called → parent persists to cookie (server-readable) + localStorage. Uses `listChatModels` from features/models/lib/models.ts (with `use cache`). Model list is populated via `discoverModels()` from the provider registry — dynamic discovery, NOT hardcoded list. <!-- audit: MO-1 — discovery belongs primarily in P3-T01; ModelSelector consumes the discovered list via `listChatModels` -->

Output files:
- features/models/components/model-selector.tsx

Inputs: features/models/lib/models.ts (P3-T01), features/models/types/model.types.ts (P3-T01), components/ui/ (P0-T11)
Outputs: ModelSelector consumed by ChatHeader (P6-T05)

AI layer handling: NEW

Dependencies: P3-T01, P0-T11
Dependents: P6-T05

Success criteria:
- Searchable dropdown grouped by provider
- Selection calls onModelChange callback
- Models grouped by provider with metadata display
- Persists to cookie (server-readable) + localStorage
- Capabilities badges displayed
- `getDefaultModel(session)` utility available for fallback when no cookie/localStorage selection exists <!-- audit: MO-6 — assigned to features/models/lib/models.ts, created in P3-T01 -->
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P6-T05]
Title: Wire model selector into ChatHeader
Phase: 6 — Enhancements Vertical
Type: INTEG

Behavior ref: interactions.md (model selection in header)
Architecture ref: redesign (model selector in chat header)

Action: Update features/chat/components/chat-header.tsx — Import and render ModelSelector component in the chat header. Wire model selection: onModelChange updates cookie + localStorage. Current model read from ChatSessionContext. Available models from server page props.

Output files:
- features/chat/components/chat-header.tsx (modify)

Inputs: features/models/components/model-selector.tsx (P6-T04), features/chat/components/chat-header.tsx (P3-T19)
Outputs: Model selection integrated into chat header

AI layer handling: NEW

Dependencies: P6-T04, P3-T19
Dependents: P6-T14

Success criteria:
- ModelSelector rendered in chat header
- Model selection persisted to cookie + localStorage
- Does not break existing header layout
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P6-T06]
Title: Create visibility types and Server Action
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: features.md (chat visibility toggle)
Architecture ref: redesign (visibility as own feature module with Server Actions + updateTag)

Action: Create 2 files. (1) features/visibility/types/visibility.types.ts — Visibility types: VisibilityType ("public" | "private"), visibility Zod schema. Zod schema fields: `chatId` (z.string().uuid()), `visibility` (z.enum(["public", "private"])). Export inferred `UpdateVisibilityRequest` type. <!-- audit: VI-6 --> (2) features/visibility/actions/update-visibility.ts — "use server" action updateChatVisibility({chatId, visibility}). Flow: auth check, validate ownership, update visibility in DB via lib/data/chat.ts, call `updateTag` to invalidate chat and chat-list cache tags. Returns ActionResult<void>. Visibility is its own feature module (NOT mixed into chat feature).

Output files:
- features/visibility/types/visibility.types.ts
- features/visibility/actions/update-visibility.ts

Inputs: lib/data/chat.ts (P1-T06), lib/cache/revalidate.ts (P1-T03), lib/auth/session.ts (P2-T01)
Outputs: Visibility action consumed by VisibilitySelector (P6-T07)

AI layer handling: NEW

Dependencies: P1-T06, P1-T03, P2-T01, P0-T08
Dependents: P6-T07, P6-T08

Success criteria:
- Visibility is its own feature module (features/visibility/)
- Server Action validates auth and ownership
- Updates visibility in DB
- updateTag called on both chat and chat-list tags
- Returns ActionResult (never throws)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P6-T07]
Title: Create VisibilitySelector component
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: features.md (chat visibility toggle UI)
Architecture ref: SEAM-022 (visibility toggle); redesign (useOptimistic toggle)

Action: Create features/visibility/components/visibility-selector.tsx — "use client" component. Props: chatId, initialVisibility. DropdownMenu with two options: Private (lock icon) and Public (globe icon). Current selection shown as trigger button text/icon. On selection: uses `useOptimistic` for instant feedback, calls `updateChatVisibility` Server Action. On failure: reverts optimistic state + shows toast error. Responsive: hidden on mobile (className includes "hidden md:flex"). Only shown for own chats (not readonly).

Output files:
- features/visibility/components/visibility-selector.tsx

Inputs: features/visibility/actions/update-visibility.ts (P6-T06), components/ui/ (P0-T11)
Outputs: VisibilitySelector consumed by chat page (P6-T08)

AI layer handling: NEW

Dependencies: P6-T06, P0-T11
Dependents: P6-T08

Success criteria:
- Dropdown with Private and Public options
- Lock icon for private, globe icon for public
- Each option has a descriptive subtitle (e.g. "Only you can access", "Anyone with the link can access") <!-- audit: VI-4 -->
- Check icon shown next to the currently selected option <!-- audit: VI-4 -->
- Trigger button shows chevron indicator <!-- audit: VI-4 -->
- Uses useOptimistic for instant feedback
- Calls Server Action for persistence (NOT SWR optimistic + API route)
- Reverts on failure + toast error
- Hidden on mobile (md:flex)
- Only shown for own chats
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P6-T08]
Title: Wire visibility into chat page
Phase: 6 — Enhancements Vertical
Type: INTEG

Behavior ref: interactions.md (visibility toggle in chat)
Architecture ref: SEAM-022 (visibility toggle in header)

Action: Update features/chat/components/chat-header.tsx — Render VisibilitySelector component in ChatHeader (NOT page.tsx). <!-- audit: VI-1 / SC-6 --> Pass chatId and initialVisibility. Data flow: `initialVisibility` sourced from server-fetched chat data, passed through page → ChatShell → ChatSessionContext → ChatHeader. <!-- audit: VI-2 --> Only render when not readonly and on desktop.

Output files:
- features/chat/components/chat-header.tsx (modify) <!-- audit: VI-1 / SC-6 -->

Inputs: features/visibility/components/visibility-selector.tsx (P6-T07), features/chat/components/chat-header.tsx (P3-T19)
Outputs: Visibility selector functional in chat header

AI layer handling: NEW

Dependencies: P6-T07, P3-T25
Dependents: P6-T14

Success criteria:
- VisibilitySelector rendered in ChatHeader (NOT page.tsx) <!-- audit: VI-1 / SC-6 -->
- `initialVisibility` flows from server-fetched chat data → ChatShell → ChatSessionContext → ChatHeader <!-- audit: VI-2 -->
- Initial visibility from server data
- Hidden for readonly chats
- Visibility changes reflected immediately (useOptimistic)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P6-T09]
Title: Create file upload API route
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: features.md (file upload to Vercel Blob)
Architecture ref: SEAM-019 (file upload → message attachment); SEAM-036 (upload rate limit)

Action: Create app/api/files/upload/route.ts — POST handler. Flow: (1) Auth check via getAppSession(), (2) Rate limit check (upload: 10/hour), (3) Parse FormData, extract file, (4) Validate file (size limit, mime type), (5) Upload to Vercel Blob via put() from @vercel/blob, (6) Return { url, pathname, contentType }. Accepts image files (image/*). Error handling: file too large, invalid type, upload failure.

Output files:
- app/api/files/upload/route.ts

Inputs: lib/auth/session.ts (P2-T01), @vercel/blob package
Outputs: Upload endpoint consumed by MultimodalInput (P6-T11)

AI layer handling: NEW

Dependencies: P2-T01
Dependents: P6-T11, P6-T14

Success criteria:
- POST /api/files/upload accepts FormData with file
- File uploaded to Vercel Blob
- Returns { url, pathname, contentType }
- Auth required
- Rate limited (10/hour)
- File validation (size, type)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P6-T10]
Title: Create PreviewAttachment component
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: components-02.md (preview-attachment.tsx: thumbnail, uploading state, remove button)
Architecture ref: conventions.md (feature collocation)

Action: Create features/chat/components/preview-attachment.tsx — Component. Props: attachment (Attachment type from AI SDK), isUploading? (boolean), onRemove? (callback). Image preview: next/image for image/* contentType. Non-image: "File" text display. States: uploading overlay with Loader animation, remove Button on group-hover.

Output files:
- features/chat/components/preview-attachment.tsx

Inputs: components/ui/ (P0-T11), next/image
Outputs: PreviewAttachment consumed by MultimodalInput (P6-T11)

AI layer handling: NEW

Dependencies: P0-T11
Dependents: P6-T11

Success criteria:
- Image attachments show thumbnail via next/image
- Non-image attachments show "File" text
- Uploading state shows loader overlay
- Remove button visible on hover
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P6-T11]
Title: Wire file upload into MultimodalInput
Phase: 6 — Enhancements Vertical
Type: INTEG

Behavior ref: interactions.md (file upload flow: picker, queue, preview, submit)
Architecture ref: SEAM-019 (file upload → message attachment)

Action: Update features/chat/components/multimodal-input.tsx — Add file upload support: (1) Hidden file input (accept="image/*") triggered by attachment button, (2) Upload each file via POST /api/files/upload, (3) Show PreviewAttachment thumbnails, (4) Remove attachment via X button, (5) On submit: convert attachments to message parts, (6) Clear attachments after submit, (7) Abort active uploads on unmount. aria-label="Upload file" on hidden input.

Output files:
- features/chat/components/multimodal-input.tsx (modify)

Inputs: app/api/files/upload/route.ts (P6-T09), features/chat/components/preview-attachment.tsx (P6-T10)
Outputs: File upload integrated into chat input

AI layer handling: NEW

Dependencies: P6-T09, P6-T10, P3-T18
Dependents: P6-T14

Success criteria:
- Attachment button opens file picker
- Files upload to /api/files/upload
- Preview thumbnails shown for uploads
- Attachments sent as message parts on submit
- Active uploads abort on unmount
- aria-label present on file input
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P6-T12]
Title: Create Weather component
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: tools (weather tool result renderer)
Architecture ref: conventions.md (shared components)

Action: Create components/weather.tsx — Weather tool result renderer component. Displays weather data returned by the weather chat tool in a formatted card.

Output files:
- components/weather.tsx

Inputs: features/chat/lib/tools/weather.ts (P3-T13)
Outputs: Weather component consumed by message rendering

AI layer handling: NEW

Dependencies: P3-T13, P0-T11
Dependents: P6-T14

Success criteria:
- Renders weather tool results in formatted card
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P6-T13]
Title: Create health check route
Phase: 6 — Enhancements Vertical
Type: IMPL

Behavior ref: features.md (health check: DB ping, Redis ping)
Architecture ref: conventions.md (route handlers)

Action: Create app/api/health/route.ts — GET handler (no auth required). Checks: (1) Database: SELECT 1 with latency measurement, (2) Cache (Redis): PING with latency measurement. Returns JSON: { status: "healthy" | "degraded" | "unhealthy", checks, timestamp }.

Output files:
- app/api/health/route.ts

Inputs: lib/db/client.ts, lib/cache/client.ts (P1-T02)
Outputs: Health check endpoint for monitoring

AI layer handling: NEW

Dependencies: P1-T02
Dependents: P6-T14

Success criteria:
- GET /api/health returns JSON with status + individual checks
- DB check: SELECT 1 with latency
- Cache check: PING with latency
- No auth required
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P6-T14]
Title: Verification gate G06
Phase: 6 — Enhancements Vertical
Type: VERIFY

Behavior ref: features.md (all enhancement features)
Architecture ref: AGENTS.md (post-implementation validation); redesign (P6 exit criteria)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) Vote buttons on assistant messages work — useOptimistic + Server Action persist, (5) Guests cannot vote (403), (6) Model selector shows grouped models with search, (7) Model selection persists to cookie + localStorage, (8) Visibility toggle between public/private with useOptimistic, (9) File picker opens, files upload to Vercel Blob, (10) Preview attachment shows thumbnails, (11) Health endpoint returns status with checks, (12) All Server Actions return ActionResult<T> (never throw).

Output files: none (validation only)

Inputs: all P6-T01 through P6-T13 outputs
Outputs: Gate G06 passed — P7 (polish) can begin

AI layer handling: N/A

Dependencies: P6-T01 through P6-T13
Dependents: P7-T03, P7-T04, P7-T06, P7-T07, P7-T09, P7-T10, P7-T11

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- Voting uses Server Action + `useOptimistic` (NOT `PATCH /api/vote` + SWR)
- VoteResolver uses React 19 `use()` for deferred data (NOT VoteHydrator)
- Visibility uses Server Action + `updateTag` on both chat and chat-list tags
- Visibility is its own feature module (features/visibility/)
- `ModelSelector` persists to cookie (server-readable) + localStorage
- File upload returns blob URL, preview renders thumbnail
- Health check pings DB + Redis
- All Server Actions return `ActionResult<T>` (never throw)

Complexity: S
