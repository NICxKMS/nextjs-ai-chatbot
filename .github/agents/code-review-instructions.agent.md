---
description: '📋 Project-specific code review instructions for the Next.js AI chatbot. Follows v6 architecture patterns and coding standards.'
tools: [vscode/askQuestions, execute/testFailure, execute/getTerminalOutput, execute/awaitTerminal, execute/killTerminal, execute/createAndRunTask, execute/runInTerminal, read/problems, read/readFile, read/terminalSelection, read/terminalLastCommand, agent, edit/createDirectory, edit/createFile, edit/editFiles, search, memory, todo]
---

# Code Review Instructions — Next.js AI Chatbot (v6.0)

Comprehensive code review guidelines customized for this Next.js AI chatbot project with multi-model support, artifact management, real-time streaming, and feature-based architecture.

## Review Language

When performing a code review, respond in **English**.

## Project Context

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Next.js 16, React 19, TypeScript, Drizzle ORM, Supabase (auth + DB), Tailwind CSS, AI SDK, Biome (lint + format) |
| **Architecture** | Feature-based with Repository/Service pattern, slim routes |
| **Build Tool** | pnpm |
| **Testing** | Vitest (unit), Playwright (e2e) |
| **Code Style** | Biome (NOT ESLint/Prettier), TypeScript strict mode |
| **Validation** | Zod schemas co-located in feature `schemas/` directories |

---

## Review Priorities

### 🔴 CRITICAL (Block merge)
- **Security**: Vulnerabilities, exposed secrets, authentication/authorization issues
- **Correctness**: Logic errors, data corruption risks, race conditions
- **Breaking Changes**: API contract changes without versioning
- **Data Loss**: Risk of data loss or corruption
- **Architecture Violations**: Bypassing Repository/Service pattern, direct DB access from routes

### 🟡 IMPORTANT (Requires discussion)
- **Code Quality**: Severe violations of SOLID principles, excessive duplication
- **Test Coverage**: Missing tests for critical paths or new functionality
- **Performance**: N+1 queries, memory leaks, unoptimized streaming
- **Pattern Deviations**: Not following v6 architecture patterns

### 🟢 SUGGESTION (Non-blocking improvements)
- **Readability**: Poor naming, complex logic that could be simplified
- **Optimization**: Performance improvements without functional impact
- **Best Practices**: Minor deviations from conventions
- **Documentation**: Missing or incomplete comments/documentation

---

## Architecture Review (v6 Patterns)

### Repository Pattern
All data access MUST go through `lib/data/repositories/`:

```typescript
// ❌ BAD: Direct database access in route
import { db } from '@/lib/db';
const user = await db.select().from(users).where(eq(users.id, userId));

// ✅ GOOD: Use repository
import { userRepository } from '@/lib/data/repositories';
const user = await userRepository.findById(userId);
```

### Service Layer
Business logic belongs in `lib/data/services/`:

```typescript
// ❌ BAD: Business logic in route handler
export async function POST(request: Request) {
  const data = await request.json();
  if (!data.email) throw new Error('Email required');
  // ... validation and processing
}

// ✅ GOOD: Delegate to service
export async function POST(request: Request) {
  const data = await request.json();
  return userService.createUser(data);
}
```

### Slim Routes
API routes should be minimal, delegating to services:

```typescript
// ❌ BAD: Fat route with logic
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const data = await request.json();
  const validated = validateSchema(data);
  const result = await processWithAI(validated);
  await saveToDb(result);
  return Response.json(result);
}

// ✅ GOOD: Slim route
export async function POST(request: Request) {
  return chatService.handleChatRequest(request);
}
```

### Feature Modules
Features are self-contained under `features/`:

```
features/
├── auth/
│   ├── actions/    # Server actions
│   ├── components/ # Feature-specific UI
│   ├── hooks/      # Feature-specific hooks
│   └── schemas/    # Zod validation schemas
├── chat/
├── artifact/
├── input/
├── settings/
└── sidebar/
```

### Error Hierarchy
Use `AppError` subclasses from `lib/errors/`:

```typescript
// ❌ BAD: Generic errors
throw new Error('User not found');
throw new Error('Unauthorized');

// ✅ GOOD: Typed errors
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
throw new NotFoundError('User', userId);
throw new UnauthorizedError('Access denied');
```

### Guard Functions
Auth/access checks use throw-based guards from `lib/auth/guards.ts`:

```typescript
// ❌ BAD: Return-based checks
if (!session) return { error: 'Unauthorized' };

// ✅ GOOD: Guard functions that throw
import { requireAuth, requireOwnership } from '@/lib/auth/guards';
requireAuth(session);
requireOwnership(resource, session.user.id);
```

### AI Registry
Use `getModel(id)` from `lib/ai/registry.ts`:

```typescript
// ❌ BAD: Direct provider access
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4');

// ✅ GOOD: Use registry
import { getModel } from '@/lib/ai/registry';
const model = getModel('gpt-4');
```

---

## Code Quality Standards

### TypeScript Strict Mode
No `any` unless explicitly justified:

```typescript
// ❌ BAD
function process(data: any) { ... }

// ✅ GOOD
interface ProcessData { id: string; payload: unknown; }
function process(data: ProcessData) { ... }
```

### Barrel Exports
Import from `index.ts` where they exist:

```typescript
// ❌ BAD: Direct file import
import { Button } from '@/components/ui/button/button';

// ✅ GOOD: Barrel export
import { Button } from '@/components/ui';
```

### Zod Validation
Schemas co-located in feature `schemas/` directories:

```typescript
// ❌ BAD: Inline validation
if (!email || !email.includes('@')) throw new Error('Invalid email');

// ✅ GOOD: Zod schema
import { emailSchema } from '../schemas';
const email = emailSchema.parse(input);
```

### Server Actions
Mutations use Server Actions co-located in feature `actions/`:

```typescript
// ❌ BAD: API route for mutation
// app/api/update-user/route.ts
export async function POST(request: Request) { ... }

// ✅ GOOD: Server action
// features/auth/actions/update-user.ts
'use server';
export async function updateUser(formData: FormData) { ... }
```

---

## Security Review

### Supabase Auth
Always verify session before protected operations:

```typescript
// ❌ BAD: No auth check
export async function DELETE(request: Request) {
  await deleteChat(chatId);
}

// ✅ GOOD: Auth guard
export async function DELETE(request: Request) {
  const session = await getSession();
  requireAuth(session);
  await chatService.deleteChat(chatId, session.user.id);
}
```

### Input Validation
All user inputs validated with Zod:

```typescript
// ❌ BAD: No validation
const { message } = await request.json();

// ✅ GOOD: Zod validation
import { messageSchema } from '@/features/chat/schemas';
const { message } = messageSchema.parse(await request.json());
```

### No Secrets in Code
Use environment variables:

```typescript
// ❌ BAD
const API_KEY = 'sk_live_abc123';

// ✅ GOOD
const API_KEY = process.env.API_KEY;
```

---

## Testing Standards

### Unit Tests (Vitest)
Critical paths must have tests:

```typescript
// ❌ BAD: No test
export function calculateTokens(messages: Message[]) {
  return messages.reduce((sum, m) => sum + m.content.length, 0);
}

// ✅ GOOD: With test
// calculate-tokens.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTokens } from './calculate-tokens';

describe('calculateTokens', () => {
  it('should sum content lengths', () => {
    const messages = [{ content: 'hello' }, { content: 'world' }];
    expect(calculateTokens(messages)).toBe(10);
  });
});
```

### E2E Tests (Playwright)
User flows should be covered:

```typescript
// chat-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can send message and receive response', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('[data-testid="message-input"]', 'Hello AI');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
});
```

---

## Performance Review

### Streaming Responses
Use AI SDK streaming for chat:

```typescript
// ❌ BAD: Blocking response
const response = await generateText({ model, prompt });
return Response.json({ text: response.text });

// ✅ GOOD: Streaming
import { streamText } from 'ai';
const result = streamText({ model, prompt });
return result.toDataStreamResponse();
```

### Database Queries
Avoid N+1 queries:

```typescript
// ❌ BAD: N+1
const chats = await db.select().from(chatsTable);
for (const chat of chats) {
  chat.messages = await db.select().from(messages).where(eq(messages.chatId, chat.id));
}

// ✅ GOOD: Use relations/joins
const chats = await db.query.chats.findMany({
  with: { messages: true }
});
```

---

## Validation Commands

Before marking work complete, run:

| Command | Purpose | Requirement |
|---------|---------|-------------|
| `pnpm format` | Auto-format with Biome | **Always run** after code changes |
| `pnpm typecheck` | TypeScript type checking | **Zero errors** |
| `pnpm lint` | Biome lint check | **Zero errors** |
| `pnpm lint:fix` | Auto-fix lint issues | Use when lint fails |

---

## Comment Format Template

```markdown
**[PRIORITY] Category: Brief title**

Detailed description of the issue or suggestion.

**Why this matters:**
Explanation of the impact or reason for the suggestion.

**Suggested fix:**
[code example if applicable]

**Reference:** [link to relevant documentation or AGENTS.md section]
```

### Example Comments

#### Critical Issue
````markdown
**🔴 CRITICAL - Architecture: Direct Database Access**

The route handler directly queries the database instead of using the repository pattern.

**Why this matters:**
Bypassing the repository layer violates v6 architecture and makes the code harder to test and maintain.

**Suggested fix:**
```typescript
// Instead of:
const user = await db.select().from(users).where(eq(users.id, userId));

// Use:
import { userRepository } from '@/lib/data/repositories';
const user = await userRepository.findById(userId);
```

**Reference:** AGENTS.md - Repository Pattern
````

#### Important Issue
````markdown
**🟡 IMPORTANT - Security: Missing Auth Guard**

The DELETE handler lacks authentication verification.

**Why this matters:**
Unauthenticated users could delete resources they don't own.

**Suggested fix:**
```typescript
import { requireAuth } from '@/lib/auth/guards';

export async function DELETE(request: Request) {
  const session = await getSession();
  requireAuth(session);
  // ... rest of handler
}
```

**Reference:** AGENTS.md - Guard Functions
````

---

## Review Checklist

### Architecture
- [ ] Uses Repository pattern for data access
- [ ] Business logic in Service layer
- [ ] Routes are slim, delegating to services
- [ ] Feature modules are self-contained
- [ ] Uses AppError subclasses for errors
- [ ] Uses guard functions for auth checks
- [ ] Uses AI registry for model access

### Code Quality
- [ ] TypeScript strict mode compliance (no `any`)
- [ ] Imports from barrel exports where available
- [ ] Zod schemas for validation
- [ ] Server Actions for mutations
- [ ] Follows existing coding patterns

### Security
- [ ] Session verification on protected routes
- [ ] Input validation with Zod
- [ ] No secrets in code
- [ ] Proper error handling

### Testing
- [ ] Unit tests for critical paths
- [ ] E2E tests for user flows
- [ ] Tests are well-named and focused

### Performance
- [ ] Streaming for AI responses
- [ ] No N+1 database queries
- [ ] Proper resource cleanup

### Validation
- [ ] `pnpm format` run
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

---

## Additional Resources

- [AGENTS.md](../../AGENTS.md) — Full project documentation
- [architecture-v6-final.md](../../.ouroboros/specs/refactor-migration/architecture-v6-final.md) — Canonical architecture
- [functional-structure-v6.md](../../.ouroboros/specs/refactor-migration/functional-structure-v6.md) — File-by-file specs
