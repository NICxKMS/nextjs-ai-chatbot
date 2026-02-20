# Simplification Backlog

> Prioritized list of code simplification opportunities

**Generated:** 2026-02-19  
**Total Items:** 47  
**Estimated LOC Savings:** ~850 LOC

---

## Priority Classification

| Priority | Criteria | Count |
|----------|----------|-------|
| P0 - Critical | Runtime errors, data loss, security | 3 |
| P1 - High | Architecture violations, major duplication | 8 |
| P2 - Medium | Code quality, maintainability | 18 |
| P3 - Low | Nice to have, cosmetic | 18 |

---

## P0 - Critical (Immediate Action Required)

### P0-001: Fix useSettings Naming Conflict
**Category:** Duplication  
**Effort:** Low (2h)  
**LOC Savings:** 0 (rename only)

**Problem:** Two different hooks share the same name useSettings, causing runtime confusion.

**Files:** features/settings/hooks/use-settings.ts, features/settings/index.ts

**Action:** Rename use-settings.ts:useSettings() to useUserPreferences().

---

### P0-002: Remove SettingsButton Placeholder
**Category:** Dead Code  
**Effort:** Low (1h)  
**LOC Savings:** 69

**Problem:** Placeholder SettingsButton masks real implementation.

**Files:** components/settings/settings-sheet.tsx (delete)

**Action:** Remove placeholder, update imports.

---

### P0-003: Fix Unsafe Type Casting in Message Transformation
**Category:** Type Safety  
**Effort:** Medium (4h)

**Problem:** convertToUIMessages() casts parts without validation.

**Files:** app/api/chat/route.ts, app/api/chat/[id]/reconnect/route.ts

**Action:** Add Zod validation for parts field.

---

## P1 - High (Next Sprint)

### P1-001: Consolidate ArtifactKind Type
**Effort:** Medium (4h) | **LOC Savings:** ~20

### P1-002: Fix Layer Violations in lib/
**Effort:** High (8h)

### P1-003: Consolidate Validation Functions
**Effort:** Medium (3h) | **LOC Savings:** ~30

### P1-004: Refactor Chat API POST Handler
**Effort:** High (8h)

### P1-005: Decompose artifact-panel.tsx
**Effort:** High (8h)

### P1-006: Create Shared Types Layer
**Effort:** Medium (4h) | **LOC Savings:** ~50

### P1-007: Implement Tool Registry Pattern
**Effort:** Medium (4h)

### P1-008: Remove Duplicate Pagination Types
**Effort:** Low (2h) | **LOC Savings:** ~15

---

## Summary

| Priority | Items | Total Effort | LOC Savings |
|----------|-------|--------------|-------------|
| P0 - Critical | 3 | 7h | 69 |
| P1 - High | 8 | 35h | ~115 |
| P2 - Medium | 18 | 25h | ~650 |
| P3 - Low | 18 | 10h | ~16 |
| **Total** | **47** | **77h** | **~850** |

---

## Quick Wins (Low Effort, High Impact)

| Item | Effort | Impact | Action |
|------|--------|--------|--------|
| P0-002 | 1h | HIGH | Delete placeholder file |
| P0-001 | 2h | HIGH | Rename hook |
| P1-008 | 2h | MEDIUM | Remove duplicate types |
| P2-001 | 1h | MEDIUM | Consolidate SidebarToggle |
| P2-002 | 1h | MEDIUM | Consolidate useScrollToBottom |

*End of Simplification Backlog*