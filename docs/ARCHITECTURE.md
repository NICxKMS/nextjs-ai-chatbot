# Architecture Overview

> Brief system architecture for the AI Chatbot application built on Next.js 16.1.0

## Tech Stack

| Layer     | Technology                  |
| --------- | --------------------------- |
| Framework | Next.js 16.1.0 (App Router) |
| Language  | TypeScript 5.x              |
| Database  | PostgreSQL (Drizzle ORM)    |
| Auth      | Custom session-based        |
| AI        | Vercel AI SDK               |
| Styling   | Tailwind CSS                |
| Testing   | Vitest + Playwright         |

## App Router Structure

```
app/
├── layout.tsx              # Root layout with provider hierarchy
├── globals.css             # Global styles
├── head.tsx                # Document head
├── global-error.tsx        # Global error boundary
├── (auth)/                 # Auth route group
│   ├── layout.tsx          # Auth layout
│   ├── login/              # Login page
│   └── register/           # Registration page
├── (chat)/                 # Chat route group
│   ├── layout.tsx          # Chat layout with sidebar
│   ├── page.tsx            # New chat page
│   ├── loading.tsx         # Loading state
│   ├── error.tsx           # Error boundary
│   ├── chat-layout-client.tsx  # Client layout wrapper
│   ├── sidebar-container.tsx   # Sidebar with data loading
│   └── chat/[id]/          # Individual chat pages
└── api/                    # API routes
    ├── auth/               # Auth endpoints
    ├── chat/               # Chat streaming endpoint
    ├── document/           # Document CRUD
    ├── files/              # File uploads
    ├── health/             # Health check
    ├── history/            # Chat history
    ├── suggestions/        # AI suggestions
    └── vote/               # Message voting
```

## Provider Hierarchy

The application uses a 7-level provider hierarchy for state management:

```tsx
// app/layout.tsx → AppShell component
<ThemeProvider>
  {" "}
  // 1. Theme (light/dark)
  <MotionProvider>
    {" "}
    // 2. Animation preferences
    <TooltipProvider>
      {" "}
      // 3. Tooltip positioning
      <SWRConfig>
        {" "}
        // 4. Data fetching config
        <AuthProvider>
          {" "}
          // 5. Authentication state
          <SettingsHydration /> // 6. User settings
          {children}
        </AuthProvider>
      </SWRConfig>
    </TooltipProvider>
  </MotionProvider>
</ThemeProvider>
```

Chat pages add additional providers:

```tsx
// app/(chat)/layout.tsx
<ChatLayoutClient>
  <DataStreamProvider>
    {" "}
    // 7. AI streaming state
    <SidebarProvider>
      {" "}
      // 8. Sidebar state
      {children}
    </SidebarProvider>
  </DataStreamProvider>
</ChatLayoutClient>
```

## Key Architectural Patterns

### 1. Split Context Pattern

Separates state and dispatch contexts to minimize re-renders:

```tsx
// features/chat/components/data-stream-provider.tsx
const DataStreamStateContext = createContext<DataStreamState | null>(null);
const DataStreamDispatchContext = createContext<DataStreamDispatch | null>(
  null
);

// Components subscribe only to what they need
function MessageDisplay() {
  const { messages } = useDataStreamState(); // Only re-renders on messages change
}

function MessageInput() {
  const dispatch = useDataStreamDispatch(); // Never re-renders on state changes
}
```

### 2. Circuit Breaker Pattern

Prevents cascading failures when AI providers are unavailable:

```tsx
// lib/ai/provider-utils.ts
const aiCircuit = createCircuitBreaker({
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 30000, // Try again after 30s
  halfOpenMaxAttempts: 1, // Test with single request
});

// State transitions: CLOSED → OPEN → HALF_OPEN → CLOSED
await aiCircuit.execute(() => generateText({ model, prompt }));
```

### 3. Feature-Based Organization

Code is organized by feature rather than type:

```
features/
├── auth/           # Authentication
│   ├── actions/    # Server actions
│   ├── components/ # UI components
│   └── index.ts    # Public exports
├── chat/           # Chat functionality
├── documents/      # Document management
├── settings/       # User settings
└── sidebar/        # Navigation sidebar
```

**Cross-Feature Import Rules (P3-035):**

Features must only import from each other's public API (`index.ts`), not from internal directories:

```tsx
// ✅ CORRECT: Import from feature's public API
import { AuthProvider, useAuth } from "@/features/auth";
import type { UIArtifact, ArtifactKind } from "@/features/artifacts";
import { useMessages, useChatVisibility } from "@/features/chat";

// ❌ WRONG: Import from internal paths
import { AuthProvider } from "@/features/auth/components/auth-provider";
import type { UIArtifact } from "@/features/artifacts/types";
import { useMessages } from "@/features/chat/hooks/use-messages";
```

**Exception**: Test files in `tests/` may import internal modules for unit testing specific implementations.

This ensures:

- Clear feature boundaries and encapsulation
- Explicit public APIs via index.ts barrel exports
- Easier refactoring within features without breaking consumers
- Better code ownership and maintainability

### 4. Server-First Data Loading

Uses `"use cache"` directive for server-side caching:

```tsx
async function getChatMessages(chatId: string) {
  "use cache";
  cacheLife("chatMessages");
  cacheTag(CacheTags.chatMessages(chatId));
  return db.query.messages.findMany({ where: eq(messages.chatId, chatId) });
}
```

## Module Structure

| Directory     | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `app/`        | Next.js routes and layouts                             |
| `features/`   | Domain-specific features (artifacts, auth, chat, etc.) |
| `lib/`        | Shared utilities, services, data layer, config         |
| `shared/`     | Shared UI components and hooks                         |
| `components/` | AI Elements SDK components (DO NOT EDIT directly)      |
| `tests/`      | Test files (unit, integration, e2e)                    |
| `docs/`       | Project documentation                                  |

## Configuration Files

| File                   | Purpose                      |
| ---------------------- | ---------------------------- |
| `next.config.ts`       | Next.js + cacheLife profiles |
| `drizzle.config.ts`    | Database schema config       |
| `vitest.config.ts`     | Unit test config             |
| `playwright.config.ts` | E2E test config              |
| `biome.jsonc`          | Linting/formatting           |

## ADRs (Architecture Decision Records)

Detailed architectural decisions are documented in:

- `.ouroboros/specs/nextjs-16-optimization/FINAL-design.md` - Main design document
- ADR-001: `"use cache"` adoption strategy
- ADR-012: Redis circuit breaker pattern
- ADR-014: Error boundary hierarchy

## Security Configuration

### CORS Policy (P3-032)

The application implements Cross-Origin Resource Sharing (CORS) through Next.js middleware and API route configuration:

**Default Policy:**

- **Origin**: Same-origin only (no cross-origin requests by default)
- **Credentials**: Cookies use `SameSite=Lax` attribute
- **API Routes**: No explicit CORS headers (same-origin policy enforced by browser)

**Security Headers (middleware.ts):**

```typescript
const securityHeaders = {
  "X-Content-Type-Options": "nosniff", // Prevent MIME sniffing
  "X-Frame-Options": "DENY", // Prevent clickjacking
  "X-XSS-Protection": "1; mode=block", // Enable XSS filtering
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
```

**When Cross-Origin is Needed:**

If you need to enable CORS for specific API routes (e.g., for external integrations):

```typescript
// app/api/public/route.ts
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://trusted-domain.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(request: Request) {
  const response = Response.json({ data: "public" });
  response.headers.set(
    "Access-Control-Allow-Origin",
    "https://trusted-domain.com"
  );
  return response;
}
```

**Best Practices:**

- Never use `Access-Control-Allow-Origin: *` for authenticated endpoints
- Always specify explicit allowed origins
- Use `Access-Control-Allow-Credentials: true` only when necessary
- Validate Origin header server-side for sensitive operations

### CSRF Protection

Multi-layered defense (see middleware.ts header comments):

1. SameSite cookies prevent cross-site cookie transmission
2. Security headers prevent clickjacking and XSS
3. Rate limiting prevents automated attacks
4. JWT audience validation for guest sessions

### Rate Limiting (P3-033)

Per-user rate limiting is implemented in `lib/middleware/rate-limit.ts`:

- **User Identification**: Extracts user ID from JWT, falls back to IP
- **Tiered Limits**: Different limits for authenticated, guest, and anonymous users
- **Endpoint-Specific**: Chat, upload, and auth endpoints have custom limits

See `lib/middleware/rate-limit-config.ts` for configuration.

## Related Documentation

- [CACHING.md](./CACHING.md) - Caching strategy details
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error handling patterns
- [TESTING.md](./TESTING.md) - Testing guide

---

_Last updated: December 2024_
