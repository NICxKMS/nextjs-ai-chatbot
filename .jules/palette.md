## 2025-05-02 - Icon-only Button Accessibility
**Learning:** Icon-only buttons in the input area were missing `aria-label` and tooltips, making them inaccessible to screen readers and confusing for some users.
**Action:** Always wrap icon-only buttons in a `Tooltip` and provide a descriptive `aria-label`. When using custom components as children of `TooltipTrigger` (via `asChild`), ensure they use `forwardRef`.
