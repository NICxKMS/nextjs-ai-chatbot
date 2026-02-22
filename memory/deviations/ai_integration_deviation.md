# AI Integration Deviations

## D-006
- **Deviation ID:** D-006
- **Title:** Single AI Capability Policy Authority
- **Date:** 2026-02-22
- **Category:** ai-policy
- **Related Spec Issue/Gap:** G002
- **Spec says:** Model/tool/attachment capability constraints are split across layers.
- **We do instead:** Centralize capability policy in shared `lib/ai` authority consumed by UI, routes, and provider middleware.
- **Reason:** Prevent policy drift and inconsistent model behavior.
- **Trade-offs:** Shared policy module requires strong versioning and tests.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — centralize capability policy in shared `lib/ai`.
- **Status:** approved

## D-009
- **Deviation ID:** D-009
- **Title:** Selective Barrel Policy For AI Integration Surfaces
- **Date:** 2026-02-22
- **Category:** module-exports
- **Related Spec Issue/Gap:** SI-010
- **Spec says:** Universal barrel policy applies everywhere.
- **We do instead:** Use selective barrels at public boundaries and avoid internal/deep barrels.
- **Reason:** Reduce cycle and bundle-risk around AI integration surfaces.
- **Trade-offs:** Slightly less uniform export style across folders.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

## D-011
- **Deviation ID:** D-011
- **Title:** Canonical AI Error And Health Registry
- **Date:** 2026-02-22
- **Category:** ai-observability
- **Related Spec Issue/Gap:** G008
- **Spec says:** Health/error semantics are only partially defined.
- **We do instead:** Define canonical error/health registry consumed by AI and route boundaries.
- **Reason:** Ensure predictable incident behavior and observability.
- **Trade-offs:** Requires cross-team agreement on status thresholds and mappings.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** no
- **User Decision:** n/a
- **Status:** proposed

