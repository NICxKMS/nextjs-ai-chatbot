# Phase P06 — Enhancements Vertical

> Enhancement phase. Implements all secondary features that augment the core experience:
> voting, model selection, settings panel, file upload, visibility toggle, toolbar, toast.
>
> **Entry state**: P05 complete — chat, artifacts, sidebar all work. Full navigation functional.
> **Exit state**: All enhancement features work — voting, model selection, settings, upload, visibility, toolbar.
> **Est. duration**: ~3 days
> **Tasks**: 18
> **Files created**: ~22

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P06-T01 | Create vote schemas and action | IMPLEMENTATION | M | 2 |
| P06-T02 | Create vote API route | IMPLEMENTATION | M | 1 |
| P06-T03 | Wire voting into message actions | INTEGRATION | M | 1 |
| P06-T04 | Create model catalog | IMPLEMENTATION | M | 2 |
| P06-T05 | Create model selector component | IMPLEMENTATION | L | 1 |
| P06-T06 | Wire model selector into chat input | INTEGRATION | M | 1 |
| P06-T07 | Create settings panel component | IMPLEMENTATION | L | 1 |
| P06-T08 | Wire settings panel into chat header | INTEGRATION | S | 1 |
| P06-T09 | Create file upload route | IMPLEMENTATION | M | 1 |
| P06-T10 | Create preview attachment component | IMPLEMENTATION | M | 1 |
| P06-T11 | Wire file upload into multimodal input | INTEGRATION | L | 1 |
| P06-T12 | Create visibility selector | IMPLEMENTATION | M | 1 |
| P06-T13 | Create use-chat-visibility hook | IMPLEMENTATION | M | 1 |
| P06-T14 | Wire visibility selector into chat header | INTEGRATION | S | 1 |
| P06-T15 | Create toast component | IMPLEMENTATION | M | 1 |
| P06-T16 | Create artifact toolbar component | IMPLEMENTATION | M | 1 |
| P06-T17 | Create health check endpoint | IMPLEMENTATION | M | 1 |
| P06-T18 | Verification gate G06 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-016 | Model catalog → selector → chat | P06-T04, P06-T05, P06-T06 |
| SEAM-017 | AI provider registry (fully wired) | P06-T04 |
| SEAM-018 | Vote mutation (optimistic + server + DB) | P06-T01, P06-T02, P06-T03 |
| SEAM-019 | File upload → message attachment | P06-T09, P06-T10, P06-T11 |
| SEAM-022 | Visibility toggle (optimistic + server action) | P06-T12, P06-T13, P06-T14 |
| SEAM-036 | Rate limiting pipeline (all per-route limiters active) | P06-T02, P06-T09, P06-T17 |

---

## Tasks

---

### TASK: [ID: P06-T01]
Title: Create vote schemas and server action
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (vote on messages, auth only, non-guest); api-contracts.md (PATCH /api/vote)
Architecture ref: conventions.md (Zod schemas, server actions); SEAM-018 (vote mutation)

Action: Create 2 files. (1) features/voting/schemas/vote.schema.ts — voteSchema (Zod: chatId string uuid, messageId string uuid, type enum "up" | "down"). Export inferred VoteRequest type. (2) features/voting/actions/vote.ts — "use server" action voteMessage(input: unknown). Flow: auth check (non-guest required — guests cannot vote), validate with voteSchema, verify chat ownership (user owns the chat), verify message belongs to chat (IDOR protection), upsert vote via lib/data/vote.ts upsertVote(). Returns void on success, throws AppError for failures.

Output files:
- features/voting/schemas/vote.schema.ts
- features/voting/actions/vote.ts

Inputs: lib/data/vote.ts (P01-T10), features/auth/lib/session.ts (P02-T01), lib/data/chat.ts (P01-T07), lib/data/message.ts (P01-T08)
Outputs: Vote action consumed by vote API route (P06-T02) and message actions (P06-T03)

AI layer handling: NEW

Dependencies: P01-T07, P01-T08, P01-T10, P02-T01
Dependents: P06-T02, P06-T03

Success criteria:
- voteSchema validates chatId + messageId + type ("up" | "down")
- voteMessage checks auth and rejects guests (AppError.forbidden)
- Chat ownership verified before voting
- Message membership in chat verified (IDOR protection)
- Vote upserted via lib/data/vote.ts
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T02]
Title: Create vote API route
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: api-contracts.md (PATCH /api/vote)
Architecture ref: conventions.md (route handlers); SEAM-018 (vote mutation); SEAM-036 (rate limiting)

Action: Create app/api/vote/route.ts — PATCH handler. Flow: (1) Auth check via getAppSession(), (2) Rate limit check (standard: 100/min), (3) Parse and validate body with voteSchema, (4) Delegate to voteMessage action, (5) Return 200 on success. Error handling: AppError.toResponse() for known errors, 500 for unexpected. Non-guest guard is in the action, but the route can also double-check.

Output files:
- app/api/vote/route.ts

Inputs: features/voting/actions/vote.ts (P06-T01), features/auth/lib/session.ts (P02-T01), lib/rate-limit/ (P01-T13)
Outputs: Vote API route consumed by message actions SWR optimistic mutation (P06-T03)

AI layer handling: NEW

Dependencies: P06-T01, P02-T01, P01-T13
Dependents: P06-T03, P06-T18

Success criteria:
- PATCH /api/vote validates and upserts vote
- Rate limiting applied
- Auth required, guests rejected with 403
- Error responses use AppError.toResponse()
- Returns 200 on success
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T03]
Title: Wire voting into message actions
Phase: 6 — Enhancements Vertical
Type: INTEGRATION

Behavior ref: features.md (upvote/downvote on assistant messages); interactions.md (vote buttons in message actions)
Architecture ref: SEAM-018 (optimistic SWR mutation); components-01.md (message-actions.tsx)

Action: Update features/chat/components/message-actions.tsx — Replace the vote button stubs (from P03-T15) with functional voting. Add useSWR for votes fetched by chatId. On vote click: (1) Optimistic SWR mutate of vote cache, (2) PATCH /api/vote with chatId, messageId, type, (3) On failure: rollback optimistic mutation + show toast error. Vote buttons: ThumbsUp and ThumbsDown with aria-pressed state matching current vote. Filled/highlighted icon when active vote exists. Vote buttons only shown for assistant messages. Voting disabled for guest users (buttons hidden or disabled).

Output files:
- features/chat/components/message-actions.tsx (modify)

Inputs: features/voting/schemas/vote.schema.ts (P06-T01), app/api/vote/route.ts (P06-T02)
Outputs: Functional voting in message actions

AI layer handling: NEW

Dependencies: P06-T01, P06-T02, P03-T15
Dependents: P06-T18

Success criteria:
- Vote buttons render on assistant messages
- Optimistic SWR update on click
- PATCH request sent to /api/vote
- Rollback on failure with toast
- aria-pressed reflects current vote state
- Guest users cannot vote
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T04]
Title: Create model catalog and discovery
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (model selection, dynamic discovery); ai-sdk-usage.md (model catalog)
Architecture ref: SEAM-016 (model catalog → selector); SEAM-017 (AI provider registry full); conventions.md (feature collocation)

Action: Create 2 files. (1) features/models/lib/catalog.ts — Export listChatModels(): ModelMetadata[] that merges curated model list with dynamically discovered models. Curated list is a hardcoded array of known good models with full metadata (capabilities, context window, provider, pricing). Discovery results override/augment curated data when available. Sort by provider grouping then name. (2) features/models/lib/discovery.ts — Export discoverModels() that queries provider APIs for available models. Uses lib/ai/model-discovery.ts (P03-T03) as the base. Adds caching layer (use cache or local variable cache with TTL). Handles provider API failures gracefully (returns empty for failed providers). Maps API responses to ModelMetadata format.

Output files:
- features/models/lib/catalog.ts
- features/models/lib/discovery.ts

Inputs: lib/ai/model-discovery.ts (P03-T03), lib/types/ai.types.ts (P00-T08 — ModelMetadata)
Outputs: Model catalog consumed by model selector (P06-T05) and chat pages

AI layer handling: NEW

Dependencies: P03-T03, P00-T08
Dependents: P06-T05, P06-T06

Success criteria:
- listChatModels returns merged curated + discovered models
- Curated models have full metadata (capabilities, context, provider)
- Discovery failures don't break catalog (graceful degradation)
- Models sorted by provider group then name
- ModelMetadata matches type from ai.types.ts
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T05]
Title: Create model selector component
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (model selection UI); components-02.md (not explicitly listed so use interactions.md); interactions.md (model selection flow)
Architecture ref: SEAM-016 (model catalog → selector → chat); conventions.md (feature collocation)

Action: Create features/models/components/model-selector.tsx — "use client" component. Two variants: ModelSelector (full, standalone) and ModelSelectorCompact (inline in input area). Full variant: searchable dropdown with filter input, models grouped by provider, each model shows name, description, provider logo, context window, capabilities badges, curated/discovered badge. Compact variant: small button showing current model name, dropdown on click with grouped model list. Props: selectedModelId, onModelChange, models (ModelMetadata[]). Selection flow: user picks model → onModelChange(newModelId) called → parent persists to cookie + localStorage. Both variants reuse the same base dropdown logic.

Output files:
- features/models/components/model-selector.tsx

Inputs: features/models/lib/catalog.ts (P06-T04), lib/types/ai.types.ts (P00-T08), components/ui/ (P00-T11)
Outputs: ModelSelector consumed by multimodal-input (P06-T06) and chat pages

AI layer handling: NEW

Dependencies: P06-T04, P00-T08, P00-T11
Dependents: P06-T06

Success criteria:
- Full selector: searchable, grouped by provider, shows metadata
- Compact selector: small button with dropdown
- Selection calls onModelChange callback
- Models grouped by provider
- Capabilities badges displayed
- Both variants export from same file
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P06-T06]
Title: Wire model selector into chat input and pages
Phase: 6 — Enhancements Vertical
Type: INTEGRATION

Behavior ref: interactions.md (model selection persistence to cookie + localStorage); screens.md (model cookie read on page)
Architecture ref: SEAM-016 (selection flows through cookie + localStorage to chat request)

Action: Update features/chat/components/multimodal-input.tsx — Add ModelSelectorCompact to the input toolbar area. Wire model selection: onModelChange updates useSettings selectedModelId in localStorage, also sets chat-model cookie via document.cookie. Current model read from useSettings on mount, with fallback to chat-model cookie. Model ID sent with every chat message via prepareSendMessagesRequest in chat.tsx. Update app/(chat)/page.tsx and app/(chat)/chat/[id]/page.tsx — Read chat-model cookie server-side, pass to Chat component as initialChatModel. For existing chats, use chat.lastContext?.modelId preference. Pass availableModels from listChatModels() to Chat.

Output files:
- features/chat/components/multimodal-input.tsx (modify)

Inputs: features/models/components/model-selector.tsx (P06-T05), features/settings/hooks/use-settings.ts (P03-T04)
Outputs: Model selection integrated into chat flow

AI layer handling: NEW

Dependencies: P06-T05, P03-T04, P03-T17
Dependents: P06-T18

Success criteria:
- ModelSelectorCompact renders in input toolbar
- Selection stored in localStorage + cookie
- Model ID included in chat request body
- Existing chats prefer lastContext modelId
- New chats use cookie/localStorage model
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T07]
Title: Create settings panel component
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (settings: temperature, topP, maxOutputTokens, system prompt, toggles); components-02.md (settings-sheet.tsx)
Architecture ref: SEAM-015 (settings pipeline); state-management.md (SettingsState full shape)

Action: Create features/settings/components/settings-panel.tsx — "use client" component. Exports SettingsButton (trigger) and SettingsSheet (content). Uses Sheet component (right side, max-w-xl). Sections: (1) Sampling: Temperature slider (0-1.5), Top P slider (0-1), Max Output Tokens input (256-1,000,000) — all numeric inputs with labels. (2) System Prompt: Textarea (max 8192 chars). (3) Behavior: Enable reasoning (toggle, aria-pressed), Stream artifacts (toggle), Auto-scroll (toggle). All toggle buttons styled as pill (primary when on, muted when off). Footer: Reset to defaults button + Close button. Hooks: useSettings, useSettingsSnapshot. Uses SettingToggle internal component with aria-pressed state.

Output files:
- features/settings/components/settings-panel.tsx

Inputs: features/settings/hooks/use-settings.ts (P03-T04), components/ui/sheet.tsx (P00-T11), components/ui/ (P00-T11)
Outputs: SettingsButton consumed by chat header (P06-T08)

AI layer handling: NEW

Dependencies: P03-T04, P00-T11
Dependents: P06-T08

Success criteria:
- SettingsButton opens sheet from right side
- Sampling section: temperature, topP, maxOutputTokens with sliders/inputs
- System prompt textarea with max 8192 chars
- Behavior toggles with aria-pressed attribute
- Reset to defaults restores DEFAULT_SETTINGS
- Settings persist via useSettings (localStorage)
- File under 300 lines
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P06-T08]
Title: Wire settings panel into chat header
Phase: 6 — Enhancements Vertical
Type: INTEGRATION

Behavior ref: components-01.md (chat-header.tsx: SettingsButton in header)
Architecture ref: screens.md (chat header elements)

Action: Update features/chat/components/chat-header.tsx — Add SettingsButton import from features/settings/components/settings-panel.tsx. Render SettingsButton in the chat header toolbar area alongside existing elements (SidebarToggle, New Chat button, VisibilitySelector placeholder). Settings button should be visible on both mobile and desktop.

Output files:
- features/chat/components/chat-header.tsx (modify)

Inputs: features/settings/components/settings-panel.tsx (P06-T07), features/chat/components/chat-header.tsx (P03-T18)
Outputs: Settings accessible from chat header

AI layer handling: NEW

Dependencies: P06-T07, P03-T18
Dependents: P06-T18

Success criteria:
- SettingsButton rendered in chat header
- Settings sheet opens on click
- Visible on both mobile and desktop
- Does not break existing header layout
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P06-T09]
Title: Create file upload API route
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (file upload to Vercel Blob); api-contracts.md (POST /api/files/upload)
Architecture ref: SEAM-019 (file upload → message attachment); SEAM-036 (upload rate limit 10/hr)

Action: Create app/api/files/upload/route.ts — POST handler. Flow: (1) Auth check via getAppSession(), (2) Rate limit check (upload: 10/hour), (3) Parse FormData, extract file, (4) Validate file (size limit, mime type), (5) Upload to Vercel Blob via put() from @vercel/blob, (6) Return { url, pathname, contentType }. Accepts image files (image/*). Error handling: file too large, invalid type, upload failure. Uses BLOB_READ_WRITE_TOKEN env var.

Output files:
- app/api/files/upload/route.ts

Inputs: features/auth/lib/session.ts (P02-T01), lib/rate-limit/ (P01-T13), @vercel/blob package
Outputs: Upload endpoint consumed by multimodal input (P06-T11)

AI layer handling: NEW

Dependencies: P02-T01, P01-T13
Dependents: P06-T11, P06-T18

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

### TASK: [ID: P06-T10]
Title: Create preview attachment component
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: components-02.md (preview-attachment.tsx: thumbnail, uploading state, remove button)
Architecture ref: conventions.md (feature collocation)

Action: Create features/chat/components/preview-attachment.tsx — Component (no "use client" needed if pure render). Props: attachment (Attachment type from AI SDK), isUploading? (boolean), onRemove? (callback). Layout: group relative size-16 rounded-lg border bg-muted. Image preview: next/image (64×64) for image/* contentType. Non-image: "File" text display. States: uploading overlay with Loader animation, remove Button on group-hover (absolute positioned X icon). Filename overlay at bottom.

Output files:
- features/chat/components/preview-attachment.tsx

Inputs: components/ui/ (P00-T11), next/image
Outputs: PreviewAttachment consumed by multimodal-input (P06-T11) and message rendering

AI layer handling: NEW

Dependencies: P00-T11
Dependents: P06-T11

Success criteria:
- Image attachments show thumbnail via next/image
- Non-image attachments show "File" text
- Uploading state shows loader overlay
- Remove button visible on hover
- Filename displayed
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T11]
Title: Wire file upload into multimodal input
Phase: 6 — Enhancements Vertical
Type: INTEGRATION

Behavior ref: interactions.md (file upload flow: picker, queue, preview, submit); features.md (file attachments)
Architecture ref: SEAM-019 (file upload → message attachment)

Action: Update features/chat/components/multimodal-input.tsx — Add file upload support: (1) Hidden file input (accept="image/*") triggered by attachment button (paperclip icon), (2) File queue state for tracking uploads, (3) Upload each file via POST /api/files/upload (FormData), max 3 concurrent, (4) Show PreviewAttachment thumbnails for queued/uploaded files, (5) Remove attachment via X button on preview, (6) On submit: convert attachments to message parts ({ type: "file", data: url, mimeType, name }), (7) Clear attachments after submit, (8) Abort active uploads on component unmount. Attachment button disabled for reasoning models (isReasoning check). aria-label="Upload file" on hidden input.

Output files:
- features/chat/components/multimodal-input.tsx (modify)

Inputs: app/api/files/upload/route.ts (P06-T09), features/chat/components/preview-attachment.tsx (P06-T10), features/chat/components/multimodal-input.tsx (P03-T17)
Outputs: File upload integrated into chat input

AI layer handling: NEW

Dependencies: P06-T09, P06-T10, P03-T17
Dependents: P06-T18

Success criteria:
- Attachment button opens file picker
- Files upload to /api/files/upload
- Preview thumbnails shown for uploads
- Remove button removes attachment
- Attachments sent as message parts on submit
- Active uploads abort on unmount
- Max 3 concurrent uploads
- Disabled for reasoning models
- aria-label present on file input
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P06-T12]
Title: Create visibility selector component
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (chat visibility toggle); interactions.md (visibility toggle flow)
Architecture ref: SEAM-022 (visibility toggle); components-01.md (mentioned in chat-header)

Action: Create features/chat/components/visibility-selector.tsx — "use client" component. Props: chatId, selectedVisibilityType, className?. DropdownMenu with two options: Private (lock icon) and Public (globe icon). Current selection shown as trigger button text/icon. On selection: calls setChatVisibilityType from useChatVisibility hook (P06-T13). Responsive: hidden on mobile (className includes "hidden md:flex"). Only shown for own chats (not readonly).

Output files:
- features/chat/components/visibility-selector.tsx

Inputs: features/chat/hooks/use-chat-visibility.ts (P06-T13), components/ui/ (P00-T11)
Outputs: VisibilitySelector consumed by chat header (P06-T14)

AI layer handling: NEW

Dependencies: P06-T13, P00-T11
Dependents: P06-T14

Success criteria:
- Dropdown with Private and Public options
- Lock icon for private, globe icon for public
- Selection calls useChatVisibility setter
- Hidden on mobile (md:flex)
- Current selection displayed on trigger
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T13]
Title: Create use-chat-visibility hook
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: state-management.md (useChatVisibility: SWR optimistic + server action)
Architecture ref: SEAM-022 (visibility toggle optimistic + server); DEV-007 (SWR for optimistic state)

Action: Create features/chat/hooks/use-chat-visibility.ts — "use client" hook useChatVisibility(chatId: string, initialVisibility: "public" | "private"). Uses useSWR with key "{chatId}-visibility" and fallbackData initialVisibility. Exposes: visibilityType (current value), setChatVisibilityType(type) — (1) Optimistic SWR mutate to new value, (2) Server action updateChatVisibility({ chatId, visibility: type }) via fetch or direct call, (3) On failure: rollback to previous value via SWR mutate + show toast error. Server action updateChatVisibility: "use server" function that validates auth, ownership, updates DB + cache via lib/data/chat.ts updateChatVisibility(). Can be in same file or separate action file.

Output files:
- features/chat/hooks/use-chat-visibility.ts

Inputs: lib/data/chat.ts (P01-T07), features/auth/lib/session.ts (P02-T01), swr package
Outputs: useChatVisibility consumed by VisibilitySelector (P06-T12) and sidebar history item (P05-T04)

AI layer handling: NEW

Dependencies: P01-T07, P02-T01
Dependents: P06-T12, P06-T14

Success criteria:
- SWR key "{chatId}-visibility" stores current visibility
- Optimistic update on setChatVisibilityType
- Server action validates auth and ownership
- DB + cache updated on success
- Rollback + toast on failure
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T14]
Title: Wire visibility selector into chat header
Phase: 6 — Enhancements Vertical
Type: INTEGRATION

Behavior ref: components-01.md (chat-header.tsx includes VisibilitySelector)
Architecture ref: SEAM-022 (visibility toggle in header)

Action: Update features/chat/components/chat-header.tsx — Replace the VisibilitySelector placeholder (from P03-T18) with the real VisibilitySelector component (P06-T12). Pass chatId and selectedVisibilityType props. Only render when not readonly and on desktop (hidden md:flex class). Wire useChatVisibility hook for state management.

Output files:
- features/chat/components/chat-header.tsx (modify)

Inputs: features/chat/components/visibility-selector.tsx (P06-T12), features/chat/components/chat-header.tsx (P03-T18)
Outputs: Visibility selector functional in chat header

AI layer handling: NEW

Dependencies: P06-T12, P03-T18
Dependents: P06-T18

Success criteria:
- VisibilitySelector rendered in chat header (desktop only)
- Hidden for readonly chats
- Visibility changes reflected immediately (optimistic)
- Does not break existing header layout
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P06-T15]
Title: Create toast notification component
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: components-02.md (toast.tsx: wraps sonner, custom styling, multi-line detection)
Architecture ref: conventions.md (shared UI components in components/)

Action: Create components/ui/toast.tsx (or update if basic sonner Toaster already exists from P00-T05) — "use client" export of custom toast function wrapping sonner.toast.custom. Props: type ("success" | "error"), description (string). Layout: toast-mobile:w-[356px] responsive width, icon left + description right. Multi-line detection: ResizeObserver + lineHeight calculation → alignment switch (items-center for single line, items-start for multi-line). Success icon: CheckCircle (green). Error icon: XCircle (red). This is the standardized toast used across all features for success/error feedback.

Output files:
- components/ui/toast.tsx

Inputs: sonner package, components/ui/ (P00-T11)
Outputs: Toast function consumed by all features (voting, visibility, settings, upload errors)

AI layer handling: NEW

Dependencies: P00-T11
Dependents: P06-T18

Success criteria:
- toast({ type: "success", description: "..." }) renders styled notification
- toast({ type: "error", description: "..." }) renders error notification
- Multi-line detection adjusts alignment
- Mobile responsive width
- Consistent styling across all usages
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T16]
Title: Create artifact toolbar component
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (toolbar system with per-kind items); components-01.md (toolbar.tsx); interactions.md (two-tap activation)
Architecture ref: scaffold/directory-structure.md (features/artifacts/components/toolbar.tsx)

Action: Create features/artifacts/components/toolbar.tsx — "use client" component. Draggable toolbar that appears over the artifact panel when isToolbarVisible is true. Renders ArtifactToolbarItem buttons defined per artifact kind: Text toolbar (Add final polish → SparklesIcon, Request suggestions → MessageIcon), Sheet toolbar (Format data → FormatIcon, Analyze data → ChartIcon). Each toolbar item triggers an AI update call with a predefined description string. Two-tap activation pattern: first tap selects tool, second tap executes. Uses framer-motion for positioning and drag behavior. Keyboard: Enter/Space for activation. Toolbar items come from artifactDefinitions[kind].toolbar array.

Output files:
- features/artifacts/components/toolbar.tsx

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), framer-motion, components/ui/ (P00-T11)
Outputs: Toolbar consumed by artifact panel (P04-T17 — update import)

AI layer handling: NEW

Dependencies: P04-T01, P04-T17, P00-T11
Dependents: P06-T18

Success criteria:
- Toolbar renders per-kind action buttons
- Two-tap activation (select then execute)
- Draggable positioning via framer-motion
- Toolbar items trigger AI update with predefined description
- Keyboard accessible (Enter/Space)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T17]
Title: Create health check endpoint
Phase: 6 — Enhancements Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (health check: DB ping, cache ping, env check)
Architecture ref: conventions.md (route handlers)

Action: Create app/api/health/route.ts — GET handler (no auth required). Checks: (1) Database: SELECT 1 with latency measurement (>1000ms = degraded), (2) Cache (Redis): PING with latency measurement, (3) Environment: required env vars present (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY). Returns JSON: { status: "healthy" | "degraded" | "unhealthy", checks: { database: { status, latency }, cache: { status, latency }, environment: { status, missing: string[] } }, timestamp }. Overall status: healthy if all pass, degraded if any slow, unhealthy if any fail.

Output files:
- app/api/health/route.ts

Inputs: lib/db/client.ts (P01-T01), lib/cache/client.ts (P01-T03)
Outputs: Health check endpoint for monitoring

AI layer handling: NEW

Dependencies: P01-T01, P01-T03
Dependents: P06-T18

Success criteria:
- GET /api/health returns JSON with status + individual checks
- DB check: SELECT 1 with latency
- Cache check: PING with latency
- Env check: required vars present
- Status logic: healthy/degraded/unhealthy
- No auth required
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P06-T18]
Title: Verification gate G06
Phase: 6 — Enhancements Vertical
Type: VERIFICATION

Behavior ref: features.md (all enhancement features)
Architecture ref: AGENTS.md (post-implementation validation)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) Vote buttons on assistant messages work — optimistic SWR + server persist, (5) Guests cannot vote (403), (6) Model selector shows grouped models with search, (7) Model selection persists to cookie + localStorage, (8) Different models produce different responses, (9) Settings panel: temperature, topP, maxOutputTokens affect AI output, (10) Custom system prompt injected into AI context, (11) Reasoning toggle works on supported models, (12) File picker opens, files upload to Vercel Blob, (13) Preview attachment shows thumbnails, (14) Attachments sent as message parts, (15) Visibility toggle between public/private with optimistic update, (16) Rollback on visibility failure with toast, (17) Health endpoint returns status with checks, (18) All features work together without conflicts.

Output files: none (validation only)

Inputs: all P06-T01 through P06-T17 outputs
Outputs: Gate G06 passed — P07 (polish) can begin

AI layer handling: N/A

Dependencies: P06-T01 through P06-T17
Dependents: P07-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- Voting works (up/down, optimistic, persisted, guest blocked)
- Model selection works (dropdown, search, persistence, affects responses)
- Settings work (temperature, system prompt, reasoning toggle)
- File upload works (picker, upload, preview, send as attachment)
- Visibility toggle works (optimistic, rollback on failure)
- Health check returns correct status
- Toast notifications display correctly
- All features work together without conflicts

Complexity: S
