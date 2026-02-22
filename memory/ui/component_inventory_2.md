# Component Inventory 2: Chat Core, Artifact Stack, Interactive Elements

## Chat Core Components

- `Chat`
  - Role: orchestrates useChat transport, errors, model state, votes, artifact visibility.
  - Contracts: optimistic title/history behavior, query-prefill send, credit-card alert dialog, readonly composer suppression.
  - Traceability: `oldapp/components/chat.tsx`.

- `ChatHeader`
  - Role: top controls for chat screen.
  - Contracts: new chat action visibility by sidebar/device state, settings button, visibility selector when writable.
  - Traceability: `oldapp/components/chat-header.tsx`.

- `Messages`
  - Role: virtualized timeline renderer.
  - Contracts: greeting empty state, thinking footer, inline error+retry block, scroll-to-bottom affordance.
  - Traceability: `oldapp/components/messages.tsx`.

- `PreviewMessage` + `ThinkingMessage`
  - Role: message item rendering.
  - Contracts: assistant/user alignment, part-based rendering (text/reasoning/tool outputs), transition effects.
  - Traceability: `oldapp/components/message.tsx`.

- `MessageActions`
  - Role: action strip for copy/edit/vote.
  - Contracts: hover edit for user messages, up/downvote disabled state rules, optimistic vote cache updates.
  - Traceability: `oldapp/components/message-actions.tsx`.

- `MessageEditor`
  - Role: inline edit and regenerate flow.
  - Contracts: auto-resize textarea, cancel/send controls, trailing message deletion before regen.
  - Traceability: `oldapp/components/message-editor.tsx`.

- `MessageReasoning`
  - Role: wraps reasoning text in expandable stream-aware panel.
  - Contracts: default open during stream, closes after completion delay unless focused.
  - Traceability: `oldapp/components/message-reasoning.tsx`, `oldapp/components/elements/reasoning.tsx`.

- `Greeting`
  - Role: first-load conversational prompt.
  - Contracts: animated intro with optional model-count mention.
  - Traceability: `oldapp/components/greeting.tsx`.

## Composer and Input Components

- `MultimodalInput`
  - Role: chat composer and upload/model controls.
  - Contracts: persistent draft input, upload queue, suggested prompts, submit/stop state switching.
  - Traceability: `oldapp/components/multimodal-input.tsx`.

- `SuggestedActions`
  - Role: prefilled starter prompts.
  - Contracts: animated cards, click submits message directly.
  - Traceability: `oldapp/components/suggested-actions.tsx`.

- `PreviewAttachment`
  - Role: attachment chip/card for pending uploaded items.
  - Contracts: image thumbnail vs generic file tile, uploading overlay, hover remove button.
  - Traceability: `oldapp/components/preview-attachment.tsx`.

- `Prompt input primitives`
  - Role: reusable input framework used by composer.
  - Contracts: enter submit, shift-enter newline, backspace-to-remove attachment, drag/drop and paste file support, optional speech button.
  - Traceability: `oldapp/components/elements/prompt-input.tsx`.

- `VisibilitySelector`
  - Role: chat privacy mode switch.
  - Contracts: private/public options with descriptive text and selected check icon.
  - Traceability: `oldapp/components/visibility-selector.tsx`.

- `ModelSelector` (full + compact usage)
  - Role: model choice UI.
  - Contracts: grouped provider sections, capability tags, refresh option, optimistic selection behavior.
  - Traceability: `oldapp/components/model-selector.tsx`, `oldapp/components/multimodal-input.tsx`.

## Artifact/Document Components

- `Artifact`
  - Role: fullscreen/split artifact workspace.
  - Contracts: animated open from message bounds, mobile full takeover, metadata/actions/toolbar/version handling.
  - Traceability: `oldapp/components/artifact.tsx`.

- `ArtifactMessages`
  - Role: conversation strip inside artifact desktop split.
  - Contracts: mirrors main message rendering and thinking state.
  - Traceability: `oldapp/components/artifact-messages.tsx`.

- `ArtifactActions`
  - Role: artifact-level control buttons.
  - Contracts: tooltips, loading disable states, mode/version actions from artifact definition.
  - Traceability: `oldapp/components/artifact-actions.tsx`.

- `ArtifactErrorBoundary`
  - Role: protects chat from artifact render crashes.
  - Contracts: fallback panel with concise remediation and error text.
  - Traceability: `oldapp/components/artifact-error-boundary.tsx`.

- `Toolbar` (artifact floating tools)
  - Role: contextual transform/summarize controls.
  - Contracts: hover-expand behavior, auto-close timer, stop control while streaming, drag reading-level control.
  - Traceability: `oldapp/components/toolbar.tsx`.

- `DocumentPreview`
  - Role: inline document card in chat messages.
  - Contracts: skeletons, content-by-kind renderers, fullscreen hitbox behavior.
  - Traceability: `oldapp/components/document-preview.tsx`.

- `DocumentToolCall` / `DocumentToolResult`
  - Role: pending/completed tool operation UI for documents.
  - Contracts: icon and tense differences by operation type; readonly restriction toast.
  - Traceability: `oldapp/components/document.tsx`.

- `VersionFooter`
  - Role: previous-version warning and restore controls.
  - Contracts: animated footer, restore mutation spinner, back-to-latest action.
  - Traceability: `oldapp/components/version-footer.tsx`.

- `Document editors`
  - Role: specific kind renderers.
  - Contracts:
    - text: markdown editor with table/math/suggestion decorations,
    - code: CodeMirror streaming and edit persistence,
    - sheet: DataGrid CSV editing,
    - image: generated image preview/loading state,
    - diff: highlighted inserted/deleted text.
  - Traceability: `oldapp/components/text-editor.tsx`, `oldapp/components/code-editor.tsx`, `oldapp/components/sheet-editor.tsx`, `oldapp/components/image-editor.tsx`, `oldapp/components/diffview.tsx`.

## Specialized Display Components

- `Weather`
  - Role: rich weather tool output panel.
  - Contracts: day/night gradients, current temp + highs/lows, hourly forecast, sunrise/sunset.
  - Traceability: `oldapp/components/weather.tsx`.

- `Tool` primitives
  - Role: collapsible display for tool calls and outputs.
  - Contracts: status badges (pending/running/completed/error/denied), parameter and result formatting.
  - Traceability: `oldapp/components/elements/tool.tsx`.

- `Suggestion` primitives
  - Role: horizontally scrollable suggestion buttons.
  - Contracts: accessible labels and compact chip styling.
  - Traceability: `oldapp/components/elements/suggestion.tsx`.

## Ambiguous/Missing Entries
- `oldapp/components/message.tsx` references `./elements/response`.
- `oldapp/components/message-actions.tsx` references `./elements/actions`.
- These files were not found in `oldapp/components/elements`; verify whether they are externalized or missing from snapshot.

## Conclusions
- Chat and artifact stacks are deeply coupled; parity requires preserving message-part rendering contracts and stream timing assumptions.
- Missing referenced modules should be resolved before implementation planning to prevent silent behavior drift.
