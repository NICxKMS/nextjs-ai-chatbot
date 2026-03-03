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
│   │   │   └── guest.ts               # Guest helpers (token mint/verify/rotate)
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
│   │   ├── hooks/
│   │   │   └── use-chat-visibility.ts
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
│   ├── ai-elements/                  # On-demand copies from oldapp/components/elements/ (read-only)
│   │   └── ... (populated per-feature)
│   └── ui/                           # shadcn/ui base components
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       └── ...
│
│   > Note: `components/ai-elements/` is populated on-demand. When a feature wrapper needs
│   > a primitive, copy the specific file from `oldapp/components/elements/`. Files are
│   > read-only and excluded from Biome.
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
│   │   ├── model.types.ts             # ModelMetadata, ProviderId
│   │   ├── pending-chats.types.ts     # PendingChatOperations
│   │   ├── settings.types.ts          # SettingsState
│   │   └── result.types.ts            # ActionResult<T> for Server Actions
│   ├── utils/
│   │   ├── cn.ts                      # clsx + twMerge
│   │   ├── format.ts                  # Date/string formatting
│   │   └── generate-uuid.ts           # UUID generation utility
│   ├── providers/                    # Cross-feature context providers
│   │   └── pending-chats-provider.tsx # PendingChatsProvider (chat writes, sidebar reads)
│   └── hooks/                        # ONLY truly generic hooks (2-3 max)
│       ├── use-mobile.ts
│       └── use-debounce.ts
│
├── proxy.ts                          # Next.js 16 proxy (was middleware.ts): auth guard + rate limiting
├── scripts/
│   └── check-imports.mjs             # Import boundary enforcement CI script (see §3 allowlist)
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
| Server Actions | `camelCase` verb-first | `deleteChat`, `voteOnMessage`, `updateChatVisibility` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_CHAT_MODEL` |
| Types/Interfaces | `PascalCase` | `ChatSessionValue`, `UIArtifact`, `ArtifactKind` |
| Zod schemas | `camelCase` with `Schema` suffix | `chatSchema`, `loginSchema`, `artifactSchema` |
| Route handlers | HTTP method exports | `GET`, `POST`, `DELETE` |
| Data access fns | `camelCase` verb-noun | `getChatById`, `getArtifactById`, `saveArtifactVersion` |
| Cache tags | `entity:{id}` template | `'chat:{id}'`, `'chats:{userId}'`, `'artifact:{id}'`, `'votes:{chatId}'`, `'models'` |

> **Updated per Wave 4 reconciliation (CI-5, 2026-03-02):** Added `chats:{userId}` and
> `models` to cache tag examples for completeness.

<!-- audit: CI-5 — cache tag examples expanded -->

| Data stream parts | `artifact-` or `chat-` prefix | `'artifact-textDelta'`, `'chat-title'` |
| Revalidation fns | verb-entity | `invalidateChat()` (SA), `refreshChat()` (RH) |
| Cache keys | `camelCase` factory | `cacheKeys.chat(id)` |
| CSS classes | Tailwind utility classes; avoid bespoke global class systems | `className="flex gap-2 md:hidden"` |

### File Suffixes

| Type | Suffix | Example |
|------|--------|---------|
| Component | `.tsx` | `chat-shell.tsx` |
| Server action | `.ts` | `delete-chat.ts` |
| Hook | `.ts` with `use-` prefix | `use-chat-session.ts` |
| Schema | `.schema.ts` | `chat.schema.ts` |
| Types | `.types.ts` | `artifact.types.ts` |
| Test | `.test.ts` / `.test.tsx` | `stream-chat.test.ts` |
| E2E test | `.spec.ts` | `chat.spec.ts` |
| Mock file | `.mock.ts` | `session.mock.ts` |
| Fixture file | `.fixture.ts` | `chat.fixture.ts` |

<!-- C2-W4: SOFT-010 fix -->

**Note**: The spec used `.action.ts` suffix for server actions. We drop this — the `actions/`
directory already communicates intent. Extra suffixes add noise.

<!-- C2-W4-FIXUP: ErrorCode drift fix -->
### Error Code Structured Naming

Error codes follow the `type:surface:detail` pattern:

```typescript
// Examples:
'bad_request:chat:invalid_model_id'
'unauthorized:auth:no_session'
'forbidden:chat:owner_mismatch'
'rate_limit:api:too_many_requests'
```

Core `type` values: `bad_request`, `unauthorized`, `forbidden`, `not_found`, `rate_limit`, `ai_error`, `internal_error`.
This keeps API and Server Action error contracts consistent across features.

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
4. **`features/`** — `@/features/chat/hooks/use-chat-session`
5. **Relative imports** — `./message`, `../hooks/use-chat-session`

Separate each group with a blank line.

### `import type` Enforcement

Use `import type` for type-only imports. This ensures types are erased at compile time
and prevents unintended side effects:

```typescript
import type { Chat } from '@/lib/types'
import type { UIArtifact } from '@/lib/types/artifact.types'
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

### Cross-Feature Communication Ban: No `window.dispatchEvent`

> **Added per Wave 4 reconciliation (CI-4, 2026-03-02):** Elevates redesign non-negotiable
> constraint #10 to a named convention rule.

<!-- audit: CI-4 — window.dispatchEvent ban codified as named principle -->

**`window.dispatchEvent` is FORBIDDEN for cross-feature communication.** All cross-feature
data flows must use typed APIs: React Context, props, Server Actions, or the documented
cross-feature import exceptions above. The `window.dispatchEvent` pattern bypasses type
safety, is untraceable by static analysis, and creates hidden coupling between features.

Known removed usages (from old codebase):
- `window.dispatchEvent('chat-title-updated')` — replaced by `PendingChats.updateTitle()` single channel
- `pollForTitle()` 3×500ms — replaced by server-awaited title before stream close

This ban is enforced by `grep -r "window.dispatchEvent"` in P7-T13's verification checklist.

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

### Cross-Feature Import Exceptions

> **Updated per Wave 4 reconciliation (CR-1/SB-W3, 2026-03-02):** Expanded from 5 to 7
> exceptions. Added annotation-based override principle. `deleteChat`/`deleteAllChats`
> and `updateChatVisibility` annotated as consumed by sidebar.

<!-- audit: CR-1 — annotation-based override principle added -->
<!-- audit: SB-W3, CR-1 — 5 curated boundary exceptions documented -->

**Principle:** Public exports annotated with consumer lists in §1 (directory structure)
override the FORBIDDEN restrictions in the table above for those named consumers. This
makes the exception mechanism systematic, not ad-hoc.

The following cross-feature implementation imports are intentionally allowed beyond the `lib/types/*` contract layer:

| Import | From | To | Rationale |
|--------|------|----|-----------|
| `artifactStore` | `features/artifacts/lib/artifact-store.ts` | `features/chat/components/stream-bridge.tsx` | Single mediation point for stream→artifact state |
| `useSettings()` | `features/settings/hooks/use-settings.ts` | `features/chat/hooks/use-chat-session.ts` | Settings affect chat behavior (temperature, reasoning) |
| `VoteButtons` | `features/voting/components/vote-buttons.tsx` | `features/chat/components/message.tsx` | UI composition — voting is per-message |
| `VisibilitySelector` | `features/visibility/components/visibility-selector.tsx` | `features/chat/components/chat-header.tsx` | UI composition — visibility is per-chat |
| `ModelSelector` | `features/models/components/model-selector.tsx` | `features/chat/components/chat-header.tsx` | UI composition — model selection is per-chat |
| `ArtifactPreview` | `features/artifacts/components/artifact-preview.tsx` | `features/chat/components/message.tsx` | UI composition — inline artifact preview in messages <!-- Wave 4: CONF-035 --> |
| `ArtifactToolResult` | `features/artifacts/components/artifact-tool-result.tsx` | `features/chat/components/message.tsx` | UI composition — tool call result card for artifacts <!-- Wave 4: CONF-035 --> |
| `deleteChat`, `deleteAllChats` | `features/chat/actions/delete-chat.ts`, `delete-all-chats.ts` | `features/sidebar/components/sidebar-history-item.tsx` | Sidebar triggers chat deletion; annotated consumer |
| `updateChatVisibility` | `features/visibility/actions/update-visibility.ts` | `features/sidebar/components/sidebar-history-item.tsx` | Sidebar triggers visibility change via Share submenu; annotated consumer |
| `useChatVisibility` | `features/visibility/hooks/use-chat-visibility.ts` | `features/sidebar/components/sidebar-history-item.tsx` | Sidebar reads/updates per-chat visibility state; direct hook import per oldapp pattern <!-- W4-CYCLE1: SOFT-007 fix --> |

All other cross-feature imports must go through shared types in `lib/types/*`.

> **`scripts/check-imports.mjs` reconciliation:** The CI import-boundary script must
> include an allowlist that matches every row in the table above. When adding or
> removing a cross-feature exception, update both this table and the allowlist in
> `scripts/check-imports.mjs` to keep them in sync.

---

## 4. File Placement Decision Tree

```
START: Where does this code belong?

Is it a Next.js routing file (page, layout, route, error, loading)?
├── YES → app/[route-group]/
└── NO ↓

Is it a React component that needs browser-only capabilities?
├── NO → Keep as SERVER component by default
└── YES (state/effects/events/browser APIs/context hooks) → add `'use client'`

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
