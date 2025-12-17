# 00-MASTER-TASK-LIST: Architecture Overhaul

> **Generated**: 2024-12-17  
> **Phase**: 1 - Initial Scan & Task Planning  
> **Status**: COMPLETE

---

## Executive Summary

**Project**: Next.js 16.0.10 AI Chatbot Application  
**Framework**: React 19.2.3 + Turbopack  
**Database**: PostgreSQL (Drizzle ORM) + Upstash Redis  
**AI SDK**: Vercel AI SDK 5.0.26  

**Total Features/Modules Identified**: 87  
**Business Capabilities**: 10 major categories  
**Critical Dependencies**: AI/Chat → Data Layer → Cache Layer → Auth

---

## Table of Contents

1. [Business Capability Inventory](#1-business-capability-inventory)
2. [Priority Matrix](#2-priority-matrix)
3. [Module Dependencies](#3-module-dependencies)
4. [Redesign Task List](#4-redesign-task-list)
5. [Logical Groupings & Boundaries](#5-logical-groupings--boundaries)

---

## 1. Business Capability Inventory

### 1.1 Authentication & Authorization

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Session Management | `lib/auth/session.ts` | JWT-based session handling (Supabase + guest) | Large |
| Supabase Client | `lib/auth/client.ts` | Browser Supabase client | Small |
| Auth Provider | `components/auth-provider.tsx` | React context for auth state | Medium |
| Guest Token System | `lib/auth/session.ts` | Guest user JWT creation/validation | Medium |
| Auth Routes | `app/api/auth/*` | Login, logout, guest bootstrap, token exchange | Medium |
| Login Page | `app/(auth)/login/` | User login UI | Small |
| Register Page | `app/(auth)/register/` | User registration UI | Small |

**Files**: 7 | **Total Scope**: Medium-Large

---

### 1.2 Chat & Messaging

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Chat Component | `components/chat.tsx` | Main chat orchestration (524 lines) | Large |
| Messages Component | `components/messages.tsx` | Message list virtualization (320 lines) | Large |
| Message Component | `components/message.tsx` | Individual message rendering | Medium |
| Message Editor | `components/message-editor.tsx` | Edit message content | Small |
| Message Actions | `components/message-actions.tsx` | Copy, vote, regenerate | Small |
| Message Reasoning | `components/message-reasoning.tsx` | Display AI reasoning | Small |
| Multimodal Input | `components/multimodal-input.tsx` | Text + file input (551 lines) | Large |
| Chat Header | `components/chat-header.tsx` | Chat title, actions | Small |
| Data Stream Handler | `components/data-stream-handler.tsx` | Process SSE stream | Medium |
| Data Stream Provider | `components/data-stream-provider.tsx` | Stream context | Small |
| Chat Data Layer | `lib/data/chat.ts` | Chat CRUD operations (1256 lines) | Large |
| Chat Operations | `lib/data/chat-operations.ts` | Save/update chat helpers | Medium |
| Chat API Route | `app/(chat)/api/chat/route.ts` | POST chat messages (467 lines) | Large |
| Chat Page | `app/(chat)/chat/[id]/` | Dynamic chat page | Medium |
| Chat Layout | `app/(chat)/layout.tsx` | Chat section layout | Small |
| Chat Actions | `app/(chat)/actions.ts` | Server actions (title, delete) | Medium |
| Suggested Actions | `components/suggested-actions.tsx` | Quick action chips | Small |

**Files**: 17 | **Total Scope**: Large

---

### 1.3 AI/LLM Integration

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Chat Completion | `lib/ai/chat-completion.ts` | Stream AI responses (291 lines) | Large |
| Model Registry | `lib/ai/model-registry.ts` | Provider management (363 lines) | Large |
| Model Discovery | `lib/ai/model-discovery.ts` | Auto-discover models | Medium |
| Model Catalog Types | `lib/ai/model-catalog-types.ts` | Type definitions | Small |
| Curated Models | `lib/ai/curated-models.ts` | Pre-configured models | Medium |
| Models Config | `lib/ai/models.ts` | Default model constants | Small |
| Providers | `lib/ai/providers.ts` | Provider factory with middleware | Medium |
| Provider Info | `lib/ai/provider-info.ts` | Display names/metadata | Small |
| Entitlements | `lib/ai/entitlements.ts` | User tier limits | Small |
| Prompts | `lib/ai/prompts.ts` | System prompts | Medium |
| Title Generation | `lib/ai/title-generation.ts` | Auto-generate chat titles | Small |
| AI Constants | `lib/ai/constants.ts` | AI configuration | Small |
| Model Selector | `components/model-selector.tsx` | UI for model selection | Small |

**AI Tools**:
| Tool | Location | Purpose | Scope |
|------|----------|---------|-------|
| Create Document | `lib/ai/tools/create-document.ts` | AI creates artifacts | Medium |
| Update Document | `lib/ai/tools/update-document.ts` | AI modifies artifacts | Medium |
| Get Weather | `lib/ai/tools/get-weather.ts` | Weather demo tool | Small |
| Request Suggestions | `lib/ai/tools/request-suggestions.ts` | AI suggests edits | Medium |

**Files**: 17 | **Total Scope**: Large

---

### 1.4 Artifact System

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Artifact Container | `components/artifact.tsx` | Artifact panel orchestration (622 lines) | Large |
| Artifact Actions | `components/artifact-actions.tsx` | Artifact toolbar | Medium |
| Artifact Close Button | `components/artifact-close-button.tsx` | Close artifact panel | Small |
| Artifact Error Boundary | `components/artifact-error-boundary.tsx` | Error handling | Small |
| Artifact Messages | `components/artifact-messages.tsx` | Messages in artifact view | Medium |
| Create Artifact | `components/create-artifact.tsx` | Artifact class definition | Medium |
| Artifact Hook | `hooks/use-artifact.ts` | Artifact state management | Medium |
| Artifact Server Utils | `lib/artifacts/server.ts` | Server-side artifact helpers | Small |
| Artifact Actions (Server) | `artifacts/actions.ts` | Server actions for artifacts | Medium |

**Artifact Types**:
| Type | Client | Server | Purpose | Scope |
|------|--------|--------|---------|-------|
| Code | `artifacts/code/client.tsx` | `artifacts/code/server.ts` | Python/JS code editor + execution | Large |
| Text | `artifacts/text/client.tsx` | `artifacts/text/server.ts` | Rich text editor (TipTap) | Large |
| Sheet | `artifacts/sheet/client.tsx` | `artifacts/sheet/server.ts` | Spreadsheet editor | Large |
| Image | `artifacts/image/client.tsx` | — | Image viewer/editor | Medium |

**Editors**:
| Editor | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Code Editor | `components/code-editor.tsx` | CodeMirror integration | Large |
| Text Editor | `components/text-editor.tsx` | TipTap integration | Large |
| Sheet Editor | `components/sheet-editor.tsx` | React Data Grid | Large |
| Image Editor | `components/image-editor.tsx` | Image manipulation | Medium |
| Diff View | `components/diffview.tsx` | Show diff between versions | Medium |
| Console | `components/console.tsx` | Code execution output | Medium |

**Files**: 21 | **Total Scope**: Large

---

### 1.5 Data Layer (Database & Caching)

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Database Schema | `lib/db/schema.ts` | Drizzle schema (186 lines) | Medium |
| Database Queries | `lib/db/queries.ts` | Base queries (216 lines) | Medium |
| Database Migrations | `lib/db/migrations/` | Schema migrations | Medium |
| Database Migrate | `lib/db/migrate.ts` | Migration runner | Small |
| Database Batch | `lib/db/batch.ts` | Batch operations | Small |
| Database Transactions | `lib/db/transactions.ts` | Transaction helpers | Small |
| Database Pagination | `lib/db/pagination.ts` | Cursor pagination | Small |
| Database Helpers | `lib/db/helpers/` | Schema helpers | Small |

**Cache Layer**:
| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Redis Client | `lib/cache/redis.ts` | Upstash Redis singleton | Small |
| Cache Operations | `lib/cache/operations.ts` | ZSET operations (1080 lines) | Large |
| Cache Batch Ops | `lib/cache/batch-operations.ts` | Bulk cache updates | Medium |
| Cache Helpers | `lib/cache/helpers.ts` | Utility functions | Small |
| Cache Types | `lib/cache/types.ts` | Type definitions | Small |
| Cache Quota | `lib/cache/quota.ts` | Rate limit counters | Medium |

**Data Access Layer**:
| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Chat Data | `lib/data/chat.ts` | Chat operations (1256 lines) | Large |
| Chat Operations | `lib/data/chat-operations.ts` | Chat save/update | Medium |
| Document Data | `lib/data/document.ts` | Document CRUD | Medium |
| Base Data | `lib/data/base.ts` | DataContext, pagination | Small |

**Files**: 18 | **Total Scope**: Large

---

### 1.6 UI Components & Design System

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Icons | `components/icons.tsx` | SVG icon components | Medium |
| Toast | `components/toast.tsx` | Notification wrapper | Small |
| Toolbar | `components/toolbar.tsx` | Action toolbar | Small |
| Greeting | `components/greeting.tsx` | Welcome message | Small |
| Preview Attachment | `components/preview-attachment.tsx` | File preview | Small |
| Document Preview | `components/document-preview.tsx` | Document thumbnail | Small |
| Document Skeleton | `components/document-skeleton.tsx` | Loading state | Small |
| Document | `components/document.tsx` | Document card | Small |
| Version Footer | `components/version-footer.tsx` | Document version info | Small |
| Visibility Selector | `components/visibility-selector.tsx` | Public/private toggle | Small |
| Weather | `components/weather.tsx` | Weather display widget | Small |
| Submit Button | `components/submit-button.tsx` | Form submit button | Small |
| Suggestion | `components/suggestion.tsx` | AI suggestion display | Small |

**Sidebar**:
| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| App Sidebar | `components/app-sidebar.tsx` | Main sidebar (162 lines) | Medium |
| Sidebar History | `components/sidebar-history.tsx` | Chat history list | Medium |
| Sidebar History Item | `components/sidebar-history-item.tsx` | Single chat item | Small |
| Sidebar Skeleton | `components/sidebar-skeleton.tsx` | Loading state | Small |
| Sidebar Toggle | `components/sidebar-toggle.tsx` | Toggle button | Small |
| Sidebar User Nav | `components/sidebar-user-nav.tsx` | User menu | Small |

**UI Primitives** (`components/ui/`):
| Component | Purpose | Scope |
|-----------|---------|-------|
| Alert Dialog | Modal dialogs | Small |
| Avatar | User avatars | Small |
| Badge | Status badges | Small |
| Button | Button variants | Small |
| Card | Card container | Small |
| Carousel | Image carousel | Small |
| Collapsible | Expandable sections | Small |
| Dropdown Menu | Context menus | Small |
| Hover Card | Hover tooltips | Small |
| Input | Form inputs | Small |
| Label | Form labels | Small |
| Progress | Progress bars | Small |
| Scroll Area | Custom scrollbar | Small |
| Select | Dropdown select | Small |
| Separator | Visual divider | Small |
| Sheet | Slide-out panel | Small |
| Sidebar | Sidebar layout | Medium |
| Skeleton | Loading skeleton | Small |
| Slider | Range slider | Small |
| Switch | Toggle switch | Small |
| Textarea | Multi-line input | Small |
| Tooltip | Tooltips | Small |

**Element Components** (`components/elements/`):
| Component | Purpose | Scope |
|-----------|---------|-------|
| Actions | Action buttons | Small |
| Branch | Git branch display | Small |
| Context | Context info | Small |
| Conversation | Chat container | Medium |
| Image | Image display | Small |
| Inline Citation | Citation links | Small |
| Loader | Loading spinner | Small |
| Message | Message wrapper | Medium |
| Prompt Input | Input container | Medium |
| Reasoning | Reasoning display | Small |
| Response | Response wrapper | Small |
| Source | Source citation | Small |
| Suggestion | Suggestion chip | Small |
| Task | Task display | Small |
| Tool | Tool invocation | Small |
| Web Preview | URL preview | Small |

**Files**: 50+ | **Total Scope**: Medium (many small components)

---

### 1.7 State Management & Providers

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Auth Provider | `components/auth-provider.tsx` | Auth context (160 lines) | Medium |
| Theme Provider | `components/theme-provider.tsx` | Dark/light mode | Small |
| Data Stream Provider | `components/data-stream-provider.tsx` | SSE stream context | Small |
| Settings Store | `lib/ui/settings-store.tsx` | User preferences (90 lines) | Medium |
| Settings Types | `lib/settings/types.ts` | Settings type definitions | Small |
| UI Constants | `lib/ui/constants.ts` | UI configuration | Small |

**Custom Hooks**:
| Hook | Location | Purpose | Scope |
|------|----------|---------|-------|
| useArtifact | `hooks/use-artifact.ts` | Artifact state (153 lines) | Medium |
| useChatVisibility | `hooks/use-chat-visibility.ts` | Chat visibility state | Small |
| useMessages | `hooks/use-messages.tsx` | Message list state | Medium |
| useMobile | `hooks/use-mobile.ts` | Mobile detection | Small |
| useOptimisticChats | `hooks/use-optimistic-chats.tsx` | Optimistic updates | Medium |
| useScrollToBottom | `hooks/use-scroll-to-bottom.tsx` | Auto-scroll behavior | Small |
| useWindowSize | `hooks/use-window-size.ts` | Window dimensions | Small |

**Files**: 13 | **Total Scope**: Medium

---

### 1.8 API Layer & Server Actions

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| API Guards | `lib/api/guards.ts` | Auth/rate limit guards (353 lines) | Large |
| API Validators | `lib/api/validators.ts` | Input validation | Medium |
| API Schemas | `lib/api/schemas.ts` | Zod schemas | Small |
| API Utils | `lib/api/utils.ts` | Helper functions | Small |
| API Context | `lib/api-context.ts` | Request context | Small |
| Request Context | `lib/request-context.ts` | AsyncLocalStorage | Small |

**API Routes** (`app/(chat)/api/`):
| Route | Methods | Purpose | Scope |
|-------|---------|---------|-------|
| `/api/chat` | POST | Send messages | Large |
| `/api/chat/[id]` | GET, DELETE | Get/delete chat | Medium |
| `/api/document` | GET, POST, PATCH, DELETE | Document CRUD | Medium |
| `/api/files/upload` | POST | File uploads | Medium |
| `/api/history` | GET, DELETE | Chat history | Medium |
| `/api/suggestions` | GET | Get suggestions | Small |
| `/api/vote` | PATCH | Vote on messages | Small |
| `/api/health` | GET | Health check | Small |

**Auth Routes** (`app/api/auth/`):
| Route | Purpose | Scope |
|-------|---------|-------|
| `/api/auth/guest` | Guest bootstrap | Small |
| `/api/auth/exchange` | Token exchange | Small |
| `/api/auth/logout` | Logout | Small |

**Files**: 16 | **Total Scope**: Medium-Large

---

### 1.9 Middleware & Infrastructure

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Rate Limit | `lib/middleware/rate-limit.ts` | Token bucket/sliding window (476 lines) | Large |
| Rate Limit Config | `lib/middleware/rate-limit-config.ts` | Limit presets | Small |
| Edge Rate Limit | `lib/middleware/edge-rate-limit.ts` | Edge-optimized limits | Medium |
| Deduplication | `lib/middleware/deduplication.ts` | Request dedup | Small |
| Instrumentation | `instrumentation.ts` | OpenTelemetry setup | Small |
| Instrumentation Client | `instrumentation-client.ts` | Client-side instrumentation | Small |
| Next Config | `next.config.ts` | Next.js configuration | Medium |
| Drizzle Config | `drizzle.config.ts` | Drizzle ORM config | Small |
| Playwright Config | `playwright.config.ts` | E2E test config | Small |

**Utility Modules**:
| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Constants | `lib/constants.ts` | App constants (139 lines) | Small |
| Errors | `lib/errors.ts` | Error handling (433 lines) | Large |
| Utils | `lib/utils.ts` | General utilities | Medium |
| Log | `lib/log.ts` | Logging utilities | Small |
| Files | `lib/files.ts` | File handling | Small |
| Usage | `lib/usage.ts` | Usage tracking types | Small |
| Motion | `lib/motion.tsx` | Framer Motion re-exports | Small |

**Files**: 16 | **Total Scope**: Medium

---

### 1.10 Settings & Configuration

| Module | Location | Purpose | Scope |
|--------|----------|---------|-------|
| Settings Sheet | `components/settings/settings-sheet.tsx` | Settings UI panel | Medium |
| Settings Store | `lib/ui/settings-store.tsx` | Settings state | Medium |
| Settings Types | `lib/settings/types.ts` | Type definitions | Small |
| UI Constants | `lib/ui/constants.ts` | UI defaults | Small |

**Files**: 4 | **Total Scope**: Small

---

## 2. Priority Matrix

### Critical Path (P0) - Must Fix First

| Priority | Module | Reason | Scope | Dependencies |
|----------|--------|--------|-------|--------------|
| P0.1 | Error Handling (`lib/errors.ts`) | Foundation for all error flows | Large | None |
| P0.2 | Auth/Session (`lib/auth/`) | Security foundation | Large | Errors |
| P0.3 | Data Layer (`lib/data/`) | All features depend on data access | Large | Auth, Cache |
| P0.4 | Cache Operations (`lib/cache/`) | Performance critical | Large | Redis |

### High Priority (P1) - Core Features

| Priority | Module | Reason | Scope | Dependencies |
|----------|--------|--------|-------|--------------|
| P1.1 | API Guards (`lib/api/guards.ts`) | Security boundary | Large | Auth, Errors |
| P1.2 | Rate Limiting (`lib/middleware/`) | Abuse prevention | Medium | Cache |
| P1.3 | Chat Completion (`lib/ai/chat-completion.ts`) | Core AI feature | Large | Models, Tools |
| P1.4 | Model Registry (`lib/ai/model-registry.ts`) | AI provider abstraction | Large | None |

### Medium Priority (P2) - Feature Modules

| Priority | Module | Reason | Scope | Dependencies |
|----------|--------|--------|-------|--------------|
| P2.1 | Chat Component (`components/chat.tsx`) | Main UI | Large | All hooks, providers |
| P2.2 | Artifact System (`artifacts/`, `components/artifact.tsx`) | Document editing | Large | Chat, Data |
| P2.3 | Messages Component (`components/messages.tsx`) | Message display | Large | Chat |
| P2.4 | Multimodal Input (`components/multimodal-input.tsx`) | User input | Large | Chat |

### Lower Priority (P3) - UI & Polish

| Priority | Module | Reason | Scope | Dependencies |
|----------|--------|--------|-------|--------------|
| P3.1 | UI Primitives (`components/ui/`) | Design system | Medium | None |
| P3.2 | Element Components (`components/elements/`) | Atomic components | Medium | UI |
| P3.3 | Sidebar Components | Navigation | Medium | Auth, Data |
| P3.4 | Settings UI | Configuration | Small | Settings Store |

---

## 3. Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPENDENCY GRAPH                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐                                                   │
│  │  Errors  │ ◄─────────────────────────────────────────────────┤
│  └────┬─────┘                                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐    ┌───────────┐                                  │
│  │   Auth   │───►│   Cache   │                                  │
│  └────┬─────┘    └─────┬─────┘                                  │
│       │                │                                         │
│       ▼                ▼                                         │
│  ┌──────────────────────────┐                                   │
│  │      Data Layer          │                                   │
│  │  (chat.ts, document.ts)  │                                   │
│  └────────────┬─────────────┘                                   │
│               │                                                  │
│       ┌───────┴───────┐                                         │
│       ▼               ▼                                          │
│  ┌──────────┐   ┌───────────┐                                   │
│  │ API Layer│   │ AI Layer  │                                   │
│  └────┬─────┘   └─────┬─────┘                                   │
│       │               │                                          │
│       ▼               ▼                                          │
│  ┌──────────────────────────┐                                   │
│  │     React Components     │                                   │
│  │  (Chat, Messages, etc.)  │                                   │
│  └──────────────────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Dependencies

| Module | Depends On | Depended By |
|--------|------------|-------------|
| `lib/errors.ts` | None | Everything |
| `lib/auth/session.ts` | errors, constants | api, data, middleware |
| `lib/cache/operations.ts` | redis, helpers | data layer |
| `lib/data/chat.ts` | cache, db, auth | api routes, components |
| `lib/api/guards.ts` | auth, data, middleware | all api routes |
| `lib/ai/chat-completion.ts` | models, tools, prompts | chat api route |

---

## 4. Redesign Task List

### Phase 1: Foundation (Weeks 1-2)

| Task ID | Task | Module | Scope | Est. Hours |
|---------|------|--------|-------|------------|
| T1.1 | Audit & document error codes | `lib/errors.ts` | Large | 8 |
| T1.2 | Standardize error handling patterns | `lib/errors.ts` | Large | 12 |
| T1.3 | Audit session management security | `lib/auth/` | Large | 8 |
| T1.4 | Consolidate auth flows | `lib/auth/` | Medium | 12 |
| T1.5 | Document cache strategy | `lib/cache/` | Large | 6 |
| T1.6 | Audit circuit breaker implementation | `lib/cache/operations.ts` | Medium | 4 |

### Phase 2: Data Layer (Weeks 3-4)

| Task ID | Task | Module | Scope | Est. Hours |
|---------|------|--------|-------|------------|
| T2.1 | Refactor chat data module | `lib/data/chat.ts` | Large | 16 |
| T2.2 | Extract common patterns | `lib/data/base.ts` | Medium | 8 |
| T2.3 | Optimize database queries | `lib/db/queries.ts` | Medium | 8 |
| T2.4 | Add comprehensive types | `lib/db/schema.ts` | Medium | 6 |
| T2.5 | Document data access patterns | All data modules | Medium | 8 |

### Phase 3: API & Security (Weeks 5-6)

| Task ID | Task | Module | Scope | Est. Hours |
|---------|------|--------|-------|------------|
| T3.1 | Audit API guard coverage | `lib/api/guards.ts` | Large | 8 |
| T3.2 | Standardize validation | `lib/api/validators.ts` | Medium | 8 |
| T3.3 | Consolidate rate limiting | `lib/middleware/` | Large | 12 |
| T3.4 | Review all API routes | `app/(chat)/api/` | Large | 16 |
| T3.5 | Add OpenAPI documentation | New | Medium | 12 |

### Phase 4: AI Integration (Weeks 7-8)

| Task ID | Task | Module | Scope | Est. Hours |
|---------|------|--------|-------|------------|
| T4.1 | Refactor model registry | `lib/ai/model-registry.ts` | Large | 12 |
| T4.2 | Consolidate provider logic | `lib/ai/providers.ts` | Medium | 8 |
| T4.3 | Standardize tool implementations | `lib/ai/tools/` | Medium | 10 |
| T4.4 | Document AI architecture | All AI modules | Medium | 8 |
| T4.5 | Add model capability tests | `lib/ai/models.test.ts` | Medium | 8 |

### Phase 5: Components (Weeks 9-12)

| Task ID | Task | Module | Scope | Est. Hours |
|---------|------|--------|-------|------------|
| T5.1 | Refactor Chat component | `components/chat.tsx` | Large | 20 |
| T5.2 | Extract chat sub-components | `components/chat/` | Large | 16 |
| T5.3 | Refactor Messages component | `components/messages.tsx` | Large | 12 |
| T5.4 | Refactor Multimodal Input | `components/multimodal-input.tsx` | Large | 12 |
| T5.5 | Refactor Artifact system | `components/artifact.tsx` | Large | 20 |
| T5.6 | Standardize UI primitives | `components/ui/` | Medium | 12 |
| T5.7 | Document component patterns | All components | Medium | 8 |

### Phase 6: State & Hooks (Weeks 13-14)

| Task ID | Task | Module | Scope | Est. Hours |
|---------|------|--------|-------|------------|
| T6.1 | Audit provider hierarchy | All providers | Medium | 6 |
| T6.2 | Consolidate hooks | `hooks/` | Medium | 10 |
| T6.3 | Add hook documentation | `hooks/` | Small | 6 |
| T6.4 | Optimize re-renders | All components | Medium | 12 |

---

## 5. Logical Groupings & Boundaries

### Proposed Domain Boundaries

```
src/
├── core/                    # Foundation (errors, constants, types)
│   ├── errors/
│   ├── types/
│   └── constants/
│
├── auth/                    # Authentication domain
│   ├── session/
│   ├── providers/
│   └── hooks/
│
├── data/                    # Data access layer
│   ├── database/
│   ├── cache/
│   └── repositories/
│
├── ai/                      # AI integration domain
│   ├── models/
│   ├── providers/
│   ├── tools/
│   └── prompts/
│
├── chat/                    # Chat feature domain
│   ├── components/
│   ├── hooks/
│   ├── api/
│   └── actions/
│
├── artifacts/               # Artifact feature domain
│   ├── code/
│   ├── text/
│   ├── sheet/
│   ├── image/
│   └── shared/
│
├── ui/                      # UI components
│   ├── primitives/          # Button, Input, etc.
│   ├── patterns/            # Sidebar, Header, etc.
│   └── layouts/
│
└── api/                     # API layer
    ├── routes/
    ├── guards/
    └── validators/
```

### Current vs. Proposed Structure

| Current | Issues | Proposed |
|---------|--------|----------|
| `lib/` (flat) | Mixed concerns | Split by domain |
| `components/` (flat) | 50+ files | Group by feature |
| `hooks/` (flat) | No categorization | Group with features |
| `artifacts/` | Good isolation | Keep, enhance |

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Modules Identified** | 87 |
| **Large Scope Modules** | 15 |
| **Medium Scope Modules** | 28 |
| **Small Scope Modules** | 44 |
| **Critical Path Items** | 4 |
| **High Priority Items** | 4 |
| **Estimated Total Hours** | ~320 |
| **Recommended Duration** | 14 weeks |

### Top 5 Priorities for Immediate Action

1. **Error Handling Standardization** - Foundation for everything
2. **Authentication Security Audit** - Critical security component  
3. **Data Layer Refactoring** - Most complex, most dependencies
4. **API Guards Consolidation** - Security boundary
5. **Chat Component Decomposition** - 524 lines, needs splitting

---

*Document generated by Ouroboros Researcher - Phase 1 Complete*
