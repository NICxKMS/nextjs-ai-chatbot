## 2025-05-18 - Tooltips in Sidebar Context
**Learning:** `SidebarProvider` includes a `TooltipProvider`, so `Tooltip` components used within the main chat layout (wrapped by Sidebar) do not need their own `TooltipProvider`. When wrapping existing `Button` components (especially icon-only ones), `TooltipTrigger` must use `asChild` to preserve proper DOM nesting and accessibility attributes.
**Action:** When adding tooltips to buttons in the main app layout, use `<TooltipTrigger asChild><Button ... /></TooltipTrigger>` and omit `TooltipProvider`.
