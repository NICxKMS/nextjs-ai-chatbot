# Phase 27: Codebase Consistency Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 3            | 0   | 0   | 2   | 1   | 9h    |

---

### ISSUE-P27-001: Biome Linting Rules Disabled

**File**: `biome.jsonc`
**Severity**: P3 (Medium)
**Category**: Code Quality
**Hours**: 6h

**Problem**: Multiple important linting rules are disabled.

**Disabled Rules**:
| Rule | Impact | Priority |
|------|--------|----------|
| `noExplicitAny` | Type safety | High |
| `noConsole` | Production logging | High |
| `noMagicNumbers` | Maintainability | Medium |
| `noNestedTernary` | Readability | Low |

**Fix Approach**:

1. Enable `noConsole` first (most impactful)
2. Enable `noExplicitAny` with gradual fixes
3. Enable remaining rules

```jsonc
{
  "linter": {
    "rules": {
      "suspicious": {
        "noConsole": "error", // Enable
        "noExplicitAny": "warn" // Enable as warning first
      }
    }
  }
}
```

---

### ISSUE-P27-002: Boolean Naming Pattern Violation

**File**: `features/sidebar/components/sidebar-history.tsx#L74`
**Severity**: P4 (Low)
**Category**: Naming Consistency
**Hours**: 1h

**Problem**: Boolean state uses `show*` pattern instead of `is*`.

**Code**:

```tsx
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
```

**Fix**:

```tsx
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
```

**Additional Occurrences**:

- Search codebase for `show[A-Z]` pattern
- Standardize to `is*` or `should*`

---

### ISSUE-P27-003: Type Safety Violations

**File**: Multiple test files
**Severity**: P3 (Medium)
**Category**: Type Safety
**Hours**: 2h

**Problem**: Use of `as unknown` bypasses TypeScript checks.

**Files**:

- `tests/unit/lib/utils/logger.test.ts`
- `tests/unit/lib/cache/*.test.ts`

**Code**:

```typescript
const mock = mockFn as unknown as SomeType;
```

**Fix**:

```typescript
// Option 1: Proper type narrowing
function isSomeType(value: unknown): value is SomeType {
  return typeof value === "object" && value !== null && "prop" in value;
}

// Option 2: Use generics
const mock = createMock<SomeType>();
```

---

## Consistency Standards

| Category       | Standard                        |
| -------------- | ------------------------------- |
| Booleans       | `is*`, `has*`, `should*` prefix |
| Event Handlers | `handle*` or `on*` prefix       |
| Type Guards    | `is*` prefix                    |
| Constants      | `SCREAMING_SNAKE_CASE`          |
| Files          | `kebab-case.ts`                 |

## Validation Checklist

- [ ] Biome rules progressively enabled
- [ ] Boolean naming standardized
- [ ] Type assertions minimized
