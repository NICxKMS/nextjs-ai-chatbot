# Phase P00 — Scaffold

> Foundation phase. Creates the project skeleton: config, directory structure, shared types,
> ai-elements copy, root layout, and all infrastructure needed before feature work begins.
>
> **Entry state**: Empty project directory (oldapp/ preserved as read-only reference).
> **Exit state**: Project builds, typechecks, lints. All shared infrastructure importable.
> **Est. duration**: ~1 day
> **Tasks**: 17
> **Files created**: ~80+

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P00-T01 | Initialize project config | SCAFFOLD | M | 4 |
| P00-T02 | Create tooling config | SCAFFOLD | S | 3 |
| P00-T03 | Set up Tailwind v4 CSS | SCAFFOLD | M | 1 |
| P00-T04 | Create root app shell | SCAFFOLD | M | 3 |
| P00-T05 | Create provider components | IMPLEMENTATION | M | 2 |
| P00-T06 | Create directory skeleton | SCAFFOLD | S | 0 (dirs only) |
| P00-T07 | Define Drizzle schema | IMPLEMENTATION | L | 1 |
| P00-T08 | Define shared types | IMPLEMENTATION | L | 4 |
| P00-T09 | Create error handling | IMPLEMENTATION | M | 3 |
| P00-T10 | Create utility functions | IMPLEMENTATION | M | 3 |
| P00-T11 | Copy shadcn/ui components | SCAFFOLD | M | ~32 |
| P00-T12 | Copy ai-elements | AI_COPY | M | 31 |
| P00-T13 | Copy shared components | SCAFFOLD | S | 2 |
| P00-T14 | Create middleware base | SCAFFOLD | S | 1 |
| P00-T15 | Create instrumentation stubs | SCAFFOLD | S | 2 |
| P00-T16 | Create test setup | SCAFFOLD | S | 1 |
| P00-T17 | Verification gate G00 | VERIFICATION | S | 0 |

---

## Tasks

---

### TASK: [ID: P00-T01]
Title: Initialize project configuration files
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A — infrastructure
Architecture ref: scaffold/base-config.md sections 1-4; AGENTS.md (TypeScript strict, Biome)

Action: Create the 4 core project configuration files. package.json with all production and dev dependencies (pinned versions from base-config.md), scripts (dev, build, start, lint, format, typecheck, test:unit, test:e2e, db:generate, db:migrate, db:studio, db:push), name "ai-assistant", version "4.0.0", packageManager "pnpm@10.26.0". tsconfig.json with strict mode, @/* path alias, noUncheckedIndexedAccess, exclude oldapp/plan. next.config.ts with reactCompiler true, ppr incremental, images remotePatterns. biome.json with tabs, lineWidth 100, noExplicitAny error, organize imports, ai-elements ignored, Next.js file overrides for default exports.

Output files:
- package.json
- tsconfig.json
- next.config.ts
- biome.json

Inputs: scaffold/base-config.md (complete specs for all 4 files)
Outputs: Project config consumable by all subsequent tasks; pnpm install can run

AI layer handling: N/A

Dependencies: none
Dependents: P00-T02, P00-T03, P00-T04, P00-T05, P00-T06, P00-T07, P00-T08, P00-T09, P00-T10, P00-T11, P00-T12, P00-T13, P00-T14, P00-T15, P00-T16

Success criteria:
- pnpm install completes without errors
- tsconfig has strict: true, paths: {"@/*": ["./*"]}, excludes oldapp and plan
- biome.json has noExplicitAny: "error" and ignores components/ai-elements
- next.config.ts has reactCompiler: true and ppr: "incremental"

Complexity: M

---

### TASK: [ID: P00-T02]
Title: Create tooling configuration files
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A — infrastructure
Architecture ref: scaffold/base-config.md (postcss, vercel.json, env)

Action: Create postcss.config.mjs with @tailwindcss/postcss plugin (Tailwind v4 — no tailwind.config.ts needed). Create vercel.json with minimal {"framework": "nextjs"}. Create .env.example with all environment variable placeholders documented: DATABASE_URL, CACHE_KV_REST_API_URL/TOKEN, SUPABASE_URL/ANON_KEY/JWT_SECRET, GUEST_JWT_SECRET, all 6 AI provider keys (OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID), BLOB_READ_WRITE_TOKEN. Each variable has a comment indicating required vs optional.

Output files:
- postcss.config.mjs
- vercel.json
- .env.example

Inputs: scaffold/base-config.md
Outputs: PostCSS config consumed by Tailwind v4; env template for all phases

AI layer handling: N/A

Dependencies: P00-T01
Dependents: P00-T03

Success criteria:
- postcss.config.mjs exports config with @tailwindcss/postcss plugin
- vercel.json is valid JSON
- .env.example lists all 15+ environment variables with comments

Complexity: S

---

### TASK: [ID: P00-T03]
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

Dependencies: P00-T01, P00-T02
Dependents: P00-T04

Success criteria:
- File starts with @import "tailwindcss"
- All :root and .dark CSS custom properties match oldapp values
- @custom-variant dark defined
- File under 200 lines

Complexity: M

---

### TASK: [ID: P00-T04]
Title: Create root app shell files
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: edge-cases.md (global error boundary)
Architecture ref: scaffold/directory-structure.md (app/ root); conventions.md (server components default)

Action: Create app/layout.tsx as root layout: import Geist and Geist Mono fonts from "geist/font/sans" and "geist/font/mono", set metadata (title, description), render html with lang="en" suppressHydrationWarning, body with font class variables and "antialiased", import globals.css, wrap children in AppShell component. Create app/global-error.tsx as "use client" standalone error boundary with its own html/body tags, "Try Again" button calling reset(), and error reporting stub. Create app/head.tsx with viewport and theme-color metadata configuration.

Output files:
- app/layout.tsx
- app/global-error.tsx
- app/head.tsx

Inputs: globals.css (P00-T03), components/app-shell.tsx (P00-T05 — imported but can use stub initially)
Outputs: Root layout consumed by all routes; global error boundary

AI layer handling: NEW

Dependencies: P00-T01, P00-T03
Dependents: P00-T05, P00-T17

Success criteria:
- layout.tsx is a default export async function with RootLayout signature
- Geist fonts loaded and applied via CSS variables
- global-error.tsx renders standalone html/body with error message and reset button
- layout.tsx imports globals.css

Complexity: M

---

### TASK: [ID: P00-T05]
Title: Create provider shell components
Phase: 0 — Scaffold
Type: IMPLEMENTATION

Behavior ref: state-management.md (ThemeProvider, provider tree)
Architecture ref: conventions.md (server components default); architecture/patterns.md (provider tree); SEAM-029 (provider tree assembly — root level only)

Action: Create components/theme-provider.tsx as a "use client" wrapper around next-themes ThemeProvider with attribute="class", defaultTheme="system", enableSystem, disableTransitionOnChange props. Create components/app-shell.tsx as an async server component that will eventually fetch session and compose the root provider tree. Initial implementation: ThemeProvider wrapping TooltipProvider (from @/components/ui/tooltip) wrapping children, plus Toaster from sonner. Include a Suspense boundary. Add commented placeholders for SWRConfig and AuthProvider (wired in P02).

Output files:
- components/app-shell.tsx
- components/theme-provider.tsx

Inputs: components/ui/tooltip.tsx (P00-T11), sonner package
Outputs: AppShell consumed by app/layout.tsx; ThemeProvider available for theme toggle

AI layer handling: NEW

Dependencies: P00-T01, P00-T04, P00-T10, P00-T11
Dependents: P02-T11, P00-T17

Success criteria:
- theme-provider.tsx has "use client" directive and wraps next-themes
- app-shell.tsx exports AppShell (async server component)
- Provider tree order: ThemeProvider > TooltipProvider > Toaster > children
- No TypeScript errors

Complexity: M

---

### TASK: [ID: P00-T06]
Title: Create directory skeleton
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A
Architecture ref: scaffold/directory-structure.md (complete tree); conventions.md (feature collocation); ADR-001

Action: Create all empty directories for the feature-collocated structure. Features: features/chat/{actions,components,hooks,schemas,lib/tools}, features/artifacts/{actions,components/editors,handlers,hooks,schemas,types}, features/auth/{actions,components,schemas,lib}, features/sidebar/{components,hooks}, features/settings/{components,hooks,lib}, features/voting/{actions,schemas}, features/models/{components,lib}. Tests: tests/{mocks,fixtures,integration,e2e}. Lib stubs: lib/data/, lib/cache/, lib/ai/, lib/auth/, lib/api/, lib/rate-limit/, lib/hooks/. Add .gitkeep to each empty directory.

Output files:
- features/chat/ (full subtree)
- features/artifacts/ (full subtree)
- features/auth/ (full subtree)
- features/sidebar/ (full subtree)
- features/settings/ (full subtree)
- features/voting/ (full subtree)
- features/models/ (full subtree)
- tests/ (full subtree)
- lib/data/, lib/cache/, lib/ai/, lib/auth/, lib/api/, lib/rate-limit/, lib/hooks/

Inputs: scaffold/directory-structure.md
Outputs: Directory structure for all subsequent phases

AI layer handling: N/A

Dependencies: P00-T01
Dependents: P01-T01 through P01-T16, P02-T01 through P02-T12

Success criteria:
- All directories from directory-structure.md exist
- Each empty dir has .gitkeep file
- No files other than .gitkeep in feature directories

Complexity: S

---

### TASK: [ID: P00-T07]
Title: Define Drizzle ORM schema
Phase: 0 — Scaffold
Type: IMPLEMENTATION

Behavior ref: data-flows.md (database schema — 6 tables with columns, indexes, enums)
Architecture ref: scaffold/shared-types.md (schema column reference); DEV-005 (function-based data access uses this schema)

Action: Create lib/db/schema.ts defining all 6 Drizzle tables using drizzle-orm/pg-core. Tables: users (uuid PK, email unique, passwordHash, createdAt, lastLogin), chats (uuid PK, userId FK, title, visibility enum, createdAt, updatedAt, lastContext jsonb), messages aliased as Message_v2 (uuid PK, chatId FK, role enum, parts jsonb, attachments jsonb, createdAt), votes aliased as Vote_v2 (composite PK: chatId+messageId+userId, isUpvoted boolean), documents (composite PK: id+createdAt, title, content text, kind enum, userId FK, chatId FK, updatedAt), suggestions (uuid PK, documentId, documentCreatedAt, originalText, suggestedText, description, isResolved boolean, userId FK). Define pgEnum for visibility (public/private), role (user/assistant/system), document_kind (text/code/image/sheet). Add all indexes from data-flows.md.

Output files:
- lib/db/schema.ts

Inputs: data-flows.md (schema spec), oldapp/lib/db/schema.ts (reference implementation)
Outputs: Schema tables exported for Drizzle queries and type inference (P00-T08)

AI layer handling: NEW

Dependencies: P00-T01
Dependents: P00-T08, P01-T01, P01-T02

Success criteria:
- All 6 tables defined with correct column types
- 3 enums defined (visibility, role, document_kind)
- Composite PKs on votes (chatId+messageId+userId) and documents (id+createdAt)
- All indexes from data-flows.md present
- pnpm typecheck passes for this file

Complexity: L

---

### TASK: [ID: P00-T08]
Title: Define shared type modules
Phase: 0 — Scaffold
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (model types, data stream types); data-flows.md (entity types)
Architecture ref: scaffold/shared-types.md (complete type specs); DEV-011 (string literal error codes)

Action: Create 4 type files. (1) lib/types/models.types.ts — InferSelectModel/InferInsertModel types for all 6 tables (User, Chat, Message, Document, Vote, Suggestion + New* insert variants), Visibility/MessageRole/DocumentKind literal unions, ChatWithMessages and DocumentWithVersions composite types. (2) lib/types/ai.types.ts — ProviderId (6 providers), ModelCapability (10 values), ModelModality (4 values), ReasoningType (5 values), ModelMetadata, AppUsage, CustomUIDataTypes (14 stream part types), SuggestionData, DEFAULT_CHAT_MODEL/DEFAULT_TITLE_MODEL/DEFAULT_ARTIFACT_MODEL constants. (3) lib/types/api.types.ts — ChatRequestBody, ChatSettings, PaginatedResult<T>, PaginationParams, HistoryResponse, VoteRequest, DocumentRequest, HealthStatus, HealthResponse, ErrorResponse. (4) lib/types/index.ts — Re-exports from all three type files plus AppSession and DataContext types, optionally UserEntitlements.

Output files:
- lib/types/models.types.ts
- lib/types/ai.types.ts
- lib/types/api.types.ts
- lib/types/index.ts

Inputs: lib/db/schema.ts (P00-T07) for InferSelectModel; scaffold/shared-types.md
Outputs: All shared types consumed by every subsequent phase

AI layer handling: NEW

Dependencies: P00-T07
Dependents: P00-T09, P01-T05, P01-T06 through P01-T10, P02-T01, P03-T05

Success criteria:
- models.types.ts InferSelectModel compiles against schema
- ai.types.ts exports ModelMetadata with all required fields
- api.types.ts exports ChatRequestBody matching api-contracts.md POST /api/chat schema
- index.ts re-exports AppSession and DataContext
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P00-T09]
Title: Create error handling infrastructure
Phase: 0 — Scaffold
Type: IMPLEMENTATION

Behavior ref: edge-cases.md (ChatSDKError system, error codes)
Architecture ref: scaffold/shared-types.md (ErrorCode); architecture/patterns.md (AppError); DEV-008 (no Result<T,E>), DEV-011 (string literals not enum)

Action: Create 3 files. (1) lib/errors/codes.ts — ErrorCode string literal union (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION, RATE_LIMITED, AI_ERROR, DATABASE_ERROR, CACHE_ERROR, CONFLICT, BAD_REQUEST) and ERROR_STATUS_MAP Record<ErrorCode, number> mapping each to HTTP status. (2) lib/errors/app-error.ts — AppError class extending Error with code (ErrorCode), statusCode (number), details (optional Record). Static factory methods: unauthorized(), forbidden(), notFound(resource), validation(msg, details?), rateLimited(), aiError(msg), databaseError(msg), cacheError(msg), badRequest(msg). Instance method toResponse() returning Response.json({error: {code, message, details}}, {status}). (3) lib/errors/index.ts — Re-exports AppError, ErrorCode, ERROR_STATUS_MAP.

Output files:
- lib/errors/codes.ts
- lib/errors/app-error.ts
- lib/errors/index.ts

Inputs: scaffold/shared-types.md; architecture/patterns.md
Outputs: AppError class consumed by all actions, routes, and data functions

AI layer handling: NEW

Dependencies: P00-T01
Dependents: P00-T08, P01-T07, P01-T12, P02-T03

Success criteria:
- ErrorCode is a string literal union, not an enum
- AppError.unauthorized() creates instance with code "UNAUTHORIZED" and status 401
- AppError.toResponse() returns a valid Response object
- All 10 error codes mapped to correct HTTP status
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P00-T10]
Title: Create utility functions
Phase: 0 — Scaffold
Type: IMPLEMENTATION

Behavior ref: N/A (cross-cutting utilities)
Architecture ref: conventions.md (lib/utils for 3+ users); ai-elements-manifest.md (lazy.tsx, prompt-input.tsx depend on @/lib/utils)

Action: Create 3 files. (1) lib/utils/index.ts — cn() using clsx + tailwind-merge, generateUUID() using crypto.randomUUID(), formatDate(date, format?) using date-fns. Copy the exact cn implementation from oldapp/lib/utils.ts. (2) lib/utils/lazy.ts — createLazyComponentWithPreload<T>(factory) utility that returns {Component, preload}. Required by components/ai-elements/lazy.tsx. Copy implementation from oldapp or create matching signature. (3) lib/utils/logger.ts — Structured logger with info/warn/error/debug methods. Required by components/ai-elements/prompt-input.tsx. Minimal implementation using console with structured JSON output in production.

Output files:
- lib/utils/index.ts
- lib/utils/lazy.ts
- lib/utils/logger.ts

Inputs: oldapp/lib/utils.ts (cn, generateUUID), oldapp/lib/utils (lazy reference if exists)
Outputs: Utilities consumed by ai-elements, all features, and all components

AI layer handling: COPY_CONTENT

Dependencies: P00-T01
Dependents: P00-T05, P00-T11, P00-T12, P00-T13

Success criteria:
- cn("foo", "bar") merges class names correctly
- generateUUID() returns valid UUID string
- createLazyComponentWithPreload returns object with Component and preload
- Logger exports info/warn/error/debug functions
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P00-T11]
Title: Copy shadcn/ui components
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A (UI primitives)
Architecture ref: scaffold/directory-structure.md (components/ui/ listing); ai-elements-manifest.md (dependency list)

Action: Copy all ~32 shadcn/ui component files from oldapp/components/ui/ to components/ui/. Files include: alert.tsx, avatar.tsx, badge.tsx, button.tsx, button-group.tsx, card.tsx, carousel.tsx, checkbox.tsx, collapsible.tsx, command.tsx, dialog.tsx, dropdown-menu.tsx, hover-card.tsx, input.tsx, input-group.tsx, label.tsx, popover.tsx, progress.tsx, scroll-area.tsx, select.tsx, separator.tsx, sheet.tsx, sidebar.tsx, skeleton.tsx, slider.tsx, switch.tsx, tabs.tsx, textarea.tsx, toggle.tsx, toggle-group.tsx, tooltip.tsx, visually-hidden.tsx. Adjust import paths: change any @/lib/utils to @/lib/utils/index if needed. Verify all files use @/ path aliases consistently.

Output files:
- components/ui/*.tsx (~32 files)

Inputs: oldapp/components/ui/ (source files)
Outputs: UI primitives consumed by ai-elements and all feature components

AI layer handling: COPY_CONTENT

Dependencies: P00-T01, P00-T10
Dependents: P00-T05, P00-T12, P00-T13

Success criteria:
- All ~32 shadcn/ui files exist in components/ui/
- All imports resolve correctly (no broken @/ paths)
- No TypeScript errors in copied files
- pnpm typecheck passes for these files

Complexity: M

---

### TASK: [ID: P00-T12]
Title: Copy ai-elements primitives
Phase: 0 — Scaffold
Type: AI_COPY

Behavior ref: ai-elements-manifest.md (31 files, 4881 LOC, ~440 exports)
Architecture ref: ADR-005 (global primitives, colocated wrappers); DEV-014 (copy all, do not build aspirational wrappers)

Action: Copy all 31 files verbatim from oldapp/components/elements/ to components/ai-elements/. Files: artifact.tsx, canvas.tsx, chain-of-thought.tsx, checkpoint.tsx, code-block.tsx, confirmation.tsx, connection.tsx, context.tsx, controls.tsx, conversation.tsx, edge.tsx, image.tsx, inline-citation.tsx, lazy.tsx, loader.tsx, message.tsx, model-selector.tsx, node.tsx, open-in-chat.tsx, panel.tsx, plan.tsx, prompt-input.tsx, queue.tsx, reasoning.tsx, shimmer.tsx, sources.tsx, suggestion.tsx, task.tsx, tool.tsx, toolbar.tsx, web-preview.tsx. Adjust import paths: @/lib/utils to @/lib/utils/index, @/components/ui/ stays the same. Verify no logic modifications. Generate SHA-256 checksums for all 31 files and store in components/ai-elements/CHECKSUMS.md.

Output files:
- components/ai-elements/*.tsx (31 files)
- components/ai-elements/CHECKSUMS.md

Inputs: oldapp/components/elements/ (31 source files); lib/utils/ (P00-T10); components/ui/ (P00-T11)
Outputs: AI element primitives consumed by chat, artifact, model features (P03+)

AI layer handling: AI_COPY

Dependencies: P00-T01, P00-T10, P00-T11
Dependents: P03-T13, P03-T14, P03-T15, P03-T16, P03-T17

Success criteria:
- All 31 files exist in components/ai-elements/
- Import @/components/ai-elements/message resolves without errors
- No logic modifications (only import path adjustments)
- CHECKSUMS.md lists SHA-256 for each file
- pnpm typecheck passes (ai-elements excluded from lint but included in typecheck)

Complexity: M

---

### TASK: [ID: P00-T13]
Title: Copy shared components
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: features.md (icons used across UI, sidebar toggle used by chat + artifacts)
Architecture ref: scaffold/directory-structure.md (components/ root); conventions.md (shared components for 3+ consumers)

Action: Copy components/icons.tsx from oldapp/components/icons.tsx — shared icon components used across multiple features. Copy components/sidebar-toggle.tsx from oldapp/components/sidebar-toggle.tsx — sidebar open/close button used by chat header and artifact panel. Adjust any import paths to use @/ alias. Verify these are truly shared (used by 2+ features).

Output files:
- components/icons.tsx
- components/sidebar-toggle.tsx

Inputs: oldapp/components/icons.tsx, oldapp/components/sidebar-toggle.tsx
Outputs: Shared icons and sidebar toggle consumed by chat header (P03) and sidebar (P05)

AI layer handling: COPY_CONTENT

Dependencies: P00-T01, P00-T10, P00-T11
Dependents: P03-T18, P05 (sidebar)

Success criteria:
- Both files exist and compile
- Import paths use @/ alias
- No feature-specific logic in these files

Complexity: S

---

### TASK: [ID: P00-T14]
Title: Create middleware base
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: auth-system.md (middleware architecture — edge rate limiting, path guards)
Architecture ref: scaffold/base-config.md (middleware structure)

Action: Create middleware.ts at project root. Initial implementation: skip static assets and /api/health, set x-device-type header based on user-agent regex (mobile detection). Include commented placeholders for edge rate limiting (P01) and guest token rotation (P02). Export config.matcher excluding _next/static, _next/image, favicon.ico, images/. This is a minimal shell that grows in P01 and P02.

Output files:
- middleware.ts

Inputs: scaffold/base-config.md
Outputs: Middleware shell extended in P01-T13 (rate limiting) and P02-T10 (guest rotation)

AI layer handling: NEW

Dependencies: P00-T01
Dependents: P01-T13, P02-T10

Success criteria:
- middleware.ts exports async middleware function and config
- Device detection header set on responses
- Rate limiting and auth sections are commented placeholders
- File under 50 lines

Complexity: S

---

### TASK: [ID: P00-T15]
Title: Create instrumentation stubs
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A (observability infrastructure)
Architecture ref: scaffold/base-config.md (instrumentation)

Action: Create instrumentation.ts with register() function that conditionally imports OpenTelemetry when NEXT_RUNTIME === "nodejs". Initial body is empty (OTel setup deferred to P07). Create instrumentation-client.ts with empty export (client-side instrumentation deferred). Both files must exist for Next.js instrumentation hook to activate.

Output files:
- instrumentation.ts
- instrumentation-client.ts

Inputs: scaffold/base-config.md
Outputs: Instrumentation hooks available for Next.js runtime

AI layer handling: NEW

Dependencies: P00-T01
Dependents: none (extended in P07)

Success criteria:
- instrumentation.ts exports register function
- instrumentation-client.ts exports empty object
- No runtime errors when Next.js loads these files

Complexity: S

---

### TASK: [ID: P00-T16]
Title: Create test setup stub
Phase: 0 — Scaffold
Type: SCAFFOLD

Behavior ref: N/A (test infrastructure)
Architecture ref: conventions.md (testing conventions); scaffold/directory-structure.md (tests/)

Action: Create tests/setup.ts as the Vitest global setup file. Include basic environment variable mocking (DATABASE_URL, CACHE_KV_REST_API_URL, etc. set to test values). Import @testing-library/jest-dom for DOM matchers. This file is referenced in vitest.config.ts (if needed) or package.json vitest config.

Output files:
- tests/setup.ts

Inputs: conventions.md
Outputs: Test setup consumed by all unit and integration tests

AI layer handling: NEW

Dependencies: P00-T01
Dependents: P01-T15

Success criteria:
- tests/setup.ts exists and is valid TypeScript
- Environment variables mocked for test context
- @testing-library/jest-dom imported

Complexity: S

---

### TASK: [ID: P00-T17]
Title: Verification gate G00
Phase: 0 — Scaffold
Type: VERIFICATION

Behavior ref: N/A
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G00)

Action: Run the complete validation suite: (1) pnpm install succeeds, (2) pnpm typecheck passes with zero errors, (3) pnpm lint passes, (4) pnpm format passes (or check mode), (5) pnpm dev starts and root layout renders (blank page with theme provider). Verify: all ai-elements files at @/components/ai-elements/, all ui files at @/components/ui/, @/lib/types exports AppSession/DataContext/ModelMetadata, @/lib/errors exports AppError with factory methods, import @/components/ai-elements/message resolves. Fix any issues found.

Output files: none (validation only)

Inputs: all P00-T01 through P00-T16 outputs
Outputs: Gate G00 passed — P01 can begin

AI layer handling: N/A

Dependencies: P00-T01, P00-T02, P00-T03, P00-T04, P00-T05, P00-T06, P00-T07, P00-T08, P00-T09, P00-T10, P00-T11, P00-T12, P00-T13, P00-T14, P00-T15, P00-T16
Dependents: P01-T01 (start of next phase)

Success criteria:
- pnpm install exits 0
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- pnpm dev starts without crash
- Directory structure matches scaffold/directory-structure.md

Complexity: S