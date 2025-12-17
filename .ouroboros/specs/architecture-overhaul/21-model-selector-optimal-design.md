# P2.8: Model Selector System - Optimal Architecture Design

**Status:** Proposed  
**Date:** 2024-12-17  
**Author:** Ouroboros Architect

---

## Feature/Module Purpose

Design the model selection UI for choosing AI models, displaying capabilities, and switching between providers.

---

## Context

### Current Implementation

**Two Variants Exist:**
1. [model-selector.tsx](components/model-selector.tsx) - Full dropdown (262 lines)
2. `ModelSelectorCompact` in [multimodal-input.tsx](components/multimodal-input.tsx#L462-L510) - Inline select

**Current Features:**
- Dropdown with model list grouped by provider
- Capability badges (reasoning, vision, audio, etc.)
- Model metadata (context window, price, release date)
- Refresh button for catalog reload
- Optimistic UI updates

**Data Source:** `ModelMetadata` from `lib/ai/model-catalog-types`

**Issues Identified:**
1. **Duplicate Implementations**: Full and compact selectors share no code
2. **No Search/Filter**: Hard to find models in long lists
3. **No Favorites**: No way to pin frequently used models
4. **Capabilities Not Validated**: User can select models incompatible with attachments
5. **No Model Comparison**: Can't compare specs side-by-side

---

## Key Requirements

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-MS-001 | Single source component with size variants | P0 |
| REQ-MS-002 | Model search/filter by name or capability | P1 |
| REQ-MS-003 | Capability compatibility warnings | P0 |
| REQ-MS-004 | Persist last-used model per chat | P1 |
| REQ-MS-005 | Model favorites/pinning | P2 |
| REQ-MS-006 | Keyboard navigation in dropdown | P0 |

---

## Optimal Architecture Design

### 1. Component Structure

```
model-selector/
├── index.ts                    # Barrel export
├── ModelSelector.tsx           # Unified component with variants
├── components/
│   ├── ModelDropdown.tsx       # Full dropdown UI
│   ├── ModelCompact.tsx        # Inline trigger for compact mode
│   ├── ModelCard.tsx           # Single model display
│   ├── ModelCapabilities.tsx   # Capability badges
│   ├── ModelSearch.tsx         # Search input
│   └── ProviderGroup.tsx       # Provider section header
├── hooks/
│   ├── useModelCatalog.ts      # Catalog data + refresh
│   ├── useModelSearch.ts       # Search/filter logic
│   └── useModelPersistence.ts  # Last-used storage
└── types.ts                    # Shared types
```

### 2. Unified Component API

```typescript
interface ModelSelectorProps {
  // Core props
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  availableModels: ModelMetadata[];
  
  // Variant control
  variant?: 'full' | 'compact';
  
  // Optional features
  showSearch?: boolean;
  showCapabilities?: boolean;
  showRefresh?: boolean;
  
  // Compatibility
  requiredCapabilities?: ModelCapability[];
  attachments?: Attachment[];
}

// Usage
<ModelSelector variant="full" showSearch />
<ModelSelector variant="compact" />
```

### 3. Capability Compatibility System

```typescript
// Warn when model doesn't support current attachments
interface CompatibilityWarning {
  modelId: string;
  reason: string;
  severity: 'error' | 'warning';
}

function checkCompatibility(
  model: ModelMetadata,
  attachments: Attachment[]
): CompatibilityWarning | null {
  if (attachments.some(a => a.contentType.startsWith('image/')) 
      && !model.capabilities.includes('vision')) {
    return {
      modelId: model.id,
      reason: 'This model does not support image attachments',
      severity: 'error'
    };
  }
  return null;
}
```

### 4. Model Search UX

```
┌─────────────────────────────────────┐
│ 🔍 Search models...                 │
├─────────────────────────────────────┤
│ Anthropic (3 models)                │
│ ┌─────────────────────────────────┐ │
│ │ Claude 3.5 Sonnet          ✓   │ │
│ │ Vision • Tools • 200K ctx      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Claude 3 Opus                   │ │
│ │ Vision • Tools • 200K ctx      │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ OpenAI (4 models)                   │
│ ...                                 │
└─────────────────────────────────────┘
```

### 5. State Management

```typescript
// hooks/useModelPersistence.ts
// Store last-used model per chat in localStorage

interface ModelPreferences {
  lastUsed: string;                    // Global default
  chatModels: Record<string, string>;  // Per-chat overrides
  favorites: string[];                 // Pinned models
}

function useModelPersistence(chatId: string) {
  const [prefs, setPrefs] = useLocalStorage<ModelPreferences>('model-prefs', {
    lastUsed: '',
    chatModels: {},
    favorites: []
  });
  
  return {
    getModelForChat: () => prefs.chatModels[chatId] ?? prefs.lastUsed,
    setModelForChat: (modelId: string) => { /* ... */ },
    toggleFavorite: (modelId: string) => { /* ... */ },
    isFavorite: (modelId: string) => prefs.favorites.includes(modelId)
  };
}
```

---

## Bundle Strategy

| Component | Strategy | Rationale |
|-----------|----------|-----------|
| ModelSelector | Static import | Required for chat |
| ModelSearch | Static (small) | ~2KB, improves UX significantly |
| ModelDropdown | Static | Core component |

**Target Bundle:** < 10KB gzipped

---

## Dependencies

| Dependency | Purpose | Bundle Impact |
|------------|---------|---------------|
| `@radix-ui/react-dropdown-menu` | Accessible dropdown | Already used |
| `cmdk` | Command palette search (optional) | ~8KB (P2) |
| `usehooks-ts` | localStorage persistence | Tree-shakeable |

---

## Consequences

### Positive
- **POS-001**: Unified component reduces maintenance burden
- **POS-002**: Search improves model discovery in large catalogs
- **POS-003**: Compatibility warnings prevent user errors

### Negative
- **NEG-001**: Compact variant slightly larger due to shared code
- **NEG-002**: Search adds ~2KB to bundle

---

## Alternatives Considered

### ALT-001: Command Palette (cmdk) for Model Selection
- **Description:** Use command palette pattern (⌘K) for model search
- **Rejected because:** Adds 8KB dependency, overkill for current model count; consider for P2 if catalog grows significantly

### ALT-002: Keep Separate Components
- **Description:** Maintain independent full/compact implementations
- **Rejected because:** Duplicate logic, inconsistent behavior, harder to add features

---

## Implementation Notes

1. **Unify first** - Create shared `ModelSelector` that renders both variants
2. **Add search second** - Simple `useMemo` filter, no external dependency
3. **Compatibility warnings** - Integrate with attachment state from parent
4. **Favorites (P2)** - Add after core refactor, requires localStorage schema
5. **Consider `cmdk`** - Revisit if model catalog exceeds 20+ models
