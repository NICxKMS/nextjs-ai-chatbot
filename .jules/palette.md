## 2026-01-21 - Inconsistent Icon Button Accessibility
**Learning:** While complex components like `MessageActions` use a custom `Action` component with built-in accessibility (tooltips/aria-labels), standalone icon buttons like `ArtifactCloseButton` are often implemented as raw `Button` components without labels, creating accessibility gaps.
**Action:** Prefer using a standardized `IconButton` wrapper or ensuring `Tooltip` + `aria-label` are applied to all icon-only buttons to maintain consistency.
