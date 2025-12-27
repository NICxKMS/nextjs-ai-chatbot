# Complete Directory Structure Specification

> **Project**: nextjs-ai-chatbot
> **Architecture**: Full Refresh Implementation (v5-Optimal Aligned)
> **Total Files**: ~757 files
> **Last Updated**: 2024-12-27
> **v5 Alignment**: ✅ Canonical structure applied

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Layer Architecture](#2-layer-architecture)
3. [app/ Directory](#3-app-directory)
4. [features/ Directory](#4-features-directory)
5. [shared/ Directory](#5-shared-directory)
6. [lib/ Directory](#6-lib-directory)
7. [src/ Directory](#7-src-directory)
8. [components/ Directory](#8-components-directory)
9. [tests/ Directory](#9-tests-directory)
10. [Root Configuration](#10-root-configuration)
11. [Import Rules](#11-import-rules)
12. [Design Decisions](#12-design-decisions)

---

## 1. Executive Summary

### 1.1 File Distribution

| Directory | Files | Purpose | Layer |
|-----------|-------|---------|-------|
| `app/` | 83 | Next.js App Router | Presentation |
| `features/` | 265 | Feature modules (+schemas, +constants) | Presentation |
| `shared/` | 133 | Reusable utilities (+ai components) | Cross-cutting |
| `lib/` | 126 | Infrastructure utilities (+repositories) | Infrastructure |
| `src/` | 15 | Cross-cutting concerns (v5 minimal) | Cross-cutting |
| `components/` | 84 | UI components | Presentation |
| `tests/` | 66 | Test infrastructure | Testing |
| Root Config | 20 | Configuration files | Configuration |
| **TOTAL** | **~757** | | |

> **v5 Note**: Reduced from ~864 to ~757 files by simplifying `src/` from elaborate Clean Architecture (~137 files) to v5's minimal cross-cutting pattern (~15 files).

### 1.2 High-Level Structure

```
/
├── app/                    # Next.js App Router (83 files)
├── features/              # Feature modules (265 files)
├── shared/               # Shared utilities (133 files)
├── lib/                  # Infrastructure (126 files)
├── src/                  # Cross-cutting concerns (15 files) ← v5 simplified
├── components/           # UI components (84 files)
├── tests/               # Test infrastructure (66 files)
└── [root config]        # Configuration (20 files)
```

---

## 2. Layer Architecture

### 2.1 Layer Hierarchy

> **v5 Note**: Simplified from 4-layer Clean Architecture to 3-tier pragmatic architecture.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│                    (app/, features/, components/)                   │
│                              ↓ uses                                 │
├─────────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE LAYER                           │
│              (lib/ - data, services, AI, auth, cache)               │
│                              ↓ uses                                 │
├─────────────────────────────────────────────────────────────────────┤
│                      CROSS-CUTTING LAYER                            │
│                   (src/, shared/ - types, errors)                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Dependencies

```mermaid
graph TB
    subgraph Presentation
        app[app/]
        features[features/]
        components[components/]
    end
    
    subgraph Infrastructure
        lib[lib/]
    end
    
    subgraph CrossCutting
        src[src/]
        shared[shared/]
    end
    
    app --> features
    app --> components
    features --> shared
    features --> lib
    components --> shared
    lib --> src
    lib --> shared
```

---

## 3. app/ Directory

> **Files**: 83 | **Layer**: Presentation | **Framework**: Next.js 16.1 App Router

### 3.1 Complete File Tree

```
app/
├── global-error.tsx                  # Global error boundary
├── globals.css                       # Global styles (Tailwind)
├── head.tsx                         # Document head
├── layout.tsx                       # Root layout
├── not-found.tsx                    # 404 page
├── favicon.ico                      # Favicon
│
├── (auth)/
│   ├── layout.tsx                   # Auth layout (centered)
│   ├── login/
│   │   └── page.tsx                 # Login page
│   └── register/
│       └── page.tsx                 # Register page
│
├── (chat)/
│   ├── layout.tsx                   # Chat layout (with sidebar)
│   ├── page.tsx                     # Home/new chat page
│   ├── loading.tsx                  # Loading state
│   ├── error.tsx                    # Error boundary
│   ├── chat-layout-client.tsx       # Client layout wrapper
│   ├── chat-with-slots.tsx          # Chat with artifact slots
│   ├── sidebar-container.tsx        # Sidebar wrapper
│   └── chat/
│       └── [id]/
│           └── page.tsx             # Individual chat page
│
├── (settings)/
│   ├── layout.tsx                   # Settings layout
│   └── settings/
│       ├── page.tsx                 # Settings main page
│       ├── profile/
│       │   └── page.tsx             # Profile settings
│       ├── appearance/
│       │   └── page.tsx             # Appearance settings
│       └── data/
│           └── page.tsx             # Data management
│
└── api/
    ├── auth/
    │   ├── [...nextauth]/
    │   │   └── route.ts             # NextAuth handler
    │   └── session/
    │       └── route.ts             # Session endpoint
    │
    ├── chat/
    │   └── route.ts                 # Chat streaming endpoint
    │
    ├── document/
    │   └── route.ts                 # Document CRUD
    │
    ├── files/
    │   └── upload/
    │       └── route.ts             # File upload endpoint
    │
    ├── history/
    │   └── route.ts                 # Chat history endpoint
    │
    ├── suggestions/
    │   └── route.ts                 # Suggestions endpoint
    │
    ├── vote/
    │   └── route.ts                 # Vote endpoint
    │
    ├── health/
    │   └── route.ts                 # Health check
    │
    ├── healthz/
    │   └── route.ts                 # Kubernetes health
    │
    └── readyz/
        └── route.ts                 # Readiness check
```

### 3.2 Key Files

| File | Purpose | LOC |
|------|---------|-----|
| `layout.tsx` | Root layout with providers | ~50 |
| `(chat)/layout.tsx` | Chat layout with sidebar | ~80 |
| `api/chat/route.ts` | AI streaming endpoint | ~150 |
| `api/document/route.ts` | Document CRUD | ~100 |

---

## 4. features/ Directory

> **Files**: 241 | **Layer**: Presentation | **Pattern**: Feature-first architecture

### 4.1 Feature Summary

| Feature | Components | Hooks | Stores | Types | Schemas | Constants | Utils | Tests | Total |
|---------|------------|-------|--------|-------|---------|-----------|-------|-------|-------|
| chat | 18 | 8 | 3 | 4 | 2 | 2 | 6 | 35 | 78 |
| artifacts | 12 | 4 | 2 | 3 | 2 | 2 | 4 | 22 | 51 |
| auth | 6 | 3 | 1 | 2 | 2 | 2 | 2 | 14 | 32 |
| documents | 8 | 4 | 2 | 3 | 2 | 2 | 3 | 20 | 44 |
| settings | 5 | 2 | 1 | 2 | 2 | 2 | 1 | 11 | 26 |
| sidebar | 6 | 3 | 2 | 2 | 2 | 2 | 2 | 15 | 34 |
| **TOTAL** | **55** | **24** | **11** | **16** | **12** | **12** | **18** | **117** | **265** |

> **v5 Note**: Added `schemas/` and `constants/` folders to all 6 features (+24 files).

### 4.2 Complete File Tree

```
features/
├── index.ts                              # Main barrel export
│
├── chat/
│   ├── index.ts                          # Public API
│   ├── components/
│   │   ├── index.ts
│   │   ├── Chat.tsx                      # Main chat container
│   │   ├── ChatHeader.tsx                # Chat header
│   │   ├── ChatInput.tsx                 # Message input
│   │   ├── ChatMessages.tsx              # Message list
│   │   ├── ChatMessage.tsx               # Single message
│   │   ├── ChatMessageContent.tsx        # Message content
│   │   ├── ChatMessageActions.tsx        # Message actions
│   │   ├── ChatAttachments.tsx           # Attachments
│   │   ├── ChatSuggestions.tsx           # Suggestions
│   │   ├── ChatToolCall.tsx              # Tool call display
│   │   ├── ChatToolResult.tsx            # Tool result
│   │   ├── ChatStreamingText.tsx         # Streaming text
│   │   ├── ChatThinkingIndicator.tsx     # Thinking animation
│   │   ├── ChatErrorBoundary.tsx         # Error boundary
│   │   ├── ChatEmptyState.tsx            # Empty state
│   │   ├── ChatScrollAnchor.tsx          # Scroll anchor
│   │   ├── ChatModelSelector.tsx         # Model selector
│   │   └── ChatVisibilitySelector.tsx    # Visibility toggle
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── use-chat.ts                   # Main chat hook
│   │   ├── use-chat-scroll.ts            # Scroll behavior
│   │   ├── use-chat-input.ts             # Input state
│   │   ├── use-chat-attachments.ts       # Attachments
│   │   ├── use-chat-messages.ts          # Message ops
│   │   ├── use-chat-streaming.ts         # Streaming state
│   │   ├── use-chat-suggestions.ts       # Suggestions
│   │   └── use-chat-keyboard.ts          # Keyboard
│   │
│   ├── stores/
│   │   ├── index.ts
│   │   ├── chat-store.ts                 # Main chat state
│   │   ├── chat-ui-store.ts              # UI state
│   │   └── chat-drafts-store.ts          # Drafts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── chat.types.ts
│   │   ├── message.types.ts
│   │   ├── attachment.types.ts
│   │   └── tool.types.ts
│   │
│   ├── schemas/                          # v5: Zod validation schemas
│   │   ├── index.ts
│   │   ├── chat.schema.ts                # Chat validation
│   │   └── message.schema.ts             # Message validation
│   │
│   ├── constants/                        # v5: Feature-specific constants
│   │   ├── index.ts
│   │   ├── chat.constants.ts             # Chat limits, defaults
│   │   └── message.constants.ts          # Message limits
│   │
│   ├── utils/
│   │   ├── index.ts
│   │   ├── message-parser.ts
│   │   ├── message-formatter.ts
│   │   ├── attachment-validator.ts
│   │   ├── scroll-utils.ts
│   │   ├── keyboard-utils.ts
│   │   └── chat-persistence.ts
│   │
│   └── __tests__/
│       ├── components/
│       ├── hooks/
│       └── utils/
│
├── artifacts/
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── Artifact.tsx
│   │   ├── ArtifactHeader.tsx
│   │   ├── ArtifactActions.tsx
│   │   ├── ArtifactVersions.tsx
│   │   ├── ArtifactDiff.tsx
│   │   ├── CodeArtifact.tsx
│   │   ├── TextArtifact.tsx
│   │   ├── ImageArtifact.tsx
│   │   ├── SheetArtifact.tsx
│   │   ├── MermaidArtifact.tsx
│   │   ├── ArtifactSkeleton.tsx
│   │   └── ArtifactErrorState.tsx
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   ├── schemas/                          # v5: Artifact validation
│   │   ├── index.ts
│   │   ├── artifact.schema.ts
│   │   └── version.schema.ts
│   ├── constants/                        # v5: Artifact constants
│   │   ├── index.ts
│   │   ├── artifact.constants.ts
│   │   └── mime-types.constants.ts
│   ├── utils/
│   └── __tests__/
│
├── auth/
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── AuthProviders.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   └── AuthError.tsx
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   ├── schemas/                          # v5: Auth validation
│   │   ├── index.ts
│   │   ├── login.schema.ts
│   │   └── register.schema.ts
│   ├── constants/                        # v5: Auth constants
│   │   ├── index.ts
│   │   ├── auth.constants.ts
│   │   └── providers.constants.ts
│   ├── utils/
│   └── __tests__/
│
├── documents/
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── DocumentList.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentActions.tsx
│   │   ├── DocumentShareDialog.tsx
│   │   ├── DocumentDeleteDialog.tsx
│   │   ├── DocumentEmptyState.tsx
│   │   ├── DocumentSkeleton.tsx
│   │   └── DocumentFilters.tsx
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   ├── schemas/                          # v5: Document validation
│   │   ├── index.ts
│   │   ├── document.schema.ts
│   │   └── share.schema.ts
│   ├── constants/                        # v5: Document constants
│   │   ├── index.ts
│   │   ├── document.constants.ts
│   │   └── visibility.constants.ts
│   ├── utils/
│   └── __tests__/
│
├── settings/
│   ├── index.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── SettingsLayout.tsx
│   │   ├── SettingsNav.tsx
│   │   ├── ProfileSettings.tsx
│   │   ├── AppearanceSettings.tsx
│   │   └── DataSettings.tsx
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   ├── schemas/                          # v5: Settings validation
│   │   ├── index.ts
│   │   ├── profile.schema.ts
│   │   └── appearance.schema.ts
│   ├── constants/                        # v5: Settings constants
│   │   ├── index.ts
│   │   ├── settings.constants.ts
│   │   └── themes.constants.ts
│   ├── utils/
│   └── __tests__/
│
└── sidebar/
    ├── index.ts
    ├── components/
    │   ├── index.ts
    │   ├── Sidebar.tsx
    │   ├── SidebarHeader.tsx
    │   ├── SidebarHistory.tsx
    │   ├── SidebarHistoryItem.tsx
    │   ├── SidebarFooter.tsx
    │   └── SidebarSkeleton.tsx
    ├── hooks/
    ├── stores/
    ├── types/
    ├── schemas/                          # v5: Sidebar validation
    │   ├── index.ts
    │   ├── history.schema.ts
    │   └── filter.schema.ts
    ├── constants/                        # v5: Sidebar constants
    │   ├── index.ts
    │   ├── sidebar.constants.ts
    │   └── history.constants.ts
    ├── utils/
    └── __tests__/
```

### 4.3 Feature Module Structure Pattern

Each feature follows this standard structure (v5 aligned):
```
features/[name]/
├── index.ts                    # Public exports
├── components/
│   ├── index.ts               # Component barrel
│   └── [Component].tsx        # Each component file
├── hooks/
│   ├── index.ts               # Hook barrel
│   └── use-[name].ts          # Each hook file
├── stores/
│   ├── index.ts               # Store barrel
│   └── [name]-store.ts        # Zustand store
├── types/
│   ├── index.ts               # Type barrel
│   └── [name].types.ts        # Type definitions
├── schemas/                    # v5: Zod validation schemas
│   ├── index.ts               # Schema barrel
│   └── [name].schema.ts       # Validation schemas
├── constants/                  # v5: Feature constants
│   ├── index.ts               # Constants barrel
│   └── [name].constants.ts    # Feature-specific constants
├── utils/
│   ├── index.ts               # Util barrel
│   └── [name].utils.ts        # Utility functions
└── __tests__/
    ├── components/            # Component tests
    ├── hooks/                 # Hook tests
    └── utils/                 # Util tests
```

---

## 5. shared/ Directory

> **Files**: 133 | **Layer**: Cross-cutting | **Pattern**: Shared utilities and components

### 5.1 Complete File Tree

```
shared/
├── index.ts                              # Main barrel export
│
├── components/
│   ├── index.ts
│   ├── ai/                               # v5: AI wrapper components
│   │   ├── index.ts
│   │   ├── code-block.tsx                # Code syntax highlighting
│   │   ├── confirmation.tsx              # AI confirmation dialogs
│   │   ├── context.tsx                   # AI context provider
│   │   ├── conversation.tsx              # Conversation wrapper
│   │   ├── image.tsx                     # AI-generated images
│   │   ├── inline-citation.tsx           # Source citations
│   │   ├── loader.tsx                    # AI loading states
│   │   ├── message.tsx                   # AI message renderer
│   │   ├── reasoning.tsx                 # Chain-of-thought display
│   │   ├── shimmer.tsx                   # Skeleton shimmer
│   │   ├── sources.tsx                   # Source list display
│   │   ├── suggestion.tsx                # Suggestion chips
│   │   ├── task.tsx                      # Task progress display
│   │   └── tool.tsx                      # Tool call display
│   ├── icons/
│   │   ├── index.ts
│   │   ├── AiIcon.tsx
│   │   ├── SendIcon.tsx
│   │   ├── StopIcon.tsx
│   │   ├── CopyIcon.tsx
│   │   ├── CheckIcon.tsx
│   │   ├── TrashIcon.tsx
│   │   ├── EditIcon.tsx
│   │   ├── PlusIcon.tsx
│   │   ├── MenuIcon.tsx
│   │   ├── CloseIcon.tsx
│   │   ├── ChevronIcon.tsx
│   │   ├── SpinnerIcon.tsx
│   │   └── ...                           # 20+ icons
│   ├── feedback/
│   │   ├── index.ts
│   │   ├── Toast.tsx
│   │   ├── Toaster.tsx
│   │   ├── Alert.tsx
│   │   └── Banner.tsx
│   └── layout/
│       ├── index.ts
│       ├── Container.tsx
│       ├── Stack.tsx
│       └── Grid.tsx
│
├── constants/
│   ├── index.ts
│   ├── app.constants.ts                  # App-wide constants
│   ├── routes.constants.ts               # Route definitions
│   ├── api.constants.ts                  # API paths
│   ├── keys.constants.ts                 # Storage keys
│   ├── limits.constants.ts               # Rate limits
│   └── regex.constants.ts                # Common patterns
│
├── hooks/
│   ├── index.ts
│   ├── use-debounce.ts                   # Debounce hook
│   ├── use-throttle.ts                   # Throttle hook
│   ├── use-local-storage.ts              # Local storage
│   ├── use-session-storage.ts            # Session storage
│   ├── use-media-query.ts                # Media queries
│   ├── use-is-mounted.ts                 # Mount state
│   ├── use-previous.ts                   # Previous value
│   ├── use-interval.ts                   # Interval hook
│   ├── use-timeout.ts                    # Timeout hook
│   ├── use-click-outside.ts              # Click outside
│   ├── use-keyboard-shortcut.ts          # Keyboard shortcuts
│   ├── use-copy-to-clipboard.ts          # Clipboard
│   ├── use-toggle.ts                     # Toggle state
│   ├── use-async.ts                      # Async state
│   └── use-intersection-observer.ts      # Intersection observer
│
├── services/
│   ├── index.ts
│   ├── logger.service.ts                 # Logging service
│   ├── storage.service.ts                # Storage abstraction
│   ├── analytics.service.ts              # Analytics wrapper
│   └── error-reporter.service.ts         # Error reporting
│
├── types/
│   ├── index.ts
│   ├── common.types.ts                   # Common types
│   ├── result.types.ts                   # Result type (Railway)
│   ├── async.types.ts                    # Async types
│   ├── utility.types.ts                  # Utility types
│   └── branded.types.ts                  # Branded types
│
├── ui/
│   ├── index.ts
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── Radio.tsx
│   ├── Switch.tsx
│   ├── Label.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Card.tsx
│   ├── Dialog.tsx
│   ├── Dropdown.tsx
│   ├── Popover.tsx
│   ├── Tooltip.tsx
│   ├── Tabs.tsx
│   ├── Accordion.tsx
│   ├── Separator.tsx
│   ├── Skeleton.tsx
│   ├── Progress.tsx
│   ├── Spinner.tsx
│   └── VisuallyHidden.tsx
│
├── utils/
│   ├── index.ts
│   ├── cn.ts                             # classnames helper
│   ├── format-date.ts                    # Date formatting
│   ├── format-number.ts                  # Number formatting
│   ├── format-file-size.ts               # File size
│   ├── truncate.ts                       # String truncation
│   ├── slugify.ts                        # Slug generation
│   ├── deep-merge.ts                     # Deep merge
│   ├── deep-clone.ts                     # Deep clone
│   ├── is-empty.ts                       # Empty check
│   ├── is-equal.ts                       # Equality check
│   ├── random-id.ts                      # ID generation
│   ├── retry.ts                          # Retry logic
│   ├── sleep.ts                          # Promise delay
│   └── invariant.ts                      # Invariant check
│
└── __tests__/
    ├── hooks/
    ├── utils/
    └── services/
```

### 5.2 Key Exports

| Export | Type | Purpose |
|--------|------|---------|
| `Result<T, E>` | Type | Railway-oriented programming |
| `cn()` | Utility | Tailwind class merging |
| `useDebounce()` | Hook | Debounce values |
| `useLocalStorage()` | Hook | Persistent storage |
| `Logger` | Service | Structured logging |
| `isUUID()` | Utility | UUID validation |

### 5.3 Runtime Compatibility

| Module | Server | Client | Edge |
|--------|--------|--------|------|
| `constants/` | ✅ | ✅ | ✅ |
| `types/` | ✅ | ✅ | ✅ |
| `utils/` | ✅ | ✅ | ✅ |
| `hooks/` | ❌ | ✅ | ❌ |
| `services/` | ✅ | ✅ | ⚠️ |
| `ui/` | ✅ | ✅ | ❌ |
| `components/` | ✅ | ✅ | ❌ |

---

## 6. lib/ Directory

> **Files**: 126 | **Layer**: Infrastructure | **Pattern**: Framework utilities

### 6.1 Complete File Tree

```
lib/
├── index.ts                              # Main barrel export
│
├── ai/
│   ├── index.ts
│   ├── provider.ts                       # AI SDK provider setup
│   ├── models.ts                         # Model definitions
│   ├── tools/                            # v5: .tool.ts suffix convention
│   │   ├── index.ts
│   │   ├── web-search.tool.ts            # Web search tool
│   │   ├── get-weather.tool.ts           # Weather tool
│   │   ├── create-document.tool.ts       # Document creation
│   │   ├── request-suggestions.tool.ts   # Suggestions tool
│   │   └── code-exec.tool.ts             # Code execution tool
│   └── prompts/
│       ├── index.ts
│       ├── system.ts                     # System prompts
│       ├── regular.ts                    # Regular prompts
│       └── artifacts.ts                  # Artifact prompts
│
├── api/
│   ├── index.ts
│   ├── fetcher.ts                        # Fetch wrapper
│   ├── client.ts                         # API client
│   ├── error-handler.ts                  # Error handling
│   └── response-builder.ts               # Response helpers
│
├── auth/
│   ├── index.ts
│   ├── config.ts                         # NextAuth config
│   ├── providers.ts                      # Auth providers
│   ├── callbacks.ts                      # Auth callbacks
│   └── session.ts                        # Session utilities
│
├── cache/
│   ├── index.ts
│   ├── cache-client.ts                   # Cache abstraction
│   ├── memory-cache.ts                   # In-memory cache
│   ├── redis-cache.ts                    # Redis cache
│   └── keys.ts                           # v5: Renamed from cache-keys.ts
│
├── cache-ops/
│   ├── index.ts
│   ├── chat-cache.ts                     # Chat caching
│   ├── user-cache.ts                     # User caching
│   └── document-cache.ts                 # Document caching
│
├── config/
│   ├── index.ts
│   ├── env.ts                            # Environment config
│   ├── feature-flags.ts                  # Feature flags
│   ├── app-config.ts                     # App configuration
│   └── sentry.config.ts                  # Sentry config
│
├── data/
│   ├── index.ts
│   ├── chat-data.ts                      # Chat data access
│   ├── message-data.ts                   # Message data access
│   ├── document-data.ts                  # Document data access
│   ├── vote-data.ts                      # Vote data access
│   └── repositories/                     # v5: Repository Pattern (Pattern 10)
│       ├── index.ts
│       ├── base.repository.ts            # Abstract base repository
│       ├── chat.repository.ts            # Chat repository
│       ├── message.repository.ts         # Message repository
│       ├── document.repository.ts        # Document repository
│       └── user.repository.ts            # User repository
│
├── db/
│   ├── index.ts
│   ├── client.ts                         # Drizzle client
│   ├── schema/
│   │   ├── index.ts
│   │   ├── users.ts                      # User schema
│   │   ├── chats.ts                      # Chat schema
│   │   ├── messages.ts                   # Message schema
│   │   ├── documents.ts                  # Document schema
│   │   ├── suggestions.ts                # Suggestion schema
│   │   └── votes.ts                      # Vote schema
│   └── migrations/
│       └── ...                           # Migration files
│
├── editor/
│   ├── index.ts
│   ├── config.ts                         # Editor config
│   ├── extensions.ts                     # Editor extensions
│   └── toolbar.ts                        # Toolbar config
│
├── errors/
│   ├── index.ts
│   ├── app-error.ts                      # Base error class
│   ├── validation-error.ts               # Validation errors
│   ├── auth-error.ts                     # Auth errors
│   └── not-found-error.ts                # Not found errors
│
├── middleware/
│   ├── index.ts
│   ├── auth.middleware.ts                # Auth middleware
│   ├── rate-limit.middleware.ts          # Rate limiting
│   └── logging.middleware.ts             # Request logging
│
├── providers/
│   ├── index.ts
│   ├── ThemeProvider.tsx                 # Theme provider
│   ├── SessionProvider.tsx               # Session provider
│   ├── QueryProvider.tsx                 # TanStack Query
│   └── ToastProvider.tsx                 # Toast provider
│
├── services/
│   ├── index.ts
│   ├── chat.service.ts                   # Chat operations
│   ├── message.service.ts                # Message operations
│   ├── document.service.ts               # Document operations
│   └── suggestion.service.ts             # Suggestion operations
│
> **Note**: `lib/services/` contains framework-level thin wrappers and orchestration utilities. Business logic orchestration should go in `src/application/services/`. Both are valid; lib/services acts as the bridge between Next.js APIs and domain use-cases.
│
├── types/
│   ├── index.ts
│   ├── database.types.ts                 # DB types (generated)
│   ├── api.types.ts                      # API types
│   └── auth.types.ts                     # Auth types
│
├── utils/
│   ├── index.ts
│   ├── stream-utils.ts                   # Streaming utilities
│   ├── token-utils.ts                    # Token counting
│   ├── message-utils.ts                  # Message helpers
│   └── file-utils.ts                     # File helpers
│
└── __tests__/
    ├── ai/
    ├── api/
    ├── auth/
    ├── cache/
    └── services/
```

### 6.2 Key Exports

| Export | Type | Purpose |
|--------|------|---------|
| `createAIProvider()` | Factory | AI SDK provider creation |
| `db` | Instance | Drizzle database client |
| `auth` | Config | NextAuth configuration |
| `APIClient` | Class | Type-safe API client |
| `AppError` | Class | Base error class |
| `env` | Object | Validated environment |

### 6.3 Runtime Compatibility

| Module | Server | Client | Edge |
|--------|--------|--------|------|
| `ai/` | ✅ | ❌ | ✅ |
| `api/` | ✅ | ✅ | ✅ |
| `auth/` | ✅ | ❌ | ✅ |
| `cache/` | ✅ | ❌ | ⚠️ |
| `config/` | ✅ | ⚠️ | ✅ |
| `db/` | ✅ | ❌ | ❌ |
| `errors/` | ✅ | ✅ | ✅ |
| `providers/` | ✅ | ✅ | ❌ |
| `services/` | ✅ | ❌ | ⚠️ |
| `utils/` | ✅ | ✅ | ✅ |

---

## 7. src/ Directory

> **Files**: 15 | **Layer**: Cross-cutting | **Pattern**: v5-Optimal Minimal Pattern

> **v5 Note**: Simplified from elaborate Clean Architecture (~137 files with domain/application/infrastructure layers) to minimal cross-cutting concerns pattern (~15 files). Business logic now lives in `lib/services/` and `lib/data/repositories/`. This aligns with v5's pragmatic approach.

### 7.1 Complete File Tree

```
src/                                      # Cross-Cutting Concerns ONLY
├── index.ts                              # Public exports
│
├── types/
│   ├── index.ts                          # Type barrel
│   ├── api.types.ts                      # Request/Response types
│   ├── models.types.ts                   # Database model types
│   └── result.ts                         # Result<T,E> pattern
│
├── errors/
│   ├── index.ts                          # Error barrel
│   ├── base.error.ts                     # Abstract base error class
│   └── api.errors.ts                     # HTTP error classes (4xx, 5xx)
│
└── services/
    ├── index.ts                          # Service barrel
    ├── analytics.service.ts              # Analytics integration
    └── telemetry.service.ts              # Telemetry/logging service
```

### 7.2 Key Concepts

| Module | Purpose | Used By |
|--------|---------|---------|
| `types/result.ts` | Railway-oriented error handling | All layers |
| `types/api.types.ts` | HTTP request/response contracts | `app/api/`, `lib/api/` |
| `types/models.types.ts` | Database entity types | `lib/db/`, `lib/data/` |
| `errors/base.error.ts` | Extensible error base class | All error types |
| `errors/api.errors.ts` | HTTP status-aware errors | API routes |
| `services/analytics.service.ts` | Usage tracking | `app/`, `features/` |
| `services/telemetry.service.ts` | Structured logging, traces | All layers |

### 7.3 Result<T, E> Pattern

```typescript
// src/types/result.ts
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export const ok = <T>(data: T): Result<T, never> => ({ success: true, data });
export const err = <E>(error: E): Result<never, E> => ({ success: false, error });

// Usage in lib/services/
import { Result, ok, err } from '@/src/types';

async function getChat(id: string): Promise<Result<Chat, AppError>> {
  const chat = await db.query.chats.findFirst({ where: eq(chats.id, id) });
  if (!chat) return err(new NotFoundError('Chat not found'));
  return ok(chat);
}
```

### 7.4 API Error Classes

```typescript
// src/errors/api.errors.ts
export class BadRequestError extends BaseError {
  readonly status = 400;
}

export class UnauthorizedError extends BaseError {
  readonly status = 401;
}

export class ForbiddenError extends BaseError {
  readonly status = 403;
}

export class NotFoundError extends BaseError {
  readonly status = 404;
}

export class ConflictError extends BaseError {
  readonly status = 409;
}

export class InternalServerError extends BaseError {
  readonly status = 500;
}
```

### 7.5 Key Exports

| Export | Type | Purpose |
|--------|------|---------|
| `Result<T, E>` | Type | Type-safe error handling |
| `ok()` / `err()` | Function | Result constructors |
| `BaseError` | Class | Extensible error base |
| `NotFoundError` | Class | 404 HTTP error |
| `ValidationError` | Class | 400 HTTP error |
| `Analytics` | Service | Usage tracking |
| `Telemetry` | Service | Logging/tracing |

### 7.6 Migration Note

**Previous Structure (deprecated)**:
```
src/                          # OLD: ~137 files
├── domain/                   # Entities, VOs, Aggregates, Events, Ports
├── application/              # Use cases, DTOs, Mappers, App Services
└── infrastructure/           # Repository impls, External service impls
```

**New Structure (v5-optimal)**:
```
src/                          # NEW: ~15 files
├── types/                    # Shared type definitions
├── errors/                   # Error classes
└── services/                 # Cross-cutting services
```

Business logic that was in `src/domain/` and `src/application/` now lives in:
- `lib/services/` - Service layer operations
- `lib/data/repositories/` - Data access abstraction
- `features/*/stores/` - Feature-specific state

This simplification reduces cognitive overhead while maintaining type safety through the Result pattern.

---

## 8. components/ Directory

> **Files**: 84 | **Layer**: Presentation | **Pattern**: Shared UI components

### 8.1 Complete File Tree

```
components/
├── index.ts                              # Main barrel export
│
├── ui/
│   ├── index.ts
│   ├── primitives/
│   │   ├── index.ts
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── switch.tsx
│   │   ├── slider.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   └── skeleton.tsx
│   ├── feedback/
│   │   ├── index.ts
│   │   ├── alert.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── progress.tsx
│   │   ├── spinner.tsx
│   │   └── tooltip.tsx
│   ├── overlay/
│   │   ├── index.ts
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── popover.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── context-menu.tsx
│   │   └── command.tsx
│   ├── layout/
│   │   ├── index.ts
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── accordion.tsx
│   │   ├── collapsible.tsx
│   │   ├── scroll-area.tsx
│   │   ├── aspect-ratio.tsx
│   │   └── resizable.tsx
│   ├── navigation/
│   │   ├── index.ts
│   │   ├── navigation-menu.tsx
│   │   ├── breadcrumb.tsx
│   │   └── pagination.tsx
│   ├── data-display/
│   │   ├── index.ts
│   │   ├── table.tsx
│   │   ├── data-table.tsx
│   │   └── hover-card.tsx
│   └── form/
│       ├── index.ts
│       ├── form.tsx
│       ├── form-field.tsx
│       └── form-error.tsx
│
├── ai-elements/
│   ├── index.ts
│   ├── streaming/
│   │   ├── index.ts
│   │   ├── streaming-text.tsx
│   │   ├── thinking-indicator.tsx
│   │   └── typing-cursor.tsx
│   ├── artifacts/
│   │   ├── index.ts
│   │   ├── artifact-container.tsx
│   │   ├── code-block.tsx
│   │   ├── markdown-renderer.tsx
│   │   ├── mermaid-diagram.tsx
│   │   ├── image-artifact.tsx
│   │   ├── file-preview.tsx
│   │   └── diff-viewer.tsx
│   ├── tools/
│   │   ├── index.ts
│   │   ├── tool-call.tsx
│   │   ├── tool-result.tsx
│   │   └── tool-progress.tsx
│   └── attachments/
│       ├── index.ts
│       ├── attachment-preview.tsx
│       ├── attachment-list.tsx
│       └── file-uploader.tsx
│
├── providers/
│   ├── index.ts
│   ├── theme-provider.tsx
│   ├── session-provider.tsx
│   ├── toast-provider.tsx
│   ├── sidebar-provider.tsx
│   └── app-providers.tsx
│
> **Note**: This is the canonical location for all React providers. The deprecated `lib/providers/` was removed. All provider components belong here.
│
└── error-context.tsx
```

---

## 9. tests/ Directory

> **Files**: 66 | **Layer**: Testing | **Stack**: Vitest + Playwright + k6

### 9.1 Complete File Tree

```
tests/
├── config/
│   ├── setup.ts
│   ├── vitest.setup.ts
│   ├── playwright.setup.ts
│   ├── test-env.ts
│   └── global-mocks.ts
│
├── __mocks__/
│   ├── @upstash/redis.ts
│   ├── next/navigation.ts
│   ├── next/headers.ts
│   ├── ai.ts
│   ├── db.ts
│   └── services.ts
│
├── utils/
│   ├── index.ts
│   ├── render.tsx
│   ├── test-ids.ts
│   ├── factories/
│   │   ├── index.ts
│   │   ├── user.factory.ts
│   │   ├── chat.factory.ts
│   │   ├── message.factory.ts
│   │   └── document.factory.ts
│   ├── fixtures/
│   │   ├── index.ts
│   │   ├── users.json
│   │   ├── chats.json
│   │   └── messages.json
│   ├── msw/
│   │   ├── index.ts
│   │   ├── server.ts
│   │   ├── handlers/
│   │   │   ├── index.ts
│   │   │   ├── auth.handlers.ts
│   │   │   ├── chat.handlers.ts
│   │   │   └── document.handlers.ts
│   │   └── db.ts
│   └── assertions/
│       ├── index.ts
│       ├── api.assertions.ts
│       └── dom.assertions.ts
│
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── chat.test.ts
│   │   ├── document.test.ts
│   │   ├── vote.test.ts
│   │   └── suggestions.test.ts
│   ├── services/
│   │   ├── chat-service.test.ts
│   │   ├── document-service.test.ts
│   │   └── user-service.test.ts
│   ├── cache/
│   │   ├── redis.test.ts
│   │   └── invalidation.test.ts
│   └── db/
│       ├── migrations.test.ts
│       └── queries.test.ts
│
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts
│   │   └── test-user.ts
│   ├── pages/
│   │   ├── home.spec.ts
│   │   ├── login.spec.ts
│   │   ├── register.spec.ts
│   │   ├── chat.spec.ts
│   │   ├── settings.spec.ts
│   │   └── not-found.spec.ts
│   ├── flows/
│   │   ├── auth-flow.spec.ts
│   │   ├── chat-flow.spec.ts
│   │   ├── document-flow.spec.ts
│   │   └── guest-migration.spec.ts
│   ├── visual/
│   │   ├── snapshots/
│   │   ├── home.visual.spec.ts
│   │   └── chat.visual.spec.ts
│   └── accessibility/
│       ├── home.a11y.spec.ts
│       └── chat.a11y.spec.ts
│
└── load/
    ├── k6.config.ts
    ├── scenarios/
    │   ├── api-load.ts
    │   ├── chat-load.ts
    │   └── concurrent-users.ts
    └── results/.gitkeep
```

### 9.2 Coverage Requirements

| Layer | Target | Enforcement |
|-------|--------|-------------|
| lib/utils/ | 95% | CI blocks |
| lib/services/ | 90% | CI blocks |
| lib/data/ | 85% | CI warns |
| features/ | 80% | CI warns |
| app/ | 70% | Informational |

---

## 10. Root Configuration

> **Files**: 20 | **Purpose**: Project configuration

### 10.1 File List

```
/
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules
├── .npmrc                            # PNPM configuration
├── biome.jsonc                       # Linter/formatter config
├── components.json                   # shadcn/ui config
├── docker-compose.yml                # Local services
├── drizzle.config.ts                 # Drizzle ORM config
├── instrumentation.ts                # Next.js instrumentation
├── middleware.ts                     # Next.js middleware
├── next-env.d.ts                     # Next.js TypeScript
├── next.config.ts                    # Next.js configuration
├── package.json                      # Package manifest
├── playwright.config.ts              # Playwright config
├── pnpm-lock.yaml                    # Lockfile
├── postcss.config.mjs                # PostCSS config
├── README.md                         # Documentation
├── tailwind.config.ts                # Tailwind CSS
├── tsconfig.json                     # TypeScript config
├── vercel.json                       # Vercel deployment
└── vitest.config.ts                  # Vitest config
```

### 10.2 Key Scripts (package.json)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 11. Import Rules

### 11.1 Layer Import Matrix (v5-Optimal)

| From ↓ To → | app/ | features/ | components/ | shared/ | lib/ | src/ |
|-------------|------|-----------|-------------|---------|------|------|
| **app/** | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| **features/** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **components/** | ❌ | ❌ | - | ✅ | ❌ | ✅ |
| **shared/** | ❌ | ❌ | ❌ | - | ❌ | ✅ |
| **lib/** | ❌ | ❌ | ❌ | ✅ | - | ✅ |
| **src/** | ❌ | ❌ | ❌ | ❌ | ❌ | - |

> **v5 Note**: Simplified from 8-column matrix to 6 columns. `src/` is now a cross-cutting leaf dependency that everything can import but imports nothing.

### 11.2 ESLint Enforcement

```javascript
// eslint.config.js
{
  'import/no-restricted-paths': [
    'error',
    {
      zones: [
        // Features cannot import from each other
        { target: './features/**/*', from: './features/**/*', except: ['./features/index.ts'] },
        
        // Shared cannot import from features or lib
        { target: './shared/**/*', from: ['./features/**/*', './lib/**/*'] },
        
        // src/ cannot import from anything
        { target: './src/**/*', from: ['./app/**/*', './features/**/*', './components/**/*', './shared/**/*', './lib/**/*'] },
        
        // lib can only import from shared and src
        { target: './lib/**/*', from: ['./app/**/*', './features/**/*', './components/**/*'] },
      ]
    }
  ]
}
```

> **Implementation**: Configure in `eslint.config.js` or `biome.jsonc` using import restriction rules.

---

## 12. Design Decisions

### ADR-001: Feature-First Architecture
- **Decision**: Organize code by feature, not by technical concern
- **Rationale**: Co-locates related code, enables feature isolation
- **Status**: Accepted

### ADR-002: v5-Optimal Minimal src/ Structure
- **Decision**: Simplify src/ from Clean Architecture to cross-cutting concerns only
- **Rationale**: Reduces cognitive overhead; business logic in lib/services/ and lib/data/repositories/
- **Status**: Accepted (updated from ADR-002)

### ADR-003: Providers in components/, Not lib/
- **Decision**: React providers moved from lib/ to components/
- **Rationale**: lib/ should contain no React components
- **Status**: Accepted

### ADR-004: Barrel Exports
- **Decision**: Every folder has an index.ts exporting its public API
- **Rationale**: Controls public API, enables refactoring
- **Status**: Accepted

### ADR-005: Co-located Tests
- **Decision**: Unit tests in __tests__/ next to source files
- **Rationale**: Tests are close to what they test
- **Status**: Accepted

### ADR-006: Repository Pattern in lib/data/
- **Decision**: Add repositories/ subfolder with base.repository.ts pattern
- **Rationale**: v5 Pattern 10 - abstracts data access, enables testing
- **Status**: Accepted (new)

### ADR-007: Feature Schemas and Constants
- **Decision**: Add schemas/ and constants/ to all feature modules
- **Rationale**: v5 alignment - validation at feature boundary, discoverable constants
- **Status**: Accepted (new)

### ADR-008: Tool File Naming Convention
- **Decision**: AI tools use .tool.ts suffix (e.g., web-search.tool.ts)
- **Rationale**: v5 naming convention - clear identification of tool files
- **Status**: Accepted (new)

---

## Summary Statistics

| Metric | Count | v5 Change |
|--------|-------|-----------|
| **Total Files** | ~757 | ↓107 from ~864 |
| **Source Files** | ~610 | ↓110 |
| **Test Files** | ~220 | (unchanged) |
| **Config Files** | 20 | (unchanged) |
| **Directories** | 8 top-level | (unchanged) |
| **Features** | 6 | (unchanged) |
| **Feature Schemas** | 12 | +12 (new) |
| **Feature Constants** | 12 | +12 (new) |
| **Repositories** | 5 | +5 (new) |
| **UI Components** | 50+ | (unchanged) |
| **AI Wrapper Components** | 14 | +14 (new) |
| **src/ Files** | 15 | ↓122 from 137 |

### v5 Alignment Summary

| Gap | Resolution |
|-----|------------|
| Missing `lib/data/repositories/` | ✅ Added with 5 repository files |
| Tools without `.tool.ts` suffix | ✅ Renamed (5 files) |
| Missing feature `schemas/` | ✅ Added to all 6 features |
| Missing feature `constants/` | ✅ Added to all 6 features |
| `cache-keys.ts` naming | ✅ Renamed to `keys.ts` |
| Elaborate `src/` structure | ✅ Simplified to 15 files |
| Missing `shared/components/ai/` | ✅ Added with 14 components |

---

**Document Generated**: 2024-12-27 by Ouroboros
**v5 Alignment Applied**: 2024-12-27
