# Seam-to-Task Traceability Matrix

> Maps every seam from the seam inventory to its implementing task(s).
> All 40 seams covered.

---

## Authentication & Session Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-001 | Auth Provider Injection | P02-T07, P02-T11 | P02 |
| SEAM-002 | Auth Exchange (Login/Register) | P02-T03, P02-T04 | P02 |
| SEAM-003 | Guest Bootstrap | P02-T08 | P02 |
| SEAM-004 | Guest Token Rotation | P02-T10 | P02 |
| SEAM-005 | Session Resolution | P02-T01 | P02 |

## Chat Streaming Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-006 | Chat Request Pipeline | P03-T09, P03-T19, P03-T20 | P03 |
| SEAM-007 | DataStream Pipeline | P03-T12 | P03 |
| SEAM-008 | Chat Completion Execution | P03-T07, P03-T09 | P03 |

## Chat ↔ Artifacts Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-009 | createDocument Tool → Handlers | P04-T09 | P04 |
| SEAM-010 | updateDocument Tool → Handlers | P04-T10 | P04 |
| SEAM-011 | requestSuggestions Tool → Editor | P04-T11 | P04 |
| SEAM-012 | Artifact Stream → Panel | P04-T17, P04-T21 | P04 |

## Chat ↔ Sidebar Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-013 | Optimistic Chat Creation | P05-T01, P05-T08 | P05 |
| SEAM-014 | Title Sync (Stream + Poll + Event) | P05-T09 | P05 |

## Settings ↔ Chat Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-015 | Settings Pipeline | P03-T04, P03-T19, P06-T07 | P03, P06 |

## Model Selection Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-016 | Model Catalog → Selector → Chat | P06-T04, P06-T05, P06-T06 | P06 |
| SEAM-017 | AI Provider Registry | P03-T01, P03-T02, P06-T04 | P03, P06 |

## Voting Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-018 | Vote Mutation | P06-T01, P06-T02, P06-T03 | P06 |

## File Upload Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-019 | File Upload → Message Attachment | P06-T09, P06-T10, P06-T11 | P06 |

## Sidebar History Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-020 | Sidebar History Pagination | P05-T05, P05-T07 | P05 |

## Document Fetch Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-021 | Document Version Fetch | P04-T20 | P04 |

## Visibility Seam

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-022 | Visibility Toggle | P06-T12, P06-T13, P06-T14 | P06 |

## Data Layer Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-023 | Data Context (Session → Branching) | P01-T05 | P01 |
| SEAM-024 | Chat Data Operations | P01-T07 | P01 |
| SEAM-025 | Document Data Operations | P01-T09, P04-T20 | P01, P04 |
| SEAM-026 | Message Persistence | P01-T08, P03-T09, P03-T10 | P01, P03 |

## Error Handling Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-027 | Error Boundaries (3 levels) | P07-T01, P07-T02, P07-T03 | P07 |
| SEAM-028 | Client Error Handling (onError) | P03-T19, P03-T23 | P03 |

## UI Infrastructure Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-029 | Provider Tree Assembly | P00-T05, P02-T11, P03-T21, P05-T10 | P00, P02, P03, P05 |
| SEAM-030 | Theme System | P00-T05, P05-T03 | P00, P05 |
| SEAM-031 | URL State Management | P03-T19, P03-T22 | P03 |

## Artifact Editor Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-032 | Text Editor (TipTap) | P04-T12 | P04 |
| SEAM-033 | Code Editor (CodeMirror + Pyodide) | P04-T13, P04-T14 | P04 |
| SEAM-034 | Sheet Editor (react-data-grid) | P04-T15 | P04 |
| SEAM-035 | Image Editor | P04-T16 | P04 |

## Miscellaneous Seams

| Seam ID | Description | Task ID(s) | Phase |
|---------|-------------|------------|-------|
| SEAM-036 | Rate Limiting Pipeline | P01-T13, P06-T02, P06-T09, P06-T17 | P01, P06 |
| SEAM-037 | Pyodide Script Loading | P04-T21 | P04 |
| SEAM-038 | Message Edit + Regenerate | P03-T10, P03-T15 | P03 |
| SEAM-039 | Version Navigation + Restore | P04-T18, P04-T20 | P04 |
| SEAM-040 | Inline Document Preview → Panel | P04-T19 | P04 |

---

## Coverage Summary

| Category | Seam Count | Tasks Covering | Status |
|----------|-----------|----------------|--------|
| Authentication & Session | 5 | 7 tasks | ✅ Full |
| Chat Streaming | 3 | 5 tasks | ✅ Full |
| Chat ↔ Artifacts | 4 | 4 tasks | ✅ Full |
| Chat ↔ Sidebar | 2 | 3 tasks | ✅ Full |
| Settings ↔ Chat | 1 | 3 tasks | ✅ Full |
| Model Selection | 2 | 5 tasks | ✅ Full |
| Voting | 1 | 3 tasks | ✅ Full |
| File Upload | 1 | 3 tasks | ✅ Full |
| Sidebar History | 1 | 2 tasks | ✅ Full |
| Document Fetch | 1 | 1 task | ✅ Full |
| Visibility | 1 | 3 tasks | ✅ Full |
| Data Layer | 4 | 6 tasks | ✅ Full |
| Error Handling | 2 | 5 tasks | ✅ Full |
| UI Infrastructure | 3 | 7 tasks | ✅ Full |
| Artifact Editors | 4 | 5 tasks | ✅ Full |
| Miscellaneous | 5 | 7 tasks | ✅ Full |
| **Total** | **40** | **74 task refs** | **✅ 100%** |
