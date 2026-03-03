> **Updated per redesign audit (2026-03-01)**

# Seam-to-Task Traceability Matrix

> Maps every seam from the seam inventory to its implementing task(s).
> All 40 seams covered.
> Task IDs: P0-T01 through P7-T13. "artifact" naming throughout.
> SessionProvider (not AuthProvider), ChatStreamProvider (not DataStreamProvider),
> StreamBridge (not DataStreamHandler), PendingChatsProvider (not OptimisticChatsProvider),
> ArtifactHandler (not DocumentHandler), proxy.ts (not middleware.ts).

---

## Authentication & Session Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-001 | SessionProvider Injection (NOT AuthProvider) | P2-T06, P2-T08 | P2 |
| SEAM-002 | Auth Actions (Login/Register Server Actions) | P2-T03, P2-T04 | P2 |
| SEAM-003 | Guest Bootstrap (via proxy.ts) | P2-T03 | P2 |
| SEAM-004 | Guest Token Rotation (proxy.ts at edge) | P2-T08 | P2 |
| SEAM-005 | Session Resolution (`getAppSession()`) | P2-T01 | P2 |

## Chat Streaming Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-006 | Chat Request Pipeline (ChatShell → useChatSession → API) | P3-T11, P3-T21, P3-T23 | P3 |
| SEAM-007 | ChatStreamProvider Pipeline (NOT DataStream) | P3-T10 | P3 |
| SEAM-008 | Chat Completion Execution (`streamText` + tools) | P3-T02, P3-T23 | P3 |

## Chat ↔ Artifacts Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-009 | createArtifact Tool → ArtifactHandler (NOT createDocument) | P3-T13, P4-T04, P4-T06 | P3, P4 |
| SEAM-010 | updateArtifact Tool → ArtifactHandler (NOT updateDocument) | P3-T13, P4-T04, P4-T06 | P3, P4 |
| SEAM-011 | requestSuggestions Tool → Editor | P4-T07, P4-T16 | P4 |
| SEAM-012 | Artifact Stream → Panel (StreamBridge → artifactStore) | P3-T20, P4-T11, P4-T17 | P3, P4 |

## Chat ↔ Sidebar Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-013 | Pending Chat Creation (PendingChatsProvider, NOT OptimisticChats) | P5-T02, P5-T05 | P5 |
| SEAM-014 | Title Sync (single channel: `chat-title` stream → PendingChats.updateTitle, NO polling) | P5-T02, P5-T05 | P5 |

## Settings ↔ Chat Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-015 | Settings Pipeline (useSyncExternalStore + localStorage, NO SettingsProvider) | P3-T06, P3-T07, P3-T21 | P3 |

## Model Selection Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-016 | Model Catalog → Selector → Chat | P6-T04, P6-T05 | P6 |
| SEAM-017 | AI Provider Registry (NO vercel-gateway) | P1-T11, P1-T12, P6-T04 | P1, P6 |

## Voting Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-018 | Vote Mutation (Server Action + useOptimistic, NOT PATCH route, VoteResolver) | P6-T01, P6-T02, P6-T03 | P6 |

## File Upload Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-019 | File Upload → Message Attachment | P6-T09, P6-T10, P6-T11 | P6 |

## Sidebar History Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-020 | Sidebar History Pagination (SWRInfinite, server-fetched initial) | P5-T05, P5-T10 | P5 |

## Artifact Fetch Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-021 | Artifact Version Fetch (NOT Document) | P4-T15 | P4 |

## Visibility Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-022 | Visibility Toggle (Server Action + updateTag) | P6-T06, P6-T07, P6-T08 | P6 |

## Data Layer Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-023 | Session → Data Access | P1-T05 | P1 |
<!-- audit: W4-CONF-017/C1-9 — title aligned with seam-inventory.md per DEV-024 -->
| SEAM-024 | Chat Data Operations | P1-T06 | P1 |
| SEAM-025 | Artifact Data Operations (NOT Document) | P1-T08, P4-T15 | P1, P4 |
| SEAM-026 | Message Persistence | P1-T07, P3-T23, P3-T22 | P1, P3 |

## Error Handling Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-027 | Error Boundaries (4 levels) | P7-T01, P7-T02 | P7 | <!-- C2-W4: SEAM-027 fix -->
| SEAM-028 | Client Error Handling (useChat.onError → toast, NO gateway credit detection) | P3-T21, P3-T26 | P3 |

## UI Infrastructure Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-029 | Provider Tree Assembly (max 7 levels, scoped, NOT 9+ nested) | P0-T13, P2-T08, P3-T24, P5-T11 | P0, P2, P3, P5 |
| SEAM-030 | Theme System | P0-T12, P5-T06 | P0, P5 |
| SEAM-031 | URL State Management (history.replaceState + NoticeHandler) | P3-T21, P3-T25 | P3 |

## Artifact Editor Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-032 | Text Editor (TipTap + suggestions) | P4-T07 | P4 |
| SEAM-033 | Code Editor (CodeMirror + Pyodide) | P4-T08 | P4 |
| SEAM-034 | Sheet Editor (react-data-grid) | P4-T09 | P4 |
| SEAM-035 | Image Editor | P4-T10 | P4 |

## Miscellaneous Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-036 | Rate Limiting Pipeline (proxy.ts + route handlers, NO credit/quota) | P6-T09, P6-T13 | P6 |
| SEAM-037 | Pyodide Script Loading | P4-T08, P4-T17 | P4 |
| SEAM-038 | Message Edit + Regenerate | P3-T16, P3-T22 | P3 |
| SEAM-039 | Version Navigation + Restore | P4-T12 | P4 |
| SEAM-040 | Inline Artifact Preview → Panel (NOT Document Preview) | P4-T14 | P4 |

---

## Coverage Summary

| Category | Seam Count | Tasks Covering | Status |
|----------|-----------|----------------|--------|
| Authentication & Session | 5 | 6 tasks | ✅ Full |
| Chat Streaming | 3 | 5 tasks | ✅ Full |
| Chat ↔ Artifacts | 4 | 7 tasks | ✅ Full |
| Chat ↔ Sidebar | 2 | 3 tasks | ✅ Full |
| Settings ↔ Chat | 1 | 2 tasks | ✅ Full |
| Model Selection | 2 | 4 tasks | ✅ Full |
| Voting | 1 | 3 tasks | ✅ Full |
| File Upload | 1 | 3 tasks | ✅ Full |
| Sidebar History | 1 | 2 tasks | ✅ Full |
| Artifact Fetch | 1 | 1 task | ✅ Full |
| Visibility | 1 | 3 tasks | ✅ Full |
| Data Layer | 4 | 6 tasks | ✅ Full |
| Error Handling | 2 | 4 tasks | ✅ Full |
| UI Infrastructure | 3 | 7 tasks | ✅ Full |
| Artifact Editors | 4 | 4 tasks | ✅ Full |
| Miscellaneous | 5 | 5 tasks | ✅ Full |
| **Total** | **40** | **65 task refs** | **✅ 100%** |
