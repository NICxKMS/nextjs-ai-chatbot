# Phase 6: Naming Conventions Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 1            | 0   | 0   | 0   | 1   | 1h    |

---

### ISSUE-P6-001: Boolean Naming Pattern Violation

**File**: `features/sidebar/components/sidebar-history.tsx#L74`
**Severity**: P4 (Low)
**Category**: Naming Convention
**Hours**: 1h

**Problem**: Boolean state variables use `show*` pattern instead of recommended `is*` or `should*` pattern.

**Code**:

```tsx
// Current (line 74)
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
```

**Fix**:

```tsx
// Option 1: Use 'should' prefix
const [shouldShowDeleteDialog, setShouldShowDeleteDialog] = useState(false);

// Option 2: Use 'is...Open' pattern (preferred for dialogs)
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
```

**Notes**: Most files use proper kebab-case naming. This is a minor consistency issue.

---

## Validation Checklist

- [ ] Boolean naming patterns standardized
- [ ] All `show*` renamed to `is*Open`
