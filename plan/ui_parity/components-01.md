# Components Map — Part 01 (A–M)

> **Updated per redesign audit (2026-03-01)**

> Every component in `oldapp/components/`, mapped with props, hierarchy, state, events, and rebuild location.

> ⚠️ **Scope note (redesign precedence):** This file is a parity/reference inventory. Authoritative implementation targets are `scaffold/directory-structure.md`, `phases/*.md`, and `final_plan/phase-*.md`. Entries for removed files (e.g., `app-sidebar.tsx`, `artifact-messages.tsx`, `console.tsx`, `create-artifact.tsx`, `diffview.tsx`) are historical and **not** rebuild targets unless explicitly reintroduced.

---

## app-sidebar.tsx → *(historical, removed in redesign; replaced by `features/sidebar/components/sidebar-shell.tsx` + client subcomponents)*

> *Redesign: Parent changes from `chat-layout-client.tsx` to `SidebarShell` (server wrapper). Delete All uses Server Action `deleteAllChats()` instead of `fetch("/api/history", DELETE)`. `useAuth` → `useSession`.*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | None |
| **Parents** | `SidebarShell` (server component wrapper) *(redesign: replaces chat-layout-client.tsx)* |
| **Children** | `Sidebar`, `SidebarHeader`, `SidebarMenu`, `SidebarContent` → `SidebarHistoryClient`, `SidebarFooter` → `SidebarUserNav`, `AlertDialog` (delete all) *(redesign: SidebarHistory → SidebarHistoryClient)* |
| **State** | `showDeleteAllDialog: boolean` |
| **Events** | New Chat click → `router.push("/")` + `router.refresh()`, Delete All → Server Action `deleteAllChats()` *(redesign: replaces fetch + SWR mutate)*, Mobile close on nav |
| **Hooks** | `useRouter`, `useSidebar`, `useSession` *(redesign: renamed from useAuth)* |
| **Memo** | None |
| **Notes** | sidebar border-r-0 override; "Assistant" brand text in header |

---

## artifact.tsx → `features/artifacts/components/artifact-panel.tsx` *(redesign: renamed to ArtifactPanel)*

> *Redesign: Parent changes from `Chat` to `ChatShell`. `document` state → `artifact`. `DocumentKind` → `ArtifactKind`. SWR document fetch → `useSyncExternalStore` artifact store. props drastically reduced (ChatSessionContext provides most via context).*

| Field | Detail |
|-------|--------|
| **Type** | Client (imported, no directive — wrapped in memo) |
| **Props** | Context-driven; own props kept minimal (2 or fewer) |
| **Parents** | `ChatShell` component *(redesign: renamed from Chat)* |
| **Children** | `ArtifactCloseButton`, `ArtifactActions`, `ArtifactMessages`, `MultimodalInput`, `Toolbar`, `VersionFooter`, `ArtifactErrorBoundary` → dynamic artifact content |
| **State** | `mode: "edit" | "diff"`, `artifact: Artifact | null` *(redesign: renamed from document: Document)*, `currentVersionIndex: number`, `isContentDirty: boolean`, `isToolbarVisible: boolean` |
| **Events** | Version navigation (prev/next/toggle/latest), content save (debounced 2s), artifact fetch via `useSyncExternalStore` *(redesign: replaces SWR)* |
| **Exports** | `ArtifactPanel` (memo) *(redesign: renamed from Artifact)*, `artifactDefinitions` array, `ArtifactKind` type, `UIArtifact` type |
| **Layout** | Fixed overlay `z-50 h-dvh w-dvw`. Desktop: 400px message sidebar + remaining for content. Mobile: full-screen. AnimatePresence for enter/exit. Spring animations. |
| **Memo** | Deep comparison on `status`, `votes`, `input`, `messages`, `selectedVisibilityType`, `isReadonly`, `selectedModelId`, `attachments` |

---

## artifact-actions.tsx → `features/artifacts/components/artifact-actions.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo component |
| **Props** | `artifact: UIArtifact`, `handleVersionChange`, `currentVersionIndex`, `isCurrentVersion`, `mode`, `metadata`, `setMetadata` |
| **Parents** | `Artifact` |
| **Children** | Dynamic artifact definition `actions` array → `Button` + `Tooltip` |
| **State** | `isLoading: boolean` |
| **Events** | Each action's `onClick(actionContext)` |

---

## artifact-close-button.tsx → `features/artifacts/components/artifact-close-button.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo component (always skips re-render) |
| **Props** | None |
| **Parents** | `Artifact` |
| **Children** | `Button` with `CrossIcon` |
| **Events** | Click → setArtifact to initial data or hide if streaming |

---

## artifact-error-boundary.tsx → `features/artifacts/components/artifact-error-boundary.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Class Component (React error boundary) |
| **Props** | `children`, `fallback?` |
| **Parents** | `Artifact` |
| **State** | `hasError: boolean`, `error: Error | null` |
| **Fallback UI** | "Failed to render artifact" message + error code display |

---

## artifact-messages.tsx → *(historical, removed in redesign)*

| Field | Detail |
|-------|--------|
| **Type** | Memo component |
| **Props** | `chatId`, `status`, `votes`, `messages`, `setMessages`, `regenerate`, `isReadonly`, `artifactStatus`, `availableModels` |
| **Parents** | `ArtifactPanel` (desktop only, 400px sidebar) *(redesign: renamed from Artifact)* |
| **Children** | `PreviewMessage` (loop), `ThinkingMessage` (AnimatePresence), scroll sentinel |
| **Hooks** | `useChatSessionContext` *(redesign: renamed from useMessages — messages via ChatSessionContext)* |
| **Memo** | Skips re-render when artifact is streaming |

---

## auth-form.tsx → `features/auth/components/auth-form.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) — uses `useActionState` |
| **Props** | `action`, `children`, `defaultEmail?` |
| **Parents** | Login page (server component), Register page (server component) |
| **Children** | `Form` (next/form), `Label`, `Input` (email + password), `{children}` |
| **Hooks** | `useActionState` (react) |
| **Notes** | Email field: autoComplete="email", autoFocus, required; Password: required, type="password" |

---

## auth-provider.tsx → `features/auth/components/session-provider.tsx` *(redesign: renamed)*

> *Redesign: `AuthProvider` → `SessionProvider`. `useAuth` → `useSession`. Guest bootstrap and Supabase listener behavior preserved.*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) • Context Provider |
| **Props** | `session: AppSession | null`, `children` |
| **Context Value** | `session`, `isLoading`, `isGuest` |
| **State** | `session`, `isNewSession`, `bootstrapAttempted` |
| **Effects** | Guest bootstrap via `proxy.ts` + `getAppSession()` resolution, Supabase auth state change listener |
| **Exports** | `SessionProvider` *(redesign: renamed from AuthProvider)*, `useSession` hook *(redesign: renamed from useAuth)* |

---

## chat.tsx → `features/chat/components/chat-shell.tsx` *(redesign: renamed to ChatShell, thin orchestrator ~60 lines)*

> *Redesign: The monolithic `Chat` component (524 lines) is replaced by `ChatShell` (~60 lines). `ChatShell` provides `ChatSessionContext` (inline provider) exposing messages, setMessages, chatId, selectedModel, visibility, append, reload, stop. Most props come from server-fetched data. `useDataStream` → `useChatStream`. `useOptimisticChats` → `usePendingChats`. `useAuth` → `useSession`. `useSettings` replaces `useSettingsSnapshot`. No credit/usage alert. `data-usage` → removed. `data-chat-title` → `chat-title`. `Artifact` child → `ArtifactPanel`.*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `id`, `initialMessages`, `initialChatModel`, `isReadonly`, `availableModels` |
| **Parents** | Home page, Chat/[id] page |
| **Children** | `ChatHeader`, `Messages`, `MultimodalInput`, `ArtifactPanel` (dynamic) *(redesign: no AlertDialog credit card)* |
| **State** | `input`, `currentModelId`, `attachments`, `hasAppendedQuery` *(redesign: `usage`, `showCreditCardAlert` removed)* |
| **Hooks** | `useChat` (AI SDK), `useChatStream` *(redesign: renamed from useDataStream)*, `useSettings` *(redesign: useSyncExternalStore, no SettingsProvider)*, `useSession` *(redesign: renamed from useAuth)*, `usePendingChats` *(redesign: renamed from useOptimisticChats)*, `useArtifact`, `useArtifactSelector`, `useSearchParams` |
| **Key behaviors** | Adaptive throttle (50/100/150ms by connection), optimistic chat creation on first message, title via `chat-title` stream part *(redesign: single-channel)*, URL query auto-send, model persistence to localStorage |
| **Transport** | `DefaultChatTransport` with custom `prepareSendMessagesRequest` adding model/visibility/settings |
| **onData handlers** | `chat-title` (updates pending title) *(redesign: `data-usage` removed, `data-chat-title` → `chat-title`)* |
| **Layout** | `h-dvh min-w-0 flex-col bg-background` |
| **Lines** | ~60 *(redesign: reduced from 524)* |

---

## chat-header.tsx → `features/chat/components/chat-header.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `chatId`, `selectedVisibilityType`, `isReadonly` |
| **Parents** | `ChatShell` *(redesign: renamed from Chat)* |
| **Children** | `SidebarToggle`, `Button` (New Chat), `VisibilitySelector`, `SettingsButton` |
| **Layout** | `sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5` |
| **Responsive** | New Chat button visible when sidebar closed or mobile. `order-*` classes for reordering. |

---

## code-editor.tsx → `features/artifacts/components/code-editor.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `content`, `onSaveContent`, `status`, `isCurrentVersion`, `currentVersionIndex`, `suggestions` |
| **Parents** | `ArtifactPanel` (via `codeArtifact.content`) *(redesign: renamed from Artifact)* |
| **Dependencies** | CodeMirror (lazy-loaded): `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-python`, `@codemirror/theme-one-dark` |
| **State** | `modules: CodeMirrorModules | null` |
| **Notes** | Module cache singleton pattern; streaming content updates via `EditorView.dispatch` |

---

## console.tsx → *(historical, removed in redesign)*

| Field | Detail |
|-------|--------|
| **Type** | Client Component |
| **Props** | `consoleOutputs`, `setConsoleOutputs` |
| **Parents** | Code artifact |
| **State** | `height: number` (resizable), `isResizing: boolean` |
| **A11y** | `role="slider"` on resize handle, `aria-label`, `aria-valuemin/max/now`, keyboard arrows |
| **Notes** | Clears outputs when artifact not visible; auto-scrolls on new output |

---

## create-artifact.tsx → *(historical, removed in redesign)*

| Field | Detail |
|-------|--------|
| **Type** | Pure TypeScript definitions (no JSX rendering) |
| **Exports** | `Artifact` class, `ArtifactActionContext`, `ArtifactToolbarContext`, `ArtifactToolbarItem`, type definitions |
| **Purpose** | Factory/config class for artifact types (text, code, image, sheet) |

---

## data-stream-handler.tsx → `features/chat/components/stream-bridge.tsx` *(redesign: renamed to StreamBridge)*

> *Redesign: `DataStreamHandler` → `StreamBridge`. Uses pure `processStreamDelta()` function to process stream parts and update `artifactStore` (useSyncExternalStore). Thin ~30-line bridge component.*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) — renders `null` |
| **Props** | `id: string` |
| **Parents** | Home page, Chat/[id] page (sibling to `ChatShell`) *(redesign: renamed from Chat)* |
| **Hooks** | `useChatStream` *(redesign: renamed from useDataStream)*, `useArtifact` *(redesign: now useSyncExternalStore-based)* |
| **Effects** | Processes stream deltas via `processStreamDelta()` → updates `artifactStore` (id, title, kind, clear, finish) + artifact-specific `onStreamPart` |

---

## data-stream-provider.tsx → `features/chat/components/chat-stream-provider.tsx` *(redesign: renamed to ChatStreamProvider)*

> *Redesign: `DataStreamProvider` → `ChatStreamProvider`. Scoped to page level (not layout level). Split state/dispatch pattern retained.*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) • Split Context Provider |
| **Props** | `children` |
| **Exports** | `ChatStreamProvider` *(redesign: renamed from DataStreamProvider)*, `useChatStreamState` *(redesign: renamed from useDataStreamState)*, `useChatStreamDispatch` *(redesign: renamed)*, `useChatStream` *(redesign: renamed from useDataStream)* |
| **Pattern** | Split state/dispatch contexts to prevent unnecessary re-renders |

---

## diffview.tsx → *(historical, removed/deferred in redesign)*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `oldContent: string`, `newContent: string` |
| **Parents** | Text artifact (diff mode) |
| **Dependencies** | TipTap: `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, table extensions |
| **Notes** | Custom `DiffMark` extension for green/red highlighting; custom `DiffExtension` ProseMirror plugin |

---

## document.tsx → `features/artifacts/components/artifact-tool-result.tsx` *(redesign: renamed)*

> *Redesign: `DocumentToolResult` → `ArtifactToolResult`. `DocumentToolCall` → `ArtifactToolCall`. File renamed from `document.tsx` to `artifact-tool-result.tsx`.*

| Field | Detail |
|-------|--------|
| **Type** | Memo components |
| **Exports** | `ArtifactToolResult` (memo, always skip) *(redesign: renamed from DocumentToolResult)*, `ArtifactToolCall` *(redesign: renamed from DocumentToolCall)* |
| **Props** | `type: "create" | "update" | "request-suggestions"`, `result`, `isReadonly` |
| **Parents** | `PreviewMessage` (tool call parts) |
| **Events** | Click → opens artifact panel via `setArtifact` with bounding box |

---

## document-preview.tsx → `features/artifacts/components/artifact-preview.tsx` *(redesign: renamed)*

> *Redesign: `DocumentPreview` → `ArtifactPreview`. Parents reference `tool-createArtifact`/`tool-updateArtifact` parts. SWR fetch `/api/document` → `/api/artifact`.*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) with dynamic editor imports |
| **Props** | `isReadonly`, `result?`, `args?` |
| **Parents** | `PreviewMessage` (`tool-createArtifact`, `tool-updateArtifact` parts) *(redesign: renamed from tool-createDocument/tool-updateDocument)* |
| **Children** | Lazy: `CodeEditor`, `ImageEditor`, `SpreadsheetEditor`, `Editor` (text) |
| **State** | Artifact fetched via SWR (`/api/artifact?id=`) *(redesign: renamed from /api/document)* |
| **Notes** | Captures bounding box via `hitboxRef` for artifact open animation |
| **Lines** | 349 |

---

## document-skeleton.tsx → `features/artifacts/components/artifact-skeleton.tsx` *(redesign: renamed)*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Exports** | `ArtifactSkeleton` (image vs text variants) *(redesign: renamed from DocumentSkeleton)*, `InlineArtifactSkeleton` *(redesign: renamed from InlineDocumentSkeleton)* |
| **Parents** | `ArtifactPreview` *(redesign: renamed from DocumentPreview)* |
| **Notes** | Image skeleton: aspect-ratio 4/3, max-w-800. Text: prose layout with heading/paragraph pulse bars |

---

## greeting.tsx → `features/chat/components/greeting.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Server-compatible (no `"use client"`) |
| **Props** | `availableModels?` |
| **Parents** | `Messages` (when no messages) |
| **Animation** | `motion.div` with opacity+y fade-in, delay 0.5s/0.6s |
| **Content** | "Hello there!" + dynamic model count message |

---

## icons.tsx → `components/icons.tsx` (shared)

| Field | Detail |
|-------|--------|
| **Type** | Pure SVG components |
| **Lines** | 1158 |
| **Exports** | ~40 icon components (PlusIcon, TrashIcon, SparklesIcon, LoaderIcon, etc.) |
| **Notes** | All accept `size` prop with defaults; some have additional style props |

---

## image-editor.tsx → `features/artifacts/components/image-editor.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Named export (no `"use client"` directive — non-interactive) |
| **Props** | `title`, `content` (base64), `status`, `isInline`, `currentVersionIndex`, `isCurrentVersion` |
| **Parents** | Artifact (image kind), ArtifactPreview *(redesign: renamed from DocumentPreview)* |
| **Layout** | Full height when not inline (`h-[calc(100dvh-60px)]`), 200px when inline |
| **States** | Streaming: loader + "Generating Image..."; Idle: `<img>` with base64 src |

---

## message.tsx → `features/chat/components/message.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Exports** | `PreviewMessage` (memo), `ThinkingMessage` |
| **Props (PreviewMessage)** | `chatId`, `message`, `vote`, `isLoading`, `setMessages`, `regenerate`, `isReadonly`, `requiresScrollPadding` |
| **Parents** | `Messages`, `ArtifactMessages` |
| **Children** | `MessageReasoning`, `MessageContent` (element), `Response` (element), `MessageEditor`, `MessageActions`, `PreviewAttachment`, `ArtifactPreview` *(redesign: renamed from DocumentPreview)*, `ArtifactToolResult` *(redesign: renamed from DocumentToolResult)*, `Weather`, `Tool`/`ToolContent`/`ToolHeader`/`ToolInput`/`ToolOutput` (elements) |
| **State** | `mode: "view" | "edit"` |
| **Parts handled** | `reasoning`, `text`, `file`, `tool-getWeather`, `tool-createArtifact` *(redesign: renamed from tool-createDocument)*, `tool-updateArtifact` *(redesign: renamed from tool-updateDocument)*, `tool-requestSuggestions` |
| **User message style** | Right-aligned, blue background (`#006cff`), white text, rounded-2xl |
| **Assistant style** | Left-aligned, SparklesIcon avatar (ring-1 ring-border), transparent bg |
| **Memo** | Always re-renders during loading; checks `message.id`, `parts`, `vote`, `requiresScrollPadding` |
| **Lines** | 387 |

---

## message-actions.tsx → `features/chat/components/message-actions.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Component (uses `Action`/`Actions` elements) |
| **Props** | `chatId`, `message`, `vote`, `isLoading`, `setMode?` |
| **Parents** | `PreviewMessage` |
| **User actions** | Edit (hover-only, absolute positioned), Copy |
| **Assistant actions** | Copy, Upvote, Downvote |
| **Vote API** | Server Action `voteOnMessage()` with `useOptimistic` *(redesign: replaces PATCH /api/vote with SWR mutation)* |
| **Lines** | 207 |

---

## message-editor.tsx → `features/chat/components/message-editor.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `chatId`, `message`, `setMode`, `setMessages`, `regenerate` |
| **Parents** | `PreviewMessage` (when mode="edit") |
| **Children** | `Textarea`, Cancel `Button`, Send `Button` |
| **State** | `isSubmitting`, `draftContent` |
| **Flow** | Cancel → setMode("view"); Send → `deleteTrailingMessages` server action → update messages → regenerate |
| **A11y** | Auto-resize textarea, data-testid |

---

## message-reasoning.tsx → `features/chat/components/message-reasoning.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `isLoading`, `reasoning: string` |
| **Parents** | `PreviewMessage` (reasoning parts) |
| **Children** | `Reasoning`, `ReasoningTrigger`, `ReasoningContent` (elements) |
| **State** | `hasBeenStreaming`, `isReasoningStreaming` |
| **Behavior** | Default open when streamed; tracks content changes to detect active streaming |

---

## messages.tsx → `features/chat/components/messages.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `chatId`, `status`, `votes`, `messages`, `setMessages`, `regenerate`, `isReadonly`, `isGuest`, `isArtifactVisible`, `selectedModelId`, `chatError?`, `clearError?` |
| **Parents** | `ChatShell` *(redesign: renamed from Chat)* |
| **Children** | `Virtuoso` (react-virtuoso), `Greeting` (empty state), `PreviewMessage` (items), `ThinkingMessage` (footer), `ErrorMessage` (footer), scroll-to-bottom button |
| **State** | `isAtBottom`, `hasSentMessage` |
| **Hooks** | `useChatStream` *(redesign: renamed from useDataStream)*, `useSettings` *(redesign: replaces useSettingsSnapshot — useSyncExternalStore, no SettingsProvider)* |
| **Key patterns** | Virtualized list with `followOutput="smooth"`, `increaseViewportBy={top:200, bottom:200}`, `atBottomThreshold=100`; empty messages filter for error state; scroll-to-bottom FAB |
| **Memo** | Skips re-render when artifact visible (both prev & next); always re-renders during streaming |
| **Lines** | 320 |

---

## model-selector.tsx → `features/models/components/model-selector.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `selectedModelId`, `availableModels`, `onModelChange`, `className?`, `disabled?` |
| **Parents** | (Standalone page-level selector — currently used in compact form inside MultimodalInput) |
| **Children** | `DropdownMenu` → model rows grouped by provider |
| **State** | `optimisticModelId`, `filter` |
| **Model row details** | Name, description, provider, release date, context window, capabilities (badges), price, curated/discovered badges |
| **Lines** | 262 |

---

## multimodal-input.tsx → `features/chat/components/multimodal-input.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `chatId`, `input`, `setInput`, `status`, `stop`, `attachments`, `setAttachments`, `messages`, `setMessages`, `sendMessage`, `className?`, `selectedVisibilityType`, `selectedModelId`, `onModelChange?`, `usage?`, `availableModels?` |
| **Parents** | `ChatShell` *(redesign: renamed from Chat)*, `ArtifactPanel` *(redesign: renamed from Artifact)* (message sidebar) |
| **Children** | `SuggestedActions` (when empty), `PreviewAttachment` (attachments), `PromptInput` + `PromptInputTextarea` + `PromptInputToolbar` + `PromptInputTools` + `PromptInputSubmit` (AI elements), `Context` (element), `AttachmentsButton`, `ModelSelectorCompact`, `StopButton` |
| **State** | `localStorageInput` (persisted), `uploadQueue` |
| **File upload** | Hidden file input, max 3 concurrent uploads via `/api/files/upload`, abort on unmount |
| **Submit flow** | `history.replaceState` to `/chat/{id}`, `sendMessage` with text + file parts, clear attachments + input |
| **Memo** | Checks `input`, `status`, `attachments`, `selectedVisibilityType`, `selectedModelId` |
| **Sub-components** | `AttachmentsButton` (memo, disabled for reasoning models), `ModelSelectorCompact` (memo, compact dropdown in toolbar), `StopButton` (memo) |
| **Lines** | 551 |
