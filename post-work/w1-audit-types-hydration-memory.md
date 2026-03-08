# Wave 1 Audit — TypeScript + Hydration + Memory Leaks

**Date:** 2026-03-07  
**Scope:** `app/`, `features/`, `lib/`, `components/` (excluding `ai-elements/`, `ui/`, `node_modules/`, `.next/`, `oldapp/`)  
**Method:** Exhaustive grep + manual file inspection of every hit

---

## 1. TypeScript

### 1.1 tsconfig Strictness Verification

| Setting | Value | Assessment |
|---------|-------|------------|
| `strict` | `true` | ✅ All sub-flags enabled (strictNullChecks, strictFunctionTypes, etc.) |
| `noUncheckedIndexedAccess` | `true` | ✅ Excellent — forces `T \| undefined` on indexed access |
| `noImplicitOverride` | `true` | ✅ Catches override mistakes |
| `forceConsistentCasingInFileNames` | `true` | ✅ Cross-platform safety |
| `isolatedModules` | `true` | ✅ Required for bundler mode |
| `exactOptionalPropertyTypes` | `false` | ⚠️ Could be stricter |
| `noPropertyAccessFromIndexSignature` | not set | ⚠️ Missing — allows `obj.key` on index signatures |

**Overall:** Strong configuration. Two minor hardening opportunities.

---

### 1.2 `as` Type Casts (non-`as const`)

#### Safe `as const` literals (no action needed) — 18 occurrences

These are safe TypeScript literal narrowing and are idiomatic:
- `loading.tsx:5-9`, `sidebar-skeleton.tsx:3`, `suggested-actions.tsx:13`, `chat-route.ts:32`, `artifact-store.ts:62`, `use-artifact.ts:25`, `use-settings.ts:114,119`, `artifact-panel.tsx:47`, `lib/ai/tools.ts:12`, `validate-origin.ts:3`, `lib/ai/provider-options.ts:16`, `lib/ai/internal-models.ts:9` (`as const satisfies`), `sheet-editor.tsx:39`, `e2e-artifact-fixture.ts` (multiple)

#### Findings — Unsafe or Risky Casts

`SEVERITY: HIGH | app/api/chat/route.ts:105,127,204,227 | FINDING: Four uses of } as Parameters<typeof writer.write>[0] to force SDK writer.write() to accept custom data-part shapes. If the AI SDK writer signature changes, these casts silently mask the break. | RECOMMENDATION: Create a typed wrapper function writeDataPart(writer, part) with the union type. If the SDK exposes a data-part type, use it; otherwise file an issue upstream and document the cast.`

`SEVERITY: HIGH | features/chat/lib/message-utils.ts:16-17 | FINDING: role: msg.role as UIMessage["role"] and parts: msg.parts as UIMessage["parts"] in convertToUIMessages(). DB columns store string/jsonb — the cast trusts schema discipline without runtime validation. | RECOMMENDATION: Add a runtime guard (e.g., Zod parse) or assert that DB enum matches UIMessage["role"]. The parts cast is riskier — a DB migration could introduce a shape mismatch.`

`SEVERITY: HIGH | features/chat/lib/chat-route.ts:58,76 | FINDING: Same role/parts casts as message-utils.ts — toUserMessage() and toAssistantDbMessages() both cast without validation. | RECOMMENDATION: Centralize in one utility with a single validation point. Both chat-route.ts and message-utils.ts do the same conversion independently.`

`SEVERITY: HIGH | features/artifacts/lib/suggestions-extension.tsx:253,260 | FINDING: (dom as HTMLElement & { __destroy?: () => void }).__destroy = destroy — monkey-patches a destroy function onto a DOM node via double cast (line 260: node as unknown as { __destroy? }). | RECOMMENDATION: Use a WeakMap<Node, () => void> to associate cleanup functions with DOM nodes instead of property monkey-patching. Avoids the double cast entirely.`

`SEVERITY: MEDIUM | features/artifacts/components/editors/code-editor.tsx:72,459 | FINDING: window as unknown as { loadPyodide?: LoadPyodideFn } — double cast from window to access a dynamically loaded global. Used twice. | RECOMMENDATION: Declare a global augmentation in global.d.ts: declare global { interface Window { loadPyodide?: LoadPyodideFn } }. Eliminates both casts.`

`SEVERITY: MEDIUM | lib/ai/provider.ts:17,31,35 | FINDING: modelId as RegistryModelId (string → ${string}:${string} template literal) used 3 times. If a model ID without a colon reaches this code, the registry will throw at runtime with a confusing error. | RECOMMENDATION: Add a runtime guard: if (!modelId.includes(':')) throw new AppError(...). Or narrow the parameter type itself.`

`SEVERITY: MEDIUM | lib/db/client.ts:35 | FINDING: globalThis as unknown as { pgClient } — standard HMR singleton pattern. Necessary evil for dev, but the double cast bypasses type safety. | RECOMMENDATION: Use a typed global augmentation in global.d.ts (same file already declares global types). Eliminates the cast entirely.`

`SEVERITY: MEDIUM | lib/ai/registry.ts:39 | FINDING: Object.entries(PROVIDER_DEFINITIONS) as Array<[ProviderId, ProviderDefinition]> — known TS limitation where Object.entries() returns [string, V][]. | RECOMMENDATION: Acceptable — this is a well-known TS limitation. Document with a comment.`

`SEVERITY: MEDIUM | app/api/files/upload/route.ts:119,121 | FINDING: Three casts of (file as File).name on the same value. The file variable is typed as Blob (from FormData), but the code needs File.name. | RECOMMENDATION: Narrow once: const uploadFile = file instanceof File ? file : null; then use uploadFile.name ?? fallback.`

`SEVERITY: MEDIUM | features/artifacts/components/artifact-panel.tsx:383 | FINDING: setMetadata as Dispatch<SetStateAction<unknown>> — generic variance workaround for passing a state setter to a child component that accepts unknown metadata. | RECOMMENDATION: Type the metadata state as unknown from the start, or use a generic ArtifactPanelEditor<T>.`

`SEVERITY: MEDIUM | features/chat/hooks/use-chat-session.ts:133 | FINDING: setChatStream([{ type: sdkType.slice(5), content } as DataPart]) — constructs a DataPart from string manipulation without validating the resulting type string is a valid DataPart type. | RECOMMENDATION: Validate sdkType.slice(5) against the DataPart type union before casting. A const set of valid types already exists.`

`SEVERITY: MEDIUM | features/chat/hooks/use-chat-session.ts:141 | FINDING: JSON.parse(dataPart.data) as LanguageModelUsage — parses unknown JSON and casts directly. The catch block handles parse failures, but a valid JSON object with wrong shape passes silently. | RECOMMENDATION: Use a minimal Zod schema or type guard for LanguageModelUsage.`

`SEVERITY: LOW | features/chat/components/message.tsx:107,178 | FINDING: (p.text as string)?.trim() and const text = part.text as string — UIMessage part text should always be string when type==="text", but the cast bypasses the type narrowing. | RECOMMENDATION: Use a type guard: part.type === "text" && typeof part.text === "string".`

`SEVERITY: LOW | features/artifacts/components/artifact-preview.tsx:292,338,347 | FINDING: Three casts to as ArtifactKind from result/args. The kind field comes from the stream/DB and may not match the union. | RECOMMENDATION: Validate against the ArtifactKind union or use a fallback.`

`SEVERITY: LOW | features/artifacts/components/artifact-error-boundary.tsx:49-50 | FINDING: (this.state.error as { code: unknown }).code — double property access through cast. | RECOMMENDATION: Use a type guard function: function hasCode(err: unknown): err is { code: string }.`

`SEVERITY: LOW | features/voting/components/vote-resolver.tsx:116 | FINDING: storeRef.current as VotesStore — safe because the ref is always initialized in the if-block above. | RECOMMENDATION: Acceptable — the init check makes this safe. Could use a lazy ref pattern to eliminate.`

`SEVERITY: LOW | features/artifacts/hooks/use-artifact-selector.ts:36,44 | FINDING: prevSelectionRef.current as T — safe due to cache invariant (only returned when value is known). | RECOMMENDATION: Acceptable. The logic ensures the ref is always populated before this path.`

`SEVERITY: LOW | features/chat/hooks/use-chat-session.ts:40 | FINDING: navigator as NetworkNavigator — safely extends navigator with optional connection property. Guarded by typeof navigator check. | RECOMMENDATION: Acceptable — standard progressive enhancement pattern.`

`SEVERITY: LOW | features/chat/components/multimodal-input.tsx:51,62 | FINDING: Response JSON cast (as { message? } and as UploadedFilePayload). | RECOMMENDATION: Low risk since the API is internal and typed. Adding a Zod parse would be defense-in-depth.`

`SEVERITY: LOW | features/artifacts/components/artifact-save-utils.ts:38 | FINDING: (await response.json()) as { message?, error?, errorMessage? } — error response shape cast. | RECOMMENDATION: Acceptable for error extraction with fallback.`

`SEVERITY: LOW | lib/ai/models.ts:238 | FINDING: (await response.json()) as OpenRouterResponse — external API response cast. | RECOMMENDATION: The subsequent Array.isArray(data?.data) guard provides runtime safety.`

`SEVERITY: LOW | features/chat/lib/tools/weather.ts:36 | FINDING: return (await response.json()) as T — generic fetch helper. | RECOMMENDATION: Acceptable for internal use with known call sites.`

`SEVERITY: LOW | features/sidebar/components/sidebar-skeleton.tsx:49 | FINDING: } as React.CSSProperties — inline style object cast. | RECOMMENDATION: Type the object directly: const style: React.CSSProperties = {...}.`

---

### 1.3 Non-null Assertions (`!`)

**No non-null assertions found** in the scanned source files. The codebase consistently uses optional chaining (`?.`) and nullish coalescing (`??`) instead. Excellent discipline.

---

### 1.4 Missing Return Type Annotations on Exported Functions

Exported functions without explicit return types. While TypeScript infers them, explicit annotations on exports create contract boundaries and catch accidental return-type changes.

`SEVERITY: LOW | app/api/chat/route.ts:42 | FINDING: export async function POST(request: Request) { — route handler without return type | RECOMMENDATION: Add : Promise<Response>. Same for all route handlers.`

`SEVERITY: LOW | app/api/artifact/route.ts:19,90; app/api/files/upload/route.ts:58; app/api/suggestions/route.ts:13; app/api/history/route.ts:34; app/api/health/route.ts:81 | FINDING: All route handlers lack return type annotations | RECOMMENDATION: Add : Promise<Response> to all.`

`SEVERITY: LOW | features/auth/actions/register.ts:35; features/auth/actions/login.ts:31; features/voting/actions/vote.ts:27; features/sidebar/actions/rename-chat.ts:21; features/chat/actions/delete-trailing-messages.ts:20; features/chat/actions/delete-chat.ts:19 | FINDING: Server Actions without return type annotations | RECOMMENDATION: Add explicit return types. Server Actions are public API boundaries.`

`SEVERITY: LOW | lib/data/chat.ts:33,92; lib/data/message.ts:16,39; lib/data/artifact.ts:29; lib/data/artifact-chat.ts:14; lib/data/suggestion.ts:11,50 | FINDING: Data access functions without return types | RECOMMENDATION: Add return types — these are shared across features and route handlers.`

`SEVERITY: LOW | lib/ai/prompts.ts:61; lib/ai/provider-options.ts:46; lib/data/database-error.ts:7,23; lib/cache/rate-limit.ts:11; lib/cache/with-cache.ts:72 | FINDING: Utility/infrastructure functions without return types | RECOMMENDATION: Add return types for API boundaries.`

`SEVERITY: LOW | ~30 React component exports | FINDING: Component functions return inferred JSX.Element. | RECOMMENDATION: This is idiomatic React and acceptable — component return types are rarely annotated by convention. No action needed.`

---

## 2. Hydration

### 2.1 Browser-Only APIs Without Guards

`SEVERITY: LOW | features/models/components/model-selector.tsx:88 | FINDING: document.cookie write in persistModelSelection(). No typeof document guard. | RECOMMENDATION: Acceptable — this function is only called from user-interaction callbacks inside a "use client" component. Never called during SSR. But adding a guard would be defense-in-depth.`

`SEVERITY: LOW | features/artifacts/components/editors/code-editor.tsx:75-82 | FINDING: document.createElement("script") in loadPyodideScript() — no typeof document guard. | RECOMMENDATION: Acceptable — only called from useCallback inside a "use client" component. Never during SSR. But the module-level variable pyodideScriptPromise could hypothetically be accessed during server bundling.`

**All other browser API accesses** (`window.location`, `window.matchMedia`, `document.activeElement`, `navigator.connection`, `localStorage`) are **properly guarded** — either inside `useEffect` (which only runs client-side), behind `typeof window === "undefined"` checks, or inside callback handlers.

### 2.2 `useLayoutEffect` Without SSR Guard

`SEVERITY: LOW | features/voting/components/vote-resolver.tsx:111 | FINDING: useLayoutEffect(() => { storeRef.current?.setVotes(votes) }, [votes]) used to synchronously update the vote store before paint. | RECOMMENDATION: This is a valid use case (prevents vote flicker between renders). React 19 suppresses useLayoutEffect SSR warnings in client components. The component is marked "use client" and rendered inside Suspense. Technically safe, but could be replaced with useEffect if the synchronous timing isn't critical. Keep as-is with a comment explaining why useLayoutEffect was chosen.`

### 2.3 Dynamic Content in Initial Render

`SEVERITY: LOW | features/sidebar/components/sidebar-user-nav.tsx:37-45 | FINDING: Uses mounted state pattern (hydration guard) and shows skeleton during SSR. | RECOMMENDATION: Properly implemented — no issue.`

`SEVERITY: LOW | lib/hooks/use-mobile.ts:30-43 | FINDING: isMobile starts as undefined (or initialIsMobile from server). useEffect updates to actual value. | RECOMMENDATION: Properly implemented — accepts server-side initial value via props for hydration safety. Consumers should pass initialIsMobile to avoid CLS.`

`SEVERITY: LOW | features/settings/hooks/use-settings.ts:93-112 | FINDING: useSyncExternalStore with getServerSnapshot returning DEFAULT_SETTINGS. | RECOMMENDATION: Correct pattern — React hydrates with server snapshot, then switches to client state.`

---

### 2.4 Deep Hydration Audit — Time-Dependent Renders

Searched every `new Date()`, `Date.now()`, `Math.random()`, `formatDistance`, `format()`, `toLocaleString()`, `toLocaleDateString()`, `Intl.` usage in client components to find render-path time/locale dependencies.

#### Findings

`SEVERITY: MEDIUM | components/weather.tsx:214 | FINDING: new Date().getHours() called directly in render path — compares hourTime.getHours() to the current hour to determine isCurrentHour which toggles a "bg-white/20" className. During SSR the server clock is used; during hydration the client clock is used. If the server is in a different timezone or the render crosses an hour boundary, className will differ → hydration mismatch. | RECOMMENDATION: Move the "current hour" value into a client-only state via useEffect, or compute it as a ref initialized in useEffect. Alternatively gate the highlighting behind a mounted guard. NOTE: This component exists in components/weather.tsx but is NOT yet wired into the message rendering pipeline — GenericToolResult renders weather tool output instead. Dormant code.`

`SEVERITY: MEDIUM | components/weather.tsx:132 | FINDING: useIsMobile() called without initialIsMobile argument. The hook initializes state as undefined, then updates via useEffect to the actual boolean value. On mobile devices this causes undefined→true transition: hoursToShow goes from 6 (undefined default) to 5 (mobile), causing a content layout shift (CLS) — the forecast strip re-renders with one fewer column after hydration. | RECOMMENDATION: When wiring this component, pass initialIsMobile from the server (via x-device-type header) like other consumers do.`

`SEVERITY: LOW | features/artifacts/components/artifact-panel-header.tsx:71 | FINDING: formatDistance(new Date(currentVersion.createdAt), new Date(), { addSuffix: true }) called in render path. The relative time string (e.g. "2 minutes ago") is computed during render — if SSR produces "1 minute ago" but hydration happens 30+ seconds later, the string could change to "2 minutes ago" → hydration text mismatch. | RECOMMENDATION: In practice, artifact-panel is loaded via next/dynamic with { ssr: false } (from chat-shell.tsx), so SSR never renders this. The risk is theoretical unless the dynamic import config changes. Add a defensive comment noting the ssr:false dependency.`

`SEVERITY: LOW | features/chat/components/context-display.tsx:53 | FINDING: maxOutputTokens.toLocaleString() in render — toLocaleString() without an explicit locale argument uses the host default. Server (Node.js) and client (browser) may have different default locales. E.g. server formats 4096 as "4,096" (en-US) while a German browser shows "4.096" → hydration text mismatch. | RECOMMENDATION: Pass an explicit locale: toLocaleString("en-US"). In practice, this renders inside a Popover content area that only mounts on click (not during SSR), so the mismatch is unlikely to manifest. Still best to fix for correctness.`

`SEVERITY: LOW | features/settings/components/settings-panel.tsx:105 | FINDING: Same pattern — maxOutputTokens.toLocaleString() in render without explicit locale. Also uses temperature.toFixed(2) and topP.toFixed(2) which are locale-independent (always use "." decimal separator). | RECOMMENDATION: Pass explicit locale to toLocaleString("en-US"). This renders inside a Sheet content area (open=false by default during SSR), so the mismatch is unlikely to manifest. Fix for correctness.`

`SEVERITY: LOW | features/sidebar/components/sidebar-history-client.tsx:45 | FINDING: groupChatsByDate() uses new Date() to compute "Today", "Yesterday", etc. grouping labels during useMemo. If a user loads the page near midnight, the server-rendered grouping could differ from the client grouping (e.g., a chat in "Today" on server becomes "Yesterday" on client). | RECOMMENDATION: Low risk — this is a "use client" component receiving data from the server. The grouping runs during initial client render, not SSR. The mismatch window is seconds-wide at midnight. No action needed, but a comment noting the edge case would help.`

### 2.5 Deep Hydration Audit — Suspense Boundaries

All `useSearchParams()` usages verified against Suspense boundary requirements:

| Component | Location | Suspense Wrapped? | Assessment |
|-----------|----------|-------------------|------------|
| `NoticeHandler` | `app/(chat)/layout.tsx:83` | ✅ `<Suspense fallback={null}>` | Correct |

Only one `useSearchParams()` consumer exists in the codebase.

Suspense boundaries for async server components:

| Boundary | Location | Fallback | Assessment |
|----------|----------|----------|------------|
| Sidebar shell | `app/(chat)/layout.tsx:51` | `<SidebarSkeleton />` | ✅ Proper skeleton |
| Chat layout shell | `app/(chat)/layout.tsx:88` | `<ChatLayoutFallback>` preserving children | ✅ Content-preserving |
| Auth guard | `app/(auth)/layout.tsx:34` | `<AuthLoadingState />` | ✅ Proper loading UI |
| Vote hydration | `app/(chat)/chat/[id]/page.tsx:111` | `null` | ✅ VoteResolver uses React 19 `use()` |
| Notice handler | `app/(chat)/layout.tsx:83` | `null` | ✅ Renders null anyway |

### 2.6 Deep Hydration Audit — SSR-Excluded Components

All `next/dynamic` with `{ ssr: false }` imports verified:

| Component | Imported From | Assessment |
|-----------|--------------|------------|
| `ArtifactPanel` | `features/chat/components/chat-shell.tsx` | ✅ Heavy panel with SWR + complex state |
| `CodeEditor` | `features/artifacts/components/editors/lazy.ts` | ✅ CodeMirror dependency |
| `SheetEditor` | `features/artifacts/components/editors/lazy.ts` | ✅ Luckysheet dependency |
| `ImageEditor` | `features/artifacts/components/editors/lazy.ts` | ✅ Canvas dependency |
| `SandboxPreview` | `features/artifacts/components/editors/lazy.ts` | ✅ iframe sandbox |
| `TextEditor` | `features/artifacts/components/editors/lazy.ts` | ✅ Tiptap dependency |

These correctly exclude heavy client-only editors from the SSR bundle.

### 2.7 Deep Hydration Audit — Store Hydration Patterns

| Store | Pattern | Server Snapshot | Assessment |
|-------|---------|-----------------|------------|
| Settings | `useSyncExternalStore` | `DEFAULT_SETTINGS` | ✅ Module-level state initialized to defaults; `typeof window` guard prevents localStorage read during SSR |
| Votes | `useSyncExternalStore` | `{}` (empty) | ✅ VoteResolver pushes server data via `useLayoutEffect` after hydration |
| Artifact | `useSyncExternalStore` | `DEFAULT_ARTIFACT` | ✅ Initial state is deterministic |

All stores provide deterministic `getServerSnapshot()` functions that match the initial module-level state. No hydration divergence possible.

### 2.8 Deep Hydration Audit — Theme-Dependent Rendering

| Component | Pattern | Guard | Assessment |
|-----------|---------|-------|------------|
| `sidebar-user-nav.tsx` | `resolvedTheme` for icon toggle | `mounted` state guard, shows skeleton until mounted | ✅ |
| `sheet-editor.tsx` | `resolvedTheme` for editor class | `mounted` state guard, defers class until mounted | ✅ |
| `app/layout.tsx` | `suppressHydrationWarning` on `<html>` | Required for `next-themes` ThemeProvider | ✅ |

### 2.9 Deep Hydration Audit — Observer APIs

| API | File | Context | Assessment |
|-----|------|---------|------------|
| `IntersectionObserver` | `sidebar-history-client.tsx:210` | Inside `useEffect` | ✅ |
| `IntersectionObserver` | `use-scroll-to-bottom.ts:36` | Inside `useEffect` | ✅ |
| `requestAnimationFrame` | `artifact-panel.tsx:70` | Inside callback | ✅ |
| `requestAnimationFrame` | `chat-stream-provider.tsx:52` | Inside callback via ref | ✅ |
| `requestAnimationFrame` | `model-selector.tsx:129` | Inside `useEffect` with cleanup | ✅ |

All browser Observer/RAF APIs are properly scoped to client-only execution paths.

### 2.10 Hydration Assessment Summary

**Overall Rating: EXCELLENT** — The codebase shows strong, consistent hydration discipline.

**Confirmed Safe Patterns:**
- ✅ `useEffect` for all browser-only side effects (zero exceptions)
- ✅ `useSyncExternalStore` with deterministic `getServerSnapshot` for all external stores
- ✅ `mounted` state guards for theme-dependent rendering
- ✅ `typeof window` guards at module level for early-init code
- ✅ `next/dynamic({ ssr: false })` for all heavy client-only editors
- ✅ `suppressHydrationWarning` on `<html>` for theme provider
- ✅ All `useSearchParams()` consumers inside `<Suspense>` boundaries
- ✅ All Observer/RAF APIs inside effects or callbacks
- ✅ All event listeners with proper cleanup

**Active Risks (2 × MEDIUM, 4 × LOW):**
- 2 MEDIUM findings are in dormant `components/weather.tsx` (not yet wired into message rendering)
- 4 LOW findings are theoretical — protected by `ssr: false`, popover/sheet lazy rendering, or sub-second timing windows
- **Zero active hydration bugs** in the currently-rendered component tree

---

## 3. Memory Leaks

### 3.1 useEffect Without Cleanup

Every useEffect in the codebase was inspected. Below are the ones **without** cleanup returns:

| File:Line | Effect Purpose | Cleanup Needed? | Assessment |
|-----------|---------------|-----------------|------------|
| `chat-side-effects.ts:37` | URL update via replaceState | No | One-time guarded by ref |
| `chat-side-effects.ts:53` | Chat change abort+reset | No | Synchronous ref updates |
| `notice-handler.tsx:21` | Show toast + clean URL param | No | One-time effect |
| `message-reasoning.tsx:28` | Track streaming state | No | Pure state sync |
| `message-editor.tsx:47` | Auto-size textarea | No | DOM measurement |
| `stream-bridge.tsx:19` | Process stream deltas | No | Pure computation |
| `sidebar-history-client.tsx:185` | Mark pending chats confirmed | No | Data sync |
| `sidebar-user-nav.tsx:43` | Set mounted=true | No | One-time guard |
| `sidebar-history-item.tsx:67` | Focus rename input | No | One-time focus |
| `artifact-preview.tsx:305` | Update bounding box | No | DOM measurement |
| `chat-shell.tsx:84` | Auto-submit query | No | Guarded by ref |
| `vote-resolver.tsx:149` | Set server votes | No | One-time data push |

**All "no cleanup needed" assessments verified** — these effects either run once (guarded by refs), perform synchronous state updates, or do DOM measurements that don't create subscriptions.

### 3.2 useEffect WITH Cleanup (All Verified Correct ✅)

| File:Line | Cleanup Type | Correct? |
|-----------|-------------|----------|
| `model-selector.tsx:118` | `cancelAnimationFrame(frameId)` | ✅ |
| `session-provider.tsx:72` | `isActive = false` (cancels stale promise) | ✅ |
| `session-provider.tsx:105` | `unsubscribe?.()` (Supabase auth) | ✅ |
| `sidebar-history-client.tsx:206` | `observer.disconnect()` | ✅ |
| `artifact-panel.tsx:310` | `clearTimeout + abort controller` | ✅ |
| `code-editor.tsx:205` | `removeEventListener (mousemove, mouseup)` | ✅ |
| `chat-stream-provider.tsx:64` | `cancelAnimationFrame` | ✅ |
| `use-scroll-to-bottom.ts:35` | `observer.disconnect()` | ✅ |
| `use-mobile.ts:42` | `removeEventListener("change")` | ✅ |

### 3.3 Event Listeners Without Removal

**No unremoved event listeners found.** All `addEventListener` calls in non-ai-elements code are paired with cleanup:

| File | Listener | Cleanup |
|------|----------|---------|
| `use-settings.ts:52` | `window "storage"` | Removed in `cleanupStorageListener()` via subscriber count tracking |
| `suggestions-extension.tsx:176` | `dom "mousedown"` | Removed in widget `destroy()` callback |
| `code-editor.tsx:206-207` | `window "mousemove"/"mouseup"` | Removed in useEffect return |
| `use-mobile.ts:36` | `mql "change"` | Removed in useEffect return |

### 3.4 Intervals/Timeouts Not Cleared

**No uncleared timers found.** All setTimeout/setInterval calls are properly managed:

| File | Timer | Cleanup |
|------|-------|---------|
| `artifact-panel.tsx:298` | debounce `setTimeout` | `clearTimeout` on unmount (useEffect return at ~310) |
| `suggestions-extension.tsx:227` | `setTimeout(() => root.unmount(), 0)` | Fire-and-forget teardown — acceptable (runs during destroy) |
| `chat-route.ts:104` | `setTimeout(resolve, delay)` | One-shot Promise-based delay — no cleanup needed |
| `models.ts:225` | `setTimeout(() => controller.abort())` | `clearTimeout(timeout)` in finally block |

### 3.5 Store Subscriptions Without Unsubscribe

**No leaked subscriptions found.** All subscriptions are managed via:
- `useSyncExternalStore` — React manages subscription lifecycle automatically
- `session-provider.tsx:121-129` — Supabase `onAuthStateChange` properly unsubscribed in useEffect return

---

## Summary

### Severity Distribution

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 0 | — |
| HIGH | 4 | TypeScript `as` casts (SDK write workaround, role/parts conversions, DOM monkey-patching) |
| MEDIUM | 11 | TypeScript casts (9) + Hydration time-dependent renders in dormant component (2) |
| LOW | ~31 | Missing return types, safe casts, hydration edge cases (4), minor patterns |

### Key Takeaways

1. **No memory leaks detected.** Every subscription, listener, timer, and RAF is properly cleaned up. The codebase shows consistent discipline here.

2. **Zero active hydration bugs.** The deep hydration audit (§2.4–2.10) examined every time-dependent render, locale-sensitive format, theme resolution, store hydration, Suspense boundary, and Observer API in the codebase. All currently-rendered components use correct patterns. The 2 MEDIUM hydration findings are in dormant code (`components/weather.tsx` — not yet wired into message rendering). The 4 LOW findings are theoretical — protected by `ssr: false` dynamic imports, lazy-rendering (Popover/Sheet content only mounts on click), or sub-second timing windows at date boundaries.

3. **No non-null assertions (`!`) found.** Excellent — the codebase uses `?.` and `??` consistently.

4. **No `any` types found** (confirmed in prior recon).

5. **TypeScript casts are the primary concern.** 4 HIGH-severity findings where `as` casts could mask real type errors — particularly the AI SDK writer workaround (4 locations) and the role/parts conversions from DB types to SDK types (2 files, 4 locations). These represent the highest-value fixes.

6. **Missing return types on exports** — ~20 non-component exported functions lack explicit return types. This is a code-quality improvement, not a bug risk.

7. **Hydration architecture is excellent.** The codebase consistently applies: `useSyncExternalStore` with deterministic server snapshots, `mounted` guards for theme-dependent UI, `typeof window` guards for module-level browser access, `next/dynamic({ ssr: false })` for heavy editors, and `<Suspense>` boundaries around all async data consumers. This is above-average hydration discipline.

### Recommended Fix Priority

1. **SDK writer casts** (HIGH) — Create a typed wrapper for `writer.write()` data parts
2. **DB → SDK message conversions** (HIGH) — Centralize with runtime validation
3. **DOM monkey-patching** (HIGH) — Replace with WeakMap pattern
4. **Window/globalThis augmentations** (MEDIUM) — Add to `global.d.ts` to eliminate double casts
5. **Weather component hydration** (MEDIUM) — Fix before wiring into message rendering: add mounted guard for `isCurrentHour`, pass `initialIsMobile`
6. **Locale-explicit formatting** (LOW) — Pass `"en-US"` to `toLocaleString()` calls
7. **Missing return types** (LOW) — Batch-add with a lint rule
