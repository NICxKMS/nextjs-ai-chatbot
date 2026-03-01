# Interaction Patterns — UI Parity Reference

> **Updated per redesign audit (2026-03-01)**

> Every user-facing interaction flow in the oldapp, documented for zero-regression rebuild.

---

## 1. Chat Message Send/Receive

### Send Flow

1. User types in `PromptInput` (TipTap-based element via `prompt-input.tsx`)
   - Input persisted to `localStorage[chat-${chatId}-input]` on every change
   - Restored on mount if present
2. User presses **Enter** (desktop) or taps **Submit button** (mobile/explicit)
   - `Shift+Enter` → newline; `Enter` → submit
   - Submit aborted if `status !== "ready"` or input is empty (whitespace-only)
3. `handleSubmit()`:
   - `history.replaceState` to `/chat/{chatId}` (if on `/`)
   - If first message: creates pending chat entry in sidebar (`addPendingChat`) *(redesign: renamed from addOptimisticChat)*
   - Calls `sendMessage()` (AI SDK) with `{ message: text, experimental_attachments: files }`
   - Clears `attachments`, `input`, `localStorage` entry
4. `useChat` streams response via `DefaultChatTransport`
   - Custom `prepareSendMessagesRequest` injects: `selectedModelId`, `selectedVisibilityType`, settings (temperature, topP, maxOutputTokens, systemPrompt, enableReasoning)
5. Response streams in real-time with adaptive throttle:
   - Fast connection (download ≥10Mbps): 50ms
   - Medium: 100ms
   - Slow (<1Mbps): 150ms
6. On completion (`onFinish`):
   - Title received via `chat-title` stream part *(redesign: replaces polling `/api/chat` + `chat-title-updated` window event — single-channel)*

### Receive Flow

1. `Messages` component renders via `Virtuoso` (react-virtuoso)
2. Each message → `PreviewMessage` (memo)
3. `PreviewMessage` iterates `message.parts[]`:
   - `reasoning` → `MessageReasoning` (collapsible)
   - `text` → `MessageContent` element (Markdown with math, syntax highlighting)
   - `file` → `PreviewAttachment`
   - `tool-{name}` → Tool-specific renderer
4. Auto-scroll follows new content when `followOutput="smooth"` + at bottom threshold 100px
5. `ThinkingMessage` shown during streaming (animated dots)

---

## 2. Artifact Creation / Editing / Version Switching

### Creation Flow

1. AI calls `createArtifact` tool during response *(redesign: renamed from createDocument)*
2. `StreamBridge` processes stream deltas *(redesign: renamed from DataStreamHandler)*:
   - `id` → set artifact ID
   - `title` → set artifact title  
   - `kind` → set artifact kind (text/code/image/sheet)
   - `clear` → clear artifact content
   - `text` / `delta` → append content
   - `finish` → mark artifact complete, call `onStreamPart("finish")`
3. Artifact panel opens with spring animation
   - `AnimatePresence mode="wait"` with opacity + horizontal slide
   - Captures bounding box from `ArtifactPreview` inline card for origin animation *(redesign: renamed from DocumentPreview)*
4. Artifact rendered based on `kind`:
   - `text` → TipTap editor (`text-editor.tsx`)
   - `code` → CodeMirror editor (`code-editor.tsx`)
   - `image` → Base64 image display (`image-editor.tsx`)
   - `sheet` → react-data-grid spreadsheet (`sheet-editor.tsx`)

### Editing Flow

1. User edits content in artifact editor (text/code/sheet)
2. Debounced save (2s) → `saveArtifact` API *(redesign: renamed from saveDocument)*
3. Content marked as `isContentDirty`
4. On save: creates new version via API

### Update Flow

1. AI calls `updateArtifact` tool *(redesign: renamed from updateDocument)*
2. Same `StreamBridge` delta processing *(redesign: renamed from DataStreamHandler)*
3. Previous content preserved as version

### Version Switching

1. `VersionFooter` shown when viewing non-current version
2. Navigation: left/right buttons in artifact header
3. `handleVersionChange("prev" | "next" | "toggle" | "latest")`
4. "Restore this version" → DELETE `/api/artifact?id={}&timestamp={ts}` *(redesign: renamed from /api/document)* (deletes later versions)
5. "Back to latest" → jump to most recent version

### Close Flow

1. `ArtifactCloseButton` click → `setArtifact({ ...initialArtifactData })` or hide if streaming
2. On mobile: always full-screen, close returns to chat

---

## 3. Sidebar Navigation

### Structure
- `SidebarShell` → `AppSidebar` with header (brand + new chat), content (history), footer (user nav) *(redesign: SidebarShell is the server wrapper; AppSidebar is the client inner component)*
- History: `GroupedVirtuoso` with date group headers

### Chat List
1. `useSWRInfinite` with `/api/history?limit=20&offset=X`
2. Infinite scroll via sentinel at bottom → `setSize(s => s+1)`
3. **Grouping:** Today, Yesterday, Last 7 days, Last 30 days, Older
4. Pending chats prepended in `__pending__` group *(redesign: renamed from `__optimistic__`)*
5. Active chat highlighted via pathname match

### Actions on Chat Items
- Click → navigate to `/chat/{id}`
- Dropdown menu:
  - **Share** → submenu: Private/Public radio (`saveChatVisibility` server action)
  - **Delete** → confirm dialog → Server Action `deleteChat()` + optimistic removal + redirect if active *(redesign: replaces DELETE `/api/history/{id}` + SWR)*

### Delete All
- Button in sidebar header
- `AlertDialog` confirmation
- Server Action `deleteAllChats()` → redirect `/` *(redesign: replaces DELETE `/api/history` + SWR mutate)*

### Mobile Behavior
- Sidebar opens as overlay sheet
- Closes on navigation (`setOpenMobile(false)`)
- `SidebarToggle` visible in chat header

---

## 4. Model Selection

### Compact (In-Input)
1. `ModelSelectorCompact` in `MultimodalInput` toolbar
2. Tiny button showing current model name
3. Click → `DropdownMenu` with grouped model list
4. Models grouped by provider, sorted by name

### Full Selector
1. `ModelSelector` standalone component
2. Searchable with filter input
3. Model details: name, description, provider, release date, context window, capabilities badges, pricing
4. `curated` / `discovered` badges

### Selection Flow
1. User picks model → `onModelChange(newModelId)`
2. Model persisted to localStorage as `chat-model`
3. Sent with every chat message via `prepareSendMessagesRequest`

---

## 5. File Upload

1. User clicks attachment button (paperclip icon)
2. Hidden `<input type="file" accept="image/*">` triggered
3. Files queued to `uploadQueue` state
4. Each file: POST `/api/files/upload` (FormData)
5. Response: `{ url, name, contentType }`
6. Added to `attachments` array → `PreviewAttachment` thumbnails shown
7. On submit: attachments converted to `{ type: "file", data: url, mimeType }` parts
8. Remove before send: click X on `PreviewAttachment`
9. **Abort handling:** Active uploads cancelled on component unmount

### Constraints
- Max 3 concurrent uploads (uses `Promise.all`)
- Attachment button disabled for reasoning models (`isReasoning` check)
- Only image mime types accepted via `accept` attribute

---

## 6. Visibility Toggle

1. `VisibilitySelector` in `ChatHeader` (desktop only: `hidden md:flex`)
2. `DropdownMenu` with Private (lock icon) / Public (globe icon)
3. Selection → `setChatVisibilityType(type)` from `useChatVisibility`
4. API call: `saveChatVisibility` server action PATCHING the chat
5. Local state updated optimistically
6. Reflected in sidebar item dropdown (Share submenu with radio options)

---

## 7. Message Actions

### Copy
- Available on both user and assistant messages
- Copies text parts to clipboard via `navigator.clipboard.writeText`
- `CopyIcon` → `CheckIcon` swap for 2 seconds

### Edit (User Messages Only)
- Hover to reveal edit button (absolute positioned, right side)
- Click → `mode: "edit"` → `MessageEditor`
- Inline textarea with current content
- Cancel → restore view mode
- Save → `deleteTrailingMessages` (server action) → update `messages` → `regenerate()`
- Regenerates AI response from edited message onward

### Vote (Assistant Messages Only)
- Upvote / Downvote buttons
- Server Action `voteOnMessage()` with `useOptimistic` *(redesign: replaces PATCH `/api/vote` + SWR mutation)*
- Visual: filled/highlighted icon when active vote exists

### Visibility
- Actions hidden during streaming (loading state)
- Grouped in `Actions` element wrapper

---

## 8. Suggested Actions

1. Shown when: no messages AND no attachments AND no uploads in queue
2. 4 hardcoded suggestions in 2-column grid (sm+)
3. Each renders as `Suggestion` AI element with text + description
4. Click → `sendMessage({ message: text })` with visibility type
5. Staggered `motion.div` animation (delay: 0.05s × index)

---

## 9. Settings Panel

### Open
- `SettingsButton` (gear icon) in `ChatHeader`
- Opens `Sheet` from right side (`side="right"`)

### Sections

#### Sampling Parameters
- **Temperature:** `Input type="number"` (0–1.5, step 0.1), label + tooltip
- **Top P:** `Input type="number"` (0–1, step 0.1)
- **Max Output Tokens:** `Input type="number"` (256–1,000,000)
- Changes → `updateSettings()` on input change

#### System Prompt
- `Textarea` with placeholder
- Persisted to `useSettings` (useSyncExternalStore, localStorage-backed) *(redesign: SettingsProvider removed)*

#### Behavior Toggles
- **Enable Reasoning:** `SettingToggle` (aria-pressed)
- **Stream Artifacts:** `SettingToggle`
- **Auto-scroll:** `SettingToggle`
- Toggle visual: pill slider On/Off

### Reset
- "Reset to defaults" button in footer
- Confirmation behavior: immediate reset

### Close
- Sheet close button (X) or "Close" footer button
- Esc key

---

## 10. Theme Toggle

1. Located in `SidebarUserNav` dropdown menu
2. Toggle between "Dark theme" and "Light theme"
3. `useTheme().setTheme(resolvedTheme === "dark" ? "light" : "dark")`
4. Icon: `MoonIcon` (light) / `SunIcon` (dark)
5. Root `<html>` attribute-based via `next-themes` (`attribute="class"`)
6. Theme-color meta tag synced via inline script in root layout

---

## 11. Artifact Toolbar

1. Appears when artifact is open and content is current version
2. Floating bottom-right palette (`z-50`)
3. Per-artifact-kind tools (defined in artifact definition `toolbar` array)
4. Two-tap activation: first opens tool UI, second executes
5. Text artifact: Reading Level selector (6-level vertical slider with drag)
6. Tools can send messages or directly modify content
7. Spring animations: scale on hover (1.1) and tap (0.95)
8. Dismiss: click outside or toggle off

---

## 12. Inline Artifact Preview *(redesign: renamed from Inline Document Preview)*

1. Tool calls (`createArtifact`, `updateArtifact`) render inline `ArtifactPreview` *(redesign: renamed from DocumentPreview)*
2. Shows skeleton during loading, mini editor when ready
3. Click → opens full artifact panel
4. Captures bounding box for smooth open animation (`hitboxRef`)

---

## 13. Reasoning Display

1. `MessageReasoning` collapses/expands reasoning parts
2. Auto-opens when streaming reasoning detected
3. `ReasoningTrigger` → chevron + "Reasoning" label
4. Content renders as markdown within `ReasoningContent` element
5. Tracks `hasBeenStreaming` to decide default open state

---

## 14. Error States

### Chat Error
- `ErrorMessage` footer in `Messages` component
- "An error occurred" with retry button
- Retry → `clearError()` (from `ChatShell` component) *(redesign: renamed from Chat)*

### Network/API Errors
- Toast notifications (top-center) via sonner
- Custom toast component with success/error icons

### Chat Not Found
- URL `?notice=chat_not_found` → warning toast → clean URL
- `?notice=user_not_found` → error toast → clean URL

### Artifact Error
- `ArtifactErrorBoundary` catches rendering errors
- Fallback: "Failed to render artifact" + error code

---

## 15. Scroll Behavior

1. `useScrollToBottom` hook manages auto-scroll
2. `Virtuoso` component with `followOutput="smooth"` + `atBottomThreshold=100`
3. Scroll-to-bottom FAB (floating action button) when not at bottom
4. `Button` with `ArrowDownIcon`, `animate-bounce`, positioned bottom-right of messages
5. Click → `scrollToBottom("smooth")`
6. `autoScroll` setting toggle (from `useSettings`) controls FAB behavior *(redesign: replaces useSettingsSnapshot — useSyncExternalStore)*

---

## 16. URL Query Auto-Send

1. Chat supports `?q=` or `?query=` search params
2. On mount: if query param present and has messages array empty
3. Auto-sends the query as first message
4. `hasAppendedQuery` flag prevents re-send
5. Used for deep-linking into chat with pre-filled prompt

---

## 17. Guest Authentication Flow

1. App detects no session on load
2. `SessionProvider` auto-creates guest session via POST `/api/auth/guest` *(redesign: renamed from AuthProvider)*
3. Guest gets limited functionality (no persistent history list)
4. Guest sidebar shows login CTA
5. `isNewSession` flag skips SWR history fetch to avoid unnecessary 401s

---

## 18. Credit/Usage Alert *(redesign: REMOVED)*

> *Redesign: `data-usage` stream event removed. Credit/usage alert (`AlertDialog`) removed from `ChatShell`.*

1. ~~`Chat` component tracks `usage` state (from `data-usage` stream event)~~
2. ~~When credits depleted: `AlertDialog` with warning~~
3. ~~Shows usage limit message + link to manage subscription~~
4. ~~Non-dismissable overlay~~

---

## 19. Pending Chat Creation *(redesign: renamed from Optimistic Chat Creation)*

1. When user sends first message in new chat (route is `/`)
2. `addPendingChat({ id, title: input.substring(0,50) })` *(redesign: renamed from addOptimisticChat)*
3. Sidebar immediately shows new entry in `__pending__` group *(redesign: renamed from `__optimistic__`)*
4. Title updates when server responds via `chat-title` stream part *(redesign: replaces `chat-title-updated` window event — single-channel)*
5. If title unchanged (no event): pending entry persists until next SWR revalidation
