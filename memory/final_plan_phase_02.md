# Phase 02 — Data And Domain Contract Canonicalization Layer

**Scope:** Lock canonical naming and payload contracts so feature tasks execute against one stable target.

**Entry Gate:** P01-T08 complete

**Task Count:** 7

---

## Tasks

### P02-T01 — Define Canonical Domain Entity Map
- **Task ID:** P02-T01
- **Dependencies:** P01-T08
- **Complexity:** M
- **Success Criteria:**
  - Canonical entity names are listed for data, route, and UI boundaries
  - No alias or deprecated naming path remains in domain contracts
- **References:** D-003, G003

### P02-T02 — Specify Repository Contract Set for Chat and Artifact Version Flows
- **Task ID:** P02-T02
- **Dependencies:** P01-T08, P02-T01
- **Complexity:** M
- **Success Criteria:**
  - Repository interfaces define cache-first, DB-fallback behavior by identity mode
  - CRUD/version operations include explicit ownership and invalidation expectations

### P02-T03 — Define Canonical Cache Namespace and Key Invalidation Matrix
- **Task ID:** P02-T03
- **Dependencies:** P01-T08, P02-T01
- **Complexity:** M
- **Success Criteria:**
  - Cache key naming and scope are canonicalized for chats, messages, versions, suggestions, and quota
  - Invalidation triggers are documented per write path and identity branch

### P02-T04 — Define Canonical Message Retrieval Envelope
- **Task ID:** P02-T04
- **Dependencies:** P01-T08, P02-T02
- **Complexity:** M
- **Success Criteria:**
  - Paginated response is designated canonical as the only supported retrieval contract
  - Cursor and limit behavior includes deterministic examples for test fixtures
- **References:** D-005, D-PERF-002

### P02-T05 — Define Suggestion and Vote Persistence Branch Contracts
- **Task ID:** P02-T05
- **Dependencies:** P02-T02, P02-T03
- **Complexity:** S
- **Success Criteria:**
  - Guest vs regular persistence behavior is codified for suggestions and votes
  - Ownership and non-guest guards are explicitly tied to repository outcomes

### P02-T06 — Define Upload Metadata and Attachment Assembly Contract
- **Task ID:** P02-T06
- **Dependencies:** P02-T03
- **Complexity:** S
- **Success Criteria:**
  - Uploaded metadata shape and message-part conversion contract are explicit
  - Constraint boundaries (size/type/name) are mapped to deterministic error classes
- **References:** G006

### P02-T07 — Execute Data Contract Exit Verification
- **Task ID:** P02-T07
- **Dependencies:** P02-T04, P02-T05, P02-T06
- **Complexity:** S
- **Success Criteria:**
  - Canonical data contract artifacts are complete and referenced by Phase 03 task prerequisites
  - No unresolved blocker remains in naming, payload contract, or cache namespace definitions
