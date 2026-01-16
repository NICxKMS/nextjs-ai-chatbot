## 2024-05-22 - Missing ARIA Labels on Icon Buttons
**Learning:** Several icon-only buttons (like close buttons in artifacts and suggestions) were missing accessible labels, relying on visual icons alone. This makes them unusable for screen reader users.
**Action:** Always check icon-only buttons for `aria-label` or `sr-only` text. Use `aria-label` for simple buttons and `sr-only` spans for more complex interactive elements where layout allows.
