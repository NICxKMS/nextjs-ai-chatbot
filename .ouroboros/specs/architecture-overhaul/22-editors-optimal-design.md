# 22-Editors-Optimal-Design

> **Module**: P2.9 - Editor Components  
> **Priority**: HIGH  
> **Status**: DESIGN COMPLETE  
> **Author**: Ouroboros Architect  
> **Date**: 2024-12-17

---

## 1. Purpose

**Business Capability**: Rich content editing for code, text, spreadsheets, and images within the artifact system.

Four specialized editors serve distinct content types:

- **CodeEditor**: Python code with syntax highlighting (CodeMirror)
- **TextEditor**: Markdown/rich text with math support (TipTap)
- **SheetEditor**: CSV/spreadsheet data manipulation (react-data-grid)
- **ImageEditor**: Base64 image display with loading states

**Success Criteria**:

- Initial render <200ms for all editors
- Code-split per editor type (not bundled together)
- Consistent `EditorProps` interface across all editors
- Memory-efficient module caching

---

## 2. Key Requirements

### 2.1 Current State Analysis

| Editor      | Bundle                  | Lazy Loaded | Interface    |
| ----------- | ----------------------- | ----------- | ------------ |
| CodeEditor  | ~180KB (CodeMirror)     | ✅ Yes      | Custom props |
| TextEditor  | ~120KB (TipTap)         | ❌ No       | EditorProps  |
| SheetEditor | ~95KB (react-data-grid) | ❌ No       | Custom props |
| ImageEditor | ~2KB                    | ❌ No       | Custom props |

**Problems Identified**:

1. Inconsistent prop interfaces across editors
2. TextEditor TipTap not lazy-loaded despite heavy bundle
3. No shared editor state management pattern
4. Duplicate loading/streaming state handling

### 2.2 Functional Requirements

| ID    | Requirement                                                       |
| ----- | ----------------------------------------------------------------- |
| ED-01 | Unified `EditorProps` interface for all editors                   |
| ED-02 | Lazy load ALL heavy editors (CodeMirror, TipTap, react-data-grid) |
| ED-03 | Shared streaming state handling via hook                          |
| ED-04 | Suggestion overlay support for Code + Text editors                |
| ED-05 | Consistent save debouncing across editors                         |

### 2.3 Non-Functional Requirements

| ID      | Requirement        | Target |
| ------- | ------------------ | ------ |
| ED-NF01 | First paint        | <150ms |
| ED-NF02 | Module load time   | <500ms |
| ED-NF03 | Memory per editor  | <50MB  |
| ED-NF04 | Shared bundle size | <5KB   |

---

## 3. Architecture Design

### 3.1 Decision: Unified Interface with Factory Pattern

**ADR-022-001: Unified Editor Interface**

```typescript
// Unified props interface
interface EditorProps {
  content: string;
  onSaveContent: (content: string, debounce: boolean) => void;
  status: "streaming" | "idle";
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions?: SuggestionLike[];
  // Editor-specific via discriminated union
  editorType: "code" | "text" | "sheet" | "image";
}

// Factory pattern for lazy loading
const EditorLoader = {
  code: () => import("./editors/code-editor"),
  text: () => import("./editors/text-editor"),
  sheet: () => import("./editors/sheet-editor"),
  image: () => import("./editors/image-editor"),
};
```

**Rejected Alternative**: Single mega-editor component

- Would bundle all dependencies together
- Violates single responsibility principle

### 3.2 Component Hierarchy

```
components/
├── editors/
│   ├── index.ts              # Re-exports + factory
│   ├── types.ts              # Shared EditorProps
│   ├── use-editor-state.ts   # Shared streaming/save logic
│   ├── code-editor.tsx       # CodeMirror lazy wrapper
│   ├── text-editor.tsx       # TipTap lazy wrapper
│   ├── sheet-editor.tsx      # react-data-grid lazy wrapper
│   └── image-editor.tsx      # Simple display component
```

### 3.3 Lazy Loading Strategy

```typescript
// code-editor.tsx - Module caching pattern (KEEP)
let codeMirrorModulesPromise: Promise<CodeMirrorModules> | null = null;

function loadCodeMirrorModules(): Promise<CodeMirrorModules> {
  if (codeMirrorModulesPromise) return codeMirrorModulesPromise;

  codeMirrorModulesPromise = Promise.all([
    import("@codemirror/state"),
    import("@codemirror/view"),
    import("codemirror"),
    import("@codemirror/lang-python"),
    import("@codemirror/theme-one-dark"),
  ]).then(/* merge modules */);

  return codeMirrorModulesPromise;
}
```

**Apply same pattern to TextEditor**:

```typescript
// text-editor.tsx - ADD lazy loading
let tiptapModulesPromise: Promise<TipTapModules> | null = null;

function loadTipTapModules(): Promise<TipTapModules> {
  if (tiptapModulesPromise) return tiptapModulesPromise;

  tiptapModulesPromise = Promise.all([
    import("@tiptap/react"),
    import("@tiptap/starter-kit"),
    import("@tiptap/extension-mathematics"),
    import("@tiptap/extension-table"),
    import("@tiptap/markdown"),
  ]).then(/* merge modules */);

  return tiptapModulesPromise;
}
```

### 3.4 Shared Editor State Hook

```typescript
// use-editor-state.ts
export function useEditorState(props: EditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSave = useCallback(
    (content: string) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        props.onSaveContent(content, true);
      }, 300);
    },
    [props.onSaveContent]
  );

  return { isLoading, setIsLoading, debouncedSave };
}
```

---

## 4. Bundle Strategy

### 4.1 Code Splitting Configuration

```typescript
// next.config.ts - Optimize editor chunks
experimental: {
  optimizePackageImports: [
    '@codemirror/state',
    '@codemirror/view',
    '@tiptap/react',
    'react-data-grid',
  ],
}
```

### 4.2 Expected Bundle Sizes (Post-Optimization)

| Chunk           | Current | Target | Strategy                |
| --------------- | ------- | ------ | ----------------------- |
| `code-editor`   | 180KB   | 160KB  | Tree-shake unused langs |
| `text-editor`   | 120KB   | 100KB  | Lazy load + defer KaTeX |
| `sheet-editor`  | 95KB    | 80KB   | Remove unused features  |
| `image-editor`  | 2KB     | 2KB    | Already minimal         |
| `editor-shared` | -       | 5KB    | New shared chunk        |

### 4.3 Loading States

```tsx
// Skeleton during editor load
function EditorSkeleton({ type }: { type: EditorProps["editorType"] }) {
  return (
    <div className="animate-pulse bg-muted rounded h-full">
      {type === "code" && <CodeSkeletonLines />}
      {type === "text" && <TextSkeletonParagraphs />}
      {type === "sheet" && <GridSkeletonCells />}
    </div>
  );
}
```

---

## 5. Dependencies

### 5.1 External Dependencies

| Package                         | Version | Purpose           | Bundle Impact |
| ------------------------------- | ------- | ----------------- | ------------- |
| `codemirror`                    | ^6.x    | Code editing core | 45KB          |
| `@codemirror/lang-python`       | ^6.x    | Python syntax     | 25KB          |
| `@codemirror/theme-one-dark`    | ^6.x    | Dark theme        | 5KB           |
| `@tiptap/react`                 | ^2.x    | Rich text editor  | 40KB          |
| `@tiptap/extension-mathematics` | ^2.x    | Math rendering    | 30KB          |
| `react-data-grid`               | ^7.x    | Spreadsheet grid  | 80KB          |
| `papaparse`                     | ^5.x    | CSV parsing       | 15KB          |

### 5.2 Internal Dependencies

| Module                             | Purpose                       |
| ---------------------------------- | ----------------------------- |
| `lib/editor/suggestions-extension` | TipTap suggestion decorations |
| `lib/editor/diff`                  | Code diff visualization       |
| `lib/utils`                        | `cn()` class merging          |
| `components/icons`                 | Loading spinners              |

---

## 6. Implementation Notes

### 6.1 Migration Path

1. **Phase 1**: Create `components/editors/` directory structure
2. **Phase 2**: Extract unified `EditorProps` type
3. **Phase 3**: Add lazy loading to TextEditor (matching CodeEditor pattern)
4. **Phase 4**: Create `useEditorState` shared hook
5. **Phase 5**: Update artifact.tsx to use factory pattern

### 6.2 Backward Compatibility

- Keep existing component exports for transition period
- Add deprecation warnings to old import paths
- Full migration in 2 sprints

### 6.3 Testing Requirements

- Unit tests for `useEditorState` hook
- Integration tests for lazy loading behavior
- Bundle size regression tests in CI

---

## 7. Trade-off Analysis

| Decision              | Benefit                    | Cost                              |
| --------------------- | -------------------------- | --------------------------------- |
| Lazy load all editors | Faster initial page load   | Slight delay on first editor open |
| Unified interface     | Simpler artifact.tsx logic | Minor refactor effort             |
| Module caching        | No re-download on navigate | Memory held longer                |
| Shared state hook     | DRY, consistent behavior   | Additional abstraction            |

**Recommended**: Accept all trade-offs; benefits outweigh costs for this use case.
