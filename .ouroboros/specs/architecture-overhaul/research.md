# Architecture Overhaul Research Document

## Feature: Complete Architectural Overhaul & Optimization Plan

## Date: 2025-12-17

## Phase: 1/5 - Research

---

# 1. Executive Summary

This research document analyzes the current Next.js 16.0.10 AI Chatbot application architecture to support a comprehensive architectural overhaul plan. The analysis covers tech stack, runtime boundaries, code organization, dependency patterns, and identifies optimization opportunities.

---

# 2. Current Tech Stack Analysis

## 2.1 Core Framework & Runtime

| Component  | Version | Notes                         |
| ---------- | ------- | ----------------------------- |
| Next.js    | 16.0.7  | App Router, Turbopack enabled |
| React      | 19.2.1  | Latest with Compiler support  |
| TypeScript | 5.6.3   | Strict mode enabled           |
| Node.js    | -       | Server runtime                |

## 2.2 AI & ML Stack

| Library                     | Version | Purpose             |
| --------------------------- | ------- | ------------------- |
| ai (Vercel AI SDK)          | 5.0.26  | Core AI streaming   |
| @ai-sdk/react               | 2.0.26  | React hooks for AI  |
| @ai-sdk/openai              | 2.0.54  | OpenAI provider     |
| @ai-sdk/google              | 2.0.24  | Google AI provider  |
| @ai-sdk/xai                 | 2.0.13  | xAI provider        |
| @openrouter/ai-sdk-provider | 1.2.0   | Multi-model routing |
| tokenlens                   | 1.3.0   | Token management    |

## 2.3 Database & Auth

| Component     | Technology               | Notes                      |
| ------------- | ------------------------ | -------------------------- |
| ORM           | Drizzle 0.34.0           | PostgreSQL with migrations |
| Database      | @vercel/postgres 0.10.0  | Serverless Postgres        |
| Auth          | @supabase/ssr 0.7.0      | Session management         |
| Rate Limiting | @upstash/ratelimit 2.0.7 | Redis-based                |

## 2.4 UI Framework

| Library               | Purpose             |
| --------------------- | ------------------- |
| Radix UI              | Headless components |
| TailwindCSS 4.1.13    | Styling             |
| Framer Motion 11.3.19 | Animations          |
| TipTap 3.9.0          | Rich text editing   |
| CodeMirror 6.x        | Code editing        |
| Sonner 1.5.0          | Toasts              |

---

# 3. Current Architecture Analysis

## 3.1 Directory Structure Overview

project-root/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (chat)/             # Main chat route group
│   │   ├── api/            # Route handlers (chat, document, files, etc.)
│   │   ├── chat/[id]/      # Dynamic chat routes
│   │   └── layout.tsx      # Chat layout (async server component)
│   ├── api/                # Global API routes
│   └── layout.tsx          # Root layout (async server component)
├── components/             # React components (mixed client/server)
│   ├── ui/                 # Shadcn UI primitives
│   ├── elements/           # Custom UI elements
│   └── settings/           # Settings components
├── lib/                    # Shared utilities
│   ├── ai/                 # AI-related logic
│   ├── api/                # API utilities
│   ├── artifacts/          # Artifact management
│   ├── auth/               # Authentication
│   ├── cache/              # Caching layer
│   ├── data/               # Data access layer
│   ├── db/                 # Database (Drizzle)
│   ├── middleware/         # Edge middleware
│   └── ui/                 # UI utilities
├── hooks/                  # React hooks (all client)
├── artifacts/              # Artifact type definitions
└── tests/                  # Test suites


## 3.2 Runtime Boundary Analysis

### Server Components (No `use client` directive)

- `app/layout.tsx` - Root layout with async `AppShell`
- `app/(chat)/layout.tsx` - Chat layout
- `lib/auth/session.ts` - Uses `server-only`
- `lib/db/queries.ts` - Uses `server-only`
- Route handlers in `app/(chat)/api/`

### Client Components (`use client` directive)

**Components (37+ files):**

- `components/chat.tsx` - Main chat component (524 lines)
- `components/auth-provider.tsx` - Auth context provider
- `components/data-stream-provider.tsx` - Data stream context
- `components/sidebar-*.tsx` - Sidebar components
- All hooks in `hooks/` directory
- `lib/ui/settings-store.tsx` - Settings state
- `lib/motion.tsx` - Animation utilities
- `lib/auth/client.ts` - Client auth utilities

### Edge Runtime

- `lib/middleware/edge-rate-limit.ts`
- `lib/middleware/rate-limit-config.ts`

## 3.3 Provider Hierarchy (Current)

\\
RootLayout (Server)
└── AppShell (Server Async)
    └── ThemeProvider (Client)
        └── TooltipProvider (Client)
            └── SWRConfig (Client)
                └── AuthProvider (Client)
                    └── ChatLayoutClient (Client)
                        └── SettingsProvider (Client)
                            └── DataStreamProvider (Client)
                                └── OptimisticChatsProvider (Client)
                                    └── SidebarProvider (Client)
                                        └── [Page Content]
\\\

**Issues Identified:**

- 9 levels of nesting
- Context providers deeply nested
- Mix of server/client boundaries unclear

---

# 4. Identified Architectural Issues

## 4.1 Bundle Separation Concerns

### Client Bundle Contamination

| Issue                     | Location                            | Impact                               |
| ------------------------- | ----------------------------------- | ------------------------------------ |
| Large client components   | `components/chat.tsx` (524 lines) | Large initial JS                     |
| Mixed imports             | Various files                       | Tree-shaking ineffective             |
| Lazy loading inconsistent | `chat-layout-client.tsx`          | Some components dynamically imported |

### Server Bundle Leakage

| Issue             | Location       | Impact                             |
| ----------------- | -------------- | ---------------------------------- |
| Type-only imports | Multiple files | Potential bundling of unused types |

## 4.2 Context Provider Issues

| Provider                | Location         | Issue                      |
| ----------------------- | ---------------- | -------------------------- |
| AuthProvider            | Root             | Appropriate placement      |
| SettingsProvider        | ChatLayoutClient | Could be root level        |
| DataStreamProvider      | ChatLayoutClient | Chat-specific, appropriate |
| OptimisticChatsProvider | ChatLayoutClient | Chat-specific, appropriate |

## 4.3 Code Organization Issues

1. **Flat component structure** - 40+ components at root level
2. **Mixed concerns in lib/** - AI, API, auth all flat
3. **No clear feature boundaries** - Chat, artifacts, auth spread across directories
4. **Hooks scattered** - Some in `hooks/`, some in `lib/ui/`

## 4.4 Data Flow Patterns

\\
Server:
  AppSession → getAppSession() → cookies/JWT validation

Client:
  AuthContext → useAuth()
  SettingsContext → useSettings()
  DataStreamContext → useDataStream()
  OptimisticChatsContext → useOptimisticChats()

API Routes:
  POST /api/chat → streaming response
  Various CRUD operations
\\\

---

# 5. Next.js 16 Features Analysis

## 5.1 Currently Utilized Features

| Feature           | Status        | Config Location                          |
| ----------------- | ------------- | ---------------------------------------- |
| React Compiler    | ✅ Enabled    | `reactCompiler: true`                  |
| Turbopack         | ✅ Enabled    | `turbopackFileSystemCacheForDev: true` |
| View Transitions  | ✅ Enabled    | `viewTransition: true`                 |
| Inline CSS        | ✅ Enabled    | `inlineCss: true`                      |
| Cache Components  | ✅ Enabled    | `cacheComponents: true`                |
| Optimized Imports | ✅ Configured | 15+ packages                             |

## 5.2 Underutilized Next.js 16 Features

| Feature                 | Current State    | Opportunity                    |
| ----------------------- | ---------------- | ------------------------------ |
| `use cache` directive | Limited usage    | More aggressive server caching |
| Partial Prerendering    | Not used         | PPR for hybrid static/dynamic  |
| Route Groups            | Used but minimal | Better organization            |
| Parallel Routes         | Not used         | Sidebar optimization           |
| Intercepting Routes     | Not used         | Modal patterns                 |
| Server Actions          | 2 files only     | More server mutations          |

---

# 6. Performance Analysis

## 6.1 Bundle Configuration

\\\	typescript
// next.config.ts analysis
{
  experimental: {
    optimizePackageImports: [/* 15+ packages */],
    inlineCss: true,
    turbopackFileSystemCacheForDev: true
  }
}
\\\

## 6.2 Current Code Splitting Strategy

| Strategy        | Implementation   | Notes                         |
| --------------- | ---------------- | ----------------------------- |
| Dynamic imports | `next/dynamic` | Used for Artifact, AppSidebar |
| Route-based     | Automatic        | App Router default            |
| Component-level | Limited          | Only heavy components         |

## 6.3 Identified Performance Bottlenecks

1. **Large `chat.tsx` component** - 524 lines, complex state
2. **Provider nesting** - 9 levels of context
3. **Synchronous imports** - Many components not code-split
4. **External scripts** - Pyodide loaded eagerly

---

# 7. Dependency Analysis

## 7.1 Core Dependencies Graph

\\\mermaid
graph TD
    A[app/layout.tsx] --> B[components/auth-provider]
    A --> C[components/theme-provider]
    A --> D[lib/auth/session]

    E[chat-layout-client] --> F[components/data-stream-provider]
    E --> G[hooks/use-optimistic-chats]
    E --> H[lib/ui/settings-store]

    I[components/chat] --> J[@ai-sdk/react]
    I --> K[components/messages]
    I --> L[components/multimodal-input]

    M[lib/db/queries] --> N[drizzle-orm]
    M --> O[lib/db/schema]\\\

## 7.2 Coupling Points

| Module        | Dependencies | Coupling Level |
| ------------- | ------------ | -------------- |
| chat.tsx      | 20+ imports  | HIGH           |
| auth-provider | 5 imports    | MEDIUM         |
| db/queries    | 8 imports    | LOW            |
| lib/ai/*      | 15+ internal | HIGH           |

---

# 8. Files Affected by Overhaul

## 8.1 High Priority (Core Architecture)

| File                                  | Reason                  | Risk |
| ------------------------------------- | ----------------------- | ---- |
| `app/layout.tsx`                    | Root layout restructure | HIGH |
| `app/(chat)/layout.tsx`             | Chat layout overhaul    | HIGH |
| `app/(chat)/chat-layout-client.tsx` | Provider restructure    | HIGH |
| `components/chat.tsx`               | Component decomposition | HIGH |

## 8.2 Medium Priority (Module Restructure)

| Directory       | Changes Needed             |
| --------------- | -------------------------- |
| `lib/ai/`     | Feature module extraction  |
| `lib/db/`     | Repository pattern         |
| `components/` | Feature-based organization |
| `hooks/`      | Colocation with features   |

## 8.3 Low Priority (Cleanup)

| Area  | Changes                   |
| ----- | ------------------------- |
| Types | Consolidation             |
| Utils | Split by concern          |
| Tests | Restructure with features |

---

# 9. Recommendations Summary

## 9.1 Architecture Changes

1. **Adopt feature-based module structure**
2. **Implement clear runtime boundaries** (server/, client/, shared/)
3. **Flatten provider hierarchy** to max 4-5 levels
4. **Decompose large components** into smaller, focused units

## 9.2 Next.js 16 Optimizations

1. **Enable Partial Prerendering** for hybrid pages
2. **Expand `use cache` usage** for data fetching
3. **Use Parallel Routes** for sidebar
4. **More Server Actions** for mutations

## 9.3 Bundle Optimizations

1. **More aggressive code splitting**
2. **Component-level lazy loading**
3. **Type-only imports enforcement**
4. **External script optimization**

---

# 10. Research Artifacts

## 10.1 Files Analyzed

- 50+ source files reviewed
- Package.json (140 lines)
- next.config.ts (70 lines)
- Core layouts, components, and lib modules

## 10.2 Patterns Identified

- Provider pattern (6 contexts)
- Repository pattern (partial in lib/data/)
- Server Actions (2 files)
- Streaming responses (chat API)

---

**[PHASE 1 COMPLETE]**
