# Deviation Log

## Template Fields
- **Deviation ID**
- **Title**
- **Date**
- **Category**
- **Related Spec Issue/Gap**
- **Spec says**
- **We do instead**
- **Reason**
- **Trade-offs**
- **Severity**
- **Blocking**
- **User Decision Required**
- **User Decision**
- **Status**

## Entries (Master Summary)

### D-001
- **Deviation ID:** D-001
- **Title:** Next.js App Router Default Export Exception
- **Date:** 2026-02-22
- **Category:** framework-convention
- **Related Spec Issue/Gap:** SI-001
- **Spec says:** Named exports only and no default exports.
- **We do instead:** Allow default exports only where required by App Router file conventions; use named exports elsewhere.
- **Reason:** Framework-required defaults conflict with blanket export rule.
- **Trade-offs:** Requires explicit lint/documentation exception handling.
- **Severity:** critical
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — allow default exports only for App Router convention files.
- **Status:** approved

### D-002
- **Deviation ID:** D-002
- **Title:** Canonical Root Layout And Alias Policy
- **Date:** 2026-02-22
- **Category:** architecture-structure
- **Related Spec Issue/Gap:** SI-002
- **Spec says:** Mixed root/path guidance appears across docs.
- **We do instead:** Lock `src/` as canonical root and enforce `@/* -> src/*`.
- **Reason:** Prevent duplicate paths, import breakage, and scaffold drift.
- **Trade-offs:** Requires path migration and import cleanup.
- **Severity:** critical
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — `src/` canonical root with `@/* -> src/*`.
- **Status:** approved

### D-003
- **Deviation ID:** D-003
- **Title:** Immediate Artifact/Document Canonical Rename
- **Date:** 2026-02-22
- **Category:** data-canonicalization
- **Related Spec Issue/Gap:** G003, SI-003
- **Spec says:** Artifact/document unification intent exists but contracts remain mixed.
- **We do instead:** Apply immediate canonical naming across data, route, and UI surfaces with no compatibility aliases.
- **Reason:** Keeps rebuilt code free of transition/deprecation debt and enforces one vocabulary.
- **Trade-offs:** Requires coordinated one-time refactor and fixture updates.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — immediate canonical rename, no alias/deprecation window.
- **Status:** approved

### D-004
- **Deviation ID:** D-004
- **Title:** Visibility Authorization Matrix Before Route Finalization
- **Date:** 2026-02-22
- **Category:** routing-security
- **Related Spec Issue/Gap:** G001
- **Spec says:** Public/private read and stream access semantics are ambiguous.
- **We do instead:** Define endpoint-level authorization matrix before route finalization.
- **Reason:** Security/privacy posture must be explicit and testable.
- **Trade-offs:** Additional upfront policy design work.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — private-by-default, public read-only sharing, stream/actions restricted by owner/session policy.
- **Status:** approved

### D-005
- **Deviation ID:** D-005
- **Title:** Canonical API Contract Without Compatibility Window
- **Date:** 2026-02-22
- **Category:** routing-contract
- **Related Spec Issue/Gap:** G004, SI-004
- **Spec says:** Legacy/full and paginated API contract stance is under-defined.
- **We do instead:** Adopt a single canonical paginated contract and canonical payload fixtures immediately, with no legacy/full compatibility mode.
- **Reason:** Enforces clean code boundaries and avoids compatibility/deprecated technical debt.
- **Trade-offs:** Requires coordinated one-time client/test cutover.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — immediate canonical contract cutover, no compatibility window.
- **Status:** approved

### D-006
- **Deviation ID:** D-006
- **Title:** Single AI Capability Policy Authority
- **Date:** 2026-02-22
- **Category:** ai-policy
- **Related Spec Issue/Gap:** G002
- **Spec says:** Capability constraints are split across layers.
- **We do instead:** Centralize capability policy in shared `lib/ai` authority.
- **Reason:** Eliminate policy drift and inconsistent model behavior.
- **Trade-offs:** Shared policy module needs strong test/version discipline.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — centralize capability policy in shared `lib/ai`.
- **Status:** approved

### D-007
- **Deviation ID:** D-007
- **Title:** Explicit Slim-Route Responsibility Budget
- **Date:** 2026-02-22
- **Category:** routing-architecture
- **Related Spec Issue/Gap:** SI-005
- **Spec says:** Slim-route guidance is broad and inconsistently exemplified.
- **We do instead:** Restrict route handlers to guard, validate, delegate, and standardized response shaping.
- **Reason:** Preserve consistent layer boundaries and reviews.
- **Trade-offs:** Some route-level helper boilerplate remains.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

### D-008
- **Deviation ID:** D-008
- **Title:** Enforced Cross-Feature Boundary Rules
- **Date:** 2026-02-22
- **Category:** architecture-boundary
- **Related Spec Issue/Gap:** SI-006
- **Spec says:** Cross-feature constraints are not explicitly enforceable.
- **We do instead:** Enforce restricted imports to approved feature public/action entrypoints.
- **Reason:** Prevent hidden coupling and feature dependency cycles.
- **Trade-offs:** Tighter constraints can increase early refactor effort.
- **Severity:** high
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

### D-009
- **Deviation ID:** D-009
- **Title:** Selective Barrel Policy For AI Integration Surfaces
- **Date:** 2026-02-22
- **Category:** module-exports
- **Related Spec Issue/Gap:** SI-010
- **Spec says:** Barrel exports are required universally.
- **We do instead:** Use barrels only at public boundaries and avoid deep/internal barrels.
- **Reason:** Reduce cycle risk and bundle quality regressions.
- **Trade-offs:** Less uniform export style between folders.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

### D-010
- **Deviation ID:** D-010
- **Title:** Guest Lifecycle And Durability Contract
- **Date:** 2026-02-22
- **Category:** state-policy
- **Related Spec Issue/Gap:** G007
- **Spec says:** Guest lifecycle and durability semantics are incomplete.
- **We do instead:** Define explicit lifecycle contract and user-facing durability messaging.
- **Reason:** Avoid UX ambiguity and support inconsistency.
- **Trade-offs:** Requires additional policy and test definition work.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

### D-011
- **Deviation ID:** D-011
- **Title:** Canonical AI Error And Health Registry
- **Date:** 2026-02-22
- **Category:** ai-observability
- **Related Spec Issue/Gap:** G008
- **Spec says:** Error and health semantics are partially defined.
- **We do instead:** Define canonical status/error registry for AI and route boundaries.
- **Reason:** Improve operational predictability and observability.
- **Trade-offs:** Requires cross-team threshold/ownership alignment.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

### D-012
- **Deviation ID:** D-012
- **Title:** Opt-In Local Code Execution With Safety Fallbacks
- **Date:** 2026-02-22
- **Category:** artifact-security
- **Related Spec Issue/Gap:** G005
- **Spec says:** Local execution constraints are not explicit.
- **We do instead:** Make local execution opt-in with strict fallback and safety limits.
- **Reason:** Improve security and performance predictability.
- **Trade-offs:** Advanced execution capability may be initially constrained.
- **Severity:** high
- **Blocking:** no
- **User Decision Required:** yes
- **User Decision:** approved — opt-in only with strict safety fallback.
- **Status:** approved

### D-PERF-001
- **Deviation ID:** D-PERF-001
- **Title:** Selective Barrel Exports For Runtime Efficiency
- **Date:** 2026-02-22
- **Category:** performance-architecture
- **Related Spec Issue/Gap:** SI-010
- **Spec says:** Barrel exports are expected broadly across folders.
- **We do instead:** Keep selective barrels at public boundaries and avoid deep/internal barrels.
- **Reason:** Reduce hot-path import fanout and cycle/tree-shake risk.
- **Trade-offs:** Requires stricter guidance for import discipline.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** yes
- **User Decision:** approved — selective barrels at public boundaries only.
- **Status:** approved

### D-PERF-002
- **Deviation ID:** D-PERF-002
- **Title:** Pagination-Only Canonical Contract Policy
- **Date:** 2026-02-22
- **Category:** api-performance
- **Related Spec Issue/Gap:** G004, SI-004
- **Spec says:** Legacy/full and paginated payload modes are treated as co-equal.
- **We do instead:** Make paginated mode the only supported contract; remove full-mode compatibility path.
- **Reason:** Protect long-conversation latency and memory behavior while preventing legacy-path technical debt.
- **Trade-offs:** Requires immediate client and fixture alignment to paginated contracts.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — pagination-only canonical contract, no legacy full mode.
- **Status:** approved
