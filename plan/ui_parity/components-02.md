# Components Map — Part 02 (P–Z)

> **Updated per redesign audit (2026-03-01)**

> Continuation of component mapping. See components-01.md for A–M.

> ⚠️ **Scope note (redesign precedence):** This file includes oldapp parity inventory details. Canonical implementation targets are defined in `scaffold/directory-structure.md` and phase/final plan docs. Removed items are historical references only.

---

## preview-attachment.tsx → `features/chat/components/preview-attachment.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Named export (no `"use client"`) |
| **Props** | `attachment: Attachment`, `isUploading?: boolean`, `onRemove?: () => void` |
| **Parents** | `MultimodalInput` (input preview), `PreviewMessage` (message attachments) |
| **Children** | `Image` (next/image, 64×64), loader overlay, remove `Button`, filename overlay |
| **Layout** | `group relative size-16 rounded-lg border bg-muted` |
| **States** | Image preview (contentType starts with "image") vs generic "File" text; uploading overlay with Loader; remove button on group-hover |

---

## settings/settings-sheet.tsx → `features/settings/components/settings-panel.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Exports** | `SettingsButton`, `SettingsSheet` (internal), `SettingToggle` (internal) |
| **Props (SettingsButton)** | `className?` |
| **Parents** | `ChatHeader` |
| **Children** | `Sheet` → `SheetContent` (right side, max-w-xl) with sections |
| **Sections** | 1. **Sampling:** Temperature (0–1.5), Top P (0–1), Max Output Tokens (256–1M) — all numeric inputs. 2. **System Prompt:** Textarea. 3. **Behavior:** Enable reasoning (toggle), Stream artifacts (toggle), Auto-scroll (toggle) |
| **Footer** | Reset to defaults, Close |
| **Hooks** | `useSettings` *(redesign: `useSettingsSnapshot` merged into `useSettings` — useSyncExternalStore, SettingsProvider removed)*, `useBoolean` (usehooks-ts) |
| **Toggle pattern** | `aria-pressed`, On/Off button styled as pill (primary when on, muted when off) |
| **Lines** | 298 |

---

## sheet-editor.tsx → `features/artifacts/components/sheet-editor.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `content` (CSV string), `saveContent`, `currentVersionIndex`, `isCurrentVersion`, `status` |
| **Parents** | `ArtifactPanel` (sheet kind) *(redesign: renamed from Artifact)*, `ArtifactPreview` *(redesign: renamed from DocumentPreview)* |
| **Dependencies** | `papaparse` (parse/unparse), `react-data-grid` |
| **Layout** | MIN_ROWS=50, MIN_COLS=26 (A-Z); frozen row-number column (width 50); data columns width 120 |
| **Theme** | Dark mode classes: `dark:bg-zinc-950`, `dark:bg-zinc-900` |

---

## sidebar-history.tsx → `features/sidebar/components/sidebar-history-client.tsx` *(redesign: renamed to SidebarHistoryClient)*

> *Redesign: `SidebarHistory` → `SidebarHistoryClient`. Optimistic chats → pending chats. `chat-title-updated` window event → `chat-title` stream part (single-channel). DELETE `/api/history/${id}` → Server Action `deleteChat()`.*

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `user: { email?: string | null }` |
| **Parents** | `SidebarShell` client history region |
| **Children** | `GroupedVirtuoso` (react-virtuoso), `ChatItem` items, `AlertDialog` (delete confirm) |
| **State** | SWR infinite pagination (20/page), `showDeleteDialog`, `chatToDelete` |
| **Grouping** | Today, Yesterday, Last 7 days, Last 30 days, Older — with pre-calculated date boundaries |
| **Pending chats** | Prepended as `__pending__` group before "Today" *(redesign: renamed from `__optimistic__`)* |
| **Auth gating** | Returns null key when no user or `isNewSession` (skips fetch for new guests) |
| **Events** | Delete chat → Server Action `deleteChat()` + optimistic removal *(redesign: replaces DELETE route + SWR)*, title update via `chat-title` stream part *(redesign: replaces `chat-title-updated` window event)* |
| **Lines** | 574 |
| **Exported** | `SidebarHistoryClient` *(redesign: renamed from SidebarHistory)*, `getChatHistoryPaginationKey`, `ChatHistory` type |

---

## sidebar-history-item.tsx → `features/sidebar/components/sidebar-history-item.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo component |
| **Props** | `chat: Chat`, `isActive: boolean`, `onDelete`, `setOpenMobile` |
| **Parents** | `SidebarHistoryClient` *(redesign: renamed from SidebarHistory)* |
| **Children** | `SidebarMenuItem` → `SidebarMenuButton` (Link), `DropdownMenu` (actions) |
| **Dropdown actions** | Share → Submenu (Private/Public with checkmarks), Delete (destructive) |
| **Hooks** | `useChatVisibility` |
| **Memo** | Re-renders on `isActive` or `chat.title` change only |

---

## sidebar-skeleton.tsx → `features/sidebar/components/sidebar-skeleton.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Server-compatible (pure render) |
| **Props** | None |
| **Parents** | `SidebarShell` (Suspense fallback) *(redesign: server-rendered sidebar shell; no AppSidebar dynamic wrapper)* |
| **Layout** | Matches exact Sidebar structure: `hidden md:block`, `w-64`, fixed inset-y-0 |
| **Skeleton bars** | 5 items with widths [44%, 32%, 28%, 64%, 52%], staggered animation delay (50ms increments) |
| **Sections** | Header (title + button), Content (Today label + items), Footer (avatar + name) |

---

## sidebar-toggle.tsx → `features/sidebar/components/sidebar-toggle.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Named export |
| **Props** | `className?` |
| **Parents** | `ChatHeader` |
| **Children** | `Tooltip` → `Button` (outline, `SidebarLeftIcon`) |
| **Events** | Click → `toggleSidebar()` |
| **A11y** | Tooltip "Toggle Sidebar" (hidden on mobile: `className="hidden md:block"`) |

---

## sidebar-user-nav.tsx → `features/sidebar/components/sidebar-user-nav.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `user: { email?: string | null }` |
| **Parents** | `SidebarShell` user-nav region |
| **Children** | `SidebarMenu` → `SidebarMenuItem` → `DropdownMenu` |
| **State** | `mounted: boolean` (hydration guard) |
| **Hooks** | `useSession` *(redesign: renamed from useAuth)*, `useTheme` |
| **Loading state** | Skeleton avatar + pulsing text + spinner until mounted AND auth resolved |
| **Menu items** | Theme toggle (dark ↔ light), Separator, Auth action (Login / Sign out) |
| **Logout flow** | Server Action `logout()` → Supabase `signOut()` → redirect `/login` *(redesign: replaces legacy auth route + SWR clear)* |
| **Avatar** | `avatar.vercel.sh/{seed}` (24×24) |

---

## submit-button.tsx → `features/chat/components/submit-button.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `children`, `isSuccessful: boolean` |
| **Parents** | Login page, Register page |
| **Hooks** | `useFormStatus` (react-dom) |
| **A11y** | `aria-disabled`, `<output aria-live="polite">` for screen reader status |
| **States** | Pending/Successful: disabled + spinning LoaderIcon |

---

## suggested-actions.tsx → `features/chat/components/suggested-actions.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo component |
| **Props** | `chatId`, `sendMessage`, `selectedVisibilityType` |
| **Parents** | `MultimodalInput` (when no messages + no attachments + no uploads) |
| **Children** | 4 `Suggestion` elements (AI element) in motion-animated grid |
| **Layout** | `grid gap-2 sm:grid-cols-2` |
| **Animation** | Staggered fade-in (0.05s per item) |
| **Hardcoded prompts** | Next.js advantages, Dijkstra's algorithm, Silicon Valley essay, SF weather |

---

## suggestion.tsx → `features/artifacts/components/suggestion.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `suggestion: UISuggestion`, `onApply`, `artifactKind` |
| **Parents** | Text artifact (inline suggestions) |
| **State** | `isExpanded: boolean` |
| **Animation** | AnimatePresence with spring expand/collapse |
| **Children** | Expanded: description + "Apply" button. Collapsed: floating `MessageIcon` button |

---

## text-editor.tsx → `features/artifacts/components/text-editor.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `content`, `onSaveContent`, `status`, `isCurrentVersion`, `currentVersionIndex`, `suggestions` |
| **Parents** | `ArtifactPanel` (text kind) *(redesign: renamed from Artifact)*, `ArtifactPreview` *(redesign: renamed from DocumentPreview)* |
| **Dependencies** | TipTap: StarterKit, Markdown, Mathematics (KaTeX), Table extensions, custom SuggestionsExtension |
| **Behavior** | Streaming: sets content without emitting save; Idle: emits markdown on update; Suggestions extension for inline suggestions with decorations |
| **Lines** | 162 |

---

## theme-provider.tsx → `components/theme-provider.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `ThemeProviderProps` (next-themes) |
| **Parents** | Root server layout (`app/layout.tsx`) |
| **Children** | `NextThemesProvider` passthrough |

---

## toast.tsx → `components/ui/toast.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Exports** | `toast` function (wraps `sonner.toast.custom`) |
| **Props** | `type: "success" | "error"`, `description: string` |
| **Layout** | `toast-mobile:w-[356px]` responsive width, icon left + text right |
| **Multi-line detection** | ResizeObserver + lineHeight calculation → alignment switch (items-center / items-start) |

---

## toolbar.tsx → *(historical, removed in redesign)*

| Field | Detail |
|-------|--------|
| **Type** | Memo Client Component |
| **Props** | `artifactKind`, `isToolbarVisible`, `setIsToolbarVisible`, `sendMessage`, `setMessages`, `status`, `stop` |
| **Parents** | `ArtifactPanel` (current version only) *(redesign: renamed from Artifact)* |
| **Children** | Floating tool palette with `Tool` buttons, `ReadingLevelSelector` (text kind only), custom send/stop |
| **Animation** | `framer-motion` (direct import, not from lib/motion): spring animations, drag constraints, scale on hover/tap |
| **Sub: ReadingLevelSelector** | 6 reading levels on draggable vertical slider, motion drag with constraints |
| **Sub: Tool** | Two-tap activation: first tap selects, second tap executes. Tooltip on hover. |
| **Layout** | Fixed bottom-right, `z-50`, rounded-full buttons |
| **Lines** | 497 |

---

## version-footer.tsx → `features/artifacts/components/version-footer.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `handleVersionChange`, `artifacts` *(redesign: renamed from documents)*, `currentVersionIndex` |
| **Parents** | `ArtifactPanel` (when not current version) *(redesign: renamed from Artifact)* |
| **Children** | "Restore this version" `Button`, "Back to latest" `Button` |
| **State** | `isMutating: boolean` |
| **Restore API** | POST `/api/artifact` with `{ id, timestamp, mode: "restore" }` *(redesign contract)* |
| **Animation** | `motion.div` slide-up from bottom (spring stiffness 140, damping 20) |
| **Layout** | `absolute bottom-0 z-50 w-full border-t bg-background p-4` |

---

## visibility-selector.tsx → `features/visibility/components/visibility-selector.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `chatId`, `selectedVisibilityType`, `className?` |
| **Parents** | `ChatHeader` |
| **Children** | `DropdownMenu` → Private (LockIcon) / Public (GlobeIcon) with checkmarks |
| **Hooks** | `useOptimistic` + `updateChatVisibility` Server Action |
| **Responsive** | `hidden md:flex` on trigger button (desktop only) |
| **Exported type** | `VisibilityType = "private" | "public"` |

---

## weather.tsx → `components/weather.tsx`

| Field | Detail |
|-------|--------|
| **Type** | Client (`"use client"`) |
| **Props** | `weatherAtLocation: WeatherAtLocation` |
| **Parents** | `PreviewMessage` (tool-getWeather output) |
| **Children** | Custom SVG icons (SunIcon, MoonIcon, CloudIcon), temperature/humidity/wind display |
| **Hooks** | `useIsMobile` |
| **Lines** | 467 |

---

## Hooks Summary

> *Redesign: `useMessages` hook removed — messages accessed via `useChatSessionContext()` from `ChatSessionContext`. `useOptimisticChats` renamed to `usePendingChats`. `useArtifact` now uses `useSyncExternalStore` (module-level store) instead of SWR.*

| Hook | File | Rebuild Location |
|------|------|------------------|
| `useArtifact` | `hooks/use-artifact.ts` | `features/artifacts/hooks/use-artifact.ts` *(redesign: useSyncExternalStore)* |
| `useArtifactSelector` | `hooks/use-artifact.ts` | `features/artifacts/hooks/use-artifact-selector.ts` |
| `useChatVisibility` | `hooks/use-chat-visibility.ts` | `features/visibility/components/visibility-selector.tsx` + `updateChatVisibility` Server Action |
| ~~`useMessages`~~ | ~~`hooks/use-messages.tsx`~~ | *(redesign: removed — `ChatSessionContext` provides messages)* |
| `useIsMobile` | `hooks/use-mobile.ts` | `hooks/use-mobile.ts` (shared) |
| `usePendingChats` | `hooks/use-pending-chats.tsx` | `features/sidebar/hooks/use-pending-chats.tsx` *(redesign: renamed from useOptimisticChats)* |
| `useScrollToBottom` | `hooks/use-scroll-to-bottom.tsx` | `features/chat/hooks/use-scroll-to-bottom.tsx` |
| `useWindowSize` | `hooks/use-window-size.ts` | `hooks/use-window-size.ts` (shared) |

---

## UI Primitives (components/ui/) → `components/ui/` (shared)

All 22 files are shadcn/ui-compatible primitives. They remain in the shared UI directory:

`alert-dialog`, `avatar`, `badge`, `button`, `card`, `carousel`, `collapsible`, `dropdown-menu`, `hover-card`, `input`, `label`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `switch`, `textarea`, `tooltip`
