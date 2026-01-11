# Implementation Plan v6.0

> **Status**: ACTIVE
> **Total Phases**: 6
> **Total Tasks**: ~120
> **Est. Duration**: 50-65 hours
> **Created**: 2024-12-29
> **Last Updated**: 2024-12-29

## Reference Documents
- [architecture-v6-final.md](./architecture-v6-final.md) - Canonical architecture (29 sections)
- [functional-structure-v6.md](./functional-structure-v6.md) - File-by-file specs (~274 files)
- [directory-tree-v6.md](./directory-tree-v6.md) - Pure directory structure
- [architecture-v6-decisions.md](./architecture-v6-decisions.md) - ADRs 001-020

---

## Table of Contents

- [Phase 1: Infrastructure Foundation](#phase-1-infrastructure-setup)
  - [1A: Core Types & Errors](#sub-phase-1a-core-types--errors-2-hours)
  - [1B: Utilities & Helpers](#sub-phase-1b-utilities--helpers-2-hours)
  - [1C: Caching Layer](#sub-phase-1c-caching-layer-2-hours)
  - [1D: Auth & API Foundation](#sub-phase-1d-auth--api-foundation-2-hours)
- [Phase 2: Data Layer](#phase-2-data-layer)
  - [2A: Base Repositories](#sub-phase-2a-base-repositories-4-hours)
  - [2B: Services](#sub-phase-2b-services-3-hours)
  - [2C: Queries & Composites](#sub-phase-2c-queries--composites-3-hours)
- [Phase 3: Features](#phase-3-features)
  - [3A: Chat Feature](#sub-phase-3a-chat-feature-2-hours)
  - [3B: Artifact Feature](#sub-phase-3b-artifact-feature-2-hours)
  - [3C: Message Feature](#sub-phase-3c-message-feature-2-hours)
  - [3D: Sidebar Feature](#sub-phase-3d-sidebar-feature-2-hours)
  - [3E: Settings Feature](#sub-phase-3e-settings-feature-2-hours)
  - [3F: Auth Feature](#sub-phase-3f-auth-feature-2-hours)
- [Phase 4: Components](#phase-4-components)
  - [4A: AI Primitives (READ-ONLY)](#sub-phase-4a-ai-primitives-read-only-wrappers-25-hours)
  - [4B: AI Wrappers (Custom)](#sub-phase-4b-ai-wrappers-custom-25-hours)
  - [4C: UI Components](#sub-phase-4c-ui-components-25-hours)
  - [4D: Layout Components](#sub-phase-4d-layout-components-25-hours)
- [Phase 5: App Router](#phase-5-app-router)
  - [5A: Page Routes](#sub-phase-5a-page-routes-3-hours)
  - [5B: API Routes](#sub-phase-5b-api-routes-3-hours)
- [Phase 6: Integration & Testing](#phase-6-integration--testing)
  - [6A: Testing](#sub-phase-6a-testing-25-hours)
  - [6B: Deployment](#sub-phase-6b-deployment-25-hours)

---

## Progress Tracking

| Phase | Name | Tasks | Done | Status |
|-------|------|-------|------|--------|
| 1 | Infrastructure | 25 | 0 | NOT STARTED |
| 2 | Data Layer | 20 | 0 | NOT STARTED |
| 3 | Features | 30 | 0 | NOT STARTED |
| 4 | Components | 25 | 0 | NOT STARTED |
| 5 | App Router | 15 | 0 | NOT STARTED |
| 6 | Integration | 10 | 0 | NOT STARTED |

**Total**: ~125 tasks

---

## Global Constraints

1. **NO PLACEHOLDERS** - Every file must be complete, production-ready
2. **NO SHORTCUTS** - Follow architecture exactly as specified
3. **IMPORTS FIRST** - Verify imports exist before implementing
4. **TESTS REQUIRED** - Unit tests for each module
5. **TYPECHECK PASS** - `tsc --noEmit` must pass after each task
6. **LINT CLEAN** - ESLint with zero errors
7. **COPY-THEN-MODIFY** - For ai-elements, copy from archive first
8. **LAYER RULES** - Respect import hierarchy (see architecture-v6-final.md §2)

### Import Hierarchy (MUST FOLLOW)

```
app/       → features, components, lib, src
features/  → components, lib, src (NOT other features except actions)
components/→ lib, src
lib/       → src
src/       → Nothing (base layer)
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `chat-container.tsx` |
| Hooks | camelCase with `use-` prefix | `use-chat-state.ts` |
| Services | camelCase with `.service` suffix | `chat.service.ts` |
| Repositories | camelCase with `.repository` suffix | `chat.repository.ts` |
| Types | camelCase with `.ts` extension | `types.ts` |
| Actions | camelCase with `.action` suffix | `stream-chat.action.ts` |
| Schemas | camelCase with `.schema` suffix | `chat.schema.ts` |

---

## Phase 1: Infrastructure Setup

> **Goal**: Establish foundational lib/ modules that all other layers depend on
> **Duration**: 8-12 hours | **Tasks**: 25 | **Risk**: LOW
> **Dependencies**: None (this is the base layer)
> **Blockers**: Cannot proceed to Phase 2 without completing 1.1-1.14

### Sub-Phase 1A: Core Types & Errors (2 hours)
- Tasks 1.1-1.5: `lib/types/`, `lib/errors.ts`, `lib/constants.ts`

### Sub-Phase 1B: Utilities & Helpers (2 hours)
- Tasks 1.6-1.12: `lib/utils/`, `lib/db/`

### Sub-Phase 1C: Caching Layer (2 hours)
- Tasks 1.13-1.19: `lib/cache/`

### Sub-Phase 1D: Auth & API Foundation (2 hours)
- Tasks 1.20-1.25: `lib/auth/`, `lib/api/`

---

### Phase 1 Prerequisites

Before starting Phase 1, ensure:
- [ ] Node.js 18+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Environment variables configured (`.env.local`)
- [ ] Supabase project created (if using Supabase)
- [ ] Redis instance available (Upstash or local)

---

### 1.1 Create Base Types

| Field | Value |
|-------|-------|
| **Task ID** | 1.1 |
| **File Path** | `lib/types/index.ts` |
| **Description** | Create core TypeScript type definitions used across lib/ layer. Includes database entity types, API types, and environment types. |
| **Dependencies** | None |
| **Doc Reference** | - [functional-structure-v6.md §lib/types/ Types Module](./functional-structure-v6.md)<br>- [architecture-v6-final.md §3 Directory Structure](./architecture-v6-final.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Exports `ApiResponse<T>`, `PaginatedResponse<T>` types
- [ ] Exports `DatabaseEntity` base interface
- [ ] Exports `EnvConfig` type matching all env variables
- [ ] No `any` types allowed
- [ ] `tsc --noEmit` passes

**Implementation Notes**:
```typescript
// Required exports (minimum):
export interface ApiResponse<T> { ... }
export interface PaginatedResponse<T> { ... }
export interface DatabaseEntity { id: string; createdAt: Date; updatedAt: Date }
export type EnvConfig = { ... }
```

---

### 1.2 Create Error System

| Field | Value |
|-------|-------|
| **Task ID** | 1.2 |
| **File Path** | `lib/errors.ts` |
| **Description** | Unified error handling with typed error classes. Must include `AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`, `RateLimitError`. |
| **Dependencies** | 1.1 (lib/types) |
| **Doc Reference** | - [architecture-v6-final.md §17 Error Handling](./architecture-v6-final.md)<br>- [functional-structure-v6.md §lib/errors Error System](./functional-structure-v6.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `AppError` base class with `code`, `message`, `statusCode` properties
- [ ] Subclasses: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `RateLimitError`
- [ ] `isAppError(error: unknown): error is AppError` type guard
- [ ] `toApiResponse(error: AppError): ApiResponse<never>` converter
- [ ] All errors serializable to JSON
- [ ] Unit tests for each error class

**Implementation Notes**:
```typescript
// Error codes enum (required):
export enum ErrorCode {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL = 'INTERNAL_ERROR'
}
```

---

### 1.3 Create Constants Module

| Field | Value |
|-------|-------|
| **Task ID** | 1.3 |
| **File Path** | `lib/constants.ts` |
| **Description** | Application-wide constants including cache TTLs, rate limits, pagination defaults, and feature flags. |
| **Dependencies** | None |
| **Doc Reference** | - [architecture-v6-final.md §8 Caching Strategy](./architecture-v6-final.md)<br>- [architecture-v6-final.md §6 Rate Limiting](./architecture-v6-final.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `CACHE_TTL` object with entity-specific TTLs
- [ ] `RATE_LIMITS` object with endpoint-specific limits
- [ ] `PAGINATION` defaults (limit, maxLimit)
- [ ] `FEATURE_FLAGS` object
- [ ] All values as `const` (no mutation possible)
- [ ] Export types for each constant object

**Implementation Notes**:
```typescript
// Required structure:
export const CACHE_TTL = {
  CHAT: 3600,        // 1 hour
  MESSAGE: 1800,     // 30 min
  USER: 7200,        // 2 hours
  LIST: 300,         // 5 min
} as const
```

---

### 1.4 Create Utility Functions

| Field | Value |
|-------|-------|
| **Task ID** | 1.4 |
| **File Path** | `lib/utils/index.ts` |
| **Description** | Core utility functions: `cn()` for classnames, date formatters, string utils, validation helpers. |
| **Dependencies** | None |
| **Doc Reference** | - [functional-structure-v6.md §lib/utils/ Utility Functions](./functional-structure-v6.md)<br>- [architecture-v6-final.md §3 Directory Structure](./architecture-v6-final.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `cn(...inputs: ClassValue[]): string` - Tailwind class merger
- [ ] `formatDate(date: Date, format?: string): string`
- [ ] `formatRelativeTime(date: Date): string`
- [ ] `truncate(str: string, length: number): string`
- [ ] `generateId(): string` - CUID2 or nanoid
- [ ] `sleep(ms: number): Promise<void>`
- [ ] Unit tests for each utility

**Implementation Notes**:
```typescript
// cn implementation (using clsx + tailwind-merge):
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### 1.5 Create lib/utils/cn.ts

| Field | Value |
|-------|-------|
| **Task ID** | 1.5 |
| **File Path** | `lib/utils/cn.ts` |
| **Description** | Dedicated cn() function file for Tailwind class merging. Separate file for tree-shaking optimization. |
| **Dependencies** | None |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Exports single `cn` function
- [ ] Uses `clsx` + `tailwind-merge`
- [ ] No side effects (pure function)
- [ ] Re-exported from `lib/utils/index.ts`

---

### 1.6 Create lib/utils/format.ts

| Field | Value |
|-------|-------|
| **Task ID** | 1.6 |
| **File Path** | `lib/utils/format.ts` |
| **Description** | Formatting utilities for dates, numbers, file sizes, and durations. |
| **Dependencies** | None |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `formatDate(date: Date | string, format?: string): string`
- [ ] `formatRelativeTime(date: Date | string): string` 
- [ ] `formatFileSize(bytes: number): string`
- [ ] `formatDuration(ms: number): string`
- [ ] `formatNumber(num: number, locale?: string): string`
- [ ] All functions handle edge cases (null, undefined, invalid)
- [ ] Unit tests for each formatter

---

### 1.7 Create lib/utils/date.ts

| Field | Value |
|-------|-------|
| **Task ID** | 1.7 |
| **File Path** | `lib/utils/date.ts` |
| **Description** | Date manipulation utilities without heavy dependencies. |
| **Dependencies** | None |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `isToday(date: Date): boolean`
- [ ] `isYesterday(date: Date): boolean`
- [ ] `startOfDay(date: Date): Date`
- [ ] `endOfDay(date: Date): Date`
- [ ] `addDays(date: Date, days: number): Date`
- [ ] `differenceInDays(dateA: Date, dateB: Date): number`
- [ ] No external date library dependency (optional date-fns)
- [ ] Unit tests

---

### 1.8 Create lib/utils/string.ts

| Field | Value |
|-------|-------|
| **Task ID** | 1.8 |
| **File Path** | `lib/utils/string.ts` |
| **Description** | String manipulation utilities: truncation, slugification, sanitization. |
| **Dependencies** | None |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `truncate(str: string, maxLength: number, suffix?: string): string`
- [ ] `slugify(str: string): string`
- [ ] `capitalize(str: string): string`
- [ ] `sanitizeHtml(str: string): string` (basic XSS prevention)
- [ ] `escapeRegExp(str: string): string`
- [ ] Unit tests for each function

---

### 1.9 Create lib/utils/validation.ts

| Field | Value |
|-------|-------|
| **Task ID** | 1.9 |
| **File Path** | `lib/utils/validation.ts` |
| **Description** | Validation utilities for common patterns (email, URL, UUID). |
| **Dependencies** | None |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `isValidEmail(str: string): boolean`
- [ ] `isValidUrl(str: string): boolean`
- [ ] `isValidUuid(str: string): boolean`
- [ ] `isNonEmptyString(value: unknown): value is string`
- [ ] `isPositiveNumber(value: unknown): value is number`
- [ ] Unit tests with edge cases

---

### 1.10 Create Database Client

| Field | Value |
|-------|-------|
| **Task ID** | 1.10 |
| **File Path** | `lib/db/client.ts` |
| **Description** | Drizzle ORM client initialization with connection pooling and logging. |
| **Dependencies** | 1.1 (lib/types), 1.2 (lib/errors) |
| **Doc Reference** | - [architecture-v6-final.md §12 Database Layer](./architecture-v6-final.md)<br>- [functional-structure-v6.md §lib/db/ Database Client](./functional-structure-v6.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Exports `db` singleton (Drizzle client)
- [ ] Uses connection pooling (pg-pool or similar)
- [ ] Query logging in development only
- [ ] Error handling wraps DB errors in `AppError`
- [ ] Environment-based configuration
- [ ] Graceful shutdown handler

**Implementation Notes**:
```typescript
// Required structure:
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connection = postgres(process.env.DATABASE_URL!, {
  max: 10, // connection pool size
})

export const db = drizzle(connection, { 
  schema,
  logger: process.env.NODE_ENV === 'development' 
})
```

---

### 1.11 Create Database Schema

| Field | Value |
|-------|-------|
| **Task ID** | 1.11 |
| **File Path** | `lib/db/schema.ts` |
| **Description** | Drizzle schema definitions for all entities: users, chats, messages, artifacts, votes, suggestions. |
| **Dependencies** | 1.10 (lib/db/client) |
| **Doc Reference** | - [architecture-v6-final.md §12 Database Schema](./architecture-v6-final.md)<br>- [functional-structure-v6.md §lib/db/schema Schema Definitions](./functional-structure-v6.md) |
| **Est. Time** | 60 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `users` table with id, email, password (hashed), name, createdAt
- [ ] `chats` table with id, userId, title, visibility, context (JSON), createdAt
- [ ] `messages` table with id, chatId, role, content (JSON parts), createdAt
- [ ] `artifacts` table (formerly documents) with id, chatId, title, kind, content, createdAt
- [ ] `votes` table with chatId, messageId, isUpvoted (composite key)
- [ ] `suggestions` table with id, documentId, description, content, createdAt
- [ ] All relations defined (one-to-many, foreign keys)
- [ ] Indexes on frequently queried columns
- [ ] TypeScript types exported for each table

**Implementation Notes**:
```typescript
// Required exports:
export const users = pgTable('users', { ... })
export const chats = pgTable('chats', { ... })
export const messages = pgTable('messages', { ... })
export const artifacts = pgTable('artifacts', { ... })
export const votes = pgTable('votes', { ... })
export const suggestions = pgTable('suggestions', { ... })

// Relations (required):
export const chatsRelations = relations(chats, ({ one, many }) => ({ ... }))
```

---

### 1.12 Create Database Index

| Field | Value |
|-------|-------|
| **Task ID** | 1.12 |
| **File Path** | `lib/db/index.ts` |
| **Description** | Barrel export for database module. Exports db client, schema, and types. |
| **Dependencies** | 1.10, 1.11 |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Re-exports `db` from `./client`
- [ ] Re-exports all tables from `./schema`
- [ ] Re-exports TypeScript types (inferred from schema)
- [ ] No circular dependencies

**Implementation Notes**:
```typescript
export { db } from './client'
export * from './schema'
export type { User, Chat, Message, Artifact, Vote, Suggestion } from './schema'
```

---

### 1.13 Create Redis Cache Client

| Field | Value |
|-------|-------|
| **Task ID** | 1.13 |
| **File Path** | `lib/cache/client.ts` |
| **Description** | Redis client initialization using @upstash/redis for serverless or ioredis for traditional deployment. |
| **Dependencies** | 1.2 (lib/errors) |
| **Doc Reference** | - [architecture-v6-final.md §8 Caching Strategy](./architecture-v6-final.md)<br>- [functional-structure-v6.md §1.5 cache](./functional-structure-v6.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Exports `redis` singleton client
- [ ] Supports Upstash (serverless) and standard Redis
- [ ] Environment-based configuration
- [ ] Connection error handling
- [ ] Typed get/set/del methods
- [ ] Automatic JSON serialization/deserialization

**Implementation Notes**:
```typescript
// For Upstash (recommended for Vercel):
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

---

### 1.14 Create Cache Keys Module

| Field | Value |
|-------|-------|
| **Task ID** | 1.14 |
| **File Path** | `lib/cache/keys.ts` |
| **Description** | Centralized cache key generation functions. Ensures consistent key format across the application. |
| **Dependencies** | None |
| **Doc Reference** | - [architecture-v6-final.md §8 Caching Strategy](./architecture-v6-final.md)<br>- [functional-structure-v6.md §1.5 Cache Module](./functional-structure-v6.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `cacheKeys.chat(id: string): string` → `"chat:{id}"`
- [ ] `cacheKeys.chatList(userId: string): string` → `"chats:user:{userId}"`
- [ ] `cacheKeys.message(id: string): string` → `"message:{id}"`
- [ ] `cacheKeys.messageList(chatId: string): string` → `"messages:chat:{chatId}"`
- [ ] `cacheKeys.user(id: string): string` → `"user:{id}"`
- [ ] `cacheKeys.artifact(id: string): string` → `"artifact:{id}"`
- [ ] Type-safe with string literal types
- [ ] Unit tests verifying key format

**Implementation Notes**:
```typescript
export const cacheKeys = {
  chat: (id: string) => `chat:${id}` as const,
  chatList: (userId: string) => `chats:user:${userId}` as const,
  // ... etc
} as const
```

---

### 1.15 Create Cache Strategies

| Field | Value |
|-------|-------|
| **Task ID** | 1.15 |
| **File Path** | `lib/cache/cache-strategies.ts` |
| **Description** | Cache strategy implementations: read-through, write-through, cache-aside patterns. |
| **Dependencies** | 1.13 (client), 1.14 (keys) |
| **Doc Reference** | - [architecture-v6-final.md §8 Caching Strategy](./architecture-v6-final.md)<br>- [functional-structure-v6.md §1.5 Cache Module](./functional-structure-v6.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `cacheThrough<T>(key, fetcher, ttl): Promise<T>` - Read-through
- [ ] `cacheAside<T>(key, fetcher, ttl): Promise<T>` - Cache-aside
- [ ] `writeThrough<T>(key, data, writer, ttl): Promise<T>` - Write-through
- [ ] `invalidate(key): Promise<void>` - Manual invalidation
- [ ] `invalidatePattern(pattern): Promise<void>` - Pattern-based invalidation
- [ ] Error handling: fallback to fetcher on cache failure
- [ ] Metrics/logging for cache hits/misses
- [ ] Unit tests for each strategy

---

### 1.16 Create Cache Invalidation Module

| Field | Value |
|-------|-------|
| **Task ID** | 1.16 |
| **File Path** | `lib/cache/cache-invalidation.ts` |
| **Description** | Smart cache invalidation helpers for cascading invalidations (e.g., chat deletion invalidates messages). |
| **Dependencies** | 1.13, 1.14, 1.15 |
| **Doc Reference** | - [architecture-v6-final.md §8 Caching Strategy](./architecture-v6-final.md)<br>- [functional-structure-v6.md §1.5 Cache Module](./functional-structure-v6.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `invalidateChat(chatId, userId): Promise<void>` - Invalidates chat + message list
- [ ] `invalidateMessage(chatId, messageId): Promise<void>`
- [ ] `invalidateUserChats(userId): Promise<void>` - All user's chat lists
- [ ] `invalidateArtifact(artifactId, chatId): Promise<void>`
- [ ] Batch invalidation support
- [ ] Transaction-safe (all-or-nothing)

---

### 1.17 Create Memory Cache (L1)

| Field | Value |
|-------|-------|
| **Task ID** | 1.17 |
| **File Path** | `lib/cache/memory-cache.ts` |
| **Description** | In-memory LRU cache for ultra-hot data (e.g., user sessions, model configs). L1 in tiered cache strategy. |
| **Dependencies** | 1.3 (constants) |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] LRU eviction policy
- [ ] Configurable max size (default 1000 items)
- [ ] TTL support per item
- [ ] `get<T>(key): T | undefined`
- [ ] `set<T>(key, value, ttl?): void`
- [ ] `delete(key): boolean`
- [ ] `clear(): void`
- [ ] `has(key): boolean`
- [ ] Unit tests including eviction behavior

---

### 1.18 Create Tiered Cache

| Field | Value |
|-------|-------|
| **Task ID** | 1.18 |
| **File Path** | `lib/cache/tiered-cache.ts` |
| **Description** | Two-tier cache (Memory → Redis) with automatic fallthrough and promotion. |
| **Dependencies** | 1.13, 1.17 |
| **Doc Reference** | - [architecture-v6-final.md §8 Caching Strategy](./architecture-v6-final.md)<br>- [functional-structure-v6.md §1.5 Cache Module](./functional-structure-v6.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] L1: Memory cache (fast, small)
- [ ] L2: Redis cache (slower, larger)
- [ ] `get`: L1 → L2 → null (with L1 promotion on L2 hit)
- [ ] `set`: Write to both L1 and L2
- [ ] `delete`: Delete from both
- [ ] Configurable L1 TTL (shorter than L2)
- [ ] Unit tests for promotion behavior

---

### 1.19 Create Cache Index

| Field | Value |
|-------|-------|
| **Task ID** | 1.19 |
| **File Path** | `lib/cache/index.ts` |
| **Description** | Barrel export for cache module. Main export is the tiered cache instance. |
| **Dependencies** | 1.13-1.18 |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Default export: tiered cache instance
- [ ] Named exports: redis client, cache keys, strategies
- [ ] Type exports for cache operations
- [ ] No circular dependencies

---

### 1.20 Create Auth Configuration

| Field | Value |
|-------|-------|
| **Task ID** | 1.20 |
| **File Path** | `lib/auth/config.ts` |
| **Description** | NextAuth.js (Auth.js) configuration with credentials provider and session handling. |
| **Dependencies** | 1.2 (errors), 1.10 (db) |
| **Doc Reference** | - [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md)<br>- [functional-structure-v6.md §lib/auth/ Auth Module](./functional-structure-v6.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] NextAuth configuration exported
- [ ] Credentials provider with email/password
- [ ] Session strategy: JWT
- [ ] Custom session callback (adds userId)
- [ ] Custom jwt callback
- [ ] Pages config (signin, error)
- [ ] Debug mode in development

**Implementation Notes**:
```typescript
// Must integrate with Drizzle adapter or custom callbacks
import { DrizzleAdapter } from "@auth/drizzle-adapter"
```

---

### 1.21 Create Session Utilities

| Field | Value |
|-------|-------|
| **Task ID** | 1.21 |
| **File Path** | `lib/auth/session.ts` |
| **Description** | Session helper functions for server components and API routes. |
| **Dependencies** | 1.20 (auth/config) |
| **Doc Reference** | - [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md)<br>- [functional-structure-v6.md §lib/auth/ Auth Module](./functional-structure-v6.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `getSession(): Promise<AppSession | null>` - Get current session
- [ ] `requireSession(): Promise<AppSession>` - Throws if not authenticated
- [ ] `isAuthenticated(): Promise<boolean>`
- [ ] `getSessionUser(): Promise<User | null>`
- [ ] `AppSession` type exported with userId, user info
- [ ] Guest session support (for non-auth usage)

---

### 1.22 Create Auth Guards

| Field | Value |
|-------|-------|
| **Task ID** | 1.22 |
| **File Path** | `lib/auth/guards.ts` |
| **Description** | Authorization guard functions for actions and API routes. |
| **Dependencies** | 1.21 (session), 1.2 (errors) |
| **Doc Reference** | - [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md)<br>- [functional-structure-v6.md §lib/auth/ Auth Module](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `requireAuth(session): asserts session is AppSession`
- [ ] `requireOwnership(session, resourceUserId): void` - Throws UnauthorizedError
- [ ] `canAccessChat(session, chat): boolean`
- [ ] `canModifyChat(session, chat): boolean`
- [ ] `isGuest(session): boolean`
- [ ] Unit tests for each guard

---

### 1.23 Create Auth Index

| Field | Value |
|-------|-------|
| **Task ID** | 1.23 |
| **File Path** | `lib/auth/index.ts` |
| **Description** | Barrel export for auth module. |
| **Dependencies** | 1.20-1.22 |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Re-exports auth config
- [ ] Re-exports session utilities
- [ ] Re-exports guards
- [ ] Type exports (AppSession, etc.)

---

### 1.24 Create API Response Helpers

| Field | Value |
|-------|-------|
| **Task ID** | 1.24 |
| **File Path** | `lib/api/response.ts` |
| **Description** | Standardized API response builders for consistency across all endpoints. |
| **Dependencies** | 1.1 (types), 1.2 (errors) |
| **Doc Reference** | - [architecture-v6-final.md §7 API Routes](./architecture-v6-final.md)<br>- [architecture-v6-final.md §13 API Handler Pattern](./architecture-v6-final.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `success<T>(data: T, status?: number): NextResponse`
- [ ] `error(error: AppError): NextResponse`
- [ ] `paginated<T>(data: T[], pagination: PaginationMeta): NextResponse`
- [ ] `stream(stream: ReadableStream): Response`
- [ ] All responses include proper headers (Content-Type, etc.)
- [ ] Consistent JSON structure: `{ success, data?, error?, meta? }`

---

### 1.25 Create API Validation

| Field | Value |
|-------|-------|
| **Task ID** | 1.25 |
| **File Path** | `lib/api/validation.ts` |
| **Description** | Zod schema validation helpers for request body, query params, and path params. |
| **Dependencies** | 1.2 (errors) |
| **Doc Reference** | - [architecture-v6-final.md §7 API Routes](./architecture-v6-final.md)<br>- [architecture-v6-final.md §13 API Handler Pattern](./architecture-v6-final.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `validateBody<T>(request, schema): Promise<T>` - Throws ValidationError
- [ ] `validateQuery<T>(url, schema): T`
- [ ] `validateParams<T>(params, schema): T`
- [ ] Error messages include field paths
- [ ] Supports async refinements
- [ ] Unit tests for validation failures

**Implementation Notes**:
```typescript
// Returns validated data or throws ValidationError
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ValidationError(result.error.format())
  }
  return result.data
}
```

---

### Phase 1 Completion Checklist

Before proceeding to Phase 2, verify:

- [ ] All 25 tasks completed and checked off
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] All unit tests pass (`pnpm test`)
- [ ] No circular dependencies (run `madge --circular lib/`)
- [ ] Import hierarchy respected (lib/ only imports from src/)

---

## Phase 2: Data Layer

> **Goal**: Implement Repository Pattern and Services per architecture spec
> **Duration**: 10-14 hours | **Tasks**: 20 | **Risk**: MEDIUM
> **Dependencies**: Phase 1 complete
> **Blockers**: Cannot proceed to Phase 3 without all repositories

### Sub-Phase 2A: Base Repositories (4 hours)
- Tasks 2.1-2.8: `lib/data/repositories/`

### Sub-Phase 2B: Services (3 hours)
- Tasks 2.9-2.12: `lib/data/services/`

### Sub-Phase 2C: Queries & Composites (3 hours)
- Tasks 2.13-2.19: `lib/data/queries/`, composite operations

---

### Phase 2 Prerequisites

Before starting Phase 2, ensure:
- [ ] Phase 1 fully complete
- [ ] Database migrations run (`pnpm drizzle-kit push`)
- [ ] Redis connection verified
- [ ] `lib/db/schema.ts` exports all table definitions

---

### 2.1 Create Base Repository

| Field | Value |
|-------|-------|
| **Task ID** | 2.1 |
| **File Path** | `lib/data/repositories/base.repository.ts` |
| **Description** | Abstract base class defining repository pattern with generic CRUD, caching strategy, and interface contracts. |
| **Dependencies** | 1.13-1.19 (cache), 1.2 (errors) |
| **Doc Reference** | - [functional-structure-v6.md §1.1.1 base.repository.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 60 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `IReadRepository<T>` interface with findById, findMany, exists, count
- [ ] `IWriteRepository<T, TCreate, TUpdate>` interface with create, createMany, update, delete, deleteMany
- [ ] `BaseRepository<T, TCreate, TUpdate>` abstract class implementing both interfaces
- [ ] Abstract methods: `cacheKey()`, `cacheListKey()`, `ttl`, `listTtl`
- [ ] Abstract DB methods: `doFindById`, `doCreate`, `doUpdate`, `doDelete`, etc.
- [ ] Cache-through read operations (check cache → fetch from DB → populate cache)
- [ ] Write-through operations (write to DB → update cache → invalidate lists)
- [ ] `RepositoryContext` type with userId, isGuest
- [ ] Error handling wraps DB errors
- [ ] ~180 LOC

**Implementation Notes**:
```typescript
// Required interfaces (from functional-structure-v6.md):
export interface Identifiable { id: string }
export interface FindManyOptions { where?, orderBy?, limit?, offset? }
export interface CountOptions { where? }
export interface IReadRepository<T> { ... }
export interface IWriteRepository<T, TCreate, TUpdate> { ... }
export abstract class BaseRepository<...> implements IReadRepository<T>, IWriteRepository<T, TCreate, TUpdate> { ... }
export type RepositoryContext = { userId: string; isGuest: boolean }
```

---

### 2.2 Create Chat Repository

| Field | Value |
|-------|-------|
| **Task ID** | 2.2 |
| **File Path** | `lib/data/repositories/chat.repository.ts` |
| **Description** | Chat entity repository with user-scoped queries, visibility controls, pagination, and guest support. |
| **Dependencies** | 2.1 (base.repository), 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.1.2 chat.repository.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 75 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Extends `BaseRepository<Chat, NewChat, UpdateChat>`
- [ ] Cache keys: `chat:${id}`, `chats:user:${userId}`
- [ ] TTL: 3600 (1h entity), 300 (5m list)
- [ ] `findByUserId(userId, pagination, ctx): Promise<PaginatedResult<Chat>>`
- [ ] `findWithMessages(id, ctx): Promise<{ chat, messages } | null>`
- [ ] `updateTitle(id, title, ctx): Promise<void>`
- [ ] `updateVisibility(id, visibility, ctx): Promise<void>`
- [ ] `updateContext(id, context, ctx): Promise<void>` - For usage tracking
- [ ] `deleteAllForUser(ctx): Promise<{ deletedCount: number }>`
- [ ] User ownership check on all operations
- [ ] Visibility check (public chats readable by anyone)
- [ ] ~350 LOC
- [ ] Unit tests for pagination, visibility, ownership

---

### 2.3 Create Message Repository

| Field | Value |
|-------|-------|
| **Task ID** | 2.3 |
| **File Path** | `lib/data/repositories/message.repository.ts` |
| **Description** | Message entity repository with chat-scoped queries, bulk operations, and regeneration support. |
| **Dependencies** | 2.1 (base.repository), 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.1.3 message.repository.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 70 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Extends `BaseRepository<Message, NewMessage, UpdateMessage>`
- [ ] Cache keys: `message:${id}`, `messages:chat:${chatId}`
- [ ] TTL: 1800 (30m entity), 300 (5m list)
- [ ] `findByChatId(chatId, ctx): Promise<Message[]>`
- [ ] `findByChatIdPaginated(chatId, pagination, ctx): Promise<PaginatedResult<Message>>`
- [ ] `saveMany(messages, ctx): Promise<void>` - Bulk insert
- [ ] `saveWithContext(params, ctx): Promise<void>` - Save with chat context update
- [ ] `deleteAfterTimestamp(chatId, timestamp, ctx): Promise<void>` - For regeneration
- [ ] `countByChatId(chatId): Promise<number>`
- [ ] ~320 LOC
- [ ] Unit tests for bulk operations, timestamp deletion

---

### 2.4 Create User Repository

| Field | Value |
|-------|-------|
| **Task ID** | 2.4 |
| **File Path** | `lib/data/repositories/user.repository.ts` |
| **Description** | User entity repository with auth-related queries and profile management. |
| **Dependencies** | 2.1 (base.repository), 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.1.4 user.repository.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Extends `BaseRepository<User, NewUser, UpdateUser>`
- [ ] Cache key: `user:${id}` (no list cache needed)
- [ ] TTL: 7200 (2h)
- [ ] `findByEmail(email): Promise<User | null>`
- [ ] `findByEmailWithPassword(email): Promise<UserWithPassword | null>` - For auth
- [ ] `updateLastLogin(id): Promise<void>`
- [ ] `existsByEmail(email): Promise<boolean>` - For registration check
- [ ] Password field excluded from cached User type
- [ ] ~150 LOC
- [ ] Unit tests for email lookup, password exclusion

---

### 2.5 Create Artifact Repository

| Field | Value |
|-------|-------|
| **Task ID** | 2.5 |
| **File Path** | `lib/data/repositories/artifact.repository.ts` |
| **Description** | Artifact entity repository (unified from Document) with versioning support, chat association, and suggestion queries. |
| **Dependencies** | 2.1 (base.repository), 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.1.5 artifact.repository.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 65 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Extends `BaseRepository<Artifact, NewArtifact, UpdateArtifact>`
- [ ] Cache keys: `artifact:${id}`, `artifacts:chat:${chatId}`
- [ ] TTL: 3600 (1h entity), 600 (10m list)
- [ ] `findAllVersions(id, ctx): Promise<Artifact[]>` - All versions of artifact
- [ ] `findLatestVersion(id, ctx): Promise<Artifact | null>`
- [ ] `findByChatId(chatId, ctx): Promise<Artifact[]>`
- [ ] `saveVersion(params, ctx): Promise<Artifact[]>` - Add new version
- [ ] `deleteVersionsAfterTimestamp(id, timestamp, ctx): Promise<Artifact[]>` - Rollback
- [ ] `findSuggestions(id, ctx): Promise<Suggestion[]>` - Related suggestions
- [ ] ~280 LOC
- [ ] Unit tests for versioning, rollback

---

### 2.6 Create Vote Repository

| Field | Value |
|-------|-------|
| **Task ID** | 2.6 |
| **File Path** | `lib/data/repositories/vote.repository.ts` |
| **Description** | Vote entity repository for message voting/feedback with upsert support. |
| **Dependencies** | 2.1 (base.repository), 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.1.6 vote.repository.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Composite key: chatId + messageId
- [ ] Cache key: `vote:${chatId}:${messageId}`, `votes:chat:${chatId}`
- [ ] TTL: 3600 (1h entity), 300 (5m list)
- [ ] `findByIds(chatId, messageId, ctx): Promise<Vote | null>`
- [ ] `upsert(data, ctx): Promise<Vote>` - Create or update vote
- [ ] `findByChatId(chatId, ctx): Promise<Vote[]>`
- [ ] `deleteByChatId(chatId): Promise<void>` - Cascade delete
- [ ] `deleteByMessageId(messageId): Promise<void>`
- [ ] ~120 LOC
- [ ] Unit tests for upsert behavior

---

### 2.7 Create Suggestion Repository

| Field | Value |
|-------|-------|
| **Task ID** | 2.7 |
| **File Path** | `lib/data/repositories/suggestion.repository.ts` |
| **Description** | Suggestion entity repository for AI-generated edit suggestions on artifacts. |
| **Dependencies** | 2.1 (base.repository), 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.1.7 suggestion.repository.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Cache key: `suggestion:${id}`, `suggestions:doc:${documentId}`
- [ ] TTL: 1800 (30m entity), 300 (5m list)
- [ ] `findByDocumentId(documentId, ctx): Promise<Suggestion[]>`
- [ ] `createMany(data): Promise<Suggestion[]>` - Bulk create
- [ ] `deleteByDocumentId(documentId): Promise<void>` - Cascade
- [ ] `deleteAfterTimestamp(documentId, timestamp): Promise<void>`
- [ ] ~100 LOC
- [ ] Unit tests for bulk operations

---

### 2.8 Create Repositories Index

| Field | Value |
|-------|-------|
| **Task ID** | 2.8 |
| **File Path** | `lib/data/repositories/index.ts` |
| **Description** | Barrel export for all repositories with lazy initialization support. |
| **Dependencies** | 2.1-2.7 |
| **Doc Reference** | - [functional-structure-v6.md §1.1.8 repositories/index.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §3 Directory Structure](./architecture-v6-final.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Export BaseRepository class (for extension)
- [ ] Export all interface types (IReadRepository, IWriteRepository, etc.)
- [ ] Export singleton instances: chatRepository, messageRepository, etc.
- [ ] Export repository class types for testing
- [ ] ~35 LOC
- [ ] No circular dependencies

---

### 2.9 Create Chat Service

| Field | Value |
|-------|-------|
| **Task ID** | 2.9 |
| **File Path** | `lib/data/services/chat.service.ts` |
| **Description** | Orchestration service for chat operations spanning multiple repositories (chat + messages + votes). |
| **Dependencies** | 2.2, 2.3, 2.6 (repositories) |
| **Doc Reference** | - [functional-structure-v6.md §1.2.1 chat.service.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 55 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `getWithMessages(chatId, ctx): Promise<ChatWithMessages | null>`
- [ ] `getHistory(pagination, ctx): Promise<PaginatedResult<Chat>>`
- [ ] `saveChat(params, ctx): Promise<void>` - Orchestrates chat + messages
- [ ] `deleteChat(chatId, ctx): Promise<Chat | null>` - Cascade delete
- [ ] `deleteAllChats(ctx): Promise<{ deletedCount: number }>`
- [ ] `updateTitle(chatId, title, ctx): Promise<void>`
- [ ] SaveChatParams interface with all required fields
- [ ] Transaction support for multi-repo operations
- [ ] ~180 LOC
- [ ] Unit tests for cascade operations

---

### 2.10 Create Artifact Service

| Field | Value |
|-------|-------|
| **Task ID** | 2.10 |
| **File Path** | `lib/data/services/artifact.service.ts` |
| **Description** | Orchestration service for artifact operations with version management and suggestion handling. |
| **Dependencies** | 2.5, 2.7 (repositories) |
| **Doc Reference** | - [functional-structure-v6.md §1.2.2 artifact.service.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `getWithSuggestions(id, ctx): Promise<ArtifactWithSuggestions | null>`
- [ ] `getVersionHistory(id, ctx): Promise<Artifact[]>`
- [ ] `createVersion(params, ctx): Promise<Artifact[]>`
- [ ] `rollbackToTimestamp(id, timestamp, ctx): Promise<Artifact[]>`
- [ ] `getForChat(chatId, ctx): Promise<Artifact[]>`
- [ ] CreateArtifactParams interface
- [ ] ~120 LOC
- [ ] Unit tests for versioning

---

### 2.11 Create Auth Service

| Field | Value |
|-------|-------|
| **Task ID** | 2.11 |
| **File Path** | `lib/data/services/auth.service.ts` |
| **Description** | Authentication-related data operations coordinating user repository with session management. |
| **Dependencies** | 2.4 (user.repository), 1.20-1.22 (auth) |
| **Doc Reference** | - [functional-structure-v6.md §1.2.3 auth.service.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `verifyCredentials(credentials): Promise<User | null>` - Password verification
- [ ] `registerUser(params): Promise<User>` - Create new user with hashed password
- [ ] `getUserFromSession(session): Promise<User | null>`
- [ ] `createContext(session): RepositoryContext` - Create repo context from session
- [ ] `isGuest(session): boolean`
- [ ] Uses bcrypt or argon2 for password hashing
- [ ] ~90 LOC
- [ ] Unit tests for credential verification

---

### 2.12 Create Services Index

| Field | Value |
|-------|-------|
| **Task ID** | 2.12 |
| **File Path** | `lib/data/services/index.ts` |
| **Description** | Barrel export for all services. |
| **Dependencies** | 2.9-2.11 |
| **Doc Reference** | - [functional-structure-v6.md §1.2.4 services/index.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §3 Directory Structure](./architecture-v6-final.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Export chatService, artifactService, authService
- [ ] Export all type interfaces (SaveChatParams, etc.)
- [ ] ~15 LOC

---

### 2.13 Create Chat Queries

| Field | Value |
|-------|-------|
| **Task ID** | 2.13 |
| **File Path** | `lib/data/queries/chat.queries.ts` |
| **Description** | Complex chat queries including joins with messages and aggregations. |
| **Dependencies** | 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.3.1 chat.queries.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §12 Database Layer](./architecture-v6-final.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `withMessageCount(userId): Promise<ChatWithMessageCount[]>`
- [ ] `withLatestMessage(chatId, userId): Promise<ChatWithLatestMessage | null>`
- [ ] `searchByContent(userId, query, limit?): Promise<ChatSearchResult[]>`
- [ ] `withinDateRange(userId, startDate, endDate): Promise<Chat[]>`
- [ ] `aggregateByPeriod(userId, period): Promise<{ date, count }[]>`
- [ ] Result type interfaces exported
- [ ] Uses Drizzle SQL functions (count, sql)
- [ ] ~140 LOC
- [ ] Integration tests with test DB

---

### 2.14 Create Message Queries

| Field | Value |
|-------|-------|
| **Task ID** | 2.14 |
| **File Path** | `lib/data/queries/message.queries.ts` |
| **Description** | Complex message queries including pagination, search, and role-based filtering. |
| **Dependencies** | 1.10-1.12 (db) |
| **Doc Reference** | - [functional-structure-v6.md §1.3.2 message.queries.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §12 Database Layer](./architecture-v6-final.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `withVotes(chatId, userId): Promise<MessageWithVote[]>`
- [ ] `paginated(chatId, options): Promise<{ messages, nextCursor }>`
- [ ] `byRole(chatId, role): Promise<Message[]>`
- [ ] `searchAcrossChats(userId, query, limit?): Promise<MessageSearchResult[]>`
- [ ] `countByRole(chatId): Promise<{ role, count }[]>`
- [ ] Result type interfaces exported
- [ ] Cursor-based pagination
- [ ] ~130 LOC
- [ ] Integration tests

---

### 2.15 Create Queries Index

| Field | Value |
|-------|-------|
| **Task ID** | 2.15 |
| **File Path** | `lib/data/queries/index.ts` |
| **Description** | Barrel export for all typed queries. |
| **Dependencies** | 2.13, 2.14 |
| **Doc Reference** | - [functional-structure-v6.md §1.3.3 queries/index.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §3 Directory Structure](./architecture-v6-final.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Export chatQueries, messageQueries
- [ ] Export all result type interfaces
- [ ] ~15 LOC

---

### 2.16 Create Data Layer Types

| Field | Value |
|-------|-------|
| **Task ID** | 2.16 |
| **File Path** | `lib/data/types.ts` |
| **Description** | Shared type definitions for data access layer. |
| **Dependencies** | 1.21 (auth/session) |
| **Doc Reference** | - [functional-structure-v6.md §1.4.1 data/types.ts](./functional-structure-v6.md)<br>- [architecture-v6-final.md §5 Repository Pattern](./architecture-v6-final.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `DataContext` interface with userId, isGuest
- [ ] `PaginationParams` interface
- [ ] `PaginatedResult<T>` generic interface
- [ ] `OperationResult<T>` discriminated union
- [ ] Context creation helper types
- [ ] ~40 LOC

---

### 2.17 Create Data Layer Index

| Field | Value |
|-------|-------|
| **Task ID** | 2.17 |
| **File Path** | `lib/data/index.ts` |
| **Description** | Main barrel export for entire data access layer. |
| **Dependencies** | 2.8, 2.12, 2.15, 2.16 |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Re-export from `./repositories`
- [ ] Re-export from `./services`
- [ ] Re-export from `./queries`
- [ ] Re-export from `./types`
- [ ] Clean public API surface
- [ ] ~25 LOC

---

### 2.18 Create Rate Limiter

| Field | Value |
|-------|-------|
| **Task ID** | 2.18 |
| **File Path** | `lib/rate-limit/limiter.ts` |
| **Description** | Rate limiter implementation using @upstash/ratelimit for serverless. |
| **Dependencies** | 1.13 (client), 1.3 (constants) |
| **Doc Reference** | - [architecture-v6-final.md §6 Rate Limiting](./architecture-v6-final.md)<br>- [functional-structure-v6.md §1.6 Rate Limiting](./functional-structure-v6.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Uses @upstash/ratelimit Ratelimit class
- [ ] Sliding window algorithm
- [ ] `checkLimit(identifier, limiter): Promise<RateLimitResult>`
- [ ] `RateLimitResult` type with success, limit, remaining, reset
- [ ] Configurable limits from constants
- [ ] Unit tests for limit enforcement

---

### 2.19 Create Rate Limit Strategies

| Field | Value |
|-------|-------|
| **Task ID** | 2.19 |
| **File Path** | `lib/rate-limit/strategies.ts` |
| **Description** | Pre-configured rate limit strategies for different endpoints. |
| **Dependencies** | 2.18 (limiter), 1.3 (constants) |
| **Doc Reference** | - [architecture-v6-final.md §6 Rate Limiting](./architecture-v6-final.md)<br>- [functional-structure-v6.md §1.6 Rate Limiting](./functional-structure-v6.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `chatRateLimit` - 20 requests/minute
- [ ] `authRateLimit` - 5 requests/minute (strict for auth endpoints)
- [ ] `apiRateLimit` - 60 requests/minute (general API)
- [ ] `uploadRateLimit` - 10 requests/minute
- [ ] Each strategy is a configured Ratelimit instance
- [ ] ~60 LOC

---

### 2.20 Create Rate Limit Index

| Field | Value |
|-------|-------|
| **Task ID** | 2.20 |
| **File Path** | `lib/rate-limit/index.ts` |
| **Description** | Barrel export for rate limiting module. |
| **Dependencies** | 2.18, 2.19 |
| **Doc Reference** | [directory-tree-v6.md](./directory-tree-v6.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Export checkLimit function
- [ ] Export all strategies
- [ ] Export RateLimitResult type
- [ ] ~15 LOC

---

### Phase 2 Completion Checklist

Before proceeding to Phase 3, verify:

- [ ] All 20 tasks completed and checked off
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] All unit tests pass (`pnpm test lib/data`)
- [ ] All integration tests pass (with test database)
- [ ] Repository CRUD operations verified manually
- [ ] Cache operations verified (set/get/invalidate)
- [ ] Rate limiting verified
- [ ] No N+1 queries in repository operations
- [ ] Import hierarchy respected

---

## Phase 3: Features

> **Goal**: Implement feature modules following vertical slice architecture
> **Duration**: 12-16 hours | **Tasks**: 30 | **Risk**: MEDIUM
> **Dependencies**: Phase 1 + Phase 2 complete
> **Blockers**: Cannot proceed to Phase 4 without all features implemented
> **Architecture Reference**: [ADR-019 Feature Organization](./architecture-v6-decisions.md)

### Sub-Phase 3A: Chat Feature (2 hours)
- Tasks 3.1-3.5: `features/chat/`

### Sub-Phase 3B: Artifact Feature (2 hours)
- Tasks 3.6-3.10: `features/artifact/`

### Sub-Phase 3C: Message Feature (2 hours)
- Tasks 3.11-3.15: `features/message/`

### Sub-Phase 3D: Sidebar Feature (2 hours)
- Tasks 3.16-3.20: `features/sidebar/`

### Sub-Phase 3E: Settings Feature (2 hours)
- Tasks 3.21-3.25: `features/settings/`

### Sub-Phase 3F: Auth Feature (2 hours)
- Tasks 3.26-3.30: `features/auth/`

---

### Phase 3 Prerequisites

Before starting Phase 3, ensure:
- [ ] Phase 1 + Phase 2 fully complete
- [ ] `lib/data/` repositories and services tested
- [ ] `lib/ai/` providers configured
- [ ] All schemas exported from `lib/db/schema.ts`

---

### 3.1 Create Chat API Actions

| Field | Value |
|-------|-------|
| **Task ID** | 3.1 |
| **File Path** | `features/chat/api/actions.ts` |
| **Description** | Server actions for chat CRUD operations using data layer services. |
| **Dependencies** | 2.9 (chat.service), 1.21-1.22 (auth) |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use server'` directive at top
- [ ] `createChat(title?)` - Returns new chat ID
- [ ] `deleteChat(chatId)` - With ownership validation
- [ ] `updateChatTitle(chatId, title)` - With ownership validation
- [ ] `getChatHistory(options?)` - Paginated list for current user

---

### 3.2 Create Chat Stream Action

| Field | Value |
|-------|-------|
| **Task ID** | 3.2 |
| **File Path** | `features/chat/api/stream.ts` |
| **Description** | Streaming chat completion action using AI SDK and data persistence. |
| **Dependencies** | 2.9 (chat.service), lib/ai/providers |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md) |
| **Est. Time** | 60 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `streamChat(chatId, messages, modelId)` - Returns StreamableValue
- [ ] Integrates with AI SDK `streamText()`
- [ ] Persists messages on completion via `onFinish`
- [ ] Rate limiting applied before streaming

---

### 3.3 Create Chat Container Component

| Field | Value |
|-------|-------|
| **Task ID** | 3.3 |
| **File Path** | `features/chat/components/ChatContainer.tsx` |
| **Description** | Main chat container orchestrating messages, input, and streaming state. |
| **Dependencies** | 3.1-3.2, 3.4-3.6 |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use client'` directive
- [ ] Manages chat state via `use-chat` hook
- [ ] Renders Messages + MultimodalInput
- [ ] Handles streaming UI state
- [ ] ~120 LOC

---

### 3.4 Create Messages Component

| Field | Value |
|-------|-------|
| **Task ID** | 3.4 |
| **File Path** | `features/chat/components/Messages.tsx` |
| **Description** | Message list with virtualization support and auto-scroll behavior. |
| **Dependencies** | 3.5, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.3 features/message](./functional-structure-v6.md)<br>- [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use client'` directive
- [ ] Renders list of Message components
- [ ] Auto-scroll to bottom on new messages
- [ ] Uses `use-scroll-to-bottom` hook

---

### 3.5 Create Message Component

| Field | Value |
|-------|-------|
| **Task ID** | 3.5 |
| **File Path** | `features/chat/components/Message.tsx` |
| **Description** | Individual message bubble with role-based styling and markdown rendering. |
| **Dependencies** | 3.6, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.3 features/message](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Props: `message: UIMessage`, `isStreaming?: boolean`
- [ ] Role-based styling (user/assistant)
- [ ] Markdown rendering for assistant messages
- [ ] Copy button, edit support for user messages

---

### 3.6 Create MessageEditor Component

| Field | Value |
|-------|-------|
| **Task ID** | 3.6 |
| **File Path** | `features/chat/components/MessageEditor.tsx` |
| **Description** | Inline editor for editing existing user messages. |
| **Dependencies** | components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.3 features/message](./functional-structure-v6.md)<br>- [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use client'` directive
- [ ] Props: `message`, `onSave`, `onCancel`
- [ ] Textarea with save/cancel buttons
- [ ] Escape key cancels, Cmd+Enter saves

---

### 3.7 Create Chat Hooks

| Field | Value |
|-------|-------|
| **Task ID** | 3.7 |
| **File Path** | `features/chat/hooks/use-chat.ts` |
| **Description** | Main chat hook wrapping AI SDK useChat with custom state management. |
| **Dependencies** | 3.1-3.2, lib/ai |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Extends AI SDK `useChat` hook
- [ ] Returns `{ messages, input, handleSubmit, isLoading, error }`
- [ ] Integrates with custom streaming action
- [ ] Optimistic UI updates

---

### 3.8 Create Chat Types & Index

| Field | Value |
|-------|-------|
| **Task ID** | 3.8 |
| **File Path** | `features/chat/types.ts`, `features/chat/index.ts` |
| **Description** | Chat feature type definitions and barrel export. |
| **Dependencies** | 3.1-3.7 |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `ChatProps`, `MessageProps`, `ChatState` types in types.ts
- [ ] index.ts exports all components, hooks, types
- [ ] Clean public API surface

---

### 3.9 Create Artifact API Actions

| Field | Value |
|-------|-------|
| **Task ID** | 3.9 |
| **File Path** | `features/artifact/api/actions.ts` |
| **Description** | Server actions for artifact CRUD with version management. |
| **Dependencies** | 2.10 (artifact.service), 1.21-1.22 (auth) |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use server'` directive
- [ ] `createArtifact(params)` - Create new artifact
- [ ] `updateArtifact(id, content)` - Creates new version
- [ ] `deleteArtifact(id)` - With ownership validation

---

### 3.10 Create Artifact Versions Action

| Field | Value |
|-------|-------|
| **Task ID** | 3.10 |
| **File Path** | `features/artifact/api/versions.ts` |
| **Description** | Server actions for artifact version history and rollback. |
| **Dependencies** | 2.10 (artifact.service) |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `getVersionHistory(artifactId)` - Returns version list
- [ ] `rollbackToVersion(artifactId, versionId)`
- [ ] `getVersionDiff(artifactId, v1, v2)` - Compare versions

---

### 3.11 Create Artifact Suggestions Action

| Field | Value |
|-------|-------|
| **Task ID** | 3.11 |
| **File Path** | `features/artifact/api/suggestions.ts` |
| **Description** | Server actions for AI-generated artifact suggestions. |
| **Dependencies** | 2.10 (artifact.service), lib/ai |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md)<br>- [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `generateSuggestions(artifactId)` - AI suggestions for content
- [ ] `applySuggestion(artifactId, suggestionId)`
- [ ] `dismissSuggestion(suggestionId)`

---

### 3.12 Create Artifact Main Component

| Field | Value |
|-------|-------|
| **Task ID** | 3.12 |
| **File Path** | `features/artifact/components/Artifact.tsx` |
| **Description** | Main artifact container with editor selection based on type. |
| **Dependencies** | 3.13, 3.14, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use client'` directive
- [ ] Props: `artifact`, `onUpdate`, `onClose`
- [ ] Renders appropriate editor based on `artifact.type`
- [ ] Version indicator and history toggle

---

### 3.13 Create Artifact Editors - Code

| Field | Value |
|-------|-------|
| **Task ID** | 3.13 |
| **File Path** | `features/artifact/components/editors/CodeEditor.tsx` |
| **Description** | Code editor for code-type artifacts using CodeMirror. |
| **Dependencies** | @codemirror/*, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md) |
| **Est. Time** | 55 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use client'` directive
- [ ] Syntax highlighting based on language
- [ ] Line numbers, theme support
- [ ] `onChange` callback with debounce

---

### 3.14 Create Artifact Editors - Text/Sheet

| Field | Value |
|-------|-------|
| **Task ID** | 3.14 |
| **File Path** | `features/artifact/components/editors/TextEditor.tsx`, `SheetEditor.tsx` |
| **Description** | Text and spreadsheet editors for respective artifact types. |
| **Dependencies** | components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] TextEditor: Rich text with markdown support
- [ ] SheetEditor: Basic spreadsheet grid
- [ ] Both export `onChange` callback interface

---

### 3.15 Create Artifact Hook

| Field | Value |
|-------|-------|
| **Task ID** | 3.15 |
| **File Path** | `features/artifact/hooks/use-artifact.ts` |
| **Description** | Hook managing artifact state, versions, and persistence. |
| **Dependencies** | 3.9-3.11 |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `useArtifact(id)` - Returns artifact state and actions
- [ ] Auto-save with debounce
- [ ] Version management functions
- [ ] Optimistic updates

---

### 3.16 Create Artifact Types & Index

| Field | Value |
|-------|-------|
| **Task ID** | 3.16 |
| **File Path** | `features/artifact/types.ts`, `features/artifact/index.ts` |
| **Description** | Artifact feature types and barrel export. |
| **Dependencies** | 3.9-3.15 |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `ArtifactType`, `ArtifactProps`, `EditorProps` types
- [ ] index.ts exports all public API
- [ ] Type-safe editor selection

---

### 3.17 Create Sidebar API Actions

| Field | Value |
|-------|-------|
| **Task ID** | 3.17 |
| **File Path** | `features/sidebar/api/actions.ts` |
| **Description** | Server actions for sidebar data: chat history, search, preferences. |
| **Dependencies** | 2.9 (chat.service), 2.13 (chat.queries) |
| **Doc Reference** | - [functional-structure-v6.md §2.4 features/sidebar](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use server'` directive
- [ ] `getChatHistory(options)` - Paginated history
- [ ] `searchChats(query)` - Full-text search
- [ ] `toggleSidebarCollapsed()` - Persist preference

---

### 3.18 Create Sidebar Components

| Field | Value |
|-------|-------|
| **Task ID** | 3.18 |
| **File Path** | `features/sidebar/components/Sidebar.tsx`, `SidebarHistory.tsx`, `SidebarItem.tsx` |
| **Description** | Sidebar component tree with collapsible history and navigation. |
| **Dependencies** | 3.17, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.4 features/sidebar](./functional-structure-v6.md) |
| **Est. Time** | 55 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Sidebar: Collapsible container with header
- [ ] SidebarHistory: Grouped chat list by date
- [ ] SidebarItem: Individual chat with actions (rename, delete)

---

### 3.19 Create Sidebar Hook

| Field | Value |
|-------|-------|
| **Task ID** | 3.19 |
| **File Path** | `features/sidebar/hooks/use-sidebar.ts` |
| **Description** | Hook managing sidebar open/close state and history data. |
| **Dependencies** | 3.17 |
| **Doc Reference** | - [functional-structure-v6.md §2.4 features/sidebar](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `useSidebar()` - Returns `{ isOpen, toggle, history, isLoading }`
- [ ] Persists collapsed state
- [ ] Infinite scroll for history

---

### 3.20 Create Sidebar Types & Index

| Field | Value |
|-------|-------|
| **Task ID** | 3.20 |
| **File Path** | `features/sidebar/types.ts`, `features/sidebar/index.ts` |
| **Description** | Sidebar feature types and barrel export. |
| **Dependencies** | 3.17-3.19 |
| **Doc Reference** | - [functional-structure-v6.md §2.4 features/sidebar](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `SidebarProps`, `SidebarState` types
- [ ] index.ts exports components, hooks, types

---

### 3.21 Create Auth API Actions

| Field | Value |
|-------|-------|
| **Task ID** | 3.21 |
| **File Path** | `features/auth/api/actions.ts` |
| **Description** | Server actions for login, logout, register, password reset. |
| **Dependencies** | 2.11 (auth.service), 1.20-1.22 (lib/auth) |
| **Doc Reference** | - [functional-structure-v6.md §2.6 features/auth](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use server'` directive
- [ ] `login(credentials)` - Returns session or error
- [ ] `logout()` - Clears session
- [ ] `register(params)` - Creates user + session
- [ ] `resetPassword(email)` - Sends reset email

---

### 3.22 Create Auth Components

| Field | Value |
|-------|-------|
| **Task ID** | 3.22 |
| **File Path** | `features/auth/components/LoginForm.tsx`, `RegisterForm.tsx`, `AuthProvider.tsx` |
| **Description** | Authentication forms and context provider. |
| **Dependencies** | 3.21, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.6 features/auth](./functional-structure-v6.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] LoginForm: Email/password with validation
- [ ] RegisterForm: Full registration flow
- [ ] AuthProvider: Session context for client components

---

### 3.23 Create Auth Hook

| Field | Value |
|-------|-------|
| **Task ID** | 3.23 |
| **File Path** | `features/auth/hooks/use-auth.ts` |
| **Description** | Hook providing auth state and actions to components. |
| **Dependencies** | 3.21, 3.22 (AuthProvider) |
| **Doc Reference** | - [functional-structure-v6.md §2.6 features/auth](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `useAuth()` - Returns `{ user, isLoading, login, logout, register }`
- [ ] Consumes AuthProvider context
- [ ] Handles redirect after auth

---

### 3.24 Create Auth Types & Index

| Field | Value |
|-------|-------|
| **Task ID** | 3.24 |
| **File Path** | `features/auth/types.ts`, `features/auth/index.ts` |
| **Description** | Auth feature types and barrel export. |
| **Dependencies** | 3.21-3.23 |
| **Doc Reference** | - [functional-structure-v6.md §2.6 features/auth](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `AuthState`, `LoginCredentials`, `RegisterParams` types
- [ ] index.ts exports components, hooks, actions, types

---

### 3.25 Create Settings API Actions

| Field | Value |
|-------|-------|
| **Task ID** | 3.25 |
| **File Path** | `features/settings/api/actions.ts` |
| **Description** | Server actions for user settings and preferences. |
| **Dependencies** | 2.4 (user.repository), 1.21 (session) |
| **Doc Reference** | - [functional-structure-v6.md §2.5 features/settings](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use server'` directive
- [ ] `getSettings()` - Returns user settings
- [ ] `updateSettings(settings)` - Partial update
- [ ] `resetSettings()` - Reset to defaults

---

### 3.26 Create Settings Components

| Field | Value |
|-------|-------|
| **Task ID** | 3.26 |
| **File Path** | `features/settings/components/SettingsPanel.tsx`, `SettingsForm.tsx` |
| **Description** | Settings panel and form components. |
| **Dependencies** | 3.25, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.5 features/settings](./functional-structure-v6.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] SettingsPanel: Tabbed settings container
- [ ] SettingsForm: Theme, model defaults, notifications
- [ ] Validation with Zod schema

---

### 3.27 Create Settings Types & Index

| Field | Value |
|-------|-------|
| **Task ID** | 3.27 |
| **File Path** | `features/settings/types.ts`, `features/settings/index.ts` |
| **Description** | Settings feature types and barrel export. |
| **Dependencies** | 3.25-3.26 |
| **Doc Reference** | - [functional-structure-v6.md §2.5 features/settings](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `UserSettings`, `SettingsFormValues` types
- [ ] index.ts exports components, actions, types

---

### 3.28 Create Input Components - MultimodalInput

| Field | Value |
|-------|-------|
| **Task ID** | 3.28 |
| **File Path** | `features/input/components/MultimodalInput.tsx` |
| **Description** | Main input component with text, file upload, and voice support. |
| **Dependencies** | 3.29, components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 55 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use client'` directive
- [ ] Text input with auto-resize
- [ ] File attachment support (drag & drop)
- [ ] Submit button with loading state

---

### 3.29 Create Input Components - Attachments

| Field | Value |
|-------|-------|
| **Task ID** | 3.29 |
| **File Path** | `features/input/components/AttachmentPreview.tsx`, `FileUpload.tsx` |
| **Description** | File attachment preview and upload components. |
| **Dependencies** | components/ui |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AttachmentPreview: Image/file preview with remove
- [ ] FileUpload: Dropzone with validation
- [ ] File type and size validation

---

### 3.30 Create Input Types & Index

| Field | Value |
|-------|-------|
| **Task ID** | 3.30 |
| **File Path** | `features/input/types.ts`, `features/input/index.ts` |
| **Description** | Input feature types and barrel export. |
| **Dependencies** | 3.28-3.29 |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `InputProps`, `Attachment`, `FileUploadConfig` types
- [ ] index.ts exports components, types

---

### Phase 3 Completion Checklist

Before proceeding to Phase 4, verify:

- [ ] All 30 tasks completed and checked off
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] All feature unit tests pass
- [ ] Each feature has working barrel export (index.ts)
- [ ] Server actions use `'use server'` directive
- [ ] Client components use `'use client'` directive
- [ ] Import hierarchy respected (features/ → components/, lib/, src/)
- [ ] No cross-feature imports (except via public API)

---

## Phase 4: Components

> **Goal**: Build component layers from ai-elements primitives through layout composition
> **Duration**: 10-14 hours | **Tasks**: 25 | **Risk**: LOW
> **Dependencies**: Phase 1 (lib/) + Phase 3 (features/) complete
> **Blockers**: Cannot proceed to Phase 5 without all components implemented
> **Architecture Reference**: [ADR-020 Two-Layer AI](./architecture-v6-decisions.md)

### Sub-Phase 4A: AI Primitives (READ-ONLY wrappers) (2.5 hours)
- Tasks 4.1-4.10: `src/components/ai-elements/`

### Sub-Phase 4B: AI Wrappers (Custom) (2.5 hours)
- Tasks 4.11-4.15: `src/components/ai/`

### Sub-Phase 4C: UI Components (2.5 hours)
- Tasks 4.16-4.20: `src/components/ui/`

### Sub-Phase 4D: Layout Components (2.5 hours)
- Tasks 4.21-4.25: `src/components/layout/`

---

### Phase 4 Prerequisites

Before starting Phase 4, ensure:
- [ ] Phase 1 + Phase 3 fully complete
- [ ] `lib/utils/cn.ts` available
- [ ] shadcn/ui initialized (`pnpm dlx shadcn@latest init`)
- [ ] Archive `oldapp/components/elements/` accessible for copying

---

### 4.1 Copy ai-elements Index

| Field | Value |
|-------|-------|
| **Task ID** | 4.1 |
| **File Path** | `src/components/ai-elements/index.ts` |
| **Description** | Barrel export for all ai-elements primitives. Copy from archive, update import paths only. |
| **Dependencies** | None |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md)<br>- [ADR-020 Two-Layer AI](./architecture-v6-decisions.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] File copied verbatim from `archive/oldapp/components/elements/`
- [ ] All exports available: AIMessage, AIAssistantMessage, AIUserMessage, etc.
- [ ] Import paths updated if needed (e.g., `@/` prefix)
- [ ] **NO MODIFICATIONS** beyond import path fixes

---

### 4.2 Copy ai-elements Types

| Field | Value |
|-------|-------|
| **Task ID** | 4.2 |
| **File Path** | `src/components/ai-elements/types.ts` |
| **Description** | Shared TypeScript types for ai-elements primitives. READ-ONLY after copy. |
| **Dependencies** | None |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md)<br>- [architecture-v6-final.md §16 AI Primitives](./architecture-v6-final.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] All slot types: `AIRole`, `AIMessageStatus`, `SlotProps`, etc.
- [ ] All message types: `AIMessageProps`, `AIAssistantMessageProps`, etc.
- [ ] **NO MODIFICATIONS** after copy
- [ ] ~280 LOC

---

### 4.3 Copy ai-elements Message Components

| Field | Value |
|-------|-------|
| **Task ID** | 4.3 |
| **File Path** | `src/components/ai-elements/ai-message.tsx`, `ai-assistant-message.tsx`, `ai-user-message.tsx` |
| **Description** | Core message primitives: generic message, assistant, user variants. |
| **Dependencies** | 4.1, 4.2 |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md)<br>- [ADR-020 Two-Layer AI](./architecture-v6-decisions.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AIMessage with slot pattern (Header, Content, Footer, Actions)
- [ ] AIAssistantMessage with reasoning toggle, model badge
- [ ] AIUserMessage with attachment support
- [ ] **COPY VERBATIM** - import paths only

---

### 4.4 Copy ai-elements Streaming & Content

| Field | Value |
|-------|-------|
| **Task ID** | 4.4 |
| **File Path** | `src/components/ai-elements/ai-streaming-text.tsx`, `ai-markdown-response.tsx`, `ai-code-block.tsx` |
| **Description** | Content rendering primitives: streaming text, markdown, code blocks. |
| **Dependencies** | 4.1, 4.2 |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md)<br>- [architecture-v6-final.md §16 AI Primitives](./architecture-v6-final.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AIStreamingText with cursor animation
- [ ] AIMarkdownResponse with syntax highlighting
- [ ] AICodeBlock with line numbers, slot pattern
- [ ] **COPY VERBATIM**

---

### 4.5 Copy ai-elements Actions

| Field | Value |
|-------|-------|
| **Task ID** | 4.5 |
| **File Path** | `src/components/ai-elements/ai-message-action.tsx`, `ai-message-actions.tsx`, `ai-message-controls.tsx` |
| **Description** | Message action primitives: buttons, containers, pre-composed controls. |
| **Dependencies** | 4.1, 4.2 |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AIMessageAction single button
- [ ] AIMessageActions container with visibility
- [ ] AIMessageControls pre-composed (copy, retry, edit, delete)
- [ ] **COPY VERBATIM**

---

### 4.6 Copy ai-elements Input

| Field | Value |
|-------|-------|
| **Task ID** | 4.6 |
| **File Path** | `src/components/ai-elements/ai-composer.tsx`, `ai-compose-form.tsx`, `ai-prompt-input.tsx`, `ai-field.tsx`, `ai-voice-input.tsx` |
| **Description** | Input primitives: composer, form, prompt input, voice input. |
| **Dependencies** | 4.1, 4.2 |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md)<br>- [ADR-020 Two-Layer AI](./architecture-v6-decisions.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AIComposer with slot pattern (Before, After)
- [ ] AIComposeForm with validation
- [ ] AIPromptInput with auto-resize
- [ ] AIVoiceInput with Web Speech API
- [ ] **COPY VERBATIM**

---

### 4.7 Copy ai-elements Containers & Feedback

| Field | Value |
|-------|-------|
| **Task ID** | 4.7 |
| **File Path** | `src/components/ai-elements/ai-chat-session.tsx`, `ai-scroll-container.tsx`, `ai-scroll-anchor.tsx`, `ai-loading-indicator.tsx`, `ai-error-display.tsx` |
| **Description** | Container and feedback primitives: session, scroll, loading, errors. |
| **Dependencies** | 4.1, 4.2 |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AIChatSession container
- [ ] AIScrollContainer with auto-scroll
- [ ] AIScrollAnchor for targeting
- [ ] AILoadingIndicator multi-variant
- [ ] AIErrorDisplay with retry
- [ ] **COPY VERBATIM**

---

### 4.8 Copy ai-elements UI Primitives

| Field | Value |
|-------|-------|
| **Task ID** | 4.8 |
| **File Path** | `src/components/ai-elements/ai-icon.tsx`, `ai-tooltip.tsx`, `ai-model-dropdown.tsx`, `ai-sidebar.tsx`, `ai-sidebar-toggle.tsx`, `ai-image-attachment.tsx`, `ai-file-list.tsx`, `ai-suggestion-item.tsx`, `ai-suggestions-list.tsx` |
| **Description** | UI primitives: icons, tooltips, dropdowns, sidebar, attachments, suggestions. |
| **Dependencies** | 4.1, 4.2 |
| **Doc Reference** | - [functional-structure-v6.md §3.1 ai-elements](./functional-structure-v6.md)<br>- [architecture-v6-final.md §16 AI Primitives](./architecture-v6-final.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AIIcon with lucide-react
- [ ] AITooltip with Radix
- [ ] AIModelDropdown with grouping
- [ ] AISidebar, AISidebarToggle
- [ ] AIImageAttachment, AIFileList
- [ ] AISuggestionItem, AISuggestionsList
- [ ] **COPY VERBATIM** (~9 files)

---

### 4.9 Create AI Wrapper Index

| Field | Value |
|-------|-------|
| **Task ID** | 4.9 |
| **File Path** | `src/components/ai/index.ts` |
| **Description** | Barrel export for project AI wrappers. Exports all composed components. |
| **Dependencies** | 4.10-4.18 |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md)<br>- [ADR-020 Two-Layer AI](./architecture-v6-decisions.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Exports all wrapper components
- [ ] Exports hooks from `./hooks`
- [ ] Exports types from `./types`

---

### 4.10 Create AI Wrapper - Message

| Field | Value |
|-------|-------|
| **Task ID** | 4.10 |
| **File Path** | `src/components/ai/Message.tsx` |
| **Description** | Project wrapper for AIMessage adding actions, reasoning display, and error boundaries. |
| **Dependencies** | 4.1-4.8 (ai-elements), lib/utils |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md)<br>- [architecture-v6-final.md §26 Two-Layer AI (ADR-020)](./architecture-v6-final.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Imports from `@/src/components/ai-elements`
- [ ] Adds project-specific actions (copy, vote, share)
- [ ] Integrates MessageActions wrapper
- [ ] Error boundary integration

---

### 4.11 Create AI Wrapper - AssistantMessage

| Field | Value |
|-------|-------|
| **Task ID** | 4.11 |
| **File Path** | `src/components/ai/AssistantMessage.tsx` |
| **Description** | Wrapper for AIAssistantMessage with voting actions, model display, and reasoning toggle. |
| **Dependencies** | 4.1-4.8, 4.10, features/chat/api |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md)<br>- [ADR-020 Two-Layer AI](./architecture-v6-decisions.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Wraps AIAssistantMessage from ai-elements
- [ ] Adds vote up/down handlers (server action)
- [ ] Shows model badge with tooltip
- [ ] Reasoning toggle state management

---

### 4.12 Create AI Wrapper - UserMessage

| Field | Value |
|-------|-------|
| **Task ID** | 4.12 |
| **File Path** | `src/components/ai/UserMessage.tsx` |
| **Description** | Wrapper for AIUserMessage with edit mode, attachment lightbox, and delete confirmation. |
| **Dependencies** | 4.1-4.8, features/chat/api |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Wraps AIUserMessage from ai-elements
- [ ] Edit mode with cancel/save handlers
- [ ] Delete with confirmation dialog
- [ ] Attachment lightbox on click

---

### 4.13 Create AI Wrapper - Composer

| Field | Value |
|-------|-------|
| **Task ID** | 4.13 |
| **File Path** | `src/components/ai/Composer.tsx` |
| **Description** | Wrapper for AIComposer with attachment handling, model selection, and submit action. |
| **Dependencies** | 4.1-4.8, features/input |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md)<br>- [ADR-020 Two-Layer AI](./architecture-v6-decisions.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Wraps AIComposer from ai-elements
- [ ] File upload integration (drag & drop)
- [ ] Model selector in Before slot
- [ ] Submit/stop button in After slot
- [ ] Keyboard shortcuts (Ctrl+Enter)

---

### 4.14 Create AI Wrapper - ChatContainer

| Field | Value |
|-------|-------|
| **Task ID** | 4.14 |
| **File Path** | `src/components/ai/ChatContainer.tsx` |
| **Description** | Wrapper for AIChatSession with scroll management, auto-scroll toggle, and loading states. |
| **Dependencies** | 4.1-4.8, hooks/use-scroll-to-bottom |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Wraps AIChatSession from ai-elements
- [ ] Integrates AIScrollContainer + AIScrollAnchor
- [ ] Auto-scroll toggle button
- [ ] New message indicator when scrolled up

---

### 4.15 Create AI Wrapper - CodeBlock

| Field | Value |
|-------|-------|
| **Task ID** | 4.15 |
| **File Path** | `src/components/ai/CodeBlock.tsx` |
| **Description** | Wrapper for AICodeBlock with copy action, language detection, and run button (optional). |
| **Dependencies** | 4.1-4.8, lib/utils |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Wraps AICodeBlock from ai-elements
- [ ] Copy button with success toast
- [ ] Language auto-detection fallback
- [ ] Header slot with filename + copy

---

### 4.16 Create AI Wrapper - ErrorBoundary

| Field | Value |
|-------|-------|
| **Task ID** | 4.16 |
| **File Path** | `src/components/ai/ErrorBoundary.tsx` |
| **Description** | Wrapper for AIErrorDisplay with error logging, retry logic, and fallback UI. |
| **Dependencies** | 4.1-4.8, lib/errors |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md)<br>- [architecture-v6-final.md §17 Error Handling](./architecture-v6-final.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] React ErrorBoundary class component
- [ ] Uses AIErrorDisplay for presentation
- [ ] Logs errors to console/service
- [ ] Retry button resets boundary

---

### 4.17 Create AI Wrapper - Hooks

| Field | Value |
|-------|-------|
| **Task ID** | 4.17 |
| **File Path** | `src/components/ai/hooks/index.ts`, `use-ai-message.ts`, `use-ai-streaming.ts`, `use-ai-actions.ts` |
| **Description** | AI wrapper hooks for message state, streaming, and action handlers. |
| **Dependencies** | lib/types, features/chat |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md)<br>- [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `use-ai-message`: Message display state
- [ ] `use-ai-streaming`: Streaming text handler
- [ ] `use-ai-actions`: Copy, vote, share handlers
- [ ] All hooks typed, documented

---

### 4.18 Create AI Wrapper - Types & Remaining

| Field | Value |
|-------|-------|
| **Task ID** | 4.18 |
| **File Path** | `src/components/ai/types.ts`, `ModelSelector.tsx`, `Suggestions.tsx`, `LoadingIndicator.tsx` |
| **Description** | AI wrapper types and remaining wrapper components. |
| **Dependencies** | 4.1-4.8, lib/ai/models |
| **Doc Reference** | - [functional-structure-v6.md §3.2 ai/](./functional-structure-v6.md)<br>- [ADR-020 Two-Layer AI](./architecture-v6-decisions.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] types.ts: Wrapper prop types extending ai-elements
- [ ] ModelSelector: Model dropdown with persistence
- [ ] Suggestions: Clickable suggestion list
- [ ] LoadingIndicator: Project variants

---

### 4.19 Verify shadcn/ui Components

| Field | Value |
|-------|-------|
| **Task ID** | 4.19 |
| **File Path** | `src/components/ui/` (verify existing) |
| **Description** | Verify all required shadcn/ui components are installed and properly configured. |
| **Dependencies** | None |
| **Doc Reference** | - [functional-structure-v6.md §3.3 ui/](./functional-structure-v6.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `button.tsx` - All variants work
- [ ] `card.tsx` - Card, CardHeader, CardContent, CardFooter
- [ ] `dialog.tsx` - Modal dialogs
- [ ] `dropdown-menu.tsx` - Menus
- [ ] `input.tsx` - Text inputs
- [ ] `textarea.tsx` - Multi-line inputs
- [ ] `toast.tsx` + `toaster.tsx` - Notifications

---

### 4.20 Add Missing shadcn/ui - Sidebar

| Field | Value |
|-------|-------|
| **Task ID** | 4.20 |
| **File Path** | `src/components/ui/sidebar.tsx` |
| **Description** | Install shadcn sidebar component for app layout. |
| **Dependencies** | shadcn/ui init |
| **Doc Reference** | - [functional-structure-v6.md §3.3 ui/](./functional-structure-v6.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Run `pnpm dlx shadcn@latest add sidebar`
- [ ] SidebarProvider, Sidebar, SidebarContent exported
- [ ] SidebarTrigger, SidebarInset available
- [ ] Styled with project theme

---

### 4.21 Add Missing shadcn/ui - ScrollArea

| Field | Value |
|-------|-------|
| **Task ID** | 4.21 |
| **File Path** | `src/components/ui/scroll-area.tsx` |
| **Description** | Install shadcn scroll-area component for virtualized lists. |
| **Dependencies** | shadcn/ui init |
| **Doc Reference** | - [functional-structure-v6.md §3.3 ui/](./functional-structure-v6.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Run `pnpm dlx shadcn@latest add scroll-area`
- [ ] ScrollArea, ScrollBar exported
- [ ] Works with message list virtualization

---

### 4.22 Update UI Component Exports

| Field | Value |
|-------|-------|
| **Task ID** | 4.22 |
| **File Path** | `src/components/ui/index.ts` |
| **Description** | Update barrel export to include all shadcn components. |
| **Dependencies** | 4.19-4.21 |
| **Doc Reference** | - [functional-structure-v6.md §3.3 ui/](./functional-structure-v6.md) |
| **Est. Time** | 10 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] All components re-exported from index.ts
- [ ] Import paths consistent (`@/components/ui`)
- [ ] No duplicate exports

---

### 4.23 Create Layout - Header

| Field | Value |
|-------|-------|
| **Task ID** | 4.23 |
| **File Path** | `src/components/layout/Header.tsx` |
| **Description** | Global header component with logo, navigation, user menu, and theme toggle. |
| **Dependencies** | components/ui, lib/auth |
| **Doc Reference** | - [functional-structure-v6.md §3.4 layout/](./functional-structure-v6.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Logo with home link
- [ ] SidebarTrigger for mobile
- [ ] User dropdown (settings, logout)
- [ ] Theme toggle button
- [ ] Responsive design (mobile menu)

---

### 4.24 Create Layout - AppLayout + ChatLayout

| Field | Value |
|-------|-------|
| **Task ID** | 4.24 |
| **File Path** | `src/components/layout/AppLayout.tsx`, `src/components/layout/ChatLayout.tsx` |
| **Description** | Main app shell and chat-specific layouts with sidebar integration. |
| **Dependencies** | 4.23, src/components/ui/sidebar |
| **Doc Reference** | - [functional-structure-v6.md §3.4 layout/](./functional-structure-v6.md) |
| **Est. Time** | 50 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] AppLayout: Sidebar + Header + main content
- [ ] ChatLayout: Messages area + input area
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Scroll behavior for messages

---

### 4.25 Create Layout - Index & Supporting

| Field | Value |
|-------|-------|
| **Task ID** | 4.25 |
| **File Path** | `src/components/layout/index.ts`, `RootLayout.tsx`, `AuthLayout.tsx`, `ThemeProvider.tsx`, `ErrorBoundary.tsx` |
| **Description** | Layout barrel export and supporting layout components. |
| **Dependencies** | 4.23-4.24, next-themes |
| **Doc Reference** | - [functional-structure-v6.md §3.4 layout/](./functional-structure-v6.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] index.ts: Exports all layout components
- [ ] RootLayout: HTML structure, fonts, providers
- [ ] AuthLayout: Centered card layout
- [ ] ThemeProvider: next-themes integration
- [ ] ErrorBoundary: Global error handling

---

### Phase 4 Completion Checklist

Before proceeding to Phase 5, verify:

- [ ] All 25 tasks completed and checked off
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] All ai-elements copied verbatim (no modifications)
- [ ] All AI wrappers import from `@/src/components/ai-elements`
- [ ] shadcn/ui components installed and exported
- [ ] Layout components compose correctly
- [ ] Import hierarchy respected:
  - `src/components/layout/` → `src/components/ui/`, `lib/`
  - `src/components/ai/` → `src/components/ai-elements/`, `lib/`
  - `src/components/ai-elements/` → External only (React, Radix, etc.)

---

## Phase 5: App Router

> **Goal**: Create Next.js App Router structure with route groups and API routes
> **Duration**: 6-8 hours | **Tasks**: 15 | **Risk**: MEDIUM
> **Dependencies**: Phase 1-4 complete
> **Blockers**: Cannot proceed to Phase 6 without all routes implemented
> **Architecture Reference**: [architecture-v6-final.md §7 API Routes](./architecture-v6-final.md)

### Sub-Phase 5A: Page Routes (3 hours)
- Tasks 5.1-5.8: `app/`, `app/(auth)/`, `app/(chat)/`

### Sub-Phase 5B: API Routes (3 hours)
- Tasks 5.9-5.15: `app/api/`

---

### Phase 5 Prerequisites

Before starting Phase 5, ensure:
- [ ] All lib/ modules available (Phase 1)
- [ ] All features/ implemented (Phase 3)
- [ ] All components/ available (Phase 4)
- [ ] Middleware patterns understood
- [ ] Server Components vs Client Components distinction clear

---

### 5.1 Root Layout

| Field | Value |
|-------|-------|
| **Task ID** | 5.1 |
| **File Path** | `app/layout.tsx` |
| **Description** | Create root layout with HTML structure, fonts, metadata, and global providers. Server Component that wraps entire app. |
| **Dependencies** | 4.21 (RootLayout), 1.5 (config) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Imports `GeistSans`, `GeistMono` fonts
- [ ] Sets `<html lang="en" suppressHydrationWarning>`
- [ ] Includes ThemeProvider from components/layout
- [ ] Includes Toaster component
- [ ] Exports metadata object with title, description
- [ ] Minimal file (~40 LOC)

---

### 5.2 Root Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.2 |
| **File Path** | `app/page.tsx` |
| **Description** | Root page that redirects to /chat or shows landing. Server Component. |
| **Dependencies** | 5.1 (layout), 2.4 (auth) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Checks authentication status server-side
- [ ] Redirects authenticated users to `/chat`
- [ ] Shows landing or redirect for unauthenticated
- [ ] Pure Server Component (~20 LOC)

---

### 5.3 Error Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.3 |
| **File Path** | `app/error.tsx` |
| **Description** | Global error boundary for unhandled errors. Client Component with reset functionality. |
| **Dependencies** | 4.24 (ErrorBoundary), components/ui |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md)<br>- [architecture-v6-final.md §17 Error Handling](./architecture-v6-final.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `'use client'` directive at top
- [ ] Receives `error` and `reset` props
- [ ] Displays user-friendly error message
- [ ] Reset button to retry
- [ ] Logs error to console/monitoring
- [ ] Minimal file (~35 LOC)

---

### 5.4 Not Found Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.4 |
| **File Path** | `app/not-found.tsx` |
| **Description** | 404 page for unmatched routes. Simple Server Component. |
| **Dependencies** | components/ui |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 15 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Clear 404 message
- [ ] Link to home page
- [ ] Consistent styling with app theme
- [ ] Minimal file (~25 LOC)

---

### 5.5 Auth Layout

| Field | Value |
|-------|-------|
| **Task ID** | 5.5 |
| **File Path** | `app/(auth)/layout.tsx` |
| **Description** | Layout for auth route group. Centers content, provides auth-specific styling. |
| **Dependencies** | 4.22 (AuthLayout) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Wraps with AuthLayout from components/layout
- [ ] Centered card container
- [ ] Redirects authenticated users away
- [ ] Minimal file (~20 LOC)

---

### 5.6 Login Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.6 |
| **File Path** | `app/(auth)/login/page.tsx` |
| **Description** | Login page with form. Uses auth feature actions. |
| **Dependencies** | 3.1 (auth feature), 5.5 (auth layout) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Imports LoginForm from features/auth/components
- [ ] Server Component that renders client form
- [ ] Link to register page
- [ ] Link to forgot-password page
- [ ] Minimal file (~30 LOC)

---

### 5.7 Register Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.7 |
| **File Path** | `app/(auth)/register/page.tsx` |
| **Description** | Registration page with form. Uses auth feature actions. |
| **Dependencies** | 3.1 (auth feature), 5.5 (auth layout) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Imports RegisterForm from features/auth/components
- [ ] Server Component that renders client form
- [ ] Link to login page
- [ ] Terms of service link (optional)
- [ ] Minimal file (~30 LOC)

---

### 5.8 Forgot Password Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.8 |
| **File Path** | `app/(auth)/forgot-password/page.tsx` |
| **Description** | Password reset request page. Uses auth feature actions. |
| **Dependencies** | 3.1 (auth feature), 5.5 (auth layout) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Imports ForgotPasswordForm from features/auth/components
- [ ] Server Component that renders client form
- [ ] Link back to login page
- [ ] Success message after submission
- [ ] Minimal file (~25 LOC)

---

### 5.9 Chat Layout

| Field | Value |
|-------|-------|
| **Task ID** | 5.9 |
| **File Path** | `app/(chat)/layout.tsx` |
| **Description** | Layout for chat route group. Includes sidebar, requires authentication. |
| **Dependencies** | 3.2 (chat feature), components/layout |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Checks authentication, redirects if not authenticated
- [ ] Includes Sidebar component
- [ ] Flex layout with sidebar + main content
- [ ] Responsive mobile handling
- [ ] Minimal file (~40 LOC)

---

### 5.10 Chat Index Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.10 |
| **File Path** | `app/(chat)/page.tsx` |
| **Description** | Default chat page. Shows new chat interface or redirects to latest chat. |
| **Dependencies** | 3.2 (chat feature), 5.9 (chat layout) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Server Component with data fetching
- [ ] Can show empty state for new chat
- [ ] Uses ChatContainer from features/chat
- [ ] Minimal file (~35 LOC)

---

### 5.11 Chat Detail Page

| Field | Value |
|-------|-------|
| **Task ID** | 5.11 |
| **File Path** | `app/(chat)/chat/[id]/page.tsx` |
| **Description** | Dynamic chat page by ID. Loads chat history, enables streaming. |
| **Dependencies** | 3.2 (chat feature), 5.9 (chat layout) |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md) |
| **Est. Time** | 35 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Dynamic route with `params.id`
- [ ] Server-side chat data fetching
- [ ] 404 if chat not found or unauthorized
- [ ] Passes initial messages to ChatContainer
- [ ] Minimal file (~50 LOC)

---

### 5.12 Chat API Route

| Field | Value |
|-------|-------|
| **Task ID** | 5.12 |
| **File Path** | `app/api/chat/route.ts` |
| **Description** | Streaming chat API endpoint. Thin route that delegates to chat feature action. |
| **Dependencies** | 3.2 (chat feature), lib/api |
| **Doc Reference** | - [functional-structure-v6.md §4.2 app/api/](./functional-structure-v6.md)<br>- [architecture-v6-final.md §13 API Handler Pattern](./architecture-v6-final.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Slim Route Pattern**:
```typescript
// app/api/chat/route.ts (~30 LOC)
import { streamChat } from '@/features/chat/actions/stream-chat.action';
import { withAuth, withRateLimit } from '@/lib/api';

export const POST = withAuth(withRateLimit(async (req) => {
  const body = await req.json();
  return streamChat(body);
}));
```

**Acceptance Criteria**:
- [ ] POST handler only
- [ ] Authentication middleware applied
- [ ] Rate limiting applied
- [ ] Delegates to `streamChat` action
- [ ] Returns streaming response
- [ ] Minimal file (~30 LOC)

---

### 5.13 History API Route

| Field | Value |
|-------|-------|
| **Task ID** | 5.13 |
| **File Path** | `app/api/history/route.ts` |
| **Description** | Chat history CRUD endpoint. Thin route for list/delete operations. |
| **Dependencies** | 3.2 (chat feature), lib/api |
| **Doc Reference** | - [functional-structure-v6.md §4.2 app/api/](./functional-structure-v6.md)<br>- [architecture-v6-final.md §13 API Handler Pattern](./architecture-v6-final.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] GET handler for listing chats
- [ ] DELETE handler for removing chats
- [ ] Authentication required
- [ ] Delegates to chat feature service
- [ ] Returns JSON responses
- [ ] Minimal file (~50 LOC)

---

### 5.14 Artifact API Route

| Field | Value |
|-------|-------|
| **Task ID** | 5.14 |
| **File Path** | `app/api/artifact/route.ts` |
| **Description** | Artifact CRUD endpoint. Thin route for artifact operations. |
| **Dependencies** | 3.3 (artifact feature), lib/api |
| **Doc Reference** | - [functional-structure-v6.md §4.2 app/api/](./functional-structure-v6.md)<br>- [architecture-v6-final.md §13 API Handler Pattern](./architecture-v6-final.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] GET handler for fetching artifact
- [ ] POST handler for creating artifact
- [ ] PUT handler for updating artifact
- [ ] Authentication required
- [ ] Delegates to artifact feature service
- [ ] Minimal file (~60 LOC)

---

### 5.15 Vote API Route

| Field | Value |
|-------|-------|
| **Task ID** | 5.15 |
| **File Path** | `app/api/vote/route.ts` |
| **Description** | Message voting endpoint. Thin route for upvote/downvote operations. |
| **Dependencies** | 3.2 (chat feature), lib/api |
| **Doc Reference** | - [functional-structure-v6.md §4.2 app/api/](./functional-structure-v6.md)<br>- [architecture-v6-final.md §13 API Handler Pattern](./architecture-v6-final.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] POST handler for submitting vote
- [ ] PATCH handler for updating vote
- [ ] Authentication required
- [ ] Validates message belongs to user's chat
- [ ] Delegates to vote service
- [ ] Minimal file (~40 LOC)

---

### Phase 5 Completion Checklist

Before proceeding to Phase 6, verify:

- [ ] All 15 tasks completed and checked off
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] All routes use Server Components where possible
- [ ] Client Components have `'use client'` directive
- [ ] API routes follow slim pattern (15-100 LOC max)
- [ ] Authentication applied to protected routes
- [ ] Route groups `(auth)` and `(chat)` work correctly
- [ ] Dynamic route `[id]` resolves correctly
- [ ] Import hierarchy respected:
  - `app/` → `features/`, `components/`, `lib/`
  - API routes → `features/*/actions/`, `lib/api/`

---

## Phase 6: Integration & Testing

> **Goal**: Final integration, testing, and deployment preparation
> **Duration**: 5-7 hours | **Tasks**: 10 | **Risk**: LOW
> **Dependencies**: Phase 1-5 complete
> **Blockers**: None (final phase)
> **Architecture Reference**: [architecture-v6-final.md (Full Document)](./architecture-v6-final.md)

### Sub-Phase 6A: Testing (2.5 hours)
- Tasks 6.1-6.5: Unit tests, integration tests, E2E setup

### Sub-Phase 6B: Deployment (2.5 hours)
- Tasks 6.6-6.10: CI/CD, Vercel config, environment setup

---

### Phase 6 Prerequisites

Before starting Phase 6, ensure:
- [ ] All previous phases complete
- [ ] Application runs locally without errors
- [ ] Environment variables configured for all environments
- [ ] Test database available (separate from production)

---

### 6.1 Middleware

| Field | Value |
|-------|-------|
| **Task ID** | 6.1 |
| **File Path** | `middleware.ts` |
| **Description** | Root middleware for auth, redirects, and request processing. Runs on Edge runtime. |
| **Dependencies** | lib/auth, lib/middleware |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md)<br>- [architecture-v6-final.md §7 API Routes](./architecture-v6-final.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Exports `middleware` function
- [ ] Exports `config` with matcher patterns
- [ ] Auth session refresh logic
- [ ] Protected route checks
- [ ] Public route bypass
- [ ] Minimal file (~60 LOC)

---

### 6.2 Instrumentation

| Field | Value |
|-------|-------|
| **Task ID** | 6.2 |
| **File Path** | `instrumentation.ts` |
| **Description** | Next.js instrumentation for server-side initialization and monitoring setup. |
| **Dependencies** | lib/log |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md)<br>- [architecture-v6-final.md Full Document](./architecture-v6-final.md) |
| **Est. Time** | 20 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Exports `register` function
- [ ] Initializes logging on server start
- [ ] OpenTelemetry setup (optional)
- [ ] Minimal file (~30 LOC)

---

### 6.3 Next.js Config

| Field | Value |
|-------|-------|
| **Task ID** | 6.3 |
| **File Path** | `next.config.ts` |
| **Description** | Next.js configuration with all required settings for production. |
| **Dependencies** | None |
| **Doc Reference** | - [functional-structure-v6.md §4.1 app/ routes](./functional-structure-v6.md)<br>- [architecture-v6-final.md Full Document](./architecture-v6-final.md) |
| **Est. Time** | 25 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] TypeScript config (not .js)
- [ ] Image domains configured
- [ ] Experimental features enabled if needed
- [ ] Webpack customizations if required
- [ ] Environment variable validation
- [ ] Minimal file (~40 LOC)

---

### 6.4 Auth Integration Tests

| Field | Value |
|-------|-------|
| **Task ID** | 6.4 |
| **File Path** | `tests/integration/auth.test.ts` |
| **Description** | Integration tests for complete auth flow: register → login → session → logout. |
| **Dependencies** | 3.1 (auth feature), 5.5-5.8 (auth routes) |
| **Doc Reference** | - [functional-structure-v6.md §2.6 features/auth](./functional-structure-v6.md)<br>- [architecture-v6-final.md Full Document](./architecture-v6-final.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Test user registration flow
- [ ] Test login with valid credentials
- [ ] Test login with invalid credentials
- [ ] Test session persistence
- [ ] Test logout flow
- [ ] Test protected route access
- [ ] Uses test database, not production

---

### 6.5 Chat Integration Tests

| Field | Value |
|-------|-------|
| **Task ID** | 6.5 |
| **File Path** | `tests/integration/chat.test.ts` |
| **Description** | Integration tests for chat flow: create → message → stream → history. |
| **Dependencies** | 3.2 (chat feature), 5.9-5.13 (chat routes) |
| **Doc Reference** | - [functional-structure-v6.md §2.1 features/chat](./functional-structure-v6.md)<br>- [architecture-v6-final.md §11 AI Architecture](./architecture-v6-final.md) |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Test chat creation
- [ ] Test message sending
- [ ] Test streaming response handling
- [ ] Test chat history retrieval
- [ ] Test chat deletion
- [ ] Test unauthorized access blocked

---

### 6.6 Artifact Integration Tests

| Field | Value |
|-------|-------|
| **Task ID** | 6.6 |
| **File Path** | `tests/integration/artifact.test.ts` |
| **Description** | Integration tests for artifact flow: create → update → versioning. |
| **Dependencies** | 3.3 (artifact feature), 5.14 (artifact route) |
| **Doc Reference** | - [functional-structure-v6.md §2.2 features/artifact](./functional-structure-v6.md)<br>- [architecture-v6-final.md Full Document](./architecture-v6-final.md) |
| **Est. Time** | 40 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Test artifact creation
- [ ] Test artifact update
- [ ] Test version history
- [ ] Test artifact types (code, text, image, sheet)
- [ ] Test unauthorized access blocked

---

### 6.7 Playwright Setup

| Field | Value |
|-------|-------|
| **Task ID** | 6.7 |
| **File Path** | `playwright.config.ts`, `tests/e2e/` |
| **Description** | Configure Playwright for E2E testing with proper fixtures and helpers. |
| **Dependencies** | None |
| **Doc Reference** | - [architecture-v6-final.md Full Document](./architecture-v6-final.md) |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Playwright config with browsers
- [ ] Base URL configuration
- [ ] Auth fixtures for logged-in state
- [ ] Screenshot on failure
- [ ] Test isolation

---

### 6.8 E2E Key Flows

| Field | Value |
|-------|-------|
| **Task ID** | 6.8 |
| **File Path** | `tests/e2e/flows.spec.ts` |
| **Description** | End-to-end tests for critical user journeys. |
| **Dependencies** | 6.7 (Playwright setup) |
| **Doc Reference** | - [architecture-v6-final.md Full Document](./architecture-v6-final.md)<br>- [ADR-019 Feature Organization](./architecture-v6-decisions.md) |
| **Est. Time** | 60 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Test: New user registration → first chat
- [ ] Test: Returning user login → continue chat
- [ ] Test: Create artifact from chat
- [ ] Test: Theme switching
- [ ] Test: Mobile responsive layout
- [ ] All tests pass in CI environment

---

### 6.9 Build Verification

| Field | Value |
|-------|-------|
| **Task ID** | 6.9 |
| **File Path** | N/A (verification task) |
| **Description** | Verify production build succeeds and bundle sizes are acceptable. |
| **Dependencies** | All previous tasks |
| **Doc Reference** | None |
| **Est. Time** | 30 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] `pnpm build` completes without errors
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle analysis shows no oversized chunks
- [ ] First Load JS < 100kB target
- [ ] No circular dependencies detected

---

### 6.10 Deployment Verification

| Field | Value |
|-------|-------|
| **Task ID** | 6.10 |
| **File Path** | N/A (verification task) |
| **Description** | Deploy to Vercel preview and verify all functionality works in production environment. |
| **Dependencies** | 6.9 (build verification) |
| **Doc Reference** | None |
| **Est. Time** | 45 min |
| **Status** | [ ] NOT STARTED |

**Acceptance Criteria**:
- [ ] Vercel preview deployment succeeds
- [ ] Environment variables configured
- [ ] Auth flow works in preview
- [ ] Chat streaming works in preview
- [ ] Artifact creation works in preview
- [ ] No console errors in production
- [ ] Performance metrics acceptable (LCP < 2.5s)

---

### Phase 6 Completion Checklist

Before marking migration complete, verify:

- [ ] All 10 tasks completed and checked off
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Production build succeeds
- [ ] Vercel preview deployment works
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle size targets met
- [ ] All features functional in production

---

## Summary Checklist

### Pre-Migration Checklist

- [ ] Backup current codebase (git branch)
- [ ] Document current environment variables
- [ ] Test database backup created
- [ ] Team notified of migration timeline
- [ ] Rollback plan reviewed

### Phase Completion Summary

| Phase | Tasks | Critical Files | Verification |
|-------|-------|----------------|--------------|
| 1 | 25 | lib/*, src/* | `tsc --noEmit` |
| 2 | 20 | lib/db/*, lib/cache/* | DB connection test |
| 3 | 30 | features/*/* | Feature unit tests |
| 4 | 25 | components/*/* | Component render tests |
| 5 | 15 | app/*/* | Route navigation test |
| 6 | 10 | tests/*, middleware.ts | Full test suite |

### Post-Migration Checklist

- [ ] All 125 tasks completed
- [ ] All tests passing (unit, integration, E2E)
- [ ] Production deployment successful
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Old code archived (archive/ folder)
- [ ] Team trained on new architecture

---

## Rollback Plan

### Immediate Rollback (< 1 hour)

If critical issues discovered within 1 hour of deployment:

1. **Revert Vercel deployment** to previous version via dashboard
2. **No code changes needed** - Vercel keeps previous deployments
3. **Notify team** of rollback and issue

### Short-term Rollback (< 24 hours)

If issues discovered within 24 hours:

1. **Git revert** to pre-migration commit:
   ```bash
   git revert --no-commit HEAD~N..HEAD
   git commit -m "Rollback: Migration issues - [description]"
   ```
2. **Restore database** if schema changed (use backup)
3. **Redeploy** previous version to Vercel
4. **Document** issues for next attempt

### Partial Rollback

If only specific features have issues:

1. **Feature flag** the problematic feature off
2. **Hotfix** the specific issue
3. **Gradual re-enable** with monitoring
4. **No full rollback needed**

### Rollback Triggers

Initiate rollback if:
- [ ] Authentication completely broken
- [ ] Chat streaming non-functional
- [ ] Data loss detected
- [ ] Performance degradation > 50%
- [ ] Security vulnerability discovered

---

## Success Criteria

### Functional Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| Auth works | 100% | All auth tests pass |
| Chat works | 100% | Chat integration tests pass |
| Artifacts work | 100% | Artifact tests pass |
| API routes respond | 100% | API tests pass |
| No regressions | 0 regressions | Manual QA checklist |

### Performance Criteria

| Metric | Target | Tool |
|--------|--------|------|
| First Load JS | < 100kB | `next build` output |
| LCP | < 2.5s | Lighthouse |
| FID | < 100ms | Lighthouse |
| CLS | < 0.1 | Lighthouse |
| TTFB | < 600ms | WebPageTest |

### Code Quality Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| TypeScript errors | 0 | `tsc --noEmit` |
| ESLint errors | 0 | `pnpm lint` |
| Test coverage | > 70% | Jest coverage report |
| Bundle chunks | < 250kB each | Bundle analyzer |
| Circular deps | 0 | `madge --circular` |

### Architecture Criteria

| Criteria | Target | Verification |
|----------|--------|--------------|
| Import hierarchy | No violations | ESLint import rules |
| Feature isolation | No cross-imports | Manual review |
| Slim routes | < 100 LOC each | Code review |
| ai-elements untouched | 100% verbatim | Diff check |

---

## Migration Complete

When all criteria met:

1. **Merge** migration branch to main
2. **Deploy** to production
3. **Monitor** for 24-48 hours
4. **Celebrate** 🎉
5. **Document** lessons learned
6. **Archive** this plan to `.ouroboros/archive/`

---

*Document generated for v6.0 refactoring project*
*Complete implementation plan (Phases 1-6)*
*Total: ~125 tasks across 6 phases*
