# Error Handling

> Typed error handling with AppError, boundaries, retry, and circuit breaker

## Overview

The error handling system provides:

- **AppError** - Typed base error class with error codes
- **Specialized errors** - API and AI error subclasses
- **Error boundaries** - React error boundaries for UI recovery
- **Retry utility** - Exponential backoff for transient failures
- **Circuit breaker** - Protection against cascading failures

## AppError Base Class

All errors extend `AppError` for consistent handling:

```typescript
// lib/errors/app-error.ts
export class AppError extends Error {
  readonly code: ErrorCode;        // e.g., "auth:unauthorized"
  readonly statusCode: number;     // HTTP status code
  readonly severity: ErrorSeverity; // "error" | "warning" | "info"
  readonly isOperational: boolean; // Expected vs unexpected error
  readonly context?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message ?? getMessage(options.code));
    this.code = options.code;
    this.statusCode = options.statusCode ?? inferStatusCode(options.code);
    // ...
  }

  toResponse(): Response {
    return Response.json({ error: { code: this.code, message: this.message } }, 
      { status: this.statusCode });
  }

  toActionResult<T>(): ActionResult<T> {
    return { success: false, error: { code: this.code, message: this.message } };
  }
}
```

### Error Code Format

Codes follow the pattern `category:specific`:

| Category | Examples |
|----------|----------|
| `auth` | `auth:unauthorized`, `auth:forbidden` |
| `validation` | `validation:invalid_input`, `validation:token_limit` |
| `db` | `db:not_found`, `db:conflict` |
| `external` | `external:ai_provider:openai`, `external:rate_limited` |

## API Error Classes

Specialized errors for common HTTP scenarios:

```typescript
// lib/errors/api.ts
export class AuthenticationError extends AppError {
  constructor() {
    super({ code: "auth:unauthorized", statusCode: 401 });
  }
}

export class AuthorizationError extends AppError {
  constructor() {
    super({ code: "auth:forbidden", statusCode: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super({ code: "db:not_found", message: `${resource} not found`, statusCode: 404 });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({ code: "validation:invalid_input", message, statusCode: 400, context });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super({ code: "external:rate_limited", statusCode: 429, context: { retryAfter } });
  }
}
```

## AI Error Classes

Errors specific to AI provider interactions:

```typescript
// lib/errors/ai.ts
export class AIProviderError extends AppError {
  constructor(provider: string, message: string) {
    super({ code: `external:ai_provider:${provider}`, statusCode: 502, context: { provider } });
  }
}

export class TokenLimitError extends AppError {
  constructor(limit: number, requested: number) {
    super({ code: "validation:token_limit", statusCode: 400, context: { limit, requested } });
  }
}

export class ContentFilterError extends AppError {
  constructor(reason?: string) {
    super({ code: "validation:content_filtered", message: reason ?? "Content blocked" });
  }
}

export class StreamingError extends AppError {
  constructor(message: string) {
    super({ code: "external:streaming_error", statusCode: 500, message });
  }
}
```

## Error Handling in Routes

```typescript
// app/api/chat/route.ts
import { AppError, ValidationError, AuthenticationError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AuthenticationError();
    
    const { message } = await request.json();
    if (!message) throw new ValidationError("Message is required");
    
    // ... process request
  } catch (error) {
    if (error instanceof AppError) {
      return error.toResponse();
    }
    // Unexpected error - log and return generic 500
    console.error("Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Error Boundaries

React error boundaries catch rendering errors:

```tsx
// shared/components/error-fallback.tsx
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorFallback />}>
  <ChatMessages />
</ErrorBoundary>
```

### Route-Level Error Boundaries

Next.js `error.tsx` files handle route errors:

```tsx
// app/(chat)/error.tsx
"use client";
import { ErrorFallback } from "@/shared/components";

export default function ChatError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback error={error} onRetry={reset} retryLabel="Try again" />;
}
```

## Retry Utility

Exponential backoff for transient failures:

```typescript
// lib/utils/retry.ts
export interface RetryOptions {
  maxAttempts?: number;    // Default: 3
  baseDelay?: number;      // Default: 1000ms
  maxDelay?: number;       // Default: 30000ms
  backoffFactor?: number;  // Default: 2
  jitter?: boolean;        // Default: true
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
}

export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
```

### Usage Examples

```typescript
import { withRetry } from "@/lib/utils/retry";

// Basic retry
const result = await withRetry(() => fetchData());

// With options
const result = await withRetry(
  () => callExternalApi(),
  {
    maxAttempts: 5,
    baseDelay: 500,
    shouldRetry: (error) => error instanceof NetworkError,
  }
);

// With cancellation
const controller = new AbortController();
const result = await withRetry(() => longOperation(), { signal: controller.signal });
```

## Circuit Breaker Pattern

Prevents cascading failures when AI providers are unavailable:

```typescript
// lib/ai/provider-utils.ts
export function createCircuitBreaker(options?: CircuitBreakerOptions): CircuitBreaker;

interface CircuitBreakerOptions {
  failureThreshold?: number;    // Default: 5 failures to open
  resetTimeout?: number;        // Default: 30000ms before half-open
  halfOpenMaxAttempts?: number; // Default: 1 test request
}
```

### State Machine

```
CLOSED ──[5 failures]──► OPEN ──[30s elapsed]──► HALF_OPEN
   ▲                                                  │
   └────────────────[success]─────────────────────────┤
                                                      │
OPEN ◄─────────────────[failure]──────────────────────┘
```

### Usage

```typescript
import { createCircuitBreaker, CircuitBreakerOpenError } from "@/lib/ai/provider-utils";

const aiCircuit = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
});

try {
  const response = await aiCircuit.execute(() => 
    generateText({ model: "gpt-4", prompt })
  );
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    // AI provider is unavailable, use fallback
    return { message: "AI is temporarily unavailable. Please try again later." };
  }
  throw error;
}
```

## Error Context Provider

For sharing error state across components:

```tsx
// components/error-context.tsx
export function ErrorProvider({ children }) {
  const [error, setError] = useState<ErrorInfo | null>(null);
  
  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

// Usage
const { setError } = useErrorContext();
setError({ message: "Failed to load", retryable: true, onRetry: handleRetry });
```

## Best Practices

1. **Use AppError subclasses** - Never throw raw `Error` objects
2. **Include context** - Add relevant data to error context
3. **Handle at boundaries** - Let errors bubble to appropriate boundary
4. **Retry transient errors** - Use retry for network/rate limit errors
5. **Protect external calls** - Use circuit breaker for AI providers
6. **Log unexpected errors** - Only log non-operational errors

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [TESTING.md](./TESTING.md) - Testing error scenarios
- `.ouroboros/specs/nextjs-16-optimization/FINAL-design.md` - ADR-014: Error boundaries

---

*Last updated: December 2024*
