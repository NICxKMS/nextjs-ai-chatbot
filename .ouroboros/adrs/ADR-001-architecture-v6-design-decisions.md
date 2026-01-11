# ADR-001: Architecture v6 Design Decisions

**Status:** Accepted  
**Date:** 2024-12-28  
**Author:** Ouroboros Architect

---

## Executive Summary

This ADR documents the rationale for 15 key architectural decisions in Architecture v6. Each decision was evaluated against alternatives with explicit trade-off analysis.

---

## Decision 1: lib/data/ as Single Abstraction (Not CQRS)

### Context
The codebase needs a data access layer that abstracts cache vs database access. Options include CQRS (Command Query Responsibility Segregation), repository pattern, or a simpler unified abstraction.

### Decision
Use `lib/data/` as a **single data abstraction layer** with cache-through pattern. All data operations (reads and writes) go through the same interface.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: CQRS** | Separate read/write models with different stores | Over-engineering for this scale. Only ~5 entities. Added complexity without proportional benefit. Event sourcing overhead not justified. |
| **ALT-002: Repository Pattern** | Abstract repository classes with interface segregation | Excessive abstraction. TypeScript + Drizzle already provides type safety. Would add boilerplate without meaningful gain. |
| **ALT-003: Direct DB Access** | No abstraction, direct Drizzle calls everywhere | Loses caching benefits. Cache logic would be duplicated. Harder to change data strategy. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Simplicity | Single place to understand data flow |
| ✅ Cache consistency | Cache-through ensures consistent invalidation |
| ✅ Caller simplicity | Actions don't know about cache vs DB |
| ❌ Flexibility | Less granular control over cache per query |
| ❌ Read optimization | Can't optimize reads separately from writes |

### Consequences

- **POS-001**: All cache logic centralized in `lib/data/`
- **POS-002**: Consistent API across all data operations
- **POS-003**: Easy to add caching to new entities
- **NEG-001**: Cannot have different read/write optimization strategies
- **NEG-002**: Cache strategy is uniform (may over-cache or under-cache)

---

## Decision 2: Edge-Only Rate Limiting

### Context
Rate limiting is critical for API protection. It can be implemented at edge (middleware), route level, or service level.

### Decision
Rate limiting occurs **exclusively in `middleware.ts`** using Upstash Redis at the edge. No rate limiting in routes or services.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Per-Route Rate Limits** | Different limits per endpoint (e.g., /api/chat: 5/min, /api/history: 100/min) | Duplicates rate limiting logic. Harder to audit. Edge rate limiting can use route matching for different limits if needed. |
| **ALT-002: Service Layer Rate Limiting** | Rate limit in business logic layer | Higher latency (request must travel further). Edge rejection is faster and cheaper. |
| **ALT-003: API Gateway (External)** | Use external gateway like Kong/Cloudflare | Additional infrastructure complexity. Vercel edge + Upstash achieves same result natively. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Lowest latency | Edge rejection before app code runs |
| ✅ Single location | All rate limiting auditable in one file |
| ✅ Cost efficiency | Rejected requests don't consume function invocations |
| ❌ Less granularity | Route-specific limits require more complex middleware logic |
| ❌ Edge limitations | Must use edge-compatible libraries only |

### Consequences

- **POS-001**: Fastest possible rejection of rate-limited requests
- **POS-002**: All rate limiting logic in single `middleware.ts` file
- **POS-003**: Works with Vercel's edge network globally
- **NEG-001**: Per-route rate limits require pattern matching in middleware
- **NEG-002**: Cannot rate limit based on authenticated user ID at edge (no DB access)

### Implementation Note
For route-specific limits, use pattern matching in middleware:
```typescript
const limits = {
  '/api/chat': Ratelimit.slidingWindow(5, '60 s'),
  '/api/history': Ratelimit.slidingWindow(100, '60 s'),
  default: Ratelimit.slidingWindow(10, '10 s'),
}
```

---

## Decision 3: Singleton Services Pattern

### Context
Services like analytics, telemetry, and storage need consistent instances across the application. Options include singleton classes, module-level exports, or dependency injection.

### Decision
Use **singleton class pattern** with `getInstance()` for services in `src/services/`.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Module-Level Exports** | `export const analytics = new AnalyticsService()` | No lazy initialization. Service created at module load even if unused. Harder to mock in tests. |
| **ALT-002: Dependency Injection Container** | Use InversifyJS or similar DI framework | Over-engineering. TypeScript doesn't need Java-style DI. Adds complexity and learning curve. |
| **ALT-003: Factory Functions** | `createAnalytics()` called each time | Creates multiple instances. Loses singleton semantics. State not shared. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Lazy initialization | Instance created on first `getInstance()` call |
| ✅ Consistent state | Single instance across entire app |
| ✅ Testable | Can reset instance in tests |
| ❌ Global state | Harder to reason about in concurrent scenarios |
| ❌ TypeScript boilerplate | Requires static instance + method |

### Consequences

- **POS-001**: Services initialized only when first used
- **POS-002**: State consistent across all usages
- **POS-003**: Pattern is familiar to most developers
- **NEG-001**: Global singletons can cause test pollution
- **NEG-002**: Slight overhead from `getInstance()` calls

---

## Decision 4: No Repository Pattern (Direct Data Access)

### Context
Traditional OOP architectures use repository pattern to abstract persistence. Modern frameworks like Drizzle provide type-safe queries already.

### Decision
**No repository abstraction**. `lib/data/` functions call Drizzle directly. Drizzle serves as both ORM and query builder.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Generic Repository<T>** | Abstract base repository with CRUD methods | Drizzle already provides this. Would duplicate functionality with worse ergonomics. |
| **ALT-002: Interface-Based Repositories** | `IChatRepository` interfaces with implementations | Over-abstraction. Not switching databases. TypeScript types provide sufficient contracts. |
| **ALT-003: Active Record Pattern** | Entity classes with save/delete methods | Mixes concerns. Doesn't fit functional TypeScript style. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Less code | No repository classes to maintain |
| ✅ Drizzle ergonomics | Full access to query builder features |
| ✅ Type safety | Drizzle schema provides types |
| ❌ No database abstraction | Changing from Postgres requires more changes |
| ❌ Testing | Must mock Drizzle, not repository interface |

### Consequences

- **POS-001**: Fewer abstractions = faster development
- **POS-002**: Drizzle's full power available in data layer
- **POS-003**: Schema types serve as contracts
- **NEG-001**: Coupled to Drizzle/Postgres
- **NEG-002**: Integration tests needed (not pure unit tests)

---

## Decision 5: features/ vs app/ Actions Separation

### Context
Next.js allows colocating server actions with pages. Architecture v6 places actions in `features/[name]/actions/` instead.

### Decision
Actions live in **`features/[name]/actions/`**, not colocated with `app/` pages. Routes are slim and delegate to feature actions.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Colocate in app/** | `app/api/chat/actions.ts` next to `route.ts` | Mixes routing with business logic. Actions become harder to reuse. Route directories get bloated. |
| **ALT-002: lib/actions/** | All actions in a flat lib/actions folder | Loses feature cohesion. Chat actions separated from chat components. Harder to delete features cleanly. |
| **ALT-003: Server Components Only** | No server actions, use API routes | Loses RSC benefits. More HTTP overhead for internal operations. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Feature cohesion | Action + component + hook together |
| ✅ Reusability | Actions usable from multiple routes |
| ✅ Clean deletion | Remove feature folder = remove feature |
| ❌ More files | `features/chat/actions/` vs just `app/` |
| ❌ Import paths | Longer import paths from routes |

### Consequences

- **POS-001**: Features are self-contained and portable
- **POS-002**: Actions reusable across routes and components
- **POS-003**: Clear separation of routing from logic
- **NEG-001**: More directory navigation required
- **NEG-002**: Need to understand feature structure to find code

---

## Decision 6: components/ai/ Naming (Not "chat")

### Context
The shared AI component library needs a name. Options include "chat", "ai", "conversation", or "llm".

### Decision
Name the directory **`components/ai/`** because these components are for **AI content rendering**, not just chat.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: components/chat/** | Name after primary use case | Too narrow. Includes reasoning, tools, artifacts, canvas - not all "chat" related. |
| **ALT-002: components/llm/** | Name after technology | Implementation detail. May use non-LLM AI in future. |
| **ALT-003: components/conversation/** | Descriptive of interaction | Verbose. Doesn't capture artifacts, canvas, tools. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Accurate scope | Covers all AI-related UI |
| ✅ Extensible | Can add AI features beyond chat |
| ✅ Clear distinction | Separate from lib/ai/ (logic) |
| ❌ Slightly abstract | "AI" is broad term |
| ❌ Not self-documenting | Need to look inside to understand |

### Consequences

- **POS-001**: Namespace covers reasoning, tools, canvas, artifacts
- **POS-002**: Clear separation: `lib/ai/` = logic, `components/ai/` = UI
- **POS-003**: Room for future AI UI primitives
- **NEG-001**: New developers may not immediately understand scope
- **NEG-002**: Need documentation to explain contents

---

## Decision 7: src/ Separate from lib/

### Context
The codebase has both `lib/` and `src/` directories. Question: why two utility locations?

### Decision
- **`lib/`**: Infrastructure with external dependencies (DB, cache, auth, AI providers)
- **`src/`**: Pure utilities, types, and cross-cutting services (no external deps)

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: All in lib/** | Single utility location | Mixes pure code with infrastructure. Harder to test pure utilities. Import cycles risk. |
| **ALT-002: All in src/** | Single utility location | Convention break. lib/ is standard for Next.js infrastructure. |
| **ALT-003: utils/ at root** | Separate utils folder | Doesn't solve the pure vs impure separation. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Clear dependency hierarchy | src/ = bottom layer, no imports from above |
| ✅ Testability | src/ can be unit tested without mocks |
| ✅ Tree shaking | src/ utilities are pure, easy to shake |
| ❌ Two locations | Must decide where each utility goes |
| ❌ Mental model | Need to understand the distinction |

### Consequences

- **POS-001**: `src/` is fully unit-testable without mocks
- **POS-002**: Clear import direction: lib → src (never reverse)
- **POS-003**: Infrastructure changes don't affect pure utilities
- **NEG-001**: Onboarding requires explaining the distinction
- **NEG-002**: Some edge cases require judgment calls

---

## Decision 8: Barrel Exports Everywhere

### Context
Every folder has an `index.ts` that re-exports all public members. Concern: does this hurt tree-shaking or bundling?

### Decision
**Use barrel files (`index.ts`)** in every folder. Modern bundlers (Webpack 5, Turbopack, Rollup) handle this correctly.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: No Barrels** | Direct imports from files | Verbose imports. Must know exact file locations. Refactoring changes all import paths. |
| **ALT-002: Selective Barrels** | Only in some directories | Inconsistent. Developers don't know when to use barrel vs direct. |
| **ALT-003: Package.json exports** | Use Node.js subpath exports | Overkill for internal code. Better for published packages. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Clean imports | `from '@/features/chat'` vs `from '@/features/chat/actions/stream-chat'` |
| ✅ Refactoring | Internal file moves don't break external imports |
| ✅ Consistent | Always import from index |
| ❌ Bundle size (myth) | Modern bundlers tree-shake correctly |
| ❌ Initial load | All exports parsed at import (minimal impact) |

### Performance Clarification
With Next.js 14+ and Turbopack:
- Unused exports are tree-shaken in production
- Development uses fast refresh, not full bundle
- Barrel files do NOT cause "barrel bomb" issues with modern tooling

### Consequences

- **POS-001**: Cleaner, shorter import paths
- **POS-002**: Internal structure changes don't break consumers
- **POS-003**: Single place to see public API of folder
- **NEG-001**: Must maintain index.ts files
- **NEG-002**: Circular dependency risk if barrels import each other

---

## Decision 9: ESLint-Only Boundary Enforcement

### Context
Layer boundaries (app → features → lib → src) need enforcement. Options: runtime checks, TypeScript paths, or ESLint rules.

### Decision
Use **ESLint `no-restricted-imports`** rule to enforce boundaries. No runtime checks.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Runtime Checks** | Assert layer at runtime | Performance overhead. Fails at runtime not build time. |
| **ALT-002: TypeScript Project References** | Separate tsconfig per layer | Complex setup. Slower type checking. Harder to maintain. |
| **ALT-003: Build-Time Plugin** | Custom webpack/turbopack plugin | Maintenance burden. ESLint already runs in CI. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Fail-fast | Errors in IDE immediately |
| ✅ CI integration | ESLint already in pipeline |
| ✅ Zero runtime cost | Removed after build |
| ❌ Can be disabled | `// eslint-disable` bypasses |
| ❌ Not type-aware | ESLint doesn't understand TS types |

### Consequences

- **POS-001**: Immediate feedback in IDE
- **POS-002**: CI catches violations before merge
- **POS-003**: No production performance impact
- **NEG-001**: Determined developer can bypass with disable comment
- **NEG-002**: Complex pattern matching for edge cases

---

## Decision 10: Custom Result Type (Not Existing Libraries)

### Context
Need a Result type for error handling. Options: neverthrow, fp-ts, true-myth, or custom implementation.

### Decision
Create **custom `Result<T, E>` type** in `src/types/result.ts`. Minimal implementation (~20 lines).

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: neverthrow** | Popular Result library | Added dependency. More features than needed. 10KB added. |
| **ALT-002: fp-ts** | Full FP library with Either | Massive overkill. Learning curve. Different programming paradigm. |
| **ALT-003: true-myth** | Lightweight Maybe/Result | Another dependency to maintain. Custom is smaller. |
| **ALT-004: Plain Exceptions** | throw/catch pattern | Loses type safety. Errors not in function signature. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Zero dependencies | No external library to update |
| ✅ Minimal footprint | ~20 lines of code |
| ✅ Tailored API | Only what we need |
| ❌ No ecosystem | Can't use neverthrow's utilities |
| ❌ Maintenance | Must maintain ourselves |

### Implementation
```typescript
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E }
```

### Consequences

- **POS-001**: No new dependency
- **POS-002**: Team understands exactly how it works
- **POS-003**: Can evolve to our needs
- **NEG-001**: Less feature-rich than libraries
- **NEG-002**: Must document for team

---

## Decision 11: Testing Patterns (Where Tests Go)

### Context
Architecture v6 document doesn't explicitly define testing patterns. This ADR establishes them.

### Decision
**Colocate unit tests, centralize integration tests**:
- Unit tests: `*.test.ts` next to source file
- Integration tests: `tests/` directory
- E2E tests: `tests/e2e/`

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: All in `__tests__/`** | Separate test directories | Divorced from source. Harder to maintain. File navigation overhead. |
| **ALT-002: All colocated** | Even E2E next to pages | E2E tests are cross-cutting. Don't belong to single feature. |
| **ALT-003: By type only** | `unit/`, `integration/`, `e2e/` | Loses connection to source files. |

### Structure
```
features/chat/
├── actions/
│   ├── stream-chat.action.ts
│   └── stream-chat.action.test.ts    # Unit test
├── hooks/
│   ├── use-messages.ts
│   └── use-messages.test.ts          # Unit test

tests/
├── integration/
│   └── chat-flow.test.ts             # Integration test
└── e2e/
    └── chat.spec.ts                  # Playwright E2E
```

### Consequences

- **POS-001**: Unit tests easy to find (same folder)
- **POS-002**: Integration tests test cross-feature flows
- **POS-003**: Clear separation of test types
- **NEG-001**: Must know convention to find tests
- **NEG-002**: Some edge cases (where does shared mock go?)

---

## Decision 12: Environment Configuration Pattern

### Context
Environment variables need type-safe access with validation. Options: raw process.env, zod validation, or T3 env.

### Decision
Use **Zod validation at app startup** in `lib/env.ts`. Fail fast if env vars missing.

### Recommended Implementation
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  // ... other vars
})

export const env = envSchema.parse(process.env)
```

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Raw process.env** | Direct access everywhere | No type safety. Runtime errors when missing. |
| **ALT-002: T3 Env (@t3-oss/env-nextjs)** | Popular env library | Added dependency. More complex than needed. |
| **ALT-003: Dotenv + TypeScript** | .env files with type augmentation | No runtime validation. Types can lie. |

### Consequences

- **POS-001**: App fails at startup if env missing (not at runtime)
- **POS-002**: Full type safety for env access
- **POS-003**: Single source of truth for env vars
- **NEG-001**: Must update schema when adding vars
- **NEG-002**: Build-time validation requires care in CI

---

## Decision 13: Granular File Structure (30+ Small Files)

### Context
`components/ai/` has 30 small files (18-1450 LOC). Question: why so many small files instead of larger bundles?

### Decision
**Prefer many small, focused files** over few large files. Each file has single responsibility.

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Large Bundle Files** | `ai-components.tsx` with everything | Harder to navigate. Code ownership unclear. Merge conflicts. |
| **ALT-002: Feature Bundles** | `chat-bundle.tsx`, `tools-bundle.tsx` | Still too large. Arbitrary bundling decisions. |
| **ALT-003: Index Files Only** | Re-export from index with inline code | Massive index files. No separation. |

### Trade-offs

| Aspect | Impact |
|--------|--------|
| ✅ Single responsibility | Each file does one thing |
| ✅ Code ownership | Clear who owns what |
| ✅ Tree shaking | Unused components not bundled |
| ✅ Parallel editing | Multiple devs can work without conflicts |
| ❌ Many files | More navigation required |
| ❌ Import management | More imports to manage |

### Consequences

- **POS-001**: Easy to understand each file in isolation
- **POS-002**: Better code review (small diffs)
- **POS-003**: Lazy loading granularity
- **NEG-001**: Need good IDE navigation
- **NEG-002**: More files in version control

---

## Decision 14: tokenlens/streamdown Dependencies

### Context
The architecture depends on `tokenlens` (token counting) and `streamdown` (streaming markdown). Both are external dependencies.

### Decision
**Accept these dependencies** with awareness of maintenance risk. They provide significant value.

### Risk Assessment

| Dependency | Purpose | Risk Level | Mitigation |
|------------|---------|------------|------------|
| `tokenlens` | Token counting for context management | 🟡 Medium | Small API surface. Can replace with tiktoken if abandoned. |
| `streamdown` | Streaming markdown rendering | 🟡 Medium | Could fallback to react-markdown + manual streaming. |

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Build In-House** | Custom token counter and markdown streamer | Significant effort. These are specialized problems. |
| **ALT-002: Different Libraries** | tiktoken + react-markdown | tiktoken is larger. react-markdown doesn't stream well. |
| **ALT-003: No Token Display** | Remove token counting feature | Loses valuable UX for AI context management. |

### Consequences

- **POS-001**: Specialized functionality without building ourselves
- **POS-002**: Smaller bundle than alternatives
- **POS-003**: Active development on both libraries
- **NEG-001**: Dependency on third-party maintenance
- **NEG-002**: Must monitor for security updates

---

## Decision 15: Vercel AI SDK Pattern Choices

### Context
Using Vercel AI SDK (`ai` package) with specific patterns. Why these specific choices?

### Decision
Follow these **Vercel AI SDK patterns**:
1. Use `useChat` hook for client state
2. Use `streamText` for server streaming
3. Use SDK types (`Message`, `ToolResult`) as source of truth
4. Wrap SDK components, don't modify

### Pattern Details

| Pattern | Why |
|---------|-----|
| **useChat hook** | Handles streaming, retry, abort. Well-tested. |
| **streamText** | Native streaming. Better than manual chunk handling. |
| **SDK types** | Consistent with ecosystem. TypeScript inference works. |
| **Wrapper components** | SDK updates don't break our code. |

### Alternatives Considered

| Alternative | Description | Why Rejected |
|------------|-------------|--------------|
| **ALT-001: Custom Streaming** | Build streaming from scratch | Reinventing wheel. SDK handles edge cases. |
| **ALT-002: Modify SDK** | Fork and customize | Maintenance nightmare. Can't receive updates. |
| **ALT-003: Different SDK** | Use LangChain or custom | More complex. Vercel AI SDK designed for Next.js. |

### Consequences

- **POS-001**: Battle-tested streaming implementation
- **POS-002**: Ecosystem compatibility (ai-sdk-ui, etc.)
- **POS-003**: Vercel optimization for edge deployment
- **NEG-001**: Locked into Vercel AI SDK patterns
- **NEG-002**: Must wait for SDK updates for new features

---

## Summary Matrix

| # | Decision | Rationale | Risk |
|---|----------|-----------|------|
| 1 | lib/data/ single abstraction | Simplicity over CQRS complexity | 🟢 Low |
| 2 | Edge-only rate limiting | Lowest latency, single location | 🟢 Low |
| 3 | Singleton services | Lazy init, consistent state | 🟢 Low |
| 4 | No repository pattern | Drizzle provides abstraction | 🟢 Low |
| 5 | features/ actions | Feature cohesion, reusability | 🟢 Low |
| 6 | components/ai/ naming | Accurate scope for AI UI | 🟢 Low |
| 7 | src/ vs lib/ | Pure vs impure separation | 🟢 Low |
| 8 | Barrel exports | Modern bundlers handle correctly | 🟢 Low |
| 9 | ESLint boundaries | Fail-fast, no runtime cost | 🟢 Low |
| 10 | Custom Result type | Zero deps, minimal code | 🟢 Low |
| 11 | Colocated tests | Find tests easily | 🟢 Low |
| 12 | Zod env validation | Type-safe, fail-fast | 🟢 Low |
| 13 | Granular files | SRP, parallel editing | 🟢 Low |
| 14 | tokenlens/streamdown | Specialized, worth risk | 🟡 Medium |
| 15 | Vercel AI SDK patterns | Battle-tested, ecosystem | 🟡 Medium |

---

## References

- [architecture-v6-final.md](../specs/refactor-migration/architecture-v6-final.md)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit)
