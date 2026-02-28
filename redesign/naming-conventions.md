# Naming Conventions

> Complete naming conventions for the redesigned Next.js 16 AI chatbot codebase.
> Ensures consistency across all layers: files, symbols, data, streams, and imports.
> Addresses: VIII-1 (naming inconsistency), Principle 8 (naming consistency).

---

## 1. Symbol Naming

| Element | Convention | Example |
|---------|-----------|---------|
| **Files/Directories** | `kebab-case` | `artifact-panel.tsx`, `data-stream/` |
| **Components** | `PascalCase` | `ArtifactPanel`, `ChatShell`, `ModelSelector` |
| **Hooks** | `camelCase` with `use` prefix | `useChatSession`, `useArtifact`, `useScrollToBottom` |
| **Functions** | `camelCase` | `getChatById`, `formatDate`, `processStreamDelta` |
| **Server Actions** | `camelCase`, verb-first | `deleteChat`, `voteOnMessage`, `updateVisibility` |
| **Constants** | `SCREAMING_SNAKE_CASE` | `DEFAULT_CHAT_MODEL`, `TITLE_MODEL`, `ARTIFACT_MODEL` |
| **Types/Interfaces** | `PascalCase` | `ChatSessionValue`, `UIArtifact`, `ModelMetadata` |
| **Zod schemas** | `camelCase` with `Schema` suffix | `chatSchema`, `loginSchema`, `artifactSchema` |
| **Route handlers** | Uppercase HTTP method exports | `GET`, `POST`, `DELETE` |
| **Enums** | `PascalCase` type, `kebab-case` or `camelCase` values | `ArtifactKind = 'text' \| 'code' \| 'sheet'` |
| **Event/Action types** | `kebab-case` string literals | `'artifact-textDelta'`, `'chat-title'` |
| **Cache tags** | `entity:{id}` template | `'chat:{id}'`, `'artifact:{id}'`, `'votes:{chatId}'` |
| **CSS classes** | Tailwind utilities (no custom class names) | `className="flex flex-col min-w-0"` |

### Discovery Rule

Before creating any new symbol:
1. Search the codebase for the existing naming pattern in that area
2. Match the existing convention
3. If no precedent exists, follow this table

---

## 2. "artifact" vs "document" — Complete Migration

### Core Rule

> **One concept = one name, everywhere.** The user-facing concept is **"artifact"**.
> The word **"document"** does not appear in any code identifier, file name, database entity, cache key, or stream part.

### Database Layer

| Old Name | New Name | Context |
|----------|----------|---------|
| `Document` table | `Artifact` table | `lib/db/schema.ts` |
| `document_kind` enum | `artifact_kind` enum | `lib/db/schema.ts` |
| `artifactId` column (Suggestion) | `artifactId` | `lib/db/schema.ts` FK references |
| `documentCreatedAt` column | `artifactCreatedAt` | `lib/db/schema.ts` composite key |

### Data Access Layer

| Old Name | New Name | Context |
|----------|----------|---------|
| `lib/data/document.ts` | `lib/data/artifact.ts` | File name |
| `getDocumentById()` | `getArtifactById()` | Function |
| `saveDocumentVersion()` | `saveArtifactVersion()` | Function |
| `getDocumentVersions()` | `getArtifactVersions()` | Function |
| `deleteDocumentVersion()` | `deleteArtifactVersion()` | Function |
| `documentData.get()` | N/A — use plain functions | Pattern simplified |
| `documentData.save()` | N/A — use plain functions | Pattern simplified |

### Cache Keys

| Old Key | New Key | Context |
|---------|---------|---------|
| `doc:{docId}:{userId}` | `artifact:{artifactId}` | `lib/cache/keys.ts` |
| `cacheKeys.doc(id)` | `cacheKeys.artifact(id)` | Key factory |

### AI Tools

| Old Name | New Name | Context |
|----------|----------|---------|
| `createDocument` tool name | `createArtifact` | Tool visible to AI model |
| `updateDocument` tool name | `updateArtifact` | Tool visible to AI model |
| `create-document.ts` file | `create-artifact.ts` | `features/chat/lib/tools/` |
| `update-document.ts` file | `update-artifact.ts` | `features/chat/lib/tools/` |
| `requestSuggestions` (artifactId param) | `requestSuggestions` (artifactId param) | `features/chat/lib/tools/` |

### Handler Registry

| Old Name | New Name | Context |
|----------|----------|---------|
| `DocumentHandler` interface | `ArtifactHandler` | `lib/types/artifact-handler.types.ts` |
| `documentHandlersByArtifactKind` | `artifactHandlersByKind` (Map) | `lib/ai/artifact-handlers.ts` |
| `onCreateDocument()` method | `create()` method | `ArtifactHandler` interface |
| `onUpdateDocument()` method | `update()` method | `ArtifactHandler` interface |
| `registerDocumentHandler()` | `registerArtifactHandler()` | `lib/ai/artifact-handlers.ts` |
| `getDocumentHandler()` | `getArtifactHandler()` | `lib/ai/artifact-handlers.ts` |

### Data Stream Parts

| Old Name | New Name | Content |
|----------|----------|---------|
| `data-id` | `artifact-id` | UUID of artifact |
| `data-title` | `artifact-title` | Artifact title string |
| `data-kind` | `artifact-kind` | `ArtifactKind` enum |
| `data-clear` | `artifact-clear` | Empty string (signal) |
| `data-finish` | `artifact-finish` | Empty string (signal) |
| `data-textDelta` | `artifact-textDelta` | Text chunk (APPEND) |
| `data-codeDelta` | `artifact-codeDelta` | Full code (REPLACE) |
| `data-sheetDelta` | `artifact-sheetDelta` | Full CSV (REPLACE) |
| `data-imageDelta` | `artifact-imageDelta` | Base64 data URL (REPLACE) |
| `data-suggestion` | `artifact-suggestion` | `{ originalText, suggestedText, description }` |
| `data-chatTitle` | `chat-title` | Chat title string |
| `data-usage` | **REMOVED** | No credit/usage system |
| `data-appendMessage` | **REMOVED** | `useChat` manages messages natively |

### Components

| Old Name | New Name | Context |
|----------|----------|---------|
| `document-preview.tsx` | `artifact-preview.tsx` | `features/artifacts/components/` |
| `DocumentPreview` component | `ArtifactPreview` | Component name |
| `DocumentSkeleton` component | `ArtifactSkeleton` | If used |

### Types

| Old Name | New Name | Context |
|----------|----------|---------|
| `DocumentKind` | `ArtifactKind` | `lib/types/artifact.types.ts` |
| `Document` type | `Artifact` type | Drizzle-inferred |
| `DocumentVersion` | `ArtifactVersion` | If used |
| `UIDocument` | `UIArtifact` | `features/artifacts/types/artifact.types.ts` |
| `DocumentHandler` | `ArtifactHandler` | `lib/types/artifact-handler.types.ts` |
| `DocumentStreamWriter` | `ArtifactStreamWriter` | `lib/types/artifact-handler.types.ts` |
| `CreateDocumentParams` | `CreateArtifactParams` | `lib/types/artifact-handler.types.ts` |
| `UpdateDocumentParams` | `UpdateArtifactParams` | `lib/types/artifact-handler.types.ts` |
| `AppUsage` | **REMOVED** | No credit/usage system |

### Schemas

| Old Name | New Name | Context |
|----------|----------|---------|
| `documentSchema` | `artifactSchema` | `features/artifacts/schemas/artifact.schema.ts` |
| `artifactId` field (Suggestion Zod) | `artifactId` | Validation schemas |
| `documentCreatedAt` field | `artifactCreatedAt` | Validation schemas |

### API Routes

| Old Path | New Path | Context |
|----------|----------|---------|
| `/api/document` | `/api/artifact` | `app/api/artifact/route.ts` |
| Request/response with `artifactId` | `artifactId` | API contract |

### System Prompts

| Old Reference | New Reference | Context |
|---------------|---------------|---------|
| "create a document" | "create an artifact" | `lib/ai/prompts.ts` |
| "update the document" | "update the artifact" | AI instruction text |
| `artifactsPrompt` | `ARTIFACTS_PROMPT` | Constant naming |

---

## 3. Import Conventions

### Path Alias

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

All imports use `@/` prefix. Never relative imports across module boundaries.

### Import Rules by Layer

| Source | Can Import From | Example |
|--------|----------------|---------|
| `app/` | `features/*`, `components/*`, `lib/*` | `import { ChatShell } from '@/features/chat/components/chat-shell'` |
| `features/*` | `components/*`, `lib/*` | `import { Button } from '@/components/ui/button'` |
| `features/X` | `lib/types/*` (cross-feature types ONLY) | `import type { ArtifactHandler } from '@/lib/types/artifact-handler.types'` |
| `components/*` | `lib/*` | `import { cn } from '@/lib/utils/cn'` |
| `lib/*` | External packages only | `import { drizzle } from 'drizzle-orm/node-postgres'` |

### Forbidden Imports

| From | Cannot Import | Reason |
|------|--------------|--------|
| `lib/*` | `components/*`, `features/*`, `app/*` | Leaf layer — no upward deps |
| `components/*` | `features/*`, `app/*` | UI layer — no business logic deps |
| `features/X` | `features/Y/components/*` | No cross-feature implementation imports |
| `features/X` | `features/Y/hooks/*` | No cross-feature hook imports |
| `features/X` | `features/Y/actions/*` | No cross-feature action imports |
| `features/*` | `app/*` | Features don't know about routing |

### One Declared Exception

```typescript
// features/chat/components/stream-bridge.tsx
import { artifactStore } from '@/features/artifacts/lib/artifact-store'
```

This is allowed because `artifactStore` is the declared public API of the artifacts feature for state updates. If this causes issues, the store can be elevated to `lib/stores/artifact-store.ts`.

### Import Ordering

Within a file, imports are ordered by:

```typescript
// 1. External packages
import { streamText } from 'ai'
import { z } from 'zod'

// 2. lib/ imports
import { getArtifactHandler } from '@/lib/ai/artifact-handlers'
import type { ArtifactHandler } from '@/lib/types/artifact-handler.types'

// 3. components/ imports
import { Button } from '@/components/ui/button'

// 4. features/ imports (same feature first, then cross-feature types)
import { useChatSessionContext } from '@/features/chat/hooks/use-chat-session-context'

// 5. Relative imports (same directory)
import { processStreamDelta } from './process-stream-deltas'
```

Biome enforces import sorting automatically.

### Type-Only Imports

Use `import type` for type-only imports to enable tree-shaking:

```typescript
import type { UIArtifact } from '@/lib/types/artifact.types'
import type { ActionResult } from '@/lib/types/result.types'
```

---

## 4. Export Conventions

### Named Exports Only

All exports are named exports. No default exports except Next.js conventions:

```typescript
// ✅ Named export (components, hooks, functions, types)
export function ChatShell({ ... }) { ... }
export function useChatSession({ ... }) { ... }
export type ChatSessionValue = { ... }

// ✅ Default export (ONLY for Next.js page/layout/route/error)
export default async function ChatPage({ params }) { ... }
export default async function ChatLayout({ children }) { ... }
export async function POST(request: Request) { ... }  // Route handler
```

### No Barrel Files (Default)

Do NOT create `index.ts` barrel files. Import directly from the source file:

```typescript
// ✅ Direct import
import { ChatShell } from '@/features/chat/components/chat-shell'
import { artifactStore } from '@/features/artifacts/lib/artifact-store'

// ❌ Barrel import
import { ChatShell } from '@/features/chat'
import { artifactStore } from '@/features/artifacts'
```

### Barrel File Exception

Only create an `index.ts` when ALL of these are true:
1. The directory has 3+ public exports
2. Multiple consumers would benefit from a single import path
3. The exports are stable (not frequently added/removed)

Current exceptions:
| File | Reason |
|------|--------|
| `features/artifacts/handlers/index.ts` | Side-effect module registering 3+ handlers |

### Server-Only Exports

Files that should only run on the server use the `server-only` package:

```typescript
// lib/data/artifact.ts
import 'server-only'

export async function getArtifactById(id: string) { ... }
```

This causes a build error if accidentally imported in a client component.

---

## 5. File Naming Patterns

### Feature Module Files

```
features/[name]/
├── components/
│   └── [component-name].tsx          # kebab-case, matches PascalCase component
├── hooks/
│   └── use-[hook-name].ts            # Always starts with "use-"
├── actions/
│   └── [verb-noun].ts                # verb-first: delete-chat.ts, vote.ts
├── lib/
│   └── [descriptive-name].ts         # camelCase function names inside
├── schemas/
│   └── [feature].schema.ts           # Suffix: .schema.ts
├── types/
│   └── [feature].types.ts            # Suffix: .types.ts
└── handlers/
    └── [kind]-handler.ts             # Suffix: -handler.ts (artifact handlers)
```

### Naming Correspondence

| File Name | Export Name | Convention |
|-----------|------------|-----------|
| `chat-shell.tsx` | `ChatShell` | kebab → PascalCase |
| `artifact-panel.tsx` | `ArtifactPanel` | kebab → PascalCase |
| `use-chat-session.ts` | `useChatSession` | kebab → camelCase |
| `use-artifact.ts` | `useArtifact` | kebab → camelCase |
| `delete-chat.ts` | `deleteChat` | kebab → camelCase |
| `chat.schema.ts` | `chatSchema` | dot-suffix → camelCase |
| `chat.types.ts` | `ChatSessionValue` | dot-suffix → PascalCase |
| `text-handler.ts` | `textHandler` | kebab → camelCase |
| `artifact-handlers.ts` | `registerArtifactHandler`, `getArtifactHandler` | kebab → camelCase |

---

## 6. Data Stream Part Naming

All custom data stream parts use the `artifact-` prefix for artifact lifecycle events and `chat-` prefix for chat-level events.

### Part Type Names

```typescript
// Artifact lifecycle
'artifact-id'           // UUID of artifact
'artifact-title'        // Display title
'artifact-kind'         // 'text' | 'code' | 'sheet'
'artifact-clear'        // Clear content, signal new generation
'artifact-finish'       // Mark generation complete

// Content deltas
'artifact-textDelta'    // Text chunk (APPEND)
'artifact-codeDelta'    // Full code string (REPLACE)
'artifact-sheetDelta'   // Full CSV string (REPLACE)
'artifact-imageDelta'   // Base64 data URL (REPLACE)

// Suggestions
'artifact-suggestion'   // Inline edit suggestion object

// Chat-level
'chat-title'            // Chat title (awaited server-side)
```

### Naming Pattern

- Lifecycle events: `artifact-{noun}` — `artifact-id`, `artifact-kind`
- Content deltas: `artifact-{kind}Delta` — `artifact-textDelta`, `artifact-codeDelta`
- Chat events: `chat-{noun}` — `chat-title`

### Removed Parts

| Removed | Reason |
|---------|--------|
| `data-usage` | No credit/quota system |
| `data-appendMessage` | `useChat` manages messages natively |
| Any `data-` prefix | Renamed to `artifact-` or `chat-` for clarity |

---

## 7. Error Code Naming

```typescript
// lib/errors/codes.ts
// Pattern: category:scope:detail

// Auth errors
'unauthorized:auth:no_session'
'unauthorized:auth:expired_token'
'forbidden:auth:guest_restricted'

// Chat errors
'not_found:chat:chat_not_found'
'forbidden:chat:owner_mismatch'
'bad_request:chat:invalid_model_id'

// Artifact errors
'not_found:artifact:artifact_not_found'       // NOT document_not_found
'bad_request:artifact:invalid_kind'

// Rate limiting
'rate_limit:chat:too_many_requests'
'rate_limit:api:too_many_requests'

// Validation
'bad_request:validation:invalid_input'
```

### Removed Error Codes

| Removed | Reason |
|---------|--------|
| `activate_gateway` | No credit/gateway system |
| `rate_limit:chat:daily_limit_exceeded` | Evaluate — keep only if retained as abuse prevention |
| Any `gateway:*` codes | No gateway system |

---

## 8. Cache Tag Naming

```typescript
// Pattern: entity:{id}
'chat:{chatId}'           // Individual chat + messages
'chats:{userId}'          // User's chat list
'votes:{chatId}'          // Votes for a chat
'artifact:{artifactId}'   // Artifact + versions (NOT document:{id})
'models'                  // Model catalog (global)
```

### Revalidation Function Naming

```typescript
// Server Actions — read-your-own-writes
invalidateChat(chatId)         // updateTag('chat:{id}')
invalidateChatList(userId)     // updateTag('chats:{userId}')
invalidateVotes(chatId)        // updateTag('votes:{chatId}')

// Route Handlers — stale-while-revalidate
refreshChat(chatId)            // revalidateTag('chat:{id}', 'max')
refreshChatList(userId)        // revalidateTag('chats:{userId}', 'max')
refreshArtifact(artifactId)    // revalidateTag('artifact:{id}', 'max')
```

---

## 9. Test File Naming

| Pattern | Example | Convention |
|---------|---------|-----------|
| Unit test | `process-stream-deltas.test.ts` | Colocated with source, `.test.ts` suffix |
| Integration test | `tests/integration/chat-flow.test.ts` | In `tests/integration/`, descriptive name |
| E2E test | `tests/e2e/chat.spec.ts` | In `tests/e2e/`, `.spec.ts` suffix |
| Test mock | `tests/mocks/auth.ts` | In `tests/mocks/`, named by domain |
| Test fixture | `tests/fixtures/artifact.ts` | In `tests/fixtures/`, named by entity |

---

## 10. API Route Naming

| Path | Method | Convention |
|------|--------|-----------|
| `/api/chat` | `POST` | Entity name, main action |
| `/api/artifact` | `POST` | Entity name (NOT `/api/document`) |
| `/api/files/upload` | `POST` | Nested for sub-resource action |
| `/api/history` | `GET` | Descriptive noun |
| `/api/suggestions` | `GET` | Plural noun |
| `/api/health` | `GET` | Standard health endpoint |

No API routes for vote (Server Action), visibility (Server Action), or auth actions (Server Actions).

---

## Summary: The "artifact" Rule

> **If you are naming anything that refers to the user-created content panel (text, code, sheet, image), use "artifact".**
>
> The word "document" does not appear in:
> - Any file name
> - Any function name
> - Any type or interface name
> - Any variable name
> - Any database table, column, or enum
> - Any cache key
> - Any API endpoint
> - Any stream part type
> - Any error code
> - Any test file or fixture
> - Any comment referring to this concept
>
> Search for "document" before any PR is merged. Zero results required (excluding `.next-docs/` and `node_modules/`).
