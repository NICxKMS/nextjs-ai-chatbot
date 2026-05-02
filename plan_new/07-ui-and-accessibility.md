# UI And Accessibility

The UI is a server-rendered chat application with small client islands for interaction. The visual contract keeps the existing product behavior while adopting the new architecture and naming.

## Routes And Screens

| Route | File | Screen |
|---|---|---|
| `/` | `app/(chat)/page.tsx` | New chat |
| `/chat/[id]` | `app/(chat)/chat/[id]/page.tsx` | Existing chat |
| `/login` | `app/(auth)/login/page.tsx` | Login |
| `/register` | `app/(auth)/register/page.tsx` | Register |
| Chat loading | `app/(chat)/loading.tsx` | Conversation loading state |
| Chat error | `app/(chat)/error.tsx` | Route-level chat recovery |
| Global error | `app/global-error.tsx` | Root fatal error |

## Root Layout

Root layout is a server component. It renders `html`, `body`, fonts, analytics, speed insights, theme provider, session provider, and toaster. It should not include SWRConfig, tooltip provider, chat stream providers, or feature-specific app shell wrappers.

Do not set `maximumScale: 1` or otherwise block user zoom. The old UI noted this, but the rebuild should preserve accessibility over parity in that case.

## Chat Layout

Chat layout is a server component. It reads session and sidebar cookie state, then renders:

```tsx
<NoticeHandler />
<Script src="/pyodide/pyodide.js" strategy="lazyOnload" />
<PendingChatsProvider>
  <SidebarProvider defaultOpen={sidebarOpen}>
    <Suspense fallback={<SidebarSkeleton />}>
      <SidebarShell session={session} />
    </Suspense>
    <SidebarInset>{children}</SidebarInset>
  </SidebarProvider>
</PendingChatsProvider>
```

`NoticeHandler` reads `?notice=chat_not_found` and `?notice=user_not_found`, shows a toast, and cleans the URL.

## New Chat Screen

The new chat page generates an ID server-side, resolves the default model, and renders an empty `ChatShell`.

```tsx
<ChatStreamProvider>
  <ChatShell
    id={newChatId}
    initialMessages={[]}
    initialChatModel={modelFromCookieOrDefault}
    initialVisibility="private"
    isReadonly={false}
    availableModels={models}
  />
  <StreamBridge id={newChatId} />
</ChatStreamProvider>
```

Empty state contains a greeting and four suggested actions in a responsive grid.

## Existing Chat Screen

The existing chat page loads session, chat plus messages, votes when allowed, and available models. Private chats not owned by the session user return not found. Public chats owned by another user render readonly.

```tsx
<ChatStreamProvider>
  <ChatShell
    id={chat.id}
    initialMessages={messages}
    initialChatModel={chat.model ?? DEFAULT_CHAT_MODEL}
    initialVisibility={chat.visibility}
    isReadonly={session.user.id !== chat.userId}
    availableModels={models}
  />
  <StreamBridge id={chat.id} />
  <Suspense>
    <VoteResolver chatId={chat.id} votesPromise={votesPromise} />
  </Suspense>
</ChatStreamProvider>
```

## Main Components

| Component | Role |
|---|---|
| `ChatShell` | Thin client orchestrator and `ChatSessionContext` provider |
| `ChatHeader` | Sidebar toggle, model selector, visibility selector, settings button, new chat controls |
| `Messages` | Virtualized conversation list, greeting, suggested actions, error footer, scroll control |
| `Message` | Renders user and assistant messages, reasoning, tools, files, actions, votes |
| `MultimodalInput` | Prompt input, attachments, send/stop controls |
| `ArtifactPanel` | Side panel for generated and edited artifacts |
| `SidebarShell` | Server sidebar frame and initial history fetch |
| `SidebarHistoryClient` | Client pagination, grouping, item menus, pending chat merge |
| `SettingsPanel` | Local chat settings sheet |
| `AuthForm` | Login/register form with `useActionState` |

## Interaction Rules

### Chat Input

Enter submits when not composing. Shift plus Enter inserts a newline. Submit is disabled for empty input with no files or while an active stream cannot accept another message. On desktop, focus returns to the input after submit. On mobile, avoid forced focus.

### Attachments

The attachment button opens a hidden file input. Uploads go to `/api/files/upload`, show thumbnails through `PreviewAttachment`, and can be removed before send. Active uploads abort on unmount. The expected source behavior allows up to three concurrent uploads.

### Message Actions

User messages can be copied and edited. Editing calls `deleteTrailingMessages`, updates local messages, and regenerates from that point. Assistant messages can be copied and voted on by authenticated users. Actions hide or disable during streaming when mutation would conflict with the stream.

### Sidebar

History is grouped into Today, Yesterday, Last 7 days, Last 30 days, and Older. Pending chats render before Today. Chat item menus support rename, share visibility, and delete. Delete all uses a confirmation dialog and a Server Action.

### Model Selector

The model selector lives in `ChatHeader`. Models are grouped by provider and can show name, provider, context, modality, capability, and source metadata. Selection persists to cookie and localStorage.

### Settings

Settings open from a right-side sheet. The sheet exposes temperature, topP, max output tokens, system prompt, and enable reasoning. There are no separate toggles for artifact streaming or auto-scroll. Artifacts always stream and auto-scroll is handled by chat scroll logic.

## Loading And Error States

| Surface | State |
|---|---|
| Chat route loading | Centered spinner and `Loading conversation...` |
| Sidebar loading | Skeleton matching the sidebar layout |
| Streaming assistant | Thinking indicator and progressive message text |
| Artifact streaming | `Generating...` placeholder or editor-specific loading state |
| API/network error | Toast plus retry where possible |
| Chat error boundary | Message, digest when available, home and retry actions |
| Artifact error boundary | Editor fallback with retry |
| Auth form pending | Disabled submit and polite live status |

## Responsive Rules

| Area | Mobile | Desktop |
|---|---|---|
| Sidebar | Overlay sheet, closes on navigation | Fixed collapsible side panel |
| Artifact panel | Full-screen panel | Side panel beside chat |
| Visibility selector | Hidden in header | Visible in header |
| New chat control | Visible from header/sidebar as appropriate | Inline with header/sidebar |
| Input focus | No automatic refocus after submit | Refocus after submit |

## Accessibility Rules

1. Icon-only buttons need accessible names through text, `aria-label`, or tooltip content.
2. Upload, send, stop, remove attachment, and sidebar toggle controls need explicit labels.
3. Toggle states such as settings and votes use `aria-pressed`.
4. Auth submit status uses a polite live region.
5. Auth forms use semantic labels and inputs with autocomplete.
6. Dialogs, sheets, and dropdowns rely on Radix focus management.
7. Message edit mode focuses the edit textarea and Escape cancels editing.
8. Avoid blocking browser zoom.
9. Add reduced-motion support for spring and presence animations.
10. Preserve visible focus states across buttons, links, menus, editor controls, and sidebar items.

## AI Elements Rule

Files in `components/ai-elements/` are read-only generated primitives. Copy on demand only when a wrapper needs a primitive. Do not bulk-copy every primitive upfront. Do not modify or reformat these files. Feature wrappers may compose them and adapt behavior around them.
