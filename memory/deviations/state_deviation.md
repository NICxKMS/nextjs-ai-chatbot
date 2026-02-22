# State and Contract Deviations

## D-003
- **Deviation ID:** D-003
- **Title:** Immediate Artifact/Document Canonical Rename
- **Date:** 2026-02-22
- **Category:** data-canonicalization
- **Related Spec Issue/Gap:** G003, SI-003
- **Spec says:** Unification intent exists but mixed naming remains in contracts and tools.
- **We do instead:** Apply immediate canonical naming across data, route, and UI surfaces with no compatibility aliases.
- **Reason:** Keeps the rebuilt system free of transition/deprecation debt and enforces one consistent domain vocabulary.
- **Trade-offs:** Requires coordinated one-time refactor and fixture updates.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — immediate canonical rename, no alias/deprecation window.
- **Status:** approved

## D-010
- **Deviation ID:** D-010
- **Title:** Guest Lifecycle And Durability Contract
- **Date:** 2026-02-22
- **Category:** state-policy
- **Related Spec Issue/Gap:** G007
- **Spec says:** Guest bootstrap and durability semantics are incomplete.
- **We do instead:** Define clear guest lifecycle contract and user-facing durability messaging.
- **Reason:** Avoid UX ambiguity and support-policy drift.
- **Trade-offs:** Additional session-policy specification and validation work.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

## D-012
- **Deviation ID:** D-012
- **Title:** Opt-In Local Code Execution With Safety Fallbacks
- **Date:** 2026-02-22
- **Category:** artifact-security
- **Related Spec Issue/Gap:** G005
- **Spec says:** Local execution envelope lacks explicit constraints.
- **We do instead:** Make local execution opt-in with strict fallback and safety boundaries.
- **Reason:** Improve security and performance predictability.
- **Trade-offs:** Advanced execution behavior may be initially constrained.
- **Severity:** high
- **Blocking:** no
- **User Decision Required:** yes
- **User Decision:** approved — opt-in only with strict safety fallback.
- **Status:** approved
