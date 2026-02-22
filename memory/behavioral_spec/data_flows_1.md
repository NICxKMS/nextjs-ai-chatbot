# Data Flows 1: Identity, Chat Generation, Streaming

## Flow 1: Session Bootstrap And Identity Resolution
1. Request enters proxy:
   - applies edge rate limit on API paths (excluding health).
   - sets device/sidebar headers/cookies.
   - if non-API and no valid auth session, creates/rotates guest JWT cookie.
2. App shell server component reads session via `getAppSession()`:
   - checks Supabase cookie first, guest cookie second.
3. Client `AuthProvider` initializes from server session:
   - if absent, best-effort POST to `/api/auth/guest`.
   - stores `isNewSession` to skip empty history fetch on brand-new guest.

State transitions:
- `unauthenticated` -> `authenticated(guest)` after bootstrap.
- `authenticated(guest)` -> `authenticated(regular)` after login/register + token exchange.

## Flow 2: Login/Register Upgrade Path
1. User authenticates with Supabase client SDK in browser.
2. Browser sends access token to `/api/auth/exchange` (CSRF + IP rate-limited).
3. Server validates JWT against Supabase secret/issuer/audience.
4. Server writes Supabase access token cookie, deletes guest cookie.
5. Client refreshes route and session context reflects regular user.

Failure branches:
- invalid/expired token -> unauthorized response.
- exchange failure after Supabase success -> UI toast, user remains in previous state.

## Flow 3: New Chat Submission (Primary Loop)
1. User submits prompt from `MultimodalInput`:
   - assembles parts: zero+file parts + one text part.
   - includes selected model, visibility, settings.
2. `useChat` transport POSTs `/api/chat`.
3. Server validates payload (`postRequestBodySchema`) and model validity.
4. Server resolves auth session and enforces:
   - request-level rate limit (`chat` limiter),
   - daily quota by user type,
   - guest cache availability requirement.
5. Server fetches existing chat + messages in parallel with quota count.
6. If chat absent, sets placeholder title and marks as new chat.
7. Server starts streamed response via `createUIMessageStream` + `streamText`.
8. On finish:
   - saves user + assistant messages,
   - sets/update title (async generated title may arrive later),
   - updates usage context.

Client-side parallel state:
- optimistic chat row inserted on first submitted message.
- stream deltas update message content, usage context, and title.
- artifact-related stream data optionally captured for side panel.

## Flow 4: Existing Chat Continuation
1. Existing chat page server-loads chat/messages and ownership check.
2. Client sends next user message to same chat ID.
3. Server enforces ownership and entitlement checks before generation.
4. Stream output appends assistant parts; on finish persists additional version of conversation history.
5. Sidebar title remains stable (no overwrite by placeholder path for existing chats).

## Flow 5: Stream Resume Retrieval
Endpoint: `/api/chat/[id]/stream`.
1. Auth + rate limit + ownership/private visibility checks.
2. Loads chat/messages.
3. Resume policy:
   - if most recent message is not assistant -> returns empty stream.
   - if assistant message older than threshold (~15s) -> empty stream.
   - if recent assistant message exists -> emits transient `data-appendMessage` to restore.

Behavioral intent:
- lightweight reconnect support after short interruption.
- no long-lived resumable generation replay.

## Flow 6: Chat History Read Path
1. Sidebar calls paginated `/api/history`.
2. Server validates pagination params and auth + rate limit.
3. Data layer returns paginated chat list:
   - guest: cache-backed.
   - regular: DB query with cursor semantics.
4. Client groups by relative date buckets and renders virtualized list.
5. Optimistic entries are merged and later reconciled with fetched history.

## Flow 7: Chat Deletion Paths
### Per-chat delete
1. User confirms delete in sidebar or chat context.
2. Client calls DELETE `/api/chat?id=...`.
3. Server validates id/auth/rate-limit/resource/ownership.
4. Data layer deletes:
   - guest: cache-only.
   - regular: transactionally delete votes/messages/chat, then cache cleanup.
5. Sidebar cache mutates to remove deleted chat; if active chat deleted, route navigates home.

### Delete all
1. Client calls DELETE `/api/history`.
2. Server auth + strict rate limit.
3. Data layer:
   - guest: atomic cache wipe.
   - regular: transactionally delete all user chats and related rows.
4. Client invalidates history cache and routes home.

## Flow 8: Visibility Update
1. User toggles visibility in header/sidebar menu.
2. Client updates local visibility optimistically.
3. Server action validates auth/rate-limit/ownership + schema.
4. Data layer persists update:
   - guest cache-only.
   - regular DB first then async cache update.
5. Path revalidation refreshes server-rendered chat state.

## Behavioral Conclusions
- Chat flow is intentionally asynchronous and decoupled: generation, persistence, title generation, and cache updates are not fully blocking each other.
- Identity mode (guest vs regular) is a core branch in almost every data transition and must remain explicit in migration planning.
