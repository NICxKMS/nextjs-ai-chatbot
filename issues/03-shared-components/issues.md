# Phase 3: Shared Components - Issues

**Phase Name:** Shared Components
**Comparison Scope:** Chat, Messages, Message, Sidebar Components, Artifact Components
**Date Started:** 2026-02-14
**Date Completed:** 2026-02-14

---

## Table of Contents

- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)
- [Issue Counts](#issue-counts)

---

## UI Inconsistencies

### P3-UI-001: Chat Component Missing AnimatePresence for ThinkingMessage

| Field | Value |
|-------|-------|
| **Issue ID** | P3-UI-001 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/messages.tsx:170-176` |
| **NEW Path** | `features/chat/components/messages.tsx:205-209` |

**Description:** The new Messages component doesn't use AnimatePresence for the ThinkingMessage, losing the smooth enter/exit animations.

**Impact:** The "Thinking..." message appears/disappears abruptly instead of with a smooth fade animation. This creates a less polished user experience.

**Suggested Fix:** Import AnimatePresence from motion library and wrap the ThinkingMessage for smooth animations.

---

### P3-UI-002: Message Component Missing Motion Animations

| Field | Value |
|-------|-------|
| **Issue ID** | P3-UI-002 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:61-67, 364-371` |
| **NEW Path** | `features/chat/components/message.tsx:98-101` |

**Description:** The new Message component uses CSS animation classes instead of Framer Motion for enter/exit animations.

**Impact:** Animations are less smooth and controllable. The ThinkingMessage doesn't have the exit animation with custom duration. The animation consistency across the app is reduced.

**Suggested Fix:** Import motion from @/lib/motion and use motion.div for message animations.

---

### P3-UI-003: MessageEditor Missing UI Components

| Field | Value |
|-------|-------|
| **Issue ID** | P3-UI-003 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message-editor.tsx:61-77` |
| **NEW Path** | `features/chat/components/message-editor.tsx:171-197` |

**Description:** The new MessageEditor uses plain HTML elements instead of the Button and Textarea UI components.

**Impact:** Styling inconsistencies with the rest of the app. The buttons and textarea may not match the design system. Focus states, disabled states, and hover effects may differ.

**Suggested Fix:** Import and use Button and Textarea components from @/components/ui.

---

### P3-UI-004: Different Empty State Message in SidebarHistory

| Field | Value |
|-------|-------|
| **Issue ID** | P3-UI-004 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-history.tsx:514-516` |
| **NEW Path** | `features/sidebar/components/sidebar-history.tsx:312-314` |

**Description:** The empty state message differs between old and new apps. Old: "Your conversations will appear here once you start chatting!" New: "No chats yet. Start a new conversation!"

**Impact:** Minor UX difference. The old message was more conversational.

**Suggested Fix:** Use the original message for consistency.

---

### P3-UI-005: Different Close Button Icon in Artifact Panel

| Field | Value |
|-------|-------|
| **Issue ID** | P3-UI-005 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact-close-button.tsx:3,25` |
| **NEW Path** | `features/artifact/components/artifact-close.tsx:11,44` |

**Description:** The close button uses a different icon source (lucide-react X vs custom CrossIcon).

**Impact:** Visual difference only. The icon may look slightly different.

**Suggested Fix:** None required if the visual appearance is acceptable.

---

## Bugs

### P3-BUG-001: Chat Component Missing fetchWithErrorHandlers

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-001 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/chat.tsx:200-202` |
| **NEW Path** | `features/chat/components/chat.tsx:132-144` |

**Description:** The new Chat component uses the default fetch instead of the custom fetchWithErrorHandlers that handles authentication errors and session expiry.

**Impact:** Authentication errors and session expiry won't be handled properly. Users with expired sessions won't be redirected to login.

**Suggested Fix:** Import and use fetchWithErrorHandlers from lib/utils or lib/api for proper error handling.

---

### P3-BUG-002: Chat Component Missing Data Stream Handlers

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-002 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/chat.tsx:216-251` |
| **NEW Path** | `features/chat/components/chat.tsx:146-152` |

**Description:** The new Chat component's onData handler only handles "data-usage" type, missing handlers for artifact streaming, title updates, and message appending.

**Impact:** Artifacts won't stream in real-time, chat titles won't update optimistically, and dynamically appended messages won't appear.

**Suggested Fix:** Add all data type handlers from the old app, including artifact streaming, title updates, and message appending.

---

### P3-BUG-003: Messages Component Missing useDataStream Hook

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-003 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/messages.tsx:46` |
| **NEW Path** | `features/chat/components/messages.tsx` |

**Description:** The new Messages component doesn't call useDataStream() hook which is required for artifact streaming to work.

**Impact:** Artifact streaming won't work. The data stream context won't be consumed, so real-time artifact updates during AI response streaming won't be displayed.

**Suggested Fix:** Import and call useDataStream hook from the data-stream-provider.

---

### P3-BUG-004: Messages Component Missing Auto-Scroll Setting Check

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-004 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/messages.tsx:47,57-66` |
| **NEW Path** | `features/chat/components/messages.tsx:89-94` |

**Description:** The new Messages component doesn't check the autoScroll setting from user preferences before auto-scrolling.

**Impact:** Users who have disabled auto-scroll in settings will still have the view scrolled automatically. This ignores user preferences.

**Suggested Fix:** Import useSettingsSnapshot and check the autoScroll setting before auto-scrolling.

---

### P3-BUG-005: Message Component Missing Tool Implementations

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-005 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:188-311` |
| **NEW Path** | `features/chat/components/message.tsx:248-263` |

**Description:** The new Message component has placeholder implementations for all tool invocations instead of the full implementations from the old app.

**Impact:** Weather display, document creation/updates, and suggestion requests won't render properly. Users will see generic "Tool result placeholder" instead of actual tool outputs.

**Suggested Fix:** Implement all tool invocation UIs with their respective components (Weather, DocumentPreview, DocumentToolResult).

---

### P3-BUG-006: Missing ChevronUp Icon in Dropdown Trigger

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-006 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-user-nav.tsx:87` |
| **NEW Path** | `features/sidebar/components/sidebar-user-nav.tsx:77-99` |

**Description:** The new SidebarUserNav is missing the ChevronUp icon that indicates the button is a dropdown trigger.

**Impact:** Users may not realize the user nav is clickable/expandable. Missing visual affordance for dropdown menu.

**Suggested Fix:** Add ChevronUp icon from lucide-react to the SidebarMenuButton, positioned with `className="ml-auto"`.

---

### P3-BUG-007: Missing SWR Cache Clearing on Logout

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-007 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-user-nav.tsx:139-147` |
| **NEW Path** | `features/sidebar/components/sidebar-user-nav.tsx:136-143` |

**Description:** The new implementation doesn't clear the SWR cache when signing out, which could show stale data.

**Impact:** After logout, if user logs in as a different account, they might briefly see the previous user's chat history from the cached data.

**Suggested Fix:** Add SWR cache clearing before redirect, or ensure the history API properly returns empty for unauthenticated users.

---

### P3-BUG-008: Missing Supabase Client signOut Call

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-008 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-user-nav.tsx:135-136` |
| **NEW Path** | `features/sidebar/components/sidebar-user-nav.tsx:137-142` |

**Description:** The new implementation only calls the server-side logout API but doesn't call the Supabase client signOut.

**Impact:** The Supabase client-side session may not be properly cleared, potentially causing auth state inconsistencies.

**Suggested Fix:** Add `getSupabaseBrowserClient().auth.signOut()` after the logout API call.

---

### P3-BUG-009: Missing isNewSession Optimization

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-009 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-history.tsx:185-198` |
| **NEW Path** | `features/sidebar/components/sidebar-history.tsx:177-189` |

**Description:** The new implementation always fetches chat history on mount, even for new guest sessions that have no history.

**Impact:** Unnecessary API calls for new users/guests. Wastes server resources and adds latency to initial page load.

**Suggested Fix:** Add isNewSession check from auth context and skip fetching when it's a new session.

---

### P3-BUG-010: Manual "Load More" Button Instead of Infinite Scroll

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-010 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-history.tsx:441-445` |
| **NEW Path** | `features/sidebar/components/sidebar-history.tsx:347-364` |

**Description:** The new implementation uses a manual "Load more" button instead of automatic infinite scroll via Virtuoso's endReached callback.

**Impact:** Worse UX - users must click to load more instead of natural scrolling. The old app seamlessly loaded more chats as users scrolled down.

**Suggested Fix:** Implement Virtuoso with endReached callback for automatic infinite scroll.

---

### P3-BUG-011: Missing Chat Deduplication by ID

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-011 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-history.tsx:347-350` |
| **NEW Path** | `features/sidebar/components/sidebar-history.tsx:180-184` |

**Description:** The new implementation doesn't deduplicate chats by ID, which could lead to duplicate entries if pagination returns overlapping data.

**Impact:** Potential duplicate chat entries in sidebar if there are any race conditions or overlapping pagination results.

**Suggested Fix:** Add deduplication logic when merging new chats into state.

---

### P3-BUG-012: MessageActions Missing SWR Cache Mutation

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-012 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message-actions.tsx:92-123` |
| **NEW Path** | `features/chat/components/message-actions.tsx:255-269` |

**Description:** The new MessageActions component doesn't update the SWR cache after voting, so the UI won't update optimistically.

**Impact:** After voting, the UI won't update immediately. Users will see the old vote state until the page refreshes.

**Suggested Fix:** Import useSWRConfig and add mutate calls to update the vote cache optimistically.

---

### P3-BUG-013: MessageEditor Missing Server Action Integration

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-013 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message-editor.tsx:86-97` |
| **NEW Path** | `features/chat/components/message-editor.tsx:134-147` |

**Description:** The new MessageEditor doesn't call the deleteTrailingMessages server action, using console.log instead.

**Impact:** Message editing is broken. When a user edits a message, the trailing messages (AI responses) won't be deleted from the database.

**Suggested Fix:** Import and call the deleteTrailingMessages server action from the chat feature.

---

### P3-BUG-014: Missing Error Toast on Logout Failure

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-014 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-user-nav.tsx:151-156` |
| **NEW Path** | `features/sidebar/components/sidebar-user-nav.tsx:136-143` |

**Description:** The new implementation doesn't show an error toast if logout fails.

**Impact:** Users won't know if logout failed. They might think they're logged out when they're not.

**Suggested Fix:** Add try/catch or .catch() handler with error toast notification.

---

### P3-BUG-015: Missing Loading State Toast

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BUG-015 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-user-nav.tsx:117-124` |
| **NEW Path** | `features/sidebar/components/sidebar-user-nav.tsx:128-130` |

**Description:** The old app showed a toast when clicking logout while auth status was still loading.

**Impact:** Users clicking logout during initial auth check get no feedback about why nothing happened.

**Suggested Fix:** Add toast notification when status is "loading" to inform user to wait.

---

## Broken Code

### P3-BRK-001: Chat Component Missing Core Functionality

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-001 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/chat.tsx:78-332` |
| **NEW Path** | `features/chat/components/chat.tsx:72-277` |

**Description:** The new Chat component is a placeholder implementation missing critical functionality: visibility toggle integration, artifact integration, settings integration, optimistic chat updates, model persistence to localStorage, query parameter handling, error handling with credit card alerts, and proper streaming data handlers.

**Impact:** The chat experience is severely degraded. Users cannot: change chat visibility, use artifacts, have model selection persist, see new chats appear optimistically in sidebar, handle URL query parameters, or get proper error feedback for billing issues.

**Suggested Fix:** Complete the Chat component implementation by integrating all missing hooks and features from the old app.

---

### P3-BRK-002: Messages Component Missing Virtualization

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-002 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/messages.tsx:201-215` |
| **NEW Path** | `features/chat/components/messages.tsx:150-187` |

**Description:** The new Messages component uses a simple map-based render instead of Virtuoso virtualization, which will cause severe performance issues with large message lists.

**Impact:** With large chat histories (100+ messages), the browser will struggle to render all messages at once, causing: slow initial render, laggy scrolling, high memory usage, and potential browser crashes on low-end devices.

**Suggested Fix:** Integrate react-virtuoso library and restore the virtualized rendering approach from the old app.

---

### P3-BRK-003: Missing Virtualization (GroupedVirtuoso) in SidebarHistory

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-003 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-history.tsx:529-544` |
| **NEW Path** | `features/sidebar/components/sidebar-history.tsx:324-344` |

**Description:** The new SidebarHistory uses simple map rendering instead of GroupedVirtuoso virtualization. This will cause severe performance issues with large chat histories (100+ chats).

**Impact:** With hundreds of chats, the browser will struggle to render all DOM nodes, causing laggy scrolling, high memory usage, and potential crashes on mobile devices.

**Suggested Fix:** Install react-virtuoso and implement GroupedVirtuoso with the same configuration as the old app.

---

### P3-BRK-004: Missing Optimistic Chats Integration in SidebarHistory

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-004 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-history.tsx:178` |
| **NEW Path** | `features/sidebar/components/sidebar-history.tsx` |

**Description:** The new SidebarHistory has no integration with optimistic chats. New chats won't appear in the sidebar until they're persisted to the database.

**Impact:** When users start a new chat, it won't appear in the sidebar history immediately. They must refresh or wait for the chat to be saved.

**Suggested Fix:** Integrate useOptimisticChats hook and implement the optimistic chat handling logic from the old app.

---

### P3-BRK-005: Missing Chat Title Update Event Listener

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-005 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/sidebar-history.tsx:257-267` |
| **NEW Path** | `features/sidebar/components/sidebar-history.tsx` |

**Description:** The new SidebarHistory doesn't listen for the 'chat-title-updated' custom event that triggers history revalidation when titles are generated.

**Impact:** When a chat title is generated asynchronously (for short responses), the sidebar won't update to show the new title. Users will see "Untitled" or old titles until they manually refresh.

**Suggested Fix:** Add useEffect with window.addEventListener('chat-title-updated') that triggers a refetch of chat history.

---

### P3-BRK-006: Missing ArtifactMessages Component

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-006 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact-messages.tsx:1-115` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx:364-369` |

**Description:** The ArtifactMessages component is completely missing from the new application. This component was responsible for rendering the message list inside the artifact panel.

**Impact:** Users cannot view or interact with chat messages while an artifact is open. The entire left panel of the artifact view is non-functional.

**Suggested Fix:** Create features/artifact/components/artifact-messages.tsx with full message rendering functionality.

---

### P3-BRK-007: Missing Artifact Class Definition

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-007 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/create-artifact.tsx:71-93` |
| **NEW Path** | `features/artifact/types.ts:95-105` |

**Description:** The old app had a sophisticated `Artifact` class that defined artifact types with: kind, description, content component, actions array, toolbar items, initialize() method, and onStreamPart() handler. The new app only has TypeScript interfaces without the class implementation.

**Impact:** The artifact plugin system is broken. The old app could register new artifact types dynamically. The new app has no mechanism to register or use artifact definitions.

**Suggested Fix:** Either implement the Artifact class pattern or create a registration system for artifact types.

---

### P3-BRK-008: Missing MultimodalInput in Artifact Panel

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-008 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact.tsx:397-416` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx` |

**Description:** The old artifact panel included a MultimodalInput component at the bottom for sending messages while viewing artifacts. The new panel has no input capability.

**Impact:** Users cannot send messages or interact with the chat while an artifact is open. The artifact panel becomes a read-only view.

**Suggested Fix:** Add MultimodalInput component to the artifact panel, passing necessary props from the parent chat context.

---

### P3-BRK-009: Missing Toolbar Component in Artifact Panel

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-009 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact.tsx:560-574` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx` |

**Description:** The old artifact panel included a Toolbar component that appeared when the current version was displayed, providing quick actions like summarize, improve, etc.

**Impact:** Users lose quick access to artifact-specific actions like "Summarize", "Improve", etc.

**Suggested Fix:** Create a Toolbar component in features/artifact/components/toolbar.tsx and integrate it into the artifact panel.

---

### P3-BRK-010: Missing Artifact Type Definitions

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-010 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx:48-148` |

**Description:** The old app had a complete artifact type system defined in archive/oldapp/artifacts/: textArtifact, codeArtifact, imageArtifact, sheetArtifact. The new app has inline placeholder renderers that don't match the functionality.

**Impact:** All artifact types lose their specialized functionality: Text artifacts lose rich text editing and suggestions; Code artifacts lose syntax highlighting and Python execution; Image artifacts lose editing capabilities; Sheet artifacts lose spreadsheet functionality.

**Suggested Fix:** Migrate the artifact definitions from archive/oldapp/artifacts/ to the new feature structure.

---

### P3-BRK-011: Missing VersionFooter Component Integration

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-011 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/version-footer.tsx:1-87` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx:434-450` |

**Description:** The old app had a dedicated VersionFooter component for version navigation. The new app has an inline implementation that lacks the full functionality including restore version functionality.

**Impact:** Users cannot restore previous versions of artifacts. The version history feature is incomplete.

**Suggested Fix:** Import and use the VersionFooter component from components/version-footer.tsx.

---

### P3-BRK-012: Missing AnimatePresence and Motion Animations

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-012 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact.tsx:323-589` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx:349-452` |

**Description:** The old artifact panel had sophisticated animations using Framer Motion for panel entrance/exit, smooth transitions between mobile and desktop layouts, bounding box animations, and overlay animations. The new panel has no animations at all.

**Impact:** The artifact panel feels abrupt and jarring. No smooth transitions when opening/closing. The UX feels unpolished.

**Suggested Fix:** Add Framer Motion animations using the pattern from the old app. Import from "@/lib/motion".

---

### P3-BRK-013: Missing useWindowSize Hook in Artifact Panel

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-013 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact.tsx:297-301` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx` |

**Description:** The old artifact panel used useWindowSize for responsive behavior, detecting mobile vs desktop layouts. The new panel has hardcoded mobile handling.

**Impact:** The artifact panel may not adapt correctly to different screen sizes. Mobile vs desktop behavior is not properly detected.

**Suggested Fix:** Import and use useWindowSize from "@/hooks/use-window-size" for responsive behavior.

---

### P3-BRK-014: Missing useSidebar Hook Integration in Artifact Panel

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-014 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact.tsx:109` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx` |

**Description:** The old artifact panel integrated with the sidebar state to adjust layout when the sidebar was open/closed.

**Impact:** The artifact panel doesn't adjust its layout when the sidebar opens/closes. This could cause overlap or layout issues.

**Suggested Fix:** Import useSidebar and integrate sidebar state into layout calculations.

---

### P3-BRK-015: Missing Artifact Actions Implementation

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-015 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/text/client.tsx:100-150` |
| **NEW Path** | `features/artifact/components/artifact-actions.tsx:33-62` |

**Description:** The new ArtifactActions component has empty actions arrays in defaultArtifactDefinitions. The old app had fully implemented actions for each artifact type.

**Impact:** All artifact action buttons are missing. Users cannot copy content, undo/redo, or perform type-specific actions.

**Suggested Fix:** Migrate artifact actions from archive/oldapp/artifacts/*/client.tsx files to the new artifact definitions.

---

### P3-BRK-016: Message Component Missing MessageReasoning Integration

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-016 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:128-134` |
| **NEW Path** | `features/chat/components/message.tsx:157-174` |

**Description:** The new Message component has an inline placeholder for reasoning instead of using the dedicated MessageReasoning component.

**Impact:** Reasoning display lacks the collapsible UI, streaming indicators, and auto-close behavior from the MessageReasoning component.

**Suggested Fix:** Import and use the MessageReasoning component from ./message-reasoning.

---

### P3-BRK-017: Message Component Missing MessageEditor Integration

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-017 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:166-185` |
| **NEW Path** | `features/chat/components/message.tsx:206-244` |

**Description:** The new Message component has a placeholder edit mode instead of using the MessageEditor component.

**Impact:** Message editing is broken. The placeholder doesn't call the server action to delete trailing messages, doesn't properly update the message state, and doesn't trigger regeneration.

**Suggested Fix:** Import and use the MessageEditor component from ./message-editor.

---

### P3-BRK-018: Message Component Missing MessageActions Integration

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-018 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:316-325` |
| **NEW Path** | `features/chat/components/message.tsx:268-293` |

**Description:** The new Message component has inline action buttons instead of using the MessageActions component with proper voting functionality.

**Impact:** Voting (upvote/downvote) is completely missing. Copy doesn't use the proper clipboard hook with toast feedback. The edit button doesn't work properly.

**Suggested Fix:** Import and use the MessageActions component from ./message-actions.

---

### P3-BRK-019: Message Component Missing PreviewAttachment

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-019 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:98-117` |
| **NEW Path** | `features/chat/components/message.tsx:133-151` |

**Description:** The new Message component has a placeholder attachment display instead of using the PreviewAttachment component.

**Impact:** File attachments display as plain text with an emoji instead of proper cards with file type icons and preview capabilities.

**Suggested Fix:** Import and use PreviewAttachment component for proper attachment display.

---

### P3-BRK-020: Message Component Uses sanitizeHtml Instead of sanitizeText

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-020 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:159` |
| **NEW Path** | `features/chat/components/message.tsx:199` |

**Description:** The new Message component uses sanitizeHtml while the old uses sanitizeText - these may have different sanitization behaviors.

**Impact:** Different sanitization could lead to different output. sanitizeText may be more appropriate for plain text content.

**Suggested Fix:** Verify sanitization functions are equivalent, or use sanitizeText. Consider using Response component for consistent text rendering.

---

### P3-BRK-021: Message Component Missing Response Component

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-021 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:158-161` |
| **NEW Path** | `features/chat/components/message.tsx:179-201` |

**Description:** The new Message component doesn't use the Response component which may provide markdown rendering and other text processing.

**Impact:** Markdown rendering, code highlighting, and other text processing from the Response component are missing. Messages display as plain text without formatting.

**Suggested Fix:** Import and use Response component from elements/response or implement equivalent markdown rendering.

---

### P3-BRK-022: MessageReasoning Missing Collapsible Component Integration

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-022 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message-reasoning.tsx:48-57` |
| **NEW Path** | `features/chat/components/message-reasoning.tsx:164-183` |

**Description:** The new MessageReasoning uses a custom implementation instead of the Reasoning component from elements.

**Impact:** The reasoning UI may look different from other collapsible elements in the app. The Reasoning component from elements may have additional features.

**Suggested Fix:** Import and use Reasoning, ReasoningTrigger, ReasoningContent from elements/reasoning.

---

### P3-BRK-023: MessageReasoning Missing Default Open Behavior

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-023 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message-reasoning.tsx:51` |
| **NEW Path** | `features/chat/components/message-reasoning.tsx:143-152` |

**Description:** The new MessageReasoning auto-closes after streaming ends, while the old version stayed open if it had been streaming.

**Impact:** Users who want to read the reasoning after it completes need to manually re-open it.

**Suggested Fix:** Remove the auto-close behavior or make it configurable. Keep the reasoning open after streaming ends like the old app.

---

### P3-BRK-024: Missing Diff Mode Implementation

| Field | Value |
|-------|-------|
| **Issue ID** | P3-BRK-024 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/text/client.tsx:94-99` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx` |

**Description:** The new artifact panel has mode state ("edit" | "diff") but the diff mode is not properly implemented. The old app had a DiffView component.

**Impact:** The diff mode toggle doesn't work. Users cannot compare versions of artifacts.

**Suggested Fix:** Implement diff view in the artifact renderers or add a DiffView component.

---

## Functional Discrepancies

### P3-FNC-001: Chat Component Missing Multiple Features

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-001 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/chat.tsx:78-100` |
| **NEW Path** | `features/chat/components/chat.tsx:72-81` |

**Description:** The new Chat component is significantly simplified compared to the old one, missing several features: visibility toggle, artifact integration, settings integration, optimistic chat updates, and model persistence.

**Impact:** Chat visibility cannot be changed, artifacts won't work, model selection isn't persisted, and new chats won't appear optimistically in sidebar.

**Suggested Fix:** Complete the Chat component implementation with the missing hooks and features.

---

### P3-FNC-002: Artifact Panel Props Significantly Reduced

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-002 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact.tsx:59-93` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx:39-42` |

**Description:** The old Artifact component accepted 17 props for full functionality. The new ArtifactPanel only accepts 2 props (chatId, isReadonly), both of which are unused.

**Impact:** The artifact panel is disconnected from the chat context. It cannot send messages, handle attachments, or integrate with the chat system.

**Suggested Fix:** Either pass necessary props from the parent component or use context/hooks to access chat state.

---

### P3-FNC-003: Missing onStreamPart Handler

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-003 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/create-artifact.tsx:64-68, 78-82` |
| **NEW Path** | `features/artifact/types.ts` |

**Description:** The old Artifact class had an onStreamPart handler for processing streaming data specific to each artifact type. The new types don't include this.

**Impact:** Artifacts cannot handle streaming data specific to their type. The text artifact won't show suggestions during streaming.

**Suggested Fix:** Add onStreamPart to the ArtifactDefinition interface and implement it in artifact handlers.

---

### P3-FNC-004: Missing Artifact Initialization

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-004 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/artifact.tsx:310-320` |
| **NEW Path** | `features/artifact/components/artifact-panel.tsx` |

**Description:** The old artifact panel called artifactDefinition.initialize() when a document was loaded. The new panel doesn't have this.

**Impact:** Artifact-type-specific initialization doesn't happen. Text artifacts won't load their suggestions from the database.

**Suggested Fix:** Add initialization logic to the artifact panel, calling the artifact definition's initialize method if provided.

---

### P3-FNC-005: Different Metadata Management Approach

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-005 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/hooks/use-artifact.ts:103-124` |
| **NEW Path** | `features/artifact/hooks/use-artifact.ts:90` |

**Description:** The old app used SWR for metadata persistence with documentId-based keys. The new app uses simple useState.

**Impact:** Metadata is not persisted or cached per document. If the user switches between artifacts, metadata is lost.

**Suggested Fix:** Consider using SWR for metadata caching, or document this as an intentional simplification.

---

### P3-FNC-006: Chat Component Missing Greeting Import

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-006 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/messages.tsx:11` |
| **NEW Path** | `features/chat/components/messages.tsx:339-355` |

**Description:** The new Messages component has an inline Greeting component instead of importing the dedicated one.

**Impact:** The Greeting component exists separately but isn't used. This leads to code duplication.

**Suggested Fix:** Import and use the Greeting component from ./greeting instead of the inline implementation.

---

### P3-FNC-007: Message Component Missing MessageContent Component

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-007 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:140-157` |
| **NEW Path** | `features/chat/components/message.tsx:179-201` |

**Description:** The new Message component doesn't use the MessageContent component from elements for consistent message styling.

**Impact:** Minor styling inconsistency. MessageContent may provide additional features like consistent padding, border radius, or theme support.

**Suggested Fix:** Import and use MessageContent component from elements/message for consistency.

---

### P3-FNC-008: Message Component Missing SparklesIcon Import

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-008 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message.tsx:19` |
| **NEW Path** | `features/chat/components/message.tsx:370-387` |

**Description:** The new Message component has an inline SparklesIcon instead of importing from the icons file.

**Impact:** Code duplication. The same icon is defined in multiple places.

**Suggested Fix:** Import SparklesIcon from @/components/icons or a shared icons location.

---

### P3-FNC-009: MessageActions Missing Icon Imports

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-009 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message-actions.tsx:8` |
| **NEW Path** | `features/chat/components/message-actions.tsx:64-151` |

**Description:** The new MessageActions has inline SVG icons instead of importing from the icons file.

**Impact:** Code duplication and potential inconsistency. Icons are defined inline instead of using the centralized icons file.

**Suggested Fix:** Import icons from @/components/icons for consistency.

---

### P3-FNC-010: MessageReasoning Missing Icon Import

| Field | Value |
|-------|-------|
| **Issue ID** | P3-FNC-010 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/components/message-reasoning.tsx:5-8` |
| **NEW Path** | `features/chat/components/message-reasoning.tsx:34-78` |

**Description:** The new MessageReasoning has inline SVG icons instead of importing from a shared location.

**Impact:** Code duplication. Icons should be centralized for consistency.

**Suggested Fix:** Use icons from a shared location or use the Reasoning component from elements.

---

## Improvement Only

### P3-IMP-001: SidebarItem Improved Memoization

| Field | Value |
|-------|-------|
| **Issue ID** | P3-IMP-001 |
| **Location** | `features/sidebar/components/sidebar-item.tsx` |

**Description:** SidebarItem improved memoization with chat.visibility and chat.id added to memo comparison.

**Status:** Enhancement - No action required.

---

### P3-IMP-002: SidebarToggle Uses Lucide-React

| Field | Value |
|-------|-------|
| **Issue ID** | P3-IMP-002 |
| **Location** | `features/sidebar/components/sidebar-toggle.tsx` |

**Description:** SidebarToggle uses PanelLeft from lucide-react instead of custom icon.

**Status:** Enhancement - No action required.

---

### P3-IMP-003: AppSidebar Uses Server Actions

| Field | Value |
|-------|-------|
| **Issue ID** | P3-IMP-003 |
| **Location** | `features/sidebar/components/sidebar.tsx` |

**Description:** AppSidebar uses deleteAllChats server action instead of direct fetch calls.

**Status:** Enhancement - No action required.

---

### P3-IMP-004: Artifact Close Button Optional onClose

| Field | Value |
|-------|-------|
| **Issue ID** | P3-IMP-004 |
| **Location** | `features/artifact/components/artifact-close.tsx` |

**Description:** Artifact close button enhanced with optional onClose prop.

**Status:** Enhancement - No action required.

---

### P3-IMP-005: Artifact Error Boundary TypeScript

| Field | Value |
|-------|-------|
| **Issue ID** | P3-IMP-005 |
| **Location** | `features/artifact/components/artifact-error-boundary.tsx` |

**Description:** Artifact error boundary uses proper override keyword.

**Status:** Enhancement - No action required.

---

## Issue Counts

| Category | Count |
|----------|-------|
| UI Inconsistencies | 5 |
| Bugs | 15 |
| Broken Code | 24 |
| Functional Discrepancies | 10 |
| Improvement Only | 5 |
| **Total** | **59** |

### By Severity

| Severity | Count |
|----------|-------|
| Critical | 9 |
| High | 11 |
| Medium | 25 |
| Low | 9 |