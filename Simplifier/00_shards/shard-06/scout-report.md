# Scout Report: Shard 06 - features/sidebar

```
| Files in shard          | 16 |
| Total LOC               | 2050 |
| Exports catalogued      | 30 |
| Cross-shard edges found | 6 |
| Issues flagged          | 8 |
| Critical complexity (>10)| 0 |
```

---

## File-by-File Inventory

### 1. `index.ts` (63 LOC)
**Classification:** Entry point (barrel export)
**Cyclomatic Complexity:** 1

| Export | Type | Cross-Shard |
|--------|------|-------------|
| AppSidebar | Component | Yes |
| ChatItem | Component | Yes |
| SidebarHistory | Component | Yes |
| SidebarItem | Component | Yes |
| SidebarSkeleton | Component | Yes |
| SidebarToggle | Component | Yes |
| SidebarUserNav | Component | Yes |
| UseSidebarStateReturn | Type | Yes |
| useSidebar | Hook | Re-export from UI |
| useSidebarState | Hook | Yes |
| deleteAllChats | Action | Yes |
| deleteChat | Action | Yes |
| getChatHistory | Action | Yes |
| AppSidebarProps | Type | Yes |
| ChatGroup | Type | Yes |
| ChatHistory | Type | Yes |
| ChatHistoryPagination | Type | Yes |
| ChatItemProps | Type | Yes |
| DeleteAllChatsResult | Type | Yes |
| DeleteChatResult | Type | Yes |
| GroupedChats | Type | Yes |
| SidebarContextValue | Type | Yes |
| SidebarHistoryProps | Type | Yes |
| SidebarState | Type | Yes |
| SidebarToggleProps | Type | Yes |
| SidebarUserNavProps | Type | Yes |
| UpdateVisibilityResult | Type | Yes |

---

### 2. `types.ts` (194 LOC)
**Classification:** Type definitions
**Cyclomatic Complexity:** 1

| Export | Type | Description |
|--------|------|-------------|
| AppSidebarProps | Interface | Main sidebar props |
| SidebarHistoryProps | Interface | History component props |
| ChatItemProps | Interface | Individual chat item props |
| SidebarUserNavProps | Interface | User navigation props |
| SidebarToggleProps | Interface | Toggle button props |
| SidebarState | Interface | Sidebar state |
| SidebarContextValue | Interface | Context value type |
| UseSidebarStateReturn | Interface | Hook return type |
| GroupedChats | Interface | Date-grouped chats |
| ChatGroup | Interface | Virtualized list group |
| ChatHistory | Interface | API response shape |
| ChatHistoryPagination | Interface | Pagination params |
| DeleteChatResult | Interface | Delete action result |
| DeleteAllChatsResult | Interface | Delete all result |
| UpdateVisibilityResult | Interface | Visibility update result |

**Imports:**
- `Chat` from `@/lib/db/schema` (external)

---

### 3. `components/index.ts` (24 LOC)
**Classification:** Barrel export
**Cyclomatic Complexity:** 1

Re-exports from sibling components. No logic.

---

### 4. `hooks/index.ts` (20 LOC)
**Classification:** Barrel export
**Cyclomatic Complexity:** 1

| Export | Source |
|--------|--------|
| useSidebar | @/components/ui/sidebar |
| UseSidebarStateReturn | ../types |
| OptimisticChat | ./use-optimistic-chats |
| OptimisticChatsProvider | ./use-optimistic-chats |
| useOptimisticChats | ./use-optimistic-chats |
| useSidebarState | ./use-sidebar |

---

### 5. `actions/index.ts` (11 LOC)
**Classification:** Barrel export
**Cyclomatic Complexity:** 1

Re-exports: `deleteAllChats`, `deleteChat`, `getChatHistory`

---

### 6. `components/sidebar.tsx` (187 LOC)
**Classification:** Entry point component
**Cyclomatic Complexity:** 6

| Export | Type |
|--------|------|
| AppSidebar | Function Component |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| next/link | Link | External |
| next/navigation | useRouter | External |
| react | useState | External |
| sonner | toast | External |
| @/components/icons | PlusIcon, TrashIcon | UI |
| @/components/ui/alert-dialog | AlertDialog, AlertDialogAction, ... | UI |
| @/components/ui/button | Button | UI |
| @/components/ui/sidebar | Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, useSidebar | UI |
| @/components/ui/tooltip | Tooltip, TooltipContent, TooltipTrigger | UI |
| **@/features/auth** | useAuth | **Cross-shard** |
| ../actions | deleteAllChats | Internal |
| ../types | AppSidebarProps | Internal |
| ./sidebar-history | SidebarHistory | Internal |
| ./sidebar-user-nav | SidebarUserNav | Internal |

---

### 7. `components/sidebar-item.tsx` (148 LOC)
**Classification:** Domain logic component
**Cyclomatic Complexity:** 5

| Export | Type |
|--------|------|
| SidebarItem | MemoExoticComponent |
| ChatItem | Alias for SidebarItem |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| next/link | Link | External |
| react | memo | External |
| @/components/icons | CheckCircleFillIcon, GlobeIcon, LockIcon, MoreHorizontalIcon, ShareIcon, TrashIcon | UI |
| @/components/ui/dropdown-menu | DropdownMenu, ... | UI |
| @/components/ui/sidebar | SidebarMenuAction, SidebarMenuButton, SidebarMenuItem | UI |
| **@/hooks/use-chat-visibility** | useChatVisibility | **Cross-shard** |
| ../types | ChatItemProps | Internal |

---

### 8. `components/sidebar-history.tsx` (693 LOC)
**Classification:** Domain logic component (LARGEST FILE)
**Cyclomatic Complexity:** 9

| Export | Type |
|--------|------|
| SidebarHistory | Function Component |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| date-fns | isToday, isYesterday, subMonths, subWeeks | External |
| next/navigation | useParams, useRouter | External |
| react | useCallback, useEffect, useMemo, useRef, useState | External |
| react-virtuoso | GroupedVirtuoso, GroupedVirtuosoHandle | External |
| sonner | toast | External |
| @/components/icons | LoaderIcon | UI |
| @/components/ui/alert-dialog | AlertDialog, ... | UI |
| @/components/ui/sidebar | SidebarGroup, SidebarGroupContent, SidebarMenu, useSidebar | UI |
| **@/features/auth** | useAuth | **Cross-shard** |
| @/lib/db/schema | Chat | External |
| ../actions | deleteChat | Internal |
| ../hooks | useOptimisticChats | Internal |
| ../types | ChatGroup, ChatHistory, GroupedChats, SidebarHistoryProps | Internal |
| ./sidebar-item | SidebarItem | Internal |

**Local Functions:**
- `groupChatsByDateWithBoundaries` (lines 59-91)
- `convertToVirtuosoGroups` (lines 101-150)
- `parseHistoryResponse` (lines 169-210)

**Local Types:**
- `HistoryApiEnvelope` (lines 155-164)

---

### 9. `components/sidebar-user-nav.tsx` (195 LOC)
**Classification:** Domain logic component
**Cyclomatic Complexity:** 6

| Export | Type |
|--------|------|
| SidebarUserNav | Function Component |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| lucide-react | ChevronUp | External |
| next/image | Image | External |
| next/navigation | useRouter | External |
| next-themes | useTheme | External |
| react | useCallback, useEffect, useState | External |
| sonner | toast | External |
| swr | useSWRConfig | External |
| @/components/icons | LoaderIcon | UI |
| @/components/ui/dropdown-menu | DropdownMenu, ... | UI |
| @/components/ui/sidebar | SidebarMenu, SidebarMenuButton, SidebarMenuItem | UI |
| **@/features/auth** | useAuth | **Cross-shard** |
| **@/features/auth/hooks** | useLogoutHandler | **Cross-shard** |
| ../types | SidebarUserNavProps | Internal |

---

### 10. `components/sidebar-toggle.tsx` (50 LOC)
**Classification:** Domain logic component
**Cyclomatic Complexity:** 2

| Export | Type |
|--------|------|
| SidebarToggle | Function Component |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| lucide-react | PanelLeft | External |
| @/components/ui/button | Button | UI |
| @/components/ui/sidebar | useSidebar | UI |
| @/components/ui/tooltip | Tooltip, TooltipContent, TooltipTrigger | UI |
| @/lib/utils | cn | External |
| ../types | SidebarToggleProps | Internal |

---

### 11. `components/sidebar-skeleton.tsx` (82 LOC)
**Classification:** Domain logic component
**Cyclomatic Complexity:** 2

| Export | Type |
|--------|------|
| SidebarSkeleton | Function Component |

**Imports:** None

---

### 12. `hooks/use-sidebar.ts` (63 LOC)
**Classification:** Domain logic hook
**Cyclomatic Complexity:** 3

| Export | Type |
|--------|------|
| useSidebarState | Function |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| react | useCallback, useEffect, useState | External |
| @/components/ui/sidebar | useSidebar | UI |
| **@/hooks/use-mobile** | useIsMobile | **Cross-shard** |
| ../types | UseSidebarStateReturn | Internal |

---

### 13. `hooks/use-optimistic-chats.tsx` (194 LOC)
**Classification:** Domain logic hook (context provider)
**Cyclomatic Complexity:** 5

| Export | Type |
|--------|------|
| OptimisticChat | Interface |
| OptimisticChatsProvider | Function Component |
| useOptimisticChats | Function |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| react | createContext, ReactNode, useCallback, useContext, useRef, useState | External |
| @/lib/errors | ValidationError | External |

**Local Types:**
- `OptimisticChatsContextType` (lines 41-50)

---

### 14. `actions/get-history.action.ts` (53 LOC)
**Classification:** Domain logic (server action)
**Cyclomatic Complexity:** 3

| Export | Type |
|--------|------|
| getChatHistory | Async Function |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| @/lib/auth/session | getSession | External |
| @/lib/data/services/chat.service | chatService | External |
| ../types | ChatHistory, ChatHistoryPagination | Internal |

---

### 15. `actions/delete-chat.action.ts` (73 LOC)
**Classification:** Domain logic (server action)
**Cyclomatic Complexity:** 4

| Export | Type |
|--------|------|
| deleteChat | Async Function |
| deleteAllChats | Async Function |

**Imports:**
| Source | Import | Type |
|--------|--------|------|
| @/lib/auth/session | getSession | External |
| @/lib/data/services/chat.service | chatService | External |
| @/lib/errors | ForbiddenError, NotFoundError | External |
| ../types | DeleteAllChatsResult, DeleteChatResult | Internal |

---

## Cross-Shard Dependency Edges

```
features/sidebar/components/sidebar.tsx
  → @/features/auth (useAuth)

features/sidebar/components/sidebar-history.tsx
  → @/features/auth (useAuth)

features/sidebar/components/sidebar-user-nav.tsx
  → @/features/auth (useAuth)
  → @/features/auth/hooks (useLogoutHandler)

features/sidebar/components/sidebar-item.tsx
  → @/hooks/use-chat-visibility

features/sidebar/hooks/use-sidebar.ts
  → @/hooks/use-mobile
```

---

## Pattern Flags

### PF-01: Large File - High Complexity Risk
**File:** `components/sidebar-history.tsx` (693 LOC)
**Lines:** 1-693
**Issue:** Single component with 9 cyclomatic complexity, 693 lines. Contains multiple responsibilities:
- Data fetching (lines 255-283)
- Date grouping logic (lines 59-91, 101-150)
- Virtualization orchestration (lines 448-542)
- Delete handling (lines 398-420)
- Multiple useEffect hooks (lines 286-367)
**Recommendation:** Consider extracting:
- `useChatHistoryFetch` hook for data fetching/pagination
- `useChatGrouping` hook for date grouping logic
- `ChatHistoryList` presentational component

### PF-02: Duplicate Skeleton Pattern
**Files:**
- `components/sidebar-skeleton.tsx:18-19`
- `components/sidebar-history.tsx:609`

**Issue:** Identical skeleton width array `[44, 32, 28, 64, 52]` defined in two places.
**Recommendation:** Extract to shared constant `SKELETON_WIDTHS` in types.ts or constants file.

### PF-03: Duplicate AlertDialog Pattern
**Files:**
- `components/sidebar.tsx:158-183` (Delete All dialog)
- `components/sidebar-history.tsx:670-689` (Delete single chat dialog)

**Issue:** Similar AlertDialog structure duplicated. Both have:
- Same AlertDialogContent/Header/Footer structure
- Similar cancel/delete action pattern
**Recommendation:** Consider extracting `DeleteConfirmDialog` component.

### PF-04: Type Definition Duplication Risk
**File:** `components/sidebar-history.tsx:155-164`
**Issue:** Local `HistoryApiEnvelope` type shadows/overlaps with `ChatHistory` type in types.ts.
The `parseHistoryResponse` function handles both envelope format and legacy format, suggesting API response types should be centralized.
**Recommendation:** Move `HistoryApiEnvelope` to types.ts and document both response formats.

### PF-05: Potential Unused Export
**File:** `types.ts:186-193`
**Export:** `UpdateVisibilityResult`
**Issue:** Type defined but visibility update action not present in actions/. The `useChatVisibility` hook is imported from `@/hooks/use-chat-visibility` (cross-shard), suggesting the action may live elsewhere or type is orphaned.
**Status:** ⚠️ ESCALATION - Verify if `UpdateVisibilityResult` is used elsewhere or orphaned.

### PF-06: Re-export Alias Pattern
**File:** `components/sidebar-item.tsx:147`
```typescript
export const ChatItem = SidebarItem
```
**Issue:** Alias export creates two names for same component. This increases cognitive load without clear benefit.
**Recommendation:** Evaluate if both names are needed. If for backward compatibility, add deprecation notice.

### PF-07: Hook Re-export Indirection
**File:** `hooks/index.ts:10`
```typescript
export { useSidebar } from "@/components/ui/sidebar"
```
**Issue:** Re-exporting `useSidebar` from UI library creates unnecessary indirection. Consumers can import directly from UI.
**Recommendation:** Remove re-export unless there's a specific encapsulation requirement.

### PF-08: Inline Object Type in Component
**File:** `components/sidebar.tsx:59-61`
```typescript
const userForDisplay: { email?: string | null } | undefined = session?.user
  ? { email: session.user.email ?? null }
  : undefined
```
**Issue:** Inline type `{ email?: string | null }` duplicates `SidebarHistoryProps.user` and `SidebarUserNavProps.user` type shape.
**Recommendation:** Extract to shared type like `UserForDisplay` in types.ts.

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Total Files | 16 |
| Source Files (non-barrel) | 11 |
| Barrel/Re-export Files | 5 |
| Total LOC | 2050 |
| Source LOC (excluding barrel) | 1932 |
| Largest File | sidebar-history.tsx (693 LOC) |
| Smallest File | actions/index.ts (11 LOC) |
| Components | 6 |
| Hooks | 3 |
| Server Actions | 3 |
| Type Definitions | 15 |
| Max Cyclomatic Complexity | 9 (sidebar-history.tsx) |
| Cross-Shard Imports | 6 |

---

## ⚠️ Escalation Items

### ESC-01: Orphaned Type Definition
**Type:** `UpdateVisibilityResult` (types.ts:186-193)
**Context:** Type defined but no corresponding action in `features/sidebar/actions/`. Visibility update likely handled by cross-shard hook `useChatVisibility`.
**Action Required:** Verify if type should be removed or if action is missing.

---

## Scope Extension Requests

None. All analysis contained within `features/sidebar/**` scope.

---

*Report generated by Scout Agent 06*
*Shard ID: 06*
*Scope: features/sidebar/**