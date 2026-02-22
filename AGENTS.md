# AGENTS.md — Execution Protocol & Architecture Rules

**Project:** ai-assistant (v6.0)

Next.js AI chatbot with multi-model support, artifact management, real-time streaming, and feature-based architecture.

**Stack:** Next.js 16 · React 19 · TypeScript · Drizzle ORM · Supabase · Tailwind · AI SDK · Biome

---

# 📚 CRITICAL: Next.js Documentation Access

> **⚠️ Your training knowledge about Next.js is likely OUTDATED.**
>
> This project uses **Next.js 16** with the **App Router**. APIs, patterns, and best practices have changed significantly.

## Before Any Next.js Task

1. **READ** the local documentation at `./.next-docs/`
2. **SEARCH** relevant docs before relying on memory
3. **VERIFY** API signatures and patterns against current docs

## Migration Gotchas

| Deprecated Pattern | Modern Equivalent |
|--------------------|-------------------|
| `getServerSideProps` | Server Components + `fetch()` |
| `getStaticProps` | `generateStaticParams` + caching |
| `pages/api/` | `app/api/route.ts` (Route Handlers) |
| `_app.tsx` | `app/layout.tsx` |
| Client components everywhere | Server Components by default |

## Full Documentation Index

Regenerate with: `npx @next/codemod agents-md --output AGENTS.md`

```
<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-cache-components.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,production-checklist.mdx,progressive-web-apps.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route-segment-config.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,browserDebugInfoInTerminal.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,isolatedDevBuild.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-report-web-vitals.mdx,use-router.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,isolatedDevBuild.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,03-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
```

---
Components
# 🚨 Global Rule

**Follow this document exactly. Deviation = invalid output.**

---

# 🔒 Pre-Execution Protocol

> Execute immediately after receiving a task. Complete before any implementation.

## Execution Timeline

| Stage | Action |
|-------|--------|
| Task received | Step 1 — Search existing logic |
| Before analysis | Step 2 — Read context |
| Before planning | Step 3–4 — Map integration, verify architecture |
| Before coding | Step 5–6 — Write plan, output gate |
| Before completion | Validation Gate |

## Step 1 — Search Existing Logic

Scan the entire codebase before implementing anything new.

**Search for:** functions, hooks, services, types, utils, components, routes

```
If equivalent logic exists:
  STOP → REPORT → DO NOT IMPLEMENT
```

## Step 2 — Read Context

Gather full context by reading:
- Target file and its imports
- Consumers and dependents
- Related/adjacent files

**Purpose:** Understand actual behavior, not assumed behavior.

## Step 3 — Map Integration Surface

Identify how changes will ripple:
- Who calls this code?
- What depends on it?
- What side effects exist?
- How does state/data flow?

**If unclear:** Continue analysis. Do not proceed.

## Step 4 — Verify Architecture Alignment

Confirm placement is correct:
- [ ] Right layer (repository/service/route)
- [ ] Right module (feature isolation)
- [ ] Right abstraction level
- [ ] Correct dependency direction

**If misaligned:** Redesign before coding.

## Step 5 — Write Implementation Plan

Document before coding:
- Files to change (and why)
- Alternative approaches considered
- Risks and mitigations
- Affected systems

**No code without a plan.**

## Step 6 — Output Execution Gate

```
PRE-EXECUTION CHECK COMPLETE
✔ Logic searched
✔ Context read
✔ Integration mapped
✔ Architecture validated
✔ Plan written
```

Missing output = invalid work.

---

# ✅ Post-Execution Validation

Before marking complete, verify:

- [ ] `pnpm format` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Architecture constraints respected
- [ ] No duplicate logic introduced
- [ ] All imports valid
- [ ] No unintended side effects

**Pass rate:** For any validation, verification, or check or review, the minimum acceptable pass rate is **93.7%**. Do not mark complete if the rate is below this threshold.

---

# ⚙️ Commands

## Required (Before Completion)

```bash
pnpm format      # Biome formatting
pnpm typecheck   # TypeScript check
pnpm lint        # Biome linting
```

## Development

```bash
pnpm install     # Install dependencies
pnpm dev         # Start dev server
pnpm test:unit   # Unit tests
pnpm test:e2e    # E2E tests
```

> ⚠️ `pnpm build` is **forbidden** during agent sessions. Only use before completion to check no more errors remain.

---

# 🧠 Decision Hierarchy

```
Correctness → Architecture → Consistency → Performance → Speed
```

Never reverse this order. A fast wrong solution is still wrong.

---

# ♻️ Reuse Hierarchy

```
Reuse → Extend → Refactor → Create
```

Always prefer existing solutions. Never duplicate.

---

# 🏗 Architecture Constraints

| Pattern | Constraint |
|---------|------------|
| Repository | All data access through repositories |
| Features | Isolated by feature, no cross-dependencies |
| Routes | Thin handlers, delegate to services |
| Errors | Use `AppError` hierarchy |
| Guards | Throw-based, not return-based |
| AI Models | Access via registry pattern |
| AI Elements | `components/ai-elements` is **READ-ONLY** — can only be imported by wrappers in `components/ai` |

---

# 🧾 Code Standards

| Standard | Requirement |
|----------|-------------|
| TypeScript | Strict mode enabled |
| `any` type | Requires written justification |
| Input validation | Zod schemas required |
| Formatting | Biome (auto-format on save) |
| Mutations | Server Actions only |

---

# 📂 Directory Structure

| Directory | Purpose |
|-----------|---------|
| `features/` | Feature-specific logic (isolated) |
| `components/` | Shared UI components |
| `components/ai/` | AI component wrappers (use these) |
| `components/ai-elements/` | Base AI elements (**READ-ONLY** — only importable by `components/ai` wrappers) |
| `hooks/` | Shared custom hooks |
| `lib/` | Infrastructure and utilities |

**Rule:** Misplaced files must be relocated.

---

# 📊 Issue Logging (Mandatory)

Log all anomalies to `global-issues.md`:

- Bugs and errors
- Structural problems
- Architecture violations
- Dependency issues
- Unexpected behaviors

**Never silently fix structural problems.**

## Entry Template

```markdown
### [YYYY-MM-DD HH:MM]
- **Category:** bug | structural | architecture | dependency | behavior
- **Agent:** [name]
- **Task:** [description]
- **Context:** [what was found]
- **Root Cause:** [why it happened]
- **Action:** [what was done]
- **Status:** resolved | escalated | needs-review
- **Files:** [affected files]
```

---

# 🤖 Behavioral Rules

## Knowledge-First
Never write code without understanding. Read before implementing.

## Search Over Terminal
Prefer search tools (e.g. codebase search, grep, file read) over terminal commands for finding code, text, or files. Use the terminal only when you need to run builds, tests, or other commands that must execute in the shell.

## User Interaction — Ask User / Question Tool
**Always** use the ask user/question tool whenever you need user interaction or to ask the user anything (e.g. clarification, missing inputs, choices, confirmation). Do not only state the question in chat; invoke the tool so the request is tracked and the user can respond in the intended flow.

## Autonomous Execution
Proceed independently. Only ask the user when genuinely blocked by missing information.

## Scope Discipline
Never expand scope without justification and a log entry.

---

# 🔁 Error Resolution

| Attempt | Approach |
|---------|----------|
| 1 | Fix directly |
| 2 | Try alternative |
| 3 | Rethink approach |
| 4 | Escalate to user |

**Never repeat the same failed approach.**

---

# 🧭 Context Drift Recovery

If you lose context or become uncertain:

```
STOP
Re-read the task
Re-read relevant specs
Re-read recent logs
Resume with clarity
```

---

# ⛔ Forbidden Actions

| Action | Why |
|--------|-----|
| Overwrite working logic | Breaks existing functionality |
| Introduce new architecture | Violates intentional design |
| Bypass layers | Breaks separation of concerns |
| Modify unrelated files | Scope creep, unintended effects |
| Skip protocol steps | Guarantees mistakes |
| Guess behavior | Creates bugs from assumptions |
| Skip validation | Ships broken code |
| Modify `components/ai-elements` | Read-only folder — use wrappers from `components/ai` |
| Import from `ai-elements` directly | Only `components/ai` wrappers may import from `ai-elements` |

---

# ✔ Completion Criteria

Task is complete **only when**:

- [ ] All validation checks pass
- [ ] Architecture constraints respected
- [ ] Logic verified working
- [ ] No code duplication
- [ ] Issues logged if any found
- [ ] Existing patterns followed

---

# 🧠 Self-Monitoring Triggers

**Halt and reassess when:**

- Unsure how code behaves
- Architecture boundaries unclear
- Dependencies unknown
- Multiple conflicting implementations exist
- Several valid approaches with no clear winner

| Response | Quality |
|----------|---------|
| Halting to investigate | ✅ Correct |
| Guessing and proceeding | ❌ Failure |

---

# 🎯 Guiding Principle

> This system is **intentionally designed**.
>
> Do not redesign it.
>
> **Extend it safely, consistently, and correctly.**

---

# 📝 Contributions Log

> Append new entries below. Do not modify or remove existing entries.

---
