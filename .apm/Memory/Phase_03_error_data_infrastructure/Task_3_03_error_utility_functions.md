---
agent: Agent_DataLayer
task_ref: Task 3.3
status: Completed
ad_hoc_delegation: false
compatibility_issues: false
important_findings: false
---

# Task Log: Task 3.3 - Fix Error Utility Functions

## Summary
Implemented database error handling utilities including `DatabaseError` class, `toDatabaseError()`, `mapPostgresCodeToError()`, and guest-specific error messages. All functions follow v6 architecture patterns using the existing `AppError` hierarchy.

## Details

### Knowledge Acquisition
1. **Checked New App First**: Searched `lib/errors/` - found existing `AppError` hierarchy but no `DatabaseError` class or database error mapping functions
2. **Read Reference Code**: Analyzed `archive/oldapp/lib/errors.ts` for `toDatabaseError()` and `mapPostgresCodeToError()` implementations
3. **Architecture Comparison**: 
   - v5 used template literal error codes (`bad_request:database:unique_violation`)
   - v6 uses simpler `ErrorCodes` constants (`DATABASE_ERROR`, `VALIDATION_ERROR`)
   - Decision: Adapt v5 logic to v6 patterns with `AppError` subclasses

### Implementation
1. Created `lib/errors/database.ts` with:
   - `PostgresError` interface for type-safe error handling
   - `PostgresErrorCodes` constant with known PostgreSQL error codes
   - `DatabaseError` class extending `AppError` with `postgresCode`, `operation`, `constraint`, `table` properties
   - `isPostgresError()` and `isDatabaseError()` type guards
   - `mapPostgresCodeToError()` - maps Postgres codes to error info (code, message, statusCode, type)
   - `toDatabaseError()` - wraps raw Postgres errors into typed `AppError` instances
   - Helper functions: `isUniqueViolation()`, `isForeignKeyViolation()`, `isConnectionError()`, `isTimeoutError()`, `isDeadlockError()`

2. Updated `lib/errors/messages.ts` with:
   - `ErrorUserType` type for context-aware messages (`guest`, `regular`, `unknown`)
   - `guestSpecificMessages` - guest-specific error messages guiding sign-in
   - `getErrorMessageWithContext()`, `getErrorTitleWithContext()`, `getErrorActionWithContext()`, `getErrorInfoWithContext()` - contextual message functions

3. Created `lib/errors/index.ts` barrel export for all error utilities

### Quality Gates
- `pnpm format`: Passed (1 file fixed)
- `pnpm typecheck`: Passed (0 errors)
- `pnpm lint`: Passed (36 pre-existing warnings, 0 new errors)

## Output
- Created: `lib/errors/database.ts` (13,374 chars)
- Modified: `lib/errors/messages.ts` (16,054 chars)
- Created: `lib/errors/index.ts` (barrel export)

### Key Code Snippets

**DatabaseError class:**
```typescript
export class DatabaseError extends AppError {
  readonly postgresCode: string | undefined
  readonly operation: string
  readonly constraint: string | undefined
  readonly table: string | undefined
  
  constructor(operation: string, message: string, options?: {...}) { ... }
}
```

**toDatabaseError function:**
```typescript
export function toDatabaseError(
  operation: string,
  error: unknown,
  fallbackMessage?: string,
): AppError { ... }
```

## Issues
None

## Next Steps
- Database operations can now use `toDatabaseError()` for consistent error handling
- Guest users will see contextual messages guiding sign-in for common errors
