# 🎨 UI Components Issues

**Total**: 35 issues
**High**: 2 | **Medium**: 20 | **Low**: 13

## Summary Table

| #    | Issue                               | Severity | File                                              | Status    | Verified         |
| ---- | ----------------------------------- | -------- | ------------------------------------------------- | --------- | ---------------- |
| #129 | Hardcoded greeting text             | LOW      | features/chat/components/overview.tsx             | 🔴 OPEN   |                  |
| #132 | Hardcoded featured model IDs        | MEDIUM   | features/chat/components/model-selector.tsx       | 🔴 OPEN   |                  |
| #133 | Missing loading state model refresh | MEDIUM   | features/chat/components/model-selector.tsx       | 🔴 OPEN   |                  |
| #137 | Hardcoded sample data as default    | HIGH     | features/chat/components/tools/weather.tsx        | 🔴 OPEN   | ✅ CONFIRMED     |
| #138 | Missing alt text weather icons      | MEDIUM   | features/chat/components/tools/weather.tsx        | ⚠️ CLOSED | ❌ NOT CONFIRMED |
| #139 | Button hidden on mobile             | MEDIUM   | features/chat/components/visibility-selector.tsx  | 🔴 OPEN   | ✅ CONFIRMED     |
| #143 | handleEdit is empty TODO            | MEDIUM   | features/chat/components/message/user-message.tsx | 🔴 OPEN   | ✅ CONFIRMED     |
| #144 | Attachments not sent                | HIGH     | features/chat/components/multimodal-input.tsx     | 🔴 OPEN   | ✅ CONFIRMED     |
| #145 | Missing max file size validation    | MEDIUM   | features/chat/components/multimodal-input.tsx     | 🔴 OPEN   | ✅ CONFIRMED     |
| #146 | Inconsistent header role            | LOW      | features/chat/components/chat-header.tsx          | 🔴 OPEN   |                  |
| #147 | handleVote incomplete               | MEDIUM   | features/chat/components/message/message-item.tsx | 🔴 OPEN   | ✅ CONFIRMED     |

## Verification Notes (2025-12-22)

### Closed Issues

- **#138**: SVGs are decorative icons, alt text not required per WCAG

### Confirmed Issues

- **#137**: Weather tool shows hardcoded sample data when no real data
- **#139**: Visibility selector button hidden on mobile viewport
- **#143**: handleEdit function is empty with TODO comment
- **#144**: Attachments processed but never sent to API with message
- **#145**: No max file size validation on uploads
- **#147**: handleVote implementation incomplete
  | #150 | Unused isStreaming param | LOW | features/chat/components/message/parts.tsx | 🔴 OPEN |
  | #153 | Image missing error state | MEDIUM | features/chat/components/input/attachment-preview.tsx | 🔴 OPEN |
  | #159 | No accessible name container | MEDIUM | features/artifacts/components/artifact-messages.tsx | 🔴 OPEN |
  | #160 | Restore button no loading | MEDIUM | features/artifacts/components/artifact-panel.tsx | 🔴 OPEN |
  | #162 | randomArr SSR mismatch | MEDIUM | features/artifacts/components/artifact-panel.tsx | 🔴 OPEN |
  | #163 | EditorSkeleton not animated | LOW | features/artifacts/editors/loader.tsx | 🔴 OPEN |
  | #164 | CodeMirror ignores content | MEDIUM | features/artifacts/editors/code-editor.tsx | 🔴 OPEN |
  | #165 | React import order issue | HIGH | features/artifacts/editors/text-editor.tsx | 🔴 OPEN |
  | #166 | Theme flash hydration | MEDIUM | features/artifacts/editors/text-editor.tsx | 🔴 OPEN |
  | #167 | Hard-coded min/max height | LOW | features/artifacts/editors/sheet-editor.tsx | 🔴 OPEN |
  | #168 | Assistant title hardcoded | LOW | features/sidebar/components/app-sidebar.tsx | 🔴 OPEN |
  | #169 | GroupedVirtuoso endReached | LOW | features/sidebar/components/chat-history.tsx | 🔴 OPEN |
  | #170 | Visibility change no loading | MEDIUM | features/sidebar/components/chat-item.tsx | 🔴 OPEN |
  | #172 | External avatar no fallback | LOW | features/sidebar/components/sidebar-user-nav.tsx | 🔴 OPEN |
  | #173 | Duplicate SidebarToggle | MEDIUM | features/sidebar/components/ | 🔴 OPEN |
  | #175 | Readonly toast unhelpful | LOW | features/documents/components/document-viewer.tsx | 🔴 OPEN |
  | #177 | aria-disabled inconsistent | LOW | features/auth/components/submit-button.tsx | 🔴 OPEN |
  | #179 | isMobile undefined hydration | LOW | shared/hooks/use-mobile.ts | 🔴 OPEN |
  | #180 | detectSourceType simplistic | LOW | shared/components/ai/source-link.tsx | 🔴 OPEN |
  | #181 | Missing disabled propagation | LOW | shared/components/ai/message-actions-enhanced.tsx | 🔴 OPEN |
  | #183 | Auto-close timing hardcoded | LOW | components/ai-elements/image-copy-button.tsx | 🔴 OPEN |
  | #184 | Button type inconsistent | LOW | components/ai-elements/suggestion.tsx | 🔴 OPEN |
  | #185 | SWR fetcher is null | LOW | features/chat/hooks/use-messages.ts | 🔴 OPEN |
  | #186 | SWR key collision | LOW | features/chat/hooks/use-messages.ts | 🔴 OPEN |
  | #187 | Global ARTIFACT_CACHE_KEY | MEDIUM | features/artifacts/hooks/use-artifact.ts | 🔴 OPEN |
  | #188 | Cookie without SameSite | LOW | features/sidebar/hooks/use-sidebar.ts | 🔴 OPEN |
  | #189 | Optimistic delete filter | MEDIUM | features/sidebar/hooks/use-optimistic-chats.tsx | 🔴 OPEN |

## Critical UI Issues

### #144 - Attachments Not Sent

File attachments are processed but never sent with the message.

```typescript
// TODO: Handle attachments via files API when needed
```

### #137 - Hardcoded Sample Data

Weather tool shows fake sample data when no real data available.
