# Directory Tree v6.0

> **Pure directory/file structure extracted from `functional-structure-v6.md`**  
> No function signatures, exports, dependencies, LOC estimates, or descriptions.

---

## Complete File Tree (~274 files)

```
nextjs-ai-chatbot/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── loading.tsx
│   ├── global-error.tsx
│   ├── globals.css
│   ├── head.tsx
│   │
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (chat)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── chat/
│   │       └── [id]/
│   │           └── page.tsx
│   │
│   └── api/
│       ├── artifact/
│       │   └── route.ts
│       ├── chat/
│       │   └── route.ts
│       ├── history/
│       │   └── route.ts
│       ├── message/
│       │   └── route.ts
│       ├── suggestion/
│       │   └── route.ts
│       ├── vote/
│       │   └── route.ts
│       ├── files/
│       │   └── upload/
│       │       └── route.ts
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts
│
├── src/
│   │
│   ├── components/
│   │   ├── icons.tsx
│   │   │
│   │   ├── ai-elements/
│   │   │   ├── index.ts
│   │   │   ├── markdown.tsx
│   │   │   ├── code-block.tsx
│   │   │   ├── pre-block.tsx
│   │   │   ├── thinking-block.tsx
│   │   │   ├── tool-call.tsx
│   │   │   ├── tool-result.tsx
│   │   │   ├── file-preview.tsx
│   │   │   ├── image-preview.tsx
│   │   │   ├── audio-player.tsx
│   │   │   ├── video-player.tsx
│   │   │   ├── pdf-viewer.tsx
│   │   │   ├── json-viewer.tsx
│   │   │   ├── table-renderer.tsx
│   │   │   ├── chart-renderer.tsx
│   │   │   ├── mermaid-renderer.tsx
│   │   │   ├── latex-renderer.tsx
│   │   │   ├── link-card.tsx
│   │   │   ├── citation.tsx
│   │   │   ├── footnote.tsx
│   │   │   ├── collapsible-section.tsx
│   │   │   ├── step-indicator.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   ├── loading-dots.tsx
│   │   │   ├── typing-indicator.tsx
│   │   │   ├── error-message.tsx
│   │   │   ├── warning-message.tsx
│   │   │   ├── info-message.tsx
│   │   │   ├── success-message.tsx
│   │   │   └── copy-button.tsx
│   │   │
│   │   ├── ai/
│   │   │   ├── index.ts
│   │   │   ├── message-content.tsx
│   │   │   ├── message-parts.tsx
│   │   │   ├── message-reasoning.tsx
│   │   │   ├── message-sources.tsx
│   │   │   ├── message-attachments.tsx
│   │   │   ├── message-actions.tsx
│   │   │   ├── message-feedback.tsx
│   │   │   ├── tool-invocation.tsx
│   │   │   ├── tool-result-display.tsx
│   │   │   ├── streaming-text.tsx
│   │   │   ├── streaming-code.tsx
│   │   │   ├── streaming-artifact.tsx
│   │   │   ├── artifact-preview.tsx
│   │   │   ├── artifact-actions.tsx
│   │   │   ├── artifact-version-selector.tsx
│   │   │   ├── code-artifact.tsx
│   │   │   ├── text-artifact.tsx
│   │   │   ├── image-artifact.tsx
│   │   │   ├── sheet-artifact.tsx
│   │   │   ├── weather-widget.tsx
│   │   │   ├── stock-widget.tsx
│   │   │   └── calculator-widget.tsx
│   │   │
│   │   ├── ui/
│   │   │   ├── index.ts
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── form.tsx
│   │   │
│   │   └── layout/
│   │       ├── index.ts
│   │       ├── header.tsx
│   │       ├── sidebar.tsx
│   │       ├── sidebar-toggle.tsx
│   │       ├── sidebar-nav.tsx
│   │       ├── sidebar-footer.tsx
│   │       ├── main-content.tsx
│   │       └── mobile-nav.tsx
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── chat.ts
│   │   ├── message.ts
│   │   ├── artifact.ts
│   │   ├── user.ts
│   │   └── common.ts
│   │
│   └── artifacts/
│       ├── index.ts
│       ├── text.ts
│       ├── code.ts
│       └── image.ts
│
├── features/
│   │   │
│   │   ├── chat/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── api/
│   │   │   │   ├── index.ts
│   │   │   │   ├── use-chat-api.ts
│   │   │   │   └── stream-chat.action.ts
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── chat-container.tsx
│   │   │   │   ├── chat-header.tsx
│   │   │   │   ├── chat-messages.tsx
│   │   │   │   ├── chat-message.tsx
│   │   │   │   ├── chat-input.tsx
│   │   │   │   ├── chat-suggestions.tsx
│   │   │   │   ├── chat-empty-state.tsx
│   │   │   │   └── chat-loading.tsx
│   │   │   └── hooks/
│   │   │       ├── index.ts
│   │   │       ├── use-chat-state.ts
│   │   │       ├── use-chat-scroll.ts
│   │   │       └── use-chat-keyboard.ts
│   │   │
│   │   ├── artifact/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── api/
│   │   │   │   ├── index.ts
│   │   │   │   ├── use-artifact-api.ts
│   │   │   │   └── save-artifact.action.ts
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── artifact-container.tsx
│   │   │   │   ├── artifact-header.tsx
│   │   │   │   ├── artifact-canvas.tsx
│   │   │   │   ├── artifact-toolbar.tsx
│   │   │   │   ├── artifact-sidebar.tsx
│   │   │   │   ├── code-editor.tsx
│   │   │   │   ├── text-editor.tsx
│   │   │   │   ├── image-viewer.tsx
│   │   │   │   ├── sheet-editor.tsx
│   │   │   │   └── diff-viewer.tsx
│   │   │   └── hooks/
│   │   │       ├── index.ts
│   │   │       ├── use-artifact-state.ts
│   │   │       ├── use-artifact-history.ts
│   │   │       └── use-artifact-sync.ts
│   │   │
│   │   ├── sidebar/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── sidebar-container.tsx
│   │   │   │   ├── sidebar-history.tsx
│   │   │   │   ├── sidebar-history-item.tsx
│   │   │   │   ├── sidebar-search.tsx
│   │   │   │   └── sidebar-actions.tsx
│   │   │   └── hooks/
│   │   │       ├── index.ts
│   │   │       ├── use-sidebar-state.ts
│   │   │       └── use-chat-history.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── register-form.tsx
│   │   │   │   ├── forgot-password-form.tsx
│   │   │   │   └── auth-providers.tsx
│   │   │   └── hooks/
│   │   │       ├── index.ts
│   │   │       ├── use-auth.ts
│   │   │       └── use-session.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── settings-dialog.tsx
│   │   │   │   ├── settings-general.tsx
│   │   │   │   ├── settings-appearance.tsx
│   │   │   │   └── settings-api-keys.tsx
│   │   │   └── hooks/
│   │   │       ├── index.ts
│   │   │       └── use-settings.ts
│   │   │
│   │   └── input/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── components/
│   │       │   ├── index.ts
│   │       │   ├── multimodal-input.tsx
│   │       │   ├── file-upload.tsx
│   │       │   ├── attachment-preview.tsx
│   │       │   ├── voice-input.tsx
│   │       │   └── input-actions.tsx
│       └── hooks/
│           ├── index.ts
│           ├── use-input-state.ts
│           └── use-file-upload.ts
│
├── lib/
│   │
│   ├── data/
│   │   │
│   │   ├── repositories/
│   │   │   ├── index.ts
│   │   │   ├── base.repository.ts
│   │   │   ├── chat.repository.ts
│   │   │   ├── message.repository.ts
│   │   │   ├── artifact.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── suggestion.repository.ts
│   │   │   └── vote.repository.ts
│   │   │
│   │   ├── services/
│   │   │   ├── index.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── message.service.ts
│   │   │   └── artifact.service.ts
│   │   │
│   │   └── queries/
│   │       ├── index.ts
│   │       ├── chat.queries.ts
│   │       └── message.queries.ts
│   │
│   ├── cache/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── keys.ts
│   │   ├── quota.ts
│   │   ├── cache-strategies.ts
│   │   ├── cache-invalidation.ts
│   │   ├── memory-cache.ts
│   │   ├── tiered-cache.ts
│   │   └── cache-metrics.ts
│   │
│   ├── rate-limit/
│   │   ├── index.ts
│   │   ├── limiter.ts
│   │   ├── strategies.ts
│   │   └── middleware.ts
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── use-debounce.ts
│   │   ├── use-throttle.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-media-query.ts
│   │   ├── use-intersection-observer.ts
│   │   ├── use-resize-observer.ts
│   │   └── use-event-listener.ts
│   │
│   ├── utils/
│   │   ├── index.ts
│   │   ├── cn.ts
│   │   ├── format.ts
│   │   ├── date.ts
│   │   ├── string.ts
│   │   └── validation.ts
│   │
│   ├── api/
│   │   ├── index.ts
│   │   ├── response.ts
│   │   ├── errors.ts
│   │   ├── validation.ts
│   │   └── middleware.ts
│   │
│   ├── auth/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── session.ts
│   │   ├── providers.ts
│   │   ├── guards.ts
│   │   └── entitlements.ts
│   │
│   ├── ai/
│   │   ├── index.ts
│   │   ├── models.ts
│   │   ├── prompts.ts
│   │   ├── tools.ts
│   │   └── streaming.ts
│   │
│   ├── db/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   │   └── (migration files)
│   │   └── seed.ts
│   │
│   ├── middleware/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   └── logging.ts
│   │
│   ├── settings/
│   │   ├── index.ts
│   │   └── defaults.ts
│   │
│   ├── ui/
│   │   ├── index.ts
│   │   ├── theme.ts
│   │   └── animations.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── database.ts
│   │   └── env.ts
│   │
│   ├── errors.ts
│   └── constants.ts
│
├── middleware.ts
├── instrumentation.ts
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
└── tsconfig.json
```

---

## Summary by Directory

| Directory | File Count |
|-----------|------------|
| `app/` | 23 |
| `src/components/` | ~87 |
| `features/` | ~76 |
| `src/types/` | 6 |
| `src/artifacts/` | 4 |
| `lib/` | ~87 |
| Root configs | 6 |
| **Total** | **~276** |

---

*Extracted from: functional-structure-v6.md*  
*Version: 6.0.0*
