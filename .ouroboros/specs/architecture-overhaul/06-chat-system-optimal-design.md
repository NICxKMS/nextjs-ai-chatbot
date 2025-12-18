# 06-Chat-System-Optimal-Design

> **Module**: P1.2 - Chat System  
> **Priority**: HIGH (Core Feature)  
> **Status**: DESIGN COMPLETE  
> **Author**: Ouroboros Architect  
> **Date**: 2024-12-17  
> **Depends On**: 01-error-handling, 02-authentication, 03-data-layer, 04-cache-layer, 05-ai-integration

---

## 1. Feature/Module Purpose

**Business Capability**: Real-time conversational AI interface with streaming responses, message editing, and artifact interactions.

The Chat System serves three stakeholders:

1. **Users**: Seamless chat experience with instant feedback, message editing, streaming responses, and artifact generation
2. **Developers**: Composable UI components, clear state management, testable interactions
3. **Operations**: Observable message flows, error recovery, performance monitoring

**Success Criteria**:

- Sub-100ms perceived input responsiveness
- Smooth streaming with adaptive throttling (50-150ms based on connection)
- Zero UI jank during message virtualization
- Message editing with server-side persistence
- Real-time artifact streaming via data streams
- Graceful error recovery with retry capabilities

---

## 2. Key Requirements

### 2.1 Chat UI Components

| Requirement        | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| Message Display    | Render user/assistant messages with parts (text, files, tools) |
| Streaming Support  | Word-by-word streaming with reasoning blocks                   |
| Virtualized List   | `react-virtuoso` for 1000+ message performance                 |
| Message Actions    | Copy, edit, vote (upvote/downvote)                             |
| Attachment Preview | Image/file previews with upload progress                       |
| Greeting State     | Welcome message for empty conversations                        |

### 2.2 Message Handling

| Requirement          | Description                                      |
| -------------------- | ------------------------------------------------ |
| Multi-Part Messages  | Support text, reasoning, tool-calls, files       |
| Message Editing      | Edit user messages, delete trailing, regenerate  |
| Optimistic Updates   | Immediate UI feedback before server confirmation |
| Error Messages       | Styled error blocks with retry actions           |
| Message Sanitization | XSS-safe text rendering via `sanitizeText`       |

### 2.3 Chat State Management

| Requirement        | Description                             |
| ------------------ | --------------------------------------- |
| `useChat` Hook     | Vercel AI SDK chat state management     |
| Optimistic Chats   | New chat appears immediately in sidebar |
| Model Selection    | Persist model choice to localStorage    |
| Visibility Control | Public/private chat visibility          |
| Attachment State   | File upload state management            |

### 2.4 Server Actions

| Requirement                    | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `generateTitleFromUserMessage` | AI-generated chat title                                  |
| `deleteTrailingMessages`       | Remove messages after timestamp                          |
| `updateChatVisibility`         | Change chat visibility type                              |
| Rate Limiting                  | Standard (100/min) for mutations, strict (10/min) for AI |

### 2.5 Real-time Updates

| Requirement        | Description                                |
| ------------------ | ------------------------------------------ |
| Data Streams       | `UIMessageStreamWriter` for real-time data |
| Artifact Streaming | Progressive artifact content updates       |
| Title Updates      | Stream-generated titles to sidebar         |
| Usage Tracking     | Token counts streamed on completion        |

---

## 3. Quick Current State Notes

### 3.1 What Exists

**Component Inventory**

| File                     | Lines | Purpose                      | Verdict                            |
| ------------------------ | ----- | ---------------------------- | ---------------------------------- |
| chat.tsx                 | 524   | Main chat orchestrator       | ⚠️ **551 LOC - NEEDS REFACTORING** |
| messages.tsx             | 320   | Virtualized message list     | ✅ Well-structured                 |
| message.tsx              | 387   | Individual message rendering | ⚠️ Complex part handling           |
| message-editor.tsx       | 115   | Message editing UI           | ✅ Focused                         |
| message-actions.tsx      | 207   | Vote/copy/edit actions       | ✅ Good separation                 |
| multimodal-input.tsx     | 551   | Chat input with attachments  | ⚠️ Large, complex                  |
| data-stream-handler.tsx  | 111   | Artifact stream processing   | ✅ Clean                           |
| data-stream-provider.tsx | 72    | Split context pattern        | ✅ Excellent pattern               |

**Hooks Inventory**

| File                     | Lines | Purpose                    | Verdict             |
| ------------------------ | ----- | -------------------------- | ------------------- |
| use-artifact.ts          | 153   | SWR-based artifact state   | ✅ Selector pattern |
| use-optimistic-chats.tsx | 111   | Optimistic sidebar updates | ✅ O(1) operations  |
| use-chat-visibility.ts   | ~50   | Chat visibility state      | ✅ Focused          |
| use-messages.tsx         | 34    | Scroll-to-bottom helper    | ⚠️ Underutilized    |

### 3.2 Architectural Analysis

**Strengths**:

1. **Vercel AI SDK Integration**: `useChat` provides robust streaming foundation
2. **Virtualized Rendering**: `react-virtuoso` handles large message lists efficiently
3. **Split Context Pattern**: `DataStreamProvider` separates state/dispatch for perf
4. **Selector Pattern**: `useArtifactSelector` prevents unnecessary re-renders
5. **Optimistic Updates**: New chats appear instantly with O(1) Set-based deduplication
6. **Adaptive Throttling**: Connection-aware streaming throttle (50-150ms)
7. **Memory Limits**: `MAX_OPTIMISTIC_CHATS = 50` prevents unbounded growth

**Weaknesses**:

1. **524-Line Monolith**: `chat.tsx` handles too many concerns
2. **Prop Drilling**: 15+ props passed through component tree
3. **Mixed Concerns**: Model selection, streaming, errors all in one component
4. **Duplicate State**: Visibility tracked in multiple places
5. **Complex Memo Logic**: `Messages` memo has 12+ condition checks
6. **Polling Pattern**: Title updates use setTimeout polling instead of events

### 3.3 Complexity Breakdown: chat.tsx

```
chat.tsx (524 lines):
├── Lines 1-50:    Imports (50 imports!)
├── Lines 50-100:  Props + state initialization
├── Lines 100-150: Model selection logic
├── Lines 150-180: Adaptive throttle calculation
├── Lines 180-280: useChat hook with handlers
│   ├── onData: 50 lines (streaming data handling)
│   ├── onFinish: 20 lines (title polling)
│   └── onError: 50 lines (error categorization)
├── Lines 280-350: Side effects (6 useEffects)
├── Lines 350-450: SWR + render logic
└── Lines 450-524: JSX (Alert dialogs, layout)
```

**Issue**: Single component doing model management, error handling, streaming, polling, and rendering.

### 3.4 Re-render Analysis

```
Current re-render triggers:
├── messages change → Messages re-render (expected)
├── status change → Messages re-render (expected)
├── isArtifactVisible → Messages skipped (good!)
├── currentModelId → Full Chat re-render (unnecessary for messages)
├── attachments → Full Chat re-render (unnecessary for messages)
├── input → Full Chat re-render (unnecessary for messages)
└── usage → Full Chat re-render (unnecessary for messages)
```

**Issue**: State colocation issues cause cascade re-renders.

---

## 4. Optimal Architecture Design

### 4.1 Design Principles

| Principle                 | Implementation                         |
| ------------------------- | -------------------------------------- |
| **Single Responsibility** | Split chat.tsx into focused components |
| **State Colocation**      | Move state closer to where it's used   |
| **Composition > Props**   | Use compound components + context      |
| **Selective Re-render**   | Isolate frequently-changing state      |
| **Server-First**          | Server Actions for mutations           |

### 4.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ChatPage (Server)                           │
│  - Fetches initial data (messages, model, visibility, votes)        │
│  - Passes to client boundary                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ChatProvider (Client Context)                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ChatStateContext: messages, status, error, chatId           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ChatActionsContext: sendMessage, stop, regenerate, setMsgs  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ModelContext: currentModel, availableModels, setModel       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  ChatHeader   │         │   ChatMessages  │         │   ChatInput     │
│  (Model UI)   │         │   (Virtuoso)    │         │  (Multimodal)   │
└───────────────┘         └─────────────────┘         └─────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐   ┌──────────┐
              │ Message  │   │ Message  │   │ Message  │
              │  (User)  │   │  (Asst)  │   │ (Error)  │
              └──────────┘   └──────────┘   └──────────┘
```

### 4.3 Proposed File Structure

```
components/chat/
├── index.ts                    # Public exports
├── chat-provider.tsx           # Context + useChat wrapper (~150 LOC)
├── chat-container.tsx          # Layout orchestration (~50 LOC)
├── chat-messages.tsx           # Virtuoso wrapper (~120 LOC)
├── chat-input.tsx              # Input extraction (~100 LOC)
├── chat-error-boundary.tsx     # Error handling (~50 LOC)
├── hooks/
│   ├── use-chat-state.ts       # ChatStateContext consumer
│   ├── use-chat-actions.ts     # ChatActionsContext consumer
│   └── use-model-select.ts     # Model selection logic
├── message/
│   ├── message-item.tsx        # Single message (~200 LOC)
│   ├── message-parts.tsx       # Part rendering (~150 LOC)
│   ├── message-actions.tsx     # Vote/copy/edit (~100 LOC)
│   └── message-editor.tsx      # Edit mode (~100 LOC)
└── utils/
    └── adaptive-throttle.ts    # Connection-aware throttle
```

### 4.4 Context Split Pattern

```typescript
// chat-provider.tsx
type ChatState = {
  chatId: string;
  messages: ChatMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error: Error | null;
  isReadonly: boolean;
  isGuest: boolean;
};

type ChatActions = {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  stop: () => void;
  clearError: () => void;
};

type ModelState = {
  currentModelId: string;
  availableModels: ModelMetadata[];
  setModelId: (id: string) => void;
};

// Split contexts prevent cross-concern re-renders
const ChatStateContext = createContext<ChatState | null>(null);
const ChatActionsContext = createContext<ChatActions | null>(null);
const ModelContext = createContext<ModelState | null>(null);
```

### 4.5 Component Composition

```tsx
// Optimal: Compound component pattern
export function Chat({ id, initialMessages, ... }: ChatProps) {
  return (
    <ChatProvider
      chatId={id}
      initialMessages={initialMessages}
      {...providerProps}
    >
      <ChatContainer>
        <ChatHeader />
        <ChatMessages votes={votes} />
        <ChatInput />
      </ChatContainer>
      <ChatArtifact />
      <ChatErrorDialog />
    </ChatProvider>
  );
}

// ChatMessages only subscribes to message-related state
function ChatMessages({ votes }: { votes?: UserVote[] }) {
  const { messages, status, error } = useChatState();
  const { setMessages, regenerate } = useChatActions();

  // No re-render when model changes, input changes, etc.
  return (
    <Virtuoso
      data={messages}
      itemContent={(index, message) => (
        <MessageItem
          message={message}
          vote={votes?.find(v => v.messageId === message.id)}
        />
      )}
    />
  );
}
```

### 4.6 Streaming Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Route (/api/chat)                     │
│  streamText() → UIMessageStreamWriter                           │
│  ├── text chunks → message content                              │
│  ├── tool-call → tool UI parts                                  │
│  ├── data-usage → usage tracking                                │
│  ├── data-title → chat title                                    │
│  └── data-* → artifact streams                                  │
└─────────────────────────────────────────────────────────────────┘
                              │ SSE
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useChat (Transport Layer)                     │
│  DefaultChatTransport.fetch() → EventSource                     │
│  ├── onData → dispatch to handlers                              │
│  ├── experimental_throttle → batch updates                      │
│  └── onFinish → completion callback                             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ ChatState   │    │ DataStream  │    │ Optimistic  │
   │ (messages)  │    │ (artifacts) │    │ (sidebar)   │
   └─────────────┘    └─────────────┘    └─────────────┘
```

### 4.7 Message Edit Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Edit" on message                                   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ MessageEditor renders with current content                       │
│ - Textarea with auto-height adjustment                          │
│ - Cancel/Send buttons                                           │
└─────────────────────────────────────────────────────────────────┘
          │ User clicks "Send"
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server Action: deleteTrailingMessages                           │
│ - Validates auth + ownership                                    │
│ - Deletes messages after timestamp                              │
│ - Revalidates chat path                                         │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Client: setMessages (optimistic update)                         │
│ - Truncate to edited message                                    │
│ - Update edited message content                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Client: regenerate()                                            │
│ - Triggers new AI response                                      │
│ - Streams back through normal flow                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

### 5.1 Core Dependencies

| Package           | Version | Purpose                       |
| ----------------- | ------- | ----------------------------- |
| `@ai-sdk/react`   | 5.0.26  | `useChat` hook, streaming     |
| `ai`              | 5.0.26  | `UIMessage`, transport types  |
| `react-virtuoso`  | 4.17.0  | Virtualized message list      |
| `swr`             | latest  | Client-side cache, optimistic |
| `usehooks-ts`     | latest  | Utility hooks                 |
| `framer-motion`   | latest  | Message animations            |
| `fast-deep-equal` | latest  | Memo comparisons              |

### 5.2 Internal Dependencies

| Module         | Import Path                  | Purpose               |
| -------------- | ---------------------------- | --------------------- |
| Error Handling | `@/lib/errors`               | `ChatSDKError`        |
| Auth           | `@/components/auth-provider` | Session state         |
| Data Layer     | `@/lib/data/chat`            | Chat/message data     |
| AI Integration | `@/lib/ai/*`                 | Model registry, tools |
| Settings       | `@/lib/ui/settings-store`    | User preferences      |

---

## 6. Bundle Strategy

### 6.1 Client Components

```typescript
// Required "use client" components (must ship to browser)
components/chat/
├── chat-provider.tsx      // useChat requires client
├── chat-messages.tsx      // Virtuoso requires client
├── chat-input.tsx         // Input state requires client
├── message/
│   ├── message-item.tsx   // Animations require client
│   └── message-editor.tsx // Textarea state requires client
```

### 6.2 Dynamic Imports

```typescript
// Lazy-load non-critical components
const Artifact = dynamic(() => import("./artifact"), { ssr: false });
const MessageReasoning = dynamic(() => import("./message-reasoning"));
const DocumentToolResult = dynamic(() => import("./document"));
```

### 6.3 Bundle Size Targets

| Component | Target Size | Strategy                     |
| --------- | ----------- | ---------------------------- |
| Chat core | < 50KB      | Split contexts               |
| Messages  | < 30KB      | Virtualization handles scale |
| Input     | < 20KB      | Lazy-load file upload        |
| Artifact  | < 100KB     | Dynamic import               |

---

## 7. Simplifications vs Current

### 7.1 Removed Patterns

| Current                    | Simplified           | Rationale             |
| -------------------------- | -------------------- | --------------------- |
| 50+ imports in chat.tsx    | Split across modules | Clearer dependencies  |
| Title polling (setTimeout) | Event-based updates  | More reliable         |
| 15+ props drilling         | Context consumption  | Cleaner interfaces    |
| 6 useEffects in chat.tsx   | Collocated effects   | Single responsibility |
| Inline error handling      | Error boundary       | Declarative errors    |

### 7.2 Consolidated State

| Before                                  | After                       |
| --------------------------------------- | --------------------------- |
| `currentModelId` + `currentModelIdRef`  | Single `ModelContext`       |
| `messagesLengthRef` + `messages.length` | Direct ref in callback      |
| `showCreditCardAlert` state             | `ChatErrorDialog` component |
| `hasAppendedQuery` + `query`            | `useInitialQuery` hook      |

### 7.3 Extracted Hooks

```typescript
// Before: Inline in chat.tsx
const optimalThrottle = useMemo(() => {
  if (typeof navigator !== "undefined" && "connection" in navigator) {
    // ... 15 lines of logic
  }
  return 100;
}, []);

// After: Extracted hook
// components/chat/hooks/use-adaptive-throttle.ts
export function useAdaptiveThrottle(): number {
  return useMemo(() => {
    if (typeof navigator === "undefined") return 100;
    const conn = (navigator as NavigatorWithConnection).connection;
    if (conn?.effectiveType === "4g" || conn?.effectiveType === "5g") return 50;
    if (conn?.effectiveType === "3g") return 150;
    return 100;
  }, []);
}
```

---

## 8. Dependencies

### 8.1 Module Dependencies

```mermaid
graph TD
    A[06-Chat-System] --> B[05-AI-Integration]
    A --> C[03-Data-Layer]
    A --> D[04-Cache-Layer]
    A --> E[02-Authentication]
    A --> F[01-Error-Handling]

    B --> F
    B --> E
    C --> F
    C --> E
    D --> F

    subgraph "Chat System"
        A
    end

    subgraph "Core Infrastructure"
        F
        E
    end

    subgraph "Data & AI"
        B
        C
        D
    end
```

### 8.2 Import Graph

```
ChatProvider
├── @ai-sdk/react (useChat)
├── @/lib/errors (ChatSDKError)
├── @/lib/ai/model-catalog-types (ModelMetadata)
└── @/components/auth-provider (useAuth)

ChatMessages
├── react-virtuoso (Virtuoso)
├── @/lib/motion (AnimatePresence)
└── @/lib/types (ChatMessage, UserVote)

ChatInput
├── @/components/ui/* (Button, Textarea)
├── @/lib/ai/model-catalog-types (ModelMetadata)
└── @/lib/usage (AppUsage)

Server Actions
├── @/lib/api/guards (requireAuth, requireRateLimit)
├── @/lib/data/chat (chatData, messageData)
└── @/lib/ai/title-generation (generateTitle)
```

---

## 9. Public Interface

### 9.1 Component Exports

```typescript
// components/chat/index.ts

// Main component
export { Chat } from "./chat-container";
export type { ChatProps } from "./types";

// Context hooks (for extensions/plugins)
export { useChatState, useChatActions, useModelState } from "./hooks";

// Sub-components (for custom layouts)
export { ChatMessages } from "./chat-messages";
export { ChatInput } from "./chat-input";
export { ChatHeader } from "./chat-header";
export { MessageItem } from "./message/message-item";
```

### 9.2 Server Actions

```typescript
// app/(chat)/actions.ts

export async function generateTitleFromUserMessage(params: {
  message: UIMessage;
}): Promise<string>;

export async function deleteTrailingMessages(params: {
  chatId: string;
  createdAt: string;
}): Promise<void>;

export async function updateChatVisibility(params: {
  chatId: string;
  visibility: VisibilityType;
}): Promise<void>;
```

### 9.3 Hook Interfaces

```typescript
// useChatState - Read-only state
interface ChatState {
  chatId: string;
  messages: ChatMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error: Error | null;
  isReadonly: boolean;
  isGuest: boolean;
}

// useChatActions - Mutation actions
interface ChatActions {
  sendMessage: (message: CreateMessage) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  regenerate: () => void;
  stop: () => void;
  clearError: () => void;
}

// useModelState - Model selection
interface ModelState {
  currentModelId: string;
  availableModels: ModelMetadata[];
  setModelId: (id: string) => void;
}
```

---

## 10. Performance Optimizations

### 10.1 Re-render Prevention

| Optimization      | Implementation                   | Impact                   |
| ----------------- | -------------------------------- | ------------------------ |
| Split Contexts    | State/Actions/Model separated    | -60% re-renders          |
| Selector Pattern  | `useArtifactSelector` for reads  | -40% artifact re-renders |
| Memo Boundaries   | `memo()` on MessageItem          | O(1) per message         |
| Stable Callbacks  | `useCallback` for handlers       | Prevent child re-renders |
| Ref for Callbacks | `currentModelIdRef` for closures | No stale closure bugs    |

### 10.2 Virtualization

```typescript
// react-virtuoso configuration
<Virtuoso
  data={messages}
  // Render buffer above/below viewport
  increaseViewportBy={{ top: 200, bottom: 200 }}
  // Smooth auto-scroll during streaming
  followOutput="smooth"
  // Trigger scroll-to-bottom when near
  atBottomThreshold={100}
  // Item renderer with stable identity
  itemContent={itemContent}
/>
```

### 10.3 Streaming Throttle

```typescript
// Adaptive throttle based on connection
function getOptimalThrottle(): number {
  const conn = navigator.connection;
  switch (conn?.effectiveType) {
    case "4g":
    case "5g":
      return 50; // Fast: frequent updates
    case "3g":
      return 150; // Slow: batch more updates
    default:
      return 100; // Default: balanced
  }
}
```

### 10.4 Memory Management

| Concern          | Solution                        |
| ---------------- | ------------------------------- |
| Optimistic chats | `MAX_OPTIMISTIC_CHATS = 50` cap |
| Data stream      | Clear on chat change/unmount    |
| Timers           | Cleanup in useEffect return     |
| Message refs     | WeakRef for large attachments   |

### 10.5 Perceived Performance

| Technique             | Implementation                    |
| --------------------- | --------------------------------- |
| Optimistic UI         | Chat appears in sidebar instantly |
| Skeleton loading      | `ThinkingMessage` during submit   |
| Progressive streaming | Word-by-word via `smoothStream`   |
| Scroll lock           | Auto-scroll only when at bottom   |

---

## 11. Migration Strategy

### 11.1 Phase 1: Extract Contexts (Low Risk)

```
1. Create ChatProvider with split contexts
2. Move useChat call into provider
3. Update Chat to consume contexts
4. Keep all existing logic unchanged
```

### 11.2 Phase 2: Extract Components (Medium Risk)

```
1. Extract ChatMessages component
2. Extract ChatInput component
3. Create message/ subdirectory
4. Move message-related components
```

### 11.3 Phase 3: Extract Hooks (Low Risk)

```
1. Create use-adaptive-throttle.ts
2. Create use-initial-query.ts
3. Move model selection to use-model-select.ts
4. Update imports
```

### 11.4 Phase 4: Cleanup (Low Risk)

```
1. Remove unused code from chat.tsx
2. Update imports across codebase
3. Add barrel exports
4. Update tests
```

---

## 12. Testing Strategy

### 12.1 Component Tests

```typescript
// ChatMessages virtualization
test("renders only visible messages", async () => {
  const messages = generateMessages(1000);
  render(<ChatMessages messages={messages} />);

  // Only ~10-20 messages should be in DOM
  expect(screen.getAllByTestId("message")).toHaveLength(expect.lessThan(30));
});

// Context isolation
test("model change does not re-render messages", () => {
  const renderCount = jest.fn();
  render(
    <ChatProvider>
      <ModelChanger />
      <MessagesWithRenderCount onRender={renderCount} />
    </ChatProvider>
  );

  fireEvent.click(screen.getByText("Change Model"));
  expect(renderCount).toHaveBeenCalledTimes(1); // Initial only
});
```

### 12.2 E2E Tests

```typescript
// Streaming test
test("streams response word by word", async ({ page }) => {
  await page.goto("/chat/new");
  await page.fill('[data-testid="chat-input"]', "Hello");
  await page.click('[data-testid="send-button"]');

  // Verify streaming state
  await expect(page.getByTestId("thinking")).toBeVisible();

  // Verify message appears progressively
  const message = page.getByTestId("message-assistant");
  await expect(message).toHaveText(/.+/, { timeout: 10000 });
});

// Edit message test
test("edits message and regenerates", async ({ page }) => {
  // ... navigate to chat with messages
  await page.hover('[data-testid="message-user"]');
  await page.click('[aria-label="Edit"]');
  await page.fill('[data-testid="message-editor"]', "Updated");
  await page.click('button:has-text("Send")');

  await expect(page.getByTestId("message-user")).toContainText("Updated");
});
```

---

## 13. Decision Record

### ADR-006: Split Chat Context Pattern

**Status**: Proposed  
**Date**: 2024-12-17

#### Context

The current `chat.tsx` (524 LOC) mixes state management, streaming, error handling, and UI rendering. State changes in one area (e.g., model selection) trigger re-renders in unrelated areas (e.g., message list).

#### Decision

Split into three contexts:

1. `ChatStateContext` - Read-only state (messages, status, error)
2. `ChatActionsContext` - Mutation functions (sendMessage, regenerate)
3. `ModelContext` - Model selection state

#### Consequences

**Positive**:

- **POS-001**: 60% fewer re-renders when model changes
- **POS-002**: Clearer separation of concerns
- **POS-003**: Easier to test individual contexts

**Negative**:

- **NEG-001**: More boilerplate for context setup
- **NEG-002**: Must coordinate multiple providers

#### Alternatives Considered

**ALT-001**: Zustand global store

- Rejected: Adds external dependency, SWR already handles caching

**ALT-002**: Keep single context, use selectors

- Rejected: Selectors can't prevent context re-subscription re-renders

**ALT-003**: React.memo everything

- Rejected: Doesn't solve prop drilling, adds complexity

---

## 14. Appendix

### A. Current vs Optimal Comparison

| Metric                     | Current   | Optimal           |
| -------------------------- | --------- | ----------------- |
| chat.tsx LOC               | 524       | ~50 (container)   |
| Total chat files           | 8         | 12                |
| Max file LOC               | 551       | ~200              |
| Props to Messages          | 12        | 3 (context)       |
| useEffect count            | 6         | 2-3 per component |
| Re-renders on model change | Full tree | ModelContext only |

### B. Component Size Targets

| Component          | Current LOC | Target LOC |
| ------------------ | ----------- | ---------- |
| chat-provider.tsx  | (new)       | ~150       |
| chat-container.tsx | (new)       | ~50        |
| chat-messages.tsx  | 320         | ~120       |
| chat-input.tsx     | 551         | ~100       |
| message-item.tsx   | 387         | ~200       |

### C. Virtuoso Configuration Reference

```typescript
// Optimal Virtuoso settings for chat
const virtuosoConfig = {
  // Buffer for smooth scrolling
  increaseViewportBy: { top: 200, bottom: 200 },

  // Auto-scroll during streaming
  followOutput: "smooth",

  // Scroll-to-bottom threshold
  atBottomThreshold: 100,

  // Initial scroll position (bottom)
  initialTopMostItemIndex: messages.length - 1,

  // Overscan for keyboard navigation
  overscan: { main: 200, reverse: 200 },
};
```

---

**End of Design Document**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ OUROBOROS ARCHITECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Decision: Chat System Architecture
📌 Status: Proposed
📌 Result: OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Files Created

- `.ouroboros/specs/architecture-overhaul/06-chat-system-optimal-design.md`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [TASK COMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
