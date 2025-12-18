# P2.7: Toolbar System - Optimal Architecture Design

**Status:** Proposed  
**Date:** 2024-12-17  
**Author:** Ouroboros Architect

---

## Feature/Module Purpose

Design the contextual toolbar system for artifact interactions, providing action buttons and keyboard shortcuts based on artifact type.

---

## Context

### Current Implementation ([toolbar.tsx](components/toolbar.tsx))

**Component Size:** 497 lines - moderately complex

**Current Features:**

- Floating action button (FAB) pattern
- Tool selection with hover/click states
- Reading level slider (drag-based)
- Artifact-type-specific tool sets
- Auto-hide on streaming, hover timeout
- Stop button during AI response

**Architecture Pattern:**

- `Tool` - Individual action button with tooltip
- `Tools` - Container for primary + secondary tools
- `ReadingLevelSelector` - Drag-based level picker
- `Toolbar` - Main orchestrator (memo'd)

**Issues Identified:**

1. **Framer Motion Heavy**: 7 motion components, complex animations
2. **Tight Coupling**: `artifactDefinitions` directly imported
3. **No Keyboard Shortcuts**: All interactions require mouse
4. **Reading Level UX**: Drag interaction not discoverable
5. **No Tool Extensibility**: Hard-coded tool types

---

## Key Requirements

| REQ-ID     | Requirement                                         | Priority |
| ---------- | --------------------------------------------------- | -------- |
| REQ-TB-001 | Keyboard shortcuts for all toolbar actions          | P0       |
| REQ-TB-002 | Tool actions must work during streaming (stop only) | P0       |
| REQ-TB-003 | Toolbar visibility state persisted in URL/session   | P2       |
| REQ-TB-004 | Custom tools per artifact type                      | P0       |
| REQ-TB-005 | Accessible focus management                         | P1       |
| REQ-TB-006 | Reduce animation bundle impact                      | P1       |

---

## Optimal Architecture Design

### 1. Component Structure

```
toolbar/
├── index.ts                    # Barrel export
├── Toolbar.tsx                 # Container + keyboard handler
├── components/
│   ├── ToolButton.tsx          # Single action button
│   ├── ToolGroup.tsx           # Grouped actions
│   ├── StopButton.tsx          # Streaming stop action
│   └── ReadingLevelPicker.tsx  # Simplified level selector
├── hooks/
│   ├── useToolbarShortcuts.ts  # Keyboard bindings
│   ├── useToolbarVisibility.ts # Auto-hide logic
│   └── useToolRegistry.ts      # Dynamic tool registration
└── types.ts                    # Tool definitions
```

### 2. Tool Registry Pattern

```typescript
// types.ts
interface ToolDefinition {
  id: string;
  label: string;
  icon: React.ComponentType;
  shortcut?: string; // e.g., "mod+shift+r"
  action: (ctx: ToolContext) => void | Promise<void>;
  isAvailable?: (ctx: ToolContext) => boolean;
  isActive?: (ctx: ToolContext) => boolean;
}

interface ToolContext {
  sendMessage: UseChatHelpers["sendMessage"];
  artifactKind: ArtifactKind;
  isStreaming: boolean;
}

// Registry pattern for extensibility
const toolRegistry = new Map<ArtifactKind, ToolDefinition[]>();
```

### 3. Keyboard Shortcuts Architecture

```typescript
// hooks/useToolbarShortcuts.ts
const TOOLBAR_SHORTCUTS = {
  "mod+shift+r": "adjust-reading-level",
  "mod+shift+s": "summarize",
  "mod+shift+e": "explain",
  escape: "close-toolbar",
} as const;

// Uses useHotkeys from react-hotkeys-hook
// Scoped to artifact panel, not global
```

### 4. Simplified Reading Level UX

**Current:** Drag-based (not discoverable)  
**Proposed:** Dropdown menu with keyboard navigation

```
┌──────────────────────────┐
│ Reading Level        ▼  │
├──────────────────────────┤
│ ○ Elementary            │
│ ○ Middle School         │
│ ● High School (current) │
│ ○ College               │
│ ○ Graduate              │
└──────────────────────────┘
```

### 5. Animation Optimization

```typescript
// Replace heavy framer-motion with CSS transitions
// Before: 7 motion.div components
// After: CSS-based with reduced motion support

.toolbar-button {
  transition: transform 150ms ease, opacity 150ms ease;
}

.toolbar-button:hover {
  transform: scale(1.05);
}

@media (prefers-reduced-motion: reduce) {
  .toolbar-button {
    transition: none;
  }
}
```

---

## Bundle Strategy

| Component          | Strategy                | Rationale                  |
| ------------------ | ----------------------- | -------------------------- |
| Toolbar            | Dynamic import          | Only loaded with artifacts |
| ToolButton         | Static (within Toolbar) | Core toolbar element       |
| ReadingLevelPicker | Lazy within Toolbar     | Optional feature           |

**Animation Strategy:**

- Replace `framer-motion` animations with CSS transitions
- Keep `framer-motion` only for `AnimatePresence` (enter/exit)
- Estimated savings: ~8KB gzipped

**Target Bundle:** < 12KB gzipped (down from ~20KB)

---

## Dependencies

| Dependency           | Purpose                 | Bundle Impact  |
| -------------------- | ----------------------- | -------------- |
| `framer-motion`      | AnimatePresence only    | Partial import |
| `react-hotkeys-hook` | Keyboard shortcuts      | ~3KB           |
| `usehooks-ts`        | Click outside detection | Tree-shakeable |

---

## Consequences

### Positive

- **POS-001**: Keyboard shortcuts improve accessibility and power-user experience
- **POS-002**: Tool registry enables plugin-like extensibility
- **POS-003**: CSS animations reduce bundle size

### Negative

- **NEG-001**: New dependency (`react-hotkeys-hook`) adds ~3KB
- **NEG-002**: Reading level UX change requires user adjustment

---

## Alternatives Considered

### ALT-001: Keep Framer Motion for All Animations

- **Rejected because:** Bundle impact too high for simple hover/scale effects

### ALT-002: Global Keyboard Shortcuts

- **Rejected because:** Conflicts with OS/browser shortcuts, scope should be artifact panel

---

## Implementation Notes

1. **Extract `useToolbarShortcuts` first** - Can add keyboard support without restructuring
2. **CSS transition migration** - Replace `motion.div` one component at a time
3. **Reading level picker** - Convert drag to dropdown in separate PR
4. **Tool registry** - Implement after basic refactor, enables future extensibility
