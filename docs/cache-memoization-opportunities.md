# Cache, Memoization, and Ref Opportunities

## Overview
This note captures every safe place in the codebase where server-side caching, React memoization, or refs can be introduced to reduce duplicate work while preserving user experience. Recommendations follow Next.js 16 guidance around the Data Cache (`unstable_cache`), cache tags (`revalidateTag`), and per-request deduplication via `react`'s `cache` API.

## High-impact server-side caching
| Area | Current behaviour | Recommended change |
| --- | --- | --- |
| Chat history API | `GET` fetches directly from the database on every hit; `DELETE` removes all chats without invalidating cached data @app/(chat)/api/history/route.ts#L6-L45 | Wrap the read in `unstable_cache` keyed by `userId`, `limit`, and cursor params, tagging entries as `history:user:{userId}`. Call `revalidateTag` with the same tag after deletes. |
| Vote API | `GET` returns live votes; `PATCH` updates the DB but leaves any cache untouched @app/(chat)/api/vote/route.ts#L5-L75 | Cache `GET` results with tag `votes:chat:{chatId}`; call `revalidateTag` after `PATCH`. |
| Document API | Reads and writes documents without caching or invalidation @app/(chat)/api/document/route.ts#L10-L131 | Cache `GET /api/document` responses tagged `document:{id}`. Invalidate after `POST`/`DELETE`. |
| Suggestions API | Recomputes document suggestions on every request @app/(chat)/api/suggestions/route.ts#L5-L37 | Cache `GET` responses with tag `suggestions:document:{documentId}` and invalidate after new suggestions are persisted. |
| Token catalog | Already cached with `unstable_cache` for 24h inside the chat POST handler @app/(chat)/api/chat/route.ts#L134-L161 | No change required. Document this so the team knows this path is already optimized. |
| Weather tool | Each tool call triggers two external fetches (geocoding + forecast) @lib/ai/tools/get-weather.ts#L4-L75 | Introduce TTL caching: e.g., 24 h for geocoding (`geocode:{city}`) and ~5 min for weather data (`weather:{lat}:{lon}`). |
| Suggestions tool | Deduplicates in-flight requests only; past responses are recomputed @lib/ai/tools/request-suggestions.ts#L15-L107 | After saving suggestions, revalidate `suggestions:document:{documentId}` so the API cache stays fresh. |
| Database query helpers | All getters run direct SQL with no broader caching @lib/db/queries.ts#L83-L670 | Export cached variants (via `unstable_cache` + tags) for read-heavy helpers like `getChatById`, `getMessagesByChatId`, `getVotesByChatId`, etc. In write helpers, invoke `revalidateTag` for related tags. |

## Tagging scheme
| Tag | Invalidated by |
| --- | --- |
| `history:user:{userId}` | Chat deletion or creation (`saveChat`, `deleteChatById`, `deleteAllChatsByUserId`) |
| `chat:{id}` | Chat updates (`saveChat`, `updateChatTitleById`, `updateChatVisiblityById`, `updateChatLastContextById`) |
| `messages:chat:{id}` | Any message insert/delete (`saveMessages`, `deleteMessagesByChatIdAfterTimestamp`) |
| `votes:chat:{id}` | `voteMessage` |
| `document:{id}` | Document writes (`saveDocument`, `deleteDocumentsByIdAfterTimestamp`) |
| `suggestions:document:{id}` | `saveSuggestions` |
| `streamIds:chat:{chatId}` | `createStreamId` (optional) |
| `geocode:{city}` | Geocode refresh (rare) |
| `weather:{lat}:{lon}` | Weather refresh interval |

## React memoization and refs
- **`components/chat.tsx`** already uses `useMemo`, `useCallback`, refs, and SWR caching effectively—no additional memoization required @components/chat.tsx#L40-L389.
- **`components/messages.tsx`** exports a memoized component with deep-equality checks, preventing unnecessary re-renders @components/messages.tsx#L14-L140.
- **`components/sidebar-history.tsx`** memoizes expensive operations and gate-keeps fetching behind sidebar state. Consider setting `dedupingInterval` on `useSWRInfinite` to reduce redundant fetches when toggling the sidebar @components/sidebar-history.tsx#L79-L377.
- Other client components (e.g., `model-selector`, `app-sidebar`) already memoize stateful computations @components/model-selector.tsx#L1-L244 @components/app-sidebar.tsx#L1-L150.

## Intra-request deduplication
For server components or route handlers that call the same database helper multiple times during a single request, expose `cache`-wrapped variants:

```ts
import { cache } from 'react';
import { getChatById } from '@/lib/db/queries';

export const getChatByIdCached = cache(getChatById);
```

Use these only for non-mutating reads inside a single request lifecycle; combine with Data Cache wrappers when cross-request caching is beneficial.

## Implementation checklist
1. **Add `unstable_cache` wrappers** to the enumerated read operations, tagging entries per the table.
2. **Invoke `revalidateTag`** immediately after each mutation that affects cached data.
3. **Introduce TTL caching** for external weather/geocoding calls.
4. **(Optional)** Tune `useSWRInfinite` with a `dedupingInterval` in the sidebar history component.
5. **Document existing caches** (e.g., token catalog) to avoid duplicate work by the team.
