# State Management — State Topology & Provider Design

> Complete state management architecture: every piece of state, its owner,  
> pattern, scope, and the provider tree design.  
> Addresses: CRITICAL-2, III-1, III-2, IV-2, IV-5, V-1, V-3, V-5, VI-1, VI-2, VI-5, VI-6

---

## Design Principles

1. **Server-first**: Fetch data in server components. Client state is for interactivity only.
2. **Scope tightly**: Every provider wraps only the components that consume it.
3. **Siblings, not nested**: Unrelated providers are siblings when possible.
4. **No SWR-as-state-store**: SWR is for server data fetching only (Constraint 9).
5. **`useSyncExternalStore` for client state**: Settings, artifact state — no provider overhead.
6. **No window.dispatchEvent**: All cross-feature communication goes through typed APIs (Constraint 10).
7. **Revalidation after every mutation**: `updateTag`/`revalidateTag` alongside optimistic updates.

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
| Data stream | `ChatStreamProvider` | React Context (split) | Client | Chat page | ~10-20/sec during streaming |
| Votes | `useOptimistic` | React 19 optimistic | Client | Per-message | Per vote action (rare) |
| Visibility | Server-fetched + `useOptimistic` | React 19 optimistic | Client | Per-chat | Per toggle action (rare) |
| Auth session | `SessionProvider` | React Context | Client | Entire app | On login/logout |
| Sidebar open/close | `SidebarProvider` | React Context (shadcn) | Client | Chat layout | Per toggle (rare) |
| Theme | `ThemeProvider` | React Context (next-themes) | Client | Entire app | Per toggle (rare) |
| Scroll position | `useRef` | Ref (no re-renders) | Client | Messages | Per scroll/mutation |
| Model selection | Cookie + localStorage | Persisted state | Both | Per-session | Per model change |

---

## Provider Tree — Redesigned

### The Problem: Nested Providers for Unrelated Concerns

The old plan nested 8+ providers, causing:
- Settings changes re-render through ChatStream, PendingChats, Sidebar
- ChatStream deltas (10-20Hz) propagate through 5+ provider levels
- Sidebar components subscribe to contexts they never read

**Fixes:** I-4, V-3, V-5, VI-3

### The Solution: Scoped + Flat Provider Architecture

```
Root layout (SERVER):
  ┌─────────────────────────────────────────────┐
  │ ThemeProvider                                │ Level 1 — app-wide
  │   └── SessionProvider(session)                  │ Level 2 — app-wide
  │         └── {children}                       │
  └─────────────────────────────────────────────┘

Chat layout (SERVER):
  ┌─────────────────────────────────────────────┐
  │ SidebarProvider(defaultOpen)                 │ Level 3 — chat layout
  │   ├── Sidebar content                        │
  │   └── SidebarInset                           │
  │         └── PendingChatsProvider          │ Level 4 — chat layout
  │               └── {children}                 │
  └─────────────────────────────────────────────┘

Chat page (inside {children}):
  ┌─────────────────────────────────────────────┐
  │ SettingsProvider                              │ Level 5 — page only
  │   └── ChatStreamProvider                     │ Level 6 — page only
  │         ├── ChatShell                         │
  │         │   └── ChatSessionContext (inline, level 7) │
  │         │         ├── ChatHeader              │
  │         │         ├── Messages                │
  │         │         ├── MultimodalInput          │
  │         │         └── ArtifactPanel           │
  │         ├── StreamBridge                 │
  │         └── VoteResolver                      │
  └─────────────────────────────────────────────┘
```

### Provider Isolation Analysis

| Context Change | Cascade Reaches | Does NOT Reach |
|---------------|-----------------|---------------|
| Theme toggle | All components | — (expected, rare) |
| Auth change | All components | — (expected, rare) |
| Sidebar toggle | Sidebar + layout | Chat page content |
| PendingChats update | Sidebar + chat pages | Root providers |
| **Settings change** | **Chat page only** | **Sidebar, root** |
| **ChatStream delta** | **Chat page only** | **Sidebar, root** |
| ChatSessionContext update | Chat children only | Sidebar, root |

**Key improvement:** Settings and ChatStream changes no longer cascade to the sidebar. The sidebar sees at most 4 context levels (Theme → Auth → Sidebar → PendingChats).

---

## State Pattern Details

### 1. Artifact State — `useSyncExternalStore`

**Replaces:** SWR with synthetic key `"artifact"` (no fetcher)

**Why replace:** SWR triggers all 5+ subscribers on every mutation. During streaming with deltas at 10-20Hz, this produces ~50-100 unnecessary re-renders/sec. `useSyncExternalStore` with selectors re-renders only when the selected slice changes.

**Fixes:** III-1, VI-1, VI-2, IV-5

```typescript
// features/artifacts/lib/artifact-store.ts
import { useSyncExternalStore } from 'react'
import type { UIArtifact, ArtifactKind } from '@/features/artifacts/types/artifact.types'

// ─── Initial state ───────────────────────────────────────────
const INITIAL_ARTIFACT: UIArtifact = {
  artifactId: '',
  title: '',
  kind: 'text' as ArtifactKind,
  content: '',
  isVisible: false,
  status: 'idle',
}

// ─── Module-level store ──────────────────────────────────────
let state: UIArtifact = INITIAL_ARTIFACT
const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

export const artifactStore = {
  getSnapshot(): UIArtifact {
    return state
  },

  getServerSnapshot(): UIArtifact {
    return INITIAL_ARTIFACT
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  setState(updater: UIArtifact | ((prev: UIArtifact) => UIArtifact)): void {
    const next = typeof updater === 'function' ? updater(state) : updater
    if (next === state) return // Referential equality check
    state = next
    emitChange()
  },

  reset(): void {
    state = INITIAL_ARTIFACT
    emitChange()
  },
}

// ─── Hooks ───────────────────────────────────────────────────

/** Full artifact state — re-renders on ANY change */
export function useArtifact() {
  const artifact = useSyncExternalStore(
    artifactStore.subscribe,
    artifactStore.getSnapshot,
    artifactStore.getServerSnapshot,
  )
  return { artifact, setArtifact: artifactStore.setState }
}

/** Selector — re-renders ONLY when selected slice changes */
export function useArtifactSelector<T>(selector: (s: UIArtifact) => T): T {
  return useSyncExternalStore(
    artifactStore.subscribe,
    () => selector(artifactStore.getSnapshot()),
    () => selector(artifactStore.getServerSnapshot()),
  )
}
```

**Re-render comparison:**

| Component | SWR (before) | useSyncExternalStore (after) |
|-----------|-------------|------------------------------|
| ArtifactPanel (reads `.content`) | Every delta (~10-20/sec) | Every delta (~10-20/sec) — **necessary** |
| ArtifactCloseButton (`s => s.isVisible`) | Every delta (~10-20/sec) | Only visibility change (~2-3/session) |
| ArtifactPreview (`s => s.artifactId`) | Every delta (~10-20/sec) | Only artifactId change (~1/artifact) |
| VersionFooter (`s => s.artifactId`) | Every delta (~10-20/sec) | Only artifactId change (~1/artifact) |
| **Total re-renders per delta** | **~5 components** | **~1 component** |

**Estimated reduction: ~80% fewer re-renders during streaming.**

**Bundle impact:** SWR (~12KB gzipped) may be removable if all SWR-as-state uses are migrated. SWR is retained for legitimate fetcher-backed uses (sidebar pagination, artifact version fetching). Evaluate full removal post-migration.

---

### 2. Settings — `useSyncExternalStore` + localStorage

**Pattern:** Already validated in the old plan. This redesign confirms it as the correct approach — no provider needed.

```typescript
// features/settings/hooks/use-settings.ts
import { useSyncExternalStore } from 'react'

export interface SettingsState {
  temperature: number
  topP: number
  maxOutputTokens: number
  systemPrompt: string
  enableReasoning: boolean
}

const DEFAULTS: SettingsState = {
  temperature: 0.7,
  topP: 1,
  maxOutputTokens: 4096,
  systemPrompt: '',
  enableReasoning: false,
}

const STORAGE_KEY = 'chat-settings'
let state: SettingsState = DEFAULTS
const listeners = new Set<() => void>()

// Initialize from localStorage (client-only)
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) state = { ...DEFAULTS, ...JSON.parse(stored) }
  } catch { /* use defaults */ }
}

function emitChange() {
  for (const listener of listeners) listener()
}

export const settingsStore = {
  getSnapshot: () => state,
  getServerSnapshot: () => DEFAULTS,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    // Cross-tab sync
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        state = { ...DEFAULTS, ...JSON.parse(e.newValue) }
        emitChange()
      }
    }
    window.addEventListener('storage', handler)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', handler)
    }
  },
  setState: (updater: Partial<SettingsState>) => {
    state = { ...state, ...updater }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    emitChange()
  },
  reset: () => {
    state = DEFAULTS
    localStorage.removeItem(STORAGE_KEY)
    emitChange()
  },
}

export function useSettings(): SettingsState {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getServerSnapshot,
  )
}

export function useSettingsSetter() {
  return settingsStore.setState
}
```

**Why no `SettingsProvider` needed?** The store is module-level. Any component can import `useSettings()` directly. A provider wrapper is optional (for organizational clarity in the component tree) but technically unnecessary.

**If `SettingsProvider` IS used:** It's a thin wrapper that renders `{children}` and exists purely for the visual hierarchy in the component tree. It adds zero React context overhead:

```tsx
// Optional wrapper — for tree clarity only
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

---

### 3. PendingChats — React Context

**Purpose:** Manage optimistic UI for chat creation, deletion, and title updates in the sidebar.

**Scope:** Chat layout (both sidebar and chat pages need access)

**Why a Context and not useSyncExternalStore?** The PendingChats state is consumed by exactly two features (sidebar + chat) and needs to merge with server-fetched data. Context provides a cleaner component-tree-scoped API for this.

**Fixes:** IV-2 (single communication channel — removes window.dispatchEvent), III-2

```typescript
// lib/types/pending-chats.types.ts
export interface PendingChat {
  id: string
  title: string
  visibility: 'public' | 'private'
  createdAt: Date
  isOptimistic: boolean
}

export interface PendingChatOperations {
  add(chat: Omit<PendingChat, 'isOptimistic'>): void
  remove(id: string): void
  updateTitle(id: string, title: string): void
  markConfirmed(id: string): void
}
```

```typescript
// features/sidebar/hooks/use-pending-chats.tsx
'use client'

import { createContext, useCallback, useContext, useState, useRef } from 'react'
import type {
  PendingChat,
  PendingChatOperations,
} from '@/lib/types/pending-chats.types'

interface PendingChatsContextValue extends PendingChatOperations {
  entries: PendingChat[]
}

const PendingChatsContext = createContext<PendingChatsContextValue | null>(null)

export function PendingChatsProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<PendingChat[]>([])
  const seenIds = useRef(new Set<string>())

  const add = useCallback((chat: Omit<PendingChat, 'isOptimistic'>) => {
    if (seenIds.current.has(chat.id)) return // Dedup
    seenIds.current.add(chat.id)
    setEntries(prev => [{ ...chat, isOptimistic: true }, ...prev])
  }, [])

  const remove = useCallback((id: string) => {
    seenIds.current.delete(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateTitle = useCallback((id: string, title: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, title } : e))
  }, [])

  const markConfirmed = useCallback((id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, isOptimistic: false } : e))
  }, [])

  return (
    <PendingChatsContext.Provider value={{ entries, add, remove, updateTitle, markConfirmed }}>
      {children}
    </PendingChatsContext.Provider>
  )
}

export function usePendingChats(): PendingChatsContextValue {
  const ctx = useContext(PendingChatsContext)
  if (!ctx) throw new Error('usePendingChats must be used within PendingChatsProvider')
  return ctx
}
```

**Title flow (single-channel, replaces 3-channel):**

```
1. Server: stream-chat.ts awaits title → writes data-chatTitle before stream close
2. Client: useChatSession.onData receives data-chatTitle
3. Client: calls PendingChats.updateTitle(chatId, title)
4. Client: SidebarHistoryClient reads optimistic entries → renders title
(No polling. No window events. One typed API.)
```

---

### 4. ChatStream — Split React Context (page-scoped)

**Purpose:** Receive SSE data parts from `useChat` and distribute to consumers (StreamBridge, status readers).

**Pattern:** Split state/dispatch contexts prevent unnecessary re-renders.

**Scope:** Chat page only (NOT layout — this is the critical change from the old plan).

**Fixes:** V-5 (high-frequency cascades to sidebar), III-3 (scope too wide)

```typescript
// features/chat/components/chat-stream-provider.tsx
'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { DataPart } from '@/features/chat/types/chat.types'

// ─── Split contexts ──────────────────────────────────────────
interface ChatStreamState {
  ChatStream: DataPart[]
}

interface ChatStreamDispatch {
  setChatStream: (updater: DataPart[] | ((prev: DataPart[]) => DataPart[])) => void
}

const StateContext = createContext<ChatStreamState | null>(null)
const DispatchContext = createContext<ChatStreamDispatch | null>(null)

// ─── Provider ────────────────────────────────────────────────
export function ChatStreamProvider({ children }: { children: React.ReactNode }) {
  const [ChatStream, setChatStreamRaw] = useState<DataPart[]>([])

  // RAF batching for high-frequency updates
  const pendingRef = useRef<DataPart[]>([])
  const rafRef = useRef<number | null>(null)

  const setChatStream = useCallback((updater: DataPart[] | ((prev: DataPart[]) => DataPart[])) => {
    if (typeof updater === 'function') {
      // Direct update (reset, etc.)
      setChatStreamRaw(updater)
      return
    }
    // Batch individual pushes
    pendingRef.current.push(...updater)
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        const batch = pendingRef.current
        pendingRef.current = []
        rafRef.current = null
        setChatStreamRaw(prev => [...prev, ...batch])
      })
    }
  }, [])

  return (
    <DispatchContext.Provider value={{ setChatStream }}>
      <StateContext.Provider value={{ ChatStream }}>
        {children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  )
}

// ─── Hooks ───────────────────────────────────────────────────
export function useChatStream(): ChatStreamState {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useChatStream requires ChatStreamProvider')
  return ctx
}

export function useChatStreamDispatch(): ChatStreamDispatch {
  const ctx = useContext(DispatchContext)
  if (!ctx) throw new Error('useChatStreamDispatch requires ChatStreamProvider')
  return ctx
}
```

**Split context benefit:**
- Components that only write (useChatSession's onData) use `useChatStreamDispatch` → no re-render on state change
- Components that only read (StreamBridge) use `useChatStream` → re-render on new deltas (necessary)
- RAF batching coalesces ~200 SSE deltas/sec to ~60 React updates/sec (display refresh rate)

**Fixes:** V-5 (batching reduces re-render frequency by ~70% during peak streaming)

---

### 5. ChatSessionContext — Page-Scoped Inline Context

**Purpose:** Share `useChat`-derived state between ChatShell's children without prop drilling.

**Pattern:** Inline context provider (not a separate file-level provider).

**Scope:** ChatShell subtree only.

**Fixes:** CRITICAL-2, V-1 (15-16 props → 2-4 props per child)

```typescript
// features/chat/hooks/use-chat-session-context.ts
'use client'

import { createContext, useContext } from 'react'
import type { ChatSessionValue } from '@/features/chat/types/chat.types'

export const ChatSessionContext = createContext<ChatSessionValue | null>(null)

export function useChatSessionContext(): ChatSessionValue {
  const ctx = useContext(ChatSessionContext)
  if (!ctx) throw new Error('useChatSessionContext must be used within ChatShell')
  return ctx
}
```

```typescript
// features/chat/types/chat.types.ts
import type { Message, Attachment } from 'ai'

export interface ChatSessionValue {
  // Identity
  chatId: string
  chatModel: string
  isReadonly: boolean

  // Message state
  messages: Message[]
  status: 'idle' | 'submitted' | 'streaming' | 'error' | 'ready'

  // Input state
  input: string
  setInput: (input: string) => void
  attachments: Attachment[]
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>

  // Intent-based actions
  sendMessage: (event?: { preventDefault?: () => void }) => void
  stop: () => void
  appendMessage: (message: Message) => void
  editMessage: (messageId: string, newContent: string) => Promise<void>

  // Error state
  error: Error | null
  clearError: () => void
}
```

**Intent-based vs setter-based actions:**

| Before (setter props) | After (intent-based) | Encapsulates |
|----------------------|---------------------|-------------|
| `setMessages` + `regenerate` | `editMessage(id, content)` | Delete trailing → update messages → regenerate |
| `handleSubmit` + `setInput` + `setAttachments` | `sendMessage()` | Validate → optimistic chat create → submit |
| `stop` | `stop()` | abort controller → clear attachment state |

**Fixes:** V-4 (setter props as implicit RPC)

---

### 6. Votes — Server Action + `useOptimistic`

**Replaces:** SWR `PATCH /api/vote` with optimistic mutate

**Why:** Voting is a user-triggered mutation — Server Action with `useOptimistic` (React 19) is the idiomatic pattern. Eliminates one SWR cache entry per chat.

**Fixes:** VII-5

```typescript
// features/voting/actions/vote.ts
'use server'

import { z } from 'zod'
import { getAppSession } from '@/lib/auth/session'
import { updateTag } from 'next/cache'
import type { ActionResult } from '@/lib/types/result.types'

const voteSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  type: z.enum(['up', 'down']),
})

export async function voteOnMessage(
  input: z.infer<typeof voteSchema>,
): Promise<ActionResult<{ messageId: string }>> {
  const session = await getAppSession()
  if (!session) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }
  if (session.user.type === 'guest') return { success: false, error: { code: 'FORBIDDEN', message: 'Guests cannot vote' } }

  const validated = voteSchema.parse(input)
  await upsertVote(validated, session.user.id)

  updateTag(`votes:${validated.chatId}`)
  return { success: true, data: { messageId: validated.messageId } }
}
```

```typescript
// features/voting/components/vote-buttons.tsx (sketch)
'use client'

import { useOptimistic, useTransition } from 'react'
import { voteOnMessage } from '@/features/voting/actions/vote'

export function VoteButtons({ chatId, messageId, initialVote }) {
  const [optimisticVote, setOptimisticVote] = useOptimistic(initialVote)
  const [isPending, startTransition] = useTransition()

  function handleVote(type: 'up' | 'down') {
    startTransition(async () => {
      setOptimisticVote(type)
      const result = await voteOnMessage({ chatId, messageId, type })
      if (!result.success) {
        toast.error(result.error.message)
      }
    })
  }

  return (/* up/down buttons with optimisticVote state */)
}
```

---

### 7. Visibility — Server Action + `useOptimistic`

```typescript
// features/visibility/actions/update-visibility.ts
'use server'

import { updateTag } from 'next/cache'
import type { ActionResult } from '@/lib/types/result.types'

export async function updateChatVisibility(
  chatId: string,
  visibility: 'public' | 'private',
): Promise<ActionResult> {
  const session = await getAppSession()
  if (!session) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }

  await updateVisibilityInDb(chatId, visibility, session.user.id)

  updateTag(`chat:${chatId}`)
  updateTag(`chats:${session.user.id}`)
  return { success: true, data: undefined }
}
```

**Fixes:** VII-6 (visibility missing revalidation)

---

### 8. Auth Session — React Context

**Pattern:** Server fetches session → passes as prop to SessionProvider → client context.

```typescript
// features/auth/components/session-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { AppSession } from '@/features/auth/types/auth.types'

const AuthContext = createContext<AppSession | null>(null)

export function SessionProvider({
  session: initialSession,
  children,
}: {
  session: AppSession | null
  children: React.ReactNode
}) {
  const [session, setSession] = useState(initialSession)

  useEffect(() => {
    // Guest bootstrap: if no session, create guest JWT
    if (!session) {
      bootstrapGuest().then(setSession)
    }
    // Supabase auth state listener (for login/logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, supabaseSession) => {
        if (event === 'SIGNED_IN' && supabaseSession) {
          const exchanged = await exchangeToken(supabaseSession.access_token)
          setSession(exchanged)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
        }
      },
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={session}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSession(): AppSession | null {
  return useContext(AuthContext)
}
```

**Key:** `getAppSession()` (the server-side session resolver) lives in `lib/auth/session.ts` — importable by any server component. The SessionProvider is the client-side counterpart, holding the session for client components.

---

### 9. Model Selection — Cookie + localStorage

**Pattern:** Cookie for server-side reading (SSR), localStorage for client persistence.

```
Write flow:
  ModelSelector.onChange(modelId) → document.cookie = 'chat-model={id}; path=/'
                                  → localStorage.setItem('chat-model', id)
Read flow:
  Server: cookies().get('chat-model')?.value ?? DEFAULT_MODEL
  Client: localStorage.getItem('chat-model') ?? DEFAULT_MODEL
```

**Why cookie + localStorage?** The server page component needs to read the model to determine which model to pass as `initialChatModel`. Cookies are the only client state readable by server components. localStorage provides cross-tab persistence for the client.

---

### 10. Scroll Position — useRef (no state, no re-renders)

```typescript
// features/chat/hooks/use-scroll-to-bottom.ts
export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (isAtBottom) {
        endRef.current?.scrollIntoView({ behavior: 'instant' })
      }
    })
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true })
    }
    return () => observer.disconnect()  // MUST disconnect to prevent memory leak
  }, [isAtBottom])

  // IntersectionObserver for detecting scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { threshold: 0 },
    )
    if (endRef.current) observer.observe(endRef.current)
    return () => observer.disconnect()
  }, [])

  return { containerRef, endRef, isAtBottom }
}
```

**Fixes:** VI-6 (observer cleanup prevents memory leak)

---

## What's NOT in This State Architecture

| Removed | Reason | Finding |
|---------|--------|---------|
| SWR synthetic key `"artifact"` | Replaced by `useSyncExternalStore` | III-1, VI-1, VI-2 |
| SWR for votes | Replaced by `useOptimistic` | VII-5 |
| SWR for visibility | Replaced by `useOptimistic` | VII-6 |
| `window.dispatchEvent('chat-title-updated')` | Replaced by PendingChatsProvider.updateTitle | IV-2, III-2 |
| `pollForTitle()` with 3x setTimeout | Server awaits title before stream close | VII-3 |
| Credit/usage state (`setUsage`) | Credit system removed | VIII-2 |
| Gateway error state | Gateway removed | VIII-2 |
| `ChatLayoutClient` state | Layout is a server component | CRITICAL-1 |
| 15-16 props per child | Replaced by ChatSessionContext | V-1 |

### Remaining SWR Uses (Legitimate)

SWR is retained for genuine server-data fetching only:

| Use | Hook | Why SWR |
|-----|------|---------|
| Sidebar pagination | `useSWRInfinite` | Infinite scroll of historical chats (not initial — that's server-fetched) |
| Artifact version history | `useSWR` | On-demand fetch when user navigates versions |

If these can be migrated to server actions with `useOptimistic` or `use()`, evaluate removing SWR entirely (~12KB bundle savings).

---

## Stream Abort Handling

**Problem:** Mid-stream navigation leaks server resources and can corrupt artifact state (VI-5, VII-4).

**Solution:** AbortController lifecycle managed in `useChatSession`:

```typescript
// Inside useChatSession (sketch)
const abortControllerRef = useRef<AbortController | null>(null)

// On send message
function sendMessage() {
  abortControllerRef.current = new AbortController()
  chat.submit(message, { signal: abortControllerRef.current.signal })
}

// On chat ID change or unmount — abort active stream
useEffect(() => {
  return () => {
    if (chat.status === 'streaming' || chat.status === 'submitted') {
      chat.stop()
    }
    abortControllerRef.current?.abort()
    artifactStore.reset()  // Synchronous reset — no stale state flash
  }
}, [chatId])
```

**Server-side:** Register abort handler to save partial responses:

```typescript
// stream-chat.ts (server, route handler)
let accumulatedContent = ''

request.signal.addEventListener('abort', async () => {
  if (accumulatedContent.length > 0) {
    await savePartialMessage(chatId, accumulatedContent, userId)
  }
})
```

**Fixes:** VI-5, VII-4

---

## Memory Leak Prevention

| Vector | Mitigation | Finding |
|--------|-----------|---------|
| SWR cache growth | Scoped SWR (sidebar pagination resets on unmount); vote/visibility use `useOptimistic` | VI-6 |
| MutationObserver/ResizeObserver | Explicit disconnect in useEffect cleanup | VI-6 |
| ChatStream array growth | Reset between messages: `if (status === 'idle') setChatStream([])` | VI-6 |
| Artifact store | Synchronous reset on chat change: `artifactStore.reset()` | IV-5 |
| RAF timer | Cancel on unmount: `cancelAnimationFrame(rafRef.current)` | V-5 |

---

## Mutation → UI Update Pattern (Two-Tier)

### Tier 1: Server Action Mutations

```
1. Client: optimistic update (useOptimistic or context.add())
2. Server Action executes: validate → DB write → cache update
3. Server Action calls: updateTag(relevant tags)  ← read-your-own-writes
4. Success: Next navigation fetches fresh server data (Router Cache invalidated)
5. Failure: React rolls back optimistic state + show toast
```

**Used for:** delete chat, delete all chats, vote, visibility toggle, rename chat

### Tier 2: Streaming Mutations

```
1. Server writes data part to SSE stream (GUARANTEED before stream close)
2. Client: useChat.onData processes part → updates state directly
3. No polling. No window events. No fallbacks.
4. onFinish: server persists data + revalidateTag(tags, 'max')
```

**Used for:** chat title, assistant messages, artifact creation/updates

**Fixes:** VII-2 (unified mutation→UI pattern)

**Title delivery guarantee:**

```typescript
// stream-chat.ts — server
const titlePromise = generateTitle(userMessage.content)
// ... stream AI content ...
const title = await titlePromise  // AWAIT before closing
ChatStream.writeData({
  type: 'data-chatTitle',
  content: title ?? userMessage.content.slice(0, 80),  // Fallback guarantee
})
// THEN close stream
```

**Fixes:** VII-3 (remove polling), III-2, IV-2 (single channel)

---

## State Transition Diagram: Chat Lifecycle

```
Page Load (SERVER)
  ├── Fetch chat + messages from DB/cache
  ├── Tags: cacheTag('chat:{id}')
  └── Render ChatShell with initialMessages

Hydration (CLIENT)
  ├── useChatSession initializes useChat with initialMessages
  ├── Status: idle
  ├── ChatStreamProvider: empty
  └── artifactStore: INITIAL (reset from previous chat)

User Sends Message
  ├── Status: idle → submitted → streaming
  ├── Chat: message appended optimistically
  ├── PendingChats: chat entry added (if new chat)
  └── Artifact: (no change until tool call)

Streaming Response
  ├── Text deltas → messages update → Messages re-renders
  ├── Tool call (createArtifact):
  │   ├── data-id → artifactStore.setState({artifactId})
  │   ├── data-title → artifactStore.setState({title})
  │   ├── data-kind → artifactStore.setState({kind})
  │   ├── content deltas → artifactStore.setState({content: +=delta})
  │   ├── data-finish → artifactStore.setState({status: 'idle'})
  │   └── ArtifactPanel renders content progressively
  ├── data-chatTitle → PendingChats.updateTitle(chatId, title)
  └── StreamBridge processes each delta via processStreamDelta()

Stream Complete
  ├── Status: streaming → idle
  ├── Server: saveMessages + revalidateTag('chat:{id}', 'max')
  ├── ChatStream: cleared (setChatStream([]))
  └── Ready for next message

Navigation to Another Chat
  ├── useChatSession cleanup: stop() if streaming
  ├── artifactStore.reset() — synchronous, before new page renders
  ├── New page: server fetches new chat data
  └── New ChatShell with new initialMessages
```
