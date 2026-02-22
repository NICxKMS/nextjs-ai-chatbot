# UI Parity Discovery Index

Scope: `oldapp/app/**` and `oldapp/components/**` user-facing behavior discovery for rebuild parity.

## Source Coverage Summary
- Covered route surfaces: chat home, chat detail, auth (login/register), route loading and error boundaries, global shell providers.
- Covered major component systems: chat timeline, input composer, sidebar/history, artifact/document panel, settings, tool results, toasts.
- Covered cross-cutting UX: responsive breakpoints, theme mode, keyboard shortcuts, stream/loading/error states, progressive rendering.
- Notable ambiguity: several imports referenced from `oldapp/components/*` are not present under `oldapp/components/elements` (listed in unknowns in checklist files).

## Files In This Folder
- `memory/ui/parity_checklist_1.md` - Screen-level parity checklist (routes, shells, page states, responsive + a11y expectations).
- `memory/ui/parity_checklist_2.md` - Feature-surface parity checklist (chat, sidebar, artifact workflows, edge/error states).
- `memory/ui/component_inventory_1.md` - Inventory of route and shell components with responsibilities and UI contracts.
- `memory/ui/component_inventory_2.md` - Inventory of interactive/compound components (chat body, artifact stack, inputs, utility UI).
- `memory/ui/interaction_states.md` - Unified state matrix: hover/focus/loading/error/empty/success/disabled/keyboard/responsive/animation.
- `memory/ui/parity_validation.md` - Coverage audit mapping each parity checklist item to phase tasks with zero/partial/full status and remediation.

## Conclusions
- Highest parity risk concentrates in streamed chat + artifact choreography (simultaneous optimistic updates, panel animations, versioning, inline vs fullscreen rendering).
- Sidebar behavior is stateful and device-specific (desktop collapse, mobile sheet, cookie persistence, keyboard shortcut); small mismatches will be highly visible.
- Auth and toast flows are straightforward visually but have many async edge outcomes that must map to precise user feedback copy.
- Latest parity validation status (`memory/ui/parity_validation.md`):
  - Total items: 21
  - Full: 21
  - Partial: 0
  - Zero: 0
  - Remaining high-risk partials: none.
