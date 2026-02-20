# Memory: Metrics

> Quantified measurements - complexity scores, duplication ratios, coupling density

---

## Repository-Level Metrics (Wave 1 Complete)

| Metric | Value | Source |
|--------|-------|--------|
| Total Files | 401 | Glob scan |
| Total LOC | 90,083 | Aggregate from scout reports |
| TypeScript Files | ~380 | Glob *.ts,*.tsx |
| Test Files | ~20 | tests/**, *.test.ts, *.test.tsx |
| Config Files | ~6 | *.config.*, tsconfig.json |

---

## Shard-Level Metrics (Wave 1 Complete)

| Shard | Module | Files | LOC | Exports | Cross-Edges | Complexity >10 | Dead Candidates |
|-------|--------|-------|-----|---------|-------------|----------------|-----------------|
| 01 | app/api routes | 14 | 3,152 | 26 | 42 | 3 | 2 |
| 02 | app/pages | 15 | 1,377 | 18 | 42 | 0 | 3 |
| 03 | features/chat | 43 | 9,410 | 152 | 47 | 0 | 0 |
| 04 | features/artifact | 35 | 6,103 | 119 | 31 | 2 | 1 |
| 05 | features/settings | 14 | 2,720 | 67 | 12 | 0 | 4 |
| 06 | features/sidebar | 10 | 2,050 | ~50 | 14 | 0 | 0 |
| 07 | features/input | 12 | 1,945 | ~45 | 11 | 0 | 0 |
| 08 | features/auth | 5 | 2,107 | ~35 | 8 | 1 | 0 |
| 09 | lib/db + lib/data | 22 | 8,350 | 147 | 38 | 0 | 3 |
| 10 | lib/ai | 13 | 4,861 | 67 | 9 | 0 | 1 |
| 11 | lib/auth + lib/api | 8 | ~2,500 | ~60 | 24 | 0 | 0 |
| 12 | lib/cache | 12 | 5,503 | ~50 | 14 | 0 | 0 |
| 13 | lib/utils | 16 | 2,657 | 56 | 114 | 0 | 2 |
| 14 | lib/errors + middleware | 24 | 8,725 | 274 | 32 | 0 | 2 |
| 15 | components/ui | 27 | 3,412 | 111 | 6 | 0 | 0 |
| 16 | components/ai | 59 | 8,700 | 280 | 45 | 0 | 7 |
| 17 | components/document | 15 | 2,120 | 46 | 8 | 1 | 4 |
| 18 | hooks + tests | 20 | ~2,000 | ~40 | 24 | 0 | 0 |
| **TOTAL** | | **401** | **90,083** | ~1,503 | 247 | **7** | **29** |

---

## Complexity Metrics (Wave 1 Complete)

### Files Exceeding Cyclomatic Complexity Threshold (>10)

| File | Complexity | Lines | Issue |
|------|------------|-------|-------|
| `app/api/chat/route.ts` | 18 | 623 | POST handler 389 lines, 15+ branches |
| `app/api/chat/[id]/reconnect/route.ts` | 14 | 407 | collectReplayMessages 6 branches |
| `app/api/history/route.ts` | 12 | 487 | applyHistoryCursorAdapter 8 branches |
| `features/artifact/components/artifact-panel.tsx` | 15 | 900 | 12+ useState, complex effects |
| `features/artifact/components/editors/code-editor.tsx` | 11 | 260 | Dynamic imports, state sync |
| `components/document/document.tsx` | 12 | 190 | Nested ternaries |
| `features/auth/components/auth-provider.tsx` | 12 | ~400 | Multiple effects, cross-tab sync |

### Complexity Distribution

| Range | Count | Percentage |
|-------|-------|------------|
| 1-3 (Low) | ~320 | 80% |
| 4-7 (Medium) | ~70 | 17% |
| 8-10 (Elevated) | ~4 | 1% |
| 11+ (Critical) | 7 | 2% |

---

## Coupling Metrics (Wave 1 Complete)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Circular Dependencies | 2 | 0 | ⚠️ REQUIRES FIX |
| Max Fan-In | 80+ (lib/utils) | <10 | ACCEPTABLE (utility) |
| Max Fan-Out | 20 (features/chat) | <10 | MONITOR (orchestrator) |
| Avg Fan-In | ~4 | <5 | ✅ GOOD |
| Avg Fan-Out | ~4 | <5 | ✅ GOOD |
| Coupling Density | Low-Medium | Low | ✅ ACCEPTABLE |

---

## Duplication Metrics (Wave 1 Complete)

| Category | Count | Severity |
|----------|-------|----------|
| Type Duplications | 15 | HIGH |
| Function Duplications | 12 | MEDIUM |
| Component Duplications | 5 | MEDIUM |
| Pattern Duplications | 8 | LOW |

### Type Duplications (HIGH Priority)

| Type | Locations |
|------|-----------|
| `PaginationParams` | lib/data/types.ts, lib/data/repositories/chat.repository.ts |
| `PaginatedResult` | lib/data/types.ts, lib/data/repositories/chat.repository.ts |
| `RepositoryContext` | lib/data/types.ts, lib/data/repositories/base.repository.ts |
| `ChatWithMessages` | lib/data/repositories/chat.repository.ts, lib/data/services/chat.service.ts |
| `VisibilityType` | features/chat/components/chat.tsx, features/chat/components/visibility-selector.tsx, features/chat/actions/update-visibility.action.ts |
| `ArtifactKind` | features/artifact/types.ts, features/artifact/schemas/artifact.schema.ts |
| `MessageVote` | components/ai/chat/message.tsx, components/ai/chat/conversation.tsx |
| `isValidUUID` | lib/utils/validation.ts, lib/api/validation.ts, lib/constants.ts |
| `isValidEmail` | lib/utils/validation.ts, lib/api/validation.ts |
| `isValidUrl` | lib/utils/validation.ts, lib/api/validation.ts |
| `ErrorUserType` | lib/errors.ts, lib/errors/messages.ts |
| `getMessageByErrorCode` | lib/errors.ts, lib/errors/messages.ts |

### Component Duplications

| Component | Locations | Similarity |
|-----------|-----------|------------|
| `SettingsButton` | components/settings/, features/settings/ | Different (placeholder vs full) |
| `SidebarToggle` | components/, features/sidebar/ | 95% |
| `useScrollToBottom` | hooks/, features/chat/hooks/ | 90% |
| `useSettings` | features/settings/provider, features/settings/hooks | Different implementations |

---

## Health Metrics (Wave 1 Complete)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Dead Exports | ~29 candidates | 0 | ⚠️ REQUIRES REVIEW |
| Layer Violations | 2 | 0 | ⚠️ REQUIRES FIX |
| God Files (>500 LOC) | 8 | 0 | ⚠️ MONITOR |
| Pass-Through Wrappers | ~12 | Minimize | ⚠️ REVIEW NEEDED |
| Barrel Export Chains | 15+ | Minimize | ⚠️ SIMPLIFY |

### God Files (>500 LOC)

| File | LOC | Issue |
|------|-----|-------|
| `lib/ai/registry.ts` | 1,354 | Large data structure inline |
| `components/ui/sidebar.tsx` | 828 | 26 exports in single file |
| `lib/data/repositories/message.repository.ts` | 869 | |
| `lib/data/repositories/chat.repository.ts` | 817 | |
| `lib/data/repositories/artifact.repository.ts` | 781 | |
| `lib/data/repositories/vote.repository.ts` | 790 | |
| `features/artifact/components/artifact-panel.tsx` | 900 | High complexity |
| `components/ai-elements/prompt-input.tsx` | 1,464 | Large primitive |

---

## Domain Cluster Metrics

| Cluster | Files | LOC | Complexity Avg |
|---------|-------|-----|----------------|
| Chat & Conversation | ~50 | ~11,500 | 4.2 |
| Artifact Management | ~35 | ~7,600 | 5.1 |
| Authentication | ~20 | ~4,000 | 4.0 |
| Settings | ~14 | ~2,700 | 3.5 |
| Sidebar & Navigation | ~15 | ~2,900 | 3.2 |
| Input & Multimodal | ~12 | ~3,400 | 3.8 |
| Data Layer | ~45 | ~14,000 | 3.5 |
| AI Integration | ~35 | ~12,500 | 4.0 |
| Infrastructure | ~60 | ~11,000 | 3.0 |

---

## Test Coverage Metrics

| Shard | Test Files | Coverage Est. |
|-------|------------|---------------|
| Shard 01 (API) | 0 | 0% |
| Shard 03 (Chat) | 1 | ~10% |
| Shard 04 (Artifact) | 1 | ~15% |
| Shard 13 (Utils) | 2 | ~30% |
| Shard 18 (Tests) | 6 | N/A |
| **Overall** | ~20 | ~15% |

---

*Memory Integrity: 20/25 for Metrics (Wave 1 complete)*
