---
task: P0-SWEEP
title: "Post-Phase Quality Sweep"
phase: P0
agent: theseus
status: done
started: "2026-03-03"
finished: "2026-03-03"
assessment: conditional-pass
---

## Summary

Comprehensive quality sweep of all Phase 0 output (P0-T01 through P0-T17). Covered 60+ source files across config, lib, components, app, tests, and scripts.

---

## Validation Results

| Command                      | Result |
|------------------------------|--------|
| `pnpm format`                | ✅ pass (3 warnings, 1 info — all upstream shadcn/ui, not actionable) |
| `pnpm typecheck`             | ✅ pass |
| `pnpm lint`                  | ✅ pass (same 3 warnings as format) |
| `node scripts/check-imports.mjs` | ✅ pass — no import boundary violations |

---

## Gate G00 Pre-Check

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `proxy.ts` at root (NOT `middleware.ts`) | ✅ | `proxy.ts` exists, exports named `proxy` function per Next.js 16 convention |
| Schema uses `artifacts` table (NOT `documents`) | ✅ | `lib/db/schema.ts:98` — `pgTable("Artifact", ...)` |
| Schema uses `artifact_kind` enum (NOT `document_kind`) | ✅ | `lib/db/schema.ts:21` — `pgEnum("artifact_kind", ...)` |
| No credit/gateway error codes in `lib/errors/` | ✅ | `lib/errors/codes.ts` contains only standard error codes; comment on line 5 confirms removal |
| No `AppShell` component | ✅ | No `AppShell` in any non-oldapp/non-plan source file |

---

## Findings

### ⚠️ WARNING — `Toaster` outside `ThemeProvider` (app/layout.tsx:42)

**File:** `app/layout.tsx:42`

In the original app (`oldapp/app/layout.tsx:110`), `<Toaster>` was rendered **inside** `<ThemeProvider>`. In the current layout, it's **outside**:

```tsx
<ThemeProvider ...>
    {children}
</ThemeProvider>
<Toaster />  {/* ← outside ThemeProvider */}
```

Sonner's `<Toaster>` supports a `theme` prop but won't auto-detect `next-themes` unless it's a child of the provider (or the `theme` prop is explicitly passed). Toast notifications may not match the selected theme in dark mode.

**Recommendation:** Move `<Toaster />` inside `<ThemeProvider>`, after `{children}`, to match the original behavior.

**Severity:** Warning — visual-only issue, no functional impact.

---

### ℹ️ INFO — Invalid CSS function in globals.css:170

**File:** `app/globals.css:170`

```css
::-webkit-scrollbar-thumb:hover {
    background: --alpha(var(--muted-foreground) / 0.5);
}
```

`--alpha()` is not a valid CSS function. This should be either:
- `color-mix(in srgb, var(--muted-foreground) 50%, transparent)` (wide browser support)
- Or simply removed (scrollbar hover is a subtle enhancement)

**Severity:** Info — the browser silently ignores the invalid value; scrollbar hover color simply won't change.

---

### ℹ️ INFO — Biome lint warnings (3) from upstream shadcn/ui

| File | Warning | Note |
|------|---------|------|
| `components/ui/carousel.tsx:175-181` | `a11y/useValidAriaRole` — `role="group"` on div | Inherited from shadcn/ui; standard pattern |
| `components/ui/sidebar.tsx:92` | `suspicious/noDocumentCookie` — direct `document.cookie` assignment | Inherited from shadcn/ui; cookie persistence pattern |

**Severity:** Info — not actionable, upstream shadcn/ui code.

---

## Checks Performed (All Clean)

### 1. Naming Conventions ✅

- **File names:** All kebab-case (`result.types.ts`, `use-mobile.ts`, `generate-uuid.ts`, etc.)
- **Components:** PascalCase (`ThemeProvider`, `SidebarToggle`, `Toaster`)
- **Hooks:** `use` prefix (`useIsMobile`, `useDebounce`)
- **Functions:** camelCase (`formatDate`, `generateUUID`, `cn`)
- **Constants:** SCREAMING_SNAKE_CASE (`DEFAULT_CHAT_MODEL`, `TITLE_MODEL`, `ARTIFACT_MODEL`, `MOBILE_BREAKPOINT`, `SIDEBAR_COOKIE_NAME`)
- **Types:** PascalCase (`ActionResult`, `ModelMetadata`, `ArtifactKind`, `UIArtifact`)
- **Error codes:** `type:surface:detail` convention consistently followed

### 2. No "document" References ✅

Zero occurrences of `DocumentKind`, `document_kind`, or `documents` table in source files. All such references exist only in `oldapp/` and `plan-archives/`.

### 3. Import Consistency ✅

- All cross-directory imports use `@/` alias
- Same-directory imports use `./` (e.g., `lib/types/artifact.types.ts` → `./models.types`)
- No `../` imports found in `lib/`, `components/`, or `app/`
- No barrel imports (no `index.ts` files exist)
- `lib/db/client.ts` uses `import * as schema` — required by Drizzle ORM API, not a violation

### 4. No Duplicate Logic ✅

- `ArtifactKind` defined once in `models.types.ts`, re-exported from `artifact.types.ts` for consumer convenience
- `Visibility` defined once in `models.types.ts`
- `cn()` utility single-source in `lib/utils/cn.ts`, consumed by all UI components
- Error codes defined once in `lib/errors/codes.ts`, factory methods in `lib/errors/app-error.ts`
- No duplicate type definitions across files

### 5. Dead Code ✅

- No unused exports detected (all exports are either consumed or part of the public API for future phases)
- No commented-out code blocks (proxy.ts has TODO placeholders for P2-T08, which are intentional stubs)
- No unreachable code paths

### 6. Type Consistency ✅

- Types referenced correctly: `artifact-handler.types.ts` → `artifact.types.ts` → `models.types.ts`
- `pending-chats.types.ts` → `models.types.ts` (for `Visibility`)
- `result.types.ts` → `errors/codes.ts` (for `ErrorCode`)
- `app-error.ts` → `errors/codes.ts` (for `ErrorCode` and `ERROR_STATUS_MAP`)
- No circular dependencies detected

### 7. Convention Compliance ✅

- **Strict TypeScript:** `tsconfig.json` has `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`
- **No implicit `any`:** Zero `any` types found in source files (biome enforces `noExplicitAny: "error"`)
- **Zod available:** `zod: ^3.25.76` in dependencies (schemas to be defined at point of use in later phases)
- **Server Actions:** No mutations defined yet (correct — P0 is scaffold-only)

### 8. Config Files ✅

| File | Status |
|------|--------|
| `package.json` | Correct name, scripts, dependencies |
| `tsconfig.json` | Strict mode, `@/*` paths, correct excludes |
| `next.config.ts` | `reactCompiler`, `cacheComponents`, remote image patterns |
| `biome.json` | Comprehensive rules, `noDefaultExport` with correct overrides for Next.js files |
| `postcss.config.mjs` | `@tailwindcss/postcss` plugin |
| `vercel.json` | `{ "framework": "nextjs" }` |
| `.env.example` | All required env vars documented |
| `.gitignore` | Present |
| `vitest.config.ts` | `@/` alias, correct excludes, setup file reference |
| `playwright.config.ts` | Chromium project, correct webServer config |

### 9. Test Infrastructure ✅

- `tests/setup.ts` — environment mocks for all required env vars
- `tests/mocks/auth.ts` — session mock stubs
- `tests/mocks/cache.ts` — cache mock stubs
- `tests/mocks/db.ts` — Drizzle mock stubs

---

## Assessment: CONDITIONAL PASS

Phase 0 is solid. All gate G00 requirements are met. Validation passes fully. Code quality, naming, imports, and architecture are consistent and correct.

**One warning should be addressed before or during Phase 1:**

1. **Move `<Toaster />` inside `<ThemeProvider>`** in `app/layout.tsx` — ensures toast theme sync in dark mode.

**One info-level CSS fix (optional):**

2. **Fix `--alpha()` function** in `app/globals.css:170` — replace with valid CSS or remove.

Neither issue blocks Phase 1 work.
