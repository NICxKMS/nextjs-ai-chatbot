# AI Assistant v6

A Next.js AI chatbot with multi-model support, artifact management, real-time streaming, and feature-based architecture.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **AI**: AI SDK with multi-model support
- **Linting/Formatting**: Biome
- **Testing**: Vitest (unit), Playwright (E2E)

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server with HMR |
| `pnpm build` | Run migrations + production build |
| `pnpm start` | Start production server |

### Validation

| Command | Description |
|---------|-------------|
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Biome lint check |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Auto-format with Biome |

### Testing

| Command | Description |
|---------|-------------|
| `pnpm test:unit` | Run Vitest unit tests |
| `pnpm test:unit:watch` | Run tests in watch mode |
| `pnpm test:e2e` | Run Playwright E2E tests |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed database with sample data |

## Project Structure

```
features/           → Feature modules (auth, chat, artifact, input, settings, sidebar)
  └── <feature>/
      ├── actions/    → Server actions
      ├── components/ → Feature-specific UI
      ├── hooks/      → Feature-specific hooks
      ├── schemas/    → Zod validation schemas
      └── types/      → TypeScript types

components/         → Shared components
  ├── ui/            → Base UI primitives
  ├── ai/            → AI-related components
  └── artifact/      → Artifact renderers

lib/                → Core libraries
  ├── api/           → API context, response, validation
  ├── auth/          → Auth config, guards, session
  ├── cache/         → Tiered caching (memory + Redis)
  ├── data/          → Repositories, services, queries
  ├── db/            → Drizzle client + schema
  ├── errors/        → Error messages
  ├── files/         → File upload, validation
  └── utils/         → General utilities

app/                → Next.js App Router
  ├── (auth)/        → Auth pages (login, register)
  ├── (chat)/        → Chat pages
  └── api/           → API routes

tests/              → Test files
  └── integration/   → Integration tests

e2e/                → Playwright E2E tests
```

## Architecture

This project follows a **feature-based architecture** with:

- **Repository Pattern** for data access (`lib/data/repositories/`)
- **Service Layer** for business logic (`lib/data/services/`)
- **Server Actions** for mutations (co-located in feature `actions/`)
- **Zod Schemas** for validation (co-located in feature `schemas/`)

See `.ouroboros/specs/refactor-migration/` for detailed architecture specifications.

## Testing

### Unit Tests

```bash
pnpm test:unit
```

Current coverage: **354 tests** across:
- `lib/utils/` - Utility functions
- `lib/errors.ts` - Error handling
- `lib/cache/` - Cache operations
- `features/*/hooks/` - Feature hooks
- `tests/integration/` - Integration tests

### E2E Tests

```bash
# Start dev server first
pnpm dev

# In another terminal
pnpm test:e2e
```

E2E tests cover:
- Authentication flows
- Chat functionality
- Artifact management
- Sidebar navigation
- Visual regression

## Environment Variables

See `DEPLOYMENT.md` for complete environment variable documentation.

Required:
- `DATABASE_URL` or `POSTGRES_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- AI provider API key (OpenAI, Google, or xAI)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for:
- Pre-deployment checklist
- Environment variables
- Deployment platform instructions
- Post-deployment verification

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for:
- Commit message conventions
- Code style guidelines
- Pull request process

## License

MIT License - see [`LICENSE`](./LICENSE) for details.
