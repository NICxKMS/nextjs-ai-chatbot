# Code Simplification Execution Plan — ai-assistant v6.0

**Memory Strategy:** Dynamic-MD
**Last Modification:** Updated with pre-implementation audit fixes.
**Project Overview:** Implement 35 code simplification tasks across the ai-assistant v6.0 codebase to reduce duplication (~850 LOC savings), fix architecture violations, and reduce complexity. Organized by feature domains with infrastructure-first execution.

**Source Analysis:** `Simplifier/` directory containing scout reports, data flows, process flows, duplication reports, and architecture analysis.

---

## Pre-Implementation Verification

Before beginning any phase, verify:
1. All dependent files exist at specified paths
2. Type definitions match plan assumptions
3. No naming conflicts exist
4. Architecture layer boundaries are respected

Run validation commands:
- `pnpm typecheck` — zero errors
- `pnpm lint` — zero errors

---

## Global Quality Standards

**Mandatory Pre-Implementation Protocol (EVERY TASK):**
Before implementing any changes, the Implementation Agent MUST:
1. **Search First**: Search the codebase for existing implementations that may conflict
2. **Read Context**: Read the target file and its imports/consumers
3. **Verify Scope**: Confirm the change doesn't affect unintended consumers
4. **Follow Patterns**: Match existing code style, naming, export patterns

**Validation Requirements:**
- `pnpm typecheck` — zero errors before task completion
- `pnpm format` then `pnpm lint` — zero errors before task completion

**Code Reuse Mandate:**
- Use existing functions/types before creating new ones
- Follow existing patterns in surrounding code
- Extend rather than duplicate

---

## Phase 1: Core Infrastructure

*Goal: Consolidate types, fix layer violations, establish shared utilities*
*Tasks: 12 | Estimated Effort: ~12h*
*Priority: FOUNDATION — must complete before all feature phases*

### Task 1.1 – Consolidate PaginationParams/PaginatedResult – Agent_Infrastructure
**Objective:** Establish single source of truth for pagination types.
**Output:** Updated lib/data/types.ts with repository imports
**Guidance:** Remove duplicate type definitions from repository, ensure complete in types.ts.

**Field Differences Resolution:**
- `lib/data/types.ts` PaginationParams currently has: `limit`, `offset`
- `lib/data/repositories/chat.repository.ts` PaginationParams has: `limit`, `offset`, `searchQuery`, `fromDate`, `toDate`
- Must extend base PaginationParams with chat-specific fields

**Implementation Steps:**
1. Extend `PaginationParams` in `lib/data/types.ts` with optional fields: `searchQuery?: string`, `fromDate?: Date`, `toDate?: Date`
2. Create `ChatPaginationParams extends PaginationParams` interface in `lib/data/types.ts` (can add additional chat-specific fields if needed)
3. Remove duplicate `PaginationParams` interface from `lib/data/repositories/chat.repository.ts`
4. Remove duplicate `PaginatedResult` interface from `lib/data/repositories/chat.repository.ts`
5. Update imports in repository file to use types from `lib/data/types.ts`
6. Update imports in all consumers
7. Run `pnpm typecheck` to verify

### Task 1.2 – Consolidate RepositoryContext Type – Agent_Infrastructure
**Objective:** Remove duplicate RepositoryContext definition.
**Output:** Single definition in lib/data/types.ts
**Guidance:** Simple import consolidation.

- Remove `RepositoryContext` interface from `lib/data/repositories/base.repository.ts`
- Add import: `import type { RepositoryContext } from '../types'`
- Run `pnpm typecheck`

### Task 1.3 – Consolidate ChatWithMessages Type – Agent_Infrastructure
**Objective:** Single source for ChatWithMessages type.
**Output:** lib/data/types.ts updated
**Guidance:** Used by both repository and service layers.

- Add `ChatWithMessages` to `lib/data/types.ts`
- Remove from chat.repository.ts
- Remove from chat.service.ts
- Update imports in both files
- Run `pnpm typecheck`

### Task 1.4 – Consolidate Validation Functions – Agent_Infrastructure
**Objective:** Establish clear separation between client-side and API validation.
**Output:** Two distinct validation modules with documented use cases
**Guidance:** Different implementations serve different purposes.

**Use Case Documentation:**
- `lib/utils/validation.ts` — Client-side/utility validation (regex-based, no Zod dependency, lightweight for browser)
- `lib/api/validation.ts` — API request validation (Zod-based, schema validation for server-side)

**Implementation Steps:**
1. Verify `lib/utils/validation.ts` implementations are correct for client-side use
2. Verify `lib/api/validation.ts` implementations are correct for API validation
3. Remove `UUID_REGEX` constant from `lib/constants.ts` (duplicate of regex in validation.ts)
4. Add re-export from `lib/api/index.ts` for backward compatibility if needed
5. Document use cases in code comments
6. Run `pnpm typecheck && pnpm lint`

### Task 1.5 – Create Shared Types Module – Agent_Infrastructure
**Objective:** Create lib/types/shared.ts for cross-layer types that have NO feature-level home.
**Output:** New file lib/types/shared.ts
**Guidance:** Resolves layer violations where lib imports from features.

**IMPORTANT - Scope Limitation:**
- `ArtifactKind` stays canonical in `features/artifact/types.ts` (addressed in Task 4.1a)
- `VisibilityType` goes to `features/chat/types.ts` (addressed in Task 2.3)
- `lib/types/shared.ts` should NOT contain types that have a natural feature-level home

**Implementation Steps:**
1. Create `lib/types/shared.ts` with types that have NO feature-level home: `AppUsage`, `Attachment`, `ChatMessage`
2. Do NOT add `ArtifactKind` or `VisibilityType` to shared.ts (they have feature-level homes)
3. Update lib/cache/types.ts to import from shared.ts for applicable types
4. Run `pnpm typecheck`

### Task 1.6 – Fix Editor Extension Layer Violation – Agent_Infrastructure
**Objective:** Remove lib → features import in editor extension.
**Output:** Updated lib/editor/suggestions-extension.tsx
**Guidance:** Depends on Task 1.5 output.

**Import Strategy:**
- For `ArtifactKind`: Import from `features/artifact/types.ts` (canonical location per Task 4.1a)
- For `StreamingSuggestion`: Either move type to shared.ts or relocate file
- For types with no feature home: Import from `lib/types/shared.ts`

**Implementation Steps:**
1. Update imports to use `features/artifact/types.ts` for ArtifactKind
2. For StreamingSuggestion, either move type to shared.ts or relocate file
3. Run `pnpm typecheck`

**Depends on: Task 1.5, Task 4.1a**

### Task 1.7 – Fix Cache Types Layer Violation – Agent_Infrastructure
**Objective:** Remove lib/cache re-exports from features.
**Output:** Updated lib/cache/types.ts
**Guidance:** Depends on Task 1.5 output.

**Import Strategy:**
- For `VisibilityType`: Import from `features/chat/types.ts` (canonical location per Task 2.3)
- For `ArtifactKind`: Import from `features/artifact/types.ts` (canonical location per Task 4.1a)
- For types with no feature home: Import from `lib/types/shared.ts`

**Implementation Steps:**
1. Remove re-exports from features in lib/cache/types.ts
2. Import from feature-level canonical locations for feature-specific types
3. Import from lib/types/shared.ts for shared types
4. Update any affected consumers
5. Run `pnpm typecheck`

**Depends on: Task 1.5, Task 2.3, Task 4.1a**

### Task 1.8a – Create Tool Registry Module – Agent_Infrastructure
**Objective:** Create tool registry infrastructure for decoupling lib/ai from features.
**Output:** New lib/ai/tools/registry.ts
**Guidance:** Architecture refactoring - foundation for dependency inversion.

- Create `lib/ai/tools/registry.ts` with ToolRegistry class
- Add `registerTool(name, factory)` function
- Add `getToolRegistry()` function returning singleton
- Export registry interface
- Run `pnpm typecheck`

### Task 1.8b – Integrate Tool Registry into Chat Completion – Agent_Infrastructure
**Objective:** Wire registry into chat completion to remove features import.
**Output:** Updated lib/ai/chat-completion.ts, features/chat/lib/tools/index.ts
**Guidance:** Depends on Task 1.8a. Completes the registry pattern.

1. Update `lib/ai/chat-completion.ts` to use `getToolRegistry().getTools()` instead of direct import
2. Add tool registration in features/chat/lib/tools/index.ts
3. Ensure tools register on module load
4. Run `pnpm typecheck`
5. Verify chat streaming still works

**Depends on: Task 1.8a**

### Task 1.9 – Move getMessageByErrorCode to messages.ts – Agent_Infrastructure
**Objective:** Single implementation of error message function in the correct location.
**Output:** lib/errors/messages.ts updated, lib/errors.ts with re-export
**Guidance:** Function currently exists ONLY in lib/errors.ts, should be in messages.ts.

**Current State:**
- `getMessageByErrorCode` function exists ONLY in `lib/errors.ts`
- It does NOT exist in `lib/errors/messages.ts` yet

**Implementation Steps:**
1. Move `getMessageByErrorCode` function from `lib/errors.ts` to `lib/errors/messages.ts`
2. Add re-export from `lib/errors.ts`: `export { getMessageByErrorCode } from './errors/messages'`
3. Update any internal imports within lib/errors.ts if needed
4. Run `pnpm typecheck` to verify backward compatibility

### Task 1.10 – Consolidate ErrorUserType – Agent_Infrastructure
**Objective:** Single definition for ErrorUserType.
**Output:** Updated lib/errors/messages.ts
**Guidance:** Keep in errors.ts, import in messages.ts.

- Remove `ErrorUserType` from lib/errors/messages.ts
- Add import in messages.ts
- Run `pnpm typecheck`

### Task 1.11 – Remove Inline generateUUID Implementations – Agent_Infrastructure
**Objective:** Use shared generateUUID instead of inline redefinitions.
**Output:** Updated app/api/chat/route.ts, features/chat/components/chat.tsx
**Guidance:** Two files redefine generateUUID instead of importing.

- Remove inline generateUUID from app/api/chat/route.ts
- Add import: `import { generateUUID } from '@/lib/utils/uuid'`
- Remove inline from features/chat/components/chat.tsx
- Add import
- Run `pnpm typecheck`

---

## Phase 2: Settings Feature

*Goal: Resolve settings naming conflicts and remove dead code*
*Tasks: 4 | Estimated Effort: ~4h*
*Priority: HIGH — runtime confusion risk*
*Depends on: Phase 1 (Core Infrastructure)*

### Task 2.1 – Rename useSettings Hook – Agent_Settings
**Objective:** Resolve naming conflict between two different useSettings implementations.
**Output:** Renamed hook in features/settings/hooks/use-settings.ts
**Guidance:** CRITICAL - Runtime confusion risk. Rename standalone version to useUserPreferences.

**Explicit Naming Instruction:**
Rename the hook in `features/settings/hooks/use-settings.ts` from `useSettings` to `useUserPreferences` to resolve naming conflict with context-based `useSettings` in `features/settings/components/settings-provider.tsx`.

**Implementation Steps:**
1. Rename `useSettings` to `useUserPreferences` in features/settings/hooks/use-settings.ts
2. Search for all imports of this hook from the hooks path
3. Update imports to use new name
4. Update barrel export in features/settings/index.ts
5. Run `pnpm typecheck`

### Task 2.2 – Remove SettingsButton Placeholder – Agent_Settings
**Objective:** Remove placeholder component masking real implementation.
**Output:** Deleted components/settings/ directory
**Guidance:** Users seeing "coming soon" instead of actual settings.

- Delete `components/settings/settings-sheet.tsx` (placeholder)
- Delete `components/settings/index.ts`
- Update import in features/chat/components/chat-header.tsx to use features/settings/components/settings-sheet
- Run `pnpm typecheck`

### Task 2.3 – Consolidate VisibilityType – Agent_Settings
**Objective:** Single source for VisibilityType.
**Output:** features/chat/types.ts updated
**Guidance:** Currently NOT in features/chat/types.ts - must be added first.

**Implementation Steps:**
1. Add `VisibilityType` definition to `features/chat/types.ts` (move from action file)
2. Remove duplicate from `features/chat/actions/update-visibility.action.ts`
3. Remove duplicate from `features/chat/components/chat.tsx`
4. Remove duplicate from `features/chat/components/visibility-selector.tsx`
5. Update `lib/cache/types.ts` to import from `features/chat/types.ts`
6. Run `pnpm typecheck`

### Task 2.4 – Consolidate DEFAULT_APP_SETTINGS Exports – Agent_Settings
**Objective:** Simplify export chain for default settings.
**Output:** Single export path
**Guidance:** Redundant re-exports create confusion.

**Corrected File Path:**
The settings provider is located at `features/settings/components/settings-provider.tsx` (NOT `features/settings/settings-provider.tsx`).

**Implementation Steps:**
- Verify features/settings/types.ts has canonical definition
- Remove re-exports from `features/settings/components/settings-provider.tsx`
- Remove re-exports from hooks/use-settings.ts
- Keep single export through features/settings/index.ts
- Run `pnpm typecheck`

---

## Phase 3: Chat/API Feature

*Goal: Reduce API route complexity and fix message handling*
*Tasks: 6 | Estimated Effort: ~15h*
*Priority: HIGH — non-functional streaming without fixes*
*Depends on: Phase 1 (Core Infrastructure)*

### Task 3.1 – Extract MessageContextBuilder – Agent_ChatAPI
**Objective:** Reduce chat route complexity by extracting context preparation logic.
**Output:** New helper module for message context building
**Guidance:** app/api/chat/route.ts has complexity 18. Extract helpers to reduce.

1. Identify context preparation logic in POST handler
2. Create `lib/chat/message-context.ts` with `buildMessageContext()` function
3. Move context building logic: session, rate limits, model selection
4. Update POST handler to use helper
5. Run `pnpm typecheck`
6. Verify chat streaming works

### Task 3.2 – Verify Title Generation Module – Agent_ChatAPI
**Objective:** Verify existing title generation implementation meets requirements.
**Output:** Verified lib/ai/title-generation.ts implementation
**Guidance:** Title generation is already extracted.

**Implementation Steps:**
1. Verify existing `lib/ai/title-generation.ts` implementation meets requirements
2. If enhancement needed, add specific improvements
3. Remove reference to non-existent `lib/chat/title-generator.ts` (does not exist)
4. Run `pnpm typecheck`

### Task 3.3 – Fix Unsafe Type Casting in Message Transformation – Agent_ChatAPI
**Objective:** Add proper validation for message parts.
**Output:** Type-safe convertToUIMessages function
**Guidance:** CRITICAL - Current implementation casts `parts` without validation.

1. Create type guard `isValidMessagePart(part: unknown): part is MessagePart`
2. Update `convertToUIMessages` to validate parts array
3. Add error handling for invalid parts
4. Log warnings for skipped invalid parts
5. Run `pnpm typecheck`
6. Verify messages render correctly

### Task 3.4 – Add Zod Validation for Message Parts – Agent_ChatAPI
**Objective:** Create Zod schemas for message part validation.
**Output:** lib/schemas/message-parts.ts
**Guidance:** Runtime validation for structured message content.

1. Create `lib/schemas/message-parts.ts`
2. Define schemas: TextPartSchema, FilePartSchema, ToolCallPartSchema
3. Create MessagePartSchema union
4. Export validation functions
5. Use in message transformation
6. Run `pnpm typecheck`

### Task 3.5 – Clarify UserVote vs MessageVote Types – Agent_ChatAPI
**Objective:** Document and maintain two DIFFERENT types serving different purposes.
**Output:** Updated features/chat/types.ts with documentation
**Guidance:** These are NOT duplicate types - they serve different layers.

**Type Structure Analysis:**
- `UserVote` (in `features/chat/types.ts`): Database record structure
  - `{ userId?: string; chatId: string; messageId: string; isUpvoted: boolean }`
  - Represents the persisted vote state from database
- `MessageVote` (in components): UI state structure
  - `{ isUpvoted?: boolean; isDownvoted?: boolean }`
  - Represents the current UI display state

**Implementation Steps:**
1. Keep BOTH types in their respective locations
2. Add documentation comment in `features/chat/types.ts` explaining the distinction:
   ```typescript
   /**
    * UserVote - Database record for a user's vote on a message.
    * Used for persistence and API communication.
    * Note: This is different from MessageVote (UI state) used in components.
    */
   export interface UserVote { ... }
   ```
3. Optionally create a utility function to convert between them:
   ```typescript
   export function toMessageVote(userVote: UserVote | null): MessageVote {
     if (!userVote) return {};
     return {
       isUpvoted: userVote.isUpvoted,
       isDownvoted: !userVote.isUpvoted
     };
   }
   ```
4. Run `pnpm typecheck`

### Task 3.6 – Remove Duplicate useScrollToBottom – Agent_ChatAPI
**Objective:** Consolidate duplicate hook implementations.
**Output:** Single hook in hooks/use-scroll-to-bottom.tsx
**Guidance:** 100% identical implementations in two locations.

- Keep `hooks/use-scroll-to-bottom.tsx`
- Delete `features/chat/hooks/use-scroll-to-bottom.ts`
- Update imports in features/chat
- Re-export from features/chat/hooks/index.ts for compatibility
- Run `pnpm typecheck`

---

## Phase 4: Artifact Feature

*Goal: Consolidate artifact types and reduce panel complexity*
*Tasks: 7 | Estimated Effort: ~18h*
*Priority: MEDIUM — feature works but code quality issues*
*Depends on: Phase 1 (Core Infrastructure)*

### Task 4.1a – Consolidate ArtifactKind in Feature Layer – Agent_Artifact
**Objective:** Establish single source in features/artifact/types.ts, update feature consumers.
**Output:** Updated features/chat/types.ts, features/chat/components/toolbar.tsx
**Guidance:** Feature layer consolidation - first step.

**Canonical Location:**
- `features/artifact/types.ts` is the canonical location for `ArtifactKind`
- This is the feature-level home; do NOT move to lib/types/shared.ts

**Implementation Steps:**
- Verify `ArtifactKind` in `features/artifact/types.ts` is canonical
- Update `features/chat/types.ts` to import from artifact types
- Update `features/chat/components/toolbar.tsx` inline definition
- Run `pnpm typecheck`

**Depends on: Task 1.5**

### Task 4.1b – Consolidate ArtifactKind in Lib Layer – Agent_Infrastructure
**Objective:** Update lib layer to use shared types.
**Output:** Updated lib/ai/prompts.ts, lib/cache/types.ts, lib/editor/suggestions-extension.tsx
**Guidance:** Depends on Task 4.1a. Cross-layer coordination.

- Update `lib/ai/prompts.ts` ArtifactKindForPrompt
- Update `lib/cache/types.ts` re-exports
- Update `lib/editor/suggestions-extension.tsx` imports
- Run `pnpm typecheck`

**Depends on: Task 4.1a Output**

### Task 4.2 – Analyze and Plan artifact-panel.tsx Decomposition – Agent_Artifact
**Objective:** Analyze responsibilities and create decomposition plan.
**Output:** Decomposition plan with identified components and hooks
**Guidance:** 900 LOC, 6 useState hooks. Plan before implementation.

**Accurate useState Count:**
6 useState hooks managing: mode, currentDocument, currentVersionIndex, isVersionHistoryOpen, historyVersionIndex, isContentDirty

**Implementation Steps:**
1. Analyze current responsibilities: layout, versioning, saving, rendering
2. Identify extraction candidates with clear boundaries
3. Document each extraction: ArtifactLayout, useArtifactVersion, ArtifactRenderer
4. Define interfaces between extractions
5. Create implementation order
- Run `pnpm typecheck` (no changes yet)

### Task 4.3 – Create ArtifactLayout Component – Agent_Artifact
**Objective:** Extract responsive layout logic into separate component.
**Output:** New features/artifact/components/artifact-layout.tsx
**Guidance:** Depends on Task 4.2 plan. Single responsibility: layout.

- Create `features/artifact/components/artifact-layout.tsx`
- Move responsive layout logic (chatPanelWidth calculation)
- Move useWindowSize and useSidebar hooks integration
- Export for use in panel
- Run `pnpm typecheck`

**Depends on: Task 4.2**

### Task 4.4 – Create useArtifactVersion Hook – Agent_Artifact
**Objective:** Extract version management state and logic.
**Output:** New features/artifact/hooks/use-artifact-version.ts
**Guidance:** Depends on Task 4.2 plan. Single responsibility: version state.

- Create `features/artifact/hooks/use-artifact-version.ts`
- Extract version state (currentVersion, isComparing, versions array)
- Extract version actions (rollback, compare, etc.)
- Export hook with typed interface
- Run `pnpm typecheck`

**Depends on: Task 4.2**

### Task 4.5 – Integrate Decomposed Components into Artifact Panel – Agent_Artifact
**Objective:** Update artifact-panel.tsx to use extracted components/hooks.
**Output:** Updated features/artifact/components/artifact-panel.tsx
**Guidance:** Depends on Tasks 4.3 and 4.4. Final integration.

1. Import ArtifactLayout component
2. Import useArtifactVersion hook
3. Replace inline logic with extracted components
4. Verify complexity reduced to <10
5. Run `pnpm typecheck`
6. Verify artifact panel renders correctly

**Depends on: Task 4.3, Task 4.4**

### Task 4.6 – Consolidate ArtifactMessages Component – Agent_Artifact
**Objective:** Verify ArtifactMessages integration.
**Output:** Updated imports and integration
**Guidance:** Component may have broken references.

- Verify ArtifactMessages renders correctly
- Fix any broken imports
- Update message rendering to use shared types
- Run `pnpm typecheck`

### Task 4.7 – Verify ArtifactHandler Model Resolution – Agent_Artifact
**Objective:** Verify artifact-model is correctly resolved via registry.
**Output:** Verified handler files
**Guidance:** artifact-model is already handled by registry.

**Implementation Steps:**
1. Verify the existing implementation works correctly in production
2. Check that `getModel("artifact-model")` resolves correctly
3. Verify handlers in `features/artifact/handlers/` use registry correctly
4. If verification shows complete implementation, remove this task from scope
5. Run `pnpm typecheck`

---

## Phase 5: UI/Components

*Goal: Remove component duplications and dead code*
*Tasks: 6 | Estimated Effort: ~10h*
*Priority: LOW — cosmetic and maintainability improvements*
*Depends on: All previous phases*

### Task 5.1 – Remove SidebarToggle Duplication – Agent_UIComponents
**Objective:** Consolidate two nearly identical implementations.
**Output:** Single SidebarToggle component
**Guidance:** 95% similar, different icons.

**Explicit Icon Choice:**
Keep `features/sidebar/components/sidebar-toggle.tsx` (uses PanelLeft icon). Remove `components/sidebar-toggle.tsx`. Update imports in consumers.

**Implementation Steps:**
1. Verify `features/sidebar/components/sidebar-toggle.tsx` uses PanelLeft icon
2. Delete `components/sidebar-toggle.tsx`
3. Update all imports to use `features/sidebar/components/sidebar-toggle.tsx`
4. Run `pnpm typecheck`

### Task 5.2 – Remove Pass-Through AI Wrappers – Agent_UIComponents
**Objective:** Remove unnecessary wrapper components.
**Output:** Reduced components/ai/ directory
**Guidance:** 40% of ai/ wrappers add no logic, just rename with AI prefix.

1. Identify pass-through files in `components/ai/workflow/` and `components/ai/utilities/`
2. Update imports to use ai-elements directly
3. Delete wrapper files
4. Run `pnpm typecheck`
5. Verify no visual regressions

### Task 5.3 – Consolidate ErrorBoundaryProps Type – Agent_UIComponents
**Objective:** Create shared type for error boundary props.
**Output:** lib/types/shared.ts updated
**Guidance:** Three files define nearly identical error props.

- Add ErrorBoundaryProps to lib/types/shared.ts
- Update app/(chat)/chat/[id]/error.tsx
- Update app/error.tsx
- Update app/global-error.tsx
- Run `pnpm typecheck`

### Task 5.4 – Fix InputGroupButton Styling Duplication – Agent_UIComponents
**Objective:** Use buttonVariants instead of manual styling.
**Output:** Updated components/ui/input-group.tsx
**Guidance:** InputGroupButton duplicates button styles.

- Import `buttonVariants` from `components/ui/button`
- Update InputGroupButton to use variants
- Remove manual style definitions
- Run `pnpm typecheck`

### Task 5.5 – Evaluate sidebar.tsx for Splitting – Agent_UIComponents
**Objective:** Analyze sidebar.tsx and decide whether to split 828 LOC file.
**Output:** Decision document with analysis OR split files
**Guidance:** Largest UI component file (26 components). Evaluate tradeoffs.

1. Analyze sidebar.tsx exports (26 components)
2. Identify natural split boundaries
3. Evaluate benefits vs complexity of splitting
4. If split warranted: create sidebar-context.tsx, sidebar-provider.tsx, sidebar-menu.tsx
5. If not: document decision rationale in code comments
6. Run `pnpm typecheck`

### Task 5.6 – Remove Unused Archive Components – Agent_UIComponents
**Objective:** Clean up dead code only used in archive.
**Output:** Removed components
**Guidance:** auth-form.tsx and toast.tsx only imported from archive/.

- Verify components/auth-form.tsx has no active consumers
- Verify components/toast.tsx has no active consumers
- If confirmed dead: delete both files
- Run `pnpm typecheck`

---

## Summary

| Phase | Domain | Tasks | Effort | Priority |
|-------|--------|-------|--------|----------|
| 1 | Core Infrastructure | 12 | ~12h | FOUNDATION |
| 2 | Settings | 4 | ~4h | HIGH |
| 3 | Chat/API | 6 | ~15h | HIGH |
| 4 | Artifact | 7 | ~18h | MEDIUM |
| 5 | UI/Components | 6 | ~10h | LOW |
| **Total** | | **35** | **~59h** | |

---

## Agent Assignments

| Agent | Domain | Phase | Tasks |
|-------|--------|-------|-------|
| Agent_Infrastructure | Core Infrastructure | 1 | 12 |
| Agent_Settings | Settings Feature | 2 | 4 |
| Agent_ChatAPI | Chat/API Feature | 3 | 6 |
| Agent_Artifact | Artifact Feature | 4 | 7 |
| Agent_UIComponents | UI/Components | 5 | 6 |

---

## Dependencies

**Phase Dependencies:**
- Phase 2-5 depend on Phase 1 (shared types established)
- Phases 2, 3, 4 can run in parallel after Phase 1
- Phase 5 should run last (cleanup)

**Task Dependencies:**
- Task 1.6 depends on Task 1.5, Task 4.1a
- Task 1.7 depends on Task 1.5, Task 2.3, Task 4.1a
- Task 1.8b depends on Task 1.8a
- Task 4.1a depends on Task 1.5
- Task 4.1b depends on Task 4.1a
- Task 4.3 depends on Task 4.2
- Task 4.4 depends on Task 4.2
- Task 4.5 depends on Task 4.3 and Task 4.4

---

## Success Criteria

- All `pnpm typecheck` commands pass
- All `pnpm lint` commands pass
- No runtime regressions in chat, artifact, or settings features
- Estimated LOC reduction: ~850 lines
- Complexity reduction: 7 files below threshold of 10
