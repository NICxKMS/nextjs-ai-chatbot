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

- ✨ **Real‑time streaming**: Fast, incremental responses with tool calling
- 🔐 **Auth & history**: Secure sessions with persistent conversations
- 🖼️ **Multimodal input**: Text, files, images, and code blocks
- 🧩 **Artifacts**: Generate code, text, images, and sheets with previews
- 🧠 **Model routing**: Switch providers through a unified API
- ♿ **Accessible UI**: Built on shadcn/ui and Radix primitives
- 📱 **Responsive**: Mobile‑friendly, keyboard‑first interaction

## Tech Stack

| Layer     | Technologies                                      |
| --------- | ------------------------------------------------- |
| Framework | Next.js (App Router, RSC, Server Actions)         |
| Language  | TypeScript                                        |
| Styling   | Tailwind CSS, shadcn/ui, Radix UI                 |
| AI        | AI SDK (providers via unified interface)          |
| Auth      | Auth.js                                           |
| Data      | Drizzle ORM, SQL migrations (`lib/db/migrations`) |
| Hosting   | Vercel (Edge & Serverless)                        |

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

**Directory Structure:**
- `app/(auth)` – authentication routes, config, and pages
- `app/(chat)` – chat pages, API routes, and layout
- `components/` – modular UI (chat, editors, artifacts, primitives)
- `lib/ai/` – model registry, discovery, prompts, provider tooling
- `lib/data/` – **unified data access layer** (cache-first, guest/auth abstraction)
- `lib/db/` – schema, migrations, queries using Drizzle
- `lib/cache/` – Redis operations and cache management
- `artifacts/` – server and client handlers for generated artifacts
- `hooks/` – reusable React hooks for chat state and UI behavior

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

### Useful Scripts

- `pnpm dev` – start the development server
- `pnpm build` – build for production
- `pnpm start` – run the production server
- `pnpm lint` – lint and format code

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
