# Scout Report - Shard 17

**Agent:** Scout Agent 17  
**Scope:** `components/document/**`, `components/*.tsx`, `components/settings/**`  
**Timestamp:** 2026-02-19

---

## Metrics Summary

```
| Files in shard          | 15 |
| Total LOC               | 2120 |
| Exports catalogued      | 46 |
| Cross-shard edges found | 8 |
| Issues flagged          | 8 |
| Critical complexity (>10)| 1 |
```

---

## File Inventory

### components/document/

#### document.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/document/document.tsx` |
| LOC | 190 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | ~12 (flagged) |
| Exports | `DocumentToolResult`, `DocumentToolResultProps`, `DocumentToolCall`, `DocumentToolCallProps` |

**Imports:**
- External: `react` (memo), `sonner` (toast)
- Cross-shard: `@/components/icons`, `@/features/artifact/hooks/use-artifact`, `@/features/artifact/types`

**Pattern Flags:**
- ⚠️ **COMPLEXITY**: Cyclomatic complexity ~12 (threshold: 10) due to nested ternaries in icon rendering (lines 93-99, 160-166) and conditional string formatting (lines 171-178)
- Memo with `() => true` means never re-renders - intentional optimization but could hide bugs

---

#### document-preview.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/document/document-preview.tsx` |
| LOC | 424 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | ~8 |
| Exports | `DocumentPreview`, `DocumentPreviewProps` |

**Imports:**
- External: `fast-deep-equal`, `next/dynamic`, `react`, `swr`
- Cross-shard: `@/components/icons`, `@/features/artifact/hooks/use-artifact`, `@/features/artifact/types`, `@/lib/utils`
- Intra-shard: `./document`, `./document-skeleton`

**Pattern Flags:**
- Multiple local types (`DocumentLike`, `DocumentToolArgs`, `DocumentToolResultData`) - potential candidate for centralized type definitions
- Four dynamic imports for editors - appropriate lazy loading pattern
- `handleSaveContent` is a no-op stub (line 371-373) - expected for preview mode but should have comment

---

#### diffview.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/document/diffview.tsx` |
| LOC | 200 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | ~4 |
| Exports | `DiffView`, `DiffViewProps` |

**Imports:**
- External: `@tiptap/*` (multiple), `react`
- Cross-shard: `@/lib/editor/diff`

**Pattern Flags:**
- Creates temporary Editor instances in useMemo (lines 122-162) - acceptable for diff computation but has memory implications
- `DiffTypeValue` type defined locally (line 82) but duplicates `DiffType` from `@/lib/editor/diff`

---

#### document-skeleton.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/document/document-skeleton.tsx` |
| LOC | 68 |
| Classification | UI/Utility (Component) |
| Cyclomatic Complexity | ~2 |
| Exports | `DocumentSkeleton`, `DocumentSkeletonProps`, `InlineDocumentSkeleton` |

**Imports:**
- Cross-shard: `@/features/artifact/types`

**Pattern Flags:** None - clean utility component

---

#### index.ts
| Attribute | Value |
|-----------|-------|
| Path | `components/document/index.ts` |
| LOC | 27 |
| Classification | Config (Barrel Export) |
| Cyclomatic Complexity | 0 |
| Exports | Re-exports from all document components |

**Pattern Flags:** None - standard barrel file

---

### components/settings/

#### settings-sheet.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/settings/settings-sheet.tsx` |
| LOC | 69 |
| Classification | Domain Logic (Component) - PLACEHOLDER |
| Cyclomatic Complexity | ~2 |
| Exports | `SettingsButton` |

**Imports:**
- External: `react`
- Cross-shard: `@/components/ui/button`, `@/components/ui/sheet`, `@/lib/utils`

**⚠️ CRITICAL FLAG:**
- **DUPLICATE IMPLEMENTATION**: `components/settings/settings-sheet.tsx` is a placeholder/stub version
- Full implementation exists at `features/settings/components/settings-sheet.tsx` (336 lines)
- Both export `SettingsButton` but with different implementations:
  - `components/settings`: inline SVG icon, "Settings configuration coming soon..." placeholder
  - `features/settings`: lucide-react icon, full settings panel with sampling, system prompt, toggles

---

#### index.ts
| Attribute | Value |
|-----------|-------|
| Path | `components/settings/index.ts` |
| LOC | 10 |
| Classification | Config (Barrel Export) |
| Cyclomatic Complexity | 0 |
| Exports | `SettingsButton` from `./settings-sheet` |

---

### Root Components

#### app-sidebar.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/app-sidebar.tsx` |
| LOC | 10 |
| Classification | Config (Re-export) |
| Cyclomatic Complexity | 0 |
| Exports | `AppSidebar` from `@/features/sidebar` |

**Pattern Flags:**
- Pure re-export from features - backward compatibility layer
- No duplicate implementation, just forwards export

---

#### sidebar-user-nav.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/sidebar-user-nav.tsx` |
| LOC | 10 |
| Classification | Config (Re-export) |
| Cyclomatic Complexity | 0 |
| Exports | `SidebarUserNav` from `@/features/sidebar` |

**Pattern Flags:**
- Pure re-export from features - backward compatibility layer

---

#### sidebar-toggle.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/sidebar-toggle.tsx` |
| LOC | 45 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | ~2 |
| Exports | `SidebarToggle` |

**Imports:**
- External: `react`
- Cross-shard: `@/components/icons`, `@/components/ui/button`, `@/components/ui/sidebar`, `@/components/ui/tooltip`, `@/lib/utils`

**⚠️ CRITICAL FLAG:**
- **DUPLICATE IMPLEMENTATION**: Nearly identical to `features/sidebar/components/sidebar-toggle.tsx`
- Differences:
  - Root version uses `SidebarLeftIcon` from `@/components/icons`
  - Features version uses `PanelLeft` from `lucide-react`
  - Both use same logic and structure
- Consumer imports from `@/components/sidebar-toggle` (features/chat/components/chat-header.tsx:16)

---

#### auth-form.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/auth-form.tsx` |
| LOC | 69 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | ~2 |
| Exports | `AuthForm` |

**Imports:**
- External: `next/form`, `react`
- Cross-shard: `@/components/ui/input`, `@/components/ui/label`

**Pattern Flags:**
- Only used in `archive/oldapp` - potential dead code if archive is deprecated
- Simple, clean implementation

---

#### toast.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/toast.tsx` |
| LOC | 91 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | ~3 |
| Exports | `toast` |

**Imports:**
- External: `react`, `sonner`
- Intra-shard: `./icons`

**Pattern Flags:**
- Only used in `archive/oldapp` - potential dead code if archive is deprecated
- Clean wrapper around sonner

---

#### theme-provider.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/theme-provider.tsx` |
| LOC | 21 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | 1 |
| Exports | `ThemeProvider` |

**Imports:**
- External: `next-themes`

**Pattern Flags:** None - clean wrapper component

---

#### icons.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/icons.tsx` |
| LOC | 775 |
| Classification | Utility (Component) |
| Cyclomatic Complexity | 1 per icon |
| Exports | 40 icon components |

**Imports:**
- External: `react`

**Pattern Flags:**
- Heavy usage across codebase (23+ files)
- All icons are presentational components with consistent pattern
- Well-structured with consistent `IconProps` type

---

#### version-footer.tsx
| Attribute | Value |
|-----------|-------|
| Path | `components/version-footer.tsx` |
| LOC | 126 |
| Classification | Domain Logic (Component) |
| Cyclomatic Complexity | ~4 |
| Exports | `VersionFooter` |

**Imports:**
- External: `date-fns`, `react`, `swr`
- Cross-shard: `@/features/artifact`, `@/hooks/use-window-size`, `@/lib/db/schema`, `@/lib/motion`, `@/lib/utils`
- Intra-shard: `./icons`, `./ui/button`

**Pattern Flags:**
- No direct consumers found in current codebase
- Likely used via artifact feature - should verify usage

---

## Cross-Shard Dependency Edges

| Source File | Target Module | Import |
|-------------|---------------|--------|
| `components/document/document.tsx` | `@/features/artifact/hooks/use-artifact` | `useArtifact` |
| `components/document/document.tsx` | `@/features/artifact/types` | `ArtifactKind` |
| `components/document/document-preview.tsx` | `@/features/artifact/hooks/use-artifact` | `useArtifact` |
| `components/document/document-preview.tsx` | `@/features/artifact/types` | `ArtifactKind`, `UIArtifact` |
| `components/document/document-preview.tsx` | `@/features/artifact/components/editors/*` | Dynamic imports |
| `components/document/diffview.tsx` | `@/lib/editor/diff` | `DiffType`, `diffEditor` |
| `components/version-footer.tsx` | `@/features/artifact` | `useArtifact` |
| `components/sidebar-toggle.tsx` | `@/components/icons` | `SidebarLeftIcon` |

---

## Intra-Shard Pattern Flags

### 1. Duplicate Implementations

| Issue | Location | Severity |
|-------|----------|----------|
| SettingsButton placeholder vs full | `components/settings/settings-sheet.tsx` vs `features/settings/components/settings-sheet.tsx` | ⚠️ HIGH |
| SidebarToggle duplicate | `components/sidebar-toggle.tsx` vs `features/sidebar/components/sidebar-toggle.tsx` | ⚠️ HIGH |

### 2. Backward Compatibility Re-exports

| File | Status | Action |
|------|--------|--------|
| `components/app-sidebar.tsx` | Clean re-export | Consider deprecation notice |
| `components/sidebar-user-nav.tsx` | Clean re-export | Consider deprecation notice |

### 3. Dead Code Candidates

| File | Reason | Severity |
|------|--------|----------|
| `components/auth-form.tsx` | Only imported from archive/ | LOW |
| `components/toast.tsx` | Only imported from archive/ | LOW |
| `components/version-footer.tsx` | No consumers found | MEDIUM |

### 4. Unused Exports

| Export | Location | Issue |
|--------|----------|-------|
| `DocumentPreview` | `components/document/document-preview.tsx` | Exported via barrel but no external imports found |
| `DocumentSkeleton` | `components/document/document-skeleton.tsx` | Exported but not imported outside shard |

### 5. Type Definition Redundancy

| Type | Location | Issue |
|------|----------|-------|
| `DiffTypeValue` | `components/document/diffview.tsx:82` | Duplicates `DiffType` from `@/lib/editor/diff` |
| `DocumentLike` | `components/document/document-preview.tsx:75` | Could be moved to `@/features/artifact/types` |
| `DocumentToolArgs` | `components/document/document-preview.tsx:84` | Local type, could be shared |
| `DocumentToolResultData` | `components/document/document-preview.tsx:94` | Local type, could be shared |

### 6. Complexity Issues

| File | Line(s) | Issue |
|------|---------|-------|
| `components/document/document.tsx` | 93-99, 160-166, 171-178 | Nested ternaries for icon and text rendering |

---

## Escalation Items

### ⚠️ ESCALATION: Settings Implementation Conflict

**Issue:** Two `SettingsButton` implementations exist:
- `components/settings/settings-sheet.tsx`: 69-line placeholder
- `features/settings/components/settings-sheet.tsx`: 336-line full implementation

**Consumer:** `features/chat/components/chat-header.tsx` imports from `@/components/settings/settings-sheet`

**Risk:** Consumer is using placeholder instead of full implementation.

**Recommendation:** Determine if this is intentional (settings not yet migrated) or a bug. If migrated, remove placeholder and update import path.

### ⚠️ ESCALATION: SidebarToggle Duplication

**Issue:** Near-identical implementations in two locations with minor icon differences.

**Recommendation:** Consolidate to single implementation, prefer `features/sidebar` version.

---

## Scope Extensions

None required - all files analyzed within assigned scope.

---

## Summary

The shard contains 15 files with 2120 LOC. Key findings:

1. **Critical duplications**: Settings and SidebarToggle have parallel implementations
2. **Architecture alignment**: Document components appropriately cross into `features/artifact` for types/hooks
3. **Re-export pattern**: `app-sidebar.tsx` and `sidebar-user-nav.tsx` are clean backward-compatibility layers
4. **Potential dead code**: `auth-form.tsx` and `toast.tsx` only used in archive
5. **Complexity**: `document.tsx` exceeds cyclomatic complexity threshold due to nested ternaries

**Recommended Actions:**
1. Resolve settings component duplication (HIGH priority)
2. Resolve sidebar-toggle duplication (HIGH priority)
3. Verify `version-footer.tsx` usage
4. Consider deprecation warnings for backward-compat re-exports
5. Refactor nested ternaries in `document.tsx` to reduce complexity