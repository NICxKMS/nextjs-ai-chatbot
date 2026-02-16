# Global Issues Log

> **Format**: Follow the structured entry format defined in `AGENTS.md` (Issue Tracking section).
> **Rules**: Append new entries at the bottom. Do not modify or remove existing entries.

---

## [2026-02-13T14:50:00Z] - TypeScript Error in lib/db/client.ts

- **Category**: Bug
- **Agent**: Agent_Features (discovered during Task 3.2b)
- **Task**: Task 3.2b - Create Message Support Components
- **Context**: Running `pnpm typecheck` revealed a pre-existing type error unrelated to the current task
- **Root Cause**: `Sql<never>` type incompatibility in lib/db/client.ts - the `sql` template literal is typed as `Sql<never>` which is incompatible with expected types
- **Action Taken**: Issue logged for later resolution; current task proceeded as the error is pre-existing
- **Status**: Open
- **Related Files**: `lib/db/client.ts`

---

## [2026-02-14T15:24:00Z] - TypeScript Errors in components/ai-elements/ Blocking Build

- **Category**: Bug
- **Agent**: Agent_Integration
- **Task**: Task 6.6 - Final Verification & Deployment Prep
- **Context**: Running `pnpm typecheck` and `pnpm build` revealed 27 TypeScript errors in the ai-elements components directory that prevent production build
- **Root Cause**: Multiple issues:
  1. `exactOptionalPropertyTypes: true` incompatibility in useControllableState calls
  2. Missing npm packages: `dompurify`, `shiki`, `motion/react`
  3. Invalid button size variant ("icon-sm" not in allowed values)
  4. Property type mismatches with strict TypeScript config
- **Action Taken**: Documented in DEPLOYMENT.md as critical pre-deployment fix; created lib/db/migrate.ts (was missing)
- **Status**: Open
- **Related Files**: 
  - `components/ai-elements/chain-of-thought.tsx`
  - `components/ai-elements/code-block.tsx`
  - `components/ai-elements/context.tsx`
  - `components/ai-elements/edge.tsx`
  - `components/ai-elements/message.tsx`
  - `components/ai-elements/prompt-input.tsx`
  - `components/ai-elements/reasoning.tsx`
  - `components/ai-elements/shimmer.tsx`
  - `components/ai/tools/confirmation.tsx`

---

## [2026-02-14T15:24:00Z] - Missing Database Migration Script

- **Category**: Bug
- **Agent**: Agent_Integration
- **Task**: Task 6.6 - Final Verification & Deployment Prep
- **Context**: Running `pnpm build` failed because `lib/db/migrate.ts` was missing (referenced in package.json scripts)
- **Root Cause**: Migration script was not migrated from archive/oldapp during v6 migration
- **Action Taken**: Created `lib/db/migrate.ts` based on `archive/oldapp/lib/db/migrate.ts` with updated paths
- **Status**: Resolved
- **Related Files**: `lib/db/migrate.ts`, `package.json`

---

## [2026-02-14T17:45:00Z] - Next.js 16 Build Failure - workUnitAsyncStorage Bug

- **Category**: Bug
- **Agent**: Agent_Integration
- **Task**: Task 6.6c - Final Verification (Re-run)
- **Context**: Production build (`next build`) fails during static page generation with `InvariantError: Expected workUnitAsyncStorage to have a store`
- **Root Cause**: Next.js 16 internal bug - the async storage context is not properly initialized during prerendering for pages that use cookies/session
- **Action Taken**: 
  - All code quality checks pass (typecheck, format, lint, test:unit)
  - Attempted various workarounds (dynamic exports, revalidate, generateStaticParams, cacheComponents toggle)
  - Created `app/global-error.tsx` (was missing)
  - None of the workarounds resolve the framework-level bug
- **Status**: Open
- **Related Files**: 
  - `app/global-error.tsx`
  - `app/layout.tsx`
  - `app/(chat)/page.tsx`
  - `app/(chat)/chat/[id]/page.tsx`
  - `next.config.ts`

---

## [2026-02-14T17:45:00Z] - cacheComponents Incompatible with Dynamic Pages

- **Category**: Architecture
- **Agent**: Agent_Integration
- **Task**: Task 6.6c - Final Verification (Re-run)
- **Context**: Next.js 16 `cacheComponents: true` is incompatible with route segment config options
- **Root Cause**: Next.js 16 design constraint - `cacheComponents` feature requires static rendering, but pages using cookies/session need dynamic rendering
- **Action Taken**: Disabled `cacheComponents` in `next.config.ts` to allow dynamic rendering
- **Status**: Resolved (with performance trade-off)
- **Related Files**: `next.config.ts`
