# Architecture Deviations

## D-001
- **Deviation ID:** D-001
- **Title:** Next.js App Router Default Export Exception
- **Date:** 2026-02-22
- **Category:** framework-convention
- **Related Spec Issue/Gap:** SI-001
- **Spec says:** Use named exports only; avoid default exports.
- **We do instead:** Allow required default exports only for Next.js App Router file-convention files (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`); use named exports everywhere else.
- **Reason:** Next.js 16 requires default exports for specific convention files, so a blanket ban is not implementable.
- **Trade-offs:** Adds a targeted exception to a simple global rule and requires lint/docs clarity.
- **Severity:** critical
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — allow default exports only for App Router convention files.
- **Status:** approved

## D-002
- **Deviation ID:** D-002
- **Title:** Canonical Root Layout And Alias Policy
- **Date:** 2026-02-22
- **Category:** architecture-structure
- **Related Spec Issue/Gap:** SI-002
- **Spec says:** Mixed root guidance appears across docs (`components/*` and `src/components/*`, plus inconsistent type roots).
- **We do instead:** Lock `src/` as the canonical root and enforce `@/* -> src/*` for all new work.
- **Reason:** Ambiguous roots create duplicate modules, broken imports, and invalid scaffolding outcomes.
- **Trade-offs:** Requires migration mapping work and may force path updates in existing references.
- **Severity:** critical
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — `src/` canonical root with `@/* -> src/*`.
- **Status:** approved

## D-008
- **Deviation ID:** D-008
- **Title:** Enforced Cross-Feature Boundary Rules
- **Date:** 2026-02-22
- **Category:** architecture-boundary
- **Related Spec Issue/Gap:** SI-006
- **Spec says:** Cross-feature access is loosely defined ("actions only") without explicit enforceable restrictions.
- **We do instead:** Enforce explicit restricted-import rules so features can only consume approved public/action entrypoints from other features.
- **Reason:** Prevent hidden coupling and dependency cycles while preserving explicit integration seams.
- **Trade-offs:** Tighter rules can increase upfront refactor work and require documented public entrypoints.
- **Severity:** high
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed
