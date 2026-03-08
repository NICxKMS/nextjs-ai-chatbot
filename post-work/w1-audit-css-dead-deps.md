# Wave 1 Audit — CSS Waste + Dead Code + Dependencies + Env Vars

**Date:** 2026-03-07  
**Scope:** Non-oldapp codebase (`app/`, `features/`, `lib/`, `components/`, root configs)  
**Status:** RESEARCH ONLY — no code changes

---

## Table of Contents

1. [CSS / Styling](#1-css--styling)
2. [Dead Code](#2-dead-code)
3. [Dependencies](#3-dependencies)
4. [Environment Variables](#4-environment-variables)
5. [Summary Matrix](#5-summary-matrix)

---

## 1. CSS / Styling

### 1.1 Inline Styles

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| S-01 | LOW | `app/global-error.tsx:5-73` | 8 `CSSProperties` constant objects used as inline styles (PAGE_STYLE, LABEL_STYLE, TITLE_STYLE, BODY_STYLE, DIGEST_STYLE, ACTION_ROW_STYLE, LINK_STYLE, BUTTON_STYLE) | **KEEP AS-IS.** This is intentional — global-error.tsx replaces the root layout when it crashes, meaning Tailwind CSS is unavailable. Inline styles are the correct pattern here. Well-documented in the file comment. |
| S-02 | LOW | `app/(chat)/chat/[id]/loading.tsx:46` | `style={{ width: w, animationDelay: ... }}` — dynamic inline styles for skeleton widths | **KEEP AS-IS.** Dynamic widths/delays cannot be expressed as static Tailwind classes (values come from runtime data). Correct pattern. |
| S-03 | LOW | `components/ui/progress.tsx:25` | `style={{ transform: \`translateX(-${100 - (value \|\| 0)}%)\` }}` | **KEEP AS-IS.** Dynamic transform percentage — must be inline. |
| S-04 | N/A | `components/ai-elements/*.tsx` | Multiple inline styles in ai-elements (shimmer, context, stack-trace, schema-display, edge) | **READ-ONLY per AGENTS.md.** ai-elements are generated and must not be modified. |

**Verdict:** All inline styles are justified. No Tailwind conversion needed.

### 1.2 `!important` Usage

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| S-05 | LOW | `app/globals.css:200-201` | `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;` inside `@media (prefers-reduced-motion: reduce)` | **KEEP AS-IS.** `!important` is the standard pattern for prefers-reduced-motion — must override all component-level animations. This is correct and intentional (documented in P7-T03). |

**Verdict:** Only 2 uses of `!important`, both justified by a11y requirements.

### 1.3 Duplicate Class Combinations

No duplicate class combination patterns found outside of oldapp/.

### 1.4 globals.css — Unused Custom Properties

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| S-06 | LOW | `app/globals.css:29-33,71-75` | `--chart-1` through `--chart-5` (10 declarations total: 5 light + 5 dark) are defined but **zero components reference them**. No `chart-*` class usage found in `app/`, `features/`, `components/`, or `lib/`. | Remove chart custom properties from both `:root` and `.dark` blocks, plus their `@theme` mappings (lines 114-118 and 239-243). ~20 lines savings. |
| S-07 | LOW | `app/globals.css:86-128` | **Duplicate `@theme` block.** Lines 86-128 (`@theme { ... }`) and lines 204-252 (`@theme inline { ... }`) define the same color/radius mappings. The first `@theme` block defines `--radius-sm`, `--radius-md`, `--radius-lg` and all `--color-*` variables. The second `@theme inline` block redefines ALL of these plus adds `--radius-xl` through `--radius-4xl`. | Merge into single `@theme inline` block. The inline variant is the one shadcn needs. Remove the first `@theme` block entirely — all its declarations are duplicated in the second. ~40 lines savings. |
| S-08 | LOW | `app/globals.css:131-140` | **Duplicate border-color rule.** Two `@layer base` blocks — first sets `border-color: var(--color-gray-200, currentcolor)` on `*`, second applies `@apply border-border` on `*`. The second rule overrides the first, making the first effectively dead code. | Remove the Tailwind v4 compat `@layer base` block (lines 131-140). The `@apply border-border` block already handles border color. |

### 1.5 Responsive Design

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| S-09 | LOW | Various | Responsive design is **well-implemented.** `md:` breakpoints used consistently across chat-shell, messages, greeting, chat-header, loading skeletons, visibility-selector. `sm:` breakpoints on auth forms and suggested-actions. `useIsMobile()` hook provides JS-level breakpoint detection. | No action needed. |
| S-10 | MEDIUM | `features/visibility/components/visibility-selector.tsx:98` | VisibilitySelector is `hidden md:flex` — completely invisible on mobile. Mobile users cannot change chat visibility. | Consider adding mobile access via a menu/dialog pattern. Not critical since default is "private." |

---

## 2. Dead Code

### 2.1 @unused Functions (6 total — verified)

| # | SEV | FILE:line | FUNCTION | ZERO IMPORTERS? | RECOMMENDATION |
|---|-----|-----------|----------|-----------------|----------------|
| D-01 | MEDIUM | `lib/data/user.ts:15` | `getUserByEmail()` | ✅ Zero importers outside oldapp/ | **Delete.** Auth uses Supabase SDK for email lookup. No planned consumer. |
| D-02 | LOW | `lib/data/user.ts:60` | `updateUserLastLogin()` | ✅ Zero importers | **Retain or implement.** `lastLogin` column exists in schema. Either wire into login action or delete both function + column. |
| D-03 | LOW | `lib/data/chat.ts:92` | `getChatWithMessages()` | ✅ Zero importers | **Delete.** Chat page fetches chat and messages separately with individual cache tags. This convenience function adds no value. |
| D-04 | LOW | `lib/data/message.ts:117` | `deleteMessagesByChatId()` | ✅ Zero importers | **Retain.** FK cascade handles this during chat deletion, but explicit cleanup is useful for selective message removal. |
| D-05 | LOW | `lib/data/vote.ts:58` | `deleteVotesByChatId()` | ✅ Zero importers | **Retain.** Same rationale as D-04 — FK cascade handles it, but explicit cleanup is useful. |
| D-06 | LOW | `lib/data/suggestion.ts:50` | `deleteSuggestionsByArtifactVersion()` | ✅ Zero importers | **Retain.** Provides targeted suggestion cleanup without removing parent artifact. |

**Summary:** 6 @unused functions confirmed. 2 candidates for deletion (D-01, D-03). 4 have valid retention rationale.

### 2.2 Additional Exported Functions with Zero Importers

| # | SEV | FILE:line | FUNCTION | FINDING | RECOMMENDATION |
|---|-----|-----------|----------|---------|----------------|
| D-07 | LOW | `lib/data/message.ts:39` | `getMessagesByChatId()` | NOT marked @unused but has **zero importers** outside its own file. `getMessagesForChatRender()` (reduced column set) is used instead everywhere. | Mark `@unused` or delete. It fetches all columns including heavy `attachments` JSONB — `getMessagesForChatRender` is the intended replacement. |

### 2.3 weather.tsx — Full Import Trace

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| D-08 | MEDIUM | `components/weather.tsx` | **Zero importers in current codebase.** No `from ['"]@/components/weather` found. Only imports of "weather" are: (1) `features/chat/lib/chat-route.ts` → `@/features/chat/lib/tools/weather` (the tool, not the component), (2) oldapp imports. The component has a clear retention note: "P6-T12 — weather tool result renderer, NOT yet wired." | **Retain but flag.** Component is dormant — 250+ lines of client code (SVG icons, forecast rendering, date-fns dependency). Should be connected when tool rendering pipeline lands, or deleted if P6-T12 is deprioritized. |

### 2.4 Commented-Out Code Blocks

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| D-09 | LOW | — | **Zero commented-out code blocks found** in `app/`, `features/`, `lib/` (non-oldapp). Clean codebase. | No action. |

### 2.5 Unreachable Branches / Unused Imports

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| D-10 | LOW | — | Biome config enforces `noUnusedVariables: error` and `noUnusedLabels: error`. No lint violations present (would fail CI). | No action. Biome catches these automatically. |

### 2.6 e2e Fixture Files

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| D-11 | LOW | `oldapp/tests/fixtures.ts` | All test infrastructure is in `oldapp/tests/` — e2e tests, fixtures, helpers, page objects, prompts. **The new codebase has no e2e tests yet** (playwright.config.ts exists at root but no test files). | Not dead code per se — it's oldapp reference material. New e2e tests should be written in a top-level `tests/` or `e2e/` directory when ready. `oldapp/tests/` is reference only. |

---

## 3. Dependencies

### 3.1 `latest` Version Pins — Reproducibility Risk

| # | SEV | FILE:line | PACKAGE | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| P-01 | HIGH | `package.json` | `@ai-sdk/google: "latest"` | Pin to `^x.y.z` |
| P-02 | HIGH | `package.json` | `@ai-sdk/openai: "latest"` | Pin to `^x.y.z` |
| P-03 | HIGH | `package.json` | `@ai-sdk/provider: "latest"` | Pin to `^x.y.z` |
| P-04 | HIGH | `package.json` | `@ai-sdk/react: "latest"` | Pin to `^x.y.z` |
| P-05 | HIGH | `package.json` | `@openrouter/ai-sdk-provider: "latest"` | Pin to `^x.y.z` |
| P-06 | HIGH | `package.json` | `@streamdown/cjk: "latest"` | Pin to `^x.y.z` |
| P-07 | HIGH | `package.json` | `@streamdown/code: "latest"` | Pin to `^x.y.z` |
| P-08 | HIGH | `package.json` | `@streamdown/math: "latest"` | Pin to `^x.y.z` |
| P-09 | HIGH | `package.json` | `@streamdown/mermaid: "latest"` | Pin to `^x.y.z` |
| P-10 | HIGH | `package.json` | `@supabase/ssr: "latest"` | Pin to `^x.y.z` |
| P-11 | HIGH | `package.json` | `@supabase/supabase-js: "latest"` | Pin to `^x.y.z` |
| P-12 | HIGH | `package.json` | `ai: "latest"` | Pin to `^x.y.z` — core SDK, breaking changes will halt the app |
| P-13 | HIGH | `package.json` | `ansi-to-react: "latest"` | Pin to `^x.y.z` |
| P-14 | HIGH | `package.json` | `babel-plugin-react-compiler: "latest"` | Pin to `^x.y.z` |
| P-15 | HIGH | `package.json` | `class-variance-authority: "latest"` | Pin to `^x.y.z` |
| P-16 | HIGH | `package.json` | `clsx: "latest"` | Pin to `^x.y.z` |
| P-17 | HIGH | `package.json` | `cmdk: "latest"` | Pin to `^x.y.z` |
| P-18 | HIGH | `package.json` | `codemirror: "latest"` | Pin to `^x.y.z` |
| P-19 | HIGH | `package.json` | `date-fns: "latest"` | Pin to `^x.y.z` |
| P-20 | HIGH | `package.json` | `drizzle-orm: "latest"` | Pin to `^x.y.z` — ORM, schema changes can break migrations |
| P-21 | HIGH | `package.json` | `next-themes: "latest"` | Pin to `^x.y.z` |
| P-22 | HIGH | `package.json` | `postgres: "latest"` | Pin to `^x.y.z` |
| P-23 | HIGH | `package.json` | `radix-ui: "latest"` | Pin to `^x.y.z` |
| P-24 | HIGH | `package.json` | `react: "latest"`, `react-dom: "latest"` | Pin to `^x.y.z` |
| P-25 | HIGH | `package.json` | `rehype-katex: "latest"`, `remark-math: "latest"` | Pin to `^x.y.z` |
| P-26 | HIGH | `package.json` | `server-only: "latest"` | Pin to `^x.y.z` |
| P-27 | HIGH | `package.json` | `streamdown: "latest"` | Pin to `^x.y.z` |
| P-28 | HIGH | `package.json` (dev) | `@types/react: "latest"`, `@types/react-dom: "latest"` | Pin to `^x.y.z` |
| P-29 | HIGH | `package.json` (dev) | `drizzle-kit: "latest"` | Pin to `^x.y.z` |

**Total: 30+ packages on `"latest"`.** While `pnpm-lock.yaml` pins actual versions, `pnpm install` without `--frozen-lockfile` will pull whatever is newest. This is a **reproducibility risk** — CI, new developers, and deployment can silently get different versions.

**Recommendation:** Run `pnpm outdated` → capture current resolved versions → replace all `"latest"` with `"^{resolved_version}"`. One-time operation, ~10 minutes.

### 3.2 Unused Packages

| # | SEV | FILE:line | PACKAGE | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|---------|----------------|
| P-30 | MEDIUM | `package.json` | `react-virtuoso` | **Zero imports** in non-oldapp code. Only used in `oldapp/components/messages.tsx` and `oldapp/components/sidebar-history.tsx`. | Remove from dependencies. |
| P-31 | MEDIUM | `package.json` | `diff-match-patch` | **Zero imports** in non-oldapp code. Only used in `oldapp/lib/editor/diff.js`. | Remove from dependencies. |
| P-32 | MEDIUM | `package.json` | `@vercel/analytics` | **Zero imports** in non-oldapp code. Only imported in `oldapp/app/layout.tsx`. | Remove from dependencies, or wire into new `app/layout.tsx`. |
| P-33 | MEDIUM | `package.json` | `@vercel/speed-insights` | **Zero imports** in non-oldapp code. Only imported in `oldapp/app/layout.tsx`. | Remove from dependencies, or wire into new `app/layout.tsx`. |
| P-34 | MEDIUM | `package.json` | `@vercel/functions` | **Zero imports** in non-oldapp code. Only used in `oldapp/app/(chat)/api/chat/route.ts` (geolocation). | Remove from dependencies. |
| P-35 | MEDIUM | `package.json` | `@opentelemetry/api` | **Zero imports** in non-oldapp code. Old app used `trace` from this. New app uses `@vercel/otel` via `instrumentation.ts`. | Check if `@vercel/otel` has a peer dependency on this. If not, remove. |
| P-36 | MEDIUM | `package.json` | `@opentelemetry/api-logs` | **Zero imports** anywhere in the codebase (including oldapp). | Remove from dependencies. |
| P-37 | LOW | `package.json` | `react-resizable-panels` | **Zero imports** in any non-node_modules code. Not used by any component. | Remove from dependencies. |
| P-38 | LOW | `package.json` | `fast-deep-equal` | Used in `features/chat/components/{messages,message,message-actions}.tsx`. **Keeping.** | N/A — in use. |
| P-39 | LOW | `package.json` | `rehype-katex`, `remark-math` — **Redundant.** See P-44 deep-dive. Both are direct deps of `@streamdown/math`, not peer deps. Zero imports in project code. | Remove from project `package.json`. |
| P-40 | LOW | `package.json` | `@types/d3-scale` | **Zero imports** of `d3-scale` in entire codebase. | Remove dev dependency. |
| P-41 | LOW | `package.json` | `@types/pdf-parse` | **Zero imports** of `pdf-parse` in entire codebase. | Remove dev dependency. |
| P-42 | LOW | `package.json` | `SUPABASE_JWT_SECRET` in `.env.example` | Listed as "Required" but **zero references** in non-oldapp code. The new app uses `@supabase/ssr` which validates JWTs internally. Only `oldapp/lib/auth/session.ts` used it. | Remove from `.env.example` or verify if `@supabase/ssr` needs it as an env var. |

### 3.3 Duplicate Packages Serving Same Purpose

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| P-43 | HIGH | `package.json` | **`framer-motion` AND `motion` both installed — TWO framer-motion versions in bundle.** Deep-dive findings: `motion@12.35.0` is a thin wrapper that re-exports `framer-motion`. Its `index.js` literally does `require('framer-motion/dom')`. It declares `framer-motion: "^12.35.0"` as a dependency. The project's direct `framer-motion: "^11.18.2"` is v11. **pnpm virtual store confirms two copies:** `framer-motion@11.18.2` (4.1MB dist) and `framer-motion@12.35.0` (5.6MB dist) — 9.7MB total dist on disk, both partially tree-shaken into client bundle. `shimmer.tsx` (ai-elements, read-only) imports from `"motion/react"` → resolves to framer-motion@12; `features/artifacts/`, `components/motion-provider.tsx` import from `"framer-motion"` → resolves to framer-motion@11. | **Option A (recommended):** Upgrade direct `framer-motion` dep from `^11.18.2` → `^12.35.0` to match `motion`'s requirement. pnpm would deduplicate to a single v12 copy. Risk: framer-motion v11→v12 has breaking changes (renamed exports, API changes). Requires checking all 4-5 framer-motion import sites. **Option B:** Keep both if migration is risky. ai-elements are read-only and can't be changed. **Option C:** Add `pnpm.overrides` to force `framer-motion: "^12.35.0"` — same dedup effect but bypasses semver contract. |
| P-44 | LOW | `package.json` | **`rehype-katex` and `remark-math` are redundant project-level dependencies.** Deep-dive findings: `@streamdown/math@1.0.2` declares both as direct dependencies (NOT peer): `"rehype-katex": "^7.0.1"`, `"remark-math": "^6.0.0"`. They're imported inside `@streamdown/math/dist/index.js`. **Zero imports** of either package in project source code (`app/`, `features/`, `lib/`, `components/`). The project-level installs are redundant hoisted copies. | Remove `"rehype-katex"` and `"remark-math"` from project `package.json`. `@streamdown/math` brings its own copies. |

---

## 4. Environment Variables

### 4.1 All `process.env.*` Accesses vs `.env.example` Coverage

**Legend:** ✅ = in `.env.example`, ❌ = missing from `.env.example`, 🔒 = server-only, 🌐 = NEXT_PUBLIC (exposed to client)

| # | ENV VAR | ACCESSED IN (non-oldapp) | .env.example | NOTES |
|---|---------|--------------------------|-------------|-------|
| E-01 | `DATABASE_URL` 🔒 | `lib/db/client.ts`, `lib/db/migrate.ts`, `drizzle.config.ts` | ✅ Required | — |
| E-02 | `CACHE_KV_REST_API_URL` 🔒 | `lib/cache/client.ts` | ✅ Required | — |
| E-03 | `CACHE_KV_REST_API_TOKEN` 🔒 | `lib/cache/client.ts` | ✅ Required | — |
| E-04 | `NEXT_PUBLIC_SUPABASE_URL` 🌐 | `lib/auth/session.ts`, `features/auth/lib/supabase-browser.ts`, `features/auth/lib/supabase-action.ts`, `proxy.ts`, `instrumentation.ts` | ✅ Required | — |
| E-05 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` 🌐 | `lib/auth/session.ts`, `features/auth/lib/supabase-browser.ts`, `features/auth/lib/supabase-action.ts`, `instrumentation.ts` | ✅ Required | — |
| E-06 | `SUPABASE_JWT_SECRET` 🔒 | **Zero references in non-oldapp code** | ✅ Required | See P-42. Possibly dead. |
| E-07 | `GUEST_JWT_SECRET` 🔒 | `lib/auth/guest.ts`, `instrumentation.ts` | ✅ Required | — |
| E-08 | `OPENAI_API_KEY` 🔒 | `lib/ai/registry.ts` | ✅ Required | — |
| E-09 | `GEMINI_API_KEY` 🔒 | `lib/ai/registry.ts` | ✅ Optional | — |
| E-10 | `OPENROUTER_API_KEY` 🔒 | `lib/ai/registry.ts`, `lib/ai/models.ts` | ✅ Optional | — |
| E-11 | `BLOB_READ_WRITE_TOKEN` 🔒 | `app/api/files/upload/route.ts` (implicit via `@vercel/blob`) | ✅ Required | Not explicitly read — `@vercel/blob`'s `put()` uses it. |
| E-12 | `NEXT_PUBLIC_APP_URL` 🌐 | `lib/ai/models.ts`, `lib/utils/validate-origin.ts` | ❌ **MISSING** | Used for OpenRouter HTTP-Referer header and origin validation. Should be documented. |
| E-13 | `VERCEL_URL` 🔒 | `lib/utils/validate-origin.ts` | ❌ (auto-injected) | Auto-injected by Vercel. Doesn't need .env.example but should be documented. |
| E-14 | `VERCEL_FLUID` 🔒 | `lib/db/client.ts` | ❌ (auto-injected) | Another Vercel-injected var. |
| E-15 | `VERCEL_OIDC_TOKEN` 🔒 | Not directly referenced in non-oldapp | ✅ Optional | Listed but unused. |
| E-16 | `SUPABASE_ACCESS_TOKEN_COOKIE_NAME` 🔒 | `proxy.ts` | ❌ **MISSING** | Used in middleware proxy. Should be documented in .env.example as optional. |
| E-17 | `NODE_ENV` 🔒 | `next.config.ts`, `lib/db/client.ts`, `lib/utils/validate-origin.ts`, `proxy.ts` | N/A (system) | — |
| E-18 | `NEXT_RUNTIME` 🔒 | `instrumentation.ts` | N/A (system) | — |
| E-19 | `OTEL_EXPORTER_OTLP_ENDPOINT` 🔒 | `instrumentation.ts` | ❌ **MISSING** | Required for OpenTelemetry. Should be documented as optional. |
| E-20 | `ENABLE_PRODUCTION_BROWSER_SOURCE_MAPS` 🔒 | `next.config.ts` | ❌ **MISSING** | Build-time flag. Document as optional in .env.example. |
| E-21 | `ENABLE_EXPERIMENTAL_INLINE_CSS` 🔒 | `next.config.ts` | ❌ **MISSING** | Build-time flag. Document as optional in .env.example. |
| E-22 | `ENABLE_EXPERIMENTAL_VIEW_TRANSITION` 🔒 | `next.config.ts` | ❌ **MISSING** | Build-time flag. Document as optional in .env.example. |
| E-23 | `PORT` 🔒 | `playwright.config.ts` | ❌ (standard) | Standard Node.js/Vercel var. |
| E-24 | `CI` 🔒 | `playwright.config.ts` | ❌ (auto-injected) | CI env var. |

### 4.2 NEXT_PUBLIC_ Exposure Audit

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| E-25 | LOW | Various | `NEXT_PUBLIC_SUPABASE_URL` — Public Supabase project URL. Expected to be public. | ✅ Safe |
| E-26 | LOW | Various | `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key with RLS policies. Expected to be public. | ✅ Safe |
| E-27 | MEDIUM | `lib/ai/models.ts:231` | `NEXT_PUBLIC_APP_URL` — Used server-side only (in OpenRouter HTTP-Referer header). **Not** actually exposed to client bundle since it's only read in server-side route handler code. However, the `NEXT_PUBLIC_` prefix means it WILL be bundled into client JS. | Consider renaming to `APP_URL` (without NEXT_PUBLIC_ prefix) since it's only used server-side. Or verify no client code needs it. |

### 4.3 Runtime Validation Presence

| # | SEV | FILE:line | FINDING | RECOMMENDATION |
|---|-----|-----------|---------|----------------|
| E-28 | LOW | `instrumentation.ts:3-18` | **Startup warnings** for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GUEST_JWT_SECRET`. Warnings only — never crashes. | Good practice. Consider expanding to validate all required env vars. |
| E-29 | MEDIUM | `lib/db/client.ts:7-9` | `DATABASE_URL` — Hard throw if missing. | ✅ Correct — DB is mandatory. |
| E-30 | MEDIUM | `lib/cache/client.ts:31-32` | `CACHE_KV_REST_API_URL` + `CACHE_KV_REST_API_TOKEN` — Read but no explicit throw if missing. Returns undefined client. | Consider throwing at startup for required cache infra. |
| E-31 | HIGH | `.env.example` | **6 env vars used in code are missing from .env.example:** `NEXT_PUBLIC_APP_URL`, `SUPABASE_ACCESS_TOKEN_COOKIE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `ENABLE_PRODUCTION_BROWSER_SOURCE_MAPS`, `ENABLE_EXPERIMENTAL_INLINE_CSS`, `ENABLE_EXPERIMENTAL_VIEW_TRANSITION`. | Add all 6 to .env.example with comments. The first two affect runtime behavior; the last four are build-time optional flags. |
| E-32 | LOW | `.env.example:11` | `SUPABASE_JWT_SECRET` listed as "Required" but **confirmed unused by entire Supabase SDK.** Deep-dive: grep of `node_modules/@supabase/ssr/dist/` and `node_modules/@supabase/supabase-js/dist/` found ZERO references to `JWT_SECRET` or `SUPABASE_JWT_SECRET`. The SDK validates JWTs server-side using the project's JWT secret configured in the Supabase dashboard, not an env var. This was only used in `oldapp/lib/auth/session.ts` for manual JWT verification with `jose`. | Remove from `.env.example`. Safe to delete — no code reads it. |

---

## 5. Summary Matrix

| Category | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| CSS/Styling | 0 | 0 | 1 | 8 | 9 |
| Dead Code | 0 | 0 | 2 | 8 | 10 |
| Dependencies | 0 | 30 | 8 | 6 | 44 |
| Environment Vars | 0 | 1 | 2 | 4 | 7 |
| **TOTAL** | **0** | **31** | **13** | **26** | **70** |

### Priority Actions

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| **P1** | Pin all 30+ `"latest"` versions to `^x.y.z` (see Appendix A) | Prevents silent breaking changes | 10 min |
| **P2** | Add 6 missing env vars to `.env.example` | Developer onboarding, deployment safety | 5 min |
| **P3** | Remove ~8 unused packages + 2 redundant (rehype-katex, remark-math) | Reduces install time, bundle size, attack surface | 5 min |
| **P4** | Merge duplicate `@theme` blocks in globals.css | Removes ~40 lines of dead CSS declarations | 5 min |
| **P5** | Delete `getUserByEmail()` + `getChatWithMessages()` | Remove dead code | 2 min |
| **P6** | Remove chart-* custom properties (unused) | ~20 lines dead CSS | 2 min |
| **P7** | Upgrade framer-motion 11→12 to deduplicate with motion (9.7MB → ~5.6MB) | Bundle size reduction | 30 min (breaking change review) |
| **P8** | Rename `NEXT_PUBLIC_APP_URL` → `APP_URL` | Prevent unnecessary client exposure | 5 min |
| **P9** | Add `@unused` tag to `getMessagesByChatId()` | Code hygiene | 1 min |
| **P10** | Remove `SUPABASE_JWT_SECRET` from `.env.example` | Eliminate confusion (confirmed unused) | 1 min |

---

## Appendix A — Version Pin Reference

Current resolved versions for all `"latest"` packages. Replace `"latest"` with `"^{version}"`.

### dependencies

| Package | Current Resolved | Pin To |
|---------|-----------------|--------|
| `@ai-sdk/google` | 3.0.43 | `"^3.0.43"` |
| `@ai-sdk/openai` | 3.0.41 | `"^3.0.41"` |
| `@ai-sdk/provider` | 3.0.8 | `"^3.0.8"` |
| `@ai-sdk/react` | 3.0.118 | `"^3.0.118"` |
| `@openrouter/ai-sdk-provider` | 2.2.5 | `"^2.2.5"` |
| `@streamdown/cjk` | 1.0.2 | `"^1.0.2"` |
| `@streamdown/code` | 1.1.0 | `"^1.1.0"` |
| `@streamdown/math` | 1.0.2 | `"^1.0.2"` |
| `@streamdown/mermaid` | 1.0.2 | `"^1.0.2"` |
| `@supabase/ssr` | 0.9.0 | `"^0.9.0"` |
| `@supabase/supabase-js` | 2.98.0 | `"^2.98.0"` |
| `ai` | 6.0.116 | `"^6.0.116"` |
| `ansi-to-react` | 6.2.6 | `"^6.2.6"` |
| `babel-plugin-react-compiler` | 1.0.0 | `"^1.0.0"` |
| `class-variance-authority` | 0.7.1 | `"^0.7.1"` |
| `clsx` | 2.1.1 | `"^2.1.1"` |
| `cmdk` | 1.1.1 | `"^1.1.1"` |
| `codemirror` | 6.0.2 | `"^6.0.2"` |
| `date-fns` | 4.1.0 | `"^4.1.0"` |
| `drizzle-orm` | 0.45.1 | `"^0.45.1"` |
| `next-themes` | 0.4.6 | `"^0.4.6"` |
| `postgres` | 3.4.8 | `"^3.4.8"` |
| `radix-ui` | 1.4.3 | `"^1.4.3"` |
| `react` | 19.2.4 | `"^19.2.4"` |
| `react-dom` | 19.2.4 | `"^19.2.4"` |
| `rehype-katex` | 7.0.1 | **REMOVE** (redundant — see P-44) |
| `remark-math` | 6.0.0 | **REMOVE** (redundant — see P-44) |
| `server-only` | 0.0.1 | `"^0.0.1"` |
| `streamdown` | 2.4.0 | `"^2.4.0"` |

### devDependencies

| Package | Current Resolved | Pin To |
|---------|-----------------|--------|
| `@types/react` | 19.2.14 | `"^19.2.14"` |
| `@types/react-dom` | 19.2.3 | `"^19.2.3"` |
| `drizzle-kit` | 0.31.9 | `"^0.31.9"` |

---

## Appendix B — Deep-Dive: framer-motion vs motion Deduplication

### Current State
```
package.json:
  "framer-motion": "^11.18.2"    → installs framer-motion@11.18.2 (4.1MB dist)
  "motion": "^12.35.0"           → installs motion@12.35.0 
                                    └─ dep: framer-motion@^12.35.0 → installs framer-motion@12.35.0 (5.6MB dist)

Total: TWO framer-motion versions (9.7MB combined dist)
```

### How motion Works
`motion` is a thin re-export layer. Its `dist/cjs/index.js`:
```js
var dom = require('framer-motion/dom');
Object.keys(dom).forEach(function (k) { ... exports[k] = dom[k]; });
```

### Import Sites
| File | Imports From | Resolves To |
|------|-------------|-------------|
| `features/artifacts/components/code-editor.tsx` | `framer-motion` | framer-motion@11.18.2 |
| `features/artifacts/components/artifact-actions.tsx` | `framer-motion` | framer-motion@11.18.2 |
| `components/motion-provider.tsx` | `framer-motion` | framer-motion@11.18.2 |
| `components/ai-elements/shimmer.tsx` | `motion/react` | → framer-motion@12.35.0 |

### Migration Path
1. Upgrade `framer-motion` in package.json from `"^11.18.2"` → `"^12.35.0"`
2. Check framer-motion v12 changelog for breaking changes at import sites
3. After upgrade, pnpm deduplicates to single framer-motion@12.35.0
4. Run `pnpm dedupe` to clean up

### framer-motion v11 → v12 Breaking Changes (key ones)
- Package was officially renamed to `motion` (but `framer-motion` still works as a compatibility package)
- `AnimatePresence` default changed: `initial={true}` → `initial={false}`
- `useMotionValueEvent` callback timing changed
- Some utility exports relocated
- **Risk:** LOW for this codebase — only 3 non-ai-elements import sites, using basic `motion.div` and `AnimatePresence`

### Recommendation
**Upgrade `framer-motion` to `"^12.35.0"`.** The 3 import sites use basic APIs unlikely to be affected. Test `AnimatePresence` behavior in code-editor and artifact-actions after upgrade.

---

## Appendix C — Deep-Dive: SUPABASE_JWT_SECRET

### Finding
**CONFIRMED UNUSED.** Grep of `node_modules/@supabase/ssr/dist/` and `node_modules/@supabase/supabase-js/dist/` returned **zero matches** for `JWT_SECRET` or `SUPABASE_JWT_SECRET`.

### How Supabase Auth Works Now
The `@supabase/ssr` package handles JWT validation internally through the Supabase GoTrue server. It does NOT read a local JWT secret from env vars. The JWT secret is configured server-side in the Supabase dashboard and used by the GoTrue service.

### Old Usage
`oldapp/lib/auth/session.ts:40` used `jose` to manually verify JWTs:
```ts
const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
const { payload } = await jwtVerify(token, secret);
```
This pattern was replaced by `@supabase/ssr`'s built-in `getUser()` which validates tokens via the Supabase API.

### Action
Remove `SUPABASE_JWT_SECRET` from `.env.example`. No code reads it.

---

## Appendix D — Deep-Dive: rehype-katex / remark-math Peer Dependencies

### Finding
**Both are redundant project-level dependencies.**

### Evidence
```
@streamdown/math@1.0.2 → package.json:
  "dependencies": {
    "katex": "^0.16.27",
    "rehype-katex": "^7.0.1",    ← DIRECT dependency (not peer)
    "remark-math": "^6.0.0"      ← DIRECT dependency (not peer)
  }
```

`@streamdown/math/dist/index.js` imports both packages internally. Zero imports of either in project source code.

### Action
Remove `"rehype-katex"` and `"remark-math"` from project `package.json`. `@streamdown/math` installs its own copies.
