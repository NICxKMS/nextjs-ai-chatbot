> **Updated per redesign audit (2026-03-01)**

# Base Configuration

> Every configuration file needed for the rebuilt project.
> Each section includes the full file content or its key structure.
> Uses `proxy.ts` (NOT middleware.ts) per Next.js 16. No credit/gateway logic.

---

## 1. `package.json`

### Scripts

```json
{
  "name": "ai-assistant",
  "version": "4.0.0",
  "private": true,
  "packageManager": "pnpm@10.26.0",
  "scripts": {
    "dev": "next dev",
    "build": "tsx lib/db/migrate && next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx lib/db/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push"
  }
}
```

### Dependencies (Production)

Carried over from `oldapp/package.json` with version pins verified:

```json
{
  "dependencies": {
    "next": "16.0.10",
    "react": "19.2.3",
    "react-dom": "19.2.3",

    "ai": "5.0.26",
    "@ai-sdk/react": "2.0.26",
    "@ai-sdk/provider": "2.0.0",
    // "@ai-sdk/gateway" REMOVED — no credit/gateway system
    "@ai-sdk/google": "^2.0.24",
    "@ai-sdk/openai": "^2.0.54",
    "@ai-sdk/xai": "2.0.13",
    "@openrouter/ai-sdk-provider": "^1.2.0",
    "workers-ai-provider": "^2.0.0",
    "ai-gateway-provider": "^2.0.1",

    "drizzle-orm": "^0.34.0",
    "postgres": "^3.4.4",
    "@upstash/redis": "^1.35.6",
    "@upstash/ratelimit": "^2.0.7",

    "@supabase/ssr": "^0.7.0",
    "@supabase/supabase-js": "^2.49.1",
    "jose": "^6.1.2",

    "@tiptap/core": "^3.9.0",
    "@tiptap/react": "^3.9.0",
    "@tiptap/starter-kit": "^3.9.0",
    "@tiptap/markdown": "^3.9.0",
    "@tiptap/pm": "^3.9.0",
    "@tiptap/extension-mathematics": "^3.9.0",
    "@tiptap/extension-table": "^3.9.0",
    "@tiptap/extension-table-cell": "^3.9.0",
    "@tiptap/extension-table-header": "^3.9.0",
    "@tiptap/extension-table-row": "^3.9.0",

    "@codemirror/lang-python": "^6.1.6",
    "@codemirror/state": "^6.5.0",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/view": "^6.35.3",
    "codemirror": "^6.0.1",

    "react-data-grid": "7.0.0-beta.47",
    "papaparse": "^5.5.2",
    "react-resizable-panels": "^2.1.7",

    "radix-ui": "^1.4.3",
    "@radix-ui/react-use-controllable-state": "^1.2.2",
    "@radix-ui/react-visually-hidden": "^1.1.0",

    "lucide-react": "^0.446.0",
    "geist": "^1.3.1",
    "next-themes": "^0.4.6",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",

    "swr": "^2.2.5",
    "sonner": "^1.5.0",
    "react-virtuoso": "^4.17.0",
    "framer-motion": "^11.3.19",
    "embla-carousel-react": "^8.6.0",
    "use-stick-to-bottom": "^1.1.1",

    "zod": "^3.25.76",
    "nanoid": "^5.0.8",
    "date-fns": "^4.1.0",
    "fast-deep-equal": "^3.1.3",
    "diff-match-patch": "^1.0.5",
    "streamdown": "^1.3.0",

    "@vercel/analytics": "^1.3.1",
    "@vercel/speed-insights": "^1.2.0",
    "@vercel/blob": "^0.24.1",
    "@vercel/functions": "^2.0.0",
    "@vercel/otel": "^2.1.0",
    "@vercel/postgres": "^0.10.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/api-logs": "^0.200.0",

    "rehype-katex": "^7.0.1",
    "remark-math": "^6.0.0",
    "tokenlens": "1.3.0",
    "dompurify": "latest",
    "shiki": "latest",

    "babel-plugin-react-compiler": "^1.0.0"
  }
}
```

### Dependencies (Dev)

```json
{
  "devDependencies": {
    "@biomejs/biome": "2.2.2",
    "typescript": "^5.6.3",
    "drizzle-kit": "^0.25.0",
    "tsx": "^4.19.1",

    "tailwindcss": "^4.1.13",
    "@tailwindcss/postcss": "^4.1.13",
    "@tailwindcss/typography": "^0.5.15",
    "postcss": "^8",

    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@playwright/test": "^1.57.0",

    "@types/node": "^22.8.6",
    "@types/react": "19.2.7",
    "@types/react-dom": "19.2.3",
    "@types/papaparse": "^5.3.15",
    "@types/dompurify": "latest"
  }
}
```

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

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    ppr: 'incremental',
  },
  images: {
    remotePatterns: [
      { hostname: 'avatar.vercel.sh' },
    ],
  },
  // Redirect old routes if needed
  async redirects() {
    return []
  },
}

export default nextConfig
```

**Key decisions:**
- `reactCompiler: true` — React Compiler for automatic memoization
- `ppr: 'incremental'` — Partial Prerendering (static shell + dynamic Suspense)
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

```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.2/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": { "maxAllowedComplexity": 25 }
        }
      },
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "noDefaultExport": "off",
        "useNamingConvention": "off"
      }
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      "oldapp",
      "plan",
      "public",
      "components/ai-elements"
    ]
  },
  "overrides": [
    {
      "include": ["app/**/page.tsx", "app/**/layout.tsx", "app/**/route.ts", "app/**/error.tsx", "app/**/loading.tsx", "app/**/global-error.tsx", "next.config.ts", "proxy.ts", "instrumentation.ts", "instrumentation-client.ts"],
      "linter": {
        "rules": {
          "style": {
            "noDefaultExport": "off"
          }
        }
      }
    }
  ]
}
```

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

```css
@import 'tailwindcss';
@plugin '@tailwindcss/typography';

@custom-variant dark (&:is(.dark *));

:root {
  /* Theme tokens — carried over from oldapp/app/globals.css */
  /* Light theme */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --sidebar-background: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark theme tokens (carry over from oldapp) */
}

/* Utility overrides */
@utility scrollbar-thin {
  scrollbar-width: thin;
}

/* Print styles, animations, etc. — copy from oldapp/app/globals.css */
```

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
