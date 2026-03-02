# State Management

> **Updated per redesign audit (2026-03-01)**

## Client-Side State Architecture

The app uses a layered state management approach combining React context, `useSyncExternalStore`, the AI SDK `useChat` hook, localStorage, and URL state. There is no Redux or Zustand.

> *SWR-as-state removed. Artifact state uses `useSyncExternalStore` with module-level store. ChatStreamProvider scoped to page level, not layout. StreamBridge uses pure `processStreamDelta()` function. SettingsProvider removed — settings use `useSyncExternalStore` + localStorage directly.*

---

## Complete State Inventory

| State | Owner/Source | Pattern | Server/Client | Scope | Frequency |
|-------|-------------|---------|---------------|-------|-----------|
| Chat messages | AI SDK `useChat` | Hook state | Client | ChatShell | Per-message (~1-10/sec during streaming) |
| Chat status | AI SDK `useChat` | Hook state | Client | ChatShell → ChatSessionContext | Per-stream lifecycle |
| Chat input | AI SDK `useChat` | Hook state | Client | ChatShell → ChatSessionContext | Per-keystroke |
| Attachments | `useState` | Component state | Client | ChatShell → ChatSessionContext | Per user action |
| Artifact state | `artifactStore` | `useSyncExternalStore` | Client | Global (module-level) | ~10-20/sec during streaming |
| Settings | `settingsStore` | `useSyncExternalStore` + localStorage | Client | Global (module-level) | Per user action (rare) |
| Optimistic chats | `PendingChatsProvider` | React Context | Client | Chat layout | Per chat create/delete |
| Stream data parts | `ChatStreamProvider` | React Context (split) | Client | Chat page | ~10-20/sec during streaming |
| Votes | `useOptimistic` | React 19 optimistic | Client | Per-message | Per vote action (rare) |
| Visibility | Server-fetched + `useOptimistic` | React 19 optimistic | Client | Per-chat | Per toggle action (rare) |
| Auth session | `SessionProvider` | React Context | Client | Entire app | On login/logout |
| Sidebar open/close | `SidebarProvider` | React Context (shadcn) | Client | Chat layout | Per toggle (rare) |
| Theme | `ThemeProvider` | React Context (next-themes) | Client | Entire app | Per toggle (rare) |
| Scroll position | `useRef` | Ref (no re-renders) | Client | Messages | Per scroll/mutation |
| Model selection | Cookie + localStorage | Persisted state | Both | Per-session | Per model change |

---

## Hooks

### `useChat` (from `@ai-sdk/react`)
Core chat hook. Configured in `<ChatShell>` component (thin orchestrator ~60 lines).

```typescript
const { messages, setMessages, handleSubmit, append, status, stop, reload, ... } = useChat({
  id: chatId,
  api: "/api/chat",
  body: { id, selectedChatModel, selectedVisibilityType, settings },
  initialMessages,
  experimental_throttle: adaptiveThrottle,  // 50-150ms based on network speed
  generateId: () => generateUUID(),
  maxSteps: 5,
  fetch: customFetchWithSignal,
  sendExtraMessageFields: true,
  experimental_prepareRequestBody: (options) => ({
    id, message: options.messages.at(-1),
    selectedChatModel, selectedVisibilityType, settings
  }),
  onData: (data) => { /* process chat-title parts */ },
  onFinish: (message) => { /* handle completion, update pending chats */ },
  onError: (error) => { /* parse ChatSDKError from response, show toast */ },
});
```

**Key behaviors:**
- `experimental_prepareRequestBody` sends only the latest message (not full history)
- `experimental_throttle` adapts to `navigator.connection.effectiveType`
- Custom `fetch` wraps `AbortController` for cancellation
- `messages` starts with server-fetched `initialMessages`

**Abort cleanup lifecycle:**
When a stream is aborted (user clicks Stop or navigates away), the full cleanup sequence is:
1. `stop()` — signals `useChat` to stop processing the stream
2. `abortControllerRef.current.abort()` — cancels the in-flight fetch request
3. `artifactStore.reset()` — synchronously resets artifact state to prevent stale streaming UI

### `useArtifact`
`useSyncExternalStore`-based state for the artifact panel.

```typescript
type ArtifactState = {
  artifactId: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: "idle" | "streaming";
};

// Module-level store with useSyncExternalStore (no SWR, no context needed)
const artifactStore = createArtifactStore(initialArtifactState);
const artifact = useSyncExternalStore(artifactStore.subscribe, artifactStore.getSnapshot);
```

> *`useSyncExternalStore` replaces SWR `useSWR('artifact', null)`. Module-level store eliminates context dependency. `useArtifactSelector(selector)` available for derived slices.*

**Operations:**
- `setArtifact(updater)` — direct store update (no SWR mutate)
- `useArtifactSelector(selector)` — subscribe to derived slice, avoids full re-render
- Stream handlers update artifact state: `artifact-textDelta` appends to content, `artifact-codeDelta`/`artifact-sheetDelta` replace content
- `artifact-clear` resets content to empty
- `artifact-finish` sets status to "idle", isVisible to true

### `useChatVisibility`
`useOptimistic`-based with server action mutation.

```typescript
const [visibilityType, setOptimisticVisibility] = useOptimistic(initialVisibility);

const setVisibilityType = (type) => {
  setOptimisticVisibility(type);       // Instant UI update
  updateChatVisibility({ chatId, visibility: type })
    .catch(() => { setOptimisticVisibility(initialVisibility); toast.error(...); });
};
```

### `usePendingChats`
Context-based provider for sidebar chat list (PendingChatsProvider).

```typescript
type PendingChat = {
  id: string;
  title: string;
  createdAt: Date;
  isOptimistic: boolean;
  visibility: 'public' | 'private';
};

// PendingChatsProvider wraps both sidebar + content area
// Uses Set<string> internally for O(1) dedup by chat ID
// Operations:
PendingChats.add(chat)         // Add unconfirmed chat to list head
PendingChats.remove(chatId)    // Remove (on delete)
PendingChats.markConfirmed(chatId)   // Replace pending with real data
PendingChats.updateTitle(chatId, title) // Modify title
```

**Lifecycle:** Pending chats are explicitly removed/confirmed by chat events (`remove`, `markConfirmed`); no time-based auto-cleanup behavior.

### `useMessages`

> *`useMessages` context is replaced by `ChatSessionContext`. Messages are accessed via `useChatSessionContext()` which provides messages, setMessages, and other chat state from the inline provider in `ChatShell`.*

```typescript
const { messages, setMessages } = useChatSessionContext();
// ChatSessionContext is an inline provider in ChatShell (thin orchestrator)
// Provides: messages, setMessages, chatId, selectedModel, visibility, append, reload, stop
```

### `useScrollToBottom`
Auto-scroll management for chat message area.

```typescript
// Uses ResizeObserver + MutationObserver on container ref
// Tracks whether user has scrolled up (manual override)
// Two modes:
//   - Auto-scroll: snap to bottom on new content
//   - Manual: user scrolled up, show "scroll to bottom" button
// Scroll state managed via useRef (no SWR, no re-renders on scroll)
```

### `useMobile`
Media query hook for responsive behavior.

```typescript
const isMobile = useMobile(); // matches "(max-width: 768px)"
```

### `useWindowSize`
Window dimension tracking.

```typescript
const { width, height } = useWindowSize();
// Uses resize event listener with debounce
```

---

## Context Providers

### `ChatStreamProvider`
**Pattern: Split State + Dispatch**

> *Scoped to page level (not layout level). Split state/dispatch pattern prevents unnecessary re-renders.*

Splits into two separate contexts to prevent unnecessary re-renders:
```typescript
const ChatStreamStateContext = createContext<ChatStreamState>();
const ChatStreamDispatchContext = createContext<ChatStreamDispatch>();
```

> **RAF batching:** High-frequency SSE deltas (~200/sec) are coalesced to ~60 React updates/sec using `requestAnimationFrame` batching. Incoming deltas are buffered and flushed once per animation frame, preventing React from being overwhelmed during fast streaming.

State — **DataPart[] buffer only** (no artifact state):
```typescript
type ChatStreamState = {
  stream: DataPart[];        // Raw buffered stream data parts
  connectionState: "idle" | "connected" | "error";  // Stream connection metadata
};
```

> **Important: ChatStreamProvider does NOT own artifact state.** It is a thin DataPart[] buffer. Artifact UI state lives in `artifactStore` (module-level, `useSyncExternalStore`). The `StreamBridge` component reads from ChatStreamProvider and writes to `artifactStore` — it is the one-way relay between the two.
>
> ```
> ChatStreamProvider (DataPart[] buffer) → StreamBridge (thin relay) → artifactStore (artifact UI state)
> ```

Dispatch exposes stream-buffer mutation functions (append, clear) without causing consumer re-renders.

### `PendingChatsProvider`
Wraps sidebar + chat area. Provides `usePendingChats()` context.

### `SessionProvider`
Provides authentication session state:
```typescript
// useSession() returns AppSession | null
type AppSession = {
  user: { id: string; type: 'authenticated' | 'guest'; email?: string };
};

const session = useSession(); // AppSession | null
```

### `ThemeProvider` (`next-themes`)
Wraps entire app. Supports `light` / `dark` / `system` themes.

> *SettingsProvider removed. Settings use `useSyncExternalStore` + localStorage directly — no React Context needed.*

---

## Settings (localStorage)

### `useSettings`
Settings are stored in localStorage, not on the server. The store uses a pub/sub pattern with `useSyncExternalStore`.

> *SettingsProvider removed. Any component imports `useSettings()` directly from the module-level store. No wrapping provider needed.*

```typescript
interface SettingsState {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  systemPrompt: string;
  enableReasoning: boolean;
}
```

> **Note:** Model selection is via cookie (`chat-model`) + localStorage, NOT in SettingsState.

**Key pattern:**
```typescript
// Read only current snapshot (static value, no re-renders on change)
const settings = useSettingsSnapshot();

// Read with re-renders on change + get setter
const { settings, setPartialSettings } = useSettings();
```

Settings are passed in the chat request body and used server-side for temperature, topP, maxOutputTokens, system prompt, and reasoning config.

---

## URL State

### Chat URL
- New chat: `/` (UUID generated server-side)
- Existing chat: `/chat/[id]`
- On first message send: `window.history.replaceState({}, "", `/chat/${chatId}`)` (no page reload)

### Model Selection
- Persisted in `cookie: chat-model` (server-readable for SSR)
- Also in localStorage directly (not via SettingsState)

### Visibility
- Managed via `useOptimistic` (React 19). Server-fetched initial value, optimistic toggle via Server Action.
- Written to DB via `updateChatVisibility` Server Action + `updateTag('chat:{id}')`

---

## Data Flow: StreamBridge

The `StreamBridge` component is the bridge between SSE stream and client state:

> *StreamBridge uses a pure `processStreamDelta()` function to process stream parts and update `artifactStore` (useSyncExternalStore). Thin ~30-line bridge component.*

```
SSE Response → useChat onData callback → StreamBridge → artifactStore (useSyncExternalStore)
```

Processes custom data parts from the stream:
1. `chat-title` → Updates pending chat title in sidebar (single-channel)
2. `artifact-id`, `artifact-title`, `artifact-kind` → Sets artifact metadata
3. `artifact-textDelta` → Appends to artifact content
4. `artifact-codeDelta`, `artifact-sheetDelta` → Replaces artifact content
5. `artifact-imageDelta` → Sets artifact content to base64 image
6. `artifact-clear` → Resets artifact content to empty
7. `artifact-finish` → Sets artifact status to "idle", visibility to true
8. `artifact-suggestion` → Appends to suggestions list

> *`data-usage` removed (no credit/gateway/quota display).*

---

## State Keys

| Key Pattern | Data Type | Usage |
|-------------|-----------|-------|
| `artifactStore` (module-level) | `ArtifactState` | Global artifact panel state |
| `useOptimistic` (component-level) | `"public" \| "private"` | Chat visibility state |
| `scrollRef` (useRef) | `boolean` | Auto-scroll control (ref-based, no re-renders) |
| `"/api/artifact?id={id}"` | `Artifact[]` | Artifact versions (fetcher-backed) |
