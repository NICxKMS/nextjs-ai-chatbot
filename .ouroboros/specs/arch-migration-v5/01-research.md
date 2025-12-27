# Phase 1: Research - Architecture Migration v5

> **Spec**: arch-migration-v5  
> **Phase**: 1/5 - Research  
> **Created**: 2024-12-27  
> **Status**: ✅ Complete

---

## 1. Project Overview

### 1.1 Project Identity

| Attribute | Value |
|-----------|-------|
| **Name** | nextjs-ai-chatbot |
| **Type** | AI-powered chat application |
| **Framework** | Next.js 16.1 (App Router) |
| **Target Architecture** | v5-OPTIMAL (Right-Sized Clean Architecture) |
| **Estimated Files** | ~757 files |
| **Estimated Tasks** | 137 tasks across 17 phases |

### 1.2 Project Goals

1. **Migrate** existing codebase to Architecture v5 OPTIMAL
2. **Implement** SDK Wrapper Pattern for AI elements
3. **Apply** Strong SRP with explicit responsibility boundaries
4. **Establish** DRY Pattern Catalog with centralized types/errors/utilities
5. **Create** Repository Pattern for data access abstraction
6. **Adopt** Result Type for explicit error handling

---

## 2. Tech Stack Discovery

### 2.1 Core Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Next.js (App Router) | 16.1 | Full-stack React framework |
| **Language** | TypeScript | 5.x | Type-safe development |
| **UI Library** | React | 19.x | Component-based UI |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Database** | PostgreSQL (Vercel) | - | Relational data storage |
| **ORM** | Drizzle ORM | - | Type-safe database queries |
| **Cache** | Redis (Upstash) | - | Session & data caching |
| **AI SDK** | Vercel AI SDK | 5.x | AI streaming & tools |
| **Auth** | NextAuth.js | 5.x | Authentication |
| **Validation** | Zod | - | Schema validation |
| **State** | Zustand | - | Client state management |
| **Data Fetching** | SWR | - | React hooks for data |
| **Testing** | Vitest + Playwright | - | Unit & E2E testing |

### 2.2 AI Provider Stack

| Provider | Package | Purpose |
|----------|---------|---------|
| OpenAI | `@ai-sdk/openai` | GPT models |
| Anthropic | `@ai-sdk/anthropic` | Claude models |
| Google | `@ai-sdk/google` | Gemini models |
| OpenRouter | `@openrouter/ai-sdk-provider` | Multi-provider gateway |

### 2.3 UI Component Libraries

| Library | Purpose |
|---------|---------|
| Radix UI | Headless UI primitives |
| cmdk | Command palette |
| TipTap | Rich text editor |
| CodeMirror | Code editing |
| XYFlow | Flow diagrams |

---

## 3. Existing Codebase Analysis

### 3.1 Legacy Structure (archive/oldapp/)

The original codebase is preserved at `archive/oldapp/` for reference:

```
archive/oldapp/
├── app/              # Original Next.js routes
├── components/       # Original React components (mixed concerns)
├── lib/             # Original utilities and services
├── hooks/           # Original custom hooks
├── tests/           # Original test files
└── artifacts/       # Original artifact handling
```

### 3.2 Current Migration Status

| Area | Old Location | New Location | Migration Status |
|------|--------------|--------------|------------------|
| Routes | `oldapp/app/` | `app/` | ✅ Migrated |
| AI Elements | `oldapp/components/` | `components/ai-elements/` | ⚠️ SDK extracted |
| Features | `oldapp/lib/` | `features/` | ⬜ Not started |
| Repositories | `oldapp/lib/db/` | `lib/data/repositories/` | ⬜ Not started |
| Types | scattered | `src/types/` | ⬜ Not started |
| Errors | scattered | `src/errors/` | ⬜ Not started |

### 3.3 Key Migration Challenges

1. **AI Element SDK Isolation**: 31 SDK components need wrapper extraction
2. **Feature Decomposition**: Monolithic lib/ needs feature-based restructuring
3. **Type Centralization**: Types scattered across files need consolidation
4. **Error Standardization**: Error handling inconsistent across codebase
5. **Repository Pattern**: Direct DB calls need abstraction layer

---

## 4. Dependencies Inventory

### 4.1 Production Dependencies (Key)

| Package | Category | Critical Path |
|---------|----------|---------------|
| `ai` | AI SDK | Core functionality |
| `@ai-sdk/*` | Providers | AI model integration |
| `drizzle-orm` | Database | Data persistence |
| `@upstash/redis` | Cache | Session/data cache |
| `next-auth` | Auth | User authentication |
| `zod` | Validation | Input validation |
| `zustand` | State | Client state |
| `swr` | Data | Data fetching |

### 4.2 Development Dependencies (Key)

| Package | Category | Purpose |
|---------|----------|---------|
| `vitest` | Testing | Unit tests |
| `playwright` | Testing | E2E tests |
| `drizzle-kit` | Database | Schema migrations |
| `typescript` | Tooling | Type checking |
| `ultracite` | Tooling | Lint & format |

---

## 5. Reference Documents Index

> **Important**: This spec REFERENCES these documents, not duplicates them.

### 5.1 Canonical Specifications

| Document | Path | Purpose | Status |
|----------|------|---------|--------|
| Architecture v5 | [architecture-v5-optimal.md](../architecture-v5-optimal.md) | Core architecture patterns, SRP, SDK wrapper | ✅ Canonical |
| Directory Structure | [COMPLETE-DIRECTORY-STRUCTURE.md](../COMPLETE-DIRECTORY-STRUCTURE.md) | Complete file structure (~757 files) | ✅ Approved |
| Implementation Plan | [implementation-plan-v5.md](../implementation-plan-v5.md) | 17 phases, 137 tasks, ~68 hours | ✅ Approved |
| Task Tracker | [TASK-TRACKER.md](../TASK-TRACKER.md) | Progress tracking dashboard | 🔄 Active |
| Master Spec | [MASTER-SPEC.md](../MASTER-SPEC.md) | Unified reference | ✅ Active |

### 5.2 Domain Specifications

| Document | Path | Purpose |
|----------|------|---------|
| Database Spec | [DATABASE-SPEC.md](../DATABASE-SPEC.md) | Schema, repositories, cache strategy |
| API Spec | [API-SPEC.md](../API-SPEC.md) | Endpoints, contracts, error codes |
| Component Spec | [COMPONENT-SPEC.md](../COMPONENT-SPEC.md) | UI components, props, patterns |
| Feature Specs | [FEATURE-SPECS.md](../FEATURE-SPECS.md) | Feature module definitions |

---

## 6. Architecture Philosophy Summary

### 6.1 Core Principles

> *"Every file has ONE job. Every pattern has ONE source. Every layer has ONE direction."*

1. **Single Responsibility**: Each file/folder owns exactly one concern
2. **SDK Isolation**: Never edit SDK files; extend via wrappers
3. **DRY Centralization**: Types, errors, and patterns defined once
4. **Standardized Naming**: Predictable file locations and names
5. **Explicit Boundaries**: Clear layer dependencies, no violations

### 6.2 Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│                    (app/, features/, components/)                   │
├─────────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE LAYER                           │
│              (lib/ - data, services, AI, auth, cache)               │
├─────────────────────────────────────────────────────────────────────┤
│                      CROSS-CUTTING LAYER                            │
│                   (src/, shared/ - types, errors)                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Research Findings Summary

### 7.1 Strengths Identified

- ✅ Modern tech stack (Next.js 16.1, React 19, AI SDK v5)
- ✅ Established database schema with proper relations
- ✅ Existing AI provider integrations
- ✅ Test infrastructure in place
- ✅ Comprehensive specification documents

### 7.2 Gaps Requiring Migration

- ⬜ Feature-based architecture not yet implemented
- ⬜ SDK Wrapper Pattern not applied to AI elements
- ⬜ Types scattered, not centralized
- ⬜ Error handling inconsistent
- ⬜ Repository pattern not implemented
- ⬜ Result<T,E> not adopted

### 7.3 Critical Path Phases

```
P0 (Foundation) → P1 (Types) → P2 (Database) → P4 (Repositories) 
    → P9 (Chat Feature) → P14 (Routes) → P15 (Testing) → P16 (Integration)
```

---

## 8. Next Phase

**→ [Phase 2: Requirements](./02-requirements.md)**
- Define EARS notation requirements
- Establish user stories
- Document acceptance criteria
- Specify non-functional requirements

---

*Generated by Ouroboros Spec Workflow • Phase 1 Complete*
