# 03. Sidebar Feature Changelog

## Summary

| Metric          | NewApp | OldApp     | Change   |
| --------------- | ------ | ---------- | -------- |
| **Total Files** | 14     | ~12        | +2       |
| **Total LOC**   | ~727   | ~1,800     | **-60%** |
| **Components**  | 6      | 6          | -        |
| **Hooks**       | 5      | 3          | +2       |
| **Utils**       | 2      | 0 (inline) | +2       |
| **Types**       | 1      | 0 (inline) | +1       |

---

## 1. Components (`features/sidebar/components/`)

### 1.1 `app-sidebar.tsx`

| Property         | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| **Lines**        | 114                                                                 |
| **Purpose**      | Main sidebar container with header, history, and user nav           |
| **Dependencies** | `useSidebar`, `SidebarHistory`, `SidebarUserNav`, `ChatHistoryItem` |

**Key Features:**

- Inline SVG icons (BotIcon, PlusIcon) - no external icon library
- Props-based API for data and callbacks
- Conditional mobile rendering with `state.isMobile`
- Clean composition of child components

**OldApp Comparison:**

| Aspect       | NewApp                 | OldApp                               |
| ------------ | ---------------------- | ------------------------------------ |
| LOC          | 114                    | 157                                  |
| Icons        | Inline SVG             | External `@/components/icons`        |
| Delete All   | Via `onDeleteAll` prop | Built-in AlertDialog                 |
| Auth Context | Props-based user       | `useAuth()` hook                     |
| Router       | Not needed             | `useRouter()`                        |
| Toast        | Not included           | `sonner` integration                 |
| SWR          | Not included           | `useSWRConfig`, `unstable_serialize` |

---

### 1.2 `sidebar-history.tsx`

| Property         | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| **Lines**        | 78                                                          |
| **Purpose**      | Virtualized chat history list with date grouping            |
| **Dependencies** | `GroupedVirtuoso`, `groupChatsByDate`, `useOptimisticChats` |

**Key Features:**

- Uses `react-virtuoso` for efficient rendering
- Merges optimistic chats with server chats
- Date-based grouping via utility function
- Built-in skeleton loading state

**OldApp Comparison:**

| Aspect        | NewApp                | OldApp                     |
| ------------- | --------------------- | -------------------------- |
| LOC           | 78                    | 574                        |
| Grouping      | Extracted to utils    | Inline (80+ lines)         |
| Delete Dialog | Removed (delegated)   | AlertDialog built-in       |
| Pagination    | `useChatHistory` hook | Inline `useSWRInfinite`    |
| Boundary Calc | `date-fns` in utils   | Complex memoization inline |
| Title Updates | Not handled           | Event listener pattern     |

---

### 1.3 `sidebar-history-item.tsx`

| Property         | Value                                   |
| ---------------- | --------------------------------------- |
| **Lines**        | 109                                     |
| **Purpose**      | Individual chat item with hover actions |
| **Dependencies** | `usePathname`, `cn`                     |

**Key Features:**

- Memoized with `memo()` for performance
- Inline SVG icons (MessageIcon, GlobeIcon, TrashIcon)
- Hover-reveal delete button
- Active state detection via pathname

**OldApp Comparison:**

| Aspect            | NewApp              | OldApp                    |
| ----------------- | ------------------- | ------------------------- |
| LOC               | 109                 | 118                       |
| Icons             | Inline SVG          | External icons            |
| Actions           | Simple hover button | DropdownMenu with submenu |
| Visibility Toggle | Icon indicator only | Full visibility switcher  |
| Share Menu        | Not included        | DropdownMenuSub pattern   |

---

### 1.4 `sidebar-toggle.tsx`

| Property         | Value                              |
| ---------------- | ---------------------------------- |
| **Lines**        | 41                                 |
| **Purpose**      | Toggle button to show/hide sidebar |
| **Dependencies** | `useSidebar`, `cn`                 |

**Key Features:**

- Inline MenuIcon SVG
- Accessible aria-label
- Keyboard shortcut hint in title

**OldApp Comparison:**

| Aspect  | NewApp              | OldApp              |
| ------- | ------------------- | ------------------- |
| LOC     | 41                  | 35                  |
| Icon    | Inline SVG          | `SidebarLeftIcon`   |
| Tooltip | Title attribute     | `Tooltip` component |
| Hook    | Custom `useSidebar` | shadcn `useSidebar` |

---

### 1.5 `sidebar-user-nav.tsx`

| Property         | Value                                            |
| ---------------- | ------------------------------------------------ |
| **Lines**        | 113                                              |
| **Purpose**      | User info display with theme toggle and sign out |
| **Dependencies** | `useTheme`                                       |

**Key Features:**

- Inline SVG icons (SunIcon, MoonIcon, LogOutIcon)
- Avatar initial display
- Theme toggle integration
- Compact single-row layout

**OldApp Comparison:**

| Aspect        | NewApp          | OldApp                    |
| ------------- | --------------- | ------------------------- |
| LOC           | 113             | 171                       |
| Layout        | Inline row      | DropdownMenu              |
| Avatar        | Initial letter  | Vercel avatar service     |
| Auth State    | Props-based     | `useAuth()` hook          |
| Loading State | Not included    | Skeleton with spinner     |
| Logout        | Simple callback | Full API call + SWR clear |

---

### 1.6 `index.ts`

| Property    | Value                        |
| ----------- | ---------------------------- |
| **Lines**   | 6                            |
| **Purpose** | Barrel export for components |

```typescript
export { AppSidebar, type AppSidebarProps } from "./app-sidebar";
export { SidebarHistory, type SidebarHistoryProps } from "./sidebar-history";
export {
  SidebarHistoryItem,
  type SidebarHistoryItemProps,
} from "./sidebar-history-item";
export { SidebarUserNav, type SidebarUserNavProps } from "./sidebar-user-nav";
export { SidebarToggle } from "./sidebar-toggle";
```

---

## 2. Hooks (`features/sidebar/hooks/`)

### 2.1 `use-sidebar.tsx`

| Property    | Value                                      |
| ----------- | ------------------------------------------ |
| **Lines**   | 68                                         |
| **Purpose** | Sidebar state management via React Context |

**Key Features:**

- Cookie persistence for sidebar state
- Keyboard shortcut (Ctrl+B / Cmd+B)
- Mobile state tracking
- Clean context pattern

**OldApp Comparison:**

| Aspect         | NewApp                   | OldApp                        |
| -------------- | ------------------------ | ----------------------------- |
| Implementation | Custom Context           | shadcn/ui `Sidebar` component |
| Cookie         | Direct `document.cookie` | Via shadcn internals          |
| Keyboard       | Custom useEffect         | Not implemented               |
| Mobile         | `setIsMobile` callback   | `setOpenMobile`               |

---

### 2.2 `use-chat-history.ts`

| Property    | Value                                    |
| ----------- | ---------------------------------------- |
| **Lines**   | 74                                       |
| **Purpose** | Paginated chat history fetching with SWR |

**Key Features:**

- `useSWRInfinite` for pagination
- Optimistic delete operations
- `deleteAllChats` support
- Clean cursor-based pagination

**OldApp Comparison:**

| Aspect     | NewApp            | OldApp                          |
| ---------- | ----------------- | ------------------------------- |
| Location   | Dedicated hook    | Inline in `sidebar-history.tsx` |
| LOC        | 74                | ~100 (inline)                   |
| Delete     | Optimistic update | Toast promise pattern           |
| Auth Check | Not included      | `getKeyWithAuth` wrapper        |

---

### 2.3 `use-chat-visibility.ts`

| Property    | Value                                   |
| ----------- | --------------------------------------- |
| **Lines**   | 27                                      |
| **Purpose** | Toggle chat visibility (public/private) |

**Key Features:**

- Simple state-based approach
- Async toggle with loading state
- Placeholder for server action

**OldApp Comparison:**

| Aspect        | NewApp           | OldApp                        |
| ------------- | ---------------- | ----------------------------- |
| LOC           | 27               | 91                            |
| SWR Cache     | Not used         | Full cache integration        |
| Server Action | TODO placeholder | `updateChatVisibility`        |
| Deduplication | Not implemented  | `AbortController` pattern     |
| History Sync  | Not implemented  | `useSWRInfinite` subscription |

---

### 2.4 `use-optimistic-chats.tsx`

| Property    | Value                                          |
| ----------- | ---------------------------------------------- |
| **Lines**   | 50                                             |
| **Purpose** | Manage optimistic chat entries during creation |

**Key Features:**

- React Context for global state
- Add/remove/update operations
- Clean provider pattern

**OldApp Comparison:**

| Aspect         | NewApp       | OldApp                    |
| -------------- | ------------ | ------------------------- |
| LOC            | 50           | 111                       |
| Max Limit      | Not enforced | MAX_OPTIMISTIC_CHATS = 50 |
| Deduplication  | Array filter | Set + Ref for O(1)        |
| Memory Cleanup | Basic        | Enforced size limit       |

---

### 2.5 `index.ts`

| Property    | Value                   |
| ----------- | ----------------------- |
| **Lines**   | 4                       |
| **Purpose** | Barrel export for hooks |

```typescript
export {
  SidebarProvider,
  useSidebar,
  type SidebarProviderProps,
} from "./use-sidebar";
export {
  OptimisticChatsProvider,
  useOptimisticChats,
} from "./use-optimistic-chats";
export { useChatVisibility } from "./use-chat-visibility";
export { useChatHistory } from "./use-chat-history";
```

---

## 3. Utils (`features/sidebar/utils/`)

### 3.1 `chat-grouping.ts`

| Property    | Value                                                     |
| ----------- | --------------------------------------------------------- |
| **Lines**   | 40                                                        |
| **Purpose** | Group chats by date (Today, Yesterday, Last 7 Days, etc.) |

**Key Features:**

- Uses `date-fns` for date calculations
- Configurable reference date (testable)
- Returns only non-empty groups
- Type-safe with `ChatGroup` interface

**OldApp Comparison:**

| Aspect      | NewApp                | OldApp                          |
| ----------- | --------------------- | ------------------------------- |
| Location    | Dedicated util        | Inline in component (~80 lines) |
| Groups      | 5 groups              | 5 groups (same)                 |
| Testability | Dependency injectable | Hard to test                    |
| Memoization | Caller responsibility | Complex ref-based caching       |

---

### 3.2 `index.ts`

| Property    | Value                   |
| ----------- | ----------------------- |
| **Lines**   | 1                       |
| **Purpose** | Barrel export for utils |

```typescript
export { groupChatsByDate } from "./chat-grouping";
```

---

## 4. Types (`features/sidebar/types.ts`)

| Property    | Value                                            |
| ----------- | ------------------------------------------------ |
| **Lines**   | 27                                               |
| **Purpose** | Centralized type definitions for sidebar feature |

**Exported Types:**

| Type              | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `ChatHistoryItem` | Chat item shape (id, title, createdAt, visibility, userId) |
| `ChatGroup`       | Grouped chats with label                                   |
| `VisibilityType`  | `'public' \| 'private'`                                    |
| `SidebarState`    | `{ isOpen, isMobile }`                                     |
| `SidebarContext`  | Context value type with state + actions                    |

**OldApp Comparison:**

| Aspect     | NewApp            | OldApp                                  |
| ---------- | ----------------- | --------------------------------------- |
| Location   | Dedicated file    | Scattered / inline                      |
| Chat Type  | `ChatHistoryItem` | `Chat` from DB schema                   |
| Visibility | Literal union     | `VisibilityType` in visibility-selector |

---

## 5. Related API Routes

### 5.1 `app/api/history/route.ts`

| Property    | Value           |
| ----------- | --------------- |
| **Lines**   | 64              |
| **Methods** | `GET`, `DELETE` |

**GET `/api/history`:**

- Paginated chat list
- Query params: `limit`, `cursor`
- Returns: `{ chats, hasMore, nextCursor }`

**DELETE `/api/history`:**

- Bulk delete all user chats
- Returns: `{ success: true }`

**Data Layer Integration:**

- Uses `chatData.list()` and `chatData.deleteAll()`
- Auth via `getSession()`
- Error handling with `AppError`

---

## 6. Summary Statistics

### Lines of Code Comparison

| File                       | NewApp LOC | OldApp LOC | Reduction |
| -------------------------- | ---------- | ---------- | --------- |
| `app-sidebar.tsx`          | 114        | 157        | -27%      |
| `sidebar-history.tsx`      | 78         | 574        | **-86%**  |
| `sidebar-history-item.tsx` | 109        | 118        | -8%       |
| `sidebar-toggle.tsx`       | 41         | 35         | +17%      |
| `sidebar-user-nav.tsx`     | 113        | 171        | -34%      |
| `sidebar-skeleton.tsx`     | -          | 66         | -100%     |
| **Components Total**       | **455**    | **1,121**  | **-59%**  |

| Hook                       | NewApp LOC | OldApp LOC    | Reduction |
| -------------------------- | ---------- | ------------- | --------- |
| `use-sidebar.tsx`          | 68         | ~200 (shadcn) | -66%      |
| `use-chat-history.ts`      | 74         | ~100 (inline) | -26%      |
| `use-chat-visibility.ts`   | 27         | 91            | -70%      |
| `use-optimistic-chats.tsx` | 50         | 111           | -55%      |
| **Hooks Total**            | **219**    | **~502**      | **-56%**  |

| Other              | NewApp LOC | OldApp LOC      |
| ------------------ | ---------- | --------------- |
| `chat-grouping.ts` | 40         | ~80 (inline)    |
| `types.ts`         | 27         | ~50 (scattered) |
| Index files        | 11         | 0               |
| **Other Total**    | **78**     | **~130**        |

### Overall

| Category        | NewApp | OldApp | Reduction |
| --------------- | ------ | ------ | --------- |
| **Total Lines** | ~727   | ~1,800 | **-60%**  |

---

## 7. Key Architectural Differences

| Aspect                 | NewApp                     | OldApp                  |
| ---------------------- | -------------------------- | ----------------------- |
| **Structure**          | Feature-based modules      | Flat components folder  |
| **Icons**              | Inline SVG                 | External icon library   |
| **State**              | Custom Context + hooks     | shadcn/ui components    |
| **Types**              | Centralized `types.ts`     | Scattered / DB schema   |
| **Grouping Logic**     | Extracted utility          | Inline in component     |
| **Data Fetching**      | Dedicated `useChatHistory` | Inline `useSWRInfinite` |
| **Delete Dialogs**     | Delegated to parent        | Built into components   |
| **Theme Toggle**       | Inline in user nav         | Via dropdown menu       |
| **Avatar**             | Initial letter             | External service        |
| **Mobile Handling**    | `state.isMobile` flag      | `setOpenMobile` prop    |
| **Keyboard Shortcuts** | Custom implementation      | Not implemented         |
| **Cookie Persistence** | Direct cookie API          | Via shadcn internals    |

### Removed from OldApp

| Feature                    | Reason                               |
| -------------------------- | ------------------------------------ |
| `sidebar-skeleton.tsx`     | Skeleton inlined in `SidebarHistory` |
| AlertDialog for delete     | Delegated to parent component        |
| Toast notifications        | Handled at page level                |
| Full visibility switcher   | Simplified to indicator only         |
| Avatar service integration | Replaced with initial letter         |
| Complex memoization        | Simplified with extracted utils      |
| Auth loading skeleton      | Simplified auth flow                 |

### Added in NewApp

| Feature                    | Benefit                |
| -------------------------- | ---------------------- |
| Keyboard shortcut (Ctrl+B) | Better UX              |
| Centralized types          | Better maintainability |
| Extracted grouping util    | Testable, reusable     |
| Props-based composition    | More flexible          |
| Barrel exports             | Cleaner imports        |

---

## Changelog Entry

```
## [Unreleased] - Sidebar Feature Migration

### Changed
- Migrated sidebar to feature-based architecture (`features/sidebar/`)
- Extracted chat grouping logic to dedicated utility
- Simplified visibility indicator (removed full switcher)
- Replaced avatar service with initial letter display

### Added
- Keyboard shortcut (Ctrl+B / Cmd+B) for sidebar toggle
- Centralized types in `features/sidebar/types.ts`
- Dedicated hooks for history, visibility, optimistic chats
- Barrel exports for cleaner imports

### Removed
- Standalone sidebar skeleton component (inlined)
- AlertDialog in history component (delegated to parent)
- Toast notifications in sidebar (page-level handling)
- Avatar service integration
```
