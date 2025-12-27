# Master Specification

**Version**: 1.0  
**Status**: ✅ CANONICAL  
**Created**: 2024-12-27  
**Last Updated**: 2024-12-27

---

## Quick Links

| Document | Purpose | Status |
|----------|---------|--------|
| [Architecture v5](./architecture-v5-optimal.md) | Core architecture patterns, SRP, SDK wrapper | ✅ Approved |
| [Directory Structure](./COMPLETE-DIRECTORY-STRUCTURE.md) | Complete file structure (~757 files) | ✅ Approved |
| [Implementation Plan](./implementation-plan-v5.md) | 17 phases, 137 tasks, ~68 hours | ✅ Approved |
| [Task Tracker](./TASK-TRACKER.md) | Progress tracking dashboard | 🔄 Active |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Directory Structure Summary](#3-directory-structure-summary)
4. [Implementation Overview](#4-implementation-overview)
5. [Cross-Reference Index](#5-cross-reference-index)
6. [Detailed Spec Links](#6-detailed-spec-links)
7. [AI Agent Quick Reference](#7-ai-agent-quick-reference)

---

## 1. Project Overview

### 1.1 Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js (App Router) | 16.1 |
| **Language** | TypeScript | 5.x |
| **UI** | React + Tailwind CSS | React 19.x |
| **Database** | PostgreSQL + Drizzle ORM | - |
| **Cache** | Redis | - |
| **AI** | Vercel AI SDK | - |
| **Auth** | NextAuth.js | v5 |
| **Validation** | Zod | - |
| **State** | Zustand | - |
| **Data Fetching** | SWR | - |
| **Testing** | Vitest + Playwright | - |

### 1.2 Architecture Philosophy

> *"Every file has ONE job. Every pattern has ONE source. Every layer has ONE direction."*

**Core Principles**:
1. **Single Responsibility**: Each file/folder owns exactly one concern
2. **SDK Isolation**: Never edit SDK files; extend via wrappers
3. **DRY Centralization**: Types, errors, and patterns defined once
4. **Standardized Naming**: Predictable file locations and names
5. **Explicit Boundaries**: Clear layer dependencies, no violations

### 1.3 Project Stats

| Metric | Value |
|--------|-------|
| **Total Files** | ~757 |
| **Total Phases** | 17 |
| **Total Tasks** | 137 |
| **Estimated Duration** | ~68 hours |
| **AI Components** | 30 (SDK) + 14 (wrappers) |

### 1.4 Team Context

- **Developers**: 2-3 developers
- **AI Agents**: Ouroboros orchestration system
- **Code Reference**: `archive/oldapp/` contains original codebase

---

## 2. Architecture Summary

### 2.1 Four-Layer Structure

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

### 2.2 Import Rules

| From | Can Import | Cannot Import |
|------|------------|---------------|
| `app/` | features, shared, lib, src | - |
| `features/X` | shared, lib, src | features/Y (other features) |
| `shared/` | lib, src | features, app |
| `lib/` | src | features, app, shared |
| `src/` | (none - leaf layer) | everything |

### 2.3 SRP Responsibility Matrix

| Layer | Responsibility | Contains | Does NOT Contain |
|-------|----------------|----------|------------------|
| `app/` | Route definitions + page shells | `page.tsx`, `layout.tsx`, `error.tsx` | Business logic |
| `features/*/actions/` | Business logic orchestration | Server Actions | UI code |
| `features/*/components/` | Feature-specific UI | Feature components | Shared components |
| `features/*/schemas/` | Validation schemas | Zod schemas | Type definitions |
| `components/ui/` | Generic primitives | Button, Input, Card | Business logic |
| `components/ai-elements/` | SDK components (READ-ONLY) | SDK originals | Custom code |
| `shared/components/ai/` | AI wrappers (EDITABLE) | Wrapper components | SDK originals |
| `lib/` | Framework setup | AI SDK, Drizzle, Redis | Business logic |
| `src/types/` | Cross-cutting types | API types, Result<T,E> | Feature types |
| `src/errors/` | Error class hierarchy | AppError, NotFoundError | Error messages |

### 2.4 DRY Pattern Catalog (Summary)

| # | Pattern | Location | Purpose |
|---|---------|----------|---------|
| 1 | Error Classes | `src/errors/` | Single error hierarchy |
| 2 | API Response Types | `src/types/api.types.ts` | Consistent API shapes |
| 3 | Result Type | `src/types/result.ts` | Explicit error handling |
| 4 | DB Model Types | `src/types/models.types.ts` | Drizzle-inferred types |
| 5 | Validation Schemas | `features/*/schemas/` | Zod per-feature |
| 6 | SWR Query Hooks | `shared/hooks/` | Reusable data fetching |
| 7 | Error Boundaries | `shared/components/` | Consistent error UI |
| 8 | Loading States | `shared/ui/` | Skeleton components |
| 9 | Cache Keys | `lib/cache/keys.ts` | Centralized cache keys |
| 10 | SDK Wrappers | `shared/components/ai/` | Customizable AI components |

> **Full Details**: [architecture-v5-optimal.md#dry-pattern-catalog](./architecture-v5-optimal.md#dry-pattern-catalog)

### 2.5 SDK Wrapper Pattern

> ⚠️ **CRITICAL RULE**: NEVER edit files in `components/ai-elements/`

```
components/ai-elements/    → SDK (READ-ONLY, 30 components)
shared/components/ai/      → WRAPPERS (EDIT THESE, 14 wrappers)
```

**Import Rule**:
```typescript
// ❌ WRONG - Never import SDK directly
import { CodeBlock } from '@/components/ai-elements/code-block';

// ✅ CORRECT - Always use wrapper
import { CodeBlock } from '@/shared/components/ai';
```

---

## 3. Directory Structure Summary

### 3.1 Top-Level Structure

```
/
├── app/                    # Next.js App Router (83 files)
├── features/              # Feature modules (265 files)
├── shared/               # Shared utilities (133 files)
├── lib/                  # Infrastructure (126 files)
├── src/                  # Cross-cutting concerns (15 files)
├── components/           # UI components (84 files)
├── tests/               # Test infrastructure (66 files)
└── [root config]        # Configuration (20 files)
```

### 3.2 File Distribution

| Directory | Files | Layer | Purpose |
|-----------|-------|-------|---------|
| `app/` | 83 | Presentation | Next.js routes |
| `features/` | 265 | Presentation | Feature modules |
| `shared/` | 133 | Cross-cutting | Reusable utilities |
| `lib/` | 126 | Infrastructure | Framework setup |
| `src/` | 15 | Cross-cutting | Types, errors |
| `components/` | 84 | Presentation | UI components |
| `tests/` | 66 | Testing | Test infrastructure |
| **TOTAL** | **~757** | | |

### 3.3 Feature Breakdown

| Feature | Components | Hooks | Stores | Schemas | Constants | Total |
|---------|------------|-------|--------|---------|-----------|-------|
| chat | 18 | 8 | 3 | 2 | 2 | 78 |
| artifacts | 12 | 4 | 2 | 2 | 2 | 51 |
| auth | 6 | 3 | 1 | 2 | 2 | 32 |
| documents | 8 | 4 | 2 | 2 | 2 | 44 |
| settings | 5 | 2 | 1 | 2 | 2 | 26 |
| sidebar | 6 | 3 | 2 | 2 | 2 | 34 |

### 3.4 Key Directories

| Path | Purpose | Key Files |
|------|---------|-----------|
| `app/(chat)/` | Chat routes | `page.tsx`, `chat/[id]/page.tsx` |
| `app/api/chat/` | Streaming API | `route.ts` |
| `features/chat/` | Chat feature | 78 files total |
| `lib/ai/` | AI SDK config | Provider configs |
| `lib/db/` | Database | Schema, queries |
| `shared/components/ai/` | AI wrappers | 14 wrapper components |

> **Full Details**: [COMPLETE-DIRECTORY-STRUCTURE.md](./COMPLETE-DIRECTORY-STRUCTURE.md)

---

## 4. Implementation Overview

### 4.1 Phase Summary

| Phase | Name | Tasks | Hours | Status |
|-------|------|-------|-------|--------|
| 0 | Foundation Setup | 5 | 2h | ⬜ |
| 1 | Core Types & Errors | 6 | 3h | ⬜ |
| 2 | Database Layer | 5 | 3h | ⬜ |
| 3 | Cache Layer | 4 | 2h | ⬜ |
| 4 | Data Repositories | 6 | 4h | ⬜ |
| 5 | AI Elements Migration | 9 | 4h | ⬜ |
| 6 | Shared Components | 8 | 4h | ⬜ |
| 7 | AI Wrappers | 5 | 3h | ⬜ |
| 8 | Auth Feature | 9 | 4h | ⬜ |
| 9 | Chat Feature | 10 | 6h | ⬜ |
| 10 | Documents Feature | 10 | 4h | ⬜ |
| 11 | Artifacts Feature | 9 | 3h | ⬜ |
| 12 | Sidebar Feature | 10 | 3h | ⬜ |
| 13 | Settings Feature | 9 | 3h | ⬜ |
| 14 | App Routes | 12 | 6h | ⬜ |
| 15 | Testing | 12 | 8h | ⬜ |
| 16 | Integration & Polish | 6 | 4h | ⬜ |
| **TOTAL** | | **137** | **~68h** | |

### 4.2 Critical Path

```
P0 → P1 → P2 → P4 → P9 → P14 → P15 → P16
         ↘ P3 ↗    ↗
     P1 → P5 → P6 → P7 ↗
```

**Estimated Critical Path Duration**: ~52 hours

### 4.3 Quality Gates

| Gate | Command | Requirement |
|------|---------|-------------|
| **Types** | `pnpm typecheck` | Must pass |
| **Lint** | `pnpm lint` | Must pass |
| **Tests** | `pnpm test:unit` | Must pass |
| **No TODOs** | `grep -r "TODO\|FIXME"` | Must be empty |

### 4.4 Implementation Standards

> ⛔ **MANDATORY: FULL IMPLEMENTATION ONLY**

```
┌─────────────────────────────────────────────────────────────┐
│  🚨 NO PLACEHOLDERS • NO STUBS • NO TODOs • NO SHORTCUTS 🚨  │
└─────────────────────────────────────────────────────────────┘
```

**Every file MUST be**:
- ✅ Production-ready
- ✅ Fully functional
- ✅ Type-safe (no `any`)
- ✅ Error-handled
- ✅ Reference-checked (`archive/oldapp/`)

> **Full Details**: [implementation-plan-v5.md](./implementation-plan-v5.md)

---

## 5. Cross-Reference Index

### 5.1 Patterns → Files

| Pattern | Primary Location | Usage Locations |
|---------|------------------|-----------------|
| Error Classes | `src/errors/` | All features, API routes |
| Result Type | `src/types/result.ts` | Actions, services |
| API Response | `src/types/api.types.ts` | API routes |
| Validation Schemas | `features/*/schemas/` | Actions, forms |
| Cache Keys | `lib/cache/keys.ts` | All cache operations |
| SDK Wrappers | `shared/components/ai/` | Chat, artifacts |

### 5.2 Features → Key Files

| Feature | Entry Point | Components Dir | Hooks Dir |
|---------|-------------|----------------|-----------|
| Chat | `features/chat/index.ts` | `features/chat/components/` | `features/chat/hooks/` |
| Auth | `features/auth/index.ts` | `features/auth/components/` | `features/auth/hooks/` |
| Documents | `features/documents/index.ts` | `features/documents/components/` | `features/documents/hooks/` |
| Artifacts | `features/artifacts/index.ts` | `features/artifacts/components/` | `features/artifacts/hooks/` |
| Sidebar | `features/sidebar/index.ts` | `features/sidebar/components/` | `features/sidebar/hooks/` |
| Settings | `features/settings/index.ts` | `features/settings/components/` | `features/settings/hooks/` |

### 5.3 API Routes → Handlers

| Route | Handler | Feature |
|-------|---------|---------|
| `/api/chat` | `app/api/chat/route.ts` | Chat streaming |
| `/api/document` | `app/api/document/route.ts` | Document CRUD |
| `/api/history` | `app/api/history/route.ts` | Chat history |
| `/api/suggestions` | `app/api/suggestions/route.ts` | Suggestions |
| `/api/vote` | `app/api/vote/route.ts` | Voting |
| `/api/files/upload` | `app/api/files/upload/route.ts` | File uploads |

### 5.4 UI Components Index

| Category | Location | Key Components |
|----------|----------|----------------|
| Primitives | `components/ui/` | Button, Input, Card, Dialog |
| AI SDK | `components/ai-elements/` | (30 SDK components - READ-ONLY) |
| AI Wrappers | `shared/components/ai/` | CodeBlock, Message, Reasoning |
| Shared | `shared/components/` | ErrorBoundary, LoadingState |
| Feature UI | `features/*/components/` | Feature-specific components |

---

## 6. Detailed Spec Links

### 6.1 Existing Specs

| Spec | Path | Status |
|------|------|--------|
| Architecture v5 | [architecture-v5-optimal.md](./architecture-v5-optimal.md) | ✅ Canonical |
| Directory Structure | [COMPLETE-DIRECTORY-STRUCTURE.md](./COMPLETE-DIRECTORY-STRUCTURE.md) | ✅ Canonical |
| Implementation Plan | [implementation-plan-v5.md](./implementation-plan-v5.md) | ✅ Approved |
| Task Tracker | [TASK-TRACKER.md](./TASK-TRACKER.md) | 🔄 Active |
| Architecture Validation | [architecture-validation-report.md](./architecture-validation-report.md) | ✅ Complete |
| Cross-Cutting Analysis | [cross-cutting-analysis-combined.md](./cross-cutting-analysis-combined.md) | ✅ Complete |

### 6.2 Pending Specs (To Be Created)

| Spec | Purpose | Priority |
|------|---------|----------|
| API-SPEC.md | API endpoint documentation | High |
| COMPONENT-SPEC.md | Component library docs | Medium |
| DATABASE-SPEC.md | Schema and migration docs | High |
| FEATURE-SPECS.md | Per-feature specifications | Medium |

---

## 7. AI Agent Quick Reference

### 7.1 Before You Start

1. **Read Architecture**: [architecture-v5-optimal.md](./architecture-v5-optimal.md)
2. **Check Task Tracker**: [TASK-TRACKER.md](./TASK-TRACKER.md)
3. **Reference Old Code**: `archive/oldapp/`

### 7.2 File Creation Checklist

```markdown
Before creating any file:
- [ ] Checked `archive/oldapp/` for existing logic
- [ ] Verified correct layer (app/features/shared/lib/src)
- [ ] Follows naming conventions
- [ ] Full implementation (no TODOs/stubs)
- [ ] Type-safe (no `any`)
- [ ] Error handling included
- [ ] Exports via barrel file
```

### 7.3 Common Import Paths

```typescript
// Types & Errors
import { Result, ok, err } from '@/src/types/result';
import { NotFoundError, ValidationError } from '@/src/errors';
import type { ApiResponse } from '@/src/types/api.types';

// AI Components (ALWAYS use wrappers)
import { CodeBlock, Message } from '@/shared/components/ai';

// Shared Hooks
import { useQuery, useMutation } from '@/shared/hooks';

// Database
import { db } from '@/lib/db';
import { chatQueries } from '@/lib/db/queries';

// Cache
import { cache, cacheKeys } from '@/lib/cache';
```

### 7.4 Forbidden Patterns

```typescript
// ❌ Never import SDK directly
import { X } from '@/components/ai-elements/x';

// ❌ Never cross-feature import
import { Y } from '@/features/other-feature';

// ❌ Never use placeholders
export function fn() { /* TODO */ }

// ❌ Never use `any`
const data: any = ...;
```

### 7.5 Task Workflow

1. **Claim task** in TASK-TRACKER.md
2. **Read** corresponding old code from `archive/oldapp/`
3. **Implement** with full code (no stubs)
4. **Validate** with `pnpm typecheck && pnpm lint`
5. **Update** TASK-TRACKER.md with completion status

---

## Appendix: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-27 | Initial creation |

---

*This is the canonical entry point for understanding the nextjs-ai-chatbot project architecture and implementation plan.*
