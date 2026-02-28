# Accessibility Patterns — UI Parity Reference

> Every ARIA attribute, keyboard pattern, focus management, and screen reader consideration found in oldapp.

---

## 1. ARIA Attributes

### Roles

| Pattern | Component | Detail |
|---------|-----------|--------|
| `role="slider"` | `console.tsx` | Resize handle for console panel height |

### Labels

| Attribute | Component | Value |
|-----------|-----------|-------|
| `aria-label="Upload file"` | `multimodal-input.tsx` | Hidden file input |
| `aria-label="Send Message"` | `multimodal-input.tsx → PromptInputSubmit` | Submit button |
| `aria-label="Stop generation"` | `multimodal-input.tsx → StopButton` | Stop streaming button |
| `aria-label="Toggle Sidebar"` | `sidebar-toggle.tsx` | Sidebar toggle via tooltip |
| `aria-label="Resize console"` | `console.tsx` | Resize handle |
| `aria-label="Remove attachment"` | `preview-attachment.tsx` | Remove button on attachment |

### States

| Attribute | Component | Detail |
|-----------|-----------|--------|
| `aria-pressed` | `settings-sheet.tsx` (SettingToggle) | Toggle buttons for settings (reasoning, stream artifacts, auto-scroll) |
| `aria-pressed` | `message-actions.tsx` | Vote buttons (upvote/downvote) on messages |
| `aria-disabled` | `submit-button.tsx` | Auth form submit when pending/successful |
| `aria-busy` | `sidebar-skeleton.tsx` | Skeleton loading sections |
| `aria-orientation="vertical"` | `console.tsx` | Resize slider orientation |
| `aria-valuemin` / `aria-valuemax` / `aria-valuenow` | `console.tsx` | Console resize handle range (100–500px) |

### Live Regions

| Attribute | Component | Detail |
|-----------|-----------|--------|
| `<output aria-live="polite">` | `submit-button.tsx` | Screen reader status announcements for form submission (hidden visually) |

---

## 2. Keyboard Navigation

### Global Patterns

| Key | Behavior | Component |
|-----|----------|-----------|
| `Enter` | Submit chat message (when not composing) | `multimodal-input.tsx` |
| `Shift+Enter` | Newline in chat input | `multimodal-input.tsx` |
| `Escape` | Close settings sheet | `settings-sheet.tsx` |
| `Escape` | Close dropdown menus | All `DropdownMenu` usages |
| `Escape` | Cancel message editing | `message-editor.tsx` |

### Console Resize

| Key | Behavior | Component |
|-----|----------|-----------|
| `ArrowUp` | Increase console height by 10px | `console.tsx` |
| `ArrowDown` | Decrease console height by 10px | `console.tsx` |

### Toolbar Tools

| Key | Behavior | Component |
|-----|----------|-----------|
| `Enter` / `Click` | Two-tap activation: select tool, then execute | `toolbar.tsx` |
| `Space` → synthetic events | Drag interactions on reading level selector | `toolbar.tsx` |

### Sidebar Navigation

| Pattern | Detail |
|---------|--------|
| Standard link/button focus | `SidebarMenuButton` renders as `<Link>` or `<button>` |
| Dropdown trigger | `DropdownMenuTrigger` for chat item actions |
| Dialog focus trap | `AlertDialog` for delete confirmations |

---

## 3. Screen Reader Considerations

### Hidden Elements

| Pattern | Component | Detail |
|---------|-----------|--------|
| `sr-only` text | `sidebar-history-item.tsx` | "More" label on dropdown trigger |
| `sr-only` text | `submit-button.tsx` | Submit button text when showing spinner |
| `<output>` live region | `submit-button.tsx` | Announces "Loading" / "Submitted" states |

### Semantic Structure

| Pattern | Component |
|---------|-----------|
| `<nav>` | `Sidebar` (via shadcn sidebar primitive) |
| `<main>` | `SidebarInset` (implicit main content area) |
| `<form>` | `auth-form.tsx`, used in login/register |
| `<label>` + `<input>` | `auth-form.tsx` (email/password with htmlFor) |
| `<label>` + `<input>` | `settings-sheet.tsx` (sampling parameters) |
| Heading hierarchy | Login/Register pages: h3 title, p description |

### Content Descriptions

| Pattern | Component | Detail |
|---------|-----------|--------|
| `Tooltip` content | Multiple | Provides accessible name for icon-only buttons |
| Button text | All action buttons | Text content serves as accessible name |
| `data-testid` | Multiple | Testing hooks (not a11y, but supports test automation) |

---

## 4. Focus Management

### Auto-focus

| Component | Element | Condition |
|-----------|---------|-----------|
| `auth-form.tsx` | Email input | `autoFocus` on mount |
| `multimodal-input.tsx` | Textarea | After message submit (desktop only — uses `useIsMobile` guard) |
| `message-editor.tsx` | Edit textarea | On entering edit mode |

### Focus After Actions

| Action | Focus Target | Component |
|--------|-------------|-----------|
| Submit message | TextArea refocus (desktop) | `multimodal-input.tsx` |
| Cancel edit | Return to view mode | `message-editor.tsx` |
| Close artifact | Chat input | `artifact-close-button.tsx` |
| Open/close sidebar | No explicit trap | `sidebar-toggle.tsx` |

### Focus Traps

| Component | Pattern |
|-----------|---------|
| `AlertDialog` | Radix UI focus trap (auto) |
| `Sheet` (settings) | Radix UI focus trap (auto) |
| `DropdownMenu` | Radix UI focus management (auto) |

---

## 5. Responsive Behavior (Mobile vs Desktop)

Source: `useIsMobile()` hook (768px breakpoint, debounced 100ms)

### Layout Differences

| Feature | Mobile | Desktop |
|---------|--------|---------|
| Sidebar | Overlay sheet (`SheetContent`) | Fixed left panel (collapsed/expanded) |
| Artifact panel | Full screen (`w-dvw h-dvh`) | 400px message sidebar + remaining content |
| Visibility selector | Hidden (`hidden md:flex`) | Visible in chat header |
| New Chat button | Fixed position | Inline in header |
| Login/Register | `items-start pt-12` | `items-center` centered |
| Message input focus | No auto-focus after submit | Auto-focus after submit |

### Server-Side Detection

- `x-device-type` header from middleware → `initialIsMobile` in chat layout
- Client-side `useIsMobile()` hydrates to actual viewport

### Component Guards

| Component | Guard |
|-----------|-------|
| `SidebarToggle` | `hidden md:block` (tooltip hidden on mobile) |
| `ArtifactMessages` | Desktop only (400px sidebar) — not rendered on mobile |
| `VisibilitySelector` | `hidden md:flex` |
| Auto-focus textarea | `!isMobile` check in `multimodalInput` |

---

## 6. Animation Accessibility

### Motion Patterns Used

| Library | Components |
|---------|------------|
| `framer-motion` | `toolbar.tsx` (direct import, not lib/motion) |
| `motion` (lib/motion.tsx) | `greeting.tsx`, `suggested-actions.tsx`, `version-footer.tsx`, `artifact.tsx` |
| `AnimatePresence` | `artifact.tsx` (enter/exit), `suggestion.tsx` (expand/collapse), `messages.tsx` (thinking message) |

### Considerations for Rebuild

- No `prefers-reduced-motion` checks detected in current codebase
- **Recommendation:** Add `prefers-reduced-motion` media query support to all motion components
- Spring animations may cause issues for vestibular sensitivity users
- Current: `lib/motion.tsx` wraps `framer-motion` — good single point to add reduced-motion support

---

## 7. Color and Contrast

### Theme System

- `attribute="class"` via `next-themes`
- CSS custom properties define all colors in `globals.css`
- Dark mode: `dark:` prefix classes throughout

### Specific Color Usage

| Context | Color | Detail |
|---------|-------|--------|
| User message bubble | `#006cff` background, white text | Hardcoded in `message.tsx` |
| Error state | `text-destructive` | Tailwind semantic class |
| Success/active | `text-primary` | Tailwind semantic class |
| Skeleton pulse | `bg-sidebar-accent/50` | Muted pulse animation |

### Contrast Concerns

- User message bubble uses hardcoded `#006cff` — verify 4.5:1 contrast with white text
- Skeleton text uses 50% opacity — may have low contrast during loading

---

## 8. Special Patterns

### `suppressHydrationWarning`

- Root `<html>` element — required for `next-themes` class-based theme switching
- Prevents React warning on theme class attribute mismatch

### `data-testid` Usage

Found throughout for test automation:
- `multimodal-input` (textarea)
- `send-button`
- `stop-button`
- Login/register forms and buttons

### Viewport Control

- `maximumScale: 1` in root layout viewport config — disables pinch-zoom
- **Concern:** This is an accessibility anti-pattern. Users who need to zoom are blocked.
- **Recommendation:** Remove `maximumScale: 1` in rebuild unless required for specific input behavior

---

## 9. Checklist for Rebuild

- [ ] All `aria-label` attributes preserved
- [ ] All `aria-pressed` toggle patterns preserved
- [ ] `aria-live="polite"` on form submission status
- [ ] `role="slider"` with full value attributes on console resize
- [ ] `sr-only` text on icon-only buttons and triggers
- [ ] Keyboard: Enter/Shift+Enter in chat input
- [ ] Keyboard: Arrow keys on console resize
- [ ] Focus: auto-focus on textarea after submit (desktop only)
- [ ] Focus: auto-focus on email field in auth forms
- [ ] Focus traps in AlertDialog, Sheet, DropdownMenu (via Radix)
- [ ] Mobile: sidebar as overlay sheet
- [ ] Mobile: no auto-focus on textarea
- [ ] Mobile: visibility selector hidden
- [ ] Tooltip accessible names for icon-only buttons
- [ ] `data-testid` attributes for test automation
- [ ] **NEW:** Add `prefers-reduced-motion` support
- [ ] **NEW:** Reconsider `maximumScale: 1` viewport restriction
