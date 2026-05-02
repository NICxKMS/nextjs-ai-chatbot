# Domain Model

The application is organized around product domains, not technical folders. Each domain owns its behavior and exposes only the narrow public API needed by routes or other domains.

## Domain Inventory

| Domain | Feature folder | Owns |
|---|---|---|
| Chat | `features/chat/` | Chat session state, messages, input, streaming callbacks, chat tools, chat actions |
| Artifacts | `features/artifacts/` | Artifact panel, store, editors, handlers, version UI, suggestions display |
| Auth | `features/auth/` | Login, register, logout, session context, guest helper logic |
| Sidebar | `features/sidebar/` | Server-rendered history shell, pagination, pending chats, rename/delete UI |
| Voting | `features/voting/` | Vote buttons, vote optimistic state, `voteOnMessage` action |
| Models | `features/models/` | Model selector, catalog access, default model resolution |
| Visibility | `features/visibility/` | Chat visibility selector and mutation |
| Settings | `features/settings/` | Local chat settings store and settings panel |

## Public APIs By Domain

### Chat

Public UI exports are `ChatShell`, `ChatStreamProvider`, `StreamBridge`, and `NoticeHandler`. Chat actions are `deleteChat`, `deleteAllChats`, and `deleteTrailingMessages`. Chat types include `ChatSessionValue`, `DataPart`, `ArtifactDataPart`, and `ChatStatus`.

`ChatSessionValue` is the main client contract:

```typescript
type ChatSessionValue = {
  chatId: string
  chatModel: string
  isReadonly: boolean
  messages: Message[]
  status: 'idle' | 'submitted' | 'streaming' | 'error' | 'ready'
  input: string
  setInput: (input: string) => void
  attachments: Attachment[]
  setAttachments: Dispatch<SetStateAction<Attachment[]>>
  sendMessage: (event?: { preventDefault?: () => void }) => void
  stop: () => void
  appendMessage: (message: Message) => void
  editMessage: (messageId: string, newContent: string) => Promise<void>
  error: Error | null
  clearError: () => void
  visibility: 'public' | 'private'
  setVisibility: (visibility: 'public' | 'private') => void
  availableModels: ModelMetadata[]
}
```

### Artifacts

Public UI exports are `ArtifactPanel`, `ArtifactPreview`, `artifactStore`, `useArtifact`, and `useArtifactSelector`. Handlers are registered through `features/artifacts/handlers/index.ts` and consumed through `lib/ai/artifact-handlers.ts`.

```typescript
type UIArtifact = {
  artifactId: string
  title: string
  kind: 'text' | 'code' | 'sheet' | 'image'
  content: string
  status: 'idle' | 'streaming'
  isVisible: boolean
  suggestions?: ArtifactSuggestion[]
}
```

### Auth

Auth exposes `SessionProvider`, `useSession`, `login`, `register`, and `logout`. All domains consume a unified session shape.

```typescript
type AppSession = {
  user: {
    id: string
    type: 'authenticated' | 'guest'
    email?: string
  }
}
```

### Sidebar

Sidebar exposes `SidebarShell`, `SidebarSkeleton`, `PendingChatsProvider`, `usePendingChats`, and `renameChat`.

```typescript
type PendingChat = {
  id: string
  title: string
  visibility: 'public' | 'private'
  createdAt: Date
  isOptimistic: boolean
}

type PendingChatOperations = {
  add(chat: Omit<PendingChat, 'isOptimistic'>): void
  remove(id: string): void
  updateTitle(id: string, title: string): void
  markConfirmed(id: string): void
}
```

## Data Entities

| Entity | Purpose | Key fields |
|---|---|---|
| User | Registered user record | `id`, `email`, timestamps |
| Chat | Conversation metadata | `id`, `userId`, `title`, `visibility`, `model`, `createdAt`, `updatedAt` |
| Message | UI message history | `id`, `chatId`, `role`, `parts`, `createdAt` |
| Vote | Assistant message feedback | `chatId`, `messageId`, `userId`, `type` |
| Artifact | Versioned generated content | `id`, `createdAt`, `title`, `content`, `kind`, `userId`, `chatId` |
| Suggestion | Inline text artifact suggestion | `id`, `artifactId`, `artifactCreatedAt`, `originalText`, `suggestedText`, `description`, `isResolved` |

Artifact versions use composite identity by `id` and `createdAt`. Saving an artifact creates a new row with the same `id` and a new timestamp.

## Data Access Modules

| File | Responsibility |
|---|---|
| `lib/data/user.ts` | User lookup and creation |
| `lib/data/chat.ts` | Chat CRUD, title update, visibility update, history query |
| `lib/data/message.ts` | Message save, load, and trailing deletion |
| `lib/data/vote.ts` | Vote query and upsert |
| `lib/data/artifact.ts` | Artifact lookup, version save, version restore/truncate |
| `lib/data/suggestion.ts` | Suggestion lookup and save |

## Cache Tags

| Tag | Data | Invalidated by |
|---|---|---|
| `chat:{id}` | Chat plus messages | Message save, trailing delete, visibility update, rename |
| `chats:{userId}` | Sidebar chat list | Chat create, delete, delete all, rename, visibility update |
| `votes:{chatId}` | Votes for a chat | `voteOnMessage` |
| `artifact:{id}` | Artifact versions | AI create/update, user save, restore |
| `models` | Model catalog | Admin refresh or deploy |

Server Actions call `updateTag` for immediate user-visible invalidation. Route Handlers call `revalidateTag(tag, 'max')` because their work fits stale-while-revalidate behavior.

## Naming Rules

| Item | Rule | Example |
|---|---|---|
| Files and folders | `kebab-case` | `chat-shell.tsx` |
| Components | `PascalCase` | `ChatShell` |
| Hooks | `use` plus camelCase | `useChatSession` |
| Server Actions | Verb-first camelCase | `deleteChat` |
| Schemas | camelCase plus `Schema` suffix | `chatSchema` |
| Types | `PascalCase` | `UIArtifact` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_CHAT_MODEL` |
| Stream parts | `artifact-*` or `chat-*` | `artifact-textDelta` |
| Cache tags | `entity:{id}` | `artifact:{id}` |

Artifact naming is mandatory across code, database, cache keys, stream parts, API contracts, tools, and UI. Removed concepts include `createDocument`, `updateDocument`, `/api/document`, `DocumentHandler`, credit usage events, gateway activation errors, and `data-usage` stream parts.
