## 2024-05-23 - Icon-only Button Accessibility
**Learning:** Many icon-only buttons (like `ArtifactCloseButton`) lacked both tooltips and accessible labels, making them invisible to screen readers and ambiguous to mouse users.
**Action:** Always wrap icon-only buttons in `Tooltip` and include `<span className="sr-only">Label</span>` inside the button for full accessibility.
