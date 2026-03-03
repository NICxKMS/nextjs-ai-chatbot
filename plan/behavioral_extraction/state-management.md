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
Core chat hook. Configured inside the `useChatSession` hook; `ChatShell` calls `useChatSession` and never calls `useChat` directly.

```typescript
const chatReturn = useChat({
  id: chatId,
  api: "/api/chat",

  transport: new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ id, messages }) => ({
      id: chatId,
      message: messages.at(-1),            // Only the latest message
      selectedChatModel,
      selectedVisibilityType,
      settings,
    }),
  }),

  initialMessages,
  experimental_throttle: adaptiveThrottle,  // 50-150ms based on network speed
  generateId: () => generateUUID(),
  maxSteps: 5,
  sendExtraMessageFields: true,

  onData: (data) => { /* route chat-title + artifact-* parts */ },
  onFinish: () => { /* clear ChatStream between messages — see cleanup notes below */ },
  onError: (error) => { /* parse stream error from response, show toast */ },
});
```

**Key behaviors:**
- `prepareSendMessagesRequest` (via `DefaultChatTransport`) sends only the latest message (not full history)
- `experimental_throttle` adapts to `navigator.connection.effectiveType`
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
- `artifact-clear` resets content and suggestions to empty
- `artifact-finish` sets status to "idle", isVisible to true

### `useChatVisibility`
`useOptimistic`-based with server action mutation, owned by the visibility feature.

```typescript
const [visibilityType, setOptimisticVisibility] = useOptimistic(initialVisibility);

const setVisibilityType = (type) => {
  setOptimisticVisibility(type);       // Instant UI update
  updateChatVisibility({ chatId, visibility: type })
    .catch(() => { setOptimisticVisibility(initialVisibility); toast.error(...); });
};
```

> **Ownership:** The `useChatVisibility` pattern is implemented inside the visibility feature (e.g., `VisibilitySelector`). It toggles the per-chat `Chat.visibility` field only; there is no artifact-level visibility hook.

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

> *`useMessages` context is replaced by `ChatSessionContext`. Messages are accessed via `useChatSessionContext()` which provides the full `ChatSessionValue` interface from the inline provider in `ChatShell`.*

<!-- SYNC: Wave 4 — replaced stale shorthand (5 wrong fields, 8 missing) with authoritative
     ChatSessionValue from redesign §5. Traced via W2-F1, SSC-05, TC-2. -->

> **Authoritative ChatSessionValue** is defined in `plan-archives/redesign/state-management.md` §5
> and reproduced in `plan/scaffold/shared-types.md` §10 and `plan/integration_map/contracts.md` §7.
> The canonical 18-field interface (15 base + `visibility`, `setVisibility` per CV-01 Option A + `availableModels` per MO-W4-C6) replaces the legacy shorthand.

```typescript
import type { ChatSessionValue } from '@/features/chat/types/chat.types'

const session = useChatSessionContext()
// ChatSessionContext is an inline provider in ChatShell (thin orchestrator)
//
// ChatSessionValue fields (intent-based API — 18 fields):
//   Identity:    chatId, chatModel, isReadonly
//   Messages:    messages, status
//   Input:       input, setInput, attachments, setAttachments
//   Actions:     sendMessage, stop, appendMessage, editMessage
//   Error:       error, clearError
//   Visibility:  visibility, setVisibility         // CV-01 Option A (DEV-031)
//   Models:      availableModels                   // MO-W4-C6 (P3-T08)
```

**What is NOT on ChatSessionValue:** `setMessages` (replaced by `editMessage`), `reload` (subsumed by `editMessage(id, sameContent)`), `append` (renamed to `appendMessage`), `selectedModel` (renamed to `chatModel`).

<!-- SYNC: Wave 4 — CONF-001 resolution. visibility removed from "NOT on" list per CV-01 Option A.
     visibility + setVisibility are now included on ChatSessionValue (18-field canonical shape).
     prepareSendMessagesRequest needs selectedVisibilityType at composition time, and
     ChatSessionContext is the stable path. See DEV-031, P3-T05, scaffold/shared-types.md §10. -->

> **Visibility on ChatSessionValue (CV-01 Option A):** `visibility` and `setVisibility` are included on `ChatSessionValue` for `prepareSendMessagesRequest` composition-time access. The visibility feature still owns mutation logic (`updateChatVisibility` Server Action via `useChatVisibility`), but the current value and optimistic setter are exposed through `ChatSessionContext` for composition convenience. See DEV-031.

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
>
> **Memory leak cleanup (two concerns):**
> 1. **ChatStream array reset:** The `onFinish` callback in `useChat` must call `dispatch({ type: 'clear' })` (or equivalent) to reset the `ChatStream: DataPart[]` buffer. Without this, the array grows unboundedly across multi-turn conversations, retaining all prior stream deltas in memory.
> 2. **RAF timer cancel:** The `ChatStreamProvider` must cancel any pending `requestAnimationFrame` handle on unmount (via `useEffect` cleanup returning `cancelAnimationFrame(rafIdRef.current)`). Without this, a queued RAF callback may fire after the provider unmounts, attempting to dispatch into a torn-down context.
>
> <!-- SYNC: Wave 4 — added per SSC-05 reconciliation (memory leak cleanup documentation). -->

State — **DataPart[] buffer only** (no artifact state):
```typescript
type ChatStreamState = {
  ChatStream: DataPart[];        // Raw buffered stream data parts
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
// Read-only snapshot (subscribes to changes, re-renders on update)
const settings = useSettings();

// Write-only setter (no subscription to state changes)
const { updateSettings, resetSettings } = useSettingsSetter();
```

<!-- AUDIT: SE-7 — Fixed stale API names: useSettingsSnapshot → useSettings, setPartialSettings → useSettingsSetter per redesign two-hook split -->

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
- Managed via `useOptimistic` (React 19). Server-fetched initial value, optimistic toggle via Server Action in the visibility feature.
- Written to DB via `updateChatVisibility` Server Action + `updateTag('chat:{id}')`

---

## Data Flow

<!-- SYNC: Wave 4 — CONF-016 resolution. chat-title moved from StreamBridge to onData routing.
     StreamBridge only processes artifact-* parts; chat-title is routed by useChatSession.onData. -->

### `useChatSession.onData` Routing

The `onData` callback in `useChatSession` is the primary routing point for all custom stream data parts:

```
SSE Response → useChat onData callback ─┬→ chat-title  → PendingChats.updateTitle()
                                         └→ artifact-*  → ChatStreamProvider → StreamBridge → artifactStore
```

- `chat-title` → Updates pending chat title in sidebar via `PendingChats.updateTitle()` (single-channel, no StreamBridge involvement)

### StreamBridge

The `StreamBridge` component is the one-way relay between `ChatStreamProvider` and `artifactStore`:

> *StreamBridge uses a pure `processStreamDelta()` function to process **artifact-specific** stream parts and update `artifactStore` (useSyncExternalStore). Thin ~20-line bridge component.*

Processes **artifact-specific** data parts from `ChatStreamProvider`:
1. `artifact-id`, `artifact-title`, `artifact-kind` → Sets artifact metadata
2. `artifact-textDelta` → Appends to artifact content
3. `artifact-codeDelta`, `artifact-sheetDelta` → Replaces artifact content
4. `artifact-imageDelta` → Sets artifact content to base64 image
5. `artifact-clear` → Resets artifact content and suggestions to empty
6. `artifact-finish` → Sets artifact status to "idle", visibility to true
7. `artifact-suggestion` → Appends to suggestions list

<!-- SYNC: Wave 4 — CONF-015 fix. artifact-clear now documents suggestions reset.
     artifact-suggestion routing intent confirmed per W2-AO-5/IC-03 reconciliation. -->

> *`data-usage` removed (no credit/gateway/quota display).*

---

## State Keys

| Key Pattern | Data Type | Usage |
|-------------|-----------|-------|
| `artifactStore` (module-level) | `ArtifactState` | Global artifact panel state |
| `useOptimistic` (component-level) | `"public" \| "private"` | Chat visibility state |
| `scrollRef` (useRef) | `boolean` | Auto-scroll control (ref-based, no re-renders) |
| `"/api/artifact?id={id}"` | `Artifact[]` | Artifact versions (fetcher-backed) |
