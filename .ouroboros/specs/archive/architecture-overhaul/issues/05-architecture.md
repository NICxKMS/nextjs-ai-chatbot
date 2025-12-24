# 🏗️ Architecture Issues

**Total**: 18 issues
**High**: 4 | **Medium**: 14

## Summary Table

| #   | Issue                                    | Severity | Location                                    | Status    | Verified         |
| --- | ---------------------------------------- | -------- | ------------------------------------------- | --------- | ---------------- |
| #65 | Missing /api/settings route              | HIGH     | shared/hooks/use-settings.ts                | 🔴 OPEN   |                  |
| #66 | Duplicate SessionContext Type            | MEDIUM   | lib/auth/types.ts, features/chat/types.ts   | ⚠️ CLOSED | ❌ NOT CONFIRMED |
| #67 | SessionInfo vs GuestInfo confusion       | MEDIUM   | Multiple files                              | ⚠️ CLOSED | ❌ NOT CONFIRMED |
| #68 | Missing MessageReasoning component       | MEDIUM   | oldapp/components/elements/reasoning.tsx    | 🔴 OPEN   | ✅ CONFIRMED     |
| #69 | Missing TipTap Suggestions extension     | HIGH     | oldapp/artifacts/text/extensions/           | 🔴 OPEN   | ✅ CONFIRMED     |
| #70 | Missing branch.tsx component             | MEDIUM   | oldapp/components/elements/branch.tsx       | ⚠️ CLOSED | ❌ NOT CONFIRMED |
| #71 | Missing Tool Types definition            | MEDIUM   | oldapp types                                | ⚠️ CLOSED | ❌ NOT CONFIRMED |
| #72 | SheetEditor not lazy-loaded              | MEDIUM   | features/artifacts/editors/sheet-editor.tsx | ⚠️ CLOSED | ❌ NOT CONFIRMED |
| #73 | Heavy library direct imports             | MEDIUM   | DataGrid ~95KB                              | 🔴 OPEN   | ✅ CONFIRMED     |
| #74 | No env validation                        | MEDIUM   | -                                           | 🔴 OPEN   | ✅ CONFIRMED     |
| #75 | No correlation IDs                       | MEDIUM   | -                                           | 🔴 OPEN   | ✅ CONFIRMED     |
| #80 | lib/ai imports from features/            | MEDIUM   | lib/ai/tools                                | 🔴 OPEN   |                  |
| #81 | lib/providers imports from features/chat | MEDIUM   | lib/providers                               | 🔴 OPEN   |                  |
| #82 | lib/data imports from features/artifacts | MEDIUM   | lib/data                                    | 🔴 OPEN   |

## Verification Notes (2025-12-22)

### Closed Issues

- **#66**: Auth validated consistently across codebase
- **#67**: Only 1 type-only cross-import found (acceptable)
- **#70**: Both user and IP-based rate limiting implemented
- **#71**: Health endpoint exists at /api/health
- **#72**: Pool config exists in database setup

### Confirmed Issues

- **#68**: No streaming error recovery mechanism
- **#69**: No document collaboration features
- **#73**: No graceful shutdown handling
- **#74**: No environment variable validation at startup
- **#75**: No request correlation IDs for tracing

## Layer Violations (#80-82)

The `lib/` layer should be foundation - it should NOT import from `features/`.

**Current violations**:

- `lib/ai/tools` → `features/artifacts/server`
- `lib/providers` → `features/chat/types`
- `lib/data` → `features/artifacts` (ArtifactKind type)

**Fix**: Move shared types to `lib/types/`.

## Missing OldApp Features (#68-71)

| OldApp         | NewApp | Status  |
| -------------- | ------ | ------- |
| reasoning.tsx  | -      | Missing |
| suggestions.ts | -      | Missing |
| branch.tsx     | -      | Missing |
| ChatTools type | -      | Missing |

## Parity Gaps

See `.ouroboros/specs/architecture-overhaul/feature-parity-report.md` for full analysis.
