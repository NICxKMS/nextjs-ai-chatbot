# Architecture Overhaul Design Document
## Feature: Complete Architectural Overhaul & Optimization Plan
## Date: 2025-12-17
## Phase: 3/5 - Design

---

# 1. Executive Summary

This design document proposes a comprehensive architectural overhaul for the Next.js 16.0.10 AI Chatbot application. The design emphasizes strict separation of concerns, feature-based modular architecture, and optimal utilization of Next.js 16 capabilities.

---

# 2. Architectural Overview

## 2.1 High-Level Architecture Diagram

\\\mermaid
graph TB
    subgraph "Presentation Layer"
        subgraph "App Router"
            RL[Root Layout<br/>Server]
            AUTH["(auth)/*"]
            CHAT["(chat)/*"]
            API["api/*"]
        end
        
        subgraph "Parallel Routes"
            SIDEBAR["@sidebar"]
            MAIN["@main"]
        end
    end
    
    subgraph "Feature Modules"
        F_CHAT[features/chat]
        F_AUTH[features/auth]
        F_ARTIFACT[features/artifacts]
        F_SETTINGS[features/settings]
    end
    
    subgraph "Core Layer"
        CORE_DB[core/database]
        CORE_AUTH[core/auth]
        CORE_CACHE[core/cache]
        CORE_ERROR[core/errors]
    end
    
    subgraph "Shared Layer"
        SHARED_TYPES[shared/types]
        SHARED_UI[shared/ui]
        SHARED_UTILS[shared/utils]
    end
    
    RL --> AUTH
    RL --> CHAT
    RL --> API
    
    CHAT --> SIDEBAR
    CHAT --> MAIN
    
    SIDEBAR --> F_CHAT
    MAIN --> F_CHAT
    
    F_CHAT --> CORE_DB
    F_AUTH --> CORE_AUTH
    F_ARTIFACT --> CORE_DB
    
    CORE_DB --> SHARED_TYPES
    F_CHAT --> SHARED_UI
\\\

## 2.2 Runtime Boundary Model

\\\mermaid
graph LR
    subgraph "Server Runtime"
        S1[Route Handlers]
        S2[Server Components]
        S3[Server Actions]
        S4["'use cache' Functions"]
    end
    
    subgraph "Client Runtime"
        C1[Interactive Components]
        C2[Hooks]
        C3[Client State]
    end
    
    subgraph "Edge Runtime"
        E1[Middleware]
        E2[Edge Functions]
    end
    
    subgraph "Shared"
        T1[Types]
        T2[Constants]
        T3[Pure Utilities]
    end
    
    S1 -.-> T1
    S2 -.-> T1
    C1 -.-> T1
    E1 -.-> T2
\\\

---

# 3. Proposed Directory Structure

## 3.1 Complete Structure

\\\
project-root/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth route group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (chat)/                       # Chat route group
│   │   ├── @sidebar/                 # Parallel route: sidebar
│   │   │   ├── default.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── @main/                    # Parallel route: main content
│   │   │   ├── default.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── layout.tsx                # Chat layout (server)
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── api/                          # API routes
│   │   ├── chat/route.ts
│   │   └── auth/[...route]/route.ts
│   ├── layout.tsx                    # Root layout
│   ├── providers.tsx                 # Centralized providers (client)
│   └── globals.css
│
├── features/                         # Feature modules
│   ├── chat/
│   │   ├── server/                   # Server-only code
│   │   │   ├── queries.ts            # 'use cache' data fetching
│   │   │   ├── mutations.ts          # Server actions
│   │   │   └── streaming.ts          # AI streaming logic
│   │   ├── client/                   # Client components
│   │   │   ├── chat-container.tsx
│   │   │   ├── message-list.tsx
│   │   │   ├── message-input.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-chat-state.ts
│   │   │   │   └── use-chat-actions.ts
│   │   │   └── context/
│   │   │       └── chat-context.tsx
│   │   ├── shared/                   # Feature-local shared
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   └── index.ts                  # Public exports
│   │
│   ├── artifacts/
│   │   ├── server/
│   │   │   ├── queries.ts
│   │   │   └── mutations.ts
│   │   ├── client/
│   │   │   ├── artifact-viewer.tsx
│   │   │   ├── code-editor.tsx       # Lazy loaded
│   │   │   ├── text-editor.tsx       # Lazy loaded
│   │   │   └── sheet-editor.tsx      # Lazy loaded
│   │   ├── shared/
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── auth/
│   │   ├── server/
│   │   │   ├── session.ts
│   │   │   └── guards.ts
│   │   ├── client/
│   │   │   ├── auth-provider.tsx
│   │   │   └── hooks/
│   │   │       └── use-auth.ts
│   │   └── index.ts
│   │
│   └── settings/
│       ├── client/
│       │   ├── settings-provider.tsx
│       │   ├── settings-panel.tsx
│       │   └── hooks/
│       │       └── use-settings.ts
│       └── index.ts
│
├── core/                             # Infrastructure layer
│   ├── database/
│   │   ├── client.ts                 # Drizzle client (server-only)
│   │   ├── schema.ts                 # Schema definitions
│   │   └── repositories/
│   │       ├── chat-repository.ts
│   │       ├── message-repository.ts
│   │       ├── user-repository.ts
│   │       └── index.ts
│   ├── cache/
│   │   ├── redis.ts                  # Redis client
│   │   └── strategies.ts             # Cache strategies
│   ├── auth/
│   │   ├── jwt.ts                    # JWT utilities
│   │   └── session.ts                # Session management
│   ├── errors/
│   │   ├── base.ts                   # Error classes
│   │   └── handlers.ts               # Error handlers
│   ├── logging/
│   │   └── logger.ts                 # Logging utilities
│   └── index.ts                      # Core public API
│
├── shared/                           # Cross-cutting shared code
│   ├── types/
│   │   ├── api.ts                    # API types
│   │   ├── chat.ts                   # Chat domain types
│   │   ├── user.ts                   # User types
│   │   └── index.ts
│   ├── ui/                           # Shared UI components
│   │   ├── primitives/               # Base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── patterns/                 # Composite patterns
│   │   │   ├── loading-state.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   └── empty-state.tsx
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   └── constants/
│       └── index.ts
│
├── edge/                             # Edge runtime code
│   ├── middleware.ts
│   └── rate-limit.ts
│
└── tests/                            # Test suites
    ├── features/
    │   ├── chat/
    │   └── auth/
    ├── core/
    └── e2e/
\\\

## 3.2 Module Dependency Rules

\\\mermaid
graph TD
    subgraph "Dependency Direction"
        APP[app/] --> FEATURES[features/]
        APP --> SHARED[shared/]
        FEATURES --> CORE[core/]
        FEATURES --> SHARED
        CORE --> SHARED
    end
    
    subgraph "Forbidden"
        F1[features/chat] -.X.-> F2[features/auth]
        CORE -.X.-> FEATURES
        SHARED -.X.-> FEATURES
        SHARED -.X.-> CORE
    end
\\\

---

# 4. Component Architecture

## 4.1 Provider Hierarchy (Proposed)

\\\mermaid
graph TD
    ROOT["RootLayout (Server)"]
    PROV["Providers (Client)"]
    THEME[ThemeProvider]
    AUTH[AuthProvider]
    CHAT_LAYOUT["ChatLayout (Server)"]
    CHAT_PROV["ChatProviders (Client)"]
    DATA[DataStreamProvider]
    SETTINGS[SettingsProvider]
    
    ROOT --> PROV
    PROV --> THEME
    PROV --> AUTH
    AUTH --> CHAT_LAYOUT
    CHAT_LAYOUT --> CHAT_PROV
    CHAT_PROV --> DATA
    CHAT_PROV --> SETTINGS
\\\

**Depth: 4 levels (down from 9)**

## 4.2 Providers Component Pattern

\\\	sx
// app/providers.tsx
"use client";

import { ThemeProvider } from "@/shared/ui";
import { AuthProvider } from "@/features/auth";

export function Providers({ 
  children, 
  initialSession 
}: ProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider initialSession={initialSession}>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
\\\

## 4.3 Chat Feature Component Tree

\\\mermaid
graph TD
    subgraph "Server Components"
        CL[ChatLayout]
        CP[ChatPage]
    end
    
    subgraph "Client Components"
        CC[ChatContainer]
        ML[MessageList]
        MI[MessageInput]
        MSG[Message]
        ART[ArtifactViewer]
    end
    
    CL --> CP
    CP --> CC
    CC --> ML
    CC --> MI
    ML --> MSG
    MSG --> ART
\\\

---

# 5. Data Flow Architecture

## 5.1 Read Flow (Server → Client)

\\\mermaid
sequenceDiagram
    participant Browser
    participant ServerComponent
    participant Cache as "use cache"
    participant Repository
    participant Database
    
    Browser->>ServerComponent: Request Page
    ServerComponent->>Cache: getChatData(id)
    Cache->>Repository: chatRepository.findById()
    Repository->>Database: SQL Query
    Database-->>Repository: Rows
    Repository-->>Cache: Chat Entity
    Cache-->>ServerComponent: Cached Data
    ServerComponent-->>Browser: HTML + Hydration Data
\\\

## 5.2 Write Flow (Client → Server)

\\\mermaid
sequenceDiagram
    participant Browser
    participant ClientComponent
    participant ServerAction
    participant Repository
    participant Database
    
    Browser->>ClientComponent: User Action
    ClientComponent->>ClientComponent: Optimistic Update
    ClientComponent->>ServerAction: "use server" action
    ServerAction->>Repository: chatRepository.save()
    Repository->>Database: INSERT/UPDATE
    Database-->>Repository: Result
    Repository-->>ServerAction: Success
    ServerAction-->>ClientComponent: Revalidate
    ClientComponent-->>Browser: Confirmed State
\\\

## 5.3 Streaming Flow (AI Responses)

\\\mermaid
sequenceDiagram
    participant Browser
    participant RouteHandler
    participant AIService
    participant StreamTransform
    
    Browser->>RouteHandler: POST /api/chat
    RouteHandler->>AIService: Generate Stream
    loop Streaming
        AIService-->>StreamTransform: Token
        StreamTransform-->>Browser: SSE Chunk
    end
    StreamTransform-->>Browser: [DONE]
\\\

---

# 6. Bundle Split Strategy

## 6.1 Chunk Organization

\\\mermaid
pie title Bundle Distribution (Target)
    "Framework (React, Next)" : 35
    "Core App Shell" : 15
    "Chat Feature" : 20
    "Artifacts (Lazy)" : 15
    "Third-party (Lazy)" : 15
\\\

## 6.2 Lazy Loading Map

| Component | Trigger | Priority |
|-----------|---------|----------|
| AppSidebar | Route enter | LOW |
| ArtifactViewer | User opens artifact | LOW |
| CodeEditor | Artifact type = code | LOW |
| TextEditor | Artifact type = text | LOW |
| SheetEditor | Artifact type = sheet | LOW |
| Pyodide | Python execution | LOWEST |
| Mermaid | Diagram render | LOW |
| KaTeX | Math render | MEDIUM |

## 6.3 Critical Path

\\\
Initial Load (< 150KB):
├── React Runtime (~40KB)
├── Next.js Runtime (~30KB)
├── Root Layout (~5KB)
├── Auth Provider (~10KB)
├── Theme Provider (~5KB)
├── Chat Container (~20KB)
├── Message List (~15KB)
├── Message Input (~15KB)
└── Critical CSS (~10KB)

Deferred Load:
├── Sidebar (~25KB) - viewport
├── Artifact Viewer (~30KB) - interaction
├── Editors (~100KB each) - interaction
└── Third-party (~200KB+) - interaction
\\\

---

# 7. Caching Strategy

## 7.1 Cache Layers

\\\mermaid
graph LR
    subgraph "Next.js Cache"
        FC[Full Route Cache]
        DC[Data Cache]
        RC[Request Cache]
    end
    
    subgraph "Application Cache"
        REDIS[Redis/Upstash]
        SWR[SWR Client Cache]
    end
    
    subgraph "Browser"
        HTTP[HTTP Cache]
        SW[Service Worker]
    end
    
    FC --> DC
    DC --> REDIS
    SWR --> HTTP
\\\

## 7.2 Cache Implementation

| Data Type | Cache Strategy | TTL | Invalidation |
|-----------|---------------|-----|--------------|
| Model Catalog | `use cache` + `cacheLife("days")` | 24h | Manual |
| Chat List | SWR + revalidateOnFocus | 30s | On mutation |
| Chat Messages | Server Component | Request | On new message |
| User Session | JWT + Cookie | 1h | On logout |
| Settings | localStorage | ∞ | Manual |

---

# 8. Error Handling Architecture

## 8.1 Error Boundary Hierarchy

\\\mermaid
graph TD
    ROOT[global-error.tsx]
    CHAT["(chat)/error.tsx"]
    SIDEBAR["@sidebar/error.tsx"]
    MAIN["@main/error.tsx"]
    COMP[Component ErrorBoundary]
    
    ROOT --> CHAT
    CHAT --> SIDEBAR
    CHAT --> MAIN
    MAIN --> COMP
\\\

## 8.2 Error Types

\\\	ypescript
// core/errors/base.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export class AuthError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 401);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 400);
  }
}
\\\

---

# 9. API Design

## 9.1 Route Handler Pattern

\\\	ypescript
// app/api/chat/route.ts
import "server-only";
import { chatRepository } from "@/core/database";
import { validateAuth } from "@/features/auth";
import { AppError } from "@/core/errors";

export async function POST(request: Request) {
  const session = await validateAuth();
  
  const body = await parseRequest(request);
  
  const result = await chatRepository.create({
    userId: session.user.id,
    ...body
  });
  
  return Response.json(result);
}
\\\

## 9.2 Server Action Pattern

\\\	ypescript
// features/chat/server/mutations.ts
"use server";

import { revalidateTag } from "next/cache";
import { chatRepository } from "@/core/database";

export async function createChat(formData: FormData) {
  const title = formData.get("title") as string;
  
  const chat = await chatRepository.create({ title });
  
  revalidateTag(\chat-list-\\);
  
  return { success: true, chatId: chat.id };
}
\\\

---

# 10. Design Decisions (ADRs)

## ADR-001: Feature-Based Module Structure
**Status:** Accepted

**Context:** Current flat structure makes it difficult to identify boundaries.

**Decision:** Adopt feature-based modules with runtime subdirectories.

**Consequences:**
- (+) Clear ownership of code
- (+) Easier to code-split
- (-) Initial migration effort

---

## ADR-002: Parallel Routes for Sidebar
**Status:** Accepted

**Context:** Sidebar loads with main content, blocking interactivity.

**Decision:** Use `@sidebar` parallel route with independent loading.

**Consequences:**
- (+) Independent loading states
- (+) Better error isolation
- (-) More complex routing

---

## ADR-003: Repository Pattern for Data Access
**Status:** Accepted

**Context:** Direct database calls scattered across codebase.

**Decision:** Centralize data access in `core/database/repositories/`.

**Consequences:**
- (+) Testable data layer
- (+) Single point of query optimization
- (-) Additional abstraction layer

---

## ADR-004: Composable Providers Component
**Status:** Accepted

**Context:** 9-level provider nesting is hard to manage.

**Decision:** Create `Providers` component that composes all root providers.

**Consequences:**
- (+) Simpler layout files
- (+) Centralized provider management
- (-) Less visibility of provider order

---

## ADR-005: Server Actions for Mutations
**Status:** Accepted

**Context:** Many API routes exist just for simple mutations.

**Decision:** Replace simple mutation routes with Server Actions.

**Consequences:**
- (+) Type-safe client-server communication
- (+) Reduced API surface
- (-) Learning curve for team

---

# 11. Migration Considerations

## 11.1 Migration Phases

\\\mermaid
gantt
    title Migration Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Directory Structure    :p1, 2025-01-01, 7d
    Core Layer Setup      :p2, after p1, 5d
    section Phase 2
    Feature Extraction    :p3, after p2, 14d
    Provider Refactor     :p4, after p2, 7d
    section Phase 3
    Bundle Optimization   :p5, after p3, 7d
    Testing & Validation  :p6, after p5, 7d
\\\

## 11.2 Backward Compatibility

| Concern | Strategy |
|---------|----------|
| API Routes | Keep existing, add Server Actions gradually |
| Component Imports | Use path aliases, update incrementally |
| Provider Structure | Create wrapper, migrate children |
| Tests | Update paths, maintain coverage |

---

# 12. Technology Decisions

## 12.1 Retained Technologies
- Next.js 16.0.10 with App Router
- React 19 with Compiler
- Drizzle ORM
- Supabase Auth
- TailwindCSS
- Vercel AI SDK

## 12.2 New Patterns
- `"use cache"` directive for data fetching
- Server Actions for mutations
- Parallel Routes for layout
- Feature modules with runtime separation

---

# 13. Complexity Removal

## 13.1 Core Objective

Before adding new architecture, we must **eliminate unnecessary complexity** that has accumulated. This reduces migration surface area and ensures new patterns don't inherit technical debt.

## 13.2 Files to DELETE

| File | Lines | Reason |
|------|-------|--------|
| `hooks/use-optimistic-chats.tsx` | 101 | Unnecessary optimistic state; `revalidatePath` suffices |
| Reconciliation logic in `sidebar-history.tsx` | 70+ | Coupled to OptimisticChatsProvider |
| Circuit breaker in `cache-operations.ts` | ~200 | Over-engineering; Next.js handles failures |

## 13.3 Patterns to REPLACE

| Current Pattern | Problem | Replacement |
|----------------|---------|-------------|
| **SWR-as-State** | Using SWR without fetchers as global state | Zustand store or useState |
| **OptimisticChatsProvider** | Complex reconciliation for chat list | `revalidatePath('/chat')` after mutations |
| **Manual Cache Layer** | 1080-line cache-operations.ts | Next.js 15 `"use cache"` directive |
| **Title Polling** | setTimeout polling in chat.tsx | Streaming or Server Action revalidation |

## 13.4 Anti-Pattern: SWR Without Fetchers

**Current (WRONG):**
```typescript
// hooks/use-artifact.ts - Using SWR as global state
const { data, mutate } = useSWR<Artifact>('artifact', null);

// components/sidebar-history.tsx - Using SWR for local visibility
const { data: localVisibility } = useSWR(LOCAL_VISIBILITY_KEY, null);
```

**Target (CORRECT):**
```typescript
// lib/stores/ui-store.ts - Zustand for UI state
import { create } from 'zustand';

export const useUIStore = create<UIState>((set) => ({
  artifact: null,
  setArtifact: (artifact) => set({ artifact }),
  localVisibility: {},
  setLocalVisibility: (id, visibility) => 
    set((s) => ({ localVisibility: { ...s.localVisibility, [id]: visibility } })),
}));
```

## 13.5 Provider Hierarchy Simplification

**Current (8 levels):**
```
RootLayout
└── ThemeProvider
    └── TooltipProvider
        └── SWRConfig
            └── AuthProvider
                └── ChatLayoutClient
                    └── SettingsProvider
                        └── DataStreamProvider
                            └── OptimisticChatsProvider
                                └── SidebarProvider
                                    └── {children}
```

**Target (4 levels):**
```
RootLayout
└── Providers (Theme + Auth + Tooltip)
    └── ChatLayout
        └── ChatProviders (Data + Settings + Sidebar)
            └── {children}
```

## 13.6 Cache Layer Simplification

**Current `cache-operations.ts` (1080 lines):**
- Redis client setup and connection
- Guest session storage
- Rate limiting helpers
- Circuit breaker pattern (unnecessary)
- Complex sorted set operations (unnecessary)
- Redundant TTL management

**Keep (necessary Redis infrastructure):**
- Redis client setup and connection pooling
- Guest session storage functions (not stored in DB)
- Rate limiting state helpers
- Core cache get/set/delete operations

**Remove:**
- Circuit breaker pattern (~50 lines) - Redis is already resilient
- Complex sorted set message operations - use `"use cache"` instead
- Redundant TTL management duplicating Next.js caching
- Unused batch operations

**Target:** 1080 lines → ~250 lines

**Message caching moves to `"use cache"`:**
```typescript
// features/chat/server/queries.ts
import { cacheLife, cacheTag } from 'next/cache';

export async function getChatMessages(chatId: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag(`messages-${chatId}`);
  
  return messageRepository.findByChatId(chatId);
}
```

**Redis retained for:**
- Guest session data (anonymous users - not in DB)
- Rate limiting state (cross-instance in serverless)
- Cross-instance cache sharing (Vercel serverless)

## 13.7 Title Polling Removal

**Current (`chat.tsx` lines 249-276):**
```typescript
// Polling for title generation
useEffect(() => {
  const checkTitle = () => {
    // ... setTimeout polling logic
  };
  checkTitle();
}, []);
```

**Target (streaming):**
```typescript
// Title arrives via AI stream
onFinish: async ({ response }) => {
  if (isNewChat) {
    const title = await generateTitle(messages);
    await updateChatTitle(chatId, title);
    revalidatePath('/chat');
  }
};
```

---

**[PHASE 3 COMPLETE]**

