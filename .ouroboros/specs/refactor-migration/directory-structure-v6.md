# Directory Structure v6

> Matches [architecture-v6-final.md](architecture-v6-final.md)

## Overview

| Directory | Purpose | File Count |
|-----------|---------|------------|
| app/ | Routes, layouts | ~25 |
| features/ | Feature modules | ~85 |
| components/ | Shared components (ai-elements: ~30, ai wrappers: ~25, ui: ~20) | ~85 |
| lib/ | Infrastructure (incl. api, settings, ui) | ~55 |
| src/ | Utilities, types, errors, services | ~30 |
| **Total** | | **~274** |

> **Note**: v6 intentionally simplifies v5 by:
> - Merging `shared/` into `components/` and `lib/`
> - Using Repository pattern in lib/data/ for cache optimization
> - Two-layer AI components: read-only primitives (`ai-elements/`) + project wrappers (`ai/`)

31 **wrapper components** for AI-related content display.

> **Note**: These are UI wrappers, NOT Vercel AI SDK wrappers. They wrap AI-related content (messages, reasoning, tools) with consistent styling and compound component patterns.

## 1. app/ (Routes & Layouts)

```
app/
├── layout.tsx                        # Root layout with providers
├── globals.css                       # Global styles
├── not-found.tsx                     # 404 page
├── error.tsx                         # Error boundary
│
├── (auth)/                           # Auth route group
│   ├── layout.tsx                    # Auth layout (centered card)
│   ├── login/
│   │   └── page.tsx                  # <AuthForm mode="login" />
│   └── register/
│       └── page.tsx                  # <AuthForm mode="register" />
│
├── (chat)/                           # Chat route group
│   ├── layout.tsx                    # Chat layout with sidebar
│   ├── page.tsx                      # New chat page
│   └── [id]/
│       └── page.tsx                  # Chat by ID
│
└── api/                              # API routes (SLIM)
    ├── auth/
    │   ├── callback/route.ts         # OAuth token exchange (GET)
    │   ├── guest/route.ts            # Guest JWT creation (POST)
    │   ├── logout/route.ts           # Session termination (POST)
    │   └── [...nextauth]/route.ts    # NextAuth handlers
    ├── chat/
    │   ├── route.ts                  # Main chat streaming (POST)
    │   └── [id]/
    │       ├── messages/route.ts     # Paginated message fetch (GET)
    │       └── reconnect/route.ts    # SSE reconnection (GET)
    ├── artifact/route.ts             # Artifact CRUD
    ├── files/
    │   └── upload/route.ts           # File uploads - Vercel Blob (POST)
    ├── health/route.ts               # Health check endpoint (GET)
    ├── history/route.ts              # Chat history listing (GET)
    ├── suggestions/route.ts          # AI suggestions (GET)
    └── vote/route.ts                 # Message voting (POST/PATCH)
```

**File Count**: ~25 files

---

## 2. features/ (Feature Modules)

### 2.1 features/chat/

```
features/chat/
├── actions/
│   ├── stream-chat.action.ts         # Main chat streaming action
│   ├── save-message.action.ts        # Save message to DB
│   └── get-suggestions.action.ts     # AI suggestions
│
├── components/
│   ├── chat.tsx                      # Main chat container
│   ├── chat-header.tsx               # Header with model selector
│   ├── data-stream-handler.tsx       # SSE event consumer
│   ├── data-stream-provider.tsx      # Stream state provider
│   ├── greeting.tsx                  # Welcome/onboarding message
│   ├── messages.tsx                  # Message list
│   ├── message.tsx                   # Single message
│   ├── message-actions.tsx           # Copy, edit, delete
│   ├── message-editor.tsx            # Edit mode
│   ├── message-reasoning.tsx         # AI reasoning display
│   ├── multimodal-input.tsx          # Text + attachments
│   ├── submit-button.tsx             # Send button
│   ├── suggested-actions.tsx         # Suggested prompt chips
│   ├── toolbar.tsx                   # Chat toolbar
│   ├── visibility-selector.tsx       # Public/private toggle
│   └── weather.tsx                   # Weather display
│
├── hooks/
│   ├── use-chat-visibility.ts        # Visibility toggle
│   ├── use-data-stream.ts            # Data stream context access
│   ├── use-messages.ts               # Message state
│   └── use-optimistic-chats.ts       # Optimistic chat list updates
│
├── schemas/
│   └── chat.schema.ts                # Chat validation schemas
│
└── lib/
    └── tools/                        # AI tools for chat
        ├── index.ts
        ├── weather.tool.ts
        ├── create-document.tool.ts
        ├── update-document.tool.ts
        └── suggestions.tool.ts
```

### 2.1.1 features/chat/lib/tools/

```
features/chat/lib/tools/
├── index.ts
├── weather.tool.ts                   # Weather fetching tool
├── create-document.tool.ts           # Document creation tool
├── update-document.tool.ts           # Document update tool
└── suggestions.tool.ts               # AI suggestions tool
```

### 2.2 features/artifact/ (Unified)

> **Note**: This feature module unifies what was previously split between "artifacts" (UI) and "documents" (data). See ADR-019.

```
features/artifact/
├── types/
│   ├── artifact.ts                   # ArtifactKind, UIArtifact, Artifact (DB entity)
│   └── handlers.ts                   # Handler types
│
├── actions/
│   ├── create-artifact.action.ts     # Create artifact
│   ├── update-artifact.action.ts     # Update artifact
│   └── get-suggestions.action.ts     # AI suggestions for artifact
│
├── components/
│   ├── artifact-panel.tsx            # Main panel container
│   ├── artifact-close.tsx            # Close panel button
│   ├── artifact-actions.tsx          # Artifact toolbar
│   ├── artifact-error-boundary.tsx   # Error boundary for artifacts
│   ├── create-artifact.tsx           # Artifact creation UI
│   ├── preview-attachment.tsx        # File attachment preview
│   ├── document-preview.tsx          # Document preview (merged from features/documents/)
│   ├── document-skeleton.tsx         # Document loading skeleton (merged from features/documents/)
│   └── editors/
│       ├── text-editor.tsx           # TipTap editor
│       ├── code-editor.tsx           # Monaco-based editor
│       ├── image-editor.tsx          # Image manipulation
│       └── sheet-editor.tsx          # Spreadsheet
│
├── handlers/                         # AI stream handlers
│   ├── base.handler.ts               # Base handler class
│   ├── text.handler.ts               # Text artifact handler
│   ├── code.handler.ts               # Code artifact handler
│   ├── image.handler.ts              # Image artifact handler
│   └── sheet.handler.ts              # Sheet artifact handler
│
├── hooks/
│   ├── use-artifact.ts               # Artifact state
│   └── use-artifact-selector.ts      # Select specific artifact state
│
├── schemas/
│   └── artifact.schema.ts            # Artifact validation schemas
│
├── lib/
│   └── editor/
│       ├── suggestions.ts            # TipTap suggestions
│       ├── renderer.tsx              # Custom renderers
│       └── diff.ts                   # Diff utilities
│
└── renderers/                        # Artifact type renderers
    ├── code/
    │   ├── client.tsx
    │   └── server.ts
    ├── text/
    │   ├── client.tsx
    │   └── server.ts
    ├── image/
    │   └── client.tsx
    └── sheet/
        ├── client.tsx
        └── server.ts
```

### 2.2.1 features/artifact/renderers/

```
features/artifact/renderers/
├── code/
│   ├── client.tsx                    # Code editor client component
│   └── server.ts                     # Server-side code processing
├── text/
│   ├── client.tsx                    # Text editor client component
│   └── server.ts                     # Server-side text processing
├── image/
│   └── client.tsx                    # Image editor client component
└── sheet/
    ├── client.tsx                    # Spreadsheet client component
    └── server.ts                     # Server-side sheet processing
```

### 2.3 features/auth/

```
features/auth/
├── actions/
│   ├── login.action.ts               # Login logic
│   ├── register.action.ts            # Registration logic
│   └── logout.action.ts              # Logout logic
│
└── schemas/
    └── auth.schema.ts                # Auth validation schemas
```

### 2.4 features/sidebar/

```
features/sidebar/
├── actions/
│   ├── get-history.action.ts
│   └── delete-chat.action.ts
├── components/
│   ├── sidebar-history.tsx
│   ├── sidebar-history-item.tsx
│   └── sidebar-skeleton.tsx
└── hooks/
    └── use-sidebar-state.ts
```

### 2.5 features/settings/

```
features/settings/
├── actions/
│   └── update-settings.action.ts
├── components/
│   ├── settings-panel.tsx
│   ├── model-selector.tsx
│   └── theme-toggle.tsx
└── schemas/
    └── settings.schema.ts
```

### 2.6 ~~features/documents/~~ (REMOVED)

> **Merged into features/artifact/** — See ADR-019: Artifact-Document Unification
> - `document-preview.tsx` → `features/artifact/components/document-preview.tsx`
> - `document-skeleton.tsx` → `features/artifact/components/document-skeleton.tsx`
> - `document.action.ts` → Merged into artifact actions
> - `document.schema.ts` → Merged into `artifact.schema.ts`

**Total features/ File Count**: ~80 files

---

## 3. components/ (Shared Components)

### 3.1 src/components/ai-elements/ (30 files) - READ-ONLY

Copied from `archive/oldapp/components/elements/`. Never modify directly.

| File | Purpose | LOC |
|------|---------|-----|
| artifact.tsx | Artifact container (compound) | ~200 |
| canvas.tsx | ReactFlow visual canvas | ~150 |
| chain-of-thought.tsx | AI thinking steps | ~180 |
| checkpoint.tsx | Conversation checkpoints | ~50 |
| code-block.tsx | Syntax-highlighted code | ~250 |
| confirmation.tsx | Tool approval dialogs | ~120 |
| connection.tsx | ReactFlow connections | ~30 |
| context.tsx | Token/context display | ~80 |
| controls.tsx | ReactFlow controls | ~20 |
| conversation.tsx | Auto-scroll container | ~150 |
| edge.tsx | ReactFlow edges | ~100 |
| image.tsx | AI image display | ~120 |
| inline-citation.tsx | Source citations | ~300 |
| lazy.tsx | Dynamic imports | ~100 |
| loader.tsx | Spinner | ~20 |
| message.tsx | Chat message (compound) | ~400 |
| model-selector.tsx | Model picker | ~350 |
| node.tsx | ReactFlow nodes | ~180 |
| open-in-chat.tsx | Share to external AI | ~200 |
| panel.tsx | ReactFlow panel | ~30 |
| plan.tsx | Task/plan cards | ~250 |
| prompt-input.tsx | Chat input | ~1450 |
| queue.tsx | Task queue | ~100 |
| reasoning.tsx | AI reasoning | ~150 |
| shimmer.tsx | Loading shimmer | ~30 |
| sources.tsx | Source citations | ~200 |
| suggestion.tsx | Suggestion pills | ~80 |
| task.tsx | Task items | ~180 |
| tool.tsx | Tool invocations | ~200 |
| toolbar.tsx | ReactFlow toolbar | ~20 |
| web-preview.tsx | Iframe preview | ~250 |
| **index.ts** | Barrel export | ~50 |

**Total: ~5,500 LOC**

### 3.2 components/ai/ (31 wrapper modules)

Project-specific wrappers importing from ai-elements/.

| Module | Wrapper | Wraps | Added Functionality |
|--------|---------|-------|---------------------|
| message/ | AIMessage | message.tsx | Copy, edit, delete, feedback |
| chat-input/ | AIChatInput | prompt-input.tsx | Form submission, validation |
| conversation/ | AIConversation | conversation.tsx | State provider, optimistic updates |
| thinking/ | AIThinking | chain-of-thought.tsx | Streaming, auto-collapse |
| thinking/ | AIReasoning | reasoning.tsx | Duration tracking |
| code/ | AICodeBlock | code-block.tsx | Copy toast, run action |
| tool/ | AIToolCall | tool.tsx | Registry, validation |
| tool/ | AIConfirmation | confirmation.tsx | Persistence, undo |
| model-selector/ | AIModelSelector | model-selector.tsx | Fetch models, pricing |
| citations/ | AICitation | inline-citation.tsx | Preview fetch, tracking |
| citations/ | AISources | sources.tsx | Expandable previews |
| content/ | AIImage | image.tsx | Download, fullscreen |
| content/ | AIWebPreview | web-preview.tsx | Sandbox, reload |
| workflow/ | AIPlan, AITask, AIQueue, AICheckpoint | plan, task, queue, checkpoint | Tracking, actions |
| canvas/ | AICanvas | canvas, node, edge, etc. | Node registry, undo/redo |
| utilities/ | AILoader, AIShimmer, etc. | loader, shimmer, etc. | Variants |

### 3.3 components/ai/ (AI Chat Primitives) - Legacy Reference

31 compound components from `archive/oldapp/components/elements/`:

```
components/ai/
├── chat/                             # Core chat primitives
│   ├── conversation.tsx              # Scrollable chat container with auto-scroll (104 LOC)
│   ├── message.tsx                   # Message with branching support (446 LOC)
│   └── prompt-input.tsx              # Full-featured input with attachments (1450 LOC)
│
├── reasoning/                        # AI reasoning display
│   ├── chain-of-thought.tsx          # Collapsible CoT display (236 LOC)
│   └── reasoning.tsx                 # Streaming reasoning (204 LOC)
│
├── tools/                            # Tool call UI
│   ├── tool.tsx                      # Tool visualization with status (175 LOC)
│   └── confirmation.tsx              # Human-in-the-loop approval (189 LOC)
│
├── content/                          # Content renderers
│   ├── code-block.tsx                # Syntax-highlighted code (204 LOC)
│   ├── image.tsx                     # AI-generated images (120 LOC)
│   └── web-preview.tsx               # Iframe preview with nav (269 LOC)
│
├── canvas/                           # ReactFlow wrappers
│   ├── canvas.tsx                    # Main canvas (22 LOC)
│   ├── node.tsx                      # Node wrapper (73 LOC)
│   ├── edge.tsx                      # Edge rendering (150 LOC)
│   ├── connection.tsx                # Connection lines (28 LOC)
│   ├── controls.tsx                  # Zoom/pan controls (18 LOC)
│   ├── panel.tsx                     # Canvas panels (16 LOC)
│   └── toolbar.tsx                   # Node toolbar (17 LOC)
│
├── citations/                        # Citation handling
│   ├── inline-citation.tsx           # Inline citations with hover (299 LOC)
│   └── sources.tsx                   # Collapsible sources list (72 LOC)
│
├── workflow/                         # Planning & workflow
│   ├── plan.tsx                      # Plan/task list display (130 LOC)
│   ├── task.tsx                      # Task items (85 LOC)
│   ├── queue.tsx                     # Message queue (280 LOC)
│   └── checkpoint.tsx                # Checkpoints (67 LOC)
│
├── artifacts/                        # Artifact containers
│   └── artifact.tsx                  # Artifact with header/actions (148 LOC)
│
├── integration/                      # External integrations
│   ├── context.tsx                   # Token/context usage (430 LOC)
│   ├── model-selector.tsx            # Model selection dialog (206 LOC)
│   └── open-in-chat.tsx              # Open in external AI (368 LOC)
│
└── utilities/                        # Shared utilities
    ├── loader.tsx                    # Animated spinner (90 LOC)
    ├── lazy.tsx                      # Dynamic imports (116 LOC)
    ├── shimmer.tsx                   # Streaming shimmer (58 LOC)
    └── suggestion.tsx                # Suggested prompts (57 LOC)
```

**Total LOC**: ~5,500 lines
**File Count**: 31 files

**Component Pattern**:
```typescript
// Compound component with Context
<Reasoning isStreaming={true}>
  <ReasoningTrigger />
  <ReasoningContent>{markdown}</ReasoningContent>
</Reasoning>
```

**Dependencies**:
- `@xyflow/react` - Canvas visualization
- `shiki` - Code highlighting
- `streamdown` - Streaming markdown
- `tokenlens` - Token counting

### 3.2 components/ui/ (shadcn/ui)

```
components/ui/
├── button.tsx
├── input.tsx
├── textarea.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── scroll-area.tsx
├── separator.tsx
├── skeleton.tsx
├── tooltip.tsx
├── avatar.tsx
├── badge.tsx
├── card.tsx
├── sheet.tsx
├── sidebar.tsx
├── collapsible.tsx
├── hover-card.tsx
├── command.tsx
├── carousel.tsx
├── alert.tsx
├── progress.tsx
└── tabs.tsx
```

**File Count**: ~20 files

### 3.3 components/ (Root Shared Components)

```
components/
├── auth-form.tsx                     # Consolidated login/register
├── auth-provider.tsx                 # Authentication context wrapper
├── app-sidebar.tsx                   # Main sidebar
├── sidebar-toggle.tsx                # Toggle button
├── sidebar-user-nav.tsx              # User menu
├── theme-provider.tsx                # Theme context
├── toast.tsx                         # Toast notifications
├── icons.tsx                         # Icon components
└── version-footer.tsx                # Footer with version
```

**File Count**: ~9 files

---

**Total components/**: ~60 files

---

## 4. lib/ (Infrastructure)

### 4.1 lib/data/ (Repository Pattern)

```
lib/data/
├── index.ts                          # Export all repositories
├── repositories/
│   ├── index.ts                      # Export all repos
│   ├── base.repository.ts            # Abstract cache-through base (~200 LOC)
│   ├── chat.repository.ts            # ChatRepository (~150 LOC)
│   ├── message.repository.ts         # MessageRepository (~150 LOC)
│   ├── user.repository.ts            # UserRepository (~100 LOC)
│   └── artifact.repository.ts        # ArtifactRepository (~120 LOC) - unified from Document
├── queries/
│   ├── index.ts
│   ├── chat.queries.ts               # Complex chat queries (joins)
│   └── message.queries.ts            # Complex message queries
└── types.ts
```

> **Note**: Database table is `artifacts` (plural) with `kind` discriminator for different artifact types.

**Base Repository Features:**
- `IReadRepository<T>`: findById, findMany, exists, count
- `IWriteRepository<T, TCreate, TUpdate>`: create, createMany, update, delete, deleteMany
- Cache-through reads with configurable TTL
- Write-through with automatic cache invalidation
- Separate TTL for entities vs lists

### 4.2 lib/db/ (Database)

```
lib/db/
├── index.ts                          # Export client
├── client.ts                         # Drizzle client
├── schema.ts                         # Schema definitions
└── migrations/                       # SQL migrations
    ├── 0000_init.sql
    └── meta/
```

### 4.3 lib/cache/ (Cache)

```
lib/cache/
├── index.ts
├── client.ts                         # Redis/Upstash client
├── keys.ts                           # Cache key definitions
├── quota.ts                          # Usage quota tracking
├── cache-strategies.ts               # Caching strategies (LRU, TTL)
├── cache-invalidation.ts             # Invalidation helpers
├── memory-cache.ts                   # In-memory cache layer
├── tiered-cache.ts                   # Multi-tier cache orchestration
└── cache-metrics.ts                  # Cache hit/miss metrics
```

**keys.ts pattern:**
```typescript
export const cacheKeys = {
  chat: (id: string) => `chat:${id}` as const,
  messages: (chatId: string) => `messages:${chatId}` as const,
  user: (id: string) => `user:${id}` as const,
  userChats: (userId: string) => `user:${userId}:chats` as const,
} as const
```

### 4.4 lib/ai/ (AI Providers)

```
lib/ai/
├── index.ts                          # Export providers
├── registry.ts                       # Model registration and lookup
├── providers.ts                      # Provider configurations
└── prompts.ts                        # System prompts
```

**registry.ts exports:**
- `registerModel(config)` - Register a model configuration
- `getModel(id)` - Get model by ID
- `listModels()` - List all registered models
- `getDefaultModel()` - Get the default model

### 4.5 lib/auth/ (Authentication)

```
lib/auth/
├── index.ts                          # Export auth
├── client.ts                         # Supabase browser client
├── session.ts                        # Session management
├── guest.ts                          # Guest token creation/validation
├── middleware.ts                     # Auth middleware helpers
└── config.ts                         # Auth.js configuration
```

**guest.ts exports:**
- `createGuestToken()` - Create anonymous guest JWT
- `validateGuestToken(token)` - Validate guest token
- `isGuestUser(session)` - Check if session is guest

### 4.6 lib/errors/ (Error Handling)

```
lib/errors/
├── index.ts                          # Export AppError
├── app-error.ts                      # AppError class
├── codes.ts                          # Error codes enum
└── handlers.ts                       # Error handlers
```

### 4.7 lib/hooks/ (Shared Hooks)

```
lib/hooks/
├── index.ts
├── use-debounce.ts                # Debounced value hook
├── use-local-storage.ts           # LocalStorage persistence
├── use-media-query.ts             # CSS media query hook
├── use-mobile.ts                  # Mobile viewport detection
├── use-scroll-to-bottom.ts        # Auto-scroll behavior
└── use-window-size.ts             # Window dimensions
```

Cross-feature hooks that don't belong to a specific feature.

### 4.8 lib/rate-limit/ (Rate Limit Config)

```
lib/rate-limit/
├── index.ts                          # Exports
└── config.ts                         # Route-specific rate limit config
```

**config.ts structure:**
```typescript
export const rateLimitConfig = {
  default: { requests: 60, window: '1m' },
  routes: {
    '/api/chat': { requests: 10, window: '1m' },
    '/api/upload': { requests: 3, window: '1m' },
    '/api/history': { requests: 30, window: '1m' },
    '/api/auth/*': { requests: 5, window: '1m', failClosed: true },
    '/api/artifact': { requests: 60, window: '1m' },
    '/api/suggestions': { requests: 30, window: '1m' },
    '/api/vote': { requests: 30, window: '1m' },
    '/api/chat/*/messages': { requests: 30, window: '1m' },
    '/api/chat/*/reconnect': { requests: 10, window: '1m' },
    '/api/files/upload': { requests: 3, window: '1m' },
  },
  bypass: ['/api/health'],
  ipWhitelist: ['127.0.0.1'],
}
```

### 4.9 lib/api/ (API Utilities)

```
lib/api/
├── index.ts                          # Export all utilities
├── guards.ts                         # Request guards (ensureAuth, ensureOwner, ensureGuest)
├── schemas.ts                        # Zod validation schemas for API routes
├── utils.ts                          # API utilities (parseBody, createResponse)
└── validation.ts                     # Request validation helpers
```

**Exports:**
- `ensureAuth(request)` - Verify authenticated user
- `ensureOwner(userId, resourceId)` - Verify resource ownership
- `ensureGuest()` - Allow guest access
- `validateBody<T>(schema, body)` - Zod body validation
- `createApiResponse(data, status)` - Standardized responses
- `parseBody<T>(request)` - Parse JSON request body

### 4.10 lib/settings/ (Settings Types)

```
lib/settings/
├── index.ts                          # Export all
├── types.ts                          # Settings type definitions
└── defaults.ts                       # Default settings values
```

**Types:**
- `SamplingSettings` - Temperature, topP, maxTokens, etc.
- `SystemPromptSettings` - Custom system prompts
- `ModelSettings` - Default model preferences
- `UserSettings` - Combined user settings

### 4.11 lib/ui/ (UI State)

```
lib/ui/
├── index.ts                          # Export all
├── constants.ts                      # UI configuration constants
├── state.ts                          # UI state atoms (using jotai)
└── settings-context.tsx              # Settings React context
```

**Exports:**
- `UI_CONSTANTS` - Breakpoints, animations, sizing, z-index
- `settingsAtom` - Jotai atom for settings state
- `sidebarOpenAtom` - Sidebar open state
- `themeAtom` - Theme preference atom
- `SettingsProvider` - Settings context provider
- `useSettings()` - Settings hook

### 4.12 lib/middleware/ (Middleware Utilities)

```
lib/middleware/
├── index.ts                          # Export all
├── rate-limit.ts                     # Rate limiting utilities
├── config.ts                         # Middleware configuration
└── deduplication.ts                  # Request deduplication
```

**deduplication.ts exports:**
- `deduplicateRequest(key, handler)` - Deduplicate concurrent identical requests
- `getRequestKey(request)` - Generate unique request key
- `clearDeduplicationCache()` - Clear deduplication cache

**Total lib/ File Count**: ~55 files

---

## 5. src/ (Utilities, Types, Services)

### 5.1 src/types/

```
src/types/
├── index.ts                          # Type exports
├── api.ts                            # API type definitions (ApiResponse, PaginatedResponse)
├── models.types.ts                   # Drizzle-derived model types
├── message-parts.ts                  # Message part type system
├── result.ts                         # Result<T,E> type
└── common.types.ts                   # Shared types
```

**message-parts.ts exports:**
- `TextPart` - Plain text content
- `ImagePart` - Image attachment
- `FilePart` - File attachment
- `ToolCallPart` - Tool call request
- `ToolResultPart` - Tool call result
- `MessagePart` - Union of all part types

### 5.2 src/utils/

```
src/utils/
├── index.ts
├── cn.ts                             # Class name utility
└── format.ts                         # Formatting utilities
```

### 5.3 src/services/

```
src/services/
├── analytics/
│   └── analytics.service.ts
├── telemetry/
│   └── telemetry.service.ts
└── storage/
    └── storage.service.ts
```

### 5.4 src/test/ (Test Utilities)

```
src/test/
├── setup.ts                          # Vitest global setup
├── mocks/
│   ├── db.ts                        # Database mocks
│   ├── cache.ts                     # Cache mocks
│   └── ai.ts                        # AI SDK mocks
└── fixtures/
    └── chat.fixtures.ts             # Test data
```

**File Count**: ~28 files

---

## 6. Root Files

```
/
├── middleware.ts                     # Edge: Rate limiting + auth
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── drizzle.config.ts                 # Drizzle config
├── package.json
├── .env.local                        # Environment variables
└── .env.example                      # Env template
```

---

## 7. Key File Examples

### middleware.ts (Edge Rate Limiting)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
```

### app/api/chat/route.ts (Slim Route)

```typescript
import { streamChatAction } from '@/features/chat/actions/stream-chat.action'

export async function POST(request: Request) {
  const body = await request.json()
  return streamChatAction(body)
}
```

### lib/data/chats.ts (Data Access Layer)

```typescript
import { db } from '@/lib/db'
import { cache } from '@/lib/cache'
import { chats } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const TTL = 3600

export async function getChatById(id: string) {
  const cached = await cache.get(`chat:${id}`)
  if (cached) return cached

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, id)
  })

  if (chat) await cache.set(`chat:${id}`, chat, { ex: TTL })
  return chat
}
```

### components/auth-form.tsx (Consolidated)

```typescript
'use client'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === 'login' ? loginAction : registerAction
  const buttonText = mode === 'login' ? 'Sign In' : 'Create Account'

  return (
    <form action={action}>
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      <button type="submit">{buttonText}</button>
    </form>
  )
}
```

---

## 8. Summary Statistics

| Category | Count |
|----------|-------|
| app/ (routes) | ~25 |
| features/ | ~85 |
| components/ | ~60 |
| lib/ | ~55 |
| src/ | ~30 |
| **Total** | **~274** |

This is a significant reduction from the previous ~787 files through:
- Consolidation (AuthForm)
- Removal of redundant patterns
- Cleaner organization
- Less abstraction layers
