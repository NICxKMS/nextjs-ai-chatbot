# Phase P0 — Scaffold

> **Updated per redesign audit (2026-03-01)**

> Foundation phase. Creates the project skeleton: config, shared types, error handling,
> utilities, UI primitives, root layout, proxy, and test infrastructure.
>
> **Entry state**: Empty project directory (oldapp/ preserved as read-only reference).
> **Exit state**: Project builds, typechecks, lints. All shared infrastructure importable.
> **Est. duration**: ~2.5 days
> **Tasks**: 18
> **Files created**: ~55

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P0-T01 | Initialize project config | SCAFFOLD | M | 4 |
| P0-T02 | Create tooling config | SCAFFOLD | S | 4 |
| P0-T03 | Set up Tailwind v4 CSS | SCAFFOLD | M | 1 |
| P0-T04 | Create Drizzle schema + client | IMPL | L | 2 |
| P0-T05 | Define core shared types | IMPL | M | 4 |
| P0-T06 | Define artifact shared types | IMPL | M | 2 |
| P0-T07 | Define state shared types | IMPL | S | 2 |
| P0-T08 | Create error handling | IMPL | M | 2 |
| P0-T09 | Create utility functions | IMPL | S | 3 |
| P0-T10 | Create shared hooks | IMPL | S | 2 |
| P0-T11 | Copy shadcn/ui components | SCAFFOLD | M | ~32 |
| P0-T12 | Create shared components | IMPL | M | 4 |
| P0-T13 | Create root layout + global error | IMPL | M | 2 |
| P0-T14 | Create proxy.ts (Next.js 16) | IMPL | M | 1 |
| P0-T15 | Create instrumentation stubs | SCAFFOLD | S | 2 |
| P0-T16 | Create test infrastructure | SCAFFOLD | M | 4 |
| P0-T17 | Create import boundary script | IMPL | S | 1 |
| P0-T18 | Verification gate G00 | VERIFY | S | 0 |

---

## Tasks

---

### TASK: [ID: P0-T01]
Title: Initialize project configuration files
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A — infrastructure
Architecture ref: scaffold/base-config.md sections 1-4; AGENTS.md (TypeScript strict, Biome)

Action: Create the 4 core project configuration files. package.json with all production and dev dependencies (pinned versions from base-config.md), scripts (dev, build, start, lint, format, typecheck, test:unit, test:e2e, db:generate, db:migrate, db:studio, db:push), name "ai-assistant", version "4.0.0", packageManager "pnpm@10.26.0". tsconfig.json with strict mode, @/* path alias, noUncheckedIndexedAccess, exclude oldapp/plan. next.config.ts with reactCompiler true, `cacheComponents: true`, images remotePatterns. biome.json with tabs, lineWidth 100, noExplicitAny error, organize imports, ai-elements ignored, Next.js file overrides for default exports.

Output files:
- package.json
- tsconfig.json
- next.config.ts
- biome.json

Inputs: scaffold/base-config.md (complete specs for all 4 files)
Outputs: Project config consumable by all subsequent tasks; pnpm install can run

AI layer handling: N/A

Dependencies: none
Dependents: P0-T02, P0-T03, P0-T04, P0-T08, P0-T09, P0-T10, P0-T11, P0-T12, P0-T14, P0-T15, P0-T16, P0-T17

Success criteria:
- pnpm install completes without errors
- tsconfig has strict: true, paths: {"@/*": ["./*"]}, excludes oldapp and plan
- biome.json has noExplicitAny: "error" and ignores components/ai-elements
- next.config.ts has reactCompiler: true and `cacheComponents: true`

Complexity: M

---

### TASK: [ID: P0-T02]
Title: Create tooling configuration files
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A — infrastructure
Architecture ref: scaffold/base-config.md (postcss, vercel.json, env)

Action: Create postcss.config.mjs with @tailwindcss/postcss plugin (Tailwind v4 — no tailwind.config.ts needed). Create vercel.json with minimal {"framework": "nextjs"}. Create .env.example with all environment variable placeholders documented: DATABASE_URL, CACHE_KV_REST_API_URL/TOKEN, SUPABASE_URL/ANON_KEY/JWT_SECRET, GUEST_JWT_SECRET, baseline AI provider keys (`OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`), BLOB_READ_WRITE_TOKEN. Each variable has a comment indicating required vs optional.

Output files:
- postcss.config.mjs
- vercel.json
- .env.example
- .gitignore
<!-- audit: SC-V1 -->

Inputs: scaffold/base-config.md
Outputs: PostCSS config consumed by Tailwind v4; env template for all phases

AI layer handling: N/A

Dependencies: P0-T01
Dependents: P0-T03

Success criteria:
- postcss.config.mjs exports config with @tailwindcss/postcss plugin
- vercel.json is valid JSON
- .env.example lists all 15+ environment variables with comments

Complexity: S

---

### TASK: [ID: P0-T03]
Title: Set up Tailwind v4 CSS globals
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A — infrastructure (theme tokens from oldapp)
Architecture ref: scaffold/base-config.md (Tailwind v4); conventions.md (Tailwind v4)

Action: Create app/globals.css. Start with Tailwind v4 import (@import "tailwindcss"), @plugin "@tailwindcss/typography", @custom-variant dark. Copy ALL CSS custom properties (color tokens, radius, sidebar variables) verbatim from oldapp/app/globals.css for both :root (light) and .dark (dark) themes. Include oklch color values. Add @utility scrollbar-thin. Copy any animation keyframes and print styles from oldapp.

Output files:
- app/globals.css

Inputs: oldapp/app/globals.css (source of truth for theme tokens)
Outputs: Global CSS consumed by app/layout.tsx and all components

AI layer handling: COPY_CONTENT

Dependencies: P0-T01, P0-T02
Dependents: P0-T13

Success criteria:
- File starts with @import "tailwindcss"
- All :root and .dark CSS custom properties match oldapp values
- @custom-variant dark defined
- File under 200 lines

Complexity: M

---

### TASK: [ID: P0-T04]
Title: Create Drizzle schema + client
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: data-flows.md (database schema — 6 tables with columns, indexes, enums)
Architecture ref: ../../plan-archives/redesign/architecture.md (data layer); ../../plan-archives/redesign/directory-structure.md (lib/db/)

Action: Create lib/db/schema.ts defining all 6 Drizzle tables using drizzle-orm/pg-core. Tables: users (uuid PK, email unique, passwordHash, createdAt, lastLogin), chats (uuid PK, userId FK, title, visibility enum, createdAt, updatedAt, lastContext jsonb), messages aliased as Message_v2 (uuid PK, chatId FK, role enum, parts jsonb, attachments jsonb, createdAt), votes aliased as Vote_v2 (composite PK: chatId+messageId+userId, isUpvoted boolean), **artifacts** (composite PK: id+createdAt, title, content text, kind enum, userId FK, chatId FK, updatedAt), suggestions (uuid PK, artifactId, artifactCreatedAt, originalText, suggestedText, description, isResolved boolean, userId FK). Define pgEnum for visibility (public/private), role (user/assistant/system), **artifact_kind** (text/code/image/sheet). Add all indexes. Create lib/db/client.ts with Drizzle client initialization from DATABASE_URL env var.

Output files:
- lib/db/schema.ts
- lib/db/client.ts

Inputs: data-flows.md (schema spec), oldapp/lib/db/schema.ts (reference implementation)
Outputs: Schema tables exported for Drizzle queries and type inference (P0-T05)

AI layer handling: NEW

Dependencies: P0-T01
Dependents: P0-T05, P0-T06, P1-T01, P1-T05, P1-T06, P1-T07, P1-T08, P1-T09, P1-T10, P1-T13

Success criteria:
- All 6 tables defined with correct column types
- Table name is **artifacts** (NOT documents)
- 3 enums defined (visibility, role, **artifact_kind** NOT document_kind)
- Composite PKs on votes (chatId+messageId+userId) and artifacts (id+createdAt)
- lib/db/client.ts exports working Drizzle client
- pnpm typecheck passes for these files

Complexity: L

---

### TASK: [ID: P0-T05]
Title: Define core shared types
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: ai-sdk-usage.md (model types); data-flows.md (entity types)
Architecture ref: ../../plan-archives/redesign/architecture.md (type system); ../../plan-archives/redesign/directory-structure.md (lib/types/)

Action: Create 4 type files. (1) lib/types/result.types.ts — ActionResult<T> type for Server Actions and data access layer, success/failure discriminated union. (2) lib/types/data-context.types.ts — DataContext type for server-to-client data passing. (3) lib/types/model.types.ts — ProviderId (`openai` | `google` | `openrouter`), ModelMetadata, DEFAULT_CHAT_MODEL / TITLE_MODEL / ARTIFACT_MODEL constants. <!-- audit: MO-3 — removed obsolete ModelCapability, ModelModality, ReasoningType --> (4) lib/types/models.types.ts — Drizzle InferSelectModel / InferInsertModel types for all 6 tables (User, Chat, Message, Artifact, Vote, Suggestion + insert variants), enum types, and composite types (ChatWithMessages, ArtifactWithVersions).

Output files:
- lib/types/result.types.ts
- lib/types/data-context.types.ts
- lib/types/model.types.ts
- lib/types/models.types.ts

Inputs: scaffold/shared-types.md (type contracts)
Outputs: Core types consumed by all subsequent phases

AI layer handling: NEW

Dependencies: P0-T01, P0-T04
Dependents: P0-T06, P0-T07, P1-T05, P1-T06, P1-T07, P1-T08, P1-T09, P1-T10, P1-T11, P1-T13, P2-T01, P3-T05

Success criteria:
- ActionResult<T> is a discriminated union with success/failure variants
- DataContext type compiles against schema entity types
- ModelMetadata exports all required model fields
- models.types.ts exports Drizzle-inferred select/insert types for all 6 tables
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P0-T06]
Title: Define artifact shared types
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: features.md (artifact system)
Architecture ref: ../../plan-archives/redesign/architecture.md (artifact types); ../../plan-archives/redesign/component-architecture.md (handler registry)

Action: Create 2 type files. (1) lib/types/artifact.types.ts — ArtifactKind literal union (text/code/image/sheet), ArtifactMetadata, ArtifactVersion, Artifact (replaces old Document type). (2) lib/types/artifact-handler.types.ts — ArtifactHandler interface defining create(params) and update(params) methods per redesign naming-conventions. Used by handler registry in P4. <!-- audit: SC-V2, SC-1, DA-1 -->

Output files:
- lib/types/artifact.types.ts
- lib/types/artifact-handler.types.ts

Inputs: lib/types/result.types.ts (P0-T05), lib/db/schema.ts (P0-T04)
Outputs: Artifact types consumed by P3 (AI tools), P4 (handlers, editors)

AI layer handling: NEW

Dependencies: P0-T04, P0-T05
Dependents: P1-T08, P1-T13, P3-T05, P4-T01 through P4-T05

Success criteria:
- ArtifactKind is a string literal union (NOT DocumentKind)
- ArtifactHandler interface defines create(params) and update(params) <!-- audit: SC-V2, SC-1, DA-1 -->
- No references to "document" in type names or artifact context
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P0-T07]
Title: Define state shared types
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: state-management.md (pending chats, settings)
Architecture ref: ../../plan-archives/redesign/state-management.md (client state types)

Action: Create 2 type files. (1) lib/types/pending-chats.types.ts — PendingChat type, PendingChatsState interface for PendingChatsProvider (replaces old OptimisticChatsProvider). (2) lib/types/settings.types.ts — SettingsState type (`temperature`, `topP`, `maxOutputTokens`, `systemPrompt`, `enableReasoning`). Model selection is handled separately via model cookie/localStorage, not settings state.

Output files:
- lib/types/pending-chats.types.ts
- lib/types/settings.types.ts

Inputs: lib/types/model.types.ts (P0-T05)
Outputs: State types consumed by P3 (chat session), P5 (sidebar)

AI layer handling: NEW

Dependencies: P0-T05
Dependents: P3-T04, P5-T02

Success criteria:
- PendingChat type maps chat ID to optimistic title
- SettingsState type includes temperature/topP/maxOutputTokens/systemPrompt/enableReasoning
- No SettingsProvider type (removed per redesign)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P0-T08]
Title: Create error handling
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: edge-cases.md (error handling strategy)
Architecture ref: ../../plan-archives/redesign/architecture.md (AppError, error codes); DEV-011 (string literal error codes)

Action: Create 2 files. (1) lib/errors/app-error.ts — AppError class extending Error with static factory methods: AppError.unauthorized(), AppError.notFound(), AppError.forbidden(), AppError.badRequest(), AppError.rateLimited(), AppError.internal(). Each factory returns typed error with string literal code, HTTP status, and optional details. (2) lib/errors/codes.ts — ErrorCode union type and ERROR_STATUS_MAP. **No ACTIVATE_GATEWAY, no credit/quota error codes** (removed per redesign). <!-- audit: SC-V6 -->

Output files:
- lib/errors/app-error.ts
- lib/errors/codes.ts

Inputs: ../../plan-archives/redesign/architecture.md (error handling spec)
Outputs: Error handling consumed by all data access functions, server actions, and API routes

AI layer handling: NEW

Dependencies: P0-T01
Dependents: P1-T05, P1-T06, P1-T12, P2-T01

Success criteria:
- AppError has factory methods for all error types (unauthorized, notFound, forbidden, badRequest, rateLimited, internal) <!-- audit: SC-V6 -->
- Error codes are string literals (ErrorCode union type, not numeric)
- **No ACTIVATE_GATEWAY or credit/quota error codes**
- AppError.unauthorized() returns 401, AppError.notFound() returns 404
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P0-T09]
Title: Create utility functions
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: N/A (cross-cutting utilities)
Architecture ref: ../../plan-archives/redesign/directory-structure.md (lib/utils/)

Action: Create 3 files. (1) lib/utils/cn.ts — cn() using clsx + tailwind-merge. Copy exact implementation from oldapp/lib/utils.ts. (2) lib/utils/format.ts — formatDate(date, format?) using date-fns. (3) lib/utils/generate-uuid.ts — generateUUID() using crypto.randomUUID(). No barrel index.ts files (import directly from each module).

Output files:
- lib/utils/cn.ts
- lib/utils/format.ts
- lib/utils/generate-uuid.ts

Inputs: oldapp/lib/utils.ts (cn, generateUUID reference)
Outputs: Utilities consumed by all features and components

AI layer handling: COPY_CONTENT

Dependencies: P0-T01
Dependents: P0-T11, P0-T12

Success criteria:
- cn("foo", "bar") merges class names correctly
- generateUUID() returns valid UUID string
- **No barrel index.ts** — each utility imported from its own file
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P0-T10]
Title: Create shared hooks
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: N/A (cross-cutting hooks)
Architecture ref: ../../plan-archives/redesign/directory-structure.md (lib/hooks/)

Action: Create 2 files. (1) lib/hooks/use-mobile.ts — useMobile() hook using window.matchMedia for responsive breakpoint detection. Copy from oldapp/hooks/use-mobile.ts. (2) lib/hooks/use-debounce.ts — useDebounce(value, delay) hook for debouncing input values.

Output files:
- lib/hooks/use-mobile.ts
- lib/hooks/use-debounce.ts

Inputs: oldapp/hooks/use-mobile.ts (reference)
Outputs: Hooks consumed by sidebar, chat input, model selector

AI layer handling: COPY_CONTENT

Dependencies: P0-T01
Dependents: P3-T13, P5-T03

Success criteria:
- useMobile() returns boolean for mobile detection
- useDebounce returns debounced value
- Both hooks use "use client" if needed
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P0-T11]
Title: Copy shadcn/ui components
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A (UI primitives)
Architecture ref: scaffold/directory-structure.md (components/ui/ listing); ai-elements-manifest.md (dependency list)

Action: Copy all ~32 shadcn/ui component files from oldapp/components/ui/ to components/ui/. Files include: alert.tsx, avatar.tsx, badge.tsx, button.tsx, button-group.tsx, card.tsx, carousel.tsx, checkbox.tsx, collapsible.tsx, command.tsx, dialog.tsx, dropdown-menu.tsx, hover-card.tsx, input.tsx, input-group.tsx, label.tsx, popover.tsx, progress.tsx, scroll-area.tsx, select.tsx, separator.tsx, sheet.tsx, sidebar.tsx, skeleton.tsx, slider.tsx, switch.tsx, tabs.tsx, textarea.tsx, toggle.tsx, toggle-group.tsx, tooltip.tsx, visually-hidden.tsx. Adjust imports to direct utility paths (`@/lib/utils/cn`, etc.) as needed. Verify all files use @/ path aliases consistently.

Output files:
- components/ui/*.tsx (~32 files)

Inputs: oldapp/components/ui/ (source files)
Outputs: UI primitives consumed by feature components across the app

AI layer handling: COPY_CONTENT

Dependencies: P0-T01, P0-T09
Dependents: P0-T12, P3-T13

Success criteria:
- All ~32 shadcn/ui files exist in components/ui/
- All imports resolve correctly (no broken @/ paths)
- No TypeScript errors in copied files
- pnpm typecheck passes for these files

Complexity: M

---

### TASK: [ID: P0-T12]
Title: Create shared components
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: features.md (icons used across UI, sidebar toggle, theme provider)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (shared components); ../../plan-archives/redesign/directory-structure.md (components/)

Action: Create 4 shared component files. (1) components/theme-provider.tsx — "use client" wrapper around next-themes ThemeProvider with attribute="class", defaultTheme="system", enableSystem, disableTransitionOnChange. (2) components/icons.tsx — Copy from oldapp/components/icons.tsx, shared icon components. (3) components/sidebar-toggle.tsx — Copy from oldapp/components/sidebar-toggle.tsx, sidebar open/close button. (4) components/toaster.tsx — Toaster component from sonner library. **No app-shell.tsx** (server layout handles composition directly). **No barrel index.ts files.**

Output files:
- components/theme-provider.tsx
- components/icons.tsx
- components/sidebar-toggle.tsx
- components/toaster.tsx

Inputs: oldapp/components/icons.tsx, oldapp/components/sidebar-toggle.tsx, oldapp/components/theme-provider.tsx
Outputs: Shared components consumed by root layout (P0-T13), chat (P3), sidebar (P5)

AI layer handling: COPY_CONTENT + NEW

Dependencies: P0-T01, P0-T09, P0-T11
Dependents: P0-T13, P3-T18, P5-T03

Success criteria:
- theme-provider.tsx has "use client" directive and wraps next-themes
- icons.tsx compiles with no errors
- sidebar-toggle.tsx compiles with no errors
- **No app-shell.tsx created** (removed per redesign)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P0-T13]
Title: Create root layout + global error
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: edge-cases.md (global error boundary)
Architecture ref: ../../plan-archives/redesign/architecture.md (server layout); ../../plan-archives/redesign/component-architecture.md (no app-shell)

Action: Create 2 files. (1) app/layout.tsx — **Server component** (NOT client). Import Geist and Geist Mono fonts, set metadata (title, description), render html with lang="en" suppressHydrationWarning, body with font class variables and "antialiased", import globals.css. Wrap children directly in ThemeProvider (from P0-T12) + Toaster. **No AppShell wrapper** — the server layout is the composition root. SessionProvider and PendingChatsProvider are wired in later phases (P2, P5). (2) app/global-error.tsx — "use client" standalone error boundary with its own html/body tags, "Try Again" button calling reset(), error reporting stub.

Output files:
- app/layout.tsx
- app/global-error.tsx

Inputs: globals.css (P0-T03), components/theme-provider.tsx (P0-T12), components/toaster.tsx (P0-T12)
Outputs: Root layout consumed by all routes; global error boundary

AI layer handling: NEW

Dependencies: P0-T03, P0-T12
Dependents: P2-T08, P0-T18

Success criteria:
- layout.tsx is a **server component** (no "use client")
- Geist fonts loaded and applied via CSS variables
- **No AppShell import** — providers composed directly in layout
- global-error.tsx renders standalone html/body with error message and reset button
- layout.tsx imports globals.css

Complexity: M

---

### TASK: [ID: P0-T14]
Title: Create proxy.ts (Next.js 16)
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: auth-system.md (request interception)
Architecture ref: ../../plan-archives/redesign/architecture.md (proxy.ts replaces middleware.ts)

Action: Create proxy.ts skeleton at project root (**NOT middleware.ts** — Next.js 16 uses proxy.ts). Phase 0 scope: skip static assets and /api/health, set x-device-type header from user-agent. Include commented placeholders for auth guard, guest token rotation, and rate limiting (all wired in P2-T08). Auth guard is NOT implemented in Phase 0 — only device detection. Export config.matcher excluding _next/static, _next/image, favicon.ico, images/. <!-- audit: SC-V5 -->

Output files:
- proxy.ts

Inputs: ../../plan-archives/redesign/architecture.md
Outputs: Proxy auth/session + guard behavior available for P2+ feature wiring

AI layer handling: NEW

Dependencies: P0-T01
Dependents: P2-T08

Success criteria:
- **proxy.ts** exists at project root (NOT middleware.ts)
- Device detection header set on responses
- Auth guard, guest token rotation, and rate limiting present as commented placeholders only (wired in P2-T08) <!-- audit: SC-V5 -->
- Export config.matcher excludes static assets

Complexity: M

---

### TASK: [ID: P0-T15]
Title: Create instrumentation stubs
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A (observability infrastructure)
Architecture ref: scaffold/base-config.md (instrumentation)

Action: Create instrumentation.ts with register() function that conditionally imports OpenTelemetry when NEXT_RUNTIME === "nodejs". Initial body is empty (OTel setup deferred to P7). Create instrumentation-client.ts with empty export (client-side instrumentation deferred). Both files must exist for Next.js instrumentation hook to activate.

Output files:
- instrumentation.ts
- instrumentation-client.ts

Inputs: scaffold/base-config.md
Outputs: Instrumentation hooks available for Next.js runtime

AI layer handling: NEW

Dependencies: P0-T01
Dependents: none (extended in P7)

Success criteria:
- instrumentation.ts exports register function
- instrumentation-client.ts exports empty object
- No runtime errors when Next.js loads these files

Complexity: S

---

### TASK: [ID: P0-T16]
Title: Create test infrastructure
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A (test infrastructure)
Architecture ref: ../../plan-archives/redesign/architecture.md (testing); ../../plan-archives/redesign/directory-structure.md (tests/)

Action: Create 4 files. (1) tests/setup.ts — Vitest global setup file with environment variable mocking (DATABASE_URL, etc. set to test values), import @testing-library/jest-dom for DOM matchers. (2) tests/mocks/auth.ts — Mock session resolution function for auth testing. (3) tests/mocks/db.ts — Mock Drizzle client for data access testing. (4) tests/mocks/cache.ts — Mock cache client for cache layer testing. These files are referenced in vitest.config.ts. <!-- audit: SC-V3 -->

Output files:
- tests/setup.ts
- tests/mocks/auth.ts
- tests/mocks/db.ts
- tests/mocks/cache.ts
<!-- audit: SC-V3 -->

Inputs: ../../plan-archives/redesign/architecture.md
Outputs: Test setup consumed by all unit and integration tests

AI layer handling: NEW

Dependencies: P0-T01
Dependents: P1-T13

Success criteria:
- tests/setup.ts exists and is valid TypeScript
- Environment variables mocked for test context
- Mock auth and db modules export usable stubs
- @testing-library/jest-dom imported

Complexity: M

---

### TASK: [ID: P0-T17]
Title: Create import boundary script
Phase: 0 — Scaffold
Type: IMPL

Behavior ref: N/A (build-time enforcement)
Architecture ref: ../../plan-archives/redesign/architecture.md (import boundaries); ../../plan-archives/redesign/domain-boundaries.md

Action: Create scripts/check-imports.mjs — a Node.js script that enforces import boundary rules at build time. Rules: (1) features/ cannot import from other features/**except explicit allowlisted exceptions** (documented in `architecture/conventions.md`). (2) lib/ cannot import from features/. (3) components/ cannot import from features/. The script scans all .ts/.tsx files and reports violations. Intended to be run as part of CI/CD or `pnpm lint`. Configured in biome.json or as a standalone check.

Output files:
- scripts/check-imports.mjs

Inputs: ../../plan-archives/redesign/domain-boundaries.md (boundary rules)
Outputs: Import boundary enforcement available for all subsequent phases

AI layer handling: NEW

Dependencies: P0-T01
Dependents: P7-T10

Success criteria:
- scripts/check-imports.mjs runs without errors on empty project
- Correctly detects **unauthorized** cross-feature imports as violations (allowlist exceptions permitted)
- Exits with code 0 when no violations found
- Exits with code 1 when violations found
- Can be invoked via `node scripts/check-imports.mjs`

Complexity: S

---

### TASK: [ID: P0-T18]
Title: Verification gate G00
Phase: 0 — Scaffold
Type: VERIFY

Behavior ref: N/A
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G00)

Action: Run the complete validation suite: (1) pnpm install succeeds, (2) pnpm typecheck passes with zero errors, (3) pnpm lint passes, (4) pnpm format passes (or check mode), (5) pnpm dev starts and root layout renders (blank page with theme provider). Verify: all ui files at @/components/ui/, shared types export correctly, @/lib/errors exports AppError with factory methods, **proxy.ts** exists (NOT middleware.ts), **Artifact table** in schema (NOT Document), **artifact_kind** enum (NOT document_kind), **no credit/gateway error codes**, import boundary script runs clean. Fix any issues found.

Output files: none (validation only)

Inputs: all P0-T01 through P0-T17 outputs
Outputs: Gate G00 passed — P1 can begin

AI layer handling: N/A

Dependencies: P0-T01 through P0-T17
Dependents: P1-T01, P1-T02, P1-T11

Success criteria:
- pnpm install exits 0
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- pnpm dev starts without crash
- **proxy.ts** at root (NOT middleware.ts)
- **artifacts** table in schema (NOT documents)
- **No ACTIVATE_GATEWAY or credit codes in lib/errors/**
- `node scripts/check-imports.mjs` exits 0

Complexity: S