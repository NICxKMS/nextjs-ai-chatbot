# ai-assistant (v6.0)

Next.js AI chatbot with multi-model support, artifact management, real-time streaming, and feature-based architecture.

**Tech stack**: Next.js 16, React 19, TypeScript, Drizzle ORM, Supabase (auth + DB), Tailwind CSS, AI SDK, Biome (lint + format).

---

## ⚠️ Mandatory Pre-Implementation Protocol (EVERY TASK)

> **CRITICAL**: Before writing any code, agents MUST complete these steps in order. Failure to complete = rejected work.

| Step | Action | Purpose |
|------|--------|---------|
| 1 | **Check New App First** | Search the NEW codebase for the functionality. It may already exist under a different name, file path, or architectural pattern. If an equivalent or improved implementation exists, document it and mark the issue as "Already Implemented" — do NOT overwrite working code with old patterns. |
| 2 | **Read Reference Code** | Read the OLD implementation files listed in the task's Guidance field (`archive/oldapp/` paths) to understand the original logic, props, state, and edge cases. Also search the OLD codebase for related files, imports, and callers to get full context. |
| 3 | **Compare Architectures** | Determine whether the OLD implementation should be ported as-is, adapted to v6 patterns, or skipped because the new approach is already better. Document the decision with rationale. |
| 4 | **Search Related Code** | Search BOTH the NEW and OLD codebases for related files, imports, consumers, and dependencies to understand the full integration surface and how the code was originally used vs how it's currently wired. |
| 5 | **Understand Architecture** | Read the relevant v6 architecture section from `.ouroboros/specs/refactor-migration/architecture-v6-final.md` to ensure the fix follows v6 patterns (Repository/Service, feature modules, slim routes, layer imports). |
| 6 | **Document Findings** | Note key decisions, architecture differences, and any deviations before implementing. |

### Code Reuse & Consistency Mandate

- **Use existing functions, variables, types, and utilities** before creating new ones. Search the codebase first.
- **Follow existing coding patterns** — match naming conventions, file structure, export style, error handling, and formatting of surrounding code.
- **Extend, don't duplicate** — if similar logic exists, refactor it to be reusable rather than writing a parallel implementation.
- **Import from barrel exports** (`index.ts`) where they exist. Do not bypass them with direct file imports.
- **Match existing error handling patterns** — use `AppError` subclasses, guard functions, and the established try/catch → typed error flow.

During the v5→v6 migration comparison, ~45 "improvement" issues were identified where the new codebase had **intentionally better implementations** than the old code (e.g., `ChatSDKError` → `AppError` class hierarchy, `myProvider` → `getModel()` registry, `verifyOwnership` → domain-specific guards). Without Step 1, agents would overwrite these improvements with legacy patterns.

---

## Commands

> **We are using windows powershell Terminal, so all commands should be compatible with that environment. If you need to run a command that is not compatible, use an alternative command that achieves the same result.**

### Validation — Run Before Marking Work Complete

| Command | Purpose | Requirement |
|---------|---------|-------------|
| `pnpm format` | Auto-format (`biome format --write .`) | **Always run** after code changes, before lint |
| `pnpm typecheck` | TypeScript type checking (`tsc --noEmit`) | **Zero errors** |
| `pnpm lint` | Biome lint check (`biome check .`) | **Zero errors** |
| `pnpm lint:fix` | Auto-fix lint issues (`biome check --write .`) | Use when lint fails |

### Setup, Dev & Testing

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start Next.js dev server with HMR |
| `pnpm build` | Run migrations + production build (**not during agent sessions**) |
| `pnpm test:unit` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests |

### Database

| Command | Purpose |
|---------|---------|
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |

**IMPORTANT**: Do NOT create manual migration SQL files. Drizzle ORM auto-generates them. Update the schema in `lib/db/schema.ts` and run `pnpm db:generate`.

---

## Architecture & Patterns

### Key Architecture Patterns (v6)

| Pattern | Implementation |
|---------|---------------|
| **Repository Pattern** | All data access through `lib/data/repositories/` |
| **Service Layer** | Business logic in `lib/data/services/` |
| **Feature Modules** | Self-contained under `features/` (auth, chat, artifact, input, settings, sidebar) |
| **Slim Routes** | API routes delegate to services; minimal logic in route files |
| **Error Hierarchy** | `AppError` → `ValidationError`, `NotFoundError`, `UnauthorizedError`, etc. |
| **Guard Functions** | Auth/access checks in `lib/auth/guards.ts` (throw-based, not return-based) |
| **AI Registry** | `getModel(id)` from `lib/ai/registry.ts` — no direct provider access |

### Code Style

- **TypeScript strict mode** — no `any` unless explicitly justified
- **Biome** for linting and formatting (not ESLint/Prettier)
- **Zod schemas** for validation (co-located in feature `schemas/` directories)
- **Server Actions** for mutations (co-located in feature `actions/` directories)

### Architecture Specs

Canonical architecture documentation lives in `.ouroboros/specs/refactor-migration/`:

| File | Content |
|------|---------|
| `architecture-v6-final.md` | Canonical architecture (29 sections) |
| `functional-structure-v6.md` | File-by-file specs (~274 files) |
| `directory-structure-v6.md` | Target directory structure |
| `architecture-v6-decisions.md` | ADRs for design rationale |

---

## Project Structure

```
features/          → Feature modules (auth, chat, artifact, input, settings, sidebar)
  └── <feature>/
      ├── actions/   → Server actions
      ├── components/ → Feature-specific UI
      ├── hooks/      → Feature-specific hooks
      └── schemas/    → Zod validation schemas
components/        → Shared components (ui/, ai/, artifact/)
hooks/             → Shared hooks (use-mobile, use-debounce, etc.)
lib/               → Core libraries
  ├── a11y/          → Accessibility utilities
  ├── api/           → API context, response, validation
  ├── auth/          → Auth config, guards, session
  ├── cache/         → Tiered caching (memory + Redis)
  ├── data/          → Repositories, services, queries
  ├── db/            → Drizzle client + schema
  ├── editor/        → Editor utilities
  ├── errors/        → Error messages
  ├── middleware/     → Request middleware
  ├── rate-limit/    → Rate limiting
  ├── types/         → Shared TypeScript types
  └── utils/         → General utilities
archive/oldapp/    → Legacy v5 code (migration source)
drizzle/           → Migration SQL files + seed script
```

---

## Migration Reference (archive/oldapp)

Legacy v5 source files are in `archive/oldapp/`. Agents must follow the Pre-Implementation Protocol above when referencing these files.

### Common Packages

Verify before implementation — install missing with `pnpm add <package>`:

| Package | Purpose |
|---------|---------|
| `@radix-ui/*` | UI primitives |
| `clsx`, `tailwind-merge` | Class utilities |
| `zod` | Validation |
| `drizzle-orm` | Database ORM |
| `@upstash/redis` | Caching |

---

## Current Implementation Plan

**Location:** `.apm/Implementation_Plan.md`
**Scope:** 215 issues across 97 tasks in 8 phases
**Issue Source:** `issues/` directory (11 phase files), master index: `issues/root.md`

### Phase Overview

| Phase | Name | Tasks | Agent | Priority | Parallel With |
|-------|------|-------|-------|----------|---------------|
| 1 | AI Core & Chat Streaming | 13 | Agent_AICore | CRITICAL | 2, 3, 8 |
| 2 | Security Hardening | 10 | Agent_Security | CRITICAL | 1, 3, 8 |
| 3 | Error & Data Infrastructure | 15 | Agent_DataLayer | HIGH | 1, 2, 8 |
| 4 | Chat UI & Sidebar Components | 14 | Agent_ChatUI | HIGH | 5, 8 (after 1) |
| 5 | Artifact System | 10 | Agent_ArtifactUI | HIGH | 4, 8 (after 1) |
| 6 | Pages, Hooks & State | 13 | Agent_Pages | MEDIUM | 7, 8 (after 4) |
| 7 | API Routes & Server Actions | 13 | Agent_APIRoutes | MEDIUM | 6, 8 (after 1+3) |
| 8 | Middleware, Types & Config | 9 | Agent_Middleware | MEDIUM | All |

### Critical Path

```
Phase 1 (AI Core) ──┬──→ Phase 4 (Chat UI) ──→ Phase 6 (Pages)
                     ├──→ Phase 5 (Artifacts)
                     └──→ Phase 7 (API Routes)
Phase 2 (Security) ─────→ Phase 7 (API Routes)
Phase 3 (Data Layer) ───→ Phase 7 (API Routes)
Phase 8 (Middleware) ────→ (independent, parallel with all)
```

---

## Shared Protocols

### Behavioral Expectations (ALL AGENTS)

- **Knowledge-First**: No agent begins implementation without completing its knowledge acquisition phase — read all referenced files, search for related code, review specs, understand dependencies
- **Autonomous Execution**: All agents execute without user confirmation between steps. Only pause for critical ambiguity that cannot be resolved from context
- **Logging Obligation**: All significant work, findings, and decisions must be logged:
  - Task execution details → Memory Logs (`.apm/Memory/`)
  - **CRITICAL** — Issues and irregularities → `global-issues.md`
  - **CRITICAL** — Generalizable insights → `AGENTS.md` (Contributions Log)
- **Scope Discipline**: Stay within assigned task scope. Scope expansion requires justification, Memory Log entry, and a flag in the Final Task Report

### Error Resolution — 3-Strike Rule

| Attempt | Action |
|---------|--------|
| 1st | Analyze and fix |
| 2nd | Alternative approach |
| 3rd | Broader rethink |
| 4th+ | **PROHIBITED** — escalate |

### Error Escalation Chain

```
1. Self-resolve (max 3 attempts)
       ↓ (if unresolved)
2. Log to global-issues.md
       ↓
3. Delegate to Ad-Hoc Agent (debug or research)
       ↓ (if still unresolved)
4. Report to Manager Agent for decision
```

### Context Drift Recovery

If you cannot recall task objective, dependencies, or progress → **STOP** → Re-read workflow → Re-read context files (Implementation Plan, Task Assignment, Memory Logs) → Confirm recovery → Resume

### Workflow Re-Read (MANDATORY)

**ALWAYS** re-read your workflow file when:
- Context has been summarized
- Context drift is detected
- Session is resumed after handover

---

## Issue Tracking (`global-issues.md`)

**ALL** findings, irregularities, migration inconsistencies, architectural deviations, and missing dependencies MUST be logged.

### Issue Categories

| Category | When to Use |
|---|---|
| **Bug** | Functional errors, runtime failures, incorrect behavior |
| **Migration** | Inconsistencies between old app and new implementation |
| **Dependency** | Missing packages, version conflicts, import issues |
| **Refactor** | Technical debt, code quality issues, structural problems |
| **Architecture** | Deviations from architectural specifications |
| **Drift** | Context drift events, protocol violations, alignment issues |

### Entry Format

```markdown
## [Timestamp] - [Issue Title]

- **Category**: [Bug | Migration | Dependency | Refactor | Architecture | Drift]
- **Agent**: [Agent name]
- **Task**: [Task reference]
- **Context**: [What was happening when the issue was found]
- **Root Cause**: [If known, otherwise "Under investigation"]
- **Action Taken**: [What was done to address it]
- **Status**: [Open | Resolved | Deferred]
- **Related Files**: [Affected file paths]
```

---

## APM System

### Agent Roles

| Agent | Role | Workflow |
|-------|------|----------|
| **Manager** | Orchestrator — delegates all work, never reads/writes directly | `.kilocode/workflows/apm-2-initiate-manager-autonomous.md` |
| **Implementation** | Executor — coding, research, analysis, issue logging | `.kilocode/workflows/apm-3-initiate-implementation-autonomous.md` |
| **Ad-Hoc** | Specialist — debugging, research delegation | `.kilocode/workflows/apm-7-delegate-research.md`, `.kilocode/workflows/apm-8-delegate-debug.md` |

### Responsibility Matrix

| Responsibility | Manager | Implementation |
|---|---|---|
| Task delegation & planning | **Primary** | — |
| Code implementation | — | **Primary** |
| `global-issues.md` | Reviews & considers | **Writes entries** |
| Code quality validation | — | **Runs typecheck + lint** |
| Memory Log creation | Delegates | **Writes** |
| Error resolution | Delegates | Up to 3 attempts |

### Memory System

```
.apm/Memory/
├── Memory_Root.md              ← Project overview & phase summaries
├── Phase_XX_slug/              ← Phase-level directory
│   ├── Task_X_Y_slug.md        ← Individual task execution records
│   └── ...
└── Handover/                    ← Session transition context
    └── Handover_YYYY-MM-DD_HH-MM.md
```

### Key File Paths

| File/Directory | Purpose |
|----------------|---------|
| `AGENTS.md` | This file — shared knowledge base |
| `global-issues.md` | Global issue tracking |
| `.apm/Implementation_Plan.md` | Task definitions and dependencies |
| `.apm/guides/` | Memory Log, Memory System, Task Assignment guides |
| `.apm/Memory/` | Task logs and phase summaries |
| `.kilocode/workflows/` | Agent workflow files |

---

## Agent Contributions Log

> Append new entries below. Do not modify or remove existing entries.

---

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-cache-components.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,production-checklist.mdx,progressive-web-apps.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route-segment-config.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,browserDebugInfoInTerminal.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,isolatedDevBuild.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-report-web-vitals.mdx,use-router.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,isolatedDevBuild.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
