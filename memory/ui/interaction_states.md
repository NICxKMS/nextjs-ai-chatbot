# UI Interaction States Matrix

Scope: consolidated state expectations across `oldapp` user-facing surfaces.

## Reasoning
- State parity failures usually occur in transitions (submitted -> streaming -> ready, empty -> optimistic -> persisted).
- This matrix captures interaction contracts independent of implementation details.

## 1) Global and Route-Level States

| Surface | Loading | Error | Empty | Success | Disabled |
|---|---|---|---|---|---|
| Root shell | Suspense spinner + "Loading..." | global generic error page | n/a | provider tree mounted | n/a |
| Chat route | page loading spinners | route error with Home + Try Again | greeting state when no messages | normal chat canvas | readonly hides composer |
| Auth pages | submit spinner in button | toast for validation/auth/session-exchange failures | empty fields on first load | redirect after login/register success | submit disabled while pending/success |

Traceability: `oldapp/app/layout.tsx`, `oldapp/app/global-error.tsx`, `oldapp/app/(chat)/*`, `oldapp/app/(auth)/*`.

## 2) Sidebar and Navigation States

- **Hover**
  - Chat item action menu trigger appears on hover when row not active.
  - Icon buttons use tooltip on desktop.
- **Focus/keyboard**
  - Sidebar toggle available via button and `Ctrl/Cmd+B`.
  - Dropdown menus are keyboard-navigable via Radix defaults.
- **Loading**
  - History skeleton rows while initial history fetch resolves.
  - Footer spinner when paginating.
- **Empty**
  - Unauthenticated: "Login to save and revisit previous chats!"
  - Authenticated but no data: "Your conversations will appear here..."
- **Error**
  - Delete chat/all failures surfaced via promise-toast error states.
- **Disabled**
  - Optimistic chats cannot be deleted from history.

Traceability: `oldapp/components/app-sidebar.tsx`, `oldapp/components/sidebar-history.tsx`, `oldapp/components/sidebar-history-item.tsx`, `oldapp/components/ui/sidebar.tsx`.

## 3) Composer States

- **Default**
  - Placeholder "Send a message...", attachments button, compact model selector.
- **Hover/focus**
  - Composer border subtly intensifies on hover/focus-within.
  - Attachment remove button appears on hover.
- **Keyboard**
  - Enter submit, Shift+Enter newline.
  - IME composition safe.
  - Backspace on empty removes most recent attachment.
- **Uploading**
  - Upload queue tile overlays with loader.
  - Submit disabled while upload queue non-empty.
- **Submitted/streaming**
  - Stop button appears while submitted.
  - Query-prefill route state can trigger one-shot auto-submit before normal composer interaction resumes.
  - Submit blocked with toast if model not ready.
- **Provider-failure recovery**
  - Billing/credit-card activation dialog appears for specific provider failure class and must expose actionable recovery.
- **Disabled**
  - Attachment button disabled when model busy or reasoning-only model selected.

Traceability: `oldapp/components/multimodal-input.tsx`, `oldapp/components/elements/prompt-input.tsx`, `oldapp/components/preview-attachment.tsx`.

## 4) Message and Timeline States

- **Empty**
  - Greeting component; suggested actions shown.
- **Submitted**
  - Thinking message appears in footer area.
- **Streaming**
  - Latest assistant message marked loading and re-renders continuously.
  - Scroll behavior can auto-follow output based on settings.
- **Error**
  - Inline error card with retry button at timeline footer.
  - Empty terminal assistant message filtered out in error case.
- **Hover**
  - User edit action appears on hover.
- **Voting**
  - Upvote/downvote disabled based on prior vote value.
- **Editing**
  - User message switches to inline textarea with cancel/send.

Traceability: `oldapp/components/messages.tsx`, `oldapp/components/message.tsx`, `oldapp/components/message-actions.tsx`, `oldapp/components/message-editor.tsx`.

## 5) Reasoning/Tool States

- **Reasoning panel**
  - Auto-opens while reasoning streams.
  - Auto-closes once after stream ends (delay) unless user focus is inside.
  - Trigger label changes from shimmer "Thinking..." to duration summary.
- **Tool panel states**
  - `input-streaming`: pending
  - `input-available`: running
  - `approval-requested` / `approval-responded`
  - `output-available`: completed
  - `output-error` / `output-denied`

Traceability: `oldapp/components/message-reasoning.tsx`, `oldapp/components/elements/reasoning.tsx`, `oldapp/components/elements/tool.tsx`.

## 6) Artifact and Document States

- **Open/close transitions**
  - Opens from source element bounds into fullscreen/split pane.
  - Closes with fade/scale exit.
- **Loading**
  - Document skeletons by kind.
  - "Saving changes..." dirty state during debounced saves.
- **Streaming**
  - Artifact status streaming updates title/kind/content incrementally.
  - Toolbar switches to stop button while streaming.
- **Versioning**
  - Prior version view overlays editor area and shows restore footer.
  - Diff/edit toggles by artifact action.
- **Readonly**
  - Opening shared-chat files blocked with toast.
- **Error**
  - Artifact content failures are captured by error boundary fallback.

Traceability: `oldapp/components/artifact.tsx`, `oldapp/components/document-preview.tsx`, `oldapp/components/document.tsx`, `oldapp/components/version-footer.tsx`, `oldapp/components/artifact-error-boundary.tsx`.

## 7) Accessibility and Assistive Signals

- Screen-reader-only labels present for icon-only controls (toggle sidebar, remove attachment, branch controls).
- Live regions:
  - auth submit button status output,
  - tool status badges use `role="status"`/`aria-live="polite"`.
- Form labels linked to inputs on auth forms.
- Dialog flows (delete chat/delete all/credit card activation) require focus-trapped modal behavior from UI primitives.

Traceability: `oldapp/components/submit-button.tsx`, `oldapp/components/auth-form.tsx`, `oldapp/components/elements/tool.tsx`, `oldapp/components/app-sidebar.tsx`, `oldapp/components/chat.tsx`.

## 8) Responsive and Motion Expectations

- **Breakpoints**
  - Core mobile breakpoint: `<768px`.
  - Sidebar becomes mobile sheet.
  - Header actions reorder/visibility shift by breakpoint and sidebar open state.
- **Motion**
  - Greeting and suggestion cards stagger in.
  - Message items fade in.
  - Collapsible reasoning/tool content animates open/closed.
  - Artifact panel uses spring-like open/close transitions.

Traceability: `oldapp/hooks/use-mobile.ts`, `oldapp/components/chat-header.tsx`, `oldapp/components/suggested-actions.tsx`, `oldapp/components/message.tsx`, `oldapp/components/artifact.tsx`.

## Ambiguous Behaviors to Confirm
- Missing referenced modules (`elements/response`, `elements/actions`) may hide additional interaction logic.
- `layout.tsx` passes `initialSidebarOpen/initialIsMobile`; current chat-layout client implementation appears not to consume them directly.

## High-Risk Parity Areas
- Streamed transitions across timeline + artifact (multiple async sources mutating adjacent UI).
- Sidebar history optimistic sync and grouped infinite pagination.
- Inline message edit/regenerate workflow (state rollback and message truncation behavior).
