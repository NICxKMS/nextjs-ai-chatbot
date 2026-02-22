# Performance Deviation Details

## D-PERF-001
- **Deviation ID:** D-PERF-001
- **Title:** Selective Barrel Exports For Runtime Efficiency
- **Date:** 2026-02-22
- **Category:** performance-architecture
- **Related Spec Issue/Gap:** SI-010
- **Spec says:** Every folder should expose a barrel export pattern.
- **We do instead:** Use selective barrels at package/public boundaries only and avoid deep/internal barrels.
- **Reason:** Mandatory barrels increase accidental imports and circular dependency risk, harming build/runtime performance.
- **Trade-offs:** Developers need clearer conventions for when direct-file imports are preferred.
- **Severity:** medium
- **Blocking:** no
- **User Decision Required:** yes
- **User Decision:** approved — selective barrels at public boundaries only.
- **Status:** approved

## D-PERF-002
- **Deviation ID:** D-PERF-002
- **Title:** Pagination-Only Canonical Contract Policy
- **Date:** 2026-02-22
- **Category:** api-performance
- **Related Spec Issue/Gap:** G004, SI-004
- **Spec says:** Legacy/full and paginated response modes remain co-equal without a performance-priority default.
- **We do instead:** Make paginated message/history contracts the only supported mode; remove legacy full-mode support.
- **Reason:** Eliminates unbounded payload risk and avoids preserving technical debt pathways.
- **Trade-offs:** Requires immediate client and fixture alignment to paginated contracts.
- **Severity:** high
- **Blocking:** yes
- **User Decision Required:** yes
- **User Decision:** approved — pagination-only canonical contract, no legacy full mode.
- **Status:** approved
