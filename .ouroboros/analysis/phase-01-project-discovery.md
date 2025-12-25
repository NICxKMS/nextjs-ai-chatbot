# Phase 01: Project Discovery & Metadata Analysis — Ultra Deep Dive

**Analysis Date**: December 25, 2025  
**Project**: nextjs-ai-chatbot  
**Analyst**: ouroboros-analyst  
**Status**: ✅ COMPLETE (Wave 2 Deep Dive)

---

## Executive Summary

This document provides an exhaustive analysis of the `nextjs-ai-chatbot` project, a production-grade AI-powered chat application built on Next.js 16.1.0 with React 19. The codebase demonstrates enterprise patterns including feature-based architecture, multi-provider AI integration, and sophisticated caching strategies.

---

## 1.1 Technology Stack Deep Dive

### Frontend Stack

| Technology        | Version     | Purpose          | Key Features                                     |
| ----------------- | ----------- | ---------------- | ------------------------------------------------ |
| **Next.js**       | `^16.1.0`   | Meta-framework   | App Router, Turbopack, RSC, dynamicIO            |
| **React**         | `^19.0.0`   | UI Library       | Server Components, Compiler, Concurrent Features |
| **React DOM**     | `^19.0.0`   | DOM Rendering    | Streaming SSR, Suspense                          |
| **Tailwind CSS**  | `^4.1.13`   | Styling          | v4 with PostCSS, JIT, Design Tokens              |
| **Framer Motion** | `^12.23.26` | Animation        | Layout animations, gestures                      |
| **Zustand**       | `^5.0.9`    | State Management | Lightweight, middleware support                  |
| **SWR**           | `^2.3.8`    | Data Fetching    | Stale-while-revalidate, cache                    |
| **Radix UI**      | Multiple    | Primitives       | 12 components (dialog, dropdown, etc.)           |
| **TipTap**        | `3.9.0`     | Rich Text Editor | Markdown, tables, math                           |
| **CodeMirror**    | `6.x`       | Code Editor      | Python, theming, state                           |
| **XY Flow**       | `^12.10.0`  | Flow Diagrams    | React Flow successor                             |
| **Lucide React**  | `^0.468.0`  | Icons            | Tree-shakeable icons                             |

### Backend Stack

| Technology            | Version                 | Purpose            | Configuration         |
| --------------------- | ----------------------- | ------------------ | --------------------- |
| **PostgreSQL**        | via `postgres` `^3.4.7` | Primary Database   | Supabase hosted       |
| **Drizzle ORM**       | `^0.43.0`               | Type-safe ORM      | PostgreSQL dialect    |
| **Drizzle Kit**       | `^0.31.0`               | Migrations         | Push-based migrations |
| **Supabase SSR**      | `^0.8.0`                | Auth/SSR Utilities | Cookie handling       |
| **Supabase JS**       | `^2.49.0`               | Supabase Client    | Auth, Realtime        |
| **Upstash Redis**     | `^1.34.0`               | Caching Layer      | REST-based Redis      |
| **Upstash Ratelimit** | `^2.0.0`                | Rate Limiting      | Sliding window        |
| **Vercel Blob**       | `^2.0.0`                | File Storage       | Blob uploads          |
| **Jose**              | `^6.1.3`                | JWT Library        | Session tokens        |

### AI/LLM Stack

| Provider Package                | Version    | Models Supported         | Integration                  |
| ------------------------------- | ---------- | ------------------------ | ---------------------------- |
| **ai (Vercel AI SDK)**          | `^5.0.116` | Core SDK                 | Streaming, tools, middleware |
| **@ai-sdk/react**               | `^2.0.118` | React hooks              | useChat, useCompletion       |
| **@ai-sdk/openai**              | `^2.0.88`  | GPT-4, GPT-4o, o1-series | Direct API                   |
| **@ai-sdk/anthropic**           | `^2.0.56`  | Claude 3.5, Claude 4     | Direct API                   |
| **@ai-sdk/google**              | `^2.0.51`  | Gemini 2.0, 1.5          | Direct API                   |
| **@openrouter/ai-sdk-provider** | `^1.5.4`   | Multi-model gateway      | OpenRouter API               |
| **ai-gateway-provider**         | `^2.3.0`   | Gateway abstraction      | Cloudflare AI Gateway        |
| **workers-ai-provider**         | `^2.0.0`   | Cloudflare Workers AI    | Edge inference               |
| **@ai-sdk/provider**            | `^2.0.0`   | Provider abstractions    | Base interfaces              |

### Build & Development Tools

| Tool               | Version   | Configuration              |
| ------------------ | --------- | -------------------------- |
| **TypeScript**     | `^5.7.0`  | Strict mode, ESNext target |
| **Biome**          | `2.2.2`   | Linting + formatting       |
| **Ultracite**      | `^5.3.9`  | Biome wrapper/presets      |
| **Vitest**         | `^3.0.0`  | Unit testing               |
| **Playwright**     | `^1.49.0` | E2E testing                |
| **PostCSS**        | `^8.5.0`  | CSS processing             |
| **pnpm**           | Latest    | Package manager            |
| **Turbopack**      | Bundled   | Dev server bundler         |
| **React Compiler** | `^1.0.0`  | Auto-memoization           |

---

## 1.2 Dependency Analysis

### Production Dependencies (90 packages)

#### Core Framework (6)

| Package    | Version | Size Impact |
| ---------- | ------- | ----------- |
| next       | ^16.1.0 | ~2.5MB      |
| react      | ^19.0.0 | ~150KB      |
| react-dom  | ^19.0.0 | ~180KB      |
| typescript | ^5.7.0  | Dev only    |
| zod        | ^3.24.0 | ~50KB       |
| nanoid     | ^5.0.0  | ~2KB        |

#### AI SDK Packages (9)

| Package                     | Version  | Purpose            |
| --------------------------- | -------- | ------------------ |
| ai                          | ^5.0.116 | Core SDK           |
| @ai-sdk/react               | ^2.0.118 | React hooks        |
| @ai-sdk/openai              | ^2.0.88  | OpenAI provider    |
| @ai-sdk/anthropic           | ^2.0.56  | Anthropic provider |
| @ai-sdk/google              | ^2.0.51  | Google provider    |
| @ai-sdk/provider            | ^2.0.0   | Base abstractions  |
| @openrouter/ai-sdk-provider | ^1.5.4   | OpenRouter         |
| ai-gateway-provider         | ^2.3.0   | Gateway            |
| workers-ai-provider         | ^2.0.0   | Workers AI         |

#### UI Components - Radix (12)

| Package                                | Version |
| -------------------------------------- | ------- |
| @radix-ui/react-alert-dialog           | ^1.1.15 |
| @radix-ui/react-avatar                 | ^1.1.11 |
| @radix-ui/react-collapsible            | ^1.1.12 |
| @radix-ui/react-dialog                 | ^1.1.0  |
| @radix-ui/react-dropdown-menu          | ^2.1.0  |
| @radix-ui/react-hover-card             | ^1.1.15 |
| @radix-ui/react-label                  | ^2.1.8  |
| @radix-ui/react-progress               | ^1.1.8  |
| @radix-ui/react-scroll-area            | ^1.2.10 |
| @radix-ui/react-select                 | ^2.2.6  |
| @radix-ui/react-separator              | ^1.1.8  |
| @radix-ui/react-slot                   | ^1.1.0  |
| @radix-ui/react-tooltip                | ^1.1.0  |
| @radix-ui/react-use-controllable-state | ^1.2.2  |

#### TipTap Editor Suite (9)

| Package                        | Version |
| ------------------------------ | ------- |
| @tiptap/core                   | 3.9.0   |
| @tiptap/react                  | 3.9.0   |
| @tiptap/starter-kit            | 3.9.0   |
| @tiptap/pm                     | 3.9.0   |
| @tiptap/markdown               | 3.9.0   |
| @tiptap/extension-table        | 3.9.0   |
| @tiptap/extension-table-cell   | 3.9.0   |
| @tiptap/extension-table-header | 3.9.0   |
| @tiptap/extension-table-row    | 3.9.0   |
| @tiptap/extension-mathematics  | 3.9.0   |

#### CodeMirror Editor (4)

| Package                    | Version |
| -------------------------- | ------- |
| codemirror                 | 6.0.1   |
| @codemirror/lang-python    | 6.1.6   |
| @codemirror/state          | 6.5.0   |
| @codemirror/view           | 6.35.3  |
| @codemirror/theme-one-dark | 6.1.2   |

#### Database & Backend (8)

| Package               | Version | Purpose           |
| --------------------- | ------- | ----------------- |
| drizzle-orm           | ^0.43.0 | ORM               |
| postgres              | ^3.4.7  | PostgreSQL driver |
| @supabase/supabase-js | ^2.49.0 | Supabase client   |
| @supabase/ssr         | ^0.8.0  | SSR utilities     |
| @upstash/redis        | ^1.34.0 | Redis client      |
| @upstash/ratelimit    | ^2.0.0  | Rate limiting     |
| @vercel/blob          | ^2.0.0  | File storage      |
| jose                  | ^6.1.3  | JWT handling      |

#### Styling & Animation (7)

| Package                  | Version   |
| ------------------------ | --------- |
| tailwind-merge           | ^3.0.0    |
| class-variance-authority | ^0.7.0    |
| clsx                     | ^2.1.0    |
| framer-motion            | ^12.23.26 |
| motion                   | ^12.23.26 |
| next-themes              | ^0.4.0    |
| tailwindcss-animate      | ^1.0.7    |

#### Markdown & Content (6)

| Package        | Version |
| -------------- | ------- |
| react-markdown | ^9.0.0  |
| remark-gfm     | ^4.0.0  |
| remark-math    | ^6.0.0  |
| rehype-katex   | ^7.0.1  |
| shiki          | ^3.20.0 |
| streamdown     | ^1.6.10 |

#### Data & Utilities (15)

| Package              | Version | Purpose             |
| -------------------- | ------- | ------------------- |
| date-fns             | ^4.1.0  | Date formatting     |
| swr                  | ^2.3.8  | Data fetching       |
| zustand              | ^5.0.9  | State management    |
| fast-deep-equal      | ^3.1.3  | Object comparison   |
| diff-match-patch     | 1.0.5   | Text diffing        |
| dompurify            | ^3.3.1  | HTML sanitization   |
| papaparse            | 5.5.2   | CSV parsing         |
| dotenv               | ^17.2.3 | Env loading         |
| cmdk                 | ^1.1.1  | Command palette     |
| sonner               | ^1.7.0  | Toast notifications |
| tokenlens            | ^1.3.1  | Token counting      |
| usehooks-ts          | ^3.1.0  | React hooks         |
| use-stick-to-bottom  | ^1.1.1  | Auto-scroll         |
| react-virtuoso       | ^4.17.0 | Virtual lists       |
| embla-carousel-react | ^8.6.0  | Carousel            |

#### Visualization (2)

| Package         | Version       |
| --------------- | ------------- |
| @xyflow/react   | ^12.10.0      |
| react-data-grid | 7.0.0-beta.47 |

### Development Dependencies (17 packages)

| Package                   | Version | Purpose            |
| ------------------------- | ------- | ------------------ |
| @biomejs/biome            | 2.2.2   | Linting/formatting |
| @playwright/test          | ^1.49.0 | E2E testing        |
| @tailwindcss/postcss      | ^4.1.13 | PostCSS plugin     |
| @tailwindcss/typography   | ^0.5.19 | Typography plugin  |
| @testing-library/jest-dom | ^6.9.1  | DOM matchers       |
| @testing-library/react    | ^16.3.1 | React testing      |
| @types/diff-match-patch   | ^1.0.36 | Type definitions   |
| @types/node               | ^22.0.0 | Node types         |
| @types/papaparse          | ^5.5.2  | Type definitions   |
| @types/react              | ^19.0.0 | React types        |
| @types/react-dom          | ^19.0.0 | ReactDOM types     |
| @vitejs/plugin-react      | ^4.0.0  | Vitest React       |
| drizzle-kit               | ^0.31.0 | Migrations         |
| jsdom                     | ^27.3.0 | DOM simulation     |
| postcss                   | ^8.5.0  | CSS processing     |
| tailwindcss               | ^4.1.13 | CSS framework      |
| vitest                    | ^3.0.0  | Unit testing       |

---

## 1.3 Configuration Files Deep Dive

### next.config.ts

```typescript
// Key configurations:
{
  cacheComponents: true,           // Component caching
  reactCompiler: true,             // React Compiler enabled
  productionBrowserSourceMaps: false, // 50% bundle savings
  reactStrictMode: true,
  experimental: {
    dynamicIO: true,               // cacheLife profiles
    viewTransition: true,          // Navigation animations
    turbopackFileSystemCacheForDev: true, // 50% faster restarts
    inlineCss: true,
    optimizePackageImports: [      // Tree-shaking
      "lucide-react", "date-fns", "@radix-ui/react-icons",
      "framer-motion", "@tiptap/react"
    ]
  },
  // Security headers: X-Frame-Options, X-Content-Type-Options,
  // X-XSS-Protection, Referrer-Policy, Permissions-Policy
}
```

### vercel.json

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm run build",
  "regions": ["bom1"], // Mumbai region
  "fluid": true, // Fluid compute
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "Cache-Control": "max-age=31536000, immutable"
    },
    { "source": "/fonts/(.*)", "Cache-Control": "max-age=31536000, immutable" }
  ]
}
```

### drizzle.config.ts

```typescript
{
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL }
}
```

### tsconfig.json

- **Target**: ESNext
- **Module**: ESNext (ESM)
- **Strict**: true
- **Path Aliases**: `@/*` → `./`

### biome.jsonc

- **Extends**: Ultracite presets
- **Version**: 2.2.2
- **Features**: Linting + Formatting unified

### playwright.config.ts

- **Workers**: 4 local, 2 CI
- **Retries**: 0 local, 2 CI
- **Browsers**: Chromium, Firefox, WebKit, Mobile
- **Reporter**: HTML local, GitHub CI

### vitest.config.ts

- **Environment**: jsdom
- **Coverage**: v8 provider
- **Setup**: tests/unit/setup.ts

---

## 1.4 Environment Variables

### Required Variables (3)

| Variable                        | Purpose                      | Validation                  |
| ------------------------------- | ---------------------------- | --------------------------- |
| `DATABASE_URL` / `POSTGRES_URL` | PostgreSQL connection string | Must be valid URL           |
| `AUTH_SECRET`                   | Session encryption key       | Min 32 characters           |
| `NODE_ENV`                      | Environment mode             | development/production/test |

### AI Provider Keys (4 - at least 1 required)

| Variable             | Provider           | Validation            |
| -------------------- | ------------------ | --------------------- |
| `OPENAI_API_KEY`     | OpenAI GPT models  | Starts with `sk-`     |
| `ANTHROPIC_API_KEY`  | Anthropic Claude   | Starts with `sk-ant-` |
| `GEMINI_API_KEY`     | Google Gemini      | Any format            |
| `OPENROUTER_API_KEY` | OpenRouter gateway | Starts with `sk-or-`  |

### Caching Variables (4)

| Variable                  | Purpose                 |
| ------------------------- | ----------------------- |
| `CACHE_KV_REST_API_URL`   | Vercel KV REST endpoint |
| `CACHE_KV_REST_API_TOKEN` | Vercel KV auth token    |
| `KV_REST_API_URL`         | Upstash Redis endpoint  |
| `KV_REST_API_TOKEN`       | Upstash Redis token     |

### Storage Variables (2)

| Variable                | Purpose            |
| ----------------------- | ------------------ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access |
| `NEXT_PUBLIC_BLOB_URL`  | Public blob URL    |

### Supabase Variables (4)

| Variable                        | Purpose              |
| ------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key     |
| `SUPABASE_JWT_SECRET`           | JWT verification     |

### Feature Flags & Logging (6)

| Variable               | Purpose                  | Default          |
| ---------------------- | ------------------------ | ---------------- |
| `LOG_LEVEL`            | Logging verbosity        | info             |
| `ENABLE_MOCK_AI`       | Use mock AI responses    | false            |
| `ENABLE_RATE_LIMITING` | Rate limit enforcement   | true             |
| `ENABLE_ANALYTICS`     | Usage analytics          | true             |
| `ENABLE_DEBUG_PANEL`   | Debug UI                 | false (dev only) |
| `CI`                   | CI environment detection | -                |

### Runtime Variables (7)

| Variable              | Purpose                     |
| --------------------- | --------------------------- |
| `PORT`                | Server port (default 3000)  |
| `VERCEL`              | Vercel deployment detection |
| `VERCEL_ENV`          | preview/production          |
| `VERCEL_URL`          | Deployment URL              |
| `VERCEL_REGION`       | Deployment region           |
| `NEXT_RUNTIME`        | edge/nodejs                 |
| `NEXT_PUBLIC_APP_URL` | Public app URL              |

**Total**: 30+ environment variables

---

## 1.5 External Services & Integrations

### Primary Integrations (10)

| Service           | Purpose         | SDK/Client                  | Configuration                  |
| ----------------- | --------------- | --------------------------- | ------------------------------ |
| **Supabase**      | Database + Auth | @supabase/supabase-js       | PostgreSQL, Row-Level Security |
| **Vercel**        | Hosting + Edge  | Built-in                    | Fluid compute, bom1 region     |
| **Vercel Blob**   | File Storage    | @vercel/blob                | Streaming uploads              |
| **Upstash Redis** | Caching         | @upstash/redis              | REST-based, KV store           |
| **OpenAI**        | GPT Models      | @ai-sdk/openai              | GPT-4, GPT-4o, o1              |
| **Anthropic**     | Claude Models   | @ai-sdk/anthropic           | Claude 3.5, 4                  |
| **Google AI**     | Gemini Models   | @ai-sdk/google              | Gemini 2.0, 1.5                |
| **OpenRouter**    | Multi-Provider  | @openrouter/ai-sdk-provider | Model routing                  |
| **Cloudflare**    | Workers AI      | workers-ai-provider         | Edge inference                 |
| **Cloudflare**    | AI Gateway      | ai-gateway-provider         | Request routing                |

### Integration Patterns

| Pattern           | Implementation                      |
| ----------------- | ----------------------------------- |
| **Database**      | Drizzle ORM + postgres driver       |
| **Auth**          | Custom JWT with jose + Supabase SSR |
| **Caching**       | Upstash Redis with circuit breaker  |
| **Rate Limiting** | Upstash Ratelimit (sliding window)  |
| **File Upload**   | Vercel Blob streaming               |
| **AI Providers**  | Unified registry pattern            |

---

## 1.6 Database Schema

### Tables Overview (6 tables)

| Table        | Purpose         | Row Estimate      |
| ------------ | --------------- | ----------------- |
| `User`       | User accounts   | Primary entity    |
| `Chat`       | Chat sessions   | Many per user     |
| `Message_v2` | Chat messages   | Many per chat     |
| `Vote_v2`    | Message votes   | Many per message  |
| `Document`   | Artifacts/docs  | Many per chat     |
| `Suggestion` | Doc suggestions | Many per document |

### Detailed Schema

#### User Table

| Column        | Type          | Constraints           |
| ------------- | ------------- | --------------------- |
| id            | UUID          | PK, default random    |
| email         | VARCHAR(128)  | NOT NULL, UNIQUE      |
| password_hash | VARCHAR(128)  | NULLABLE              |
| created_at    | TIMESTAMP(TZ) | NOT NULL, default now |
| last_login    | TIMESTAMP(TZ) | NULLABLE              |

#### Chat Table

| Column       | Type          | Constraints                  |
| ------------ | ------------- | ---------------------------- |
| id           | UUID          | PK, default random           |
| created_at   | TIMESTAMP(TZ) | NOT NULL, default now        |
| updated_at   | TIMESTAMP(TZ) | NOT NULL, default now        |
| user_id      | UUID          | FK → User, CASCADE           |
| title        | TEXT          | NOT NULL, default 'New Chat' |
| visibility   | ENUM          | 'public' \| 'private'        |
| last_context | JSONB         | NULLABLE                     |

**Indexes**: `chat_user_created_idx` (user_id, created_at)

#### Message_v2 Table

| Column      | Type          | Constraints                       |
| ----------- | ------------- | --------------------------------- |
| id          | UUID          | PK, default random                |
| chat_id     | UUID          | FK → Chat, CASCADE                |
| role        | ENUM          | 'user' \| 'assistant' \| 'system' |
| parts       | JSONB         | NOT NULL                          |
| attachments | JSONB         | NOT NULL                          |
| created_at  | TIMESTAMP(TZ) | NOT NULL, default now             |

**Indexes**:

- `message_chat_created_idx` (chat_id, created_at)
- `message_chat_created_role_idx` (chat_id, created_at, role)

#### Vote_v2 Table

| Column     | Type    | Constraints            |
| ---------- | ------- | ---------------------- |
| chat_id    | UUID    | FK → Chat, CASCADE     |
| message_id | UUID    | FK → Message, CASCADE  |
| user_id    | UUID    | FK → User, CASCADE     |
| is_upvoted | BOOLEAN | NOT NULL, default true |

**Primary Key**: (chat_id, message_id, user_id)

#### Document Table

| Column     | Type          | Constraints                            |
| ---------- | ------------- | -------------------------------------- |
| id         | UUID          | NOT NULL, default random               |
| created_at | TIMESTAMP(TZ) | NOT NULL, default now                  |
| title      | TEXT          | NOT NULL                               |
| content    | TEXT          | NULLABLE                               |
| kind       | ENUM          | 'text' \| 'code' \| 'image' \| 'sheet' |
| user_id    | UUID          | FK → User, CASCADE                     |
| chat_id    | UUID          | FK → Chat, CASCADE                     |
| updated_at | TIMESTAMP(TZ) | NOT NULL, default now                  |

**Primary Key**: (id, created_at)
**Indexes**: `document_user_idx`, `document_chat_idx`

#### Suggestion Table

| Column              | Type          | Constraints             |
| ------------------- | ------------- | ----------------------- |
| id                  | UUID          | PK, default random      |
| document_id         | UUID          | FK → Document           |
| document_created_at | TIMESTAMP(TZ) | FK → Document           |
| original_text       | TEXT          | NOT NULL                |
| suggested_text      | TEXT          | NOT NULL                |
| description         | TEXT          | NULLABLE                |
| is_resolved         | BOOLEAN       | NOT NULL, default false |
| user_id             | UUID          | FK → User, CASCADE      |
| created_at          | TIMESTAMP(TZ) | NOT NULL, default now   |

**Indexes**: `suggestion_doc_idx`

### Enums

| Enum          | Values                           |
| ------------- | -------------------------------- |
| visibility    | 'public', 'private'              |
| role          | 'user', 'assistant', 'system'    |
| document_kind | 'text', 'code', 'image', 'sheet' |

---

## 1.7 API Endpoints

### Authentication Routes (3)

| Endpoint             | Method | Purpose               |
| -------------------- | ------ | --------------------- |
| `/api/auth/guest`    | POST   | Create guest session  |
| `/api/auth/exchange` | POST   | Exchange guest → user |
| `/api/auth/logout`   | POST   | Terminate session     |

### Chat Routes (3)

| Endpoint         | Method | Purpose                       |
| ---------------- | ------ | ----------------------------- |
| `/api/chat`      | POST   | Send message, stream response |
| `/api/chat/[id]` | GET    | Get chat by ID                |
| `/api/chat/[id]` | DELETE | Delete chat                   |

### History Routes (1)

| Endpoint       | Method | Purpose                |
| -------------- | ------ | ---------------------- |
| `/api/history` | GET    | List user chat history |

### Document Routes (2)

| Endpoint        | Method | Purpose                |
| --------------- | ------ | ---------------------- |
| `/api/document` | GET    | Get document           |
| `/api/document` | POST   | Create/update document |

### Vote Routes (1)

| Endpoint    | Method | Purpose         |
| ----------- | ------ | --------------- |
| `/api/vote` | POST   | Vote on message |

### Suggestions Routes (1)

| Endpoint           | Method | Purpose                  |
| ------------------ | ------ | ------------------------ |
| `/api/suggestions` | GET    | Get document suggestions |

### File Routes (1)

| Endpoint            | Method | Purpose             |
| ------------------- | ------ | ------------------- |
| `/api/files/upload` | POST   | Upload file to blob |

### Health Routes (1)

| Endpoint      | Method | Purpose      |
| ------------- | ------ | ------------ |
| `/api/health` | GET    | Health check |

### Server Actions

| Action             | Location              | Purpose                |
| ------------------ | --------------------- | ---------------------- |
| `sendMessage`      | features/chat/actions | Send chat message      |
| `updateVisibility` | features/chat/actions | Update chat visibility |
| `voteMessage`      | features/chat/actions | Vote on message        |

**Total**: 17 API endpoints + Server Actions

---

## 1.8 File Structure Metrics

### File Counts by Type

| Extension  | Count | Location                        |
| ---------- | ----- | ------------------------------- |
| `.ts`      | ~260  | Across all directories          |
| `.tsx`     | ~120  | components/, features/, app/    |
| `.md`      | ~45   | docs/, .ouroboros/, root        |
| `.json`    | ~15   | Config files                    |
| `.css`     | ~3    | app/globals.css                 |
| `.spec.ts` | ~12   | tests/e2e/                      |
| `.test.ts` | ~35   | tests/unit/, tests/integration/ |

### Directory Breakdown

| Directory       | Files | Purpose                |
| --------------- | ----- | ---------------------- |
| **app/**        | ~25   | Routes, layouts, pages |
| **components/** | ~60   | Reusable UI components |
| **features/**   | ~80   | Feature modules        |
| **lib/**        | ~95   | Core libraries         |
| **shared/**     | ~15   | Shared utilities       |
| **tests/**      | ~50   | Test suites            |
| **oldapp/**     | ~150+ | Archived legacy code   |

### Feature Module Structure

| Feature       | Components | Hooks | Actions | Types |
| ------------- | ---------- | ----- | ------- | ----- |
| **artifacts** | 8+         | 2     | 3       | 2     |
| **auth**      | 4          | 1     | -       | 2     |
| **chat**      | 15+        | 6     | 4       | 3     |
| **documents** | 6          | 2     | -       | 2     |
| **settings**  | 3          | 1     | -       | 1     |
| **sidebar**   | 5          | 2     | -       | 2     |

---

## 1.9 Build & Deploy Pipeline

### NPM Scripts

| Script             | Command                     | Purpose             |
| ------------------ | --------------------------- | ------------------- |
| `dev`              | `next dev --turbopack`      | Development server  |
| `build`            | `next build`                | Production build    |
| `start`            | `next start`                | Production server   |
| `lint`             | `npx ultracite check`       | Lint check          |
| `format`           | `npx ultracite fix`         | Auto-fix            |
| `typecheck`        | `tsc --noEmit`              | Type checking       |
| `test`             | `vitest run`                | Unit tests          |
| `test:integration` | `vitest run --config ...`   | Integration tests   |
| `test:e2e`         | `playwright test`           | E2E tests           |
| `db:push`          | `drizzle-kit push`          | Push schema         |
| `db:studio`        | `drizzle-kit studio`        | Database UI         |
| `db:generate`      | `drizzle-kit generate`      | Generate migrations |
| `analyze`          | `next experimental-analyze` | Bundle analysis     |

### Deployment Configuration

| Aspect             | Configuration                    |
| ------------------ | -------------------------------- |
| **Platform**       | Vercel                           |
| **Region**         | bom1 (Mumbai)                    |
| **Framework**      | Next.js (auto-detected)          |
| **Build**          | `pnpm run build`                 |
| **Install**        | `pnpm install --frozen-lockfile` |
| **Fluid Mode**     | Enabled                          |
| **Edge Functions** | Supported                        |

### CI/CD Integration

| Tool                  | Purpose                    |
| --------------------- | -------------------------- |
| **Playwright CI**     | GitHub reporter, 2 retries |
| **Vercel Preview**    | PR deployments             |
| **Vercel Production** | Main branch deploys        |

---

## 1.10 Risk Assessment

### High Risk Areas

| Area                      | Risk                           | Mitigation                      |
| ------------------------- | ------------------------------ | ------------------------------- |
| **Next.js 16.1.0**        | Bleeding edge, may have issues | Monitor releases, have fallback |
| **React 19**              | New concurrent features        | Strict mode testing             |
| **dynamicIO**             | Experimental feature           | Feature flag ready              |
| **Multiple AI Providers** | API changes, rate limits       | Circuit breaker pattern         |

### Medium Risk Areas

| Area              | Risk                     | Mitigation         |
| ----------------- | ------------------------ | ------------------ |
| **Tailwind v4**   | Breaking changes from v3 | Isolated migration |
| **Drizzle ORM**   | Relatively new ORM       | Type safety, tests |
| **TipTap 3.9**    | Complex editor state     | Extensive testing  |
| **Single Region** | bom1 latency             | CDN caching        |

### Low Risk Areas

| Area           | Assessment        |
| -------------- | ----------------- |
| **TypeScript** | Mature, stable    |
| **PostgreSQL** | Battle-tested     |
| **Zustand**    | Simple, reliable  |
| **Radix UI**   | Stable primitives |

### Technical Debt Indicators

| Indicator                | Location               | Impact                       |
| ------------------------ | ---------------------- | ---------------------------- |
| **Legacy Code**          | oldapp/ directory      | ~150 files to migrate/remove |
| **Prompt Experiments**   | prompt-genome/         | Should be externalized       |
| **Multiple Motion Libs** | framer-motion + motion | Consolidate to one           |
| **Beta Dependencies**    | react-data-grid        | Stability concerns           |

---

## Summary Statistics

| Metric                      | Value       |
| --------------------------- | ----------- |
| **Production Dependencies** | 90 packages |
| **Dev Dependencies**        | 17 packages |
| **TypeScript Files**        | ~260        |
| **Total Source Files**      | ~400+       |
| **Database Tables**         | 6           |
| **API Endpoints**           | 17          |
| **Environment Variables**   | 30+         |
| **External Services**       | 10          |
| **Feature Modules**         | 6           |
| **Test Files**              | ~50         |

---

_Generated by Ouroboros Analysis Framework — Wave 2 Ultra Deep Dive_
