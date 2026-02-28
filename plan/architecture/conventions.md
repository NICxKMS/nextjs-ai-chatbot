# Conventions

> Final conventions for the new codebase. Feature collocation as the organizing principle.
> Supersedes the v6 spec conventions where they conflict.

---

## 1. Directory Structure

```
nextjs-ai-chatbot/
├── app/                              # Next.js App Router — routing ONLY
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (chat)/
│   │   ├── page.tsx                  # New chat
│   │   ├── chat/[id]/page.tsx        # Existing chat
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts             # POST: streaming chat
│   │   │   └── [id]/
│   │   │       ├── messages/route.ts # GET: paginated messages
│   │   │       └── reconnect/route.ts# GET: SSE reconnect
│   │   ├── artifact/route.ts        # GET/POST/DELETE
│   │   ├── files/upload/route.ts    # POST: file upload
│   │   ├── health/route.ts          # GET: health check
│   │   ├── history/route.ts         # GET/DELETE: chat history
│   │   ├── suggestions/route.ts     # GET: AI suggestions
│   │   ├── vote/route.ts            # PATCH: message voting
│   │   └── auth/
│   │       ├── callback/route.ts    # GET: OAuth callback
│   │       ├── guest/route.ts       # POST: guest JWT
│   │       └── logout/route.ts      # POST: session termination
│   ├── layout.tsx                    # Root layout
│   ├── global-error.tsx
│   └── globals.css
│
├── features/                         # Feature modules — THE organizing principle
│   ├── chat/
│   │   ├── actions/                  # Server actions
│   │   │   ├── stream-chat.ts
│   │   │   └── save-message.ts
│   │   ├── components/               # Chat UI components
│   │   │   ├── chat.tsx
│   │   │   ├── messages.tsx
│   │   │   ├── message.tsx
│   │   │   ├── message-actions.tsx
│   │   │   ├── message-reasoning.tsx
│   │   │   ├── multimodal-input.tsx
│   │   │   ├── greeting.tsx
│   │   │   ├── data-stream-handler.tsx
│   │   │   ├── data-stream-provider.tsx
│   │   │   └── suggested-actions.tsx
│   │   ├── hooks/
│   │   │   ├── use-messages.ts
│   │   │   └── use-scroll-to-bottom.ts
│   │   ├── schemas/
│   │   │   ├── chat.schema.ts
│   │   │   └── message.schema.ts
│   │   └── lib/
│   │       ├── tools/                # AI tool definitions
│   │       │   ├── weather.ts
│   │       │   ├── create-document.ts
│   │       │   ├── update-document.ts
│   │       │   └── suggestions.ts
│   │       └── prompts.ts
│   │
│   ├── artifacts/
│   │   ├── actions/
│   │   │   ├── create-artifact.ts
│   │   │   └── update-artifact.ts
│   │   ├── components/
│   │   │   ├── artifact-panel.tsx
│   │   │   ├── artifact-actions.tsx
│   │   │   ├── artifact-close.tsx
│   │   │   ├── artifact-error-boundary.tsx
│   │   │   ├── create-artifact.tsx
│   │   │   ├── document-preview.tsx
│   │   │   ├── version-footer.tsx
│   │   │   └── editors/
│   │   │       ├── text-editor.tsx
│   │   │       ├── code-editor.tsx
│   │   │       ├── image-editor.tsx
│   │   │       └── sheet-editor.tsx
│   │   ├── handlers/                 # Document handler factory + per-type
│   │   │   ├── base.ts
│   │   │   ├── text.ts
│   │   │   ├── code.ts
│   │   │   ├── image.ts
│   │   │   └── sheet.ts
│   │   ├── hooks/
│   │   │   ├── use-artifact.ts
│   │   │   └── use-artifact-selector.ts
│   │   ├── schemas/
│   │   │   └── artifact.schema.ts
│   │   └── types/
│   │       └── artifact.types.ts
│   │
│   ├── auth/
│   │   ├── actions/
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   ├── exchange.ts
│   │   │   └── logout.ts
│   │   ├── components/
│   │   │   └── auth-form.tsx
│   │   ├── schemas/
│   │   │   └── auth.schema.ts
│   │   └── lib/
│   │       └── session.ts            # getAppSession()
│   │
│   ├── sidebar/
│   │   ├── components/
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── sidebar-history.tsx
│   │   │   ├── sidebar-history-item.tsx
│   │   │   └── sidebar-user-nav.tsx
│   │   └── hooks/
│   │       └── use-optimistic-chats.ts
│   │
│   ├── settings/
│   │   ├── components/
│   │   │   └── settings-panel.tsx
│   │   ├── hooks/
│   │   │   └── use-settings.ts
│   │   └── lib/
│   │       ├── defaults.ts
│   │       └── types.ts
│   │
│   ├── voting/
│   │   ├── actions/
│   │   │   └── vote.ts
│   │   └── schemas/
│   │       └── vote.schema.ts
│   │
│   └── models/
│       ├── components/
│       │   └── model-selector.tsx
│       └── lib/
│           ├── catalog.ts
│           └── discovery.ts
│
├── components/                       # Truly shared UI ONLY
│   ├── ai-elements/                  # Read-only AI primitives — NEVER MODIFY
│   │   └── ... (30 files from external source)
│   ├── ui/                           # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── theme-provider.tsx
│   ├── sidebar-toggle.tsx
│   └── icons.tsx
│
├── lib/                              # Cross-cutting infrastructure
│   ├── data/                         # Shared data access (function-based)
│   │   ├── chat.ts
│   │   ├── message.ts
│   │   ├── document.ts
│   │   ├── user.ts
│   │   ├── vote.ts
│   │   └── context.ts               # DataContext type
│   ├── db/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── cache/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── keys.ts
│   │   └── with-cache.ts
│   ├── ai/
│   │   ├── index.ts
│   │   ├── providers.ts
│   │   └── registry.ts
│   ├── auth/
│   │   ├── index.ts
│   │   └── config.ts
│   ├── errors/
│   │   ├── index.ts
│   │   ├── app-error.ts
│   │   └── codes.ts
│   ├── api/
│   │   ├── guards.ts
│   │   ├── validation.ts
│   │   └── response.ts
│   ├── rate-limit/
│   │   └── config.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── models.types.ts          # Drizzle inferred types
│   │   └── api.types.ts
│   ├── utils/
│   │   └── index.ts
│   └── hooks/                        # ONLY truly generic hooks (2-3 max)
│       ├── use-mobile.ts
│       └── use-debounce.ts
│
├── middleware.ts                      # Edge: rate limiting + auth check
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
| Files & directories | `kebab-case` | `chat-header.tsx`, `data-stream/` |
| Components | `PascalCase` | `ChatHeader`, `ModelSelector` |
| Hooks | `camelCase` with `use` prefix | `useChat`, `useScrollToBottom` |
| Functions | `camelCase` | `getChatById`, `formatDate` |
| Server Actions | `camelCase` verb-first | `saveChat`, `deleteMessage` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_MODEL` |
| Types/Interfaces | `PascalCase` | `ChatMessage`, `ModelConfig` |
| Zod schemas | `camelCase` with `Schema` suffix | `loginSchema`, `messageSchema` |
| Route handlers | HTTP method exports | `GET`, `POST`, `DELETE` |
| Data access fns | `camelCase` verb-noun | `getChatById`, `createChat` |
| Cache keys | `camelCase` factory | `cacheKeys.chat(id)` |

### File Suffixes

| Type | Suffix | Example |
|------|--------|---------|
| Component | `.tsx` | `chat.tsx` |
| Server action | `.ts` | `stream-chat.ts` |
| Hook | `.ts` with `use-` prefix | `use-messages.ts` |
| Schema | `.schema.ts` | `chat.schema.ts` |
| Types | `.types.ts` | `artifact.types.ts` |
| Test | `.test.ts` / `.test.tsx` | `stream-chat.test.ts` |
| E2E test | `.spec.ts` | `chat.spec.ts` |

**Note**: The spec used `.action.ts` suffix for server actions. We drop this — the `actions/`
directory already communicates intent. Extra suffixes add noise.

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

---

## 4. File Placement Decision Tree

```
START: Where does this code belong?

Is it a Next.js routing file (page, layout, route, error, loading)?
├── YES → app/[route-group]/
└── NO ↓

Is it a read-only AI primitive from external source?
├── YES → components/ai-elements/ (NEVER MODIFY)
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
├── YES → lib/api/
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
