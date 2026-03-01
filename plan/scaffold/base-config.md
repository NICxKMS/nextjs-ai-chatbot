> **Updated per redesign audit (2026-03-01)**

# Base Configuration

> Every configuration file needed for the rebuilt project.
> Each section includes the full file content or its key structure.
> Uses `proxy.ts` (NOT middleware.ts) per Next.js 16. No credit/gateway logic.

---

## 1. `package.json`


### Dependencies (Production)

Carried over from `oldapp/package.json` with version pins verified:



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

---

## 2. `next.config.ts`



**Key decisions:**
- `reactCompiler: true` — React Compiler for automatic memoization
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
Read Config in node module for latest info, your knowledge is outdated


**Key decisions:**
- `noExplicitAny: "error"` — AGENTS.md requirement
- `components/ai-elements` ignored — read-only, never lint
- Default export allowed only for Next.js file conventions via override
- `indentStyle: "tab"` — match existing project convention (verify against oldapp)

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
GEMINI_API_KEY=               # Google Gemini direct
OPENROUTER_API_KEY=           # OpenRouter proxy
CLOUDFLARE_ACCOUNT_ID=        # Cloudflare Workers AI
CLOUDFLARE_API_KEY=           # Cloudflare Workers AI
CLOUDFLARE_AI_GATEWAY_NAME=   # Cloudflare AI Gateway
CLOUDFLARE_AI_GATEWAY_API_KEY=# Cloudflare AI Gateway

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
| `SUPABASE_JWT_SECRET` | Yes | `features/auth/lib/session.ts` |
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
