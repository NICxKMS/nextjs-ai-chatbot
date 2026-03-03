> **Updated per redesign audit (2026-03-01)**

# Deviations from Architecture v6 Spec

> Every deviation from `architecture-v6-final.md` logged with justification.
> Deviations are tracked by ID (DEV-NNN) and severity.
> **Redesign additions:** DEV-016 through DEV-022 added for document→artifact rename, SettingsProvider removal, handler registry, ChatShell decomposition, proxy.ts, ChatStreamProvider/StreamBridge, and PendingChatsProvider.
> **Ambiguity resolutions:** DEV-028 (TooltipProvider root layout), DEV-029 (flat smoothStream delay).
> **CONF-001 resolution:** DEV-031 (visibility on ChatSessionValue).
> **SOFT-001/DUPL-001 resolution:** DEV-032 (VotesProvider structural addition). <!-- W4-CYCLE1 -->

## Severity Levels

| Level | Meaning |
|-------|---------|
| **MINOR** | Cosmetic or naming difference. No structural impact. |
| **STRUCTURAL** | Changes module boundaries, directory structure, or import graph. |
| **MAJOR** | Replaces a core pattern or eliminates a significant abstraction. |

## Deviation Files

| File | IDs | Summary |
|------|-----|---------|
| [deviations-01.md](deviations-01.md) | DEV-001 through DEV-032 | All deviations (original + redesign + wave 4) | <!-- W4-CYCLE1 -->

## Summary by Severity

| Severity | Count | Key Items |
|----------|-------|-----------|
| MAJOR | 7 | Repository pattern, Jotai, Result type, ApiResponse envelope, SettingsProvider removal, document→artifact rename, ChatShell decomposition |
| STRUCTURAL | 10 | src/ elimination, AI wrapper collocation, lib/hooks, auth-form, barrel files, services, action suffix, handler registry, proxy.ts, VotesProvider | <!-- W4-CYCLE1 -->
| MINOR | 6 | Error code enum, ESLint→Biome, use cache gap, aspirational AI wrappers, ChatStreamProvider/StreamBridge rename, PendingChatsProvider rename |

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
| DEV-016 | Document → Artifact complete rename | MAJOR |
| DEV-017 | SettingsProvider removed | MAJOR |
| DEV-018 | Handler registry (dependency inversion) | STRUCTURAL |
| DEV-019 | ChatShell decomposition (~60 lines) | MAJOR |
| DEV-020 | proxy.ts replaces middleware.ts | STRUCTURAL |
| DEV-021 | DataStreamProvider/Handler → ChatStreamProvider/StreamBridge | MINOR |
| DEV-022 | OptimisticChatsProvider → PendingChatsProvider | MINOR |
| DEV-028 | TooltipProvider at root layout | MINOR |
| DEV-029 | Flat smoothStream delay (2ms all providers) | MINOR |
| DEV-031 | Visibility inclusion on ChatSessionValue | MINOR |
| DEV-032 | VotesProvider structural addition | STRUCTURAL | <!-- W4-CYCLE1 -->
