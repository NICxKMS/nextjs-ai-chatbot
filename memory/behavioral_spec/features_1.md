# Feature Inventory: Core UX And Product Surface

## Feature Inventory: Core UX And Product Surface

### 1) Identity Modes And Session UX
- Dual user mode is first-class: authenticated users ("regular") and anonymous guest users.
- Guest session is auto-provisioned for non-auth routes via proxy cookie issuance and client bootstrap (`/api/auth/guest`).
- Authenticated session uses Supabase JWT exchanged into server cookie via `/api/auth/exchange`.
- Guest/regular behavior diverges in persistence and permissions:
  - Guest: cache-only data, lower quota, no voting persistence, no suggestion persistence.
  - Regular: DB + cache persistence, larger quota, voting/suggestions enabled.
- UI communicates guest state in user nav and limits privileged actions.

### 2) Chat Workspace (Primary Product Loop)
- Main page starts a fresh chat with generated UUID and server-provided model list.
- Existing chat page loads chat + messages server-side and sets read-only mode if ownership mismatch.
- Message composition supports:
  - Text prompt.
  - Multiple file attachments.
  - Model selection.
  - Visibility target (`public`/`private`).
  - User settings (sampling/system prompt/reasoning/artifact streaming/autoscroll).
- Chat transport is streaming-first over SSE (`/api/chat`) with partial data parts consumed incrementally in UI.
- Sending first message creates optimistic chat row in sidebar before backend persistence completes.

### 3) Message Rendering And Interaction
- Virtualized timeline (`react-virtuoso`) for scalability.
- Distinct role presentations:
  - User bubble styling.
  - Assistant card with tool/reasoning/renderable parts.
- Supported part rendering includes:
  - Text.
  - File attachments preview.
  - Reasoning section.
  - Tool parts (`getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`).
  - Document preview blocks.
- Message-level actions:
  - Edit/resubmit user message.
  - Retry on errors.
  - Vote up/down (non-guest).

### 4) Suggested Actions And Query-Seeded Starts
- Empty chat shows suggested actions to seed first message.
- `/?query=...` auto-injects a first user message and transitions URL to `/chat/:id` after submission.
- Suggested actions are hidden after first submission/attachments.

### 5) Model Selection And Persistence
- Available models are dynamically listed from registry/catalog.
- User’s selected model is persisted in local storage via settings store.
- New chats prefer persisted selected model after hydration; existing chats prefer chat context model.
- Model-specific behavior affects tool availability and attachment affordances (reasoning-like models can disable attachments client-side).

### 6) Visibility Control And Sharing Posture
- Visibility state per chat: `private`/`public`.
- Visibility can be changed from chat header and sidebar item menu.
- Updates are optimistic in client state and then server action (`updateChatVisibility`) persists.
- Private chats enforce ownership checks on reads and mutating operations.

### 7) Sidebar History And Navigation
- Sidebar has:
  - New chat action.
  - Delete-all action.
  - Grouped history sections (Today, Yesterday, Last 7 days, Last 30 days, Older).
- History uses infinite pagination via `/api/history` and virtualized grouped rendering.
- Optimistic chats are merged into Today group and removed when server list catches up.
- Empty states:
  - Not authenticated: login prompt.
  - Authenticated with no history: "conversations will appear here" messaging.

### 8) Chat Lifecycle Actions
- Per-chat delete via `/api/chat?id=...`.
- Delete-all chats via `/api/history` DELETE.
- Server actions support:
  - Delete trailing messages after timestamp.
  - Update visibility.
- Chat title generation happens asynchronously:
  - Placeholder title immediately.
  - Background generated title streamed transiently and later persisted.

### 9) Document Artifact Workspace
- Artifact panel is a side workspace for larger generated/edited content.
- Kinds supported by server handlers: `text`, `code`, `sheet`.
- Lifecycle:
  - AI tool emits transient stream parts (`data-kind`, `data-id`, `data-title`, deltas, `data-finish`).
  - Client `DataStreamHandler` updates artifact state and metadata in SWR-backed store.
  - Versions are persisted per document ID with timestamped entries.
- Text artifact:
  - Rich editor and suggestions overlay.
  - Version diff mode.
- Code artifact:
  - Editor + local execution console via Pyodide.
  - Supports image output capture for matplotlib.
- Sheet artifact:
  - CSV editing and clipboard export.
  - Toolbar prompts for data cleaning/analysis.

### 10) File Attachments
- Upload endpoint: `/api/files/upload` (`multipart/form-data`).
- Constraints:
  - Max 5MB.
  - MIME allow list + prefix checks.
  - Filename sanitization and controlled fallback naming.
- Client behavior:
  - Multi-file uploads with bounded concurrency.
  - Upload queue and preview placeholders.
  - Attachments serialized into message file parts before send.

### 11) Voting And Feedback
- Voting endpoint supports up/down updates (idempotent upsert semantics in DB layer).
- Voting requires:
  - Authenticated non-guest user.
  - Chat ownership.
  - Message belongs to target chat.
- UI vote state is server-provided for existing chats and updated optimistically by actions.

### 12) Suggestions Feature
- Suggestions are generated through AI tool pipeline tied to document content.
- Suggestions stream transiently to UI and persist only for non-guest users.
- Suggestions retrieval endpoint returns empty for guest users (no persistence path).

### 13) Auth Screens And Flows
- Login:
  - Existing signed-in regular session hitting `/login` redirects to home.
  - Supabase password sign-in.
  - Token exchange to secure server cookie.
  - Redirect to home on success.
- Register:
  - Existing signed-in regular session hitting `/register` redirects to home.
  - Supabase sign-up.
  - Handles both "session issued" and "email confirmation required" branches.
  - On immediate session branch, performs token exchange then redirects home.
- Logout:
  - Server route clears both auth and guest cookies.

### 14) Loading, Error, And Recovery UX
- Route-level loading screens for chat and conversation views.
- Chat route-specific error boundary with retry + go-home actions.
- Global error boundary fallback.
- In-chat error cards show retry action when stream/generation fails.
- Notice query params trigger user-facing toasts (`chat_not_found`, `user_not_found`) and are then cleaned from URL.

## Behavioral Conclusions
- Product center is a resilient streaming chat with optional artifact side-workspace, not a static Q/A page.
- Guest mode is intentionally usable but constrained, with reduced durability and capabilities.
- Visibility, ownership checks, and rate-limits are deeply integrated into nearly every mutating path.
- Artifact behavior is event-driven by custom stream parts and must be preserved as a synchronized secondary state machine.
