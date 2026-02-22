# UI Parity Checklist 2: Chat, Sidebar, Artifacts, and Interaction Surfaces

## Reasoning
- The core user-perceived product behavior is component orchestration (timeline, composer, sidebar history, artifact panel).
- These surfaces include the majority of edge/error/loading states and therefore carry the highest regression risk in rebuild.

## A. Chat Timeline and Message Rendering

### A1. Message List Virtualization and Scroll UX
- **Source:** `oldapp/components/messages.tsx`.
- **Parity requirements**
  - Virtualized timeline (`react-virtuoso`) with header/footer composition.
  - Auto-scroll when submitting if auto-scroll setting enabled.
  - Floating "scroll to bottom" button shown only when not at bottom.
  - Empty assistant message is hidden when terminal error occurs.
- **State coverage**
  - Empty conversation -> greeting-only layout.
  - Submitted -> thinking message appears.
  - Streaming -> last message flagged loading.
  - Error (ready state) -> inline error panel + retry CTA.

### A2. Message Bubble, Parts, and Actions
- **Source:** `oldapp/components/message.tsx`, `oldapp/components/message-actions.tsx`, `oldapp/components/message-editor.tsx`, `oldapp/components/message-reasoning.tsx`.
- **Parity requirements**
  - User/assistant alignment differs (user right bubble, assistant left with sparkles avatar).
  - Attachments shown as media tiles above message body.
  - Part rendering: text, reasoning section, weather tool result, create/update document tool results, suggestion request results.
  - User actions: copy, edit (hover-revealed); assistant actions: copy, upvote, downvote.
  - Edit flow: inline textarea, cancel/send, trailing-message deletion and regeneration.
- **A11y parity**
  - `aria-pressed` on voting actions.
  - Tool/result sections expose status-like semantics via badges and labels.
- **Animation parity**
  - Message fade-in, thinking transition, collapsible reasoning animated open/close.

## B. Composer and Input System

### B1. Multimodal Composer
- **Source:** `oldapp/components/multimodal-input.tsx`, `oldapp/components/elements/prompt-input.tsx`, `oldapp/components/preview-attachment.tsx`, `oldapp/components/suggested-actions.tsx`.
- **Parity requirements**
  - Sticky composer with textarea + context panel + attachment button + compact model selector + submit/stop button.
  - Suggested actions grid only when no messages and no attachments/upload queue.
  - Query-prefill flow can seed and auto-submit an initial message once per URL-driven startup.
  - Attachments support file picker, paste, drag/drop, remove, upload-progress tiles.
  - Submit disabled when input empty or upload in progress.
  - Stop button appears while submitted; otherwise circular send button.
- **Keyboard behavior**
  - Enter submits; Shift+Enter inserts newline.
  - IME composition must not trigger submit.
  - Backspace on empty textarea removes last attachment.
- **Error states**
  - Submit blocked while model busy -> toast.
  - Provider billing/credit-card activation failure path surfaces actionable dialog state.
  - Upload failure -> toast.
  - Invalid accept/size/count constraints (for prompt-input primitives) produce error callbacks.

### B2. Model and Visibility Selection
- **Source:** `oldapp/components/model-selector.tsx`, `oldapp/components/visibility-selector.tsx`, `oldapp/components/multimodal-input.tsx`.
- **Parity requirements**
  - Header visibility selector (`Private`/`Public`) hidden on mobile header button area and hidden in readonly mode.
  - Model selector supports grouped providers, badges, capabilities, refresh action.
  - Compact composer model selector displays name + description in dropdown items.
- **State coverage**
  - Optimistic selected model ID update.
  - Missing model fallback to first available model.
  - Disabled attachments for reasoning model IDs.

## C. Sidebar and History

### C1. Sidebar Shell and Controls
- **Source:** `oldapp/components/app-sidebar.tsx`, `oldapp/components/ui/sidebar.tsx`, `oldapp/components/sidebar-toggle.tsx`.
- **Parity requirements**
  - Left sidebar with app title, new chat button, optional delete-all button, history content, user menu footer.
  - Desktop collapse/expand and mobile sheet drawer behavior.
  - Sidebar cookie persistence (`sidebar_state`) and keyboard shortcut `Cmd/Ctrl+B`.

### C2. Chat History List
- **Source:** `oldapp/components/sidebar-history.tsx`, `oldapp/components/sidebar-history-item.tsx`.
- **Parity requirements**
  - Grouping buckets: Today, Yesterday, Last 7 days, Last 30 days, Older than last month.
  - Infinite paging + loading spinner footer + end-of-history message.
  - Empty states:
    - unauthenticated prompt ("Login to save..."),
    - authenticated no history prompt.
  - Per-chat context menu:
    - share visibility sub-menu (private/public checkmark),
    - delete action with confirmation dialog.
  - Delete all chats dialog in app sidebar.
- **Edge states**
  - optimistic chats merged into today group and removed once canonical data arrives.
  - title refresh event (`chat-title-updated`) updates history labels.

### C3. User Navigation Menu
- **Source:** `oldapp/components/sidebar-user-nav.tsx`.
- **Parity requirements**
  - Hydration-safe loading placeholder before auth resolution.
  - Avatar generated from email seed; guest label fallback.
  - Dropdown actions: toggle dark/light mode, login or sign out.
  - Sign-out path clears server auth and client cache.

## D. Artifact and Document Experience

### D1. Artifact Panel Lifecycle
- **Source:** `oldapp/components/artifact.tsx`, `oldapp/components/data-stream-handler.tsx`, `oldapp/components/data-stream-provider.tsx`.
- **Parity requirements**
  - Artifact opens from in-message hitbox with animated transform from click bounds.
  - Desktop split: left mini message column + right artifact content pane.
  - Mobile: artifact fills viewport.
  - Streamed artifact fields (`id/title/kind/content/status`) update live.
  - Dirty save indicator ("Saving changes...") and updated timestamp.
  - Error boundary fallback when artifact renderer fails.
- **Versioning states**
  - edit vs diff mode toggles.
  - non-latest version overlay and footer with restore/back actions.

### D2. Inline Document Cards and Editors
- **Source:** `oldapp/components/document-preview.tsx`, `oldapp/components/document.tsx`, `oldapp/components/document-skeleton.tsx`, `oldapp/components/code-editor.tsx`, `oldapp/components/text-editor.tsx`, `oldapp/components/sheet-editor.tsx`, `oldapp/components/image-editor.tsx`, `oldapp/components/diffview.tsx`, `oldapp/components/version-footer.tsx`.
- **Parity requirements**
  - Inline card has header icon/state + fullscreen affordance + scrollable content preview.
  - Skeletons vary by artifact kind (image vs text/code/sheet).
  - Editors:
    - text editor (markdown/tables/math/suggestion highlighting),
    - code editor (CodeMirror, streaming-safe updates),
    - sheet editor (grid CSV parse/unparse, min rows/cols),
    - image display and generation placeholder.
  - Diff viewer for version comparisons using highlighted inserted/deleted spans.

### D3. Artifact Toolbar and Actions
- **Source:** `oldapp/components/toolbar.tsx`, `oldapp/components/artifact-actions.tsx`.
- **Parity requirements**
  - Floating bottom-right radial-like toolbar with hover expansion and auto-close timer.
  - Streaming mode swaps tools for stop button.
  - Reading-level selector appears as draggable vertical control and sends reformulation prompt.
  - Artifact actions disable during streaming/loading and show tooltips.

## E. Settings, Toasts, and Utility Surfaces

### E1. Settings Sheet
- **Source:** `oldapp/components/settings/settings-sheet.tsx`.
- **Parity requirements**
  - Right sheet with sections:
    - Sampling (temperature, top-p, max output tokens),
    - system prompt textarea,
    - behavior toggles (reasoning, stream artifacts, auto-scroll),
    - reset and close buttons.
  - Custom On/Off toggle button semantics via `aria-pressed`.

### E2. Toast System
- **Source:** `oldapp/components/toast.tsx`.
- **Parity requirements**
  - Custom toast shell with icon by type (`success`/`error`), multiline-aware alignment, and compact responsive width.
  - Frequent async flows depend on exact toasts (auth, vote, chat notices, upload errors).

## Unknowns Requiring Confirmation
- `message.tsx` imports `./elements/response` and `message-actions.tsx` imports `./elements/actions`, but those files are not present under the `oldapp/components/elements` snapshot.
- Need confirmation whether missing modules are:
  - provided by external package aliasing, or
  - omitted from this `oldapp` copy.

## Conclusions
- Rebuild acceptance must treat this checklist as a state matrix, not a static component list.
- The artifact/document subsystem and sidebar/history synchronization are the two most failure-prone parity zones.
