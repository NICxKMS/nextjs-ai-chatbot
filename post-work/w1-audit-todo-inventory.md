# W1 — TODO & Deferred Code Inventory

> **Generated:** 2026-03-07  
> **Scope:** `app/`, `features/`, `lib/`, `components/` (excluding `ai-elements/`, `ui/`, `node_modules/`, `.next/`, `oldapp/`, `plan/`)  
> **Patterns searched:** TODO, FIXME, HACK, DEFERRED, @later, @unused, NotImplemented, biome-ignore/eslint-disable, placeholder/workaround/temporary, empty returns, no-op patterns, reserved-for-future, console.log/debug, throw stubs

---

## Summary

| Classification | Count |
|----------------|-------|
| **[READY]**    | 4     |
| **[BLOCKED]**  | 2     |
| **[OBSOLETE]** | 3     |
| **[INTENTIONAL]** | 17 |
| **Total**      | **26** |

### Priority-Sorted [READY] Items

| # | File | Item | Action |
|---|------|------|--------|
| 1 | `components/weather.tsx:153` | TODO: Remove or re-home this component | Wire `Weather` into `GenericToolResult` for `getWeather` OR delete if tool rendering pipeline is descoped |
| 2 | `lib/data/user.ts:57` | `@unused updateUserLastLogin` | Implement last-login tracking in login action, or delete if not planned |
| 3 | `lib/cache/keys.ts:25-27` | Reserved rate-limit keys (`rateLimit`, `rateLimitDaily`) | Implement global/daily rate limiting or remove unused key builders |
| 4 | `lib/data/chat.ts:89` | `@unused getChatWithMessages` | Evaluate for removal — convenience only, no current consumer |

---

## Detailed Inventory

---

### 1. TODO Comments

---

**FILE:** `lib/ai/models.ts:195`  
**TEXT:** `// TODO(ai-services): Keep dynamic OpenRouter tool-calling conservative until discovery derives trustworthy capability metadata or the runtime narrows to a curated subset of explicitly supported models.`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Model discovery flow  
**ACTION:** No action needed currently. This is a deliberate conservative default (`supportsToolCalling: false` for all dynamic OpenRouter models) until the model discovery pipeline can reliably determine tool-calling capability.  
**JUSTIFICATION:** The comment documents a conscious architectural decision. Removing the TODO would require implementing capability metadata discovery for OpenRouter models — a separate feature.

---

**FILE:** `components/weather.tsx:153`  
**TEXT:** `// TODO: Remove or re-home this component if it remains test-only; the current app tree does not appear to import it outside its unit test.`  
**CLASSIFICATION:** [READY]  
**FLOW REFERENCE:** Chat tool rendering flow  
**ACTION:** The `Weather` component exists, `getWeather` tool exists and is wired into `chat-route.ts`, but tool results render via `GenericToolResult` (JSON dump). Either: (a) wire `Weather` into the tool result renderer in `message.tsx` for `getWeather` results, or (b) delete if rich weather display is descoped. The component header comment (lines 3-6) says "planned AI tool system (P6-T12)".  
**JUSTIFICATION:** All pieces exist (tool backend, UI component) — they just need connection. No blockers.

---

### 2. @unused Functions (6 Known)

---

**FILE:** `lib/data/vote.ts:55`  
**TEXT:** `@unused FK cascade on chats.id → votes.chatId handles cleanup during chat deletion. Retained for selective vote removal.`  
**FUNCTION:** `deleteVotesByChatId(chatId, userId)`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Chat deletion flow  
**ACTION:** Retain. FK cascades handle the normal chat-delete path, but this function provides granularity for per-user vote removal without deleting the chat — a valid API surface.  
**JUSTIFICATION:** Deletion granularity. Could be needed for GDPR user data removal or admin operations.

---

**FILE:** `lib/data/message.ts:114`  
**TEXT:** `@unused FK cascade on chats.id → messages.chatId handles cleanup during chat deletion. Retained for explicit bulk-delete scenarios.`  
**FUNCTION:** `deleteMessagesByChatId(chatId)`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Chat deletion flow  
**ACTION:** Retain. Same rationale as `deleteVotesByChatId` — provides explicit message cleanup without deleting the parent chat.  
**JUSTIFICATION:** Useful for message-purge scenarios (e.g., "clear conversation" without deleting chat metadata).

---

**FILE:** `lib/data/chat.ts:89`  
**TEXT:** `@unused Chat page fetches chat and messages separately with individual cache tags. Retained as a convenience for non-cached contexts.`  
**FUNCTION:** `getChatWithMessages(chatId)`  
**CLASSIFICATION:** [READY]  
**FLOW REFERENCE:** Chat page data loading  
**ACTION:** Consider removal. The chat page deliberately fetches chat and messages as separate cached queries with individual `cacheTag`s. This co-fetch function bypasses caching and has no consumers. If no non-cached context needs it, delete to reduce dead code.  
**JUSTIFICATION:** No consumer exists. The "convenience" argument is speculative. Can be recreated trivially if needed.

---

**FILE:** `lib/data/suggestion.ts:47`  
**TEXT:** `@unused Retained for targeted suggestion cleanup without removing the parent artifact.`  
**FUNCTION:** `deleteSuggestionsByArtifactVersion(artifactId, artifactCreatedAt)`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Artifact suggestion management  
**ACTION:** Retain. Provides version-specific suggestion deletion — useful when a user rejects all suggestions for a specific artifact version.  
**JUSTIFICATION:** The artifact system has versioning; deleting suggestions per-version is a valid operation that FK cascades don't cover (cascade is on artifact delete, not version-specific).

---

**FILE:** `lib/data/user.ts:12`  
**TEXT:** `@unused Auth uses Supabase SDK for email lookup. Retained for direct DB email lookup scenarios.`  
**FUNCTION:** `getUserByEmail(email)`  
**CLASSIFICATION:** [OBSOLETE]  
**FLOW REFERENCE:** Auth flows (login, register)  
**ACTION:** Consider removal. Auth exclusively uses Supabase SDK for email-based operations. The D012 reconciliation in login (`features/auth/actions/login.ts:86`) looks up users by Supabase auth data, not by email query to our DB. No path in the current codebase queries users by email from our DB.  
**JUSTIFICATION:** "Retained for direct DB email lookup scenarios" is speculative — no such scenario exists or is planned.

---

**FILE:** `lib/data/user.ts:57`  
**TEXT:** `@unused Login flow does not yet track last login. Retained for session tracking when implemented.`  
**FUNCTION:** `updateUserLastLogin(id)`  
**CLASSIFICATION:** [READY]  
**FLOW REFERENCE:** Login flow (`features/auth/actions/login.ts`)  
**ACTION:** Either implement last-login tracking (add `await updateUserLastLogin(userId)` after successful login at ~line 104 in login.ts), or remove if not needed. The `lastLogin` column exists in the schema.  
**JUSTIFICATION:** Implementation is trivial (one line in login action). Decision needed: is last-login tracking wanted?

---

### 3. Deferred Features

---

**FILE:** `features/artifacts/components/artifact-panel.tsx:175`  
**TEXT:** `// "toggle" is a no-op — diff mode deferred to post-MVP (Wave 4: AR-8)`  
**CLASSIFICATION:** [BLOCKED]  
**FLOW REFERENCE:** Artifact version navigation  
**ACTION:** Diff mode requires a text-diff rendering library and UI design. Blocked on Wave 4 scope decision (AR-8).  
**JUSTIFICATION:** Explicit deferral with tracking reference. The "toggle" action in version navigation intentionally does nothing.

---

**FILE:** `lib/ai/provider-options.ts:9-10`  
**TEXT:** `// Per the Wave 4 decision (AI-W2-01), SettingsState has only enableReasoning: boolean, NOT reasoningBudget/reasoningEffort — those may be added later if needed.`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** AI model configuration  
**ACTION:** No action. Documents a deliberate simplification. The settings surface uses a boolean toggle; per-model budget/effort tuning is descoped by design.  
**JUSTIFICATION:** Architectural decision, not a TODO.

---

**FILE:** `features/models/lib/models.ts:57`  
**TEXT:** `The session parameter is reserved for future user-level model preferences.`  
**CLASSIFICATION:** [BLOCKED]  
**FLOW REFERENCE:** Model selection  
**ACTION:** The `getDefaultModel(_session, ...)` takes a session parameter but ignores it. When user-level model preferences are implemented (persistent model preference per user, stored in DB), this parameter will be used. Blocked on user preferences feature.  
**JUSTIFICATION:** The function signature anticipates the feature; no implementation needed until user preferences are designed.

---

**FILE:** `lib/cache/keys.ts:25`  
**TEXT:** `/** Reserved for future global per-user rate limiting. Currently test-only. */`  
**FUNCTION:** `rateLimitKeys.rateLimit(userId)`  
**CLASSIFICATION:** [READY]  
**FLOW REFERENCE:** Rate limiting  
**ACTION:** Either implement global per-user rate limiting using these keys, or remove if per-endpoint rate limiting (chat, vote, upload, login, register) is sufficient. Currently, each endpoint has its own rate-limit key — these global keys are unused.  
**JUSTIFICATION:** Per-endpoint rate limiting is already comprehensive. Global rate limiting would add cross-endpoint abuse protection — may be worth implementing.

---

**FILE:** `lib/cache/keys.ts:27`  
**TEXT:** `/** Reserved for future daily per-user rate limiting. Currently test-only. */`  
**FUNCTION:** `rateLimitKeys.rateLimitDaily(userId)`  
**CLASSIFICATION:** [READY] (same as above)  
**FLOW REFERENCE:** Rate limiting  
**ACTION:** Same as `rateLimit` key above — implement daily limits or remove.  
**JUSTIFICATION:** Grouped with the global rate-limit key.

---

### 4. biome-ignore / eslint-disable Suppressions

All suppressions in the active codebase (excluding `ai-elements/` and `ui/`) are reviewed below:

---

**FILE:** `app/api/files/upload/route.ts:31`  
**TEXT:** `// biome-ignore lint/suspicious/noControlCharactersInRegex: null byte removal is intentional for security`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** File upload security  
**ACTION:** No action. The regex `\x00` is a deliberate null byte removal for path-traversal prevention.  
**JUSTIFICATION:** Security measure. The suppression is well-documented.

---

**FILE:** `features/models/components/model-selector.tsx:87`  
**TEXT:** `// biome-ignore lint/suspicious/noDocumentCookie: Synchronous cookie write required; Cookie Store API is async and would change this function's signature`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Model selection persistence  
**ACTION:** No action. `document.cookie` is the correct choice for a synchronous, fire-and-forget cookie write in a void function.  
**JUSTIFICATION:** Cookie Store API is async and not universally supported. The rationale is sound.

---

**FILE:** `features/voting/components/vote-resolver.tsx:165`  
**TEXT:** `// biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional no-op callback`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Vote system fallback  
**ACTION:** No action. `NOOP_SUBMIT` is the safe default when `VotesProvider` is absent (e.g., new chat page before first message).  
**JUSTIFICATION:** Correct pattern for optional context consumers.

---

**FILE:** `features/artifacts/components/editors/code-editor.tsx:214`  
**TEXT:** `// biome-ignore lint/correctness/useExhaustiveDependencies: outputs needed to trigger scroll on new output`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Code editor console  
**ACTION:** No action. The effect scrolls to bottom when `outputs` changes — including it in deps would cause lint to want stabilization, but the intent is exactly "scroll on every output change."  
**JUSTIFICATION:** Standard pattern for scroll-to-latest behavior.

---

**FILE:** `features/artifacts/components/editors/code-editor.tsx:346`  
**TEXT:** `// biome-ignore lint/correctness/useExhaustiveDependencies: initialize editor once when modules load; content synced via separate effect`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Code editor initialization  
**ACTION:** No action. CodeMirror editor is created once when modules load; content updates are handled by a separate `useEffect`. Including all deps would cause re-creation.  
**JUSTIFICATION:** Standard imperative-initialization pattern for editor libraries.

---

**FILE:** `features/artifacts/components/editors/image-editor.tsx:113`  
**TEXT:** `// biome-ignore lint/performance/noImgElement: base64 data URLs are not supported by next/image`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Image artifact rendering  
**ACTION:** No action. `next/image` does not support base64 data URLs (which is how Pyodide-generated images are delivered).  
**JUSTIFICATION:** Technical limitation of next/image. Native `<img>` is the correct choice.

---

### 5. No-op / Placeholder Patterns

---

**FILE:** `features/artifacts/components/artifact-preview.tsx:62-67`  
**TEXT:** `const noopSaveContent = () => { /* read-only preview — intentional noop */ }`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Artifact preview (read-only mode)  
**ACTION:** No action. Preview editors are read-only — the `onSaveContent` callback is required by the editor interface but never invoked.  
**JUSTIFICATION:** Interface compliance for read-only context.

---

**FILE:** `features/artifacts/handlers/image-handler.ts:25`  
**TEXT:** `// No-op: image updates are not AI-driven.`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Artifact handler system  
**ACTION:** No action. Image content is produced by Pyodide code execution, not AI generation. The `update` method returns `params.currentContent` unchanged.  
**JUSTIFICATION:** The handler interface requires `create` and `update` methods. Image `update` is correctly a passthrough.

---

**FILE:** `features/voting/hooks/use-votes.ts:34`  
**TEXT:** `userId: "", // Placeholder — not used for display logic`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Optimistic vote updates  
**ACTION:** No action. The optimistic update creates a local vote object; `userId` is required by the type but isn't used for display or comparison. The server-side vote stores the real userId.  
**JUSTIFICATION:** Type compliance for optimistic UI. The empty string is never read.

---

**FILE:** `lib/auth/session.ts:29`  
**TEXT:** `setAll is a no-op in read-only contexts (Server Components).`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Session resolution  
**ACTION:** No action. Supabase SSR client requires a `setAll` callback, but Server Components can't set cookies. The comment documents the Supabase SDK contract.  
**JUSTIFICATION:** SDK requirement; documented limitation.

---

### 6. Reconciliation / Error Recovery

---

**FILE:** `features/auth/actions/register.ts:98`  
**TEXT:** `// The user can still log in — reconciliation can happen later.`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Auth → Register → D012 reconciliation  
**ACTION:** No action. The login action already handles D012 reconciliation (creates missing DB user record when Supabase user exists but DB row doesn't). The register action gracefully fails the DB insert while allowing the Supabase account to exist.  
**JUSTIFICATION:** Defensive design. Login recovery is already implemented at `features/auth/actions/login.ts:86-104`.

---

### 7. Console Logging (Non-oldapp)

---

**FILE:** `features/auth/lib/action-utils.ts:68`  
**TEXT:** `console.info("[login/register] Migrated N guest chat(s) to user X")`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Guest-to-user migration  
**ACTION:** No action. Migration events are low-frequency, high-value diagnostic logs.  
**JUSTIFICATION:** Server-side info logging for audit trail.

---

**FILE:** `lib/db/migrate.ts:22,28`  
**TEXT:** `console.info("[migrate] Running migrations...")` / `console.info("[migrate] Migrations completed in Nms")`  
**CLASSIFICATION:** [INTENTIONAL]  
**FLOW REFERENCE:** Database migration  
**ACTION:** No action. Migration is a CLI/build-time operation — console output is expected.  
**JUSTIFICATION:** Standard migration runner output.

---

### 8. Components Outside Main Tree

---

**FILE:** `components/weather.tsx:1-6`  
**TEXT:** `// NOTE: This component is part of the planned AI tool system (P6-T12 — weather tool result renderer) but is NOT yet wired into the production component tree.`  
**CLASSIFICATION:** [READY] (same as TODO item #1 above)  
**FLOW REFERENCE:** See detailed analysis under TODO #2  
**ACTION:** See TODO item analysis above.  
**JUSTIFICATION:** Duplicate reference — the file-level NOTE and inline TODO describe the same issue.

---

## Cross-References

| Item | Wave 0 Finding | Overlap |
|------|---------------|---------|
| `getChatWithMessages` @unused | T6 (dead code removal) | Candidate for deletion |
| `getUserByEmail` @unused | T6 (dead code removal) | Candidate for deletion |
| `rateLimitKeys.rateLimit/rateLimitDaily` | T4 (atomic rate limiting) | Enable global rate limiting alongside per-endpoint |
| Artifact diff mode deferred | Not in W0 findings | New — Wave 4 item |
| Weather component unwired | Not in W0 findings | New — P6-T12 tool rendering |

---

## Observations

1. **The codebase is remarkably clean.** Only 2 actual TODOs, 0 FIXMEs, 0 HACKs — well below industry norms.

2. **All biome-ignore suppressions are justified.** Each has an inline rationale that is technically sound. No lazy suppressions found.

3. **@unused functions are well-documented.** Each has a clear retention rationale. Of the 6, only 2 are candidates for removal (`getUserByEmail`, `getChatWithMessages`).

4. **Deferred features are tracked.** The artifact diff mode (AR-8) and user-level model preferences are explicitly deferred with references.

5. **No stub implementations or throw-not-implemented patterns exist.** All functions return meaningful values or handle errors properly.

6. **The Weather component is the biggest actionable gap.** The backend tool exists, the UI exists, but they're not connected. This is a one-file wiring task in `message.tsx`.
