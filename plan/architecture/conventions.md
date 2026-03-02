# Conventions

> Final conventions for the new codebase. Feature collocation as the organizing principle.
> Supersedes the v6 spec conventions where they conflict.
>
> **Updated per redesign audit (2026-03-01)**: Provider names, component names,
> "artifact" terminology, proxy.ts convention, and state management patterns finalized.

---

## 1. Directory Structure

```
nextjs-ai-chatbot/
├── app/                              # Next.js App Router — routing ONLY
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── layout.tsx
│   │   └── error.tsx
│   ├── (chat)/
│   │   ├── page.tsx                  # New chat
│   │   ├── chat/[id]/page.tsx        # Existing chat
│   │   ├── layout.tsx
│   │   └── error.tsx
│   ├── api/
│   │   ├── chat/route.ts             # POST: streaming chat
│   │   ├── artifact/route.ts         # POST: save artifact version
│   │   ├── files/upload/route.ts     # POST: file upload
│   │   ├── health/route.ts           # GET: health check
│   │   ├── history/route.ts          # GET: paginated chat history
│   │   └── suggestions/route.ts      # GET: AI suggestions
│   ├── layout.tsx                    # Root layout (SERVER)
│   ├── global-error.tsx
│   └── globals.css
│
├── features/                         # Feature modules — THE organizing principle
│   ├── chat/
│   │   ├── actions/                  # Server actions
│   │   │   ├── delete-chat.ts
│   │   │   ├── delete-all-chats.ts
│   │   │   └── delete-trailing-messages.ts
│   │   ├── components/               # Chat UI components
│   │   │   ├── chat-shell.tsx            # ~60 lines, composes chat UI
│   │   │   ├── chat-header.tsx
│   │   │   ├── chat-stream-provider.tsx   # Split state/dispatch contexts
│   │   │   ├── stream-bridge.tsx          # ~20 lines, thin bridge to artifact store
│   │   │   ├── notice-handler.tsx         # Reads ?notice → shows toast
│   │   │   ├── messages.tsx
│   │   │   ├── message.tsx
│   │   │   ├── message-actions.tsx
│   │   │   ├── message-editor.tsx
│   │   │   ├── message-reasoning.tsx
│   │   │   ├── multimodal-input.tsx
│   │   │   ├── submit-button.tsx
│   │   │   ├── greeting.tsx
│   │   │   ├── suggested-actions.tsx
│   │   │   └── preview-attachment.tsx
│   │   ├── hooks/
│   │   │   ├── use-chat-session.ts
│   │   │   ├── use-chat-side-effects.ts
│   │   │   ├── use-chat-session-context.ts
│   │   │   └── use-scroll-to-bottom.ts
│   │   ├── schemas/
│   │   │   └── chat.schema.ts
│   │   └── lib/
│   │       ├── chat-callbacks.ts
│   │       ├── process-stream-deltas.ts
│   │       └── tools/                # AI tool definitions
│   │           ├── weather.ts
│   │           ├── create-artifact.ts
│   │           ├── update-artifact.ts
│   │           └── request-suggestions.ts
│   │
│   ├── artifacts/
│   │   ├── components/
│   │   │   ├── artifact-panel.tsx
│   │   │   ├── artifact-actions.tsx
│   │   │   ├── artifact-close-button.tsx
│   │   │   ├── artifact-error-boundary.tsx
│   │   │   ├── artifact-preview.tsx
│   │   │   ├── version-footer.tsx
│   │   │   └── editors/
│   │   │       ├── text-editor.tsx
│   │   │       ├── code-editor.tsx
│   │   │       ├── image-editor.tsx
│   │   │       └── sheet-editor.tsx
│   │   ├── handlers/                 # Artifact handler registration + per-kind
│   │   │   ├── index.ts              # Registers all handlers
│   │   │   ├── text-handler.ts
│   │   │   ├── code-handler.ts
│   │   │   ├── image-handler.ts
│   │   │   └── sheet-handler.ts
│   │   ├── hooks/
│   │   │   ├── use-artifact.ts       # useSyncExternalStore-based
│   │   │   └── use-artifact-selector.ts
│   │   ├── lib/
│   │   │   └── artifact-store.ts     # useSyncExternalStore store
│   │   ├── schemas/
│   │   │   └── artifact.schema.ts
│   │   └── types/
│   │       └── artifact.types.ts     # UIArtifact, ArtifactKind
│   │
│   ├── auth/
│   │   ├── actions/
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   └── logout.ts
│   │   ├── components/
│   │   │   ├── auth-form.tsx
│   │   │   └── session-provider.tsx    # SessionProvider (was AuthProvider)
│   │   ├── lib/
│   │   │   ├── session.ts             # getAppSession()
│   │   │   └── guest.ts               # Guest bootstrap, token rotation
│   │   ├── schemas/
│   │   │   └── auth.schema.ts
│   │   └── types/
│   │       └── auth.types.ts          # AppSession, User
│   │
│   ├── sidebar/
│   │   ├── components/
│   │   │   ├── sidebar-shell.tsx      # SERVER — async, fetches history
│   │   │   ├── sidebar-history-client.tsx  # 'use client' — SWR pagination
│   │   │   ├── sidebar-history-item.tsx
│   │   │   ├── sidebar-user-nav.tsx
│   │   │   └── sidebar-skeleton.tsx
│   │   ├── hooks/
│   │   │   ├── use-pending-chats.ts
│   │   │   └── use-sidebar-history.ts
│   │   ├── actions/
│   │   │   └── rename-chat.ts
│   │   └── types/
│   │       └── sidebar.types.ts
│   │
│   ├── settings/
│   │   ├── components/
│   │   │   └── settings-panel.tsx
│   │   ├── hooks/
│   │   │   └── use-settings.ts        # useSyncExternalStore + localStorage
│   │   └── types/
│   │       └── settings.types.ts
│   │
│   ├── voting/
│   │   ├── components/
│   │   │   └── vote-buttons.tsx
│   │   ├── hooks/
│   │   │   └── use-votes.ts
│   │   ├── actions/
│   │   │   └── vote.ts
│   │   └── types/
│   │       └── vote.types.ts
│   │
│   ├── visibility/
│   │   ├── components/
│   │   │   └── visibility-selector.tsx
│   │   ├── actions/
│   │   │   └── update-visibility.ts
│   │   └── types/
│   │       └── visibility.types.ts
│   │
│   └── models/
│       ├── components/
│       │   └── model-selector.tsx
│       ├── lib/
│       │   └── models.ts              # Model catalog, `use cache` tagged
│       └── types/
│           └── model.types.ts
│
├── components/                       # Truly shared UI ONLY
│   ├── theme-provider.tsx            # next-themes ThemeProvider wrapper
│   ├── sidebar-toggle.tsx            # Sidebar open/close toggle
│   ├── icons.tsx                     # Shared icon components
│   ├── toaster.tsx                   # Toast notification provider
│   ├── weather.tsx                   # Weather widget component (used by getWeather tool)
│   └── ui/                           # shadcn/ui base components
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       └── ...
│
│   > Note: `components/ai-elements/` is treated as legacy reference material in this plan.
│   > It is not a redesign-mandated baseline directory.
│
├── lib/                              # Cross-cutting infrastructure
│   ├── data/                         # Shared data access (function-based)
│   │   ├── chat.ts
│   │   ├── artifact.ts               # Was document.ts — "artifact" everywhere
│   │   ├── message.ts
│   │   ├── user.ts
│   │   ├── vote.ts
│   │   └── suggestion.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts                  # Artifact table (NOT Document)
│   │   └── migrations/
│   ├── cache/
│   │   ├── client.ts
│   │   ├── keys.ts
│   │   ├── revalidate.ts              # updateTag/revalidateTag utilities
│   │   └── with-cache.ts
│   ├── ai/
│   │   ├── registry.ts               # AI provider registry (NO vercel-gateway)
│   │   ├── artifact-handlers.ts       # Handler registry: register/get pattern
│   │   ├── models.ts                  # Model definitions
│   │   ├── prompts.ts                # System prompts
│   │   ├── provider.ts               # myProvider factory with extractReasoningMiddleware
│   │   ├── provider-options.ts        # Per-provider options configuration
│   │   ├── tools.ts                   # getEnabledTools, tool definitions
│   │   └── title.ts                   # Title generation utility
│   ├── auth/
│   │   └── session.ts                # getAppSession() infrastructure
│   ├── errors/
│   │   ├── app-error.ts              # AppError class + codes
│   │   └── codes.ts                   # Error code registry (NO activate_gateway)
│   ├── types/
│   │   ├── artifact-handler.types.ts  # ArtifactHandler, ArtifactStreamWriter
│   │   ├── artifact.types.ts          # ArtifactKind, UIArtifact
│   │   ├── data-context.types.ts      # DataContext (userId, isGuest)
│   │   ├── model.types.ts             # ModelMetadata, ProviderId
│   │   ├── pending-chats.types.ts     # PendingChatOperations
│   │   ├── settings.types.ts          # SettingsState
│   │   └── result.types.ts            # ActionResult<T> for Server Actions
│   ├── utils/
│   │   ├── cn.ts                      # clsx + twMerge
│   │   ├── format.ts                  # Date/string formatting
│   │   └── generate-uuid.ts           # UUID generation utility
│   └── hooks/                        # ONLY truly generic hooks (2-3 max)
│       ├── use-mobile.ts
│       └── use-debounce.ts
│
├── proxy.ts                          # Next.js 16 proxy (was middleware.ts): auth guard + rate limiting
├── scripts/
│   └── check-imports.mjs             # Import boundary enforcement CI script
├── tests/
│   ├── setup.ts
│   ├── mocks/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
└── public/
```

---

## 2. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files & directories | `kebab-case` | `chat-header.tsx`, `artifact-panel.tsx` |
| Components | `PascalCase` | `ChatShell`, `ArtifactPanel`, `ModelSelector` |
| Hooks | `camelCase` with `use` prefix | `useChatSession`, `useArtifact`, `useScrollToBottom` |
| Functions | `camelCase` | `getChatById`, `getArtifactById`, `formatDate` |
| Server Actions | `camelCase` verb-first | `deleteChat`, `voteOnMessage`, `updateVisibility` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_CHAT_MODEL` |
| Types/Interfaces | `PascalCase` | `ChatSessionValue`, `UIArtifact`, `ArtifactKind` |
| Zod schemas | `camelCase` with `Schema` suffix | `chatSchema`, `loginSchema`, `artifactSchema` |
| Route handlers | HTTP method exports | `GET`, `POST`, `DELETE` |
| Data access fns | `camelCase` verb-noun | `getChatById`, `getArtifactById`, `saveArtifactVersion` |
| Cache tags | `entity:{id}` template | `'chat:{id}'`, `'artifact:{id}'`, `'votes:{chatId}'` |
| Data stream parts | `artifact-` or `chat-` prefix | `'artifact-textDelta'`, `'chat-title'` |
| Revalidation fns | verb-entity | `invalidateChat()` (SA), `refreshChat()` (RH) |
| Cache keys | `camelCase` factory | `cacheKeys.chat(id)` |

### File Suffixes

| Type | Suffix | Example |
|------|--------|---------|
| Component | `.tsx` | `chat-shell.tsx` |
| Server action | `.ts` | `stream-chat.ts` |
| Hook | `.ts` with `use-` prefix | `use-messages.ts` |
| Schema | `.schema.ts` | `chat.schema.ts` |
| Types | `.types.ts` | `artifact.types.ts` |
| Test | `.test.ts` / `.test.tsx` | `stream-chat.test.ts` |
| E2E test | `.spec.ts` | `chat.spec.ts` |
| Mock file | `.mock.ts` | `session.mock.ts` |
| Fixture file | `.fixture.ts` | `chat.fixture.ts` |

**Note**: The spec used `.action.ts` suffix for server actions. We drop this — the `actions/`
directory already communicates intent. Extra suffixes add noise.

### Error Code Structured Naming

Error codes follow the `category:scope:detail` pattern:

```typescript
// Examples:
'auth:session:expired'      // Auth category, session scope, expired detail
'validation:chat:empty'     // Validation category, chat scope, empty detail
'ai:stream:timeout'         // AI category, stream scope, timeout detail
'data:chat:not-found'       // Data category, chat scope, not-found detail
```

Categories: `auth`, `validation`, `ai`, `data`, `rate-limit`, `system`.
This enables structured error handling and consistent error reporting across features.

---

## 3. Import Rules

### Path Aliases

```json
// tsconfig.json paths
{
  "@/*": ["./*"]
}
```

All imports use `@/` prefix. No relative imports crossing feature boundaries.

### Import Ordering

Imports within a file must follow this order (enforced by convention):

1. **External packages** — `react`, `next/cache`, `ai`, `drizzle-orm`
2. **`lib/`** — `@/lib/db`, `@/lib/errors`, `@/lib/utils`
3. **`components/`** — `@/components/ui/button`
4. **`features/`** — `@/features/auth/lib/session`
5. **Relative imports** — `./message`, `../hooks/use-chat-session`

Separate each group with a blank line.

### `import type` Enforcement

Use `import type` for type-only imports. This ensures types are erased at compile time
and prevents unintended side effects:

```typescript
import type { Chat } from '@/lib/types'
import type { UIArtifact } from '@/features/artifacts/types/artifact.types'
```

### `import 'server-only'` Pattern

Server-only modules (data access, session resolution, cache infrastructure) must include
the `server-only` import guard at the top of the file:

```typescript
import 'server-only'
```

This prevents accidental inclusion in client bundles.

### Layer Rules

```
app/ ──────→ features/, components/, lib/
features/ ──→ components/, lib/
features/ ──→ other features/ (data access types + schemas ONLY, never components)
components/ → lib/
lib/ ────────→ nothing above
```

### Forbidden Imports

| From | Cannot Import | Why |
|------|--------------|-----|
| `lib/` | `features/`, `app/`, `components/` | Infrastructure is leaf layer |
| `components/` | `features/`, `app/` | Shared UI has no feature knowledge |
| `features/X/` | `features/Y/components/` | Feature components are internal |
| `app/` | `app/` (other routes) | Routes don't cross-import |

### Allowed Cross-Feature Imports

Features may import from other features' **data types and schemas only**:

```typescript
// features/sidebar/ importing chat types — ALLOWED
import type { Chat } from '@/lib/types'

// features/chat/ importing artifact schemas — ALLOWED
import { artifactSchema } from '@/features/artifacts/schemas/artifact.schema'

// features/sidebar/ importing chat components — FORBIDDEN
import { Chat } from '@/features/chat/components/chat'
```

### Declared Cross-Feature Import Exception: StreamBridge → artifactStore

`StreamBridge` (in `features/chat/components/stream-bridge.tsx`) imports from
`features/artifacts/lib/artifact-store.ts` to dispatch stream deltas to the artifact
store. This is a **declared exception** to the cross-feature component boundary rule.
The import is limited to the store's `dispatch` function and is the only place where
the chat feature directly writes to artifact state.

```typescript
// features/chat/components/stream-bridge.tsx — ALLOWED (declared exception)
import { dispatch } from '@/features/artifacts/lib/artifact-store'
```

---

## 4. File Placement Decision Tree

```
START: Where does this code belong?

Is it a Next.js routing file (page, layout, route, error, loading)?
├── YES → app/[route-group]/
└── NO ↓

Does it belong to a specific feature (chat, artifacts, auth, sidebar, settings, voting, models)?
├── YES → features/[feature-name]/
│   ├── Is it a server action? → features/[name]/actions/
│   ├── Is it a React component? → features/[name]/components/
│   ├── Is it a React hook? → features/[name]/hooks/
│   ├── Is it a Zod schema? → features/[name]/schemas/
│   ├── Is it a type definition? → features/[name]/types/
│   └── Is it feature-specific utility? → features/[name]/lib/
└── NO ↓

Is it a generic UI component (button, input, dialog)?
├── YES → components/ui/
└── NO ↓

Is it app-wide UI (theme, icons, sidebar toggle)?
├── YES → components/
└── NO ↓

Is it database infrastructure?
├── YES → lib/db/
└── NO ↓

Is it cache infrastructure?
├── YES → lib/cache/
└── NO ↓

Is it shared data access (used by 2+ features)?
├── YES → lib/data/
└── NO ↓

Is it AI provider/model infrastructure?
├── YES → lib/ai/
└── NO ↓

Is it auth infrastructure (not feature logic)?
├── YES → lib/auth/
└── NO ↓

Is it error handling infrastructure?
├── YES → lib/errors/
└── NO ↓

Is it API route utility (guards, validation)?
├── YES → Inline in route handler (no separate `lib/api/` directory)
└── NO ↓

Is it a shared type (Drizzle model types, API types)?
├── YES → lib/types/
└── NO ↓

Is it a shared utility used across 3+ locations?
├── YES → lib/utils/
└── NO ↓

If none of the above: this code probably belongs in a feature. Create a new feature
module or add it to the most closely related existing feature.
```

---

## 5. Export Rules

1. **Named exports only** — no `export default` (except `page.tsx`, `layout.tsx`, `route.ts`
   which Next.js requires as default exports)
2. **Barrel files optional** — only create `index.ts` when a directory has 3+ public exports
   AND consumers benefit from a single import point
3. **Re-export from feature root is optional** — import directly from subdirectory is fine:
   `import { streamChatAction } from '@/features/chat/actions/stream-chat'`
4. **Types exported alongside implementation** — don't create separate type files unless
   the types are consumed externally without the implementation

---

## 6. Component Conventions

1. **Server Components by default** — only add `'use client'` when needed (hooks, events, browser APIs)
2. **Props interface** — define inline for simple components, named export for complex ones
3. **No prop drilling beyond 2 levels** — use context or composition
4. **Error boundaries per feature** — artifact panel gets its own boundary
5. **Loading states colocated** — `loading.tsx` in route segments, skeleton components in features

---

## 7. Testing Conventions

| Test Type | Location | Runner | Naming |
|-----------|----------|--------|--------|
| Unit | Colocated: `*.test.ts` next to source | Vitest | `describe('functionName')` |
| Component | Colocated: `*.test.tsx` next to source | Vitest + Testing Library | `describe('ComponentName')` |
| Integration | `tests/integration/` | Vitest | `describe('feature: flow')` |
| E2E | `tests/e2e/` | Playwright | `test('user can ...')` |

### What to Test

| Layer | What | How |
|-------|------|-----|
| Data access | Cache hit/miss/guest paths | Unit test with mocked cache/db |
| Server actions | Validation, auth, business logic | Unit test with mocked data layer |
| Hooks | State transitions, effects | Unit test with renderHook |
| Components | User interactions, rendering | Component test with Testing Library |
| Streaming | SSE data parts, state updates | Integration test |
| Full flows | Chat → message → artifact | E2E with Playwright |

### Test File Naming Conventions

- Unit/component tests: colocated next to source as `<source-name>.test.ts(x)`
- Integration tests: `tests/integration/<feature>-<flow>.test.ts`
- E2E tests: `tests/e2e/<feature>.spec.ts`
- Test mocks: `tests/mocks/<module>.mock.ts`
- Test fixtures: `tests/fixtures/<entity>.fixture.ts`
- Setup files: `tests/setup.ts` (global), `tests/mocks/setup-*.ts` (per-concern)
