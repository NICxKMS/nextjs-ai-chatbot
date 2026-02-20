# Memory: Facts

> Atomic verified truths - file imports, function calls, type locations, signatures

---

## Repository Facts (Wave 0 + Wave 1)

### F001-F026: Bootstrap Facts (Retained from Wave 0)

See initial bootstrap section in README.

---

## Wave 1 Facts

### File Statistics

| Fact ID | Category | Fact | Evidence |
|---------|----------|------|----------|
| F027 | Metrics | Total source files: 401 | Glob scan |
| F028 | Metrics | Total LOC: ~90,083 | wc -l aggregate |
| F029 | Metrics | Critical complexity files (>10): 6 | Scout reports |
| F030 | Metrics | Circular dependencies: 2 | Scout-09, Scout-14 |
| F031 | Metrics | Duplicate code patterns: 35+ | All scout reports |

### Entry Points

| Fact ID | File | Classification | Complexity |
|---------|------|----------------|------------|
| F032 | app/api/chat/route.ts | Entry Point | 18 ⚠️ CRITICAL |
| F033 | app/api/chat/[id]/reconnect/route.ts | Entry Point | 14 ⚠️ CRITICAL |
| F034 | app/api/history/route.ts | Entry Point | 12 ⚠️ CRITICAL |
| F035 | app/api/artifacts/route.ts | Entry Point | 10 |
| F036 | app/layout.tsx | Entry Point | 4 |
| F037 | middleware.ts | Entry Point | 5 |
| F038 | features/chat/components/chat.tsx | Domain Entry | 8 |

### Critical Complexity Files

| Fact ID | File | Complexity | Issue |
|---------|------|------------|-------|
| F039 | app/api/chat/route.ts | 18 | POST handler 389 lines |
| F040 | app/api/chat/[id]/reconnect/route.ts | 14 | collectReplayMessages 6 branches |
| F041 | app/api/history/route.ts | 12 | applyHistoryCursorAdapter 8 branches |
| F042 | features/artifact/components/artifact-panel.tsx | 15 | 12+ useState, complex effects |
| F043 | features/artifact/components/editors/code-editor.tsx | 11 | Dynamic imports, state sync |
| F044 | components/document/document.tsx | 12 | Nested ternaries |
| F045 | features/auth/components/auth-provider.tsx | 12 | Multiple effects, cross-tab sync |

### Circular Dependencies

| Fact ID | Source | Target | Severity |
|---------|--------|--------|----------|
| F046 | lib/db/pagination.ts | lib/data/types.ts | HIGH |
| F047 | lib/editor/suggestions-extension.tsx | features/artifact/types | MEDIUM (layer violation) |

### Type Duplications

| Fact ID | Type | Locations |
|---------|------|-----------|
| F048 | PaginationParams | lib/data/types.ts, lib/data/repositories/chat.repository.ts |
| F049 | PaginatedResult | lib/data/types.ts, lib/data/repositories/chat.repository.ts |
| F050 | RepositoryContext | lib/data/types.ts, lib/data/repositories/base.repository.ts |
| F051 | ChatWithMessages | lib/data/repositories/chat.repository.ts, lib/data/services/chat.service.ts |
| F052 | VisibilityType | features/chat/components/chat.tsx, features/chat/components/visibility-selector.tsx, features/chat/actions/update-visibility.action.ts |
| F053 | ArtifactKind | features/artifact/types.ts, features/artifact/schemas/artifact.schema.ts |
| F054 | MessageVote | components/ai/chat/message.tsx, components/ai/chat/conversation.tsx |
| F055 | isValidUUID | lib/utils/validation.ts, lib/api/validation.ts, lib/constants.ts |
| F056 | isValidEmail | lib/utils/validation.ts, lib/api/validation.ts |
| F057 | isValidUrl | lib/utils/validation.ts, lib/api/validation.ts |
| F058 | ErrorUserType | lib/errors.ts, lib/errors/messages.ts |
| F059 | getMessageByErrorCode | lib/errors.ts, lib/errors/messages.ts |

### Duplicate Implementations

| Fact ID | Component | Locations | Similarity |
|---------|-----------|-----------|------------|
| F060 | SettingsButton | components/settings/, features/settings/ | Different (placeholder vs full) |
| F061 | SidebarToggle | components/, features/sidebar/ | 95% |
| F062 | useScrollToBottom | hooks/, features/chat/hooks/ | 90% |
| F063 | useSettings | features/settings/provider, features/settings/hooks | Different implementations |
| F064 | convertToUIMessages | app/api/chat/route.ts, app/api/chat/[id]/reconnect/route.ts | 85% |

### Barrel Export Chains

| Fact ID | Export | Chain |
|---------|--------|-------|
| F065 | DEFAULT_APP_SETTINGS | types.ts → settings-provider.tsx → components/index.ts → index.ts |
| F066 | artifactKinds | features/artifact/types.ts, features/artifact/lib/artifact-class.ts |

---

## Validation Status

| Source | Validated | Timestamp |
|--------|-----------|-----------|
| Bootstrap (F001-F026) | ✅ | 2026-02-19 |
| Wave 1 (F027-F066) | ✅ | 2026-02-19 |

---

*Memory Integrity: 20/25 for Facts (Wave 1 complete)*
