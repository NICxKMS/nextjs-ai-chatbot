> **Updated per redesign audit (2026-03-01)**

# Base Configuration

> Every configuration file needed for the rebuilt project.
> Each section includes the full file content or its key structure.
> Uses `proxy.ts` (NOT middleware.ts) per Next.js 16. No credit/gateway logic.

---

## 1. `package.json`


### Dependencies (Production)

Carried over from `oldapp/package.json` with version pins verified:

<!-- audit: W4-CONF-005 — Explicit dependency list populated from oldapp/package.json minus 14 removals.
     Verified: zero gateway/Cloudflare/xAI packages remain. -->

```jsonc
// ── AI SDK (3 providers: openai, google, openrouter — NO gateway, NO xAI) ──
"@ai-sdk/google": "^2.0.24",
"@ai-sdk/openai": "^2.0.54",
"@ai-sdk/provider": "2.0.0",
"@ai-sdk/react": "2.0.26",
"@openrouter/ai-sdk-provider": "^1.2.0",
"ai": "5.0.26",

// ── CodeMirror (code artifact editor) ──
"@codemirror/lang-javascript": "^6.2.2",
"@codemirror/lang-python": "^6.1.6",
"@codemirror/state": "^6.5.0",
"@codemirror/theme-one-dark": "^6.1.2",
"@codemirror/view": "^6.35.3",
"codemirror": "^6.0.1",

// ── Tiptap (rich text artifact editor) ──
"@tiptap/core": "^3.9.0",
"@tiptap/extension-mathematics": "^3.9.0",
"@tiptap/extension-table": "^3.9.0",
"@tiptap/extension-table-cell": "^3.9.0",
"@tiptap/extension-table-header": "^3.9.0",
"@tiptap/extension-table-row": "^3.9.0",
"@tiptap/markdown": "^3.9.0",
"@tiptap/pm": "^3.9.0",
"@tiptap/react": "^3.9.0",
"@tiptap/starter-kit": "^3.9.0",

// ── Observability ──
"@opentelemetry/api": "^1.9.0",
"@opentelemetry/api-logs": "^0.200.0",

// ── Radix UI (individual + unified — NOT react-icons, NOT react-select) ──
"@radix-ui/react-use-controllable-state": "^1.2.2",
"@radix-ui/react-visually-hidden": "^1.1.0",
"radix-ui": "^1.4.3",

// ── Auth / Supabase ──
"@supabase/ssr": "^0.7.0",
"@supabase/supabase-js": "^2.49.1",
"jose": "^6.1.2",

// ── Cache (Upstash Redis) ──
"@upstash/ratelimit": "^2.0.7",
"@upstash/redis": "^1.35.6",

// ── Vercel Platform ──
"@vercel/analytics": "^1.3.1",
"@vercel/blob": "^0.24.1",
"@vercel/functions": "^2.0.0",
"@vercel/otel": "^2.1.0",
"@vercel/postgres": "^0.10.0",
"@vercel/speed-insights": "^1.2.0",

// ── Database ──
"drizzle-orm": "^0.34.0",
"postgres": "^3.4.4",

// ── React / Next.js ──
"next": "^16.1.6",
"next-themes": "^0.4.6",
"react": "^19.2.3",
"react-dom": "^19.2.3",
"babel-plugin-react-compiler": "^1.0.0",

// ── UI Libraries ──
"class-variance-authority": "^0.7.1",
"clsx": "^2.1.1",
"embla-carousel-react": "^8.6.0",
"framer-motion": "^11.3.19",
"geist": "^1.3.1",
"lucide-react": "^0.446.0",
"react-data-grid": "^7.0.0-beta.47",
"react-resizable-panels": "^2.1.7",
"react-virtuoso": "^4.17.0",
"sonner": "^1.5.0",
"tailwind-merge": "^2.5.2",
"use-stick-to-bottom": "^1.1.1",

// ── Utilities ──
"date-fns": "^4.1.0",
"diff-match-patch": "^1.0.5",
"fast-deep-equal": "^3.1.3",
"nanoid": "^5.0.8",
"papaparse": "^5.5.2",
"swr": "^2.2.5",
"tokenlens": "^1.3.0",
"zod": "^3.25.76",

// ── Markdown / Streaming ──
"rehype-katex": "^7.0.1",
"remark-math": "^6.0.0",
"streamdown": "^1.3.0"
```

**Total: 63 production dependencies** (oldapp had 73; 10 production packages removed below).

### Dependencies (Dev)

<!-- audit: W4-CONF-005 — Dev dependencies from oldapp/package.json minus 4 removals (ultracite, bundle-analyzer, @google/genai, cross-env) -->
<!-- W4-CYCLE1: SOFT-013 fix — Added vitest + testing-library + coverage deps. Without these, P7 exit criteria (pnpm test:unit) is structurally impossible. -->

```jsonc
"@biomejs/biome": "^2.4.4",
"@playwright/test": "^1.57.0",
"@tailwindcss/postcss": "^4.1.13",
"@tailwindcss/typography": "^0.5.15",
"@testing-library/jest-dom": "^6.6.3",       // SOFT-013: testing infrastructure
"@testing-library/react": "^16.3.0",         // SOFT-013: testing infrastructure
"@types/d3-scale": "^4.0.8",
"@types/node": "^22.8.6",
"@types/papaparse": "^5.3.15",
"@types/pdf-parse": "^1.1.4",
"@types/react": "19.2.7",
"@types/react-dom": "^19.2.3",
"@vitest/coverage-v8": "^3.2.1",             // SOFT-013: coverage reporter
"drizzle-kit": "^0.25.0",
"postcss": "^8",
"tailwindcss": "^4.1.13",
"tsx": "^4.19.1",
"typescript": "^5.6.3",
"vitest": "^3.2.1"                            // SOFT-013: test runner
```

**Total: 19 dev dependencies** (was 15; +4 from SOFT-013 testing infrastructure).

### Removed from Old App

| Package | Reason |
|---------|--------|
| `ultracite` | Replaced by Biome directly |
| `@next/bundle-analyzer` | Not needed in rebuild (add later if needed) |
| `@google/genai` | Dev dependency, not used in production |
| `cross-env` | Not needed (Playwright handles env natively) |
| `@radix-ui/react-icons` | Replaced by lucide-react consistently |
| `@radix-ui/react-select` | Use radix-ui unified package |
| `tailwindcss-animate` | Tailwind v4 handles animations natively |
| `usehooks-ts` | Hooks colocated in features, no blanket utility lib |
| `import-in-the-middle` | OTel-specific, evaluate if still needed |
| `dotenv` | Next.js handles .env natively |
| `@ai-sdk/gateway` | No credit/gateway system — cleanup-inventory §1 #8 <!-- audit: W4-SC-03 --> |
| `ai-gateway-provider` | Not in ProviderId — only openai, google, openrouter <!-- audit: W4-SC-03 --> |
| `@ai-sdk/xai` | Not in ProviderId <!-- audit: W4-SC-03 --> |
| `workers-ai-provider` | Not in ProviderId <!-- audit: W4-SC-03 --> |

---

## 2. `next.config.ts`

<!-- audit: W4-E10 — Code block added (was missing, only key decisions listed). Content from P0-T01 task description + redesign. -->

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    cacheComponents: true, // Next.js 16 component-level caching
    ppr: 'incremental',    // Partial Prerendering
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
}

export default nextConfig
```

**Key decisions:**
- `reactCompiler: true` — React Compiler for automatic memoization
- `cacheComponents: true` — Enable component-level caching (Next.js 16) <!-- audit: SC-V4 -->
- `ppr: 'incremental'` — Partial Prerendering for streaming + static hybrid
- No `serverExternalPackages` unless needed by specific dependencies

---

## 3. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    },
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "oldapp",
    "plan"
  ]
}
```

**Key settings:**
- `strict: true` — AGENTS.md requirement
- `noUncheckedIndexedAccess: true` — Safer array/object access
- `paths: { "@/*": ["./*"] }` — Single alias, all imports via `@/`
- `oldapp` and `plan` excluded from compilation

---

## 4. `biome.json`

<!-- audit: W4-CONF-008 — Full biome.json spec added. Was placeholder text only.
     noDefaultExport override covers all Next.js convention files that require default exports. -->

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "includes": [
      "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.json", "**/*.mjs",
      "!!**/node_modules", "!!**/.next", "!!**/dist", "!!**/build",
      "!!**/drizzle", "!!**/*.min.js", "!!**/pnpm-lock.yaml",
      "!!**/oldapp", "!!**/plan", "!!**/components/ai-elements"
    ]
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "tab",
    "indentWidth": 4,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraBooleanCast": "error",
        "noUselessCatch": "error",
        "noUselessThisAlias": "error",
        "noUselessTypeConstraint": "error"
      },
      "correctness": {
        "noConstAssign": "error",
        "noConstantCondition": "warn",
        "noEmptyCharacterClassInRegex": "error",
        "noEmptyPattern": "error",
        "noGlobalObjectCalls": "error",
        "noInvalidConstructorSuper": "error",
        "noInvalidBuiltinInstantiation": "error",
        "noNonoctalDecimalEscape": "error",
        "noPrecisionLoss": "error",
        "noSelfAssign": "error",
        "noSetterReturn": "error",
        "noSwitchDeclarations": "error",
        "noUndeclaredVariables": "error",
        "noUnreachable": "error",
        "noUnreachableSuper": "error",
        "noUnsafeFinally": "error",
        "noUnsafeOptionalChaining": "error",
        "noUnusedLabels": "error",
        "noUnusedVariables": "error",
        "useIsNan": "error",
        "useValidForDirection": "error",
        "useYield": "error"
      },
      "suspicious": {
        "noAsyncPromiseExecutor": "error",
        "noCatchAssign": "error",
        "noClassAssign": "error",
        "noCompareNegZero": "error",
        "noControlCharactersInRegex": "error",
        "noDebugger": "error",
        "noDuplicateCase": "error",
        "noDuplicateClassMembers": "error",
        "noDuplicateObjectKeys": "error",
        "noDuplicateParameters": "error",
        "noEmptyBlockStatements": "warn",
        "noExplicitAny": "error",
        "noFallthroughSwitchClause": "error",
        "noFunctionAssign": "error",
        "noGlobalAssign": "error",
        "noImportAssign": "error",
        "noMisleadingCharacterClass": "error",
        "noPrototypeBuiltins": "error",
        "noRedeclare": "error",
        "noShadowRestrictedNames": "error",
        "noUnsafeDeclarationMerging": "error",
        "noUnsafeNegation": "error",
        "useGetterReturn": "error"
      },
      "style": {
        "noDefaultExport": "error",
        "useConst": "error",
        "useSingleVarDeclarator": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "all",
      "semicolons": "asNeeded",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false,
      "quoteStyle": "double",
      "attributePosition": "auto"
    },
    "globals": ["React"]
  },
  "overrides": [
    {
      "includes": [
        "proxy.ts",
        "**/page.tsx",
        "**/layout.tsx",
        "**/route.ts",
        "**/error.tsx",
        "**/global-error.tsx",
        "**/loading.tsx",
        "**/not-found.tsx"
      ],
      "linter": {
        "rules": {
          "style": {
            "noDefaultExport": "off"
          }
        }
      }
    },
    {
      "includes": [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx"
      ],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    }
  ]
}
```

**Key decisions:**
- `noExplicitAny: "error"` — AGENTS.md requirement (oldapp has `"warn"` — must be upgraded)
- `noDefaultExport: "error"` globally, `"off"` for Next.js convention files (`proxy.ts`, `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`)
- `components/ai-elements` excluded — read-only legacy reference, never lint
- `oldapp` and `plan` excluded — not part of rebuild
- `organizeImports: true` — automatic import sorting
- `lineWidth: 100` — wider than oldapp's 80 for readability
- `indentStyle: "tab"` — matches existing project convention

---

## 5. `postcss.config.mjs`

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

Tailwind v4 uses `@tailwindcss/postcss` plugin directly. No `tailwind.config.ts` file needed — Tailwind v4 uses CSS-based configuration in `globals.css`.

---

## 6. `app/globals.css`

**Note**: The exact CSS token values should be copied verbatim from `oldapp/app/globals.css` during scaffold implementation. The above shows the structure.

---

## 7. `proxy.ts` (Base Structure, Next.js 16)

> Next.js 16 renamed `middleware.js` to `proxy.js`. The file exports a `proxy()` function
> and a `config` with `matcher`. Identical API, new name.

```typescript
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip static assets and health check
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 2. Auth guard (Phase 02)
  // Redirect unauthenticated users to /login for protected routes
  // const session = await resolveSessionFromCookies(request)
  // if (!session && isProtectedRoute(pathname)) return redirectToLogin(request)

  // 3. Guest token rotation (Phase 02)
  // if (isGuestToken(request) && tokenExpiresWithin(30 * 60)) await rotateGuestToken(request)

  // 4. Device detection header
  const response = NextResponse.next()
  const userAgent = request.headers.get('user-agent') ?? ''
  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)
  response.headers.set('x-device-type', isMobile ? 'mobile' : 'desktop')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
```

**Note**: The proxy starts minimal and gains functionality as phases complete:
- Phase 0: Device detection only
- Phase 2: + Auth guard + guest token rotation

**Key difference from old plan:** Function exported as `proxy()` not `middleware()`. File is `proxy.ts` not `middleware.ts`.

---

## 8. Environment Variables

### `.env.example`

```bash
# ── Database ──
DATABASE_URL=postgresql://user:pass@host:5432/db

# ── Cache (Upstash Redis) ──
CACHE_KV_REST_API_URL=https://...upstash.io
CACHE_KV_REST_API_TOKEN=...

# ── Auth (Supabase) ──
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_JWT_SECRET=...
GUEST_JWT_SECRET=...

# ── AI Providers (at least one required) ──
# AI_GATEWAY_API_KEY — REMOVED (no credit/gateway system)
OPENAI_API_KEY=               # OpenAI direct
GOOGLE_GENERATIVE_AI_API_KEY=  # Google Gemini direct
OPENROUTER_API_KEY=           # OpenRouter proxy

# ── Storage ──
BLOB_READ_WRITE_TOKEN=        # Vercel Blob (file uploads)

# ── Monitoring (optional) ──
VERCEL_OIDC_TOKEN=            # Vercel OIDC (auto-injected on Vercel)
```

### Required vs Optional

| Variable | Required | Used By |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `lib/db/client.ts` |
| `CACHE_KV_REST_API_URL` | Yes | `lib/cache/client.ts` |
| `CACHE_KV_REST_API_TOKEN` | Yes | `lib/cache/client.ts` |
| `SUPABASE_URL` | Yes | `lib/auth/session.ts`, JWT validation |
| `SUPABASE_ANON_KEY` | Yes | `lib/auth/session.ts`, client-side Supabase |
| `SUPABASE_JWT_SECRET` | Yes | `lib/auth/session.ts` |
| `GUEST_JWT_SECRET` | Yes | `features/auth/lib/guest.ts`, `proxy.ts` |
| At least one AI provider key | Yes | `lib/ai/registry.ts` |
| `BLOB_READ_WRITE_TOKEN` | For uploads | `app/api/files/upload/route.ts` |

---

## 9. `vercel.json`

```json
{
  "framework": "nextjs"
}
```

Minimal — Next.js handles most Vercel configuration automatically. Add rewrites/redirects if needed during build verification.

---

## 10. `instrumentation.ts`

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // OpenTelemetry setup for server-side tracing
    // Only import when running in Node.js (not Edge)
  }
}
```

---

## 11. `instrumentation-client.ts`

```typescript
// Client-side instrumentation (Vercel Web Vitals, etc.)
// Minimal — only add if Vercel Analytics doesn't cover needs
export {}
```

---

## Configuration Validation Checklist

Before moving past Phase 0 (Scaffold):

- [ ] `pnpm install` completes without errors
- [ ] `pnpm typecheck` passes (empty project, no source errors)
- [ ] `pnpm format` passes (Biome formats correctly)
- [ ] `pnpm lint` passes (Biome lints correctly)
- [ ] `pnpm dev` starts the dev server
- [ ] Root layout renders (blank page with ThemeProvider)
- [ ] Path alias `@/` resolves correctly in imports
- [ ] `proxy.ts` exports `proxy()` function (NOT middleware.ts)
- [ ] `oldapp/` and `plan/` excluded from compilation
- [ ] `components/ai-elements/` excluded from linting
- [ ] DB schema uses `Artifact` table (NOT Document)
