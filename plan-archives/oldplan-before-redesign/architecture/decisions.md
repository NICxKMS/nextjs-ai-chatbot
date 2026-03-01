# Architectural Decisions

> Key decisions with rationale, alternatives considered, and tradeoffs.
> Each decision references the v6 spec where applicable.

---

## ADR-001: Feature Collocation Over Layer-Based Organization

### Context

The v6 spec uses a hybrid approach: `features/` for business logic, but `components/ai/`
for AI wrappers, `lib/hooks/` for shared hooks, `src/` for base utilities, and
`components/auth-form.tsx` for the auth form. This scatters feature code across 4-5
top-level directories.

### Decision

**ALL feature-related code lives inside `features/[name]/`.** Only cross-cutting
infrastructure lives outside features.

### Alternatives Considered

1. **Layer-based (pure)**: Separate `components/`, `hooks/`, `actions/`, `schemas/` directories
   - Rejected: Splits related code, makes features hard to find and move
2. **Spec hybrid**: Features for business logic, shared dirs for UI
   - Rejected: AI wrappers used by only one feature shouldn't be global
3. **Feature collocation (chosen)**: Everything feature-related colocated
   - Accepted: Easy to find, easy to delete, easy to understand ownership

### Tradeoffs

| Gain | Cost |
|------|------|
| Feature code is self-contained | Shared components require explicit extraction |
| Easy to onboard (find everything in one place) | Cross-feature imports need discipline |
| Features can be deleted without orphaned code | Some duplication if two features need similar components |
| Clear ownership of every file | Slightly deeper directory nesting |

### Confidence: 95%

---

## ADR-002: Function-Based Data Access Over Repository Pattern

### Context

The v6 spec (§5) prescribes a full Repository pattern: `IReadRepository<T>`,
`IWriteRepository<T, TCreate, TUpdate>`, `BaseRepository<T, TCreate, TUpdate>` abstract
class, and per-entity repository classes. The existing app uses simple function-based
data objects (`chatData.get()`, `documentData.save()`).

### Decision

**Use plain function modules in `lib/data/`.** Each entity gets a file exporting specific
functions that match actual usage patterns. The `withCache()` helper handles the common
cache-through pattern.

### Alternatives Considered

1. **Full Repository pattern (spec)**: Abstract base class with generics
   - Rejected: Over-engineered for this app. Generic CRUD methods don't match actual
     usage (guest branching, sorted sets for messages, composite PK versioning)
2. **Data access objects (current app)**: Object literals with methods
   - Partially accepted: Same concept, but as standalone functions for better tree-shaking
3. **Plain functions (chosen)**: One function per operation, explicit types
   - Accepted: Simplest approach that handles all actual patterns

### Analysis

The app has ~15 distinct data operations across 5 entities. The Repository pattern adds:
- 2 interfaces (IReadRepository, IWriteRepository) — ~20 lines each
- 1 abstract base class — ~60 lines
- 5 repository classes — ~50 lines each (250 total)
- Total overhead: ~350 lines of abstraction

The function-based approach for the same operations: ~200 lines total, with no abstraction
layer to understand.

The critical insight: the guest/auth branching logic makes a generic `findById()` method
impractical. Every read operation must know about `DataContext`.

### Tradeoffs

| Gain | Cost |
|------|------|
| ~60% less code | No enforced interface contract |
| No abstraction to understand | Cache pattern repeated per function (mitigated by withCache) |
| Guest/auth branching is natural | Slightly more boilerplate per entity |
| Direct testing without class mocking | — |

### Confidence: 90%

---

## ADR-003: No Jotai — Keep SWR + Context + localStorage

### Context

The v6 spec (§12 Decision 1, §19) prescribes Jotai for client-side state management,
citing atomic updates and `atomWithStorage`. The existing app uses SWR for data state,
React context for cross-component sharing, and `useSyncExternalStore` + localStorage
for settings.

### Decision

**Do not add Jotai.** Keep existing state management patterns.

### Alternatives Considered

1. **Jotai (spec)**: Atomic state with `atomWithStorage`
   - Rejected: Adds dependency for marginal convenience. Existing patterns already solve
     all identified state management needs
2. **Zustand**: Global store with selectors
   - Rejected: Even heavier dependency. Overkill for this app's state needs
3. **Keep existing patterns (chosen)**: SWR + context + localStorage
   - Accepted: Zero additional bundle cost, already working, well-understood

### State Management Map

| State | Owner | Pattern | Why |
|-------|-------|---------|-----|
| Chat messages | AI SDK | `useChat` hook | Framework-provided, no choice |
| Artifact state | features/artifacts | SWR with optimistic mutate | Already working, supports selectors |
| Chat visibility | features/chat | SWR with server action | Optimistic updates with rollback |
| Optimistic chats | features/sidebar | React context | Cross-component, needs Set-based dedup |
| Data stream | features/chat | Split context (state+dispatch) | Prevents re-render cascades |
| Settings | features/settings | `useSyncExternalStore` + localStorage | Pub/sub without React overhead |
| Theme | app-wide | `next-themes` | Already a dependency |
| Model selection | features/models | Cookie + localStorage | Server-readable (SSR), client-persisted |

None of these benefit from Jotai's atomic model.

### Tradeoffs

| Gain | Cost |
|------|------|
| Zero additional dependency | No centralized state debugging tools |
| Zero bundle size impact | Slightly more boilerplate for settings store |
| Existing patterns already tested | — |

### Confidence: 85%

---

## ADR-004: Eliminate `src/` Directory

### Context

The v6 spec (§2, §3) creates a `src/` directory as the base layer for shared types,
utils, services, and test utilities. It sits below `lib/` in the import hierarchy.

### Decision

**No `src/` directory.** Its contents merge into `lib/` or feature directories.

### Rationale

1. `lib/` already serves as the infrastructure layer
2. Having both `lib/` and `src/` creates confusion ("where does this go?")
3. The "base layer that everything can import" is just `lib/`
4. Services belong as plain module exports in `lib/`, not singleton classes
5. Types from Drizzle schema belong near the schema: `lib/types/`
6. Test utilities belong in `tests/`

### Mapping

| `src/` Location | New Location |
|-----------------|-------------|
| `src/types/` | `lib/types/` |
| `src/utils/` | `lib/utils/` |
| `src/services/` | `lib/` (as plain modules) |
| `src/test/` | `tests/` |
| `src/components/ai-elements/` | `components/ai-elements/` |
| `src/components/ai/` | Colocated in features |

### Tradeoffs

| Gain | Cost |
|------|------|
| Fewer top-level directories | `lib/` becomes slightly larger |
| Simpler mental model (3 layers not 5) | — |
| No confusion about lib vs src | — |

### Confidence: 95%

---

## ADR-005: AI Component Architecture — Global Primitives, Colocated Wrappers

### Context

The v6 spec (§11.1, §16) defines two AI component layers:
- `components/ai-elements/` — 30 read-only primitives (never modify)
- `components/ai/` — 31 project wrapper modules (10 categories)

Both are global. With feature collocation, the wrappers should live in features.

### Decision

- **`components/ai-elements/`** stays global and read-only. It's an external dependency
  consumed by multiple features.
- **AI wrappers** are colocated in the feature that uses them. Don't create wrappers for
  functionality that doesn't exist yet.

### What's Actually Needed

From behavioral extraction, the existing app uses:
- Message rendering (with markdown, reasoning, tool calls) → chat feature
- Model selector → models feature
- Artifact container → artifacts feature
- Code syntax highlighting → artifacts feature
- Loading/shimmer states → shared ui

The spec's canvas/, citations/, workflow/, queue/, checkpoint/ categories have no
corresponding feature. Do not build them.

### Tradeoffs

| Gain | Cost |
|------|------|
| Wrappers colocated with consumers | If a wrapper is later needed by 2 features, extract to shared |
| No dead code for non-existent features | Initial discovery requires knowing which feature |
| ai-elements stays a clean external dep | — |

### Confidence: 85%

---

## ADR-006: Auth Approach — Keep Dual Supabase + Guest JWT

### Context

The existing app has a dual auth system: Supabase for registered users, auto-created
Guest JWT for anonymous users. Both produce a consistent `AppSession` shape. The spec
preserves this approach.

### Decision

**Keep the dual auth architecture.** It's well-designed and works correctly.

### Key Patterns to Preserve

1. `getAppSession()` resolves session from cookies (Supabase JWT → Guest JWT → null)
2. `DataContext.isGuest` gates data access (cache-only vs cache+DB)
3. Token rotation in proxy for guest sessions (<30 min remaining)
4. Token exchange endpoint for Supabase auth (client validates, server sets httpOnly cookie)

### Location Change

Auth session resolution (`getAppSession()`) moves to `features/auth/lib/session.ts`.
Auth infrastructure (JWT config, secrets) stays in `lib/auth/`.

### Tradeoffs

| Gain | Cost |
|------|------|
| Anonymous users can try the app | Guest data is ephemeral (no migration path) |
| Consistent session shape simplifies code | Two auth paths to maintain |
| Cache-only guest reduces DB load | Guest depends on Redis availability |

### Confidence: 90%

---

## ADR-007: Caching Strategy — Redis + `use cache`

### Context

The v6 spec uses Redis exclusively for caching. Next.js 16 introduces `use cache` with
`cacheTag`/`revalidateTag` for framework-managed caching.

### Decision

**Use both.** Redis for user-specific, real-time data. `use cache` for shared, slowly-changing data.

### Boundary

| Pattern | Redis | `use cache` |
|---------|-------|-------------|
| Chat messages | ✅ | — |
| Chat metadata | ✅ | — |
| Document versions | ✅ | — |
| Quota counters | ✅ | — |
| Rate limit state | ✅ | — |
| Guest data | ✅ (only source) | — |
| Model catalog | — | ✅ |
| Token pricing catalog | — | ✅ (already used) |
| Static prompts | — | ✅ or compile-time |

### Tradeoffs

| Gain | Cost |
|------|------|
| Framework-managed cache for reads | Two caching systems to understand |
| Automatic PPR integration | `use cache` has different invalidation model |
| Redis for real-time, `use cache` for static | — |

### Confidence: 80%

---

## ADR-008: Rate Limiting — Edge-Only with Config

### Context

The v6 spec (§6, Decision 3) prescribes edge-only rate limiting in middleware with
per-route configuration. The existing app has both edge AND application-level rate limiting.

### Decision

**Keep edge-only rate limiting** per the spec. The per-route config approach is clean.
Application-level rate limiters in the existing app (chat: 50/min, standard: 100/min,
strict: 10/min, upload: 10/hour) can be expressed as middleware route configs.

### Caveat for Next.js 16

The Edge Runtime has API limitations. The rate limit implementation must:
- Use Upstash Redis (HTTP-based, edge-compatible)
- Use lazy initialization for rate limiter instances
- Avoid Node.js-specific APIs in middleware

The daily quota check (20 messages/day for guest, 100/day for auth) is NOT a rate limit —
it's a business rule. This check stays in the chat action, reading from a Redis counter.

### Confidence: 90%

---

## ADR-009: No Mandatory Barrel Files

### Context

The v6 spec (§22) mandates `index.ts` in every folder. This causes circular dependency
risks and tree-shaking interference.

### Decision

**Barrel files are optional.** Create them only when:
1. A directory has 3+ public exports
2. External consumers benefit from a single import path
3. No risk of circular imports

Most feature subdirectories (actions/, components/, hooks/) will NOT have barrel files.
Import directly from the specific file.

### Confidence: 85%
