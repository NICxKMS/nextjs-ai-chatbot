# Development

Setup, coding standards, and development workflow.

## Quick Start

```bash
# Clone and install
git clone https://github.com/nicxkms/nextjs-ai-chatbot.git
cd nextjs-ai-chatbot
pnpm install

# Setup environment
cp .env.example .env.local
# Configure DATABASE_URL, AI keys, etc.

# Start development
pnpm dev
```

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Cache
CACHE_KV_REST_API_URL="https://..."
CACHE_KV_REST_API_TOKEN="..."

# Auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Provider (at least one)
OPENAI_API_KEY="sk-..."
```

### Development Setup

```bash
# Local database (Docker)
docker run --name postgres-dev -e DATABASE_PASSWORD=password -p 5432:5432 -d postgres:14

# Run migrations
pnpm db:push

# Start dev server
pnpm dev
```

## Coding Standards

### TypeScript Configuration

```json
{
  "strict": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true
}
```

### Import Organization

```typescript
// 1. Node.js built-ins
import { redirect } from "next/navigation";

// 2. External packages
import { auth } from "@/app/(auth)/auth";

// 3. Internal imports
import { Chat } from "@/components/chat";
import { chatData } from "@/lib/data/chat";
```

### Component Structure

```typescript
interface ChatProps {
  initialMessages: ChatMessage[];
  chatId: string;
}

export function Chat({ initialMessages, chatId }: ChatProps) {
  // 1. Hooks
  const [messages, setMessages] = useState(initialMessages);

  // 2. Event handlers
  const handleSendMessage = useCallback(
    (content: string) => {
      // Implementation
    },
    [chatId]
  );

  // 3. Effects
  useEffect(() => {
    // Side effects
  }, [chatId]);

  // 4. Render
  return (
    <div className="flex flex-col h-full">
      <MessagesList messages={messages} />
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
```

## Testing

### Unit Tests

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### E2E Tests

```bash
# Run Playwright tests
pnpm test:e2e

# Interactive mode
pnpm test:e2e:ui
```

### Test Structure

```typescript
describe("Chat Component", () => {
  it("renders initial messages", () => {
    render(<Chat initialMessages={messages} chatId="test" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

## Development Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Code quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript checking
pnpm format           # Format code

# Database
pnpm db:generate      # Generate migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio
```

## Git Workflow

### Branch Strategy

- `main` - Production ready
- `feature/*` - New features
- `bugfix/*` - Fixes
- `release/*` - Deployment prep

### Commit Convention

```bash
feat(chat): add message streaming
fix(auth): resolve guest session timeout
docs(api): update authentication documentation
test(chat): add unit tests for message parsing
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "pnpm test"
    }
  }
}
```

## Debugging

### Debug Configuration

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    }
  ]
}
```

### Debug Utilities

```typescript
// lib/debug.ts
export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEBUG] ${message}`, data);
  }
}

export function debugTimer(label: string) {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`[TIMER] ${label}: ${end - start}ms`);
  };
}
```

## Performance Development

### Local Tools

```bash
# Bundle analysis
pnpm build --analyze

# Performance profiling
NEXT_TELEMETRY_DEBUG=1 pnpm dev

# Lighthouse CI
npx @lhci/cli autorun
```

### Memory Tracking

```typescript
export function trackMemoryUsage(label: string) {
  if (process.env.NODE_ENV !== "development") return;

  const usage = process.memoryUsage();
  console.log(`[MEMORY] ${label}:`, {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  });
}
```

## Common Issues

### TypeScript Errors

```bash
# Clear cache
rm -rf .next/types

# Check types
npx tsc --noEmit
```

### Database Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Reset database
pnpm db:reset
```

### Build Issues

```bash
# Clear all caches
rm -rf .next node_modules pnpm-lock.yaml
pnpm install

# Check circular dependencies
npx madge --circular lib/
```

## Contributing

### Pull Request Process

1. Fork repository
2. Create feature branch
3. Follow coding standards
4. Add tests
5. Submit PR with description

### Review Criteria

- Functionality works as intended
- Performance impact considered
- Code follows project conventions
- Tests are comprehensive
- Documentation is updated
