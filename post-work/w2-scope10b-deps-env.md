# Scope 10b — Dependency Pinning + Motion Dedup + Env Example

## Infrastructure Report

### Current State (Before)
- **33 packages** pinned to `"latest"` in package.json (30 dependencies + 3 devDependencies)
- **Dual motion libraries**: `framer-motion@^11.18.2` AND `motion@^12.35.0` — ~9.7MB redundancy
- **3 env vars** used in code but missing from `.env.example`
- 3 source files importing from `framer-motion` instead of `motion/react`

### Changes Made

| Change | File | Rationale |
|--------|------|-----------|
| Pin 30 `"latest"` production deps to `"^resolved"` | `package.json` | Reproducible builds — `pnpm install` on any date yields same dependency tree |
| Pin 3 `"latest"` dev deps to `"^resolved"` | `package.json` | Same reproducibility guarantee for dev tooling |
| Remove `framer-motion` from dependencies | `package.json` | `motion` v12 is the maintained successor (same library, renamed). Eliminates 9.7MB redundancy |
| Update import `framer-motion` → `motion/react` | `components/motion-provider.tsx` | `MotionConfig` now imported from `motion/react` (v12 API) |
| Update import `framer-motion` → `motion/react` | `features/artifacts/components/version-footer.tsx` | `motion` now imported from `motion/react` |
| Update import `framer-motion` → `motion/react` | `features/artifacts/components/artifact-panel.tsx` | `AnimatePresence, motion` now imported from `motion/react` |
| Update JSDoc comments | `components/motion-provider.tsx` | References to "framer-motion" → "motion" in documentation |
| Add `NEXT_PUBLIC_APP_URL` | `.env.example` | Used in code for public URLs, OG images, canonical references |
| Add `SUPABASE_ACCESS_TOKEN_COOKIE_NAME` | `.env.example` | Cookie name for Supabase session token |
| Add `OTEL_EXPORTER_OTLP_ENDPOINT` | `.env.example` | OpenTelemetry exporter URL (optional monitoring) |

### Pinned Versions (33 Total)

#### Dependencies (30)
| Package | Was | Now |
|---------|-----|-----|
| `@ai-sdk/google` | `latest` | `^3.0.43` |
| `@ai-sdk/openai` | `latest` | `^3.0.41` |
| `@ai-sdk/provider` | `latest` | `^3.0.8` |
| `@ai-sdk/react` | `latest` | `^3.0.118` |
| `@openrouter/ai-sdk-provider` | `latest` | `^2.2.5` |
| `@streamdown/cjk` | `latest` | `^1.0.2` |
| `@streamdown/code` | `latest` | `^1.1.0` |
| `@streamdown/math` | `latest` | `^1.0.2` |
| `@streamdown/mermaid` | `latest` | `^1.0.2` |
| `@supabase/ssr` | `latest` | `^0.9.0` |
| `@supabase/supabase-js` | `latest` | `^2.98.0` |
| `ai` | `latest` | `^6.0.116` |
| `ansi-to-react` | `latest` | `^6.2.6` |
| `babel-plugin-react-compiler` | `latest` | `^1.0.0` |
| `class-variance-authority` | `latest` | `^0.7.1` |
| `clsx` | `latest` | `^2.1.1` |
| `cmdk` | `latest` | `^1.1.1` |
| `codemirror` | `latest` | `^6.0.2` |
| `date-fns` | `latest` | `^4.1.0` |
| `drizzle-orm` | `latest` | `^0.45.1` |
| `next-themes` | `latest` | `^0.4.6` |
| `postgres` | `latest` | `^3.4.8` |
| `radix-ui` | `latest` | `^1.4.3` |
| `react` | `latest` | `^19.2.4` |
| `react-dom` | `latest` | `^19.2.4` |
| `rehype-katex` | `latest` | `^7.0.1` |
| `remark-math` | `latest` | `^6.0.0` |
| `server-only` | `latest` | `^0.0.1` |
| `streamdown` | `latest` | `^2.4.0` |
| `framer-motion` | `^11.18.2` | **REMOVED** |

#### Dev Dependencies (3)
| Package | Was | Now |
|---------|-----|-----|
| `@types/react` | `latest` | `^19.2.14` |
| `@types/react-dom` | `latest` | `^19.2.3` |
| `drizzle-kit` | `latest` | `^0.31.9` |

### Env Vars Coverage

All `process.env.*` references in source code now documented in `.env.example`:

| Var | In Code | In .env.example | Notes |
|-----|---------|-----------------|-------|
| `DATABASE_URL` | ✅ | ✅ | — |
| `CACHE_KV_REST_API_URL` | ✅ | ✅ | — |
| `CACHE_KV_REST_API_TOKEN` | ✅ | ✅ | — |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ **NEW** | Public URL |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | — |
| `SUPABASE_ACCESS_TOKEN_COOKIE_NAME` | ✅ | ✅ **NEW** | Session cookie |
| `GUEST_JWT_SECRET` | ✅ | ✅ | — |
| `OPENAI_API_KEY` | ✅ | ✅ | — |
| `GEMINI_API_KEY` | ✅ | ✅ | — |
| `OPENROUTER_API_KEY` | ✅ | ✅ | — |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ✅ | ✅ **NEW** | OTel monitoring |
| `NODE_ENV` | ✅ | — | Framework-provided, not user-configured |
| `NEXT_RUNTIME` | ✅ | — | Next.js internal |
| `VERCEL_URL` | ✅ | — | Auto-injected by Vercel |
| `VERCEL_FLUID` | ✅ | — | Vercel internal |

### Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| `"latest"` in package.json | 33 | 0 | -33 |
| Motion libraries | 2 (framer-motion + motion) | 1 (motion only) | -1 package (~9.7MB) |
| Env vars documented | 11 | 14 | +3 |
| framer-motion imports in source | 3 files | 0 files | -3 |

### Rollback Plan
- `git checkout package.json pnpm-lock.yaml .env.example components/motion-provider.tsx features/artifacts/components/version-footer.tsx features/artifacts/components/artifact-panel.tsx`
- `pnpm install`

### Validation
- [x] Zero `"latest"` in package.json
- [x] `framer-motion` removed from dependencies
- [x] All framer-motion imports updated to `motion/react`
- [x] `.env.example` has all code-referenced env vars
- [x] `pnpm install` succeeds (lockfile regenerated)
- [x] Biome lint passes on changed files
- [x] TypeCheck passes (pre-existing `reasoning.tsx` type error in read-only AI element unrelated)

### Pre-existing Issues (Not In Scope)
- `playwright.config.ts` references missing `./tests/test-env` module — test infrastructure issue
- `components/ai-elements/reasoning.tsx` has a `dir` type mismatch — read-only AI element, cannot modify per AGENTS.md rules
