# 🪝 Hooks & Providers Issues

**Total**: 24 issues
**High**: 3 | **Medium**: 14 | **Low**: 7

## Summary Table

| #    | Issue                                     | Severity | File                                            | Status       | Verified                         |
| ---- | ----------------------------------------- | -------- | ----------------------------------------------- | ------------ | -------------------------------- |
| #305 | Missing AbortController for file uploads  | HIGH     | features/chat/hooks/use-messages.ts             | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #306 | localStorage listener no early return     | MEDIUM   | features/settings/hooks/use-settings.ts         | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #307 | Double rAF without cancellation           | MEDIUM   | shared/hooks/use-scroll-to-bottom.ts            | ✅ CONFIRMED | rAF no cancel on unmount         |
| #308 | AbortController.abort() never used        | HIGH     | features/chat/hooks/use-chat-visibility.ts      | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #309 | Missing dependency causes stale closure   | MEDIUM   | shared/hooks/use-scroll-to-bottom.ts            | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #310 | Adaptive throttle computed once           | LOW      | shared/hooks/use-scroll-to-bottom.ts            | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #311 | Context value not memoized                | MEDIUM   | lib/providers/sidebar-provider.tsx              | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #312 | Supabase subscription cleanup race        | MEDIUM   | lib/providers/auth-provider.tsx                 | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #313 | Comment says no useMemo but could benefit | LOW      | lib/providers/chat-providers.tsx                | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #314 | Zustand persist hydration mismatch        | MEDIUM   | features/settings/stores/settings.ts            | ✅ CONFIRMED | SSR hydration mismatch           |
| #315 | Stale metadata race                       | MEDIUM   | features/artifacts/hooks/use-artifact.ts        | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #316 | deleteChat lacks error rollback           | MEDIUM   | features/sidebar/hooks/use-optimistic-chats.tsx | ✅ CONFIRMED | No error rollback                |
| #317 | Context value includes state in deps      | LOW      | lib/providers/artifact-provider.tsx             | ✅ CONFIRMED | Context not memoized             |
| #318 | Missing suggestions-extension             | HIGH     | features/artifacts/editors/text-editor.tsx      | ✅ CONFIRMED | Extension file missing           |
| #319 | Missing data stream cleanup               | MEDIUM   | features/chat/components/chat.tsx               | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #320 | Missing query param handling              | MEDIUM   | features/chat/components/chat.tsx               | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #321 | Missing title poll cleanup                | MEDIUM   | features/chat/components/chat.tsx               | ❌ CLOSED    | NOT CONFIRMED (wrong path/fixed) |
| #322 | Missing MAX_OPTIMISTIC_CHATS limit        | MEDIUM   | features/sidebar/hooks/use-optimistic-chats.tsx | ✅ CONFIRMED | No limit on optimistic queue     |
| #323 | Missing Set for O(1) duplicate detection  | LOW      | features/sidebar/hooks/use-optimistic-chats.tsx | ✅ CONFIRMED | O(n) duplicate check             |
| #324 | Motion provider thin wrapper              | LOW      | lib/motion.tsx                                  | ✅ CONFIRMED | OK - intentional thin wrapper    |
| #325 | React import inside component             | MEDIUM   | features/artifacts/editors/text-editor.tsx      | ✅ CONFIRMED | Import position issue            |
| #326 | migrateMathStrings in deps unstable       | LOW      | features/artifacts/editors/text-editor.tsx      | ✅ CONFIRMED | Unstable dependency              |
| #327 | diff_match_patch in deps unstable         | LOW      | features/artifacts/editors/text-editor.tsx      | ❌ CLOSED    | NOT CONFIRMED (wrong path)       |
| #328 | eslint-disable without explanation        | LOW      | features/artifacts/editors/code-editor.tsx      | ✅ CONFIRMED | No reason given                  |

---

## Memory Leak Issues (#305-#307)

### #305 - Missing AbortController for File Uploads

OldApp properly aborts uploads on unmount:

```typescript
// OldApp pattern
abortControllerRef.current.abort();
```

NewApp lacks this cleanup.

### #308 - AbortController Never Used

```typescript
abortControllerRef.current?.abort(); // Called but...
// The actual fetch never receives signal!
```

---

## Feature Parity Gaps (#318-#323)

| OldApp Feature               | NewApp Status |
| ---------------------------- | ------------- |
| suggestions-extension.ts     | ❌ Missing    |
| dataStream cleanup           | ❌ Missing    |
| URL query param handling     | ❌ Missing    |
| Title poll cleanup           | ❌ Missing    |
| MAX_OPTIMISTIC_CHATS limit   | ❌ Missing    |
| Set for O(1) duplicate check | ❌ Missing    |

---

## Provider Optimization

### #311 - Context Value Not Memoized

```typescript
// Problem: new object every render
const contextValue = { state, dispatch };

// Fix
const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);
```
