# Global Issues Log

> All findings, irregularities, migration inconsistencies, architectural deviations, and missing dependencies MUST be logged here. See `AGENTS.md` for entry format and categories.

---

## [2026-02-17T11:36:00Z] - Task 5.9b Issues Misclassified as Artifact Component References

- **Category**: Architecture
- **Agent**: Agent_ArtifactUI
- **Task**: Task 5.9b - Fix Broken Artifact Component References
- **Context**: During knowledge acquisition phase, discovered that issues P3-BRK-017 through P3-BRK-024 are NOT artifact component reference issues
- **Root Cause**: Task assignment incorrectly grouped Message component issues (P3-BRK-017 through P3-BRK-024) with artifact component reference task
- **Action Taken**: Documented finding in Memory Log; P3-BRK-015 verified as already resolved
- **Status**: Resolved
- **Related Files**: 
  - `issues/03-shared-components/issues.md` (P3-BRK-017 through P3-BRK-024)
  - `features/chat/components/message.tsx` (actual location of issues)
  - `features/artifact/components/artifact-actions.tsx` (P3-BRK-015 already resolved)

**Details:**
- P3-BRK-015 (Missing Artifact Actions): Already resolved - `createDefaultActions()` provides default actions
- P3-BRK-017 through P3-BRK-024: Message component issues (MessageEditor, MessageActions, PreviewAttachment, sanitizeHtml, Response component, MessageReasoning, Diff Mode)
- These Message component issues belong to Phase 4 (Chat UI & Sidebar Components), not Phase 5 (Artifact System)

---

## [2026-02-17T12:27:00Z] - Message Component Issues P3-BRK-017 through P3-BRK-024 Resolved

- **Category**: Bug
- **Agent**: Implementation Agent
- **Task**: Task 4.13 - Fix Message Component Issues
- **Context**: Fixed all Message component issues that were misclassified under Task 5.9b
- **Root Cause**: Missing integrations and component implementations
- **Action Taken**: 
  - P3-BRK-017, P3-BRK-018, P3-BRK-019, P3-BRK-020: Already fixed in current codebase
  - P3-BRK-021: Added Streamdown for markdown rendering in Response component
  - P3-BRK-022: Refactored MessageReasoning to use ai-elements Reasoning component
  - P3-BRK-023: Integrated DiffView into artifact panel for diff mode
- **Status**: Resolved
- **Related Files**: 
  - `features/chat/components/message.tsx`
  - `features/chat/components/message-reasoning.tsx`
  - `features/artifact/components/artifact-panel.tsx`
  - `.apm/Memory/Phase_04_chat_ui_sidebar/Task_4_13_message_issues.md`

---

## [2026-02-18T02:40:00Z] - Task 7.6 Server Actions Already Implemented

- **Category**: Migration
- **Agent**: Agent_APIRoutes
- **Task**: Task 7.6 - Create Missing Server Actions
- **Context**: During Pre-Implementation Protocol Step 1 (Check New App First), discovered both `deleteTrailingMessages` and `updateChatVisibility` server actions already exist in the NEW codebase
- **Root Cause**: Migration was completed ahead of Implementation Plan documentation
- **Action Taken**: Verified existing implementations follow v6 patterns correctly; documented in Memory Log; no code changes needed
- **Status**: Resolved
- **Related Files**: 
  - `features/chat/actions/delete-trailing-messages.action.ts`
  - `features/chat/actions/update-visibility.action.ts`
  - `features/chat/actions/index.ts`
  - `.apm/Memory/Phase_07_api_routes_server_actions/Task_7_6_server_actions.md`

**Details:**
- Both actions use `'use server'` directive, `requireAuthAction()` guards, repository pattern, and proper revalidation
- NEW implementations are more robust than OLD (better error handling, rate limiting, structured returns)
- Recommendation: Update Implementation Plan to mark Task 7.6 as "Already Implemented"

---
