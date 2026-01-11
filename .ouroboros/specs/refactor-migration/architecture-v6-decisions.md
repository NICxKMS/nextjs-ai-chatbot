# Architecture v6 - Decision Records (ADRs)

> Rationale for every architectural decision in v6

## Quick Reference

| ADR | Decision | Key Rationale |
|-----|----------|---------------|
| 001 | Repository pattern | Cache optimization, read/write separation |
| 002 | ~~Edge-only rate limiting~~ Route-specific rate limits | Granular control per route type |
| 003 | Singleton services | Lazy init vs module-level eager |
| 004 | ~~No repository~~ → See ADR-001 | Decision superseded |
| 005 | features/ for actions | Feature cohesion, portability |
| 006 | src/components/ai/ naming | Broader scope than "chat" |
| 007 | src/ vs lib/ separation | Pure vs impure utilities |
| 008 | Barrel exports | Modern bundlers tree-shake |
| 009 | ESLint-only enforcement | Zero runtime cost |
| 010 | Custom Result type | Zero deps, 20 lines |
| 011 | Colocated tests | Unit tests near code |
| 012 | Zod env validation | Type-safe config at startup |
| 013 | Granular files | SRP, parallel editing |
| 014 | Niche dependencies | Worth maintenance risk |
| 015 | AI SDK patterns | Battle-tested ecosystem |
| 016 | AI content wrappers | UI focus, not SDK wrappers |
| 017 | Data streaming pattern | Provider/Handler for SSE |
| 018 | Request guards pattern | Composable auth/authz |
| **019** | **Artifact-Document unification** | **Single naming, single extension point** |
| **020** | **Two-layer AI elements** | **Read-only primitives + project wrappers** |

---

## ADR-001: Repository Pattern for Data Access

**Status**: Accepted

### Context
Need data abstraction with cache optimization. Separate read/write interfaces for different caching strategies.

### Decision
Use Repository pattern in `lib/data/repositories/` with:
- Abstract `BaseRepository<T, TCreate, TUpdate>` class
- `IReadRepository<T>` interface (findById, findMany, exists, count)
- `IWriteRepository<T, TCreate, TUpdate>` interface (create, createMany, update, delete, deleteMany)
- Cache-through reads with configurable TTL
- Write-through with automatic cache invalidation

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Simple functions** | Can't optimize cache per operation type |
| **CQRS** | Over-engineering at this scale |
| **Direct Drizzle access** | No cache abstraction |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Cache logic centralized | More files (~10) |
| Read/write optimization | Learning curve |
| Testable data layer | Inheritance pattern |

### Consequences
1. POS: Cache-through pattern enforced consistently
2. POS: Separate TTL for entities vs lists
3. POS: Auto-invalidation on writes
4. NEG: Must extend BaseRepository for custom methods

---

## ADR-002: Route-Specific Rate Limiting (at Edge)

**Status**: Accepted (Updated)

### Context
Different API routes have different usage patterns. A chat endpoint costs more (AI calls) than a history endpoint. Global rate limit is too coarse.

### Decision
Route-specific rate limits configured in `lib/rate-limit/config.ts`, enforced in `middleware.ts`.

### Route Configuration
| Route | Limit | Window | Reason |
|-------|-------|--------|--------|
| `/api/chat` | 10 | 1 min | AI calls expensive |
| `/api/upload` | 3 | 1 min | Large file processing |
| `/api/history` | 30 | 1 min | Frequent polling OK |
| `/api/auth/*` | 5 | 1 min | Prevent brute force |
| default | 60 | 1 min | General API access |

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| ~~Global rate limit~~ | Previous decision - too coarse |
| **Per-handler rate limiting** | Duplicated logic, inconsistent |
| **Middleware + handler hybrid** | Complex, two places to configure |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Granular control | More complex config |
| Still at edge | Must maintain route list |
| Prevents abuse per route type | Config can drift from routes |

### Consequences
1. POS: AI endpoints protected from abuse
2. POS: Upload endpoint can't DOS storage
3. POS: Auth hardened against brute force
4. NEG: Must update config when adding routes
5. MITIGATION: Document in route creation checklist

---

## ADR-003: Singleton Services

**Status**: Accepted

### Context
Cross-cutting services (analytics, telemetry) need single instance. Options: singleton pattern, module-level export, dependency injection.

### Decision
Use singleton pattern with `getInstance()`.

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Module-level export** | Eager initialization at import time |
| **Dependency injection** | Over-engineering for this scale |
| **React Context** | Only works in React components |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Lazy initialization | Harder to mock in tests |
| Explicit access | Global state |
| TypeScript friendly | No DI framework benefits |

### Consequences
1. POS: Service created only when needed
2. POS: Clear ownership of instance lifecycle
3. NEG: Testing requires jest.mock() or test utilities
4. MITIGATION: Export both class and instance for testing

---

## ADR-004: Decision Change - Repository Pattern Adoption

**Status**: Superseded by ADR-001

### Context
Original decision ADR-004 was "No Repository Pattern" - using simple functions in lib/data/. 

### Decision Change
After analysis, Repository Pattern was adopted for cache optimization. This decision is now documented in **ADR-001**.

### Reason for Change
- Simple functions couldn't support cache-through optimization
- Read/write interfaces needed for different TTL strategies
- BaseRepository centralizes caching logic

### Reference
See **ADR-001: Repository Pattern for Data Access** for current architecture.

---

## ADR-005: features/ for Actions (Not app/)

**Status**: Accepted

### Context
Next.js allows colocating actions in route folders. Should actions live in `app/api/chat/actions.ts` or `features/chat/actions/`?

### Decision
Actions in `features/[name]/actions/`.

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Colocate in app/api/** | Actions not reusable across routes |
| **Separate actions/ directory** | Loses feature cohesion |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Feature cohesion | Longer import paths |
| Actions portable to other routes | Not Next.js default convention |
| Easy to find related code | Learning curve |

### Consequences
1. POS: Features are self-contained modules
2. POS: Easy to move features between projects
3. NEG: Developers expect Next.js conventions
4. MITIGATION: Document pattern clearly

---

## ADR-006: src/components/ai/ Naming

**Status**: Accepted

### Context
31 UI primitives from oldapp/components/elements/. Name as "chat", "ai", or "elements"?

### Decision
Name as `src/components/ai/` with subdirectories by function.

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **components/chat/** | Too narrow - includes canvas, workflow, artifacts |
| **components/elements/** | Too vague - "elements" doesn't convey AI focus |
| **components/primitives/** | Conflicts with Radix naming |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Clear AI relationship | "ai" is overloaded term |
| Room for non-chat AI components | May confuse with AI SDK |
| Industry-standard term | Some components (canvas) aren't AI-specific |

### Consequences
1. POS: Developers know where AI-related UI lives
2. POS: Scalable to future AI features
3. NEG: Canvas components could be more general
4. MITIGATION: Document that "ai" means "AI-related UI" not "AI SDK"

---

## ADR-007: src/ vs lib/ Separation

**Status**: Accepted

### Context
Utilities need a home. Convention varies: lib/, src/, utils/. Why have both?

### Decision
- `lib/` = Infrastructure with side effects (DB, cache, auth)
- `src/` = Pure utilities, types, errors (no side effects)

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **All in lib/** | Mixes pure and impure code |
| **All in src/** | Non-standard for Next.js infrastructure |
| **lib/ + lib/utils/** | Nesting adds complexity |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Clear purity boundary | Two places to look |
| src/ can be extracted to shared package | Unconventional |
| Easy to identify side effects | Learning curve |

### Consequences
1. POS: Pure code easily testable
2. POS: Infrastructure clearly identified
3. NEG: Developers may put code in wrong place
4. MITIGATION: ESLint rules enforce boundaries

---

## ADR-008: Barrel Exports

**Status**: Accepted

### Context
Should every folder have `index.ts` re-exporting everything?

### Decision
Yes. Every folder has barrel `index.ts`.

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Direct file imports** | Longer imports, harder refactoring |
| **Selective barrels** | Inconsistent experience |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Clean imports | Potential circular deps |
| Easy refactoring | Bundle size concerns |
| Consistent pattern | Must maintain index.ts |

### Consequences
1. POS: Import from `@/features/chat` not deep paths
2. POS: Internal restructuring doesn't break imports
3. NEG: Modern bundlers handle tree-shaking, but older may not
4. MITIGATION: Use named exports, not `export *`

---

## ADR-009: ESLint-Only Boundary Enforcement

**Status**: Accepted

### Context
How to enforce layer boundaries? Options: ESLint, runtime checks, architectural tests.

### Decision
ESLint `no-restricted-imports` rules only.

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Runtime boundary checks** | Performance cost, complexity |
| **dependency-cruiser** | Additional tooling to maintain |
| **TypeScript project references** | Over-engineering |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Fail-fast in IDE | No runtime enforcement |
| Zero runtime cost | Developers can disable |
| Standard tooling | Must keep rules updated |

### Consequences
1. POS: Violations caught immediately
2. POS: No production impact
3. NEG: Determined developers can bypass
4. MITIGATION: CI checks ESLint, no disable comments

---

## ADR-010: Custom Result Type

**Status**: Accepted

### Context
Need explicit error handling. Options: throwing, Result type, existing libs (neverthrow, fp-ts).

### Decision
Custom `Result<T, E>` type in 20 lines.

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **neverthrow** | 10KB dependency for 20 lines of code |
| **fp-ts** | 200KB, steep learning curve |
| **throw everywhere** | Implicit error paths, hard to trace |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Zero dependencies | Not as feature-rich |
| Team owns implementation | Must maintain |
| Simple API | No pipe/chain operators |

### Consequences
1. POS: Full control over API
2. POS: No security/maintenance debt from deps
3. NEG: Missing advanced features (chain, mapErr)
4. MITIGATION: Can add features as needed

---

## ADR-011: Colocated Tests

**Status**: Accepted

### Context
Where do tests live? Separate `__tests__/`, alongside code, or `tests/` root?

### Decision
- Unit tests: Colocated (`*.test.ts` next to source)
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

### Pattern
```
features/chat/
├── actions/
│   ├── stream-chat.action.ts
│   └── stream-chat.action.test.ts   # Colocated unit test
└── hooks/
    ├── use-messages.ts
    └── use-messages.test.ts

tests/
├── integration/
│   └── chat-flow.test.ts
└── e2e/
    └── chat.spec.ts
```

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **All in tests/** | Lost locality, harder to find tests |
| **All colocated** | E2E tests don't map to single files |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Unit tests easy to find | File listing more cluttered |
| Integration tests separate | Two patterns to learn |
| Natural test:code ratio | Must configure test runners |

### Consequences
1. POS: Missing unit test immediately obvious
2. POS: Integration tests not tied to implementation
3. NEG: Configure test runner to find both patterns
4. MITIGATION: Vitest config with multiple include patterns

---

## ADR-012: Zod Environment Validation

**Status**: Accepted

### Context
Environment variables need validation. Options: manual checks, Zod schema, t3-env.

### Decision
Zod schema validation at app startup.

### Pattern
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  // ...
})

export const env = envSchema.parse(process.env)
```

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Manual process.env checks** | No type safety, duplicated |
| **t3-env** | Dependency for simple use case |
| **dotenv-safe** | No TypeScript types |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Type-safe env access | App won't start if invalid |
| Fail-fast on deploy | Zod already a dependency |
| Single source of truth | Schema must stay updated |

### Consequences
1. POS: `env.DATABASE_URL` is typed string
2. POS: Missing vars caught immediately
3. NEG: Must update schema when adding vars
4. MITIGATION: Document env vars in README

---

## ADR-013: Granular Files (31 in src/components/ai/)

**Status**: Accepted

### Context
31 files in src/components/ai/ vs fewer, larger files. Which approach?

### Decision
Many small, focused files (one component per file).

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Fewer large files** | Harder to find code, larger diffs |
| **One file per category** | Still large, mixed concerns |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| SRP per file | More files to navigate |
| Parallel editing | More imports |
| Better tree-shaking | Longer file lists |
| Smaller git diffs | Initial intimidation |

### Consequences
1. POS: Each file has single responsibility
2. POS: Multiple devs edit different files
3. NEG: Initial complexity perception
4. MITIGATION: Good folder organization, barrel exports

---

## ADR-014: Niche Dependencies (tokenlens, streamdown)

**Status**: Accepted

### Context
Using tokenlens (token counting) and streamdown (streaming markdown). Both are niche packages. Risk?

### Decision
Accept the dependency risk for significant functionality.

### Analysis

| Package | Weekly Downloads | Last Update | Alternatives |
|---------|-----------------|-------------|--------------|
| tokenlens | ~2k | Recent | Manual tiktoken, gpt-tokenizer |
| streamdown | ~1k | Recent | Manual streaming parser |

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Manual token counting** | Complex, must track model changes |
| **tiktoken** | WASM, larger bundle |
| **Manual markdown streaming** | Significant implementation effort |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Saves dev time | Maintenance risk |
| Tested implementations | Low download counts |
| Focused functionality | May need to fork |

### Consequences
1. POS: Features implemented quickly
2. POS: Community-tested edge cases
3. NEG: May need to maintain fork
4. MITIGATION: Lock versions, monitor for deprecation

---

## ADR-015: Vercel AI SDK Patterns

**Status**: Accepted

### Context
Using Vercel AI SDK (@ai-sdk/react, ai). Following their patterns vs custom?

### Decision
Follow Vercel AI SDK patterns closely.

### Patterns Adopted
- `useChat()` hook for chat state
- `streamText()` for streaming
- `Message` type structure
- Tool definition format

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Custom chat state** | Reinventing well-solved problem |
| **Different streaming lib** | SDK handles edge cases |
| **Custom message types** | Incompatible with SDK |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Battle-tested patterns | Vendor lock-in |
| Active maintenance | Limited customization |
| Community resources | Breaking changes possible |

### Consequences
1. POS: Leverage Vercel's R&D
2. POS: Community help available
3. NEG: Tied to Vercel's roadmap
4. MITIGATION: Wrap SDK usage for future flexibility

---

## ADR-016: AI Content Wrappers (Not SDK Wrappers)

**Status**: Accepted

### Context
31 UI components in `src/components/ai/` display AI-related content. Confusion arose about whether these wrap the Vercel AI SDK.

### Decision
The src/components/ai/ components are **UI Content Wrappers**, NOT SDK wrappers. They:
- Wrap AI-generated content for consistent display
- Handle streaming states
- Provide compound component API
- Do NOT wrap useChat(), generateText(), etc.

### Clarification

| Component Type | What It Wraps | Example |
|----------------|---------------|--------|
| Message | AI response text | `<Message>{content}</Message>` |
| Reasoning | CoT/thinking | `<Reasoning isStreaming />` |
| Code | Generated code | `<Code language="ts" />` |
| Tool | Tool results | `<Tool name="weather" />` |

### NOT Wrapped (Used Directly)
- `useChat()` from @ai-sdk/react
- `streamText()` from ai
- `generateText()` from ai

### Consequences
1. POS: Clear separation of UI vs SDK concerns
2. POS: SDK updates don't require wrapper changes
3. NEG: Name "ai/" could imply SDK wrapping
4. MITIGATION: Documentation clarifies "AI Content" focus

---

## ADR-017: Data Streaming Pattern (Provider/Handler)

**Status**: Accepted

### Context
The app streams AI responses via SSE from `/api/chat`. Need a pattern to:
- Manage SSE connection lifecycle
- Process different event types (text, tool_call, artifact, reasoning)
- Update UI state reactively
- Handle reconnection and errors

### Decision
Use a Provider/Handler pattern with two components:
1. **DataStreamProvider** - Context provider managing connection state
2. **DataStreamHandler** - Event consumer updating application state

### Pattern
```tsx
<DataStreamProvider>
  <DataStreamHandler />
  <Chat>
    <Messages />
    <MultimodalInput />
  </Chat>
</DataStreamProvider>
```

### Responsibilities

| Component | Responsibility |
|-----------|---------------|
| DataStreamProvider | Connection lifecycle, context state, hooks |
| DataStreamHandler | Event parsing, state updates, coordination |

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Single component** | Mixed concerns, harder to test |
| **Custom hook only** | Can't coordinate across components |
| **Redux/Zustand** | Over-engineering for single stream |
| **Direct useChat() only** | Doesn't handle custom events (artifacts) |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Clear separation of concerns | Two components instead of one |
| Testable independently | Must wrap entire chat UI |
| Reusable across features | Context overhead |
| Handles all event types | Learning curve |

### Consequences
1. POS: Stream state accessible anywhere via hooks
2. POS: Handler can be replaced/extended easily
3. POS: Provider manages complex lifecycle
4. NEG: Must ensure Provider wraps consumers
5. MITIGATION: Error if used outside Provider

---

## ADR-018: Request Guards Pattern

**Status**: Accepted

### Context
API routes need consistent authentication/authorization checks. Without a pattern, each route implements its own checks leading to inconsistency and security gaps.

### Decision
Use a guards pattern in `lib/api/guards.ts` with composable guard functions:
- `ensureAuth(request)` - Verify authenticated user
- `ensureOwner(userId, resourceId)` - Verify resource ownership  
- `ensureGuest()` - Allow guest access (explicit opt-in)

### Pattern
```typescript
// lib/api/guards.ts
export async function ensureAuth(request: Request) {
  const session = await auth()
  if (!session?.user) throw AppError.unauthorized()
  return session.user
}

export async function ensureOwner(userId: string, resourceId: string) {
  const resource = await getResourceById(resourceId)
  if (resource?.userId !== userId) throw AppError.forbidden()
  return resource
}

// Usage in route
export async function POST(request: Request) {
  const user = await ensureAuth(request)
  const body = await validateBody(schema, await request.json())
  // User is guaranteed authenticated here
}
```

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Middleware-only auth** | Too coarse, can't do resource-level checks |
| **HOF wrappers** | Harder to compose, less explicit |
| **Decorators** | Not standard in Next.js routes |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Explicit and composable | Must call in each route |
| Fail-fast with clear errors | Slightly more boilerplate |
| Easy to test | Guards must be kept updated |
| Type-safe return values | - |

### Consequences
1. POS: Every route explicitly declares its auth requirements
2. POS: Guards return typed values (user, resource)
3. POS: Consistent error responses across all routes
4. NEG: Developers must remember to add guards
5. MITIGATION: Code review checklist includes guard verification

---

## ADR-019: Artifact-Document Unification

**Status**: Accepted

### Context
The codebase had naming confusion between "Document" (database entity in `lib/data/documents/`) and "Artifact" (UI concept in `features/artifact/`). This led to:
- Developer confusion about which term to use
- Duplicate code paths for similar functionality
- Inconsistent API naming (`/api/document` vs artifact UI)
- Two separate feature folders (`features/documents/` and `features/artifact/`)

### Decision
Unify under "Artifact" naming everywhere:
1. **Database**: Rename `document` table → `artifacts` table with `kind` discriminator
2. **Repository**: `DocumentRepository` → `ArtifactRepository`
3. **Feature folder**: Merge `features/documents/` into `features/artifact/`
4. **API routes**: `/api/document` → `/api/artifact`
5. **Types**: Keep `UIArtifact` (already correct), add `Artifact` as DB entity type

### Directory Structure (After)
```
features/artifact/            # Unified feature module
├── types/
│   ├── artifact.ts           # ArtifactKind, UIArtifact, Artifact (DB)
│   └── handlers.ts
├── components/
│   ├── document-preview.tsx  # Merged from features/documents/
│   ├── document-skeleton.tsx # Merged from features/documents/
│   └── editors/
├── handlers/
├── hooks/
├── actions/
└── schemas/

lib/data/
├── repositories/
│   └── artifact.repository.ts  # Renamed from document.repository.ts
```

### Alternatives Considered

| Alternative | Rejection Reason |
|-------------|------------------|
| **Keep both terms** | Perpetuates confusion, duplicate code |
| **Unify under "Document"** | "Artifact" is industry standard (Anthropic, Cursor) |
| **New term (e.g., "Asset")** | Unnecessary churn, "Artifact" already established |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Single naming convention | Migration effort |
| Industry alignment | Breaking change to API |
| Single extension point | Database migration required |
| Reduced code duplication | Documentation updates |

### Consequences
1. POS: Clear, unambiguous terminology
2. POS: Single feature folder to extend
3. POS: Matches industry terminology (Anthropic Artifacts, Cursor Composers)
4. NEG: Requires database migration (`document` → `artifacts`)
5. NEG: API breaking change (version or deprecation needed)
6. MITIGATION: Keep "Document" term ONLY when referring to legacy/oldapp code

### Migration Checklist
- [ ] Rename database table: `document` → `artifacts`
- [ ] Add `kind` column as discriminator
- [ ] Rename `DocumentRepository` → `ArtifactRepository`
- [ ] Merge `features/documents/` into `features/artifact/`
- [ ] Update API route `/api/document` → `/api/artifact`
- [ ] Update all imports and references
- [ ] Update documentation

---

## ADR-020: Two-Layer AI Element Architecture

**Status**: Accepted  
**Date**: 2024-12-29

### Context
The project has 30 AI UI primitives from `archive/oldapp/components/elements/`. These are well-designed, headless-style components following compound component patterns. We need to:
1. Use these primitives without modification (preserve upgradeability)
2. Add project-specific behaviors (actions, state, hooks)
3. Maintain clear separation of concerns

### Decision
Implement a **two-layer architecture**:

1. **Layer 1: `src/components/ai-elements/`** - Read-only primitives
   - Exact copy of source elements
   - Never modify directly
   - ~30 files, ~5,500 LOC

2. **Layer 2: `src/components/ai/`** - Project wrappers
   - Import from ai-elements/
   - Add project logic: actions, state, hooks, error boundaries
   - ~31 wrapper modules
   - What application code imports

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Modify primitives directly | Breaks upgradeability |
| Fork primitives | Maintenance burden |
| Single layer with all logic | Violates SRP, harder to test |

### Trade-offs

| ✅ Positive | ❌ Negative |
|-------------|-------------|
| Clear separation | Extra indirection |
| Easy to upgrade primitives | Two places to look |
| Wrappers are testable | More files |
| Project logic isolated | Initial setup effort |

### Consequences
1. Application code imports from `@/components/ai`, never `ai-elements`
2. Primitives can be updated by copying newer source
3. Wrappers can be customized freely
4. Testing focuses on wrapper behavior

---

## Glossary

| Abbreviation | Meaning |
|--------------|---------|
| ADR | Architecture Decision Record |
| SSE | Server-Sent Events |
| CQRS | Command Query Responsibility Segregation |
| DAL | Data Access Layer |
| DI | Dependency Injection |
| DRY | Don't Repeat Yourself |
| LOC | Lines of Code |
| ORM | Object-Relational Mapping |
| SDK | Software Development Kit |
| SRP | Single Responsibility Principle |
