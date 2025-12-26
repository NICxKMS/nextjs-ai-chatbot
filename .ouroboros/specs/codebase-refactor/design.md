# Design: Codebase Refactoring Project

> **Phase**: 3/5 - Design  
> **Input**: [research.md](./research.md), [requirements.md](./requirements.md)  
> **Created**: 2025-12-26  
> **Status**: 🟢 Approved

---

## Overview

This design document outlines the technical architecture changes required to address 250+ identified issues across the codebase. The approach follows a layered refactoring strategy, starting with foundational utilities and progressing through route refactoring, validation consolidation, and pattern standardization.

### Design Principles

1. **Single Source of Truth**: Each concern (validation, error handling, auth) has exactly one implementation
2. **Thin Controllers**: API routes delegate to services, keeping handlers under 50 lines
3. **Fail Fast**: Validate early with centralized Zod schemas
4. **Progressive Enhancement**: Each wave builds on previous waves without breaking changes
5. **Type Safety**: Full TypeScript coverage with proper type inference

---

## Architecture

### Current vs Target Architecture

`mermaid
flowchart TB
    subgraph Current["Current State (Problematic)"]
        direction TB
        R1[Route 1<br/>123 lines, 9 concerns]
        R2[Route 2<br/>108 lines, 8 concerns]
        R3[Route 3<br/>102 lines, 8 concerns]
        V1[Validator A]
        V2[Validator B]
        V3[Inline Validation]
        E1[Error Handler 1]
        E2[Error Handler 2]
    end
    
    subgraph Target["Target State (Clean)"]
        direction TB
        TR1[Route 1<br/>~28 lines]
        TR2[Route 2<br/>~25 lines]
        TR3[Route 3<br/>~35 lines]
        VM[Validation Module<br/>lib/validation/]
        EH[Error Handler<br/>lib/services/error-handler.ts]
        SL[Service Layer<br/>lib/services/]
    end
    
    TR1 --> VM
    TR2 --> VM
    TR3 --> VM
    TR1 --> EH
    TR2 --> EH
    TR3 --> EH
    TR1 --> SL
    TR2 --> SL
    TR3 --> SL
`

### Component Overview

| Component | Responsibility | File(s) | Covers REQs |
|-----------|---------------|---------|-------------|
| UUID Utilities | Centralized UUID validation | `lib/utils/uuid.ts` | REQ-W1-001 |
| Route Helpers | Parameter validation, body parsing | `lib/api/route-helpers.ts` | REQ-W1-002, REQ-W1-003 |
| Service Error Handler | Unified service error handling | `lib/services/error-handler.ts` | REQ-W1-004 |
| Validation Module | Centralized Zod schemas | `lib/validation/` | REQ-W3-001 |
| File Service | File upload business logic | `lib/services/file-service.ts` | REQ-W2-003 |
| Result Types | Unified result type hierarchy | `lib/types/result.ts` | REQ-W5-001 |

---

## New Module Designs

### 1. UUID Utilities (NEW)

**File**: `lib/utils/uuid.ts`

`	ypescript
// lib/utils/uuid.ts

/**
 * RFC 4122 compliant UUID v4 validation regex
 * Fixes bug: Previous regex missing version check [1-5] in third segment
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Zod schema for UUID validation
 * Use in parseJsonBody and other Zod-based validation
 */
export const uuidSchema = z.string().refine(isValidUUID, {
  message: 'Invalid UUID format',
});

/**
 * Extracts and validates UUID from various sources
 * @throws AppError if invalid
 */
export function requireUUID(value: unknown, fieldName = 'id'): string {
  if (!isValidUUID(value)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid UUID format for '` + fieldName,
      { field: fieldName, value: String(value) }
    );
  }
  return value;
}
`

**Why This Design**: 
- Single regex definition eliminates 12 duplicate implementations
- Zod schema integration enables seamless use with `parseJsonBody`
- `requireUUID` provides throwing variant for explicit error handling

**Covers**: REQ-W1-001

---

### 2. Service Error Handler (NEW)

**File**: `lib/services/error-handler.ts`

`	ypescript
// lib/services/error-handler.ts

import { AppError, ErrorCode } from '@/lib/errors';
import { errorLogger } from '@/lib/services/error-logger-service';

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Wraps a service operation with consistent error handling and logging
 * Eliminates ~180 LOC of duplicated try-catch blocks
 */
export async function handleServiceOperation<T>(
  operation: () => Promise<T>,
  context: {
    service: string;
    method: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ServiceResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    // Log before transformation (addresses V2-009)
    errorLogger.error('Service operation failed', {
      service: context.service,
      method: context.method,
      error: error instanceof Error ? error.message : String(error),
      ...context.metadata,
    });

    if (error instanceof AppError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        details: { originalError: String(error) },
      },
    };
  }
}

/**
 * Higher-order function to wrap entire service methods
 * Usage: const getChat = withErrorHandling('ChatService', 'getChat', async (id) => {...})
 */
export function withErrorHandling<TArgs extends unknown[], TResult>(
  service: string,
  method: string,
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<ServiceResult<TResult>> {
  return async (...args: TArgs) => {
    return handleServiceOperation(
      () => fn(...args),
      { service, method, metadata: { args } }
    );
  };
}
`

**Why This Design**:
- Eliminates 17 identical try-catch patterns across services
- Adds logging (missing in original - V2-009)
- Provides both function wrapper and HOF patterns

**Covers**: REQ-W1-004

---

### 3. Validation Module (NEW)

**File**: `lib/validation/index.ts`

`	ypescript
// lib/validation/index.ts

export * from './schemas/common';
export * from './schemas/chat';
export * from './schemas/document';
export * from './schemas/vote';
export * from './schemas/file';

// Re-export Zod for convenience
export { z } from 'zod';
`

**File**: `lib/validation/schemas/common.ts`

`	ypescript
// lib/validation/schemas/common.ts

import { z } from 'zod';
import { isValidUUID } from '@/lib/utils/uuid';

// Common schemas used across the application
export const uuidSchema = z.string().refine(isValidUUID, 'Invalid UUID');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const timestampSchema = z.coerce.date();

export const idParamSchema = z.object({
  id: uuidSchema,
});
`

**File**: `lib/validation/schemas/vote.ts`

`	ypescript
// lib/validation/schemas/vote.ts

import { z } from 'zod';
import { uuidSchema } from './common';

export const voteSchema = z.object({
  chatId: uuidSchema,
  messageId: uuidSchema,
  isUpvote: z.boolean(),
});

export const getVoteSchema = z.object({
  chatId: uuidSchema,
});

export type VoteInput = z.infer<typeof voteSchema>;
export type GetVoteInput = z.infer<typeof getVoteSchema>;
`

**Why This Design**:
- Consolidates 4 different validation patterns into Zod-only
- Type inference via `z.infer` eliminates duplicate type definitions
- Modular structure allows tree-shaking

**Covers**: REQ-W3-001

---

### 4. Enhanced Route Helpers (MODIFY)

**File**: `lib/api/route-helpers.ts`

`	ypescript
// lib/api/route-helpers.ts (additions)

import { z, ZodSchema } from 'zod';
import { isValidUUID, requireUUID } from '@/lib/utils/uuid';

/**
 * Parse and validate JSON body with Zod schema
 * @param request - NextRequest object
 * @param schema - Zod schema for validation
 * @returns Validated and typed data
 * @throws AppError on parsing or validation failure
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  
  try {
    body = await request.json();
  } catch {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body'
    );
  }

  const result = schema.safeParse(body);
  
  if (!result.success) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      { errors: formatZodErrors(result.error) }
    );
  }

  return result.data;
}

/**
 * Extract and validate UUID parameter from URL
 * @param params - Route params object
 * @param paramName - Name of the parameter
 * @returns Validated UUID string
 * @throws AppError if invalid
 */
export function getUUIDParam(
  params: Record<string, string | undefined>,
  paramName = 'id'
): string {
  const value = params[paramName];
  return requireUUID(value, paramName);
}

/**
 * Format Zod errors into user-friendly structure
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
}
`

**Why This Design**:
- `parseJsonBody` now has full Zod integration
- `getUUIDParam` uses centralized UUID validation
- `formatZodErrors` provides consistent error formatting

**Covers**: REQ-W1-002, REQ-W1-003

---

### 5. Refactored Vote Route (MODIFY)

**File**: `app/api/vote/route.ts`

`	ypescript
// app/api/vote/route.ts (AFTER - ~28 lines vs 123 lines)

import { NextRequest } from 'next/server';
import { requireAuthForRoute, handleApiError, parseJsonBody, withRateLimit } from '@/lib/api/route-helpers';
import { VoteService } from '@/lib/services/vote-service';
import { voteSchema, getVoteSchema } from '@/lib/validation';

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const session = await requireAuthForRoute();
    const params = await parseJsonBody(request, getVoteSchema);
    
    const result = await VoteService.getVotes(params.chatId, session.user.id);
    
    return Response.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const session = await requireAuthForRoute();
    const input = await parseJsonBody(request, voteSchema);
    
    const result = await VoteService.createVote(input, session.user.id);
    
    if (!result.success) {
      throw new AppError(result.error!.code, result.error!.message);
    }
    
    return Response.json(result.data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
`

**Why This Design**:
- Route is now a thin controller (~28 lines vs 123)
- All validation via schemas
- Business logic in VoteService
- Consistent error handling

**Covers**: REQ-W2-001

---

### 6. Result Type Hierarchy (NEW)

**File**: `lib/types/result.ts`

`	ypescript
// lib/types/result.ts

/**
 * Unified Result type for all operations
 * Replaces: ServiceResult, StorageResult, ActionResult, OperationResult, RetryResult
 */
export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

export type ServiceResult<T> = Result<T, ServiceError>;
export type StorageResult<T> = Result<T, StorageError>;
export type ActionResult<T> = Result<T, ActionError>;

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface StorageError {
  code: 'NOT_FOUND' | 'WRITE_FAILED' | 'READ_FAILED';
  message: string;
}

export interface ActionError {
  code: string;
  message: string;
  field?: string;
}

// Type guards
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

// Helper functions
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
`

**Why This Design**:
- Discriminated union provides type safety
- Common base with specialized variants
- Type guards enable exhaustive checking
- Helper functions for ergonomic creation

**Covers**: REQ-W5-001

---

## Sequence Diagrams

### Happy Path: Vote Creation (After Refactoring)

`mermaid
sequenceDiagram
    participant U as User
    participant R as Vote Route
    participant V as Validation
    participant S as VoteService
    participant D as Database
    
    U->>R: POST /api/vote
    R->>R: requireAuthForRoute()
    R->>V: parseJsonBody(voteSchema)
    V-->>R: Validated input
    R->>S: VoteService.createVote()
    S->>S: handleServiceOperation()
    S->>D: Insert vote
    D-->>S: Vote created
    S-->>R: Result<Vote>
    R-->>U: 201 Created
`

### Error Path: Validation Failure

`mermaid
sequenceDiagram
    participant U as User
    participant R as Vote Route
    participant V as Validation
    participant E as Error Handler
    
    U->>R: POST /api/vote (invalid)
    R->>R: requireAuthForRoute()
    R->>V: parseJsonBody(voteSchema)
    V-->>R: ZodError
    R->>E: handleApiError()
    E-->>U: 400 Bad Request
`

---

## File Change Summary

### Files to CREATE

| File | Purpose | Wave | LOC Est |
|------|---------|------|---------|
| `lib/utils/uuid.ts` | UUID validation | 1 | ~30 |
| `lib/services/error-handler.ts` | Service error handling | 1 | ~60 |
| `lib/services/file-service.ts` | File upload service | 2 | ~80 |
| `lib/validation/index.ts` | Validation barrel | 3 | ~10 |
| `lib/validation/schemas/common.ts` | Common schemas | 3 | ~30 |
| `lib/validation/schemas/vote.ts` | Vote schemas | 3 | ~20 |
| `lib/validation/schemas/document.ts` | Document schemas | 3 | ~30 |
| `lib/validation/schemas/chat.ts` | Chat schemas | 3 | ~40 |
| `lib/validation/schemas/file.ts` | File schemas | 3 | ~20 |
| `lib/types/result.ts` | Unified Result type | 5 | ~50 |

### Files to MODIFY (Major)

| File | Changes | Wave | LOC Change |
|------|---------|------|------------|
| `lib/api/route-helpers.ts` | Add validation helpers | 1, 3 | +50 |
| `app/api/vote/route.ts` | Thin controller | 2 | -95 |
| `app/api/document/route.ts` | Thin controller | 2 | -83 |
| `app/api/files/upload/route.ts` | Thin controller | 2 | -67 |
| `lib/services/chat-service.ts` | Use error handler | 1 | -40 |
| `lib/services/document-service.ts` | Use error handler | 1 | -40 |
| `lib/services/vote-service.ts` | Use error handler | 1 | -10 |
| 47 files | Migrate process.env | 5 | ~0 (changes) |

### Files to DELETE

| File | Reason | Wave |
|------|--------|------|
| `features/chat/hooks/use-invalidation-handler.ts` | Unused | 4 |
| `features/chat/components/data-stream-handler.tsx` | Deprecated | 4 |
| `lib/auth/session-manager.ts` | Deprecated | 4 |

### Files to PARTIALLY MODIFY

| File | Changes | Wave |
|------|---------|------|
| `lib/utils/date.ts` | Remove `toUnixTimestamp` | 4 |
| `lib/errors/messages.ts` | Consolidate or remove | 4 |

---

## Migration Strategy

### Phase 1: Non-Breaking Additions (Waves 1-3)

1. **Add new modules** without removing old code
2. **Update consumers incrementally** to use new modules
3. **Deprecate old code** with `@deprecated` JSDoc tags
4. **Run full test suite** after each change

### Phase 2: Breaking Changes (Waves 4-5)

1. **Remove deprecated code** after all consumers migrated
2. **Update imports** across codebase
3. **Run type-check** to catch missing migrations
4. **Update documentation**

### Phase 3: Polish (Waves 6-10)

1. **Standardize patterns** across remaining files
2. **Optimize performance** where identified
3. **Update tests** to match new patterns
4. **Final documentation** pass

---

## Testing Strategy

### Unit Tests Required

| Module | Test File | Coverage Target |
|--------|-----------|-----------------|
| UUID utilities | `tests/unit/lib/utils/uuid.test.ts` | 100% |
| Error handler | `tests/unit/lib/services/error-handler.test.ts` | 100% |
| Validation schemas | `tests/unit/lib/validation/*.test.ts` | 100% |
| Result types | `tests/unit/lib/types/result.test.ts` | 100% |

### Integration Tests Required

| Endpoint | Test File | Scenarios |
|----------|-----------|-----------|
| Vote API | `tests/integration/api/vote.test.ts` | CRUD, validation, auth |
| Document API | `tests/integration/api/document.test.ts` | CRUD, ownership |
| File Upload | `tests/integration/api/files.test.ts` | Upload, validation |

### E2E Tests

- Existing E2E tests should pass without modification
- Add new E2E tests for migrated functionality

---

## Rollback Plan

### Per-Wave Rollback

Each wave is implemented in a feature branch:

`ash
# If Wave 2 needs rollback
git revert --no-commit HEAD~N  # N = commits in Wave 2
# Or
git checkout main -- app/api/vote/route.ts
`

### Feature Flags

For high-risk changes, use feature flags:

`	ypescript
// lib/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_NEW_VALIDATION: process.env.USE_NEW_VALIDATION === 'true',
  USE_NEW_ERROR_HANDLER: process.env.USE_NEW_ERROR_HANDLER === 'true',
};
`

---

**Design Complete** ✅
