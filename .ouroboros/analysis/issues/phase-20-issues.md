# Phase 20: Performance Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 12           | 0   | 3   | 5   | 4   | 13.5h |

---

### ISSUE-P20-001: Missing Memoization in Message Item

**File**: `features/chat/components/message-item.tsx`
**Severity**: P2 (High)
**Category**: React Performance
**Hours**: 1h

**Problem**: Message callbacks recreated on each render.

**Fix**:

```typescript
const handleCopy = useCallback(() => {
  copyToClipboard(message.content);
}, [message.content]);

const handleRegenerate = useCallback(() => {
  regenerate(message.id);
}, [message.id, regenerate]);
```

---

### ISSUE-P20-002: Multiple useState in Chat Input

**File**: `features/chat/components/prompt-input.tsx`
**Severity**: P3 (Medium)
**Category**: React Performance
**Hours**: 1.5h

**Problem**: 3 related state values could be single object.

**Fix**:

```typescript
// Before
const [input, setInput] = useState("");
const [attachments, setAttachments] = useState([]);
const [isSubmitting, setIsSubmitting] = useState(false);

// After
const [formState, dispatch] = useReducer(formReducer, initialState);
```

---

### ISSUE-P20-003: Unnecessary Re-renders in Model Selector

**File**: `features/chat/components/model-selector.tsx`
**Severity**: P3 (Medium)
**Category**: React Performance
**Hours**: 1h

**Problem**: Component state changes trigger full re-render.

**Fix**:

```typescript
export const ModelSelector = memo(
  function ModelSelector(props) {
    // ...
  },
  (prev, next) => {
    return (
      prev.selectedModel === next.selectedModel && prev.models === next.models
    );
  }
);
```

---

### ISSUE-P20-004: No Lazy Loading for Editors

**File**: `features/artifacts/components/artifact-editor.tsx`
**Severity**: P2 (High)
**Category**: Bundle Size
**Hours**: 3h

**Problem**: CodeMirror/Monaco loaded eagerly, blocking initial render.

**Fix**:

```typescript
const CodeEditor = dynamic(() => import("./code-editor"), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});
```

---

### ISSUE-P20-005: Large Bundle - ReactFlow Import

**File**: `components/ai-elements/canvas.tsx`
**Severity**: P3 (Medium)
**Category**: Bundle Size
**Hours**: 1.5h

**Problem**: Full ReactFlow package imported for simple canvas.

**Fix**: Use dynamic import with tree-shaking:

```typescript
const ReactFlow = dynamic(
  () => import("@xyflow/react").then((mod) => mod.ReactFlow),
  { ssr: false }
);
```

---

### ISSUE-P20-006: Vote Map Memoization

**File**: `features/chat/components/chat-messages.tsx`
**Severity**: P4 (Low)
**Category**: React Performance
**Hours**: 0h

**Status**: ✅ VERIFIED GOOD - Vote map already properly memoized.

---

### ISSUE-P20-007: N+1 Query Risk in Parallel Loader

**File**: `lib/data/loaders.ts`
**Severity**: P2 (High)
**Category**: Database Performance
**Hours**: 2h

**Problem**: Multiple individual queries in parallel could be batched.

**Code**:

```typescript
await Promise.all(ids.map((id) => getChatById(id)));
```

**Fix**:

```typescript
const chats = await db
  .select()
  .from(schema.chat)
  .where(inArray(schema.chat.id, ids));
```

---

### ISSUE-P20-008: Multiple useEffect in Chat Input

**File**: `features/chat/components/prompt-input.tsx`
**Severity**: P3 (Medium)
**Category**: React Performance
**Hours**: 1h

**Problem**: 3 separate useEffect for localStorage logic.

**Fix**: Combine into single effect or custom hook:

```typescript
const { persistedValue, setPersisted } = useLocalStorage("draft", "");
```

---

### ISSUE-P20-009: Settings Virtualization

**File**: `features/settings/components/settings-panel.tsx`
**Severity**: P4 (Low)
**Category**: React Performance
**Hours**: 0h

**Status**: ✅ ACCEPTABLE - Current list is small, virtualization unnecessary.

---

### ISSUE-P20-010: Context Value Recreation

**File**: `features/chat/components/chat-provider.tsx`
**Severity**: P4 (Low)
**Category**: React Performance
**Hours**: 0h

**Status**: ✅ VERIFIED GOOD - Comment notes useMemo not needed due to stable references.

---

### ISSUE-P20-011: Inline SVG Icons

**File**: `shared/components/icons/*.tsx`
**Severity**: P4 (Low)
**Category**: Bundle Size
**Hours**: 2h

**Problem**: Icons defined inline increase bundle size.

**Fix**: Consider SVG sprite or icon component with lazy loading.

---

### ISSUE-P20-012: Missing Route Prefetch

**File**: `features/sidebar/components/sidebar-history.tsx`
**Severity**: P3 (Medium)
**Category**: Navigation Performance
**Hours**: 0.5h

**Problem**: Chat links don't prefetch on hover.

**Fix**:

```typescript
<Link href={`/chat/${chat.id}`} prefetch>
  {chat.title}
</Link>
```

---

## Performance Budget

| Metric        | Current | Target |
| ------------- | ------- | ------ |
| LCP           | ~2.5s   | <2.5s  |
| FID           | ~100ms  | <100ms |
| CLS           | ~0.1    | <0.1   |
| Bundle (main) | ~300KB  | <250KB |

## Validation Checklist

- [ ] All callbacks memoized
- [ ] Heavy components lazy loaded
- [ ] N+1 queries converted to batch
- [ ] Route prefetching enabled
