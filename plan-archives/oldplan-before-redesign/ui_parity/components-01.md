# Components Map — Part 01 (A–M)

> Every component in `oldapp/components/`, mapped with props, hierarchy, state, events, and rebuild location.

---

## app-sidebar.tsx → `features/sidebar/components/app-sidebar.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | None |
| **Parents** | `chat-layout-client.tsx` (dynamic import, ssr=false) |
| **Children** | `Sidebar`, `SidebarHeader`, `SidebarMenu`, `SidebarContent` → `SidebarHistory`, `SidebarFooter` → `SidebarUserNav`, `AlertDialog` (delete all) |
| **State** | `showDeleteAllDialog: boolean` |
| **Events** | New Chat click → `router.push("/")` + `router.refresh()`, Delete All → `fetch("/api/history", DELETE)` + SWR mutate, Mobile close on nav |
| **Hooks** | `useRouter`, `useSidebar`, `useSWRConfig`, `useAuth` |
| **Memo** | None |
| **Notes** | sidebar border-r-0 override; "Assistant" brand text in header |

---

## artifact.tsx → `features/artifacts/components/artifact.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (imported, no directive — wrapped in memo) |
| **Props** | `chatId`, `input`, `setInput`, `status`, `stop`, `attachments`, `setAttachments`, `sendMessage`, `messages`, `setMessages`, `regenerate`, `votes`, `isReadonly`, `selectedVisibilityType`, `selectedModelId`, `availableModels` |
| **Parents** | `Chat` component |
| **Children** | `ArtifactCloseButton`, `ArtifactActions`, `ArtifactMessages`, `MultimodalInput`, `Toolbar`, `VersionFooter`, `ArtifactErrorBoundary` → dynamic artifact content |
| **State** | `mode: "edit" | "diff"`, `document: Document | null`, `currentVersionIndex: number`, `isContentDirty: boolean`, `isToolbarVisible: boolean` |
| **Events** | Version navigation (prev/next/toggle/latest), content save (debounced 2s), document fetch via SWR |
| **Exports** | `Artifact` (memo), `artifactDefinitions` array, `ArtifactKind` type, `UIArtifact` type |
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

## artifact-messages.tsx → `features/artifacts/components/artifact-messages.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo component |
| **Props** | `chatId`, `status`, `votes`, `messages`, `setMessages`, `regenerate`, `isReadonly`, `artifactStatus`, `availableModels` |
| **Parents** | `Artifact` (desktop only, 400px sidebar) |
| **Children** | `PreviewMessage` (loop), `ThinkingMessage` (AnimatePresence), scroll sentinel |
| **Hooks** | `useMessages` |
| **Memo** | Skips re-render when artifact is streaming |

---

## auth-form.tsx → `features/auth/components/auth-form.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Server Component (no `"use client"`) |
| **Props** | `action`, `children`, `defaultEmail?` |
| **Parents** | Login page, Register page |
| **Children** | `Form` (next/form), `Label`, `Input` (email + password), `{children}` |
| **Notes** | Email field: autoComplete="email", autoFocus, required; Password: required, type="password" |

---

## auth-provider.tsx → `features/auth/components/auth-provider.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) • Context Provider |
| **Props** | `initialSession: AppSession | null`, `children` |
| **Context Value** | `session`, `status: "loading" | "authenticated" | "unauthenticated"`, `isNewSession`, `setSession`, `clearNewSessionFlag` |
| **State** | `session`, `isNewSession`, `bootstrapAttempted` |
| **Effects** | Guest bootstrap via `/api/auth/guest` (POST), Supabase auth state change listener |
| **Exports** | `AuthProvider`, `useAuth` hook |

---

## chat.tsx → `features/chat/components/chat.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `id`, `initialMessages`, `initialChatModel`, `initialVisibilityType`, `isReadonly`, `initialLastContext?`, `availableModels?`, `initialVotes?` |
| **Parents** | Home page, Chat/[id] page |
| **Children** | `ChatHeader`, `Messages`, `MultimodalInput`, `Artifact` (dynamic), `AlertDialog` (credit card) |
| **State** | `input`, `usage`, `showCreditCardAlert`, `currentModelId`, `attachments`, `hasAppendedQuery` |
| **Hooks** | `useChat` (AI SDK), `useChatVisibility`, `useDataStream`, `useSettings`, `useAuth`, `useOptimisticChats`, `useArtifact`, `useArtifactSelector`, `useSearchParams`, `useSWR` (votes) |
| **Key behaviors** | Adaptive throttle (50/100/150ms by connection), optimistic chat creation on first message, title polling on finish, URL query auto-send, model persistence to localStorage |
| **Transport** | `DefaultChatTransport` with custom `prepareSendMessagesRequest` adding model/visibility/settings |
| **onData handlers** | `data-usage`, `data-chat-title` (updates optimistic title), `data-appendMessage` |
| **Layout** | `h-dvh min-w-0 flex-col bg-background` |
| **Lines** | 524 |

---

## chat-header.tsx → `features/chat/components/chat-header.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `chatId`, `selectedVisibilityType`, `isReadonly` |
| **Parents** | `Chat` |
| **Children** | `SidebarToggle`, `Button` (New Chat), `VisibilitySelector`, `SettingsButton` |
| **Layout** | `sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5` |
| **Responsive** | New Chat button visible when sidebar closed or mobile. `order-*` classes for reordering. |

---

## code-editor.tsx → `features/artifacts/components/code-editor.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `content`, `onSaveContent`, `status`, `isCurrentVersion`, `currentVersionIndex`, `suggestions` |
| **Parents** | `Artifact` (via `codeArtifact.content`) |
| **Dependencies** | CodeMirror (lazy-loaded): `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-python`, `@codemirror/theme-one-dark` |
| **State** | `modules: CodeMirrorModules | null` |
| **Notes** | Module cache singleton pattern; streaming content updates via `EditorView.dispatch` |

---

## console.tsx → `features/artifacts/components/console.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client Component |
| **Props** | `consoleOutputs`, `setConsoleOutputs` |
| **Parents** | Code artifact |
| **State** | `height: number` (resizable), `isResizing: boolean` |
| **A11y** | `role="slider"` on resize handle, `aria-label`, `aria-valuemin/max/now`, keyboard arrows |
| **Notes** | Clears outputs when artifact not visible; auto-scrolls on new output |

---

## create-artifact.tsx → `features/artifacts/components/create-artifact.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Pure TypeScript definitions (no JSX rendering) |
| **Exports** | `Artifact` class, `ArtifactActionContext`, `ArtifactToolbarContext`, `ArtifactToolbarItem`, type definitions |
| **Purpose** | Factory/config class for artifact types (text, code, image, sheet) |

---

## data-stream-handler.tsx → `features/chat/components/data-stream-handler.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) — renders `null` |
| **Props** | None |
| **Parents** | Home page, Chat/[id] page (sibling to `Chat`) |
| **Hooks** | `useDataStream`, `useArtifact` |
| **Effects** | Processes `dataStream` deltas → updates artifact state (id, title, kind, clear, finish) + artifact-specific `onStreamPart` |

---

## data-stream-provider.tsx → `features/chat/components/data-stream-provider.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) • Split Context Provider |
| **Props** | `children` |
| **Exports** | `DataStreamProvider`, `useDataStreamState` (re-renders on change), `useDataStreamDispatch` (stable), `useDataStream` (both) |
| **Pattern** | Split state/dispatch contexts to prevent unnecessary re-renders |

---

## diffview.tsx → `features/artifacts/components/diffview.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `oldContent: string`, `newContent: string` |
| **Parents** | Text artifact (diff mode) |
| **Dependencies** | TipTap: `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, table extensions |
| **Notes** | Custom `DiffMark` extension for green/red highlighting; custom `DiffExtension` ProseMirror plugin |

---

## document.tsx → `features/artifacts/components/document.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo components |
| **Exports** | `DocumentToolResult` (memo, always skip), `DocumentToolCall` |
| **Props** | `type: "create" | "update" | "request-suggestions"`, `result`, `isReadonly` |
| **Parents** | `PreviewMessage` (tool call parts) |
| **Events** | Click → opens artifact panel via `setArtifact` with bounding box |

---

## document-preview.tsx → `features/artifacts/components/document-preview.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) with dynamic editor imports |
| **Props** | `isReadonly`, `result?`, `args?` |
| **Parents** | `PreviewMessage` (tool-createDocument, tool-updateDocument parts) |
| **Children** | Lazy: `CodeEditor`, `ImageEditor`, `SpreadsheetEditor`, `Editor` (text) |
| **State** | Document fetched via SWR (`/api/document?id=`) |
| **Notes** | Captures bounding box via `hitboxRef` for artifact open animation |
| **Lines** | 349 |

---

## document-skeleton.tsx → `features/artifacts/components/document-skeleton.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Exports** | `DocumentSkeleton` (image vs text variants), `InlineDocumentSkeleton` |
| **Parents** | `DocumentPreview` |
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

## icons.tsx → `components/ui/icons.tsx` (shared)

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
| **Parents** | Artifact (image kind), DocumentPreview |
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
| **Children** | `MessageReasoning`, `MessageContent` (element), `Response` (element), `MessageEditor`, `MessageActions`, `PreviewAttachment`, `DocumentPreview`, `DocumentToolResult`, `Weather`, `Tool`/`ToolContent`/`ToolHeader`/`ToolInput`/`ToolOutput` (elements) |
| **State** | `mode: "view" | "edit"` |
| **Parts handled** | `reasoning`, `text`, `file`, `tool-getWeather`, `tool-createDocument`, `tool-updateDocument`, `tool-requestSuggestions` |
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
| **Vote API** | PATCH `/api/vote` with optimistic SWR mutation |
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
| **Parents** | `Chat` |
| **Children** | `Virtuoso` (react-virtuoso), `Greeting` (empty state), `PreviewMessage` (items), `ThinkingMessage` (footer), `ErrorMessage` (footer), scroll-to-bottom button |
| **State** | `isAtBottom`, `hasSentMessage` |
| **Hooks** | `useDataStream`, `useSettingsSnapshot` (autoScroll) |
| **Key patterns** | Virtualized list with `followOutput="smooth"`, `increaseViewportBy={top:200, bottom:200}`, `atBottomThreshold=100`; empty messages filter for error state; scroll-to-bottom FAB |
| **Memo** | Skips re-render when artifact visible (both prev & next); always re-renders during streaming |
| **Lines** | 320 |

---

## model-selector.tsx → `features/chat/components/model-selector.tsx`

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
| **Parents** | `Chat`, `Artifact` (message sidebar) |
| **Children** | `SuggestedActions` (when empty), `PreviewAttachment` (attachments), `PromptInput` + `PromptInputTextarea` + `PromptInputToolbar` + `PromptInputTools` + `PromptInputSubmit` (AI elements), `Context` (element), `AttachmentsButton`, `ModelSelectorCompact`, `StopButton` |
| **State** | `localStorageInput` (persisted), `uploadQueue` |
| **File upload** | Hidden file input, max 3 concurrent uploads via `/api/files/upload`, abort on unmount |
| **Submit flow** | `history.replaceState` to `/chat/{id}`, `sendMessage` with text + file parts, clear attachments + input |
| **Memo** | Checks `input`, `status`, `attachments`, `selectedVisibilityType`, `selectedModelId` |
| **Sub-components** | `AttachmentsButton` (memo, disabled for reasoning models), `ModelSelectorCompact` (memo, compact dropdown in toolbar), `StopButton` (memo) |
| **Lines** | 551 |
