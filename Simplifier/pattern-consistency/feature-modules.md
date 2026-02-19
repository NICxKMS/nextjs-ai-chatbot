# Feature Modules Pattern Consistency

## Overview

This document analyzes pattern consistency across feature modules, including server action patterns, schema validation patterns, component organization, and hook patterns.

---

## 1. Server Action Patterns

### 1.1 Current Pattern Analysis

#### Consistent Patterns

All server actions follow a consistent structure:

```typescript
// Pattern: "use server" directive at top
"use server"

// Pattern: Named exports for actions
export async function someAction(input: SomeInput): Promise<ActionResult> {
  // Pattern: Input validation with Zod
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Validation message" }
  }
  
  // Pattern: Auth check
  const userId = await requireAuthAction()
  
  // Pattern: Business logic in try/catch
  try {
    await doSomething(parsed.data)
    return { success: true, data: result }
  } catch (error) {
    // Pattern: Error handling
    return { success: false, error: "Error message" }
  }
}
```

#### Pattern Compliance by Feature

| Feature | "use server" | Zod Validation | Auth Check | Error Handling | Result Type |
|---------|--------------|----------------|------------|----------------|-------------|
| Auth | 3/3 | 3/3 | 2/3* | 3/3 | AuthResult |
| Chat | 8/8 | 8/8 | 8/8 | 8/8 | Various |
| Artifact | 10/10 | 10/10 | 10/10 | 10/10 | Various |
| Settings | 6/6 | 6/6 | 6/6 | 6/6 | Various |
| Sidebar | 3/3 | 3/3 | 3/3 | 3/3 | Various |

*Note: Auth actions don't require auth check (login/register are pre-auth)

### 1.2 Result Type Patterns

#### Current State: Inconsistent Result Types

```typescript
// Auth feature
interface AuthResult {
  success: boolean
  error?: string
  redirectTo?: string
}

// Chat feature - multiple result types
interface CreateChatResult { success: boolean; chatId?: string; error?: string }
interface SaveMessageResult { success: boolean; messageId?: string; error?: string }
interface StreamChatResult { success: boolean; chatId: string; error?: string; ... }

// Artifact feature
interface ArtifactResult { success: boolean; artifact?: Artifact; error?: string }

// Settings feature
interface UpdateResult { success: boolean; settings?: AppSettings; error?: string }
```

#### Recommendation: Standardize Result Types

```typescript
// Proposed: lib/types/actions.ts

// Base result for all actions
interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Specialized results extend base
interface AuthResult extends ActionResult<void> {
  redirectTo?: string
}

interface ChatResult extends ActionResult<{ chatId: string }> {}

interface ArtifactResult extends ActionResult<Artifact> {}
```

### 1.3 Redirect Pattern Consistency

#### Current Pattern: Dual Export

All auth actions export both base and redirect variants:

```typescript
// Consistent pattern across auth feature
export async function login(formData: FormData, callbackUrl?: string): Promise<AuthResult>
export async function loginWithRedirect(formData: FormData): Promise<void>

export async function logout(redirectTo?: string): Promise<AuthResult>
export async function logoutWithRedirect(redirectTo?: string): Promise<void>

export async function register(formData: FormData): Promise<AuthResult>
export async function registerWithRedirect(formData: FormData): Promise<void>
```

**Assessment**: This is a good pattern that provides flexibility. Consistent across auth feature.

---

## 2. Schema Validation Patterns

### 2.1 Schema Organization

#### Current Structure

```
features/<feature>/schemas/
  index.ts           # Barrel export
  <feature>.schema.ts # Schema definitions
```

#### Schema Naming Patterns

| Feature | Schema Naming | Consistency |
|---------|---------------|-------------|
| Auth | `loginSchema`, `registerSchema` | Good |
| Chat | `CreateChatSchema`, `MessageContentSchema` | Good |
| Artifact | `CreateArtifactSchema`, `ArtifactIdSchema` | Good |
| Input | `AttachmentSchema`, `InputStateSchema` | Good |
| Settings | `appSettingsSchema`, `userPreferencesSchema` | Good |

### 2.2 Type Export Patterns

#### Current Pattern: Dual Export

```typescript
// Pattern: Export both schema and inferred type
export const loginSchema = z.object({ ... })
export type LoginInput = z.infer<typeof loginSchema>

// Pattern: Re-export in index.ts
export { loginSchema, type LoginInput } from "./auth.schema"
```

**Assessment**: Consistent across all features. Good pattern.

### 2.3 Validation Function Patterns

#### Current State: Mixed Patterns

```typescript
// Pattern A: Schema-only validation (most common)
const parsed = schema.safeParse(input)
if (!parsed.success) {
  return { success: false, error: parsed.error.errors[0]?.message }
}

// Pattern B: Standalone validation functions (input feature)
export function validateFileSize(file: File, maxSize: number): { valid: boolean; error?: string }
export function validateFileType(file: File, allowedTypes: string[]): { valid: boolean; error?: string }
export function validateInput(value: string, attachments: Attachment[]): { valid: boolean; error?: string }
```

**Assessment**: Both patterns are appropriate for their use cases. Schema validation for server actions, standalone functions for client-side validation.

### 2.4 Schema Reuse Patterns

#### Issue: Duplicated Common Schemas

```typescript
// Chat feature
export const UUIDSchema = z.string().uuid()
export const NonEmptyStringSchema = z.string().min(1, "This field is required")

// Artifact feature
export const ArtifactUUIDSchema = z.string().uuid()
export const ArtifactNonEmptyStringSchema = z.string().min(1, "This field is required")
```

**Recommendation**: Create shared schema library.

```typescript
// Proposed: lib/schemas/common.ts
export const UUIDSchema = z.string().uuid()
export const NonEmptyStringSchema = z.string().min(1, "This field is required")
export const EmailSchema = z.string().email()
export const VisibilitySchema = z.enum(["public", "private"])
```

---

## 3. Component Organization Patterns

### 3.1 Directory Structure

#### Consistent Pattern Across Features

```
features/<feature>/components/
  index.ts              # Barrel export
  <component>.tsx       # Component files
  <subdir>/             # Sub-components (optional)
    index.ts
    <subcomponent>.tsx
```

#### Examples

```
features/chat/components/
  index.ts
  chat.tsx
  messages.tsx
  message.tsx
  message-actions.tsx
  greeting.tsx
  toolbar.tsx

features/artifact/components/
  index.ts
  artifact-panel.tsx
  artifact-actions.tsx
  editors/
    index.ts
    code-editor.tsx
    text-editor.tsx
    image-editor.tsx
    sheet-editor.tsx
```

**Assessment**: Consistent structure. Good separation of concerns.

### 3.2 Component Export Patterns

#### Current Pattern: Named Exports

```typescript
// components/index.ts
export { ComponentA } from "./component-a"
export { ComponentB } from "./component-b"
export type { ComponentAProps, ComponentBProps } from "./types"

// Usage
import { ComponentA, ComponentB } from "@/features/xxx/components"
```

**Assessment**: Consistent named exports. Good for tree-shaking.

### 3.3 Component Props Patterns

#### Current State: Mixed Patterns

```typescript
// Pattern A: Inline props (common)
export function Chat({ id, initialMessages, ... }: ChatProps) { }

// Pattern B: Destructured props object
export function ArtifactPanel(props: ArtifactPanelProps) {
  const { chatId, isReadonly, ... } = props
}

// Pattern C: Children as separate prop
export function AuthProvider({ initialSession, children }: { initialSession: AppSession | null; children: ReactNode })
```

**Recommendation**: Standardize to Pattern A for most cases.

```typescript
// Preferred pattern
export function Component({ prop1, prop2, children }: ComponentProps) {
  // ...
}
```

### 3.4 Component Documentation Patterns

#### Current Pattern: JSDoc Comments

```typescript
/**
 * Chat Component
 *
 * Main chat container component. Orchestrates the chat experience including
 * messages display, input handling, streaming state management, and settings integration.
 *
 * @module features/chat/components
 */

/**
 * Props for the Chat component
 */
export interface ChatProps {
  /** Chat ID */
  id: string
  /** Initial messages to display */
  initialMessages: ChatMessage[]
  // ...
}
```

**Assessment**: Good documentation pattern. Consistent across features.

---

## 4. Hook Patterns

### 4.1 Hook Organization

#### Current Structure

```
features/<feature>/hooks/
  index.ts           # Barrel export
  use-<name>.ts      # Hook files
  use-<name>.test.ts # Test files (co-located)
```

**Assessment**: Consistent structure. Good co-location of tests.

### 4.2 Hook Return Type Patterns

#### Current State: Consistent Pattern

```typescript
// Pattern: Export both options and return types
export interface UseChatOptions {
  chatId: string
  initialMessages?: ChatMessage[]
  model: string
  // ...
}

export interface UseChatReturn {
  messages: ChatMessage[]
  sendMessage: (message: { content: string }) => Promise<void>
  status: "ready" | "streaming" | "error"
  // ...
}

export function useChat(options: UseChatOptions): UseChatReturn {
  // ...
}
```

**Assessment**: Excellent pattern. Consistent across all features.

### 4.3 Hook Naming Patterns

| Feature | Hook Names | Pattern |
|---------|------------|---------|
| Auth | `useAuth`, `useAuthState` | `use` + Feature/State |
| Chat | `useChat`, `useMessages`, `useDataStream` | `use` + Entity |
| Artifact | `useArtifact`, `useArtifactSelector` | `use` + Entity |
| Input | `useInput`, `useFileUpload` | `use` + Entity |
| Settings | `useSettings`, `useAppSettings`, `useTheme`, `useModelSelection` | `use` + Entity |
| Sidebar | `useSidebarState`, `useOptimisticChats` | `use` + Entity |

**Assessment**: Consistent naming. Clear and descriptive.

### 4.4 Hook Implementation Patterns

#### Pattern A: Context Consumer

```typescript
// Auth, Artifact, Sidebar
function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
```

#### Pattern B: SWR-based State

```typescript
// Artifact
function useArtifact() {
  const { data, mutate } = useSWR<UIArtifact>("artifact", null, {
    fallbackData: initialArtifactData,
  })
  // ...
}
```

#### Pattern C: AI SDK Wrapper

```typescript
// Chat
function useChat(options: UseChatOptions): UseChatReturn {
  const chat = useAIChat({
    id: options.chatId,
    messages: options.initialMessages,
    // ...
  })
  // ...
}
```

#### Pattern D: Server Action Integration

```typescript
// Settings
function useSettings(): SettingsContextValue {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  
  useEffect(() => {
    getPreferences().then(setPreferences)
  }, [])
  
  const updatePreference = useCallback(async (key, value) => {
    await updatePreferences({ [key]: value })
    setPreferences(prev => ({ ...prev, [key]: value }))
  }, [])
  
  return { preferences, updatePreference, ... }
}
```

**Assessment**: Each pattern is appropriate for its use case. Good variety.

---

## 5. Barrel Export Patterns

### 5.1 Index.ts Structure

#### Consistent Pattern

```typescript
// features/<feature>/index.ts

// =============================================================================
// Section Header
// =============================================================================

export { ItemA, ItemB } from "./submodule"

// =============================================================================
// Types
// =============================================================================

export type { TypeA, TypeB } from "./types"
```

**Assessment**: Consistent section organization. Good documentation.

### 5.2 Export Categories

All features export from consistent categories:

| Category | Auth | Chat | Artifact | Input | Settings | Sidebar |
|----------|------|------|----------|-------|----------|---------|
| Components | 3 | 10 | 4 | 5 | 5 | 6 |
| Hooks | 2 | 7 | 2 | 3 | 4 | 2 |
| Actions | 6 | 8 | 10 | 0 | 6 | 3 |
| Schemas | 4 | 10+ | 15+ | 6 | 8 | 0 |
| Types | 10+ | 10+ | 10+ | 10+ | 10+ | 10+ |

---

## 6. Error Handling Patterns

### 6.1 Server Action Error Handling

#### Consistent Pattern

```typescript
try {
  // Business logic
  return { success: true, data: result }
} catch (error) {
  // Known error handling
  if (error instanceof SpecificError) {
    return { success: false, error: "Specific message" }
  }
  
  // Unknown error
  console.error("Action error:", error)
  return { success: false, error: "An unexpected error occurred" }
}
```

**Assessment**: Consistent pattern. Good error logging.

### 6.2 Client-Side Error Handling

#### Pattern: Error State in Hooks

```typescript
function useSettings() {
  const [error, setError] = useState<string | null>(null)
  
  const updatePreference = useCallback(async (key, value) => {
    try {
      const result = await updatePreferences({ [key]: value })
      if (!result.success) {
        setError(result.error ?? "Failed to update")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }, [])
  
  return { error, updatePreference, ... }
}
```

**Assessment**: Consistent error state management.

---

## 7. State Management Patterns

### 7.1 Pattern Distribution

| Pattern | Features | Use Case |
|---------|----------|----------|
| React Context | Auth, Sidebar | Global state with provider |
| SWR | Artifact, Chat (votes) | Client-side cache |
| AI SDK | Chat | Streaming state |
| useState + localStorage | Input, Settings | Persistent local state |
| Zustand-like | Settings | Complex state with actions |

### 7.2 State Persistence Patterns

#### localStorage Persistence

```typescript
// Input feature
const [localStorageInput, setLocalStorageInput] = useLocalStorage(`input-${chatId}`, "", {
  initializeWithValue: false,
})

// Settings feature
const savedModel = localStorage.getItem("selectedModel")
```

#### Server Persistence

```typescript
// Settings feature
const result = await updatePreferences({ [key]: value })
```

---

## 8. Recommendations

### 8.1 High Priority

1. **Create shared schema library** - Eliminates UUID/visibility duplication
2. **Standardize result types** - Create `ActionResult<T>` base type
3. **Standardize component props pattern** - Prefer destructured props in function signature

### 8.2 Medium Priority

4. **Document hook patterns** - Add pattern guide to AGENTS.md
5. **Create error type hierarchy** - Standardize error handling across features

### 8.3 Low Priority

6. **Audit barrel exports** - Ensure all exports are used
7. **Add component documentation template** - Standardize JSDoc format

---

## 9. Pattern Compliance Summary

| Category | Score | Notes |
|----------|-------|-------|
| Server Actions | 95% | Excellent consistency |
| Schema Validation | 85% | Good, some duplication |
| Component Organization | 90% | Good structure |
| Hook Patterns | 95% | Excellent patterns |
| Barrel Exports | 100% | Perfect consistency |
| Error Handling | 90% | Good patterns |
| State Management | 85% | Appropriate variety |

**Overall Score: 91%** - Excellent pattern consistency with minor improvements needed in schema deduplication and result type standardization.