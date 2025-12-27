<p align="center">
  <img alt="AI Assistant" src="app/(chat)/opengraph-image.png" />
  <h1 align="center">Next.js AI Assistant</h1>
  <p align="center">Conversational AI with multimodal inputs, artifacts, and real‑time streaming — production‑ready and accessible.</p>
  <p align="center">
    <a href="https://ai.nicx.me"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-ai.nicx.me-000?logo=vercel" /></a>
    <a href="https://github.com/nicxkms/nextjs-ai-chatbot"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-nicxkms-181717?logo=github" /></a>
    <a href="#license"><img alt="License" src="https://img.shields.io/badge/License-MIT-00b894" /></a>
  </p>
  <p align="center">
    <a href="#features"><strong>Features</strong></a> ·
    <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
    <a href="#architecture"><strong>Architecture</strong></a> ·
    <a href="#screenshots"><strong>Screenshots</strong></a> ·
    <a href="#live-demo"><strong>Live Demo</strong></a> ·
    <a href="#getting-started"><strong>Getting Started</strong></a> ·
    <a href="#deployment"><strong>Deployment</strong></a> ·
    <a href="#author"><strong>Author</strong></a>
  </p>
</p>

> Robust AI Assistant using Next.js App Router and AI SDK, with model routing, authentication, and artifact generation.

## Features

### Core Capabilities

- ✨ **Real‑time streaming**: Fast, incremental responses with tool calling
- 🔐 **Auth & history**: Secure sessions with persistent conversations
- 🖼️ **Multimodal input**: Text, files, images, and code blocks
- 🧩 **Artifacts**: Generate code, text, images, and sheets with previews
- 🧠 **Model routing**: Switch providers through a unified API
- ♿ **Accessible UI**: Built on shadcn/ui and Radix primitives
- 📱 **Responsive**: Mobile‑friendly, keyboard‑first interaction

### Architecture Highlights

- 🏗️ **Feature-based structure**: Modular `features/` directory with domain separation
- 📦 **Type-safe throughout**: Comprehensive TypeScript types with runtime guards
- 🚀 **Performance optimized**: Lazy loading, code splitting, and smart caching
- 🔒 **Security-first**: Input sanitization, rate limiting, and CSRF protection
- 🧪 **Fully tested**: Unit, integration, and E2E tests with Vitest and Playwright

## Tech Stack

| Layer     | Technologies                                     |
| --------- | ------------------------------------------------ |
| Framework | Next.js 16.1.0 (App Router, RSC, Server Actions) |
| Language  | TypeScript 5 (strict mode)                       |
| Styling   | Tailwind CSS 4, shadcn/ui, Radix UI              |
| AI        | Vercel AI SDK 5 (unified multi-provider)         |
| Auth      | Auth.js v5                                       |
| Database  | Drizzle ORM, NeonDB (PostgreSQL)                 |
| Caching   | Redis/Upstash (cache-first strategy)             |
| Testing   | Vitest (unit), Playwright (E2E)                  |
| Hosting   | Vercel (Edge & Serverless)                       |

### Next.js 16.1.0 Features

This project leverages cutting-edge Next.js 16.1.0 features:

- **`"use cache"` Directive** - Declarative caching with custom `cacheLife` profiles
- **`cacheTag()` API** - Granular cache invalidation for targeted revalidation
- **Enhanced Streaming** - Optimized SSE with abort signal handling
- **Improved RSC** - Better React Server Component integration

## Architecture

```mermaid
flowchart LR
  U[User] -- UI events --> C[Next.js App (RSC + Client)]
  C -- Server Actions --> A[Chat API Routes]
  A -- Model Calls --> M[AI SDK / Providers]
  A -- Data Access --> DA[Unified Data Layer]
  DA -- Cache First --> R[(Redis Cache)]
  DA -- DB Fallback --> D[(NeonDB)]
  C -- Uploads/Previews --> F[Artifacts & Storage]
```

### Directory Structure

```
app/
├── (auth)/            # Authentication routes and pages
├── (chat)/            # Chat interface and layouts
└── api/               # REST API endpoints
    ├── chat/          # AI streaming endpoint
    ├── history/       # Chat history CRUD
    ├── vote/          # Message voting
    ├── document/      # Document management
    └── files/         # File upload handling

components/
├── ai-elements/       # AI response rendering (artifacts, code, etc.)
└── ui/                # Base UI components (shadcn/ui)

features/
├── artifacts/         # Artifact creation and preview
├── auth/              # Authentication logic
├── chat/              # Chat state and components

## Legacy Code

The `oldapp/` directory contains the original implementation before the feature-based architecture refactor. It is preserved for:
- Historical reference and migration verification
- Comparing implementation approaches
- **Do not modify** - this folder is archived and not part of the active codebase
├── documents/         # Document management
├── settings/          # User preferences
└── sidebar/           # Navigation sidebar

lib/
├── ai/                # Model registry, prompts, tools
├── api/               # API client utilities
├── auth/              # Auth configuration and helpers
├── cache/             # Redis cache operations
├── data/              # Unified data access layer
├── db/                # Drizzle schema and migrations
├── errors/            # Error types and handlers
├── middleware/        # Rate limiting, validation
├── types/             # Shared TypeScript types
└── utils/             # Common utilities
```

### Data Access Layer

The application uses a **unified data access layer** that provides:

- **Cache-first strategy**: Redis checked before database queries
- **Guest/auth abstraction**: Single API for both user types
- **Zero extra calls**: Optimized to eliminate redundant cache/DB operations
- **Method-based API**: Clean, intuitive interface (`chatData.get()`, `messageData.save()`, etc.)

**Example Usage:**

```typescript
import { auth } from "@/app/(auth)/auth";
import { createContext } from "@/lib/data/base";
import { chatData, messageData } from "@/lib/data/chat";

// Create context from session (determines guest vs auth)
const session = await auth();
const ctx = createContext(session);

// Get chat (cache-first, works for both guest and auth)
const chat = await chatData.get(chatId, ctx);

// Get chat with messages (single optimized fetch)
const result = await chatData.getWithMessages(chatId, ctx);

// Save messages with context (batch operation)
await messageData.saveWithContext({
  messages: [...],
  chatId,
  lastContext: usage,
  isNewChat: true,
  title: "New Chat",
  visibility: "private"
}, ctx);
```

**Key Benefits:**

- Guest users: Cache-only (no database writes)
- Authenticated users: Cache + database persistence
- Automatic cache warming on DB queries
- Batch operations to minimize round-trips
- Type-safe with full TypeScript support

See [docs/database-schema.md](docs/database-schema.md) and [docs/redis-cache-keymap.md](docs/redis-cache-keymap.md) for detailed documentation.

## API Reference

### REST Endpoints

| Endpoint            | Method                | Description                           |
| ------------------- | --------------------- | ------------------------------------- |
| `/api/chat`         | POST                  | Stream AI responses with tool calling |
| `/api/history`      | GET                   | Fetch paginated chat history          |
| `/api/history`      | DELETE                | Delete all user chats                 |
| `/api/vote`         | PATCH                 | Submit/update message vote            |
| `/api/document`     | GET/POST/PATCH/DELETE | Document CRUD operations              |
| `/api/files/upload` | POST                  | Upload files (images, documents)      |
| `/api/health`       | GET                   | Health check endpoint                 |
| `/api/suggestions`  | GET                   | Get AI suggestions                    |

### Type Exports

The application exports comprehensive TypeScript types for API responses:

```typescript
import type {
  ApiMessage,
  ApiChat,
  ApiDocument,
  ApiVote,
  ApiErrorResponse,
  PaginatedResponse,
} from "@/lib/types";

// Type guards for runtime validation
import {
  isApiMessage,
  isApiChat,
  isApiErrorResponse,
  safeJsonParse,
  assertType,
} from "@/lib/types";
```

## Screenshots

<p align="center">
  <img alt="Chat UI" src="app/(chat)/twitter-image.png" width="720" />
</p>

## Live Demo

Visit: [ai.nicx.me](https://ai.nicx.me)

<p align="center">
  <a href="https://ai.nicx.me">
    <img alt="Open Demo" src="https://img.shields.io/badge/Open%20Demo-ai.nicx.me-000?logo=vercel" />
  </a>
</p>

## Getting Started

1. Clone the repository
   ```bash
   git clone https://github.com/nicxkms/nextjs-ai-chatbot.git
   cd nextjs-ai-chatbot
   ```
2. Install dependencies
   ```bash
   pnpm install
   ```
3. Configure environment
   - Copy `.env.example` to `.env.local` (or `.env`) and populate required keys
   - For secrets, prefer Vercel Project Environment Variables
4. Run locally
   ```bash
   pnpm dev
   ```
   App runs at [http://localhost:3000](http://localhost:3000)

### Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

| Variable                        | Required | Description                                                      |
| ------------------------------- | -------- | ---------------------------------------------------------------- |
| `AUTH_SECRET`                   | Yes      | Session encryption key (generate with `openssl rand -base64 32`) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous key                                           |
| `SUPABASE_JWT_SECRET`           | Yes      | Supabase JWT secret for auth                                     |
| `DATABASE_URL`                  | Yes      | PostgreSQL connection string (NeonDB recommended)                |
| `CACHE_KV_REST_API_URL`         | No       | Upstash Redis URL for caching                                    |
| `CACHE_KV_REST_API_TOKEN`       | No       | Upstash Redis token                                              |
| `OPENAI_API_KEY`                | No\*     | OpenAI API key                                                   |
| `ANTHROPIC_API_KEY`             | No\*     | Anthropic API key                                                |
| `GEMINI_API_KEY`                | No\*     | Google Gemini API key                                            |
| `OPENROUTER_API_KEY`            | No\*     | OpenRouter API key                                               |
| `BLOB_READ_WRITE_TOKEN`         | No       | Vercel Blob storage token                                        |

\*At least one AI provider API key is required.

See `.env.example` for all available configuration options including Cloudflare AI Gateway and advanced settings.

### Useful Scripts

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `pnpm dev`              | Start development server     |
| `pnpm build`            | Build for production         |
| `pnpm start`            | Run production server        |
| `pnpm typecheck`        | TypeScript type checking     |
| `pnpm lint`             | Lint and format code         |
| `pnpm test`             | Run unit tests (Vitest)      |
| `pnpm test:watch`       | Run tests in watch mode      |
| `pnpm test:coverage`    | Run tests with coverage      |
| `pnpm test:e2e`         | Run E2E tests (Playwright)   |
| `pnpm test:integration` | Run integration tests        |
| `pnpm db:generate`      | Generate database migrations |
| `pnpm db:migrate`       | Apply database migrations    |

## Documentation

Detailed documentation is available in the [docs/](docs/) folder:

- [Architecture](docs/ARCHITECTURE.md) - System design and patterns
- [API Reference](docs/API.md) - REST API documentation
- [Caching](docs/CACHING.md) - Cache strategy and invalidation
- [Error Handling](docs/ERROR-HANDLING.md) - Error types and handling
- [Testing](docs/TESTING.md) - Test suite overview (395 tests)

## Deployment

- Deployed on Vercel: [ai.nicx.me](https://ai.nicx.me)
- Set environment variables in your Vercel project settings
- Connect the GitHub repository for CI/CD

<p align="center">
  <a href="https://vercel.com/new"><img alt="Deploy to Vercel" src="https://img.shields.io/badge/Deploy%20to%20Vercel-000?logo=vercel" /></a>
</p>

## Acknowledgements

- Built with Next.js and the AI SDK
- UI powered by shadcn/ui and Radix UI

## Author

**Nikhil Kumar**

- GitHub: [@nicxkms](https://github.com/nicxkms)
- LinkedIn: [@nicx](https://www.linkedin.com/in/nicx)

## License

See `LICENSE` for details.
