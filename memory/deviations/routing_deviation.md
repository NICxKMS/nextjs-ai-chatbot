# Routing Deviations

## D-004
- **Deviation ID:** D-004
- **Title:** Visibility Authorization Matrix Before Route Finalization
- **Date:** 2026-02-22
- **Category:** routing-security
- **Related Spec Issue/Gap:** G001
- **Spec says:** Public/private route access semantics are ambiguous.
- **We do instead:** Publish endpoint-by-endpoint read/stream authorization matrix before route finalization.
- **Reason:** Security and privacy correctness depend on explicit access policy.
- **Trade-offs:** Higher upfront policy definition effort and coordination cost.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — private-by-default, public read-only sharing, stream/actions restricted by owner/session policy.
- **Status:** approved

## D-005
- **Deviation ID:** D-005
- **Title:** Canonical API Contract Without Compatibility Window
- **Date:** 2026-02-22
- **Category:** routing-contract
- **Related Spec Issue/Gap:** G004, SI-004
- **Spec says:** Legacy/full and paginated contract stance is under-defined.
- **We do instead:** Adopt a single canonical paginated contract and canonical payload fixtures immediately, with no legacy/full compatibility mode.
- **Reason:** Enforces clean code boundaries and avoids carrying compatibility/deprecated paths as technical debt.
- **Trade-offs:** Requires coordinated one-time client/test cutover.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — immediate canonical contract cutover, no compatibility window.
- **Status:** approved

## D-007
- **Deviation ID:** D-007
- **Title:** Explicit Slim-Route Responsibility Budget
- **Date:** 2026-02-22
- **Category:** routing-architecture
- **Related Spec Issue/Gap:** SI-005
- **Spec says:** Slim-route rule is broad and inconsistently exemplified.
- **We do instead:** Allow only guard, validate, delegate, and standardized response shaping in route handlers.
- **Reason:** Preserve layer boundaries and reduce review churn.
- **Trade-offs:** Some route-level helper boilerplate remains.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed
