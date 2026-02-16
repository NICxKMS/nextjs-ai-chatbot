# Phase 2: UI Primitives - Issues

**Phase Name:** UI Primitives
**Comparison Scope:** Button, Input, Textarea, Label, Badge, Card, Sheet, AlertDialog, DropdownMenu, Sidebar, ScrollArea, Separator, Skeleton, Progress, Tooltip, Select, Avatar, Carousel, Collapsible, HoverCard, Switch, Slider
**Date Started:** 2026-02-14
**Date Completed:** 2026-02-14

---

## Table of Contents

- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)
- [Issue Counts](#issue-counts)

---

## UI Inconsistencies

### P2-UI-001: Separator Replaced with Custom Implementation

| Field | Value |
|-------|-------|
| **Issue ID** | P2-UI-001 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/ui/separator.tsx:12-33` |
| **NEW Path** | `components/ui/separator.tsx:20-38` |

**Description:** The new Separator component does NOT use Radix UI primitive. It's a custom implementation using a plain `<div>` element instead of `SeparatorPrimitive.Root`. While the functionality is preserved (orientation, decorative prop), the Radix primitive provides additional accessibility features that may be missing.

**Impact:** The Radix Separator primitive automatically handles accessibility attributes like `aria-orientation` and ensures proper screen reader behavior. The custom implementation manually sets `role={decorative ? "none" : "separator"}` but may miss other accessibility features.

**Suggested Fix:** Consider restoring the Radix UI Separator primitive for better accessibility, or ensure all necessary ARIA attributes are manually implemented in the custom version.

---

## Bugs

*No bugs identified in this phase.*

---

## Broken Code

*No broken code identified in this phase.*

---

## Functional Discrepancies

*No functional discrepancies identified in this phase.*

---

## Improvement Only

### P2-IMP-001: Card Component Adds CardAction

| Field | Value |
|-------|-------|
| **Issue ID** | P2-IMP-001 |
| **Location** | `components/ui/card.tsx` |

**Description:** Card component adds CardAction sub-component for better card action handling.

**Status:** Enhancement - No action required.

---

### P2-IMP-002: Skeleton Component Adds Ref Forwarding

| Field | Value |
|-------|-------|
| **Issue ID** | P2-IMP-002 |
| **Location** | `components/ui/skeleton.tsx` |

**Description:** Skeleton component adds ref forwarding for better ref handling.

**Status:** Enhancement - No action required.

---

### P2-IMP-003: DropdownMenuCheckboxItem Default Checked

| Field | Value |
|-------|-------|
| **Issue ID** | P2-IMP-003 |
| **Location** | `components/ui/dropdown-menu.tsx` |

**Description:** DropdownMenuCheckboxItem has default `checked = false` for better defaults.

**Status:** Enhancement - No action required.

---

## Issue Counts

| Category | Count |
|----------|-------|
| UI Inconsistencies | 1 |
| Bugs | 0 |
| Broken Code | 0 |
| Functional Discrepancies | 0 |
| Improvement Only | 3 |
| **Total** | **4** |

### By Severity

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 0 |