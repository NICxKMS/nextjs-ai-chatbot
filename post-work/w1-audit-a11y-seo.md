# Wave 1 — Cross-Cutting: Accessibility + SEO Audit

> **Auditor:** Thoth · **Date:** 2026-03-07
> **Scope:** All component files (`components/`, `features/`), all page/layout files (`app/`). Excludes `oldapp/` and `components/ai-elements/` (read-only, generated).
> **Confidence:** HIGH — findings based on direct file reads and exhaustive grep searches.

---

## Summary

| Area | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| Accessibility | 1 | 5 | 7 | 4 | 17 |
| SEO | 0 | 2 | 2 | 1 | 5 |
| **Total** | **1** | **7** | **9** | **5** | **22** |

---

## Accessibility Findings

### A1 — Skip Navigation Link

`SEVERITY: [HIGH] | FILE: app/layout.tsx:36-55 | FINDING: No skip navigation link exists. The root layout renders <html>→<body> with no mechanism to bypass sidebar/header navigation. Keyboard-only users must tab through the entire sidebar + header on every page. | RECOMMENDATION: Add a visually-hidden "Skip to main content" link as the first child of <body> that targets the <main> landmark (SidebarInset). Pattern: <a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a> and add id="main-content" to SidebarInset.`

### A2 — No `<nav>` Landmark for Sidebar Navigation

`SEVERITY: [HIGH] | FILE: components/ui/sidebar.tsx:208-220 | FINDING: SidebarContent renders as a plain <div>. The sidebar is the primary navigation area containing chat history links, yet has no <nav> landmark. Screen readers cannot identify it as a navigation region. | RECOMMENDATION: Either make SidebarContent render as <nav aria-label="Chat history"> or wrap the sidebar's scrollable history area in a <nav> element.`

### A3 — Artifact Panel Missing Focus Trap

`SEVERITY: [CRITICAL] | FILE: features/artifacts/components/artifact-panel.tsx:330-370 | FINDING: Artifact panel renders as a full-viewport dialog (role="dialog") but has NO focus trap. Focus management moves focus into the panel on open and restores on close (lines 67-79), but Tab key can escape the panel into background content. For a modal overlay (z-50, full viewport), WCAG 2.4.3 requires focus to be constrained within the dialog. | RECOMMENDATION: Implement a focus trap (e.g., @radix-ui/react-focus-trap, react-focus-lock, or a custom trap) inside the artifact panel. The existing Radix Dialog/Sheet primitives handle this automatically — consider rendering via Sheet/Dialog instead of raw motion.div.`

### A4 — Artifact Close Button Missing aria-label

`SEVERITY: [MEDIUM] | FILE: features/artifacts/components/artifact-close-button.tsx:22-30 | FINDING: Close button renders only a CrossIcon with no accessible name. Screen readers announce it as an unlabeled button. | RECOMMENDATION: Add aria-label="Close artifact panel" to the Button.`

### A5 — Sidebar Toggle Missing aria-label

`SEVERITY: [MEDIUM] | FILE: components/sidebar-toggle.tsx:23-39 | FINDING: SidebarToggle button renders only a SidebarLeftIcon with tooltip text but no aria-label. While the TooltipContent says "Toggle Sidebar", the button itself has no accessible name. Tooltips are NOT announced by all screen readers. | RECOMMENDATION: Add aria-label="Toggle Sidebar" to the Button element (or use sr-only text inside it).`

### A6 — Message List Missing Live Region

`SEVERITY: [HIGH] | FILE: features/chat/components/messages.tsx:95-130 | FINDING: When new messages arrive (including streaming assistant responses), there is no aria-live region to announce them to screen readers. Users relying on assistive technology get no notification of new content. | RECOMMENDATION: Add an aria-live="polite" region that announces new messages (e.g., "Assistant is responding" when status transitions, or a summary of the new message). Consider aria-relevant="additions" on the message container.`

### A7 — Greeting Component Uses Non-Semantic Divs

`SEVERITY: [LOW] | FILE: features/chat/components/greeting.tsx:1-14 | FINDING: Greeting renders "Hello there!" and "How can I help you today?" as plain <div> elements with no heading structure. These are the primary content of the empty chat state but have no semantic meaning. | RECOMMENDATION: Use <h1> for the greeting when it's the primary page content (empty chat state), or at minimum provide an aria-label on the container.`

### A8 — Version Footer Buttons Missing aria-labels

`SEVERITY: [MEDIUM] | FILE: features/artifacts/components/version-footer.tsx:75-92 | FINDING: Previous, Next, and Restore buttons rely on text labels ("Previous", "Next") which is adequate, but disabled states don't communicate why they're disabled. | RECOMMENDATION: Add aria-disabled reasoning via aria-description or visually-hidden helper text (e.g., "Already at first version" when Previous is disabled).`

### A9 — Message Editor Textarea Missing Label

`SEVERITY: [MEDIUM] | FILE: features/chat/components/message-editor.tsx:90-98 | FINDING: The message editing textarea has no associated <label>, aria-label, or aria-labelledby. Screen readers announce it as an unlabeled text input. | RECOMMENDATION: Add aria-label="Edit message" to the Textarea.`

### A10 — Multimodal Input Textarea Label

`SEVERITY: [LOW] | FILE: features/chat/components/multimodal-input.tsx:128-134 | FINDING: The main chat input textarea has placeholder text "Send a message..." but no aria-label or associated label. Placeholder text is not a reliable accessible name per WCAG. However, this is delegated to the ai-element PromptInputTextarea which is read-only. | RECOMMENDATION: Verify ai-element PromptInputTextarea has aria-label="Message input" or equivalent. If not, wrap with a label in the consumer.`

### A11 — Chat Header Uses `<header>` — Positive

`SEVERITY: [INFO] | FILE: features/chat/components/chat-header.tsx:22 | FINDING: ChatHeader correctly uses <header> semantic element. ChatHeader buttons use Tooltip + sr-only text patterns correctly.`

### A12 — Error Pages Missing role="alert"

`SEVERITY: [MEDIUM] | FILE: app/(chat)/error.tsx:26-40, app/(auth)/error.tsx:26-35, app/global-error.tsx | FINDING: Error boundary UIs render error states without role="alert" or aria-live. When an error occurs, screen readers won't announce the error automatically. | RECOMMENDATION: Add role="alert" to the error container div in each error boundary component.`

### A13 — 404 Page Missing h1 (Uses h2)

`SEVERITY: [LOW] | FILE: app/not-found.tsx:17 | FINDING: The 404 page's primary heading is <h2>. As a standalone page, it should use <h1> for proper heading hierarchy. | RECOMMENDATION: Change <h2> to <h1> for "Page not found".`

### A14 — Suggested Actions Missing Accessible Group

`SEVERITY: [LOW] | FILE: features/chat/components/suggested-actions.tsx:18-28 | FINDING: Suggested action buttons are in a grid div with no semantic group labeling. Screen readers don't know these are suggested prompts. | RECOMMENDATION: Add role="group" aria-label="Suggested prompts" to the container div.`

### A15 — Sheet Editor Missing Keyboard Accessibility Label

`SEVERITY: [MEDIUM] | FILE: features/artifacts/components/editors/sheet-editor.tsx:107-147 | FINDING: The DataGrid (react-data-grid) renders with no aria-label or caption. For screen readers, it's an unlabeled table-like widget. | RECOMMENDATION: Ensure DataGrid has aria-label="Spreadsheet data" or equivalent.`

### A16 — SidebarUserNav Image Has Good alt Text — Positive

`SEVERITY: [INFO] | FILE: features/sidebar/components/sidebar-user-nav.tsx:78 | FINDING: User avatar Image component correctly uses alt={displayLabel} providing meaningful alt text.`

### A17 — MotionProvider + CSS Reduced Motion — Well Implemented

`SEVERITY: [INFO] | FILE: components/motion-provider.tsx + app/globals.css:196-202 | FINDING: Both CSS-level and JS-level (framer-motion MotionConfig) reduced motion support are implemented. CSS covers CSS animations/transitions. MotionConfig covers JS-driven springs. This is a dual-layer best practice. However, MotionProvider is not in the root layout — only wraps artifact panel.`

### A17b — MotionProvider Not Global

`SEVERITY: [HIGH] | FILE: app/layout.tsx:36-55, features/artifacts/components/artifact-panel.tsx:321 | FINDING: MotionConfig reducedMotion="user" is only applied inside ArtifactPanel via MotionProvider. Chat messages, greeting, suggested actions, and version footer all use framer-motion animations outside this wrapper. These animations do NOT respect prefers-reduced-motion for JS-driven springs. The P7-T03 task spec called for root layout placement. | RECOMMENDATION: Move <MotionProvider> wrapper to app/layout.tsx (inside ThemeProvider) so ALL framer-motion animations respect the preference. The CSS media query only handles CSS transitions, not requestAnimationFrame-based springs.`

### A18 — Auth Form — Well Accessible

`SEVERITY: [INFO] | FILE: features/auth/components/auth-form.tsx | FINDING: Auth form uses Label+htmlFor, aria-live="polite" on success output, role="alert" on error messages, proper autoComplete attributes, and required attributes. This is well-implemented accessibility.`

### A19 — Settings Panel — Well Accessible

`SEVERITY: [INFO] | FILE: features/settings/components/settings-panel.tsx | FINDING: Uses Sheet (Radix Dialog), proper Label+htmlFor pairings, aria-labels on all inputs, sectioned with <section aria-label>. Well-implemented.`

### A20 — Sidebar Skeleton Uses aria-busy — Positive

`SEVERITY: [INFO] | FILE: features/sidebar/components/sidebar-skeleton.tsx:21-58 | FINDING: Loading skeleton sections correctly use aria-busy="true" to communicate loading state.`

---

## SEO Findings

### S1 — Missing sitemap.ts

`SEVERITY: [HIGH] | FILE: (missing) app/sitemap.ts | FINDING: No sitemap.ts or sitemap.xml exists. Search engines cannot discover pages. For a dynamic chat app, public shared chats (/chat/[id] with visibility="public") should be in the sitemap. | RECOMMENDATION: Create app/sitemap.ts that exports a default function returning public chat URLs. For MVP, a static sitemap with just the home page is sufficient. Next.js convention: export default function sitemap(): MetadataRoute.Sitemap.`

### S2 — Missing robots.ts

`SEVERITY: [HIGH] | FILE: (missing) app/robots.ts | FINDING: No robots.ts or robots.txt exists. Without it, search engines index all routes including /api/ endpoints and auth pages. | RECOMMENDATION: Create app/robots.ts that allows indexing of public pages (/, /chat/[id]) and disallows /api/*, /login, /register. Pattern: export default function robots(): MetadataRoute.Robots.`

### S3 — No OG Image for Chat Pages

`SEVERITY: [MEDIUM] | FILE: app/(chat)/chat/[id]/page.tsx:68-78 | FINDING: generateMetadata for chat pages returns only { title: chat?.title ?? "Chat" }. No Open Graph tags, no description. Shared public chats have no social preview when pasted into Slack/Twitter/etc. | RECOMMENDATION: Add openGraph: { title, description } to generateMetadata. Consider a dynamic og:image using Next.js ImageResponse.`

### S4 — Heading Hierarchy Issues

`SEVERITY: [MEDIUM] | FILE: app/not-found.tsx:17 (h2 as page heading), features/settings/components/settings-panel.tsx:236-259 (h3 without h2 parent) | FINDING: (a) 404 page uses <h2> as its primary heading — should be <h1>. (b) Settings panel uses <h3> headings ("Sampling", "System Prompt", "Behavior") but these are inside a Sheet with no <h2> ancestor — the SheetTitle is not an h-tag in the DOM. (c) The main chat view has NO heading elements at all — the greeting uses plain divs. | RECOMMENDATION: (a) Change 404 <h2> to <h1>. (b) Consider SheetTitle producing an h2 — verify in Radix Dialog. (c) Add a visually-hidden <h1> to the chat layout for screen readers (e.g., "AI Assistant Chat").`

### S5 — Root Layout Metadata — Good

`SEVERITY: [INFO] | FILE: app/layout.tsx:10-22 | FINDING: Root layout has proper metadata with title, description, openGraph, and viewport export. Good foundation. The (chat) layout uses template-based title: { template: "%s | ai-assistant", default: "ai-assistant" }. All page routes have metadata exports.`

### S5b — html lang="en" Present — Good

`SEVERITY: [INFO] | FILE: app/layout.tsx:38 | FINDING: <html lang="en"> is correctly set.`

---

## Route Metadata Coverage

| Route | Has Metadata? | Type | Notes |
|-------|--------------|------|-------|
| `app/layout.tsx` | ✅ | Static export | title, description, openGraph, viewport |
| `app/(chat)/layout.tsx` | ✅ | Static with template | `{ template: "%s \| ai-assistant" }` |
| `app/(chat)/page.tsx` | ✅ | Static export | `{ title: "New Chat" }` |
| `app/(chat)/chat/[id]/page.tsx` | ✅ | generateMetadata | Dynamic title from chat |
| `app/(auth)/layout.tsx` | ✅ | Static export | title + description |
| `app/(auth)/login/page.tsx` | ✅ | Static export | `{ title: "Sign In" }` |
| `app/(auth)/register/page.tsx` | ✅ | Static export | `{ title: "Sign Up" }` |
| `app/not-found.tsx` | ❌ | None | Falls back to root layout metadata |
| `app/global-error.tsx` | ❌ | None | Root error boundary — no metadata possible |

---

## Priority Fix Order

### Immediate (Critical + High)

1. **A3** — Artifact Panel focus trap (WCAG 2.4.3 violation, Critical)
2. **A1** — Skip navigation link (WCAG 2.4.1 violation)
3. **A2** — Sidebar `<nav>` landmark (WCAG 1.3.1 violation)
4. **A6** — Message list live region for new messages
5. **A17b** — MotionProvider not in root layout
6. **S1** — Create sitemap.ts
7. **S2** — Create robots.ts

### Soon (Medium)

8. **A4** — Artifact close button aria-label
9. **A5** — Sidebar toggle aria-label
10. **A9** — Message editor textarea label
11. **A12** — Error pages missing role="alert"
12. **A15** — Sheet editor table label
13. **S3** — OG tags for chat pages
14. **S4** — Heading hierarchy fixes

### Backlog (Low)

15. **A7** — Greeting semantic heading
16. **A10** — Multimodal input label (verify ai-element)
17. **A13** — 404 h2 → h1
18. **A14** — Suggested actions group label
19. **A8** — Version footer disabled state communication

---

## What's Working Well

- ✅ Auth form is well-accessible (Label+htmlFor, aria-live, role="alert", autoComplete)
- ✅ Settings panel uses semantic sections with aria-labels
- ✅ Vote buttons properly use aria-pressed
- ✅ Sidebar skeleton uses aria-busy
- ✅ SidebarInset renders as `<main>` element
- ✅ ChatHeader uses `<header>` element
- ✅ Sidebar menu uses `<ul>/<li>` list semantics
- ✅ Icon-only buttons in header have sr-only text
- ✅ CSS reduced motion support in globals.css
- ✅ MotionConfig reducedMotion="user" exists (just scoped too narrowly)
- ✅ All routes have metadata exports
- ✅ Root layout has `<html lang="en">`
- ✅ Root layout has openGraph metadata
- ✅ Keyboard navigation exists for code editor resize, message editing, sidebar rename
- ✅ Artifact panel has role="dialog", focus management (open/close), aria-label
- ✅ SidebarHistoryItem has sr-only text on "More" action button
