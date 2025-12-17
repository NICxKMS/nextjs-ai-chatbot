# Architecture Overhaul Tasks Document
## Feature: Complete Architectural Overhaul & Optimization Plan
## Date: 2025-12-17
## Phase: 4/5 - Tasks

---

# 1. Task Overview

This document breaks down the architectural overhaul into phased, actionable tasks. Tasks are organized by implementation phase and include dependencies, effort estimates, and acceptance criteria.

---

# 2. Task Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 | High Priority (P0) |
| 🟡 | Medium Priority (P1) |
| 🟢 | Low Priority (P2) |
| ⏱️ | Estimated hours |
| 📋 | Has sub-tasks |
| 🔗 | Has dependencies |

---

# 3. Phase 0: Complexity Removal (PREREQUISITE)

> **⚠️ CRITICAL:** Complete ALL Phase 0 tasks before starting Phase 1.
> These tasks reduce migration surface area and eliminate technical debt.

## 3.0 Rationale

Before restructuring, we must remove patterns that:
1. Duplicate Next.js built-in capabilities
2. Add unnecessary abstraction layers
3. Cause maintenance burden without benefit

---

### TASK-001: Delete OptimisticChatsProvider 🔴 ⏱️2h
**Description:** Remove the custom optimistic chat state management system.

**Files to modify:**
- [ ] DELETE `hooks/use-optimistic-chats.tsx` (101 lines)
- [ ] REMOVE OptimisticChatsProvider from `app/(chat)/chat-layout-client.tsx`
- [ ] REMOVE reconciliation logic from `components/sidebar-history.tsx` (lines ~217-250)
- [ ] UPDATE chat creation Server Action to use `revalidatePath('/chat')`

**Replacement approach:**
```typescript
// app/(chat)/actions.ts
'use server';
import { revalidatePath } from 'next/cache';

export async function createChat(data: CreateChatDTO) {
  const chat = await chatRepository.create(data);
  revalidatePath('/chat'); // Triggers sidebar refresh
  return chat;
}
```

**Acceptance Criteria:**
- OptimisticChatsProvider completely removed
- Chat creation still updates sidebar
- No visual regression in chat list updates
- Tests updated/removed as needed

**Effort:** 2 hours
**Dependencies:** None
**Req Trace:** SIM-003

---

### TASK-002: Replace SWR-as-State Anti-Pattern 🔴 ⏱️4h
**Description:** Replace misuse of SWR (without fetchers) with proper state management.

**Files to modify:**
- [ ] CREATE `lib/stores/ui-store.ts` using Zustand
- [ ] MIGRATE `hooks/use-artifact.ts` state to Zustand
- [ ] REMOVE SWR usage for `useArtifact`, `useArtifactSelector`
- [ ] REMOVE SWR usage for `LOCAL_VISIBILITY_KEY` in `sidebar-history.tsx`

**New store structure:**
```typescript
// lib/stores/ui-store.ts
import { create } from 'zustand';
import type { Artifact } from '@/lib/types';

interface UIState {
  artifact: Artifact | null;
  setArtifact: (artifact: Artifact | null) => void;
  localVisibility: Record<string, 'public' | 'private'>;
  setLocalVisibility: (id: string, visibility: 'public' | 'private') => void;
}

export const useUIStore = create<UIState>((set) => ({
  artifact: null,
  setArtifact: (artifact) => set({ artifact }),
  localVisibility: {},
  setLocalVisibility: (id, visibility) => 
    set((state) => ({ 
      localVisibility: { ...state.localVisibility, [id]: visibility } 
    })),
}));
```

**Acceptance Criteria:**
- No SWR usage for non-data-fetching scenarios
- Zustand store working for UI state
- Artifact state accessible globally
- No performance regression

**Effort:** 4 hours
**Dependencies:** None
**Req Trace:** SIM-001

---

### TASK-003: Simplify Redis Cache Layer 🟡 ⏱️4h
**Description:** Reduce Redis cache complexity while keeping essential infrastructure.

**Keep:**
- [ ] Redis client setup and connection pooling
- [ ] Guest session storage (required - not in DB)
- [ ] Rate limiting state helpers
- [ ] Core cache get/set/delete operations

**Remove:**
- [ ] Circuit breaker pattern (~50 lines) - Redis handles failures gracefully
- [ ] Complex sorted set message operations - use `"use cache"` instead
- [ ] Redundant TTL management that duplicates Next.js caching
- [ ] Batch operations not used in codebase

**Target:** 1080 lines → ~250 lines

**Example - Message caching moves to Next.js:**
```typescript
// BEFORE: Complex Redis sorted set operations in cache-operations.ts
// AFTER: features/chat/server/queries.ts (simple)
import { cacheLife, cacheTag } from 'next/cache';

export async function getChatMessages(chatId: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag(`messages-${chatId}`);
  
  return messageRepository.findByChatId(chatId);
}
```

**Acceptance Criteria:**
- Guest sessions still work
- Rate limiting still works
- No circuit breaker complexity
- Message caching uses `"use cache"` directive

**Effort:** 4 hours (reduced from 6h)
**Dependencies:** None
**Req Trace:** SIM-004

---

### TASK-004: Flatten Provider Hierarchy 🔴 ⏱️3h
**Description:** Reduce provider nesting from 8 levels to 4 levels maximum.

**Files to modify:**
- [ ] CREATE `app/providers.tsx` composing Theme + Auth + Tooltip
- [ ] CREATE `app/(chat)/chat-providers.tsx` composing Data + Settings + Sidebar
- [ ] REMOVE intermediate provider wrappers
- [ ] UPDATE `app/layout.tsx` to use composed providers
- [ ] UPDATE `app/(chat)/layout.tsx` to use chat providers

**New structure:**
```typescript
// app/providers.tsx
'use client';
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// app/(chat)/chat-providers.tsx
'use client';
export function ChatProviders({ children }: { children: React.ReactNode }) {
  return (
    <DataStreamProvider>
      <SettingsProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </SettingsProvider>
    </DataStreamProvider>
  );
}
```

**Acceptance Criteria:**
- Provider depth ≤ 4 levels
- All existing functionality preserved
- No context access errors
- DevTools shows cleaner tree

**Effort:** 3 hours
**Dependencies:** TASK-001 (OptimisticChatsProvider must be removed first)
**Req Trace:** SIM-002, CPR-001

---

### TASK-005: Replace Title Polling 🟢 ⏱️2h
**Description:** Remove setTimeout polling for title generation, use streaming instead.

**Files to modify:**
- [ ] REMOVE polling logic in `components/chat.tsx` (lines ~249-276)
- [ ] UPDATE AI streaming to include title in response
- [ ] ADD `revalidatePath` after title generation

**Replacement approach:**
```typescript
// In AI streaming handler
onFinish: async ({ response }) => {
  if (isNewChat && !chat.title) {
    const title = await generateTitle(messages);
    await updateChatTitle(chatId, title);
    revalidatePath('/chat');
  }
};
```

**Acceptance Criteria:**
- No setTimeout/setInterval for title updates
- Title updates appear in sidebar after generation
- No polling network requests

**Effort:** 2 hours
**Dependencies:** None
**Req Trace:** PER-003

---

## Phase 0 Summary

| Task | Priority | Hours | Dependencies |
|------|----------|-------|---------------|
| TASK-001 | 🔴 P0 | 2h | None |
| TASK-002 | 🔴 P0 | 4h | None |
| TASK-003 | 🟡 P1 | 4h | None |
| TASK-004 | 🔴 P0 | 3h | TASK-001 |
| TASK-005 | 🟢 P2 | 2h | None |
| **Total** | - | **15h** | - |

---

# 4. Phase 1: Foundation Setup (Week 1)

## 4.1 Directory Structure

### TASK-101: Create Core Directory Structure 🔴 ⏱️4h
**Description:** Create new directory scaffolding without moving files.

**Sub-tasks:**
- [ ] Create `features/` directory
- [ ] Create `features/chat/{server,client,shared}/`
- [ ] Create `features/artifacts/{server,client,shared}/`
- [ ] Create `features/auth/{server,client,shared}/`
- [ ] Create `features/settings/client/`
- [ ] Create `core/{database,cache,auth,errors,logging}/`
- [ ] Create `core/database/repositories/`
- [ ] Create `shared/{types,ui,utils,constants}/`
- [ ] Create `edge/`

**Acceptance Criteria:**
- All directories exist
- No existing code moved yet
- README.md placeholder in each directory

**Effort:** 4 hours
**Dependencies:** None
**Req Trace:** MAR-001

---

### TASK-102: Configure Path Aliases 🔴 ⏱️2h
**Description:** Update tsconfig.json with new path aliases.

**Changes:**
\\\json
{
  "paths": {
    "@/*": ["./*"],
    "@/features/*": ["features/*"],
    "@/core/*": ["core/*"],
    "@/shared/*": ["shared/*"],
    "@/edge/*": ["edge/*"]
  }
}
\\\

**Acceptance Criteria:**
- TypeScript recognizes all paths
- No import errors in IDE
- Build succeeds

**Effort:** 2 hours
**Dependencies:** TASK-101
**Req Trace:** MAR-001

---

### TASK-103: Create Module Index Files 🟡 ⏱️3h
**Description:** Create index.ts barrel exports for each module.

**Files to create:**
- `features/chat/index.ts`
- `features/artifacts/index.ts`
- `features/auth/index.ts`
- `features/settings/index.ts`
- `core/index.ts`
- `shared/types/index.ts`
- `shared/ui/index.ts`
- `shared/utils/index.ts`

**Acceptance Criteria:**
- All modules have index.ts
- Exports follow public API pattern
- No circular dependencies

**Effort:** 3 hours
**Dependencies:** TASK-101
**Req Trace:** MAR-004

---

## 3.2 Core Layer Setup

### TASK-104: Setup Core Database Module 🔴 ⏱️6h 📋
**Description:** Extract database setup into core layer.

**Sub-tasks:**
- [ ] Move `lib/db/schema.ts` → `core/database/schema.ts`
- [ ] Create `core/database/client.ts` with connection pooling
- [ ] Add `server-only` import guard
- [ ] Create repository interfaces

**Acceptance Criteria:**
- Database client isolated in core
- `server-only` prevents client import
- Existing queries still work (temporarily)

**Effort:** 6 hours
**Dependencies:** TASK-102
**Req Trace:** MAR-003, RSR-001

---

### TASK-105: Create Repository Pattern Base 🔴 ⏱️4h
**Description:** Implement base repository pattern.

**Files:**
\\\	ypescript
// core/database/repositories/base.ts
export interface Repository<T, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findMany(filter: Filter): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
}
\\\

**Acceptance Criteria:**
- Base interface defined
- Generic types for entities
- Transaction support planned

**Effort:** 4 hours
**Dependencies:** TASK-104
**Req Trace:** DFR-001

---

### TASK-106: Create Chat Repository 🔴 ⏱️6h
**Description:** Implement ChatRepository with existing queries.

**Methods to implement:**
- `findById(chatId: string)`
- `findByUserId(userId: string, pagination)`
- `create(data: CreateChatDTO)`
- `updateTitle(chatId: string, title: string)`
- `delete(chatId: string)`

**Acceptance Criteria:**
- All chat queries migrated
- Uses DataContext for auth
- `use cache` on read methods

**Effort:** 6 hours
**Dependencies:** TASK-105
**Req Trace:** DFR-001, NPR-002

---

### TASK-107: Create Message Repository 🟡 ⏱️4h
**Description:** Implement MessageRepository.

**Methods:**
- `findByChatId(chatId: string)`
- `create(message: CreateMessageDTO)`
- `saveMany(messages: CreateMessageDTO[])`

**Effort:** 4 hours
**Dependencies:** TASK-105
**Req Trace:** DFR-001

---

### TASK-108: Create User Repository 🟡 ⏱️3h
**Description:** Implement UserRepository.

**Methods:**
- `findById(id: string)`
- `findByEmail(email: string)`
- `create(user: CreateUserDTO)`

**Effort:** 3 hours
**Dependencies:** TASK-105
**Req Trace:** DFR-001

---

### TASK-109: Setup Core Error Module 🔴 ⏱️3h
**Description:** Consolidate error handling in core.

**Files:**
- `core/errors/base.ts` - Error classes
- `core/errors/codes.ts` - Error code constants
- `core/errors/handlers.ts` - Error handlers

**Acceptance Criteria:**
- All app errors extend base class
- Consistent error codes
- HTTP status mapping

**Effort:** 3 hours
**Dependencies:** TASK-101
**Req Trace:** DFR-004

---

### TASK-110: Setup Core Logging Module 🟢 ⏱️2h
**Description:** Extract logging utilities.

**Move:** `lib/log.ts` → `core/logging/logger.ts`

**Effort:** 2 hours
**Dependencies:** TASK-101
**Req Trace:** MAR-003

---

---

# 5. Phase 2: Feature Extraction (Weeks 2-3)

## 5.1 Auth Feature

### TASK-201: Extract Auth Server Code 🔴 ⏱️6h 📋
**Description:** Move auth server code to feature module.

**Sub-tasks:**
- [ ] Move `lib/auth/session.ts` → `features/auth/server/session.ts`
- [ ] Create `features/auth/server/guards.ts`
- [ ] Add `server-only` imports
- [ ] Update all imports project-wide

**Acceptance Criteria:**
- Auth logic isolated
- No client bundle contamination
- All auth flows work

**Effort:** 6 hours
**Dependencies:** TASK-104
**Req Trace:** RSR-001, MAR-001

---

### TASK-202: Extract Auth Client Code 🔴 ⏱️4h
**Description:** Move auth client components.

**Files to move:**
- `components/auth-provider.tsx` → `features/auth/client/auth-provider.tsx`
- `lib/auth/client.ts` → `features/auth/client/utils.ts`
- Create `features/auth/client/hooks/use-auth.ts`

**Acceptance Criteria:**
- Client components in client/
- Provider exports from index.ts
- useAuth hook available

**Effort:** 4 hours
**Dependencies:** TASK-201
**Req Trace:** RSR-002, MAR-001

---

### TASK-203: Create Auth Types 🟡 ⏱️2h
**Description:** Define auth shared types.

**File:** `features/auth/shared/types.ts`

**Types:**
- `AppSession`
- `AppSessionUser`
- `AppUserType`
- `AuthStatus`

**Effort:** 2 hours
**Dependencies:** TASK-201
**Req Trace:** RSR-004

---

## 4.2 Chat Feature

### TASK-204: Extract Chat Server Code 🔴 ⏱️8h 📋
**Description:** Move chat server logic to feature module.

**Sub-tasks:**
- [ ] Create `features/chat/server/queries.ts` with `use cache`
- [ ] Create `features/chat/server/mutations.ts` as Server Actions
- [ ] Move streaming logic to `features/chat/server/streaming.ts`
- [ ] Move AI integration to `features/chat/server/ai.ts`

**Acceptance Criteria:**
- All chat server code in feature
- `use cache` on queries
- Server Actions for mutations

**Effort:** 8 hours
**Dependencies:** TASK-106, TASK-107
**Req Trace:** NPR-002, NPR-003

---

### TASK-205: Decompose Chat Component 🔴 ⏱️10h 📋
**Description:** Break down 524-line chat.tsx into smaller components.

**New components:**
- [ ] `features/chat/client/chat-container.tsx` (~100 lines)
- [ ] `features/chat/client/message-list.tsx` (~80 lines)
- [ ] `features/chat/client/message-input.tsx` (~80 lines)
- [ ] `features/chat/client/chat-header.tsx` (~50 lines)
- [ ] `features/chat/client/hooks/use-chat-state.ts` (~100 lines)
- [ ] `features/chat/client/hooks/use-chat-actions.ts` (~100 lines)

**Acceptance Criteria:**
- No component > 200 lines
- State logic in hooks
- All tests passing

**Effort:** 10 hours
**Dependencies:** TASK-204
**Req Trace:** CPR-004

---

### TASK-206: Create Chat Context 🟡 ⏱️4h
**Description:** Implement optimized chat context.

**Files:**
- `features/chat/client/context/chat-context.tsx`
- Split into State and Dispatch contexts

**Acceptance Criteria:**
- Context splitting implemented
- Components use correct context
- No unnecessary re-renders

**Effort:** 4 hours
**Dependencies:** TASK-205
**Req Trace:** CPR-002

---

### TASK-207: Extract Chat Types 🟡 ⏱️2h
**Description:** Define chat shared types.

**File:** `features/chat/shared/types.ts`

**Effort:** 2 hours
**Dependencies:** TASK-204
**Req Trace:** RSR-004

---

## 4.3 Artifacts Feature

### TASK-208: Extract Artifacts Server Code 🔴 ⏱️6h
**Description:** Move artifact server code.

**Files:**
- `artifacts/actions.ts` → `features/artifacts/server/mutations.ts`
- Create `features/artifacts/server/queries.ts`

**Effort:** 6 hours
**Dependencies:** TASK-105
**Req Trace:** MAR-001

---

### TASK-209: Setup Lazy Loading for Editors 🔴 ⏱️6h 📋
**Description:** Implement lazy loading for heavy editors.

**Sub-tasks:**
- [ ] Create `features/artifacts/client/lazy/code-editor.tsx`
- [ ] Create `features/artifacts/client/lazy/text-editor.tsx`
- [ ] Create `features/artifacts/client/lazy/sheet-editor.tsx`
- [ ] Add loading states for each

**Acceptance Criteria:**
- Editors load on demand
- Loading states show
- No initial bundle impact

**Effort:** 6 hours
**Dependencies:** TASK-208
**Req Trace:** BOR-004

---

### TASK-210: Create Artifact Viewer Component 🟡 ⏱️4h
**Description:** Extract artifact viewing logic.

**File:** `features/artifacts/client/artifact-viewer.tsx`

**Effort:** 4 hours
**Dependencies:** TASK-209
**Req Trace:** MAR-001

---

## 4.4 Settings Feature

### TASK-211: Extract Settings Feature 🟡 ⏱️4h
**Description:** Move settings to feature module.

**Files:**
- `lib/ui/settings-store.tsx` → `features/settings/client/settings-provider.tsx`
- `components/settings/*` → `features/settings/client/`

**Effort:** 4 hours
**Dependencies:** TASK-102
**Req Trace:** MAR-001

---

---

# 5. Phase 3: Provider Restructure (Week 3)

### TASK-301: Create Providers Component 🔴 ⏱️4h
**Description:** Implement centralized Providers wrapper.

**File:** `app/providers.tsx`

\\\	sx
"use client";
export function Providers({ children, initialSession }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider initialSession={initialSession}>
          {children}
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
\\\

**Acceptance Criteria:**
- Single provider import in layout
- 3 levels max at root
- All providers working

**Effort:** 4 hours
**Dependencies:** TASK-202, TASK-211
**Req Trace:** CPR-003

---

### TASK-302: Create Chat Providers Component 🔴 ⏱️3h
**Description:** Create chat-specific providers wrapper.

**File:** `features/chat/client/chat-providers.tsx`

**Contains:**
- SettingsProvider
- DataStreamProvider
- OptimisticChatsProvider

**Effort:** 3 hours
**Dependencies:** TASK-206
**Req Trace:** CPR-001

---

### TASK-303: Refactor Root Layout 🔴 ⏱️4h
**Description:** Simplify root layout with Providers component.

**Changes:**
- Remove inline provider nesting
- Use new Providers component
- Keep AppShell for server data fetching

**Effort:** 4 hours
**Dependencies:** TASK-301
**Req Trace:** CPR-003

---

### TASK-304: Refactor Chat Layout 🔴 ⏱️4h
**Description:** Simplify chat layout.

**Changes:**
- Use ChatProviders wrapper
- Remove inline nesting
- Prepare for parallel routes

**Effort:** 4 hours
**Dependencies:** TASK-302
**Req Trace:** CPR-001

---

---

# 6. Phase 4: Parallel Routes (Week 4)

### TASK-401: Create Sidebar Parallel Route 🟡 ⏱️6h 📋
**Description:** Implement @sidebar parallel route.

**Sub-tasks:**
- [ ] Create `app/(chat)/@sidebar/default.tsx`
- [ ] Create `app/(chat)/@sidebar/loading.tsx`
- [ ] Create `app/(chat)/@sidebar/error.tsx`
- [ ] Move sidebar component to slot

**Acceptance Criteria:**
- Sidebar loads independently
- Own loading state
- Own error boundary

**Effort:** 6 hours
**Dependencies:** TASK-304
**Req Trace:** NPR-004

---

### TASK-402: Create Main Content Parallel Route 🟡 ⏱️4h
**Description:** Implement @main parallel route.

**Files:**
- `app/(chat)/@main/default.tsx`
- `app/(chat)/@main/[id]/page.tsx`

**Effort:** 4 hours
**Dependencies:** TASK-401
**Req Trace:** NPR-004

---

### TASK-403: Update Chat Layout for Slots 🟡 ⏱️3h
**Description:** Update layout to accept parallel slots.

\\\	sx
export default function ChatLayout({
  sidebar,
  main,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}) {
  return (
    <ChatProviders>
      <div className="flex">
        {sidebar}
        {main}
      </div>
    </ChatProviders>
  );
}
\\\

**Effort:** 3 hours
**Dependencies:** TASK-401, TASK-402
**Req Trace:** NPR-004

---

---

# 7. Phase 5: Bundle Optimization (Week 4-5)

### TASK-501: Implement Dynamic Imports 🔴 ⏱️6h
**Description:** Add dynamic imports for heavy components.

**Components to lazy load:**
- All artifact editors
- Mermaid renderer
- KaTeX renderer
- Pyodide runtime

**Effort:** 6 hours
**Dependencies:** TASK-209
**Req Trace:** BOR-002, BOR-004

---

### TASK-502: Optimize Third-Party Imports 🔴 ⏱️4h
**Description:** Ensure optimal third-party bundling.

**Tasks:**
- Verify optimizePackageImports config
- Add missing packages
- Remove unused imports

**Effort:** 4 hours
**Dependencies:** TASK-501
**Req Trace:** BOR-003

---

### TASK-503: Add Bundle Analysis 🟡 ⏱️3h
**Description:** Setup automated bundle analysis.

**Tasks:**
- Configure @next/bundle-analyzer
- Add npm script for analysis
- Document baseline metrics

**Effort:** 3 hours
**Dependencies:** TASK-502
**Req Trace:** BOR-001

---

### TASK-504: Verify Type-Only Imports 🟡 ⏱️4h
**Description:** Audit and fix type imports.

**Tasks:**
- Find all type imports
- Convert to `import type`
- Verify no runtime impact

**Effort:** 4 hours
**Dependencies:** TASK-203, TASK-207
**Req Trace:** RSR-004

---

---

# 8. Phase 6: Testing & Validation (Week 5)

### TASK-601: Update Test Structure 🔴 ⏱️6h
**Description:** Reorganize tests to match new structure.

**New structure:**
\\\
tests/
├── features/
│   ├── chat/
│   ├── auth/
│   └── artifacts/
├── core/
│   └── database/
└── e2e/
\\\

**Effort:** 6 hours
**Dependencies:** All TASK-2xx
**Req Trace:** MAR-001

---

### TASK-602: Add Repository Tests 🟡 ⏱️8h
**Description:** Unit tests for repositories.

**Coverage:**
- ChatRepository
- MessageRepository
- UserRepository

**Effort:** 8 hours
**Dependencies:** TASK-106, TASK-107, TASK-108
**Req Trace:** DFR-001

---

### TASK-603: Performance Testing �� ⏱️4h
**Description:** Validate performance requirements.

**Tests:**
- Lighthouse CI for TTI < 3s
- Lighthouse CI for FCP < 1.5s
- Bundle size < 150KB

**Effort:** 4 hours
**Dependencies:** TASK-503
**Req Trace:** PER-001, PER-002, BOR-001

---

### TASK-604: E2E Regression Tests 🔴 ⏱️6h
**Description:** Run full E2E suite, fix regressions.

**Effort:** 6 hours
**Dependencies:** All previous tasks
**Req Trace:** All

---

---

# 9. Task Summary

## 9.1 By Phase

| Phase | Tasks | Est. Hours | Priority |
|-------|-------|------------|----------|
| **0. Complexity Removal** | **5** | **15h** | **P0** |
| 1. Foundation | 10 | 37h | P0 |
| 2. Feature Extraction | 11 | 56h | P0 |
| 3. Provider Restructure | 4 | 15h | P0 |
| 4. Parallel Routes | 3 | 13h | P1 |
| 5. Bundle Optimization | 4 | 17h | P0 |
| 6. Testing | 4 | 24h | P0 |
| **Total** | **41** | **177h** | - |

## 9.2 By Priority

| Priority | Tasks | Est. Hours |
|----------|-------|------------|
| 🔴 P0 | 25 | 123h |
| 🟡 P1 | 13 | 48h |
| 🟢 P2 | 3 | 8h |

## 9.3 Critical Path

\\\
TASK-001 → TASK-004 → TASK-101 → TASK-102 → TASK-104 → TASK-105 → TASK-106
    ↓                                                          ↓
TASK-002                             TASK-201 → TASK-202 → TASK-301 → TASK-303
    ↓                                                          ↓
TASK-003                             TASK-204 → TASK-205 → TASK-302 → TASK-304
    ↓                                                          ↓
TASK-005                                                 TASK-501 → TASK-603
\\\

> **Note:** Phase 0 tasks (TASK-001 through TASK-005) must complete before Phase 1 begins.

---

# 10. Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Import breaks | Incremental migration with aliases | Tech Lead |
| Test failures | Run tests after each task | QA |
| Performance regression | Benchmark before/after | DevOps |
| Team unfamiliarity | Pair programming, documentation | Tech Lead |

---

**[PHASE 4 COMPLETE]**

