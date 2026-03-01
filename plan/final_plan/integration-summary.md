> **Updated per redesign audit (2026-03-01)**

# Integration Summary

> All integration seams, data flow checklist, provider tree, and API route inventory — updated with redesign naming and patterns.

---

## Seam Resolution Matrix

All seams resolved across 8 phases using redesign patterns.

### Authentication & Session (5)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-001 | SessionProvider Injection | P2 | P2-T06, P2-T08 | ✅ |
| SEAM-002 | Auth Exchange (Login/Register) | P2 | P2-T04, P2-T05 | ✅ |
| SEAM-003 | Guest Bootstrap | P2 | P2-T03 | ✅ |
| SEAM-004 | Guest Token Rotation | P2 | P2-T03 | ✅ |
| SEAM-005 | Session Resolution | P2 | P2-T01 | ✅ |

### Chat Streaming (3)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-006 | Chat Request Pipeline | P3 | P3-T23, P3-T11, P3-T18 | ✅ |
| SEAM-007 | ChatStreamProvider Pipeline (split context + RAF) | P3 | P3-T10 | ✅ |
| SEAM-008 | Chat Completion Execution | P3 | P3-T02, P3-T23 | ✅ |

### Chat ↔ Artifacts (4)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-009 | `createArtifact` tool → handler registry | P4 | P4-T04, P4-T06 | ✅ |
| SEAM-010 | `updateArtifact` tool → handler registry | P4 | P4-T04, P4-T06 | ✅ |
| SEAM-011 | `requestSuggestions` tool → text editor | P4 | P4-T07 | ✅ |
| SEAM-012 | Artifact stream → StreamBridge → `artifactStore` → panel | P4 | P4-T11, P4-T17 | ✅ |

### Chat ↔ Sidebar (2)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-013 | Optimistic chat creation (PendingChatsProvider) | P5 | P5-T02, P5-T11 | ✅ |
| SEAM-014 | Title sync (single-channel: `chat-title` stream → `PendingChats.updateTitle()`) | P5 | P5-T02, P5-T05 | ✅ |

### Settings ↔ Chat (1)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-015 | Settings Pipeline (`useSyncExternalStore` + localStorage) | P3 | P3-T06, P3-T07, P3-T11 | ✅ |

### Model Selection (2)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-016 | Model Catalog → Selector → Chat | P3, P6 | P3-T01, P6-T04, P6-T05 | ✅ |
| SEAM-017 | AI Provider Registry | P1, P3 | P1-T11, P1-T12, P3-T01 | ✅ |

### Voting (1)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-018 | Vote Mutation (Server Action + `useOptimistic` + VoteResolver) | P6 | P6-T01, P6-T02, P6-T03 | ✅ |

### File Upload (1)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-019 | File Upload → Message Attachment | P6 | P6-T09, P6-T10, P6-T11 | ✅ |

### Sidebar History (1)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-020 | Sidebar History Pagination (server initial + SWR pagination) | P5 | P5-T05, P5-T10 | ✅ |

### Artifact Fetch (1)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-021 | Artifact Version Fetch | P4 | P4-T15 | ✅ |

### Visibility (1)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-022 | Visibility Toggle (Server Action + `useOptimistic` + `updateTag`) | P6 | P6-T06, P6-T07, P6-T08 | ✅ |

### Data Layer (4)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-023 | Data Context (Session→Branching) | P1 | P1-T05 | ✅ |
| SEAM-024 | Chat Data Operations | P1 | P1-T06 | ✅ |
| SEAM-025 | Artifact Data Operations | P1, P4 | P1-T08, P4-T15 | ✅ |
| SEAM-026 | Message Persistence | P1, P3 | P1-T07, P3-T23 | ✅ |

### Error Handling (2)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-027 | Error Boundaries (all levels) | P7 | P7-T01, P7-T02 | ✅ |
| SEAM-028 | Client Error Handling (onError) | P3 | P3-T11, P3-T26 | ✅ |

### UI Infrastructure (3)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-029 | Provider Tree Assembly (server layout + client islands) | P0, P2, P3, P5 | P0-T13, P2-T08, P3-T24, P5-T11 | ✅ |
| SEAM-030 | Theme System | P0, P5 | P0-T12, P5-T06 | ✅ |
| SEAM-031 | URL State Management | P3 | P3-T11, P3-T25 | ✅ |

### Artifact Editors (4)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-032 | Text Editor (TipTap+Suggestions) | P4 | P4-T07 | ✅ |
| SEAM-033 | Code Editor (CodeMirror+Pyodide) | P4 | P4-T08 | ✅ |
| SEAM-034 | Sheet Editor (react-data-grid) | P4 | P4-T09 | ✅ |
| SEAM-035 | Image Editor | P4 | P4-T10 | ✅ |

### Miscellaneous (5)

| Seam | Description | Phase | Tasks | Status |
|------|-------------|-------|-------|--------|
| SEAM-036 | Rate Limiting Pipeline | P0, P6 | P0-T14, P6-T09, P6-T13 | ✅ |
| SEAM-037 | Pyodide Script Loading | P4 | P4-T17 | ✅ |
| SEAM-038 | Message Edit + Regenerate | P3 | P3-T16 | ✅ |
| SEAM-039 | Version Navigation + Restore | P4 | P4-T12, P4-T15 | ✅ |
| SEAM-040 | Inline Artifact Preview → Panel | P4 | P4-T14 | ✅ |

---

## Data Flow Checklist

| Flow | From | To | Mechanism | Phase |
|------|------|----|-----------|-------|
| User message → DB | Client → POST /api/chat → Drizzle | SSE + DB write in `onFinish` | P3 |
| AI response → Client | `streamText` → SSE → `useChat` | Server-Sent Events | P3 |
| Chat title → Sidebar | `chat-title` stream part → `PendingChats.updateTitle()` | Single channel (no polling, no window events) | P3, P5 |
| Settings → AI completion | `useSyncExternalStore` + localStorage → request body → `streamText` config | JSON in request.body | P3 |
| Vote → DB | Client → Server Action → Drizzle → `updateTag` | `useOptimistic` + Server Action | P6 |
| File → Blob → Message | FormData → POST /api/files/upload → Vercel Blob → message parts | Upload then attach | P6 |
| Session → DataContext | Cookie → `getAppSession()` → data functions | Server-side per-request | P1, P2 |
| Artifact content → Panel | `artifact-*` stream parts → ChatStreamProvider → StreamBridge → `processStreamDelta()` → `artifactStore.setState()` → `useSyncExternalStore` → editor | Stream + external store | P3, P4 |
| Visibility → DB | Client → `useOptimistic` → Server Action → Drizzle → `updateTag` | Optimistic SA | P6 |
| History → Sidebar | Server: `'use cache'` initial load; Client: `useSWRInfinite` pagination | Server render + cursor pagination | P5 |

---

## Provider Tree

### Root Layout (`app/layout.tsx`) — SERVER

```
<html>
  <body>
    <ThemeProvider>
      <SessionProvider session={serverSession}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  </body>
</html>
```

### Chat Layout (`app/(chat)/layout.tsx`) — SERVER

```
<SidebarProvider>
  <PendingChatsProvider>
    <Suspense fallback={<SidebarSkeleton />}>
      <SidebarShell />     <!-- SERVER: 'use cache' + cacheTag -->
    </Suspense>
    <SidebarInset>
      {children}            <!-- Chat pages render here -->
    </SidebarInset>
  </PendingChatsProvider>
</SidebarProvider>
```

### Chat Page (`app/(chat)/chat/[id]/page.tsx`)

```
<ChatStreamProvider>        <!-- Split context: StateCtx + DispatchCtx, RAF batching -->
  <ChatShell                <!-- ~60 lines, creates ChatSessionContext.Provider -->
    chatId={id}
    initialMessages={messages}
  >
    <ChatHeader />
    <Messages />
    <MultimodalInput />
    <StreamBridge />        <!-- Thin bridge ~20 lines → processStreamDelta → artifactStore -->
    <ArtifactPanel />       <!-- useSyncExternalStore subscription -->
  </ChatShell>
  <VoteResolver votesPromise={votesPromise} />   <!-- React 19 use() -->
</ChatStreamProvider>
```

---

## API Route Inventory

| Method | Path | Auth | Rate Limit | Phase |
|--------|------|------|------------|-------|
| POST | `/api/chat` | Required | 50 req/min | P3 |
| POST | `/api/auth/guest` | None | 5 req/min | P2 |
| GET | `/api/auth/callback` | None | 5 req/min | P2 |
| POST | `/api/auth/logout` | Required | 10 req/min | P2 |
| POST | `/api/files/upload` | Required | 20 req/min | P6 |
| GET | `/api/history` | Required | 100 req/min | P5 |
| GET | `/api/artifact` | Required | 100 req/min | P4 |
| POST | `/api/artifact` | Required | 50 req/min | P4 |
| GET | `/api/suggestions` | Required | 100 req/min | P4 |
| GET | `/api/health` | None | 100 req/min | P6 |

Rate limits are enforced in `proxy.ts`. Auth routes have stricter limits to prevent brute-force attacks.

### Removed Routes (Redesign)

| Route | Reason |
|-------|--------|
| `PATCH /api/vote` | Replaced by Server Action + `useOptimistic` |
| `DELETE /api/history` | Replaced by Server Action |
| `GET /api/chat/[id]/messages` | Replaced by `'use cache'` server fetch |
| `GET /api/chat/[id]/reconnect` | Removed — `useChat` handles reconnection natively |

### Server Actions Inventory

| Action | Location | Purpose | Phase |
|--------|----------|---------|-------|
| `vote` | `features/voting/actions/vote.ts` | Upvote/downvote message | P6 |
| `updateVisibility` | `features/visibility/actions/update-visibility.ts` | Toggle chat visibility | P6 |
| `renameChat` | `features/sidebar/actions/rename-chat.ts` | Rename chat title | P5 |
| `deleteChat` | `features/chat/actions/delete-chat.ts` | Delete single chat | P3 |
| `deleteAllChats` | `features/chat/actions/delete-all-chats.ts` | Delete all user chats | P3 |
| `deleteTrailingMessages` | `features/chat/actions/delete-trailing-messages.ts` | Delete messages after edit point | P3 |
| `login` | `features/auth/actions/login.ts` | User login | P2 |
| `register` | `features/auth/actions/register.ts` | User registration | P2 |
| `logout` | `features/auth/actions/logout.ts` | User logout | P2 |
