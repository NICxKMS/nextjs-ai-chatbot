# Domain Boundaries — Feature Inventory, Boundary Rules & Integration Contracts

> Defines every feature module's ownership, public API, cross-feature contracts,
> and the handler registry that decouples chat from artifacts.
> Addresses: IV-1, IV-2, IV-3, VIII-3, VIII-4, VIII-8, Observation D

---

## 1. Feature Inventory

### features/chat/

| Aspect | Details |
|--------|---------|
| **Owns** | Chat session state, message rendering, multimodal input, stream processing, AI tool definitions |
| **Components** | ChatShell, ChatHeader, Messages, Message, MessageActions, MessageEditor, MessageReasoning, MultimodalInput, SubmitButton, PreviewAttachment, SuggestedActions, Greeting, StreamBridge, ChatStreamProvider, NoticeHandler |
| **Hooks** | `useChatSession`, `useChatSideEffects`, `useChatSessionContext`, `useScrollToBottom` |
| **Actions** | `deleteChat`, `deleteAllChats`, `deleteTrailingMessages` |
| **Lib** | `chat-callbacks.ts` (pure), `process-stream-deltas.ts` (pure), `tools/` (AI tool defs) |
| **Schemas** | `chat.schema.ts` |
| **Types** | `ChatSessionValue`, `DataPart`, `ChatStatus` |

**Exports (public surface):**

```typescript
// components — consumed by app/ pages only
export { ChatShell } from './components/chat-shell'
export { StreamBridge } from './components/stream-bridge'
export { ChatStreamProvider } from './components/chat-stream-provider'
export { NoticeHandler } from './components/notice-handler'

// actions — consumed by app/ pages and sidebar
export { deleteChat } from './actions/delete-chat'
export { deleteAllChats } from './actions/delete-all-chats'
export { deleteTrailingMessages } from './actions/delete-trailing-messages'

// types — consumed by lib/types/ re-exports
export type { ChatSessionValue, DataPart } from './types/chat.types'
```

**Imports from other features:** NONE (types only via `lib/types/`)

**Imports from lib/:**

| lib/ module | Functions used |
|-------------|---------------|
| `lib/ai/artifact-handlers` | `getArtifactHandler()` — consumed in `tools/` |
| `lib/ai/registry` | `myProvider.languageModel()` |
| `lib/ai/prompts` | `systemPrompt()`, `artifactsPrompt` |
| `lib/data/chat` | `getChatWithMessages`, `createChat`, `saveMessages` |
| `lib/data/artifact` | `getArtifactById` (in update tool) |
| `lib/auth/session` | `getAppSession()` |
| `lib/cache/revalidate` | `refreshChat`, `refreshChatList` |
| `lib/types/` | `ArtifactHandler`, `PendingChatOperations`, `ActionResult`, `UIArtifact` |
| `lib/errors/` | `AppError` |

---

### features/artifacts/

| Aspect | Details |
|--------|---------|
| **Owns** | Artifact panel rendering, kind-specific editors, artifact state store, handler implementations |
| **Components** | ArtifactPanel, ArtifactActions, ArtifactCloseButton, ArtifactPreview, ArtifactErrorBoundary, VersionFooter, editors/ (TextEditor, CodeEditor, SheetEditor, ImageEditor) |
| **Hooks** | `useArtifact`, `useArtifactSelector` |
| **Handlers** | `text-handler.ts`, `code-handler.ts`, `sheet-handler.ts`, `image-handler.ts`, `index.ts` (registration) |
| **Lib** | `artifact-store.ts` (`useSyncExternalStore` store) |
| **Types** | `UIArtifact`, `ArtifactKind`, `ArtifactStatus` |

**Exports (public surface):**

```typescript
// components — consumed by app/ pages (via ChatShell)
export { ArtifactPanel } from './components/artifact-panel'
export { ArtifactPreview } from './components/artifact-preview'

// store — consumed by StreamBridge (chat feature)
export { artifactStore } from './lib/artifact-store'
export { useArtifact, useArtifactSelector } from './lib/artifact-store'

// handlers/index.ts — REGISTERS handlers into lib/ai/ at import time
// No explicit export needed; side-effect import in route handler

// types — re-exported via lib/types/
export type { UIArtifact, ArtifactKind } from './types/artifact.types'
```

**Imports from lib/:**

| lib/ module | Functions used |
|-------------|---------------|
| `lib/ai/artifact-handlers` | `registerArtifactHandler()` — called in `handlers/index.ts` |
| `lib/ai/registry` | `myProvider.languageModel('artifact-model')` |
| `lib/data/artifact` | `getArtifactById`, `saveArtifactVersion` |
| `lib/types/` | `ArtifactHandler`, `ArtifactStreamWriter`, `CreateArtifactParams`, `UpdateArtifactParams` |

---

### features/sidebar/

| Aspect | Details |
|--------|---------|
| **Owns** | Sidebar rendering, chat history pagination, optimistic chat state |
| **Components** | SidebarShell (SERVER), SidebarHistoryClient, SidebarHistoryItem, SidebarUserNav, SidebarSkeleton |
| **Hooks** | `usePendingChats`, `useSidebarHistory` (SWR infinite) |
| **Actions** | `renameChat` |
| **Types** | `SidebarHistoryItem` |

**Exports:**

```typescript
export { SidebarShell } from './components/sidebar-shell'
export { SidebarSkeleton } from './components/sidebar-skeleton'
export { PendingChatsProvider, usePendingChats } from './hooks/use-pending-chats'
export { renameChat } from './actions/rename-chat'
```

**Imports from lib/:** `lib/data/chat` (getChatsByUserId), `lib/types/` (PendingChatOperations), `lib/cache/revalidate`

---

### features/auth/

| Aspect | Details |
|--------|---------|
| **Owns** | Auth forms, session context, guest bootstrap |
| **Components** | AuthForm, SessionProvider |
| **Actions** | `login`, `register`, `logout` |
| **Lib** | `session.ts`, `guest.ts` |

**Exports:** `SessionProvider`, `useSession`, `login`, `register`, `logout`  
**Imports from lib/:** `lib/auth/session` (getAppSession)

---

### features/voting/

| Aspect | Details |
|--------|---------|
| **Owns** | Vote UI, vote mutation |
| **Components** | VoteButtons |
| **Hooks** | `useVotes` |
| **Actions** | `voteOnMessage` |

**Exports:** `VoteButtons`, `voteOnMessage`  
**Imports from lib/:** `lib/data/vote`, `lib/types/result.types`

---

### features/models/

| Aspect | Details |
|--------|---------|
| **Owns** | Model selector UI, model catalog |
| **Components** | ModelSelector |
| **Lib** | `models.ts` (catalog with `use cache`) |

**Exports:** `ModelSelector`, `getAvailableModels`, `getDefaultModel`  
**Imports from lib/:** `lib/ai/registry`, `lib/ai/models`

---

### features/visibility/

| Aspect | Details |
|--------|---------|
| **Owns** | Visibility toggle UI and mutation |
| **Components** | VisibilitySelector |
| **Actions** | `updateChatVisibility` |

**Exports:** `VisibilitySelector`, `updateChatVisibility`  
**Imports from lib/:** `lib/data/chat`, `lib/cache/revalidate`

---

### features/settings/

| Aspect | Details |
|--------|---------|
| **Owns** | Settings panel, settings state (useSyncExternalStore + localStorage) |
| **Components** | SettingsPanel |
| **Hooks** | `useSettings`, `useSettingsSetter` |

**Exports:** `SettingsPanel`, `useSettings`, `useSettingsSetter`, `settingsStore`  
**Imports from lib/:** None (leaf feature)

---

## 2. Feature Boundary Rules

### Import Rules (Enforced by `scripts/check-imports.mjs`)

```
ALLOWED:
  app/           → features/*, components/*, lib/*
  features/*     → components/*, lib/*
  features/X     → lib/types/* (cross-feature type contracts ONLY)
  components/*   → lib/*
  lib/*          → (external packages only)

FORBIDDEN:
  lib/*          → components/*, features/*, app/*
  components/*   → features/*, app/*
  features/X     → features/Y/components/*
  features/X     → features/Y/hooks/*
  features/X     → features/Y/actions/*
  features/X     → features/Y/lib/* (except artifact-store — see §3)
  features/*     → app/*
```

**Fixes:** VIII-4 (import boundary violations), VIII-8 (no enforcement)

### Cross-Feature Communication Channels

| Communication | Mechanism | Typed Contract |
|---------------|-----------|----------------|
| Chat → Artifacts (tool execution) | Handler registry in `lib/ai/artifact-handlers.ts` | `ArtifactHandler` interface |
| Chat → Sidebar (new chat, title) | `PendingChatsProvider` context | `PendingChatOperations` |
| Sidebar → Chat (navigation) | Next.js router (`router.push('/chat/{id}')`) | URL params |
| Chat ↔ Artifacts (stream state) | `artifactStore` (module-level store) | `UIArtifact` type |
| Settings → Chat (config) | `useSettings()` (module-level store) | `SettingsState` type |
| Voting → Messages (render) | Props from page → VoteButtons | `initialVotes: Vote[]` |
| Visibility → Chat (UI composition) | Direct component import (allowlisted) | VisibilitySelector rendered in ChatHeader |

<!-- AUDIT: W4-VI-02 — Visibility→Chat communication channel added.
     Traceability: wave2/visibility.md W2-VI-2, wave3/chat-visibility-conflicts.md CV-02.
     Mirrors voting precedent (VO-4). Allowlisted in conventions.md §3 cross-feature exceptions table. -->

### What Is NOT Allowed

| Anti-Pattern | Replacement | Finding |
|--------------|-------------|---------|
| `window.dispatchEvent('chat-title-updated')` | `PendingChats.updateTitle()` | IV-2 |
| `features/chat/` importing `features/artifacts/handlers/` | `lib/ai/artifact-handlers.getArtifactHandler()` | IV-1 |
| Direct cross-feature component imports | Only type imports via `lib/types/` | VIII-4 |
| `pollForTitle()` with 3× setTimeout | Server awaits title before stream close | VII-3 |
| SWR synthetic key for cross-feature state | `useSyncExternalStore` module stores | III-1 |

---

## 3. Handler Registry Design

The artifact handler registry lives in `lib/ai/` and applies **dependency inversion**: chat tools depend on the interface, not the implementation. Artifact handlers register themselves.

**Fixes:** IV-1 (direct cross-feature import), Observation D (feature coupling)

### Interface Contract (`lib/types/artifact-handler.types.ts`)

```typescript
import type { ArtifactKind } from './artifact.types'

/** Writer passed to handlers — abstracts the SSE data stream */
export interface ArtifactStreamWriter {
  writeData(part: { type: string; content: unknown }): void
}

/** Parameters for creating a new artifact */
export interface CreateArtifactParams {
  id: string
  title: string
  kind: ArtifactKind
  ChatStream: ArtifactStreamWriter
  session: { userId: string; isGuest: boolean }
  chatId: string
}

/** Parameters for updating an existing artifact */
export interface UpdateArtifactParams {
  id: string
  description: string
  currentContent: string
  kind: ArtifactKind
  title: string
  ChatStream: ArtifactStreamWriter
  session: { userId: string; isGuest: boolean }
}

/** Handler that each artifact kind implements */
export interface ArtifactHandler {
  create(params: CreateArtifactParams): Promise<string>   // returns content
  update(params: UpdateArtifactParams): Promise<string>    // returns content
}
```

### Registry Implementation (`lib/ai/artifact-handlers.ts`)

```typescript
import type { ArtifactKind } from '@/lib/types/artifact.types'
import type { ArtifactHandler } from '@/lib/types/artifact-handler.types'

const handlers = new Map<ArtifactKind, ArtifactHandler>()

/** Called by features/artifacts/handlers/index.ts at module load */
export function registerArtifactHandler(
  kind: ArtifactKind,
  handler: ArtifactHandler,
): void {
  if (handlers.has(kind)) {
    throw new Error(`Artifact handler already registered for kind: ${kind}`)
  }
  handlers.set(kind, handler)
}

/** Called by features/chat/lib/tools/ during tool execution */
export function getArtifactHandler(kind: ArtifactKind): ArtifactHandler {
  const handler = handlers.get(kind)
  if (!handler) {
    throw new Error(`No artifact handler registered for kind: ${kind}`)
  }
  return handler
}

/** Check if a kind has a registered handler */
export function hasArtifactHandler(kind: ArtifactKind): boolean {
  return handlers.has(kind)
}
```

### Registration Side (`features/artifacts/handlers/index.ts`)

```typescript
import { registerArtifactHandler } from '@/lib/ai/artifact-handlers'
import { textHandler } from './text-handler'
import { codeHandler } from './code-handler'
import { sheetHandler } from './sheet-handler'

// Side-effect: registers all handlers when this module is imported
registerArtifactHandler('text', textHandler)
registerArtifactHandler('code', codeHandler)
registerArtifactHandler('sheet', sheetHandler)
// NOTE: 'image' has no AI handler — images are created via code execution
```

### Consumption Side (`features/chat/lib/tools/create-artifact.ts`)

```typescript
import { z } from 'zod'
import { getArtifactHandler } from '@/lib/ai/artifact-handlers'
import { generateUUID } from '@/lib/utils'
import { saveArtifactVersion } from '@/lib/data/artifact'
import type { ArtifactStreamWriter } from '@/lib/types/artifact-handler.types'

export function createArtifactTool({
  session,
  ChatStream,
  chatId,
}: {
  session: { userId: string; isGuest: boolean }
  ChatStream: ArtifactStreamWriter
  chatId: string
}) {
  return {
    description: 'Create an artifact for substantial content (>10 lines)',
    parameters: z.object({
      title: z.string().describe('Title for the artifact'),
      kind: z.enum(['text', 'code', 'sheet']).describe('Type of artifact'),
    }),
    execute: async ({ title, kind }: { title: string; kind: 'text' | 'code' | 'sheet' }) => {
      const id = generateUUID()
      const handler = getArtifactHandler(kind)  // No artifact feature import!

      // Stream metadata
      ChatStream.writeData({ type: 'artifact-kind', content: kind })
      ChatStream.writeData({ type: 'artifact-id', content: id })
      ChatStream.writeData({ type: 'artifact-title', content: title })
      ChatStream.writeData({ type: 'artifact-clear', content: '' })

      // Delegate to handler (registered by artifacts feature)
      const content = await handler.create({ id, title, kind, ChatStream, session, chatId })

      // Persist
      await saveArtifactVersion({ id, title, kind, content, userId: session.userId, chatId })
      ChatStream.writeData({ type: 'artifact-finish', content: '' })

      return { id, title, kind, content: `An artifact was created: "${title}"` }
    },
  }
}
```

### Registration Timing Guarantee

The route handler (`app/api/chat/route.ts`) imports the handler index before processing:

```typescript
// app/api/chat/route.ts
import '@/features/artifacts/handlers'  // Side-effect: registers handlers
import { createArtifactTool } from '@/features/chat/lib/tools/create-artifact'
// ... handler registration complete before any tool execution
```

This is safe because:
1. ES module imports execute before the module body
2. The route handler is the single entry point for chat streaming
3. No race condition — `registerArtifactHandler` runs synchronously

---

## 4. Sidebar ↔ Chat Communication

### The Problem (IV-2, Observation D)

The old app uses **three** channels for a single piece of data (chat title):
1. `data-chatTitle` stream part → `useChat.onData` → `updatePendingChatTitle()`
2. `pollForTitle()` with 3× setTimeout (500ms, 1.5s, 3s)
3. `window.dispatchEvent('chat-title-updated')` → SWR revalidation

**Fixes:** IV-2 (3-channel coupling), III-2 (polling removal), Observation D (window events)

### Redesigned Single-Channel Flow

```
Server (stream-chat.ts):
  1. Title generation starts in parallel with AI content streaming
  2. Title is AWAITED before stream close (with fallback guarantee)
  3. Single data part: { type: 'chat-title', content: title }

Client (useChatSession.onData):
  4. Receives 'chat-title' → calls PendingChats.updateTitle(chatId, title)

Sidebar (SidebarHistoryClient):
  5. Reads PendingChats.entries — sees updated title immediately
  6. On next navigation: server-rendered SidebarShell has fresh data
     via revalidateTag('chats:{userId}', 'max') called in onFinish
```

### PendingChatsProvider Contract

```typescript
// lib/types/pending-chats.types.ts
export interface PendingChat {
  id: string
  title: string
  visibility: 'public' | 'private'
  createdAt: Date
  isOptimistic: boolean   // true until server confirms
}

export interface PendingChatOperations {
  /** Add a new chat entry (called on first message send) */
  add(chat: Omit<PendingChat, 'isOptimistic'>): void
  /** Remove a chat (called on delete) */
  remove(id: string): void
  /** Update title (called when data-chatTitle arrives) */
  updateTitle(id: string, title: string): void
  /** Mark as server-confirmed (called after revalidation) */
  markConfirmed(id: string): void
}
```

**Location:** `features/sidebar/hooks/use-pending-chats.tsx` implements the provider.
**Scope:** Chat layout level — survives chat-to-chat navigation.
**Consumers:** SidebarHistoryClient (reads), useChatSession (writes via context).

### New Chat Creation Flow

```
1. User types first message → MultimodalInput.sendMessage()
2. useChatSession: PendingChats.add({ id, title: input.slice(0, 50), ... })
3. POST /api/chat fires (SSE stream starts)
4. Sidebar instantly shows optimistic entry (grey/italic until confirmed)
5. Server: creates chat in DB → revalidateTag('chats:{userId}', 'max')
6. Server: generates title → data-chatTitle stream part
7. Client: PendingChats.updateTitle(chatId, title) → sidebar updates
8. On next navigation: server-rendered sidebar has real data; markConfirmed()
```

### Chat Deletion Flow

```
1. SidebarHistoryItem: user clicks delete → PendingChats.remove(id)
2. Sidebar immediately removes the entry (optimistic)
3. Server Action deleteChat() → DB delete → updateTag('chats:{userId}')
4. Success: Router Cache invalidated → next navigation gets fresh data
5. Failure: ActionResult.error → toast → PendingChats roll back not needed
   (page already navigated away from deleted chat)
```

### Title Delivery Guarantee (Server-Side)

```typescript
// app/api/chat/route.ts — inside createUIMessageStream execute callback
const titlePromise = generateTitle(userMessage.content)

// ... stream main AI content via streamText() ...

// AWAIT title before closing — guaranteed delivery
const title = await titlePromise
ChatStream.writeData({
  type: 'chat-title',
  content: title ?? userMessage.content.slice(0, 80),  // Fallback
})

// Stream close happens AFTER this point
```

No polling. No window events. One typed API. One delivery mechanism.

---

## 5. StreamBridge Cross-Feature Access

`StreamBridge` (owned by `features/chat/`) imports `artifactStore` from `features/artifacts/lib/artifact-store.ts`. This is the **one intentional exception** to the "no cross-feature implementation imports" rule.

### Why This Is Acceptable

1. `artifactStore` is a **module-level store** — it's a plain object with `getSnapshot/subscribe/setState`, not a component or hook with React lifecycle dependencies.
2. The store is the **declared public API** of the artifacts feature for state updates.
3. The alternative (moving `artifactStore` to `lib/stores/`) adds indirection without benefit — the store is tightly coupled to `UIArtifact` semantics owned by artifacts.
4. The import is **one-directional**: chat → artifacts store. Artifacts never imports from chat.

### Enforced Contract

```typescript
// features/artifacts/lib/artifact-store.ts — PUBLIC API
export const artifactStore: {
  getSnapshot(): UIArtifact
  getServerSnapshot(): UIArtifact
  subscribe(listener: () => void): () => void
  setState(updater: UIArtifact | ((prev: UIArtifact) => UIArtifact)): void
  reset(): void
}
```

If this exception causes future issues, the store can be elevated to `lib/stores/artifact-store.ts` without changing any consumer code — only the import path changes.

---

## 6. Complete Integration Dependency Graph

```
app/ pages
  ├── imports features/chat/ (ChatShell, StreamBridge, etc.)
  ├── imports features/artifacts/ (ArtifactPanel — via ChatShell)
  ├── imports features/sidebar/ (SidebarShell, PendingChatsProvider)
  ├── imports features/auth/ (SessionProvider)
  ├── imports features/models/ (getAvailableModels)
  └── imports features/voting/ (VoteButtons — via page)

features/chat/
  ├── → lib/ai/artifact-handlers (getArtifactHandler — registry)
  ├── → lib/ai/registry (myProvider)
  ├── → lib/ai/prompts (system prompts)
  ├── → lib/data/ (chat, artifact, message)
  ├── → lib/types/ (ArtifactHandler, PendingChatOperations)
  ├── → lib/cache/revalidate
  ├── → features/artifacts/lib/artifact-store (EXCEPTION — store only)
  └── → components/ui/ (Button, Input, etc.)

features/artifacts/
  ├── → lib/ai/artifact-handlers (registerArtifactHandler)
  ├── → lib/ai/registry (myProvider — for artifact-model)
  ├── → lib/data/artifact
  ├── → lib/types/ (ArtifactHandler, ArtifactStreamWriter)
  └── → components/ui/

features/sidebar/
  ├── → lib/data/chat (getChatsByUserId)
  ├── → lib/types/ (PendingChatOperations)
  ├── → lib/cache/revalidate
  └── → components/ui/

features/auth/ → lib/auth/
features/voting/ → lib/data/vote
features/models/ → lib/ai/
features/visibility/ → lib/data/chat, lib/cache/revalidate
features/settings/ → (no lib imports — leaf feature)
```

### Import Boundary Enforcement

```javascript
// scripts/check-imports.mjs — runs in pnpm lint
const FORBIDDEN_PATTERNS = [
  { from: 'lib/', to: ['features/', 'components/', 'app/'] },
  { from: 'components/', to: ['features/', 'app/'] },
  { from: 'features/', to: ['app/'] },
  // Cross-feature: allow types and artifact-store only
  {
    from: 'features/*/components/',
    to: ['features/*/components/'],
    except: [],
  },
  {
    from: 'features/*/hooks/',
    to: ['features/*/hooks/'],
    except: [],
  },
]
```

**Fixes:** VIII-8 (no enforcement mechanism), X (import boundary principle)
