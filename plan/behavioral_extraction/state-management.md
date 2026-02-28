# State Management

## Client-Side State Architecture

The app uses a layered state management approach combining React context, SWR, the AI SDK `useChat` hook, localStorage, and URL state. There is no Redux or Zustand.

---

## Hooks

### `useChat` (from `@ai-sdk/react`)
Core chat hook. Configured in `<Chat>` component.

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
  onData: (data) => { /* process data-chatTitle, data-usage parts */ },
  onFinish: (message) => { /* handle completion, update optimistic chats */ },
  onError: (error) => { /* parse ChatSDKError from response, show toast */ },
});
```

**Key behaviors:**
- `experimental_prepareRequestBody` sends only the latest message (not full history)
- `experimental_throttle` adapts to `navigator.connection.effectiveType`
- Custom `fetch` wraps `AbortController` for cancellation
- `messages` starts with server-fetched `initialMessages`

### `useArtifact`
SWR-based state for the artifact (document) panel.

```typescript
type ArtifactState = {
  documentId: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: "idle" | "streaming";
};

const { data: artifact, mutate } = useSWR("artifact", null, {
  fallbackData: initialArtifactState
});
```

**Operations:**
- `setArtifact(updater)` — SWR optimistic mutate
- `useArtifactSelector(selector)` — subscribe to derived slice, avoids full re-render
- Stream handlers update artifact state: `data-textDelta` appends to content, `data-codeDelta`/`data-sheetDelta` replace content
- `data-clear` resets content to empty
- `data-finish` sets status to "idle", isVisible to true

### `useChatVisibility`
SWR-based with server action mutation.

```typescript
const { data: visibilityType, mutate } = useSWR(`${chatId}-visibility`, null, {
  fallbackData: initialVisibility
});

const setVisibilityType = (type) => {
  mutate(type, false);                    // Optimistic update
  updateChatVisibility({ chatId, visibility: type })
    .catch(() => { mutate(initialVisibility); toast.error(...); });
};
```

### `useOptimisticChats`
Context-based provider for sidebar chat list.

```typescript
type OptimisticChat = Chat & { isOptimistic?: boolean };

// Provider wraps children with context
// Uses Set<string> internally for O(1) dedup by chat ID
// Operations:
addOptimisticChat(chat)     // Add unconfirmed chat to list head
removeOptimisticChat(chatId) // Remove (on delete)
markChatConfirmed(chatId)    // Replace optimistic with real data
updateOptimisticChat(chatId, updates) // Modify title, visibility, etc.
```

**Auto-cleanup:** Optimistic chats older than 2 minutes are auto-removed.

### `useMessages`
Context provider for sharing messages between Chat and DataStreamHandler.

```typescript
const { messages, setMessages } = useMessages();
// Wraps useChat's messages in context for cross-component access
```

### `useScrollToBottom`
Auto-scroll management for chat message area.

```typescript
// Uses ResizeObserver + MutationObserver on container ref
// Tracks whether user has scrolled up (manual override)
// Two modes:
//   - Auto-scroll: snap to bottom on new content
//   - Manual: user scrolled up, show "scroll to bottom" button
// SWR key "messages:should-scroll" for cross-component state
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

### `DataStreamProvider`
**Pattern: Split State + Dispatch**

Splits into two separate contexts to prevent unnecessary re-renders:
```typescript
const DataStreamStateContext = createContext<DataStreamState>();
const DataStreamDispatchContext = createContext<DataStreamDispatch>();
```

State:
```typescript
type DataStreamState = {
  artifact: ArtifactState;
  // ... derived from DataStreamHandler processing
};
```

Dispatch exposes mutation functions without causing consumer re-renders.

### `OptimisticChatsProvider`
Wraps sidebar + chat area. Provides `useOptimisticChats()` context.

### `AuthProvider` (`components/auth-provider.tsx`)
Provides Supabase browser client and session state:
```typescript
const { supabase, session, user, isGuest } = useAuth();
```

### `ThemeProvider` (`next-themes`)
Wraps entire app. Supports `light` / `dark` / `system` themes.

---

## Settings (localStorage)

### `useSettings` / `useSettingsSnapshot`
Settings are stored in localStorage, not on the server. The store uses a pub/sub pattern with `useSyncExternalStore`.

```typescript
type SettingsState = {
  selectedModelId: string;
  sampling: {
    temperature: number;     // 0–2
    topP: number;            // 0–1
    maxOutputTokens: number; // 256–1,000,000
  };
  systemPrompt: string;      // max 8192 chars
  enableReasoning: boolean;
  reasoningBudget: number;
  streamArtifacts: boolean;
  autoScroll: boolean;
};
```

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
- Also in localStorage via `settings.selectedModelId`

### Visibility
- Persisted in SWR cache (key: `${chatId}-visibility`)
- Written to DB via server action

---

## Data Flow: DataStreamHandler

The `DataStreamHandler` component is the bridge between SSE stream and client state:

```
SSE Response → useChat onData callback → DataStreamHandler → useArtifact SWR state
```

Processes custom data parts from the stream:
1. `data-chatTitle` → Updates optimistic chat title in sidebar
2. `data-id`, `data-title`, `data-kind` → Sets artifact metadata
3. `data-textDelta` → Appends to artifact content
4. `data-codeDelta`, `data-sheetDelta` → Replaces artifact content
5. `data-imageDelta` → Sets artifact content to base64 image
6. `data-clear` → Resets artifact content to empty
7. `data-finish` → Sets artifact status to "idle", visibility to true
8. `data-suggestion` → Appends to suggestions list
9. `data-usage` → Stored for display in message footer

---

## SWR Keys

| Key Pattern | Data Type | Usage |
|-------------|-----------|-------|
| `"artifact"` | `ArtifactState` | Global artifact panel state |
| `"artifact-metadata-{docId}"` | Document metadata | Per-document metadata cache |
| `"{chatId}-visibility"` | `"public" \| "private"` | Chat visibility state |
| `"messages:should-scroll"` | `boolean` | Auto-scroll control |
| `"/api/document?id={id}"` | `Document[]` | Document versions (fetcher-backed) |
