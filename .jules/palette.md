## 2024-05-21 - Icon-only Buttons Accessibility
**Learning:** Icon-only buttons in this project often lack `aria-label` and rely on `Tooltip` components that may be hidden on mobile.
**Action:** Always add explicit `aria-label` to icon-only `Button` components, even when wrapped in a `Tooltip`.
