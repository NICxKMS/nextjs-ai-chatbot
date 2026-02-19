# Pattern Consistency Analysis

This directory contains analysis of pattern consistency across the codebase.

## Purpose

Pattern consistency analysis evaluates:

- Consistent use of error handling patterns
- Uniform data access patterns
- Consistent component structure
- Standard naming and export conventions

## Key Patterns

### Error Handling Pattern

v6 uses `AppError` class hierarchy:

```typescript
// ✅ Correct Pattern
import { AppError, ValidationError, NotFoundError } from '@/lib/errors';

if (!user) {
  throw new NotFoundError('User not found');
}

// ❌ Incorrect Pattern
if (!user) {
  return { error: 'User not found' };
}
```

### Guard Function Pattern

Auth/access checks use throw-based guards:

```typescript
// ✅ Correct Pattern
import { requireAuth, verifyOwnership } from '@/lib/auth/guards';

await requireAuth(); // Throws if not authenticated
await verifyOwnership(resource); // Throws if not owner

// ❌ Incorrect Pattern
const session = await getSession();
if (!session) {
  return redirect('/login');
}
```

### AI Model Registry Pattern

Use `getModel()` from registry:

```typescript
// ✅ Correct Pattern
import { getModel } from '@/lib/ai/registry';

const model = getModel('gpt-4');

// ❌ Incorrect Pattern
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4');
```

### Repository Pattern

Data access through repositories:

```typescript
// ✅ Correct Pattern
import { ChatRepository } from '@/lib/data/repositories';

const chats = await ChatRepository.findByUserId(userId);

// ❌ Incorrect Pattern
const chats = await db.select().from(chats).where(eq(chats.userId, userId));
```

## Analysis Areas

### Error Handling Consistency

| Pattern | Expected | Files to Check |
|---------|----------|----------------|
| Error Classes | `AppError` subclasses | `lib/errors/`, API routes |
| Error Messages | `getErrorMessage()` | All error throws |
| Error Boundaries | React error boundaries | Components |

### Data Access Consistency

| Pattern | Expected | Files to Check |
|---------|----------|----------------|
| Repository Usage | `*Repository` classes | Services, Routes |
| Service Usage | `*Service` classes | Routes, Actions |
| Query Functions | Named query functions | Data layer |

### Component Patterns

| Pattern | Expected | Files to Check |
|---------|----------|----------------|
| Barrel Exports | `index.ts` exports | Feature directories |
| Named Exports | Consistent export style | All modules |
| Type Exports | Co-located types | Feature directories |

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| `error-handling-consistency.md` | Error handling pattern analysis | Pending |
| `data-access-consistency.md` | Repository pattern consistency | Pending |
| `component-consistency.md` | Component structure consistency | Pending |
| `naming-conventions.md` | Naming convention analysis | Pending |
| `export-patterns.md` | Export pattern analysis | Pending |

## Methodology

1. **Pattern Definition**: Document expected patterns
2. **Code Scanning**: Find pattern implementations
3. **Deviation Detection**: Identify inconsistencies
4. **Impact Assessment**: Evaluate deviation severity
5. **Standardization Plan**: Propose fixes

## Output

This analysis produces:

- Pattern compliance scorecard
- Deviation report by category
- Standardization recommendations
- Migration guide for non-compliant code
