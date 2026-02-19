# Feature Modules Process Flow

## Overview

This document details the process flows within feature modules, including server action flows, component hierarchies, and state management patterns.

---

## 1. Server Action Flows

### 1.1 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Form as AuthForm
    participant Action as Server Action
    participant NextAuth
    participant DB as Database
    
    User->>Form: Submit credentials
    Form->>Action: FormData (email, password)
    Action->>Action: Validate with loginSchema
    
    alt Login
        Action->>NextAuth: signIn("credentials")
        NextAuth->>DB: Verify credentials
        DB-->>NextAuth: User data
        NextAuth-->>Action: Session created
        Action-->>Form: AuthResult { success: true, redirectTo }
        Form->>User: Redirect to /chat
    else Register
        Action->>DB: authService.createUser()
        DB-->>Action: User created
        Action-->>Form: AuthResult { success: true, redirectTo: /login }
        Form->>User: Redirect to login
    end
```

#### Login Action Code Flow

```typescript
// features/auth/actions/login.action.ts
export async function login(formData: FormData, callbackUrl?: string): Promise<AuthResult> {
  // 1. Extract credentials
  const email = formData.get("email")
  const password = formData.get("password")
  
  // 2. Validate input
  const parsed = loginSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { success: false, error: "Please provide a valid email and password." }
  }
  
  // 3. Attempt sign in
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
    return { success: true, redirectTo: callbackUrl || "/chat" }
  } catch (error) {
    // 4. Handle errors
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password." }
        default:
          return { success: false, error: "An error occurred during sign in." }
      }
    }
    throw error
  }
}
```

### 1.2 Chat Streaming Flow

```mermaid
sequenceDiagram
    participant User
    participant Chat as Chat Component
    participant Hook as useChat Hook
    participant API as /api/chat
    participant Action as streamChatAction
    participant AI as AI Model
    participant DB as Database
    
    User->>Chat: Type message
    Chat->>Hook: sendMessage()
    Hook->>API: POST /api/chat
    API->>Action: streamChatAction()
    
    Action->>Action: requireAuthAction()
    Action->>Action: Validate model
    Action->>Action: Check quota
    Action->>Action: Check rate limit
    
    Action->>DB: Save user message
    Action-->>API: StreamChatResult
    
    API->>AI: Stream AI response
    AI-->>API: Stream chunks
    
    loop Stream chunks
        API-->>Hook: Data part
        Hook->>Chat: Update messages
        Chat->>User: Display message
    end
    
    API->>DB: Save AI message
    API->>DB: Update chat title
```

#### Stream Chat Action Code Flow

```typescript
// features/chat/actions/stream-chat.action.ts
export async function streamChatAction(input: StreamChatInput): Promise<StreamChatResult> {
  // 1. Authenticate
  const userId = await requireAuthAction()
  const session = await getSession()
  
  // 2. Validate model entitlements
  if (input.selectedModel) {
    if (!isValidModelId(input.selectedModel)) {
      return { success: false, error: "Invalid model ID" }
    }
    if (!entitlements.availableChatModelIds.includes(input.selectedModel)) {
      return { success: false, error: "Model not available" }
    }
  }
  
  // 3. Check daily quota
  const quotaResult = await checkMessageQuota(userId, entitlements.maxMessagesPerDay)
  if (!quotaResult.allowed) {
    throw new RateLimitError("Daily message limit reached")
  }
  
  // 4. Check rate limit
  const rateLimitResult = await checkChatLimit(userId)
  if (!rateLimitResult.success) {
    throw new RateLimitError("Too many requests")
  }
  
  // 5. Save messages
  await chatService.saveChat(saveParams, ctx)
  
  // 6. Revalidate
  revalidatePath(`/chat/${input.chatId}`)
  
  return { success: true, chatId: input.chatId }
}
```

### 1.3 Artifact Creation Flow

```mermaid
sequenceDiagram
    participant AI as AI Model
    participant Tool as createDocument Tool
    participant Action as createArtifact Action
    participant DB as Database
    participant UI as Artifact Panel
    
    AI->>Tool: Tool call: createDocument
    Tool->>Action: createArtifact(params)
    
    Action->>Action: Validate with CreateArtifactSchema
    Action->>DB: Insert artifact
    DB-->>Action: Artifact record
    
    Action->>Action: Create initial version
    Action->>DB: Insert version
    
    Action-->>Tool: Artifact created
    Tool-->>AI: Document output
    AI->>UI: Stream artifact content
    UI->>UI: Update artifact state
```

### 1.4 Settings Update Flow

```mermaid
sequenceDiagram
    participant User
    participant Sheet as SettingsSheet
    participant Hook as useSettings
    participant Action as updateAppSettings
    participant Local as localStorage
    participant DB as Database
    
    User->>Sheet: Change setting
    Sheet->>Hook: updatePreference(key, value)
    
    Hook->>Hook: Optimistic update
    Hook->>Local: Persist to localStorage
    
    Hook->>Action: updateAppSettings(updates)
    Action->>DB: Update settings
    DB-->>Action: Updated settings
    
    alt Success
        Action-->>Hook: { success: true, settings }
        Hook->>Hook: Confirm optimistic update
    else Failure
        Action-->>Hook: { success: false, error }
        Hook->>Hook: Revert optimistic update
        Hook->>Local: Restore previous value
    end
```

---

## 2. Component Hierarchies

### 2.1 Chat Component Hierarchy

```
Chat (container)
  |
  +-- ChatHeader
  |     |
  |     +-- VisibilitySelector
  |     +-- ModelSelector (from settings)
  |
  +-- Messages (virtualized list)
  |     |
  |     +-- Message (per message)
  |     |     |
  |     |     +-- MessageReasoning (collapsible)
  |     |     +-- MessageParts
  |     |     |     +-- TextPart
  |     |     |     +-- FilePart
  |     |     |     +-- ToolInvocation
  |     |     |
  |     |     +-- MessageActions
  |     |           +-- VoteButtons
  |     |           +-- EditButton
  |     |           +-- CopyButton
  |     |
  |     +-- ThinkingMessage (loading state)
  |     +-- Greeting (empty state)
  |
  +-- DataStreamHandler
  |     |
  |     +-- Artifact stream processing
  |     +-- Usage tracking
  |     +-- Title updates
  |
  +-- MultimodalInput (from input feature)
        |
        +-- AttachmentPreview
        +-- SuggestedActions
        +-- SubmitButton
```

### 2.2 Artifact Component Hierarchy

```
ArtifactPanel
  |
  +-- ArtifactActions (toolbar)
  |     |
  |     +-- Version navigation
  |     +-- Mode toggle (edit/diff)
  |     +-- Artifact-specific actions
  |
  +-- ArtifactErrorBoundary
  |     |
  |     +-- Editor components (based on kind)
  |           |
  |           +-- CodeEditor (code artifacts)
  |           |     +-- Monaco Editor
  |           |     +-- Syntax highlighting
  |           |
  |           +-- TextEditor (text artifacts)
  |           |     +-- Rich text editor
  |           |
  |           +-- ImageEditor (image artifacts)
  |           |     +-- Image preview
  |           |
  |           +-- SheetEditor (sheet artifacts)
  |                 +-- Spreadsheet view
  |
  +-- Console (output panel)
  |     +-- Execution results
  |     +-- Error display
  |
  +-- ArtifactMessages (chat in artifact context)
        +-- Message list
        +-- Input (for artifact-specific chat)
```

### 2.3 Sidebar Component Hierarchy

```
AppSidebar
  |
  +-- SidebarHeader
  |     +-- New Chat button
  |
  +-- SidebarContent
  |     |
  |     +-- SidebarHistory
  |     |     |
  |     |     +-- ChatGroup (today)
  |     |     |     +-- SidebarItem (per chat)
  |     |     |           +-- Chat link
  |     |     |           +-- Delete button
  |     |     |
  |     |     +-- ChatGroup (yesterday)
  |     |     +-- ChatGroup (last week)
  |     |     +-- ChatGroup (older)
  |     |     |
  |     |     +-- OptimisticChats (pending)
  |     |
  |     +-- SidebarSkeleton (loading)
  |
  +-- SidebarFooter
        |
        +-- SidebarUserNav
              +-- User avatar
              +-- User email
              +-- Settings button
              +-- Logout button
```

### 2.4 Settings Component Hierarchy

```
SettingsSheet (Radix Sheet)
  |
  +-- SheetHeader
  |     +-- Title
  |     +-- Description
  |
  +-- SheetContent
        |
        +-- ModelSelector
        |     +-- Model list
        |     +-- Capability badges
        |
        +-- ThemeToggle
        |     +-- Light/Dark/System options
        |
        +-- SamplingSettings
        |     +-- Temperature slider
        |     +-- Top P slider
        |     +-- Max tokens input
        |
        +-- SystemPrompt
        |     +-- Textarea
        |
        +-- DataManagement
              +-- Clear data button
              +-- Export data button
```

---

## 3. State Management Patterns

### 3.1 Auth State Pattern (Context + BroadcastChannel)

```typescript
// Multi-tab synchronization pattern
interface AuthContextValue {
  session: AppSession | null
  status: AuthStatus
  isNewSession: boolean
  setSession: (session: AppSession | null) => void
  clearNewSessionFlag: () => void
}

// Implementation uses:
// 1. React Context for component tree
// 2. BroadcastChannel for cross-tab sync
// 3. Storage events for fallback

// Cross-tab sync
useEffect(() => {
  const channel = new BroadcastChannel("auth-state-channel")
  channel.onmessage = (event) => {
    switch (event.data.type) {
      case "login":
        // Refresh session from server
        break
      case "logout":
        setSession(null)
        break
    }
  }
  return () => channel.close()
}, [])
```

### 3.2 Chat State Pattern (AI SDK + SWR)

```typescript
// AI SDK useChat wrapper pattern
interface UseChatReturn {
  messages: ChatMessage[]
  setMessages: (messages: ChatMessage[]) => void
  sendMessage: (message: { content: string; attachments?: Attachment[] }) => Promise<void>
  status: "ready" | "submitted" | "streaming" | "error"
  stop: () => void
  regenerate: () => Promise<void>
  error: Error | null
  modelId: string
  setModelId: (modelId: string) => void
}

// Uses AI SDK's useChat with custom transport
const chat = useAIChat({
  id: chatId,
  messages: initialMessages,
  transport: new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest(request) {
      return {
        body: {
          id: request.id,
          message: request.messages.at(-1),
          selectedChatModel: modelIdRef.current,
        },
      }
    },
  }),
})

// SWR for votes (server-provided, no client fetch)
const { data: votes } = useSWR<UserVote[]>(
  `/api/vote?chatId=${id}`,
  null, // No fetcher
  { fallbackData: initialVotes || [] }
)
```

### 3.3 Artifact State Pattern (SWR + Selector)

```typescript
// SWR-based state with selector pattern
interface UIArtifact {
  title: string
  documentId: string
  kind: ArtifactKind
  content: string
  isVisible: boolean
  status: ArtifactStatus
  boundingBox: ArtifactBoundingBox
}

// SWR for persistence
const { data: localArtifact, mutate: setLocalArtifact } = useSWR<UIArtifact>(
  "artifact",
  null,
  { fallbackData: initialArtifactData }
)

// Selector hook for optimized reads
function useArtifactSelector<Selected>(selector: (state: UIArtifact) => Selected) {
  const { data: localArtifact } = useSWR<UIArtifact>("artifact", null, {
    fallbackData: initialArtifactData,
  })
  
  return useMemo(() => selector(localArtifact ?? initialArtifactData), [localArtifact, selector])
}

// Usage
const isVisible = useArtifactSelector((state) => state.isVisible)
```

### 3.4 Settings State Pattern (Zustand-like + localStorage)

```typescript
// SettingsProvider pattern with zustand-like API
interface SettingsStore {
  // State
  selectedModelId: string
  sampling: SamplingSettings
  systemPrompt: string
  enableReasoning: boolean
  streamArtifacts: boolean
  autoScroll: boolean
  
  // Actions
  setSelectedModelId: (id: string) => void
  setSampling: (sampling: Partial<SamplingSettings>) => void
  setSystemPrompt: (prompt: string) => void
  toggleReasoning: () => void
  toggleStreamArtifacts: () => void
  toggleAutoScroll: () => void
  reset: () => void
}

// Usage hooks
function useSettingsModelSelection() {
  const selectedModelId = useSettingsSnapshot().selectedModelId
  const setSelectedModelId = useSettingsStore((s) => s.setSelectedModelId)
  return { selectedModelId, setSelectedModelId }
}
```

### 3.5 Optimistic Updates Pattern (Context + Ref)

```typescript
// Optimistic chats pattern with O(1) duplicate detection
interface OptimisticChat {
  id: string
  title: string
  createdAt: Date
}

function OptimisticChatsProvider({ children }) {
  const [optimisticChats, setOptimisticChats] = useState<OptimisticChat[]>([])
  
  // O(1) duplicate detection using Set
  const optimisticChatIdsRef = useRef(new Set<string>())
  
  const addOptimisticChat = useCallback((chatId: string, initialTitle?: string) => {
    // O(1) duplicate check
    if (optimisticChatIdsRef.current.has(chatId)) return
    optimisticChatIdsRef.current.add(chatId)
    
    setOptimisticChats((prev) => {
      const updated = [{ id: chatId, title: initialTitle || "New Chat", createdAt: new Date() }, ...prev]
      
      // Memory bounded (max 50)
      if (updated.length > MAX_OPTIMISTIC_CHATS) {
        const removed = updated.slice(MAX_OPTIMISTIC_CHATS)
        for (const chat of removed) {
          optimisticChatIdsRef.current.delete(chat.id)
        }
        return updated.slice(0, MAX_OPTIMISTIC_CHATS)
      }
      return updated
    })
  }, [])
  
  return <OptimisticChatsContext.Provider value={{ optimisticChats, addOptimisticChat, ... }}>
    {children}
  </OptimisticChatsContext.Provider>
}
```

### 3.6 Input State Pattern (localStorage + Debounce)

```typescript
// Input persistence pattern
function useInput(options: UseInputOptions): UseInputReturn {
  const { chatId, initialValue = "", debounceDelay = 500 } = options
  
  const [value, setValue] = useState(initialValue)
  const [localStorageInput, setLocalStorageInput] = useLocalStorage(`input-${chatId}`, "", {
    initializeWithValue: false,
  })
  
  // Debounce localStorage writes
  const debouncedSetLocalStorageInput = useDebounceCallback(setLocalStorageInput, debounceDelay)
  
  // Hydration effect
  useEffect(() => {
    if (textareaRef.current) {
      const finalValue = textareaRef.current.value || localStorageInput || ""
      setValue(finalValue)
    }
  }, [localStorageInput])
  
  // Sync to localStorage
  useEffect(() => {
    debouncedSetLocalStorageInput(value)
  }, [value, debouncedSetLocalStorageInput])
  
  return { value, setValue, ... }
}
```

---

## 4. Data Flow Patterns

### 4.1 Server-to-Client Data Flow

```mermaid
graph LR
    subgraph "Server"
        DB[(Database)]
        ACTION[Server Action]
        API[API Route]
    end
    
    subgraph "Client"
        HOOK[React Hook]
        STATE[Component State]
        UI[UI Render]
    end
    
    DB --> ACTION
    ACTION --> HOOK
    API --> HOOK
    HOOK --> STATE
    STATE --> UI
```

### 4.2 Client-to-Server Data Flow

```mermaid
graph LR
    subgraph "Client"
        UI[User Action]
        HANDLER[Event Handler]
        OPTIMISTIC[Optimistic Update]
        ACTION[Server Action Call]
    end
    
    subgraph "Server"
        VALIDATE[Validation]
        DB[(Database)]
        RESPONSE[Response]
    end
    
    UI --> HANDLER
    HANDLER --> OPTIMISTIC
    HANDLER --> ACTION
    ACTION --> VALIDATE
    VALIDATE --> DB
    DB --> RESPONSE
    RESPONSE --> OPTIMISTIC
```

### 4.3 Streaming Data Flow

```mermaid
graph LR
    subgraph "Server"
        AI[AI Model]
        STREAM[Stream Generator]
        API[API Route]
    end
    
    subgraph "Client"
        HOOK[useChat Hook]
        HANDLER[onData Handler]
        STATE[Message State]
        UI[UI Update]
    end
    
    AI --> STREAM
    STREAM --> API
    API -->|SSE| HOOK
    HOOK --> HANDLER
    HANDLER --> STATE
    STATE --> UI
```

---

## 5. Error Handling Patterns

### 5.1 Server Action Error Handling

```typescript
// Consistent error handling pattern
export async function someAction(input: SomeInput): Promise<ActionResult> {
  try {
    // 1. Validate input
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: "Validation failed" }
    }
    
    // 2. Auth check
    const userId = await requireAuthAction()
    
    // 3. Business logic
    await doSomething(parsed.data)
    
    return { success: true }
  } catch (error) {
    // 4. Handle known errors
    if (error instanceof RateLimitError) {
      return { success: false, error: "Rate limit exceeded" }
    }
    if (error instanceof NotFoundError) {
      return { success: false, error: "Resource not found" }
    }
    
    // 5. Log unknown errors
    console.error("Action error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
```

### 5.2 Component Error Boundaries

```typescript
// Artifact error boundary pattern
export function ArtifactErrorBoundary({ children, fallback }: ArtifactErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="error-container">
          <p>Failed to render artifact</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
```

---

## Summary

| Pattern | Features Used | Purpose |
|---------|---------------|---------|
| Context + BroadcastChannel | Auth | Multi-tab state sync |
| AI SDK + SWR | Chat | Streaming + caching |
| SWR + Selector | Artifact | Optimized state reads |
| Zustand-like + localStorage | Settings | Persistent settings |
| Context + Ref | Sidebar | Optimistic updates |
| localStorage + Debounce | Input | Input persistence |
| Error Boundary | All | Error isolation |