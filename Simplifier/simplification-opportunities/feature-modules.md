# Feature Modules Simplification Opportunities

## Overview

This document identifies simplification opportunities across feature modules, including duplicate code, over-engineered abstractions, and potential consolidations.

---

## 1. Duplicate Code Analysis

### 1.1 Schema Duplication

#### UUID Schema Duplication

**Problem**: UUID validation is defined in multiple features with identical patterns.

```typescript
// features/chat/schemas/chat.schema.ts
export const UUIDSchema = z.string().uuid()

// features/artifact/schemas/artifact.schema.ts
export const ArtifactUUIDSchema = z.string().uuid()

// Both are identical - just different names
```

**Recommendation**: Create a shared schema utilities file.

```typescript
// Proposed: lib/schemas/common.ts
export const UUIDSchema = z.string().uuid()
export const NonEmptyStringSchema = z.string().min(1, "This field is required")

// Usage in features
import { UUIDSchema } from "@/lib/schemas/common"
```

**Impact**: Reduces 3 duplicate definitions across features.

---

#### Visibility Schema Duplication

**Problem**: Visibility enum is defined in multiple places.

```typescript
// features/chat/schemas/chat.schema.ts
export const VisibilitySchema = z.enum(["public", "private"])

// features/chat/types.ts (as type)
export type VisibilityType = "public" | "private"

// features/artifact/schemas/artifact.schema.ts
// Uses same concept for artifact visibility
```

**Recommendation**: Define once in shared types.

```typescript
// Proposed: lib/types/common.ts
export const VisibilitySchema = z.enum(["public", "private"])
export type Visibility = z.infer<typeof VisibilitySchema>
```

---

### 1.2 Type Duplication

#### ArtifactKind Duplication

**Problem**: `ArtifactKind` type is defined in both chat and artifact features.

```typescript
// features/chat/types.ts
export type ArtifactKind = "text" | "code" | "image" | "sheet"

// features/artifact/types.ts
export type ArtifactKind = "text" | "code" | "image" | "sheet"

// features/artifact/schemas/artifact.schema.ts
export const ArtifactKindSchema = z.enum(["text", "code", "image", "sheet"])
```

**Recommendation**: Single source of truth in artifact feature, re-exported by chat.

```typescript
// features/artifact/types.ts (keep)
export type ArtifactKind = "text" | "code" | "image" | "sheet"

// features/chat/types.ts (change to re-export)
export type { ArtifactKind } from "@/features/artifact/types"
```

---

#### Attachment Type Duplication

**Problem**: Attachment types are defined in both chat and input features.

```typescript
// features/chat/types.ts
export interface Attachment {
  name: string
  url: string
  contentType: string
}

// features/input/types.ts
export interface InputAttachment extends Attachment {
  id: string
  type: AttachmentType
  status: AttachmentStatus
  uploadProgress?: number
  previewUrl?: string
}
```

**Analysis**: This is intentional extension, not duplication. `InputAttachment` extends `Attachment` with upload-specific fields. This is a good pattern.

---

### 1.3 Default Values Duplication

#### Default Settings Duplication

**Problem**: Default settings are defined in multiple places.

```typescript
// features/settings/types.ts
export const DEFAULT_PREFERENCES: UserPreferences = { ... }
export const DEFAULT_SAMPLING: SamplingSettings = { ... }
export const DEFAULT_APP_SETTINGS: AppSettings = { ... }

// features/settings/hooks/use-settings.ts
export { DEFAULT_PREFERENCES, DEFAULT_APP_SETTINGS }

// features/settings/index.ts
export { DEFAULT_APP_SETTINGS } from "./components"
```

**Recommendation**: Consolidate to single export location.

```typescript
// features/settings/constants.ts (new file)
export const DEFAULT_PREFERENCES: UserPreferences = { ... }
export const DEFAULT_SAMPLING: SamplingSettings = { ... }
export const DEFAULT_APP_SETTINGS: AppSettings = { ... }

// features/settings/index.ts
export * from "./constants"
```

---

## 2. Over-Engineered Abstractions

### 2.1 Auth Provider Complexity

**Problem**: `AuthProvider` has 424 lines with multiple concerns.

```typescript
// features/auth/components/auth-provider.tsx (current)
export function AuthProvider({ initialSession, children }) {
  // 1. Session state (lines 85-91)
  // 2. BroadcastChannel setup (lines 110-174)
  // 3. Storage event fallback (lines 180-233)
  // 4. Broadcast auth changes (lines 240-290)
  // 5. Guest session bootstrap (lines 299-338)
  // 6. Window focus sync (lines 345-365)
  // 7. Context value (lines 380-389)
}
```

**Recommendation**: Extract into custom hooks.

```typescript
// Proposed refactoring
export function AuthProvider({ initialSession, children }) {
  const [session, setSession] = useState(initialSession)
  const [isNewSession, setIsNewSession] = useState(false)
  
  // Extract to custom hooks
  useAuthBroadcastChannel({ session, setSession })
  useAuthStorageSync({ session, setSession })
  useAuthGuestBootstrap({ session, setSession, setIsNewSession })
  useAuthWindowFocus({ setSession })
  
  const value = useMemo(() => ({
    session,
    status: session ? "authenticated" : "unauthenticated",
    isNewSession,
    setSession,
    clearNewSessionFlag: () => setIsNewSession(false),
  }), [session, isNewSession])
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// New hooks
function useAuthBroadcastChannel({ session, setSession }) {
  useEffect(() => {
    const channel = new BroadcastChannel("auth-state-channel")
    channel.onmessage = (event) => { /* ... */ }
    return () => channel.close()
  }, [])
}

function useAuthGuestBootstrap({ session, setSession, setIsNewSession }) {
  useEffect(() => {
    if (session) return
    // Bootstrap guest session
  }, [session])
}
```

**Benefits**:
- Each hook has single responsibility
- Easier to test individually
- Reduces main component from 424 to ~50 lines

---

### 2.2 Chat Component Complexity

**Problem**: `Chat` component has 538 lines with multiple concerns.

```typescript
// features/chat/components/chat.tsx (current structure)
export function Chat(props) {
  // 1. Multiple hooks imports (lines 15-29)
  // 2. State declarations (lines 147-175)
  // 3. Effects for model sync (lines 181-221)
  // 4. Adaptive throttle calculation (lines 241-256)
  // 5. useChat configuration (lines 262-358)
  // 6. SWR for votes (lines 402-411)
  // 7. Render logic (lines 423-534)
}
```

**Recommendation**: Extract into smaller components and hooks.

```typescript
// Proposed refactoring
export function Chat(props) {
  const { chatId, initialMessages, ... } = props
  
  // Extract to custom hook
  const chatState = useChatState({ chatId, initialMessages, ... })
  
  return (
    <div className="chat-container">
      <ChatHeader 
        modelId={chatState.modelId}
        onModelChange={chatState.handleModelChange}
        messageCount={chatState.messages.length}
      />
      <Messages 
        messages={chatState.messages}
        status={chatState.status}
        {...otherProps}
      />
      <ChatInput
        input={chatState.input}
        onSend={chatState.sendMessage}
        disabled={chatState.isStreaming}
      />
    </div>
  )
}

// New hook
function useChatState(options) {
  const [modelId, setModelId] = useState(options.initialChatModel)
  const adaptiveThrottle = useAdaptiveThrottle()
  
  const chat = useAIChat({
    id: options.chatId,
    messages: options.initialMessages,
    experimental_throttle: adaptiveThrottle,
    transport: createChatTransport(modelId, options.visibilityType),
    onData: handleStreamData,
  })
  
  return {
    messages: chat.messages,
    modelId,
    handleModelChange: (id) => setModelId(id),
    sendMessage: chat.sendMessage,
    status: chat.status,
    // ... other state
  }
}
```

---

### 2.3 Settings Hook Duplication

**Problem**: Multiple similar hooks in settings with repeated patterns.

```typescript
// features/settings/hooks/use-settings.ts

// useSettings - 136 lines
export function useSettings() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => { /* load */ }, [])
  
  const updatePreference = useCallback(async (key, value) => {
    setIsUpdating(true)
    setPreferences(prev => ({ ...prev, [key]: value })) // optimistic
    const result = await updatePreferences({ [key]: value })
    // handle result
  }, [])
}

// useAppSettings - 97 lines (same pattern)
export function useAppSettings() {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState(null)
  
  // Same pattern...
}
```

**Recommendation**: Create a generic settings hook factory.

```typescript
// Proposed: features/settings/hooks/use-async-state.ts
function useAsyncState<T>(options: {
  defaultValue: T
  loader: () => Promise<T>
  updater: (updates: Partial<T>) => Promise<{ success: boolean; data?: T; error?: string }>
}) {
  const [data, setData] = useState(options.defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    options.loader().then(setData).catch(setError).finally(() => setIsLoading(false))
  }, [])
  
  const update = useCallback(async (updates: Partial<T>) => {
    setIsUpdating(true)
    setData(prev => ({ ...prev, ...updates })) // optimistic
    const result = await options.updater(updates)
    if (!result.success) setError(result.error)
    else if (result.data) setData(result.data)
    setIsUpdating(false)
  }, [])
  
  return { data, isLoading, isUpdating, error, update }
}

// Usage
export function useSettings() {
  return useAsyncState({
    defaultValue: DEFAULT_PREFERENCES,
    loader: getPreferences,
    updater: updatePreferences,
  })
}
```

**Benefits**: Reduces ~200 lines of duplicated state management code.

---

## 3. Feature Consolidation Opportunities

### 3.1 Chat + Artifact Tool Integration

**Current State**: Chat tools for artifacts are in chat feature but create artifact entities.

```
features/chat/lib/tools/
  create-document.tool.ts  -> calls artifact actions
  update-document.tool.ts  -> calls artifact actions
  suggestions.tool.ts      -> calls artifact actions
```

**Analysis**: This is appropriate separation - tools are chat-specific orchestration that uses artifact feature's public API. No consolidation needed.

---

### 3.2 Input + Chat Integration

**Current State**: Input feature provides `MultimodalInput` component used by Chat.

**Potential Issue**: Chat component has inline input handling (lines 474-531).

```typescript
// features/chat/components/chat.tsx (lines 474-531)
<textarea
  className="min-h-[60px] flex-1..."
  disabled={status === "submitted" || status === "streaming"}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        sendMessage({ role: "user", parts: [{ type: "text", text: input }] })
        setInput("")
      }
    }
  }}
  placeholder="Type a message..."
  value={input}
/>
```

**Recommendation**: Replace with `MultimodalInput` from input feature.

```typescript
// Proposed
import { MultimodalInput } from "@/features/input"

export function Chat(props) {
  // ... existing logic
  
  return (
    <div className="chat-container">
      <Messages ... />
      {!isReadonly && (
        <MultimodalInput
          chatId={chatId}
          onSubmit={handleInputSubmit}
          disabled={status === "submitted" || status === "streaming"}
          suggestedActions={suggestedActions}
        />
      )}
    </div>
  )
}
```

**Benefits**:
- Removes 60+ lines of inline input handling
- Gains file attachment support
- Gains suggested actions support
- Consistent input behavior across app

---

### 3.3 Sidebar + Chat History Actions

**Current State**: Both sidebar and chat features have history-related actions.

```typescript
// features/sidebar/actions/get-history.action.ts
export async function getChatHistory(input: GetHistoryInput): Promise<GetHistoryResult>

// features/chat/actions/get-history.action.ts
export async function getHistoryAction(input: GetHistoryInput): Promise<GetHistoryResult>
```

**Analysis**: These appear to be duplicates or near-duplicates.

**Recommendation**: Consolidate to chat feature, re-export from sidebar.

```typescript
// features/chat/actions/get-history.action.ts (keep)
export async function getHistoryAction(input: GetHistoryInput): Promise<GetHistoryResult>

// features/sidebar/actions/get-history.action.ts (change to re-export)
export { getHistoryAction as getChatHistory } from "@/features/chat/actions"
```

---

## 4. Dead Code Detection

### 4.1 Unused Exports

**Potential Issue**: Some exports may not be used externally.

```typescript
// features/chat/index.ts exports many types
export type {
  AppUsage,
  ArtifactKind,
  Attachment,
  ChatMessage,
  CustomUIDataTypes,
  DocumentOutput,
  MessageMetadata,
  StreamingSuggestion,
  SuggestionOutput,
  UserVote,
  WeatherOutput,
} from "./types"
```

**Recommendation**: Audit exports to ensure they're used. Consider using a tool like `ts-prune` to detect unused exports.

---

### 4.2 Duplicate Action Variants

**Problem**: Actions have `withRedirect` variants that add minimal value.

```typescript
// features/auth/actions/login.action.ts
export async function login(formData: FormData, callbackUrl?: string): Promise<AuthResult>
export async function loginWithRedirect(formData: FormData): Promise<void>

// features/auth/actions/logout.action.ts
export async function logout(redirectTo?: string): Promise<AuthResult>
export async function logoutWithRedirect(redirectTo?: string): Promise<void>

// features/auth/actions/register.action.ts
export async function register(formData: FormData): Promise<AuthResult>
export async function registerWithRedirect(formData: FormData): Promise<void>
```

**Analysis**: The `withRedirect` variants are thin wrappers that call the base action and redirect.

```typescript
export async function loginWithRedirect(formData: FormData): Promise<void> {
  const result = await login(formData)
  if (result.success && result.redirectTo) {
    redirect(result.redirectTo)
  }
}
```

**Recommendation**: Keep both patterns - they serve different use cases:
- Base action: For programmatic use with custom handling
- WithRedirect: For form actions that need automatic redirect

However, document this pattern clearly in code comments.

---

## 5. Complexity Reduction Opportunities

### 5.1 Reduce Chat Component Size

| Metric | Current | Target |
|--------|---------|--------|
| Lines of code | 538 | ~150 |
| State variables | 8 | 3 (in hook) |
| Effects | 6 | 2 (in hook) |
| Callbacks | 3 | 1 (in hook) |

### 5.2 Reduce Auth Provider Size

| Metric | Current | Target |
|--------|---------|--------|
| Lines of code | 424 | ~50 |
| Effects | 5 | 0 (extracted to hooks) |
| Concerns | 6 | 1 (context provider) |

### 5.3 Consolidate Settings Hooks

| Metric | Current | Target |
|--------|---------|--------|
| Total lines | ~400 | ~150 |
| Duplicate patterns | 3 | 0 |
| Hook count | 4 | 4 (but shared base) |

---

## 6. Recommended Actions

### High Priority

1. **Replace inline Chat input with MultimodalInput** - Reduces code, gains features
2. **Extract AuthProvider hooks** - Improves testability and readability
3. **Create shared schema utilities** - Eliminates UUID/visibility duplication

### Medium Priority

4. **Create generic settings hook factory** - Reduces duplicate state management
5. **Consolidate history actions** - Single source of truth
6. **Extract Chat state to custom hook** - Reduces component complexity

### Low Priority

7. **Audit unused exports** - Clean up barrel exports
8. **Document withRedirect pattern** - Clarify intent

---

## Summary

| Category | Count | Estimated Lines Saved |
|----------|-------|----------------------|
| Schema Duplication | 3 | ~30 |
| Type Duplication | 2 | ~10 |
| Over-Engineering | 3 | ~400 |
| Feature Consolidation | 2 | ~80 |
| Dead Code | 2 | ~20 |
| **Total** | **12** | **~540** |

The largest opportunities are in extracting complex component logic into custom hooks and replacing inline implementations with feature module components.