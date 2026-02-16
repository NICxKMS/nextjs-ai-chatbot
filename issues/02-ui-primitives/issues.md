# Phase 2: UI Primitives - Issues

**Phase Name:** UI Primitives
**Comparison Scope:** Button, Input, Textarea, Label, Badge, Card, Sheet, AlertDialog, DropdownMenu, Sidebar, ScrollArea, Separator, Skeleton, Progress, Tooltip, Select, Avatar, Carousel, Collapsible, HoverCard, Switch, Slider
**Date Started:** 2026-02-14
**Date Completed:** 2026-02-14

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

## Table of Contents

- [Issue Counts](#issue-counts)
- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)

## VERIFICATION SUMMARY

| Issue | Status | Timestamp |
|-------|--------|-----------|
| P2-UI-001 | Verified | 2026-02-16T00:00:00Z |
| P2-IMP-001 | Improvement | 2026-02-16T00:00:00Z |
| P2-IMP-002 | Improvement | 2026-02-16T00:00:00Z |
| P2-IMP-003 | Improvement | 2026-02-16T00:00:00Z |

## UI Inconsistencies

### [P2-UI-001] Separator Replaced with Custom Implementation

| Field | Value |
|-------|-------|
| **Issue ID** | P2-UI-001 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/ui/separator.tsx:12-33` |
| **NEW Path** | `components/ui/separator.tsx:20-38` |

**Description:**
The new Separator component does NOT use Radix UI primitive. It's a custom implementation using a plain `<div>` element instead of `SeparatorPrimitive.Root`. While the functionality is preserved (orientation, decorative prop), the Radix primitive provides additional accessibility features that may be missing.

**Impact:**
The Radix Separator primitive automatically handles accessibility attributes like `aria-orientation` and ensures proper screen reader behavior. The custom implementation manually sets `role={decorative ? "none" : "separator"}` but may miss other accessibility features.

**Suggested Fix:**
Consider restoring the Radix UI Separator primitive for better accessibility, or ensure all necessary ARIA attributes are manually implemented in the custom version.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Issue accurately describes a real difference. Old code uses `SeparatorPrimitive.Root` from `radix-ui` with `"use client"` directive. Radix's `Separator.Root` automatically renders `aria-orientation` and `data-orientation` attributes on the DOM element. New code is a plain `<div>` that only manually sets `role={decorative ? "none" : "separator"}` — it does NOT set `aria-orientation` or `data-orientation`. This is a genuine accessibility regression for non-decorative separators used by screen readers. Benefit: removing `"use client"` allows server-component usage. The trade-off is real and the issue is valid.

## Bugs

*No Bugs identified in this phase.*

## Broken Code

*No Broken Code identified in this phase.*

## Functional Discrepancies

*No Functional Discrepancies identified in this phase.*

## Improvement Only

### [P2-IMP-001] Card Component Adds CardAction

| Field | Value |
|-------|-------|
| **Issue ID** | P2-IMP-001 |
| **Location** | `components/ui/card.tsx` |

**Description:** Card component adds CardAction sub-component for better card action handling.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed. Old card.tsx exports 6 components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter). New card.tsx exports all 6 unchanged plus a new `CardAction` component — a simple `forwardRef` div with `className={cn("flex items-center", className)}`. All 6 existing component implementations are identical between old and new. No regressions. Pure additive enhancement.

### [P2-IMP-002] Skeleton Component Adds Ref Forwarding

| Field | Value |
|-------|-------|
| **Issue ID** | P2-IMP-002 |
| **Location** | `components/ui/skeleton.tsx` |

**Description:** Skeleton component adds ref forwarding for better ref handling.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed. Old skeleton.tsx is a plain function `function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>)` — no ref support. New skeleton.tsx uses `forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>` with `ref` passed to the inner `<div>`. CSS classes are identical (`animate-pulse rounded-md bg-muted`). Pure additive change enabling parent components to attach refs. No regressions.

### [P2-IMP-003] DropdownMenuCheckboxItem Default Checked

| Field | Value |
|-------|-------|
| **Issue ID** | P2-IMP-003 |
| **Location** | `components/ui/dropdown-menu.tsx` |

**Description:** DropdownMenuCheckboxItem has default `checked = false` for better defaults.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed. Old code destructures `checked` without default: `({ className, children, checked, ...props }, ref)`. New code adds `checked = false`. When consumers omit the `checked` prop, old code passed `undefined` to Radix (uncontrolled mode), new code passes `false` (controlled, explicitly unchecked). All other code in DropdownMenuCheckboxItem is identical. In practice this is a safe default since most consumers pass `checked` explicitly. Minor behavioral difference: uncontrolled → controlled default. No regressions expected in typical usage.
