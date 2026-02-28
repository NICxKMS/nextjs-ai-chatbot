# Deviations from Architecture v6 Spec

> Every deviation from `architecture-v6-final.md` logged with justification.
> Deviations are tracked by ID (DEV-NNN) and severity.

## Severity Levels

| Level | Meaning |
|-------|---------|
| **MINOR** | Cosmetic or naming difference. No structural impact. |
| **STRUCTURAL** | Changes module boundaries, directory structure, or import graph. |
| **MAJOR** | Replaces a core pattern or eliminates a significant abstraction. |

## Deviation Files

| File | IDs | Summary |
|------|-----|---------|
| [deviations-01.md](deviations-01.md) | DEV-001 through DEV-015 | All deviations |

## Summary by Severity

| Severity | Count | Key Items |
|----------|-------|-----------|
| MAJOR | 4 | Repository pattern, Jotai, Result type, ApiResponse envelope |
| STRUCTURAL | 7 | src/ elimination, AI wrapper collocation, lib/hooks, auth-form, barrel files, services, action suffix |
| MINOR | 4 | Error code enum, ESLint→Biome, use cache gap, aspirational AI wrappers |

## Quick Reference

| ID | Title | Severity |
|----|-------|----------|
| DEV-001 | Eliminate `src/` directory | STRUCTURAL |
| DEV-002 | Colocate AI wrappers in features | STRUCTURAL |
| DEV-003 | Eliminate blanket `lib/hooks/` | STRUCTURAL |
| DEV-004 | Move auth form to feature | STRUCTURAL |
| DEV-005 | Function-based data access (no Repository) | MAJOR |
| DEV-006 | Plain modules (no Singleton services) | STRUCTURAL |
| DEV-007 | No Jotai (keep existing state patterns) | MAJOR |
| DEV-008 | No Result<T, E> type | MAJOR |
| DEV-009 | Optional barrel files (not mandatory) | STRUCTURAL |
| DEV-010 | No ApiResponse<T> envelope for streaming | MAJOR |
| DEV-011 | String literal error codes (not enum) | MINOR |
| DEV-012 | Biome enforcement (not ESLint boundary rules) | MINOR |
| DEV-013 | Add `use cache` strategy (missing from spec) | MINOR |
| DEV-014 | Don't build aspirational AI wrappers | MINOR |
| DEV-015 | Drop `.action.ts` file suffix | STRUCTURAL |
