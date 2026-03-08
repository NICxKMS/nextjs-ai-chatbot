# TODO Implementation Log

Tracking of all `TODO` / `@unused` / `@todo` annotations found during audit and their resolution.

---

## Implemented

| File | Original TODO | Action Taken | Wave |
|------|---------------|-------------|------|
| `components/weather.tsx:153` | "Remove or re-home this component if it remains test-only" | Wired `Weather` component into tool result rendering in `features/chat/components/message.tsx`. The component now renders weather tool call results inline. | W3 |
| `lib/data/user.ts:57` | `@unused` — "Login flow does not yet track last login" | Added `updateUserLastLogin` function. Called as fire-and-forget in `features/auth/actions/login.ts` after successful authentication. Does not block the login response. | W3 |
| `lib/cache/keys.ts:25-27` | "Reserved for future global per-user rate limiting" | Dead key builders (`user:*:global`, `user:*:search`) removed during W2a rate limiting scope. No consumers existed. | W2a |
| `lib/data/chat.ts:89` | `@unused` — "Chat page fetches chat and messages separately" | `getChatWithMessages` removed during W2a data layer scope. The chat page uses `getChatPageState` + speculative messages fetch instead. | W2a |

## Deferred

| File | TODO | Reason |
|------|------|--------|
| `features/artifacts/components/artifact-panel.tsx:175` | "Implement diff mode for artifact versions" | Requires a diff library and UI design work. Not a performance or correctness issue. |
| `features/models/lib/models.ts:57` | "User-level model preferences" | Requires a user preferences feature that does not exist yet. |
