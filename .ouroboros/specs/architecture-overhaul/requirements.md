# Architecture Overhaul Requirements Document
## Feature: Complete Architectural Overhaul & Optimization Plan
## Date: 2025-12-17
## Phase: 2/5 - Requirements (EARS Notation)

---

# 1. Document Overview

This document defines requirements using EARS (Easy Approach to Requirements Syntax) notation for the Next.js 16.0.10 architectural overhaul. Requirements are categorized by concern area and priority.

---

# 2. Stakeholder Needs

| Stakeholder | Need | Priority |
|-------------|------|----------|
| Developers | Clear module boundaries, maintainable code | HIGH |
| End Users | Fast page loads, responsive UI | HIGH |
| DevOps | Deployable, observable, scalable | MEDIUM |
| Product | Feature velocity, stability | HIGH |

---

# 3. Requirements by Category

## 3.1 Runtime Separation Requirements (RSR)

### RSR-001: Server Component Isolation
**EARS Type:** Ubiquitous

**The system shall** ensure all server-only code is marked with `import "server-only"` directive.

**Rationale:** Prevents accidental client bundle contamination.
**Verification:** Static analysis check for all `lib/db/`, `lib/auth/session.ts`, and server data fetching modules.

---

### RSR-002: Client Component Boundaries
**EARS Type:** Ubiquitous

**The system shall** place all client components in designated `client/` subdirectories within feature modules.

**Rationale:** Clear visual separation of runtime boundaries.
**Verification:** Directory structure audit confirms all `"use client"` files in `*/client/` paths.

---

### RSR-003: Edge Runtime Isolation
**EARS Type:** Ubiquitous

**The system shall** isolate all edge runtime code in `lib/edge/` with explicit `export const runtime = 'edge'` declarations.

**Rationale:** Edge code has different API constraints than Node.js server code.
**Verification:** All edge functions declare runtime and use only edge-compatible APIs.

---

### RSR-004: Shared Type Definitions
**EARS Type:** Ubiquitous

**The system shall** define all cross-runtime type definitions in `@/types/` with type-only exports.

**Rationale:** Types can be safely shared across runtimes without bundle impact.
**Verification:** All type imports use `import type` syntax.

---

## 3.2 Bundle Optimization Requirements (BOR)

### BOR-001: Initial Bundle Size
**EARS Type:** State-Driven

**While** the application is loading, **the system shall** deliver an initial JavaScript bundle under 150KB (gzipped).

**Rationale:** Minimizes Time to Interactive (TTI).
**Verification:** Bundle analyzer reports < 150KB initial load.

---

### BOR-002: Code Splitting Strategy
**EARS Type:** Ubiquitous

**The system shall** code-split all feature modules using `next/dynamic` with appropriate loading states.

**Rationale:** Reduces initial bundle, enables progressive loading.
**Verification:** Each feature module has its own chunk in build output.

---

### BOR-003: Tree-Shaking Effectiveness
**EARS Type:** Ubiquitous

**The system shall** use barrel exports (`index.ts`) only for public module APIs, avoiding deep re-exports.

**Rationale:** Barrel files can defeat tree-shaking if not carefully managed.
**Verification:** No circular dependencies, minimal unused exports in bundle.

---

### BOR-004: Third-Party Bundle Isolation
**EARS Type:** Ubiquitous

**The system shall** lazy-load heavy third-party libraries (CodeMirror, TipTap, Mermaid, Pyodide) only when needed.

**Rationale:** These libraries are large and not needed on initial page load.
**Verification:** Third-party chunks only load on feature activation.

---

### BOR-005: CSS Optimization
**EARS Type:** Ubiquitous

**The system shall** utilize Next.js 16 inline CSS feature for critical styles and lazy-load non-critical CSS.

**Rationale:** Reduces render-blocking CSS.
**Verification:** `inlineCss: true` enabled, no large CSS blocking FCP.

---

## 3.3 Modular Architecture Requirements (MAR)

### MAR-001: Feature Module Structure
**EARS Type:** Ubiquitous

**The system shall** organize code into feature modules with the following structure:
\\\
features/[feature]/
├── server/       # Server components & functions
├── client/       # Client components & hooks
├── shared/       # Shared types & utilities
├── actions/      # Server actions
└── index.ts      # Public API
\\\

**Rationale:** Consistent structure enables team scalability and maintainability.
**Verification:** All features follow standard structure.

---

### MAR-002: Module Dependency Direction
**EARS Type:** Ubiquitous

**The system shall** enforce unidirectional dependencies:
- Features may depend on `@/core/` and `@/shared/`
- Features may NOT depend on other features directly
- Cross-feature communication via events or composition

**Rationale:** Prevents tight coupling and circular dependencies.
**Verification:** Dependency graph analysis shows no feature-to-feature imports.

---

### MAR-003: Core Infrastructure Layer
**EARS Type:** Ubiquitous

**The system shall** establish a `@/core/` layer containing:
- Database access (repositories)
- Authentication
- Caching
- Error handling
- Logging

**Rationale:** Centralizes infrastructure concerns.
**Verification:** All data access goes through core layer.

---

### MAR-004: Public Module Interfaces
**EARS Type:** Ubiquitous

**The system shall** expose feature functionality only through explicit `index.ts` exports.

**Rationale:** Enables refactoring internals without breaking consumers.
**Verification:** No deep imports (e.g., `@/features/chat/client/hooks/useX`).

---

## 3.4 Component & Provider Requirements (CPR)

### CPR-001: Provider Hierarchy Depth
**EARS Type:** Ubiquitous

**The system shall** limit React context provider nesting to a maximum of 5 levels.

**Rationale:** Deep nesting causes unnecessary re-renders and debugging complexity.
**Verification:** Provider tree analysis confirms ≤ 5 levels.

---

### CPR-002: Context Splitting
**EARS Type:** Event-Driven

**When** a context contains both state and dispatch, **the system shall** split into separate StateContext and DispatchContext.

**Rationale:** Prevents re-renders for components that only dispatch actions.
**Verification:** High-frequency contexts (DataStream, Settings) are split.

---

### CPR-003: Provider Composition
**EARS Type:** Ubiquitous

**The system shall** compose root providers using a `Providers` component pattern:
\\\	sx
<Providers>
  {children}
</Providers>
\\\

**Rationale:** Centralizes provider management, simplifies layout files.
**Verification:** Root layout contains single `<Providers>` wrapper.

---

### CPR-004: Component Size Limit
**EARS Type:** Ubiquitous

**The system shall** limit component files to 200 lines maximum. Larger components must be decomposed.

**Rationale:** Large components are difficult to test, maintain, and optimize.
**Verification:** No component file exceeds 200 lines.

---

### CPR-005: Prop Drilling Prevention
**EARS Type:** Event-Driven

**When** props must pass through more than 2 intermediate components, **the system shall** use context or composition instead.

**Rationale:** Deep prop drilling creates tight coupling.
**Verification:** Component tree analysis shows max 2-level prop passing.

---

## 3.5 Next.js 16 Best Practices Requirements (NPR)

### NPR-001: Server Components by Default
**EARS Type:** Ubiquitous

**The system shall** default all components to Server Components unless client interactivity is required.

**Rationale:** Server Components reduce client bundle and improve performance.
**Verification:** `"use client"` only appears where necessary.

---

### NPR-002: Use Cache Directive
**EARS Type:** Event-Driven

**When** fetching cacheable data, **the system shall** use the `"use cache"` directive with appropriate `cacheLife` and `cacheTag`.

**Rationale:** Leverages Next.js 16 caching for performance.
**Verification:** All data fetching functions use caching where appropriate.

---

### NPR-003: Server Actions for Mutations
**EARS Type:** Event-Driven

**When** performing data mutations, **the system shall** use Server Actions instead of API routes where feasible.

**Rationale:** Reduces API surface, improves type safety, simplifies client code.
**Verification:** Mutation operations use Server Actions.

---

### NPR-004: Parallel Routes for Independent UI
**EARS Type:** Event-Driven

**When** UI sections can load independently (sidebar, main content), **the system shall** use Parallel Routes.

**Rationale:** Enables independent loading states and error boundaries.
**Verification:** Sidebar uses `@sidebar` parallel route slot.

---

### NPR-005: Streaming and Suspense
**EARS Type:** Event-Driven

**When** rendering dynamic content, **the system shall** use Suspense boundaries with meaningful loading states.

**Rationale:** Improves perceived performance.
**Verification:** All async server components wrapped in Suspense.

---

### NPR-006: Partial Prerendering (PPR)
**EARS Type:** Optional Feature

**If** enabled, **the system shall** configure static shells with dynamic holes using PPR.

**Rationale:** Combines static and dynamic rendering benefits.
**Verification:** PPR config present when feature is stable.

---

## 3.6 Data Flow Requirements (DFR)

### DFR-001: Repository Pattern
**EARS Type:** Ubiquitous

**The system shall** access database through repository interfaces in `@/core/repositories/`.

**Rationale:** Abstracts database implementation, enables testing.
**Verification:** No direct database calls outside repositories.

---

### DFR-002: Data Context Pattern
**EARS Type:** Ubiquitous

**The system shall** pass user context to data operations through `DataContext` objects.

**Rationale:** Consistent authorization and multi-tenancy handling.
**Verification:** All data operations receive `DataContext` parameter.

---

### DFR-003: Optimistic Updates
**EARS Type:** Event-Driven

**When** performing mutations with known outcomes, **the system shall** apply optimistic updates with rollback on failure.

**Rationale:** Improves perceived responsiveness.
**Verification:** Chat creation, message sending use optimistic updates.

---

### DFR-004: Error Boundaries
**EARS Type:** Ubiquitous

**The system shall** implement error boundaries at feature and component levels with meaningful fallbacks.

**Rationale:** Prevents full-page crashes, improves UX.
**Verification:** Each feature has error.tsx, components have ErrorBoundary.

---

## 3.7 Performance Requirements (PER)

### PER-001: Time to Interactive
**EARS Type:** State-Driven

**While** loading the chat page, **the system shall** achieve Time to Interactive (TTI) under 3 seconds on 4G networks.

**Rationale:** User experience benchmark.
**Verification:** Lighthouse score confirms TTI < 3s.

---

### PER-002: First Contentful Paint
**EARS Type:** State-Driven

**While** loading any page, **the system shall** achieve First Contentful Paint (FCP) under 1.5 seconds.

**Rationale:** Critical performance metric.
**Verification:** Lighthouse FCP < 1.5s.

---

### PER-003: Memory Efficiency
**EARS Type:** Ubiquitous

**The system shall** cleanup event listeners, timers, and subscriptions in component unmount.

**Rationale:** Prevents memory leaks in long-running sessions.
**Verification:** No memory leak warnings in React DevTools.

---

### PER-004: Re-render Optimization
**EARS Type:** Ubiquitous

**The system shall** use React.memo, useMemo, and useCallback appropriately to prevent unnecessary re-renders.

**Rationale:** Maintains UI responsiveness.
**Verification:** React DevTools Profiler shows minimal wasted renders.

---

## 3.8 Simplification Requirements (SIM)

### SIM-001: No SWR for Non-Data-Fetching State
**EARS Type:** Ubiquitous

**The system shall NOT** use SWR for state management without actual data fetching.

**Rationale:** SWR is designed for remote data fetching with caching. Using it as a global state store is an anti-pattern that adds unnecessary complexity and breaks the library's intended purpose.

**Current Violations:**
- `hooks/use-artifact.ts` - using SWR as global artifact state
- `components/sidebar-history.tsx` - using SWR for local visibility state

**Replacement:** Use Zustand or useState for UI state management.

**Verification:** No `useSWR` calls with `null` fetcher or without fetcher parameter.

---

### SIM-002: Provider Depth Limit
**EARS Type:** Ubiquitous

**The system shall** limit React context provider nesting to a maximum of **4 levels**.

**Rationale:** Deep provider nesting (current: 8 levels) causes:
- Debugging complexity
- Potential re-render cascades
- Poor DevTools readability

**Target Structure:**
```
RootLayout → Providers → ChatLayout → ChatProviders → {children}
```

**Verification:** React DevTools shows ≤ 4 provider wrapper levels.

---

### SIM-003: No Client-Side Optimistic State for Shared Data
**EARS Type:** Event-Driven

**When** data is visible in multiple places (e.g., chat list in sidebar), **the system shall NOT** implement custom client-side optimistic state management.

**Rationale:** OptimisticChatsProvider duplicates what `revalidatePath` provides natively. Custom reconciliation logic (70+ lines) adds bugs without benefit.

**Replacement:** Use Server Actions with `revalidatePath()` or `revalidateTag()` for mutations affecting shared data.

**Verification:** No custom optimistic state providers for data visible across components.

---

### SIM-004: Use Cache Directive Over Manual Caching
**EARS Type:** Ubiquitous

**The system shall** use Next.js 15 `"use cache"` directive instead of manual Redis/memory caching for database queries.

**Rationale:** Manual caching layer (`cache-operations.ts` at 1080 lines) duplicates Next.js capabilities and adds maintenance burden.

**Exceptions:**
- Guest session data (requires Redis for anonymous users)
- Rate limiting

**Verification:** `cache-operations.ts` reduced to <200 lines; all cacheable queries use `"use cache"`.

---

# 4. Requirements Traceability Matrix

| Req ID | Category | Priority | Depends On | Impacts |
|--------|----------|----------|------------|---------|
| RSR-001 | Runtime | HIGH | - | BOR-001 |
| RSR-002 | Runtime | HIGH | MAR-001 | BOR-001 |
| RSR-003 | Runtime | MEDIUM | - | - |
| RSR-004 | Runtime | HIGH | - | MAR-002 |
| BOR-001 | Bundle | HIGH | RSR-001, RSR-002 | PER-001 |
| BOR-002 | Bundle | HIGH | MAR-001 | BOR-001 |
| BOR-003 | Bundle | MEDIUM | MAR-004 | BOR-001 |
| BOR-004 | Bundle | HIGH | - | PER-001, PER-002 |
| BOR-005 | Bundle | MEDIUM | - | PER-002 |
| MAR-001 | Module | HIGH | - | All |
| MAR-002 | Module | HIGH | MAR-001 | - |
| MAR-003 | Module | HIGH | - | DFR-001 |
| MAR-004 | Module | MEDIUM | MAR-001 | BOR-003 |
| CPR-001 | Component | HIGH | - | PER-004 |
| CPR-002 | Component | MEDIUM | CPR-001 | PER-004 |
| CPR-003 | Component | MEDIUM | CPR-001 | - |
| CPR-004 | Component | HIGH | - | - |
| CPR-005 | Component | MEDIUM | - | - |
| NPR-001 | Next.js | HIGH | RSR-001 | BOR-001 |
| NPR-002 | Next.js | HIGH | - | PER-001 |
| NPR-003 | Next.js | MEDIUM | - | - |
| NPR-004 | Next.js | MEDIUM | MAR-001 | PER-001 |
| NPR-005 | Next.js | HIGH | - | PER-001 |
| NPR-006 | Next.js | LOW | NPR-005 | PER-002 |
| DFR-001 | Data | HIGH | MAR-003 | - |
| DFR-002 | Data | HIGH | DFR-001 | - |
| DFR-003 | Data | MEDIUM | - | - |
| DFR-004 | Data | HIGH | - | - |
| PER-001 | Perf | HIGH | BOR-* | - |
| PER-002 | Perf | HIGH | BOR-005 | - |
| PER-003 | Perf | MEDIUM | CPR-004 | - |
| PER-004 | Perf | MEDIUM | CPR-001, CPR-002 | - |
| SIM-001 | Simplification | HIGH | - | CPR-001 |
| SIM-002 | Simplification | HIGH | - | CPR-001 |
| SIM-003 | Simplification | HIGH | - | DFR-003 |
| SIM-004 | Simplification | HIGH | NPR-002 | - |

---

# 5. Acceptance Criteria Summary

## 5.1 Must Have (P0)
- [ ] All server code uses `server-only` import
- [ ] Client components in `*/client/` directories
- [ ] Initial bundle < 150KB gzipped
- [ ] Feature module structure implemented
- [ ] Provider depth ≤ 4 levels (SIM-002)
- [ ] Component files ≤ 200 lines
- [ ] TTI < 3s, FCP < 1.5s
- [ ] No SWR without fetchers (SIM-001)
- [ ] No custom optimistic state for shared data (SIM-003)
- [ ] Manual cache layer < 200 lines (SIM-004)

## 5.2 Should Have (P1)
- [ ] Edge runtime isolated
- [ ] Repository pattern for data access
- [ ] Context splitting for performance
- [ ] Server Actions for mutations
- [ ] Parallel routes for sidebar

## 5.3 Could Have (P2)
- [ ] Partial Prerendering enabled
- [ ] Intercepting routes for modals
- [ ] Full bundle analysis automation

---

# 6. Constraints & Assumptions

## 6.1 Constraints
- Must maintain backward compatibility during migration
- Must not break existing API contracts
- Must complete within reasonable migration timeframe

## 6.2 Assumptions
- Next.js 16.0.10 features are stable
- React 19 compiler optimizations work as documented
- Team has capacity for comprehensive refactoring

---

**[PHASE 2 COMPLETE]**

