# ♿ Accessibility Issues

**Total**: 28 issues
**High**: 2 | **Medium**: 22 | **Low**: 4

## Summary Table

| #    | Issue                                      | Severity | File                                                  | Status               | Verified                   |
| ---- | ------------------------------------------ | -------- | ----------------------------------------------------- | -------------------- | -------------------------- |
| #128 | Missing aria-live for greeting animation   | MEDIUM   | features/chat/components/overview.tsx                 | ❌ CLOSED            | NOT CONFIRMED              |
| #129 | Hardcoded greeting                         | LOW      | features/chat/components/overview.tsx                 | ✅ CONFIRMED         | Hardcoded text             |
| #130 | Missing role="alert" on error fallback     | MEDIUM   | features/chat/components/chat.tsx                     | ❌ CLOSED            | NOT CONFIRMED              |
| #131 | Nested interactive elements                | HIGH     | features/chat/components/chat-header.tsx              | ❌ CLOSED            | NOT CONFIRMED              |
| #132 | Visual contrast issues                     | MEDIUM   | various                                               | 🔍 NEEDS VISUAL TEST | Requires visual inspection |
| #134 | Missing aria-selected on dropdown items    | MEDIUM   | features/chat/components/model-selector.tsx           | ❌ CLOSED            | NOT CONFIRMED              |
| #135 | Missing accessible name on textarea        | MEDIUM   | features/chat/components/multimodal-input.tsx         | ❌ CLOSED            | NOT CONFIRMED              |
| #140 | Missing keyboard activation on suggestions | MEDIUM   | features/chat/components/suggestions.tsx              | ❌ CLOSED            | NOT CONFIRMED              |
| #148 | Using title instead of Tooltip             | MEDIUM   | features/chat/components/message/actions.tsx          | ✅ CONFIRMED         | Tooltip aria issue         |
| #149 | Missing accessible name on avatar          | MEDIUM   | features/chat/components/message/avatar.tsx           | ❌ CLOSED            | NOT CONFIRMED              |
| #152 | Remove button only visible on hover        | MEDIUM   | features/chat/components/input/attachment-preview.tsx | ❌ CLOSED            | NOT CONFIRMED              |
| #154 | Missing focus visible styles               | MEDIUM   | features/chat/components/input/\*.tsx                 | ❌ CLOSED            | NOT CONFIRMED              |
| #157 | Missing aria-label on close button         | HIGH     | features/artifacts/components/artifact-close.tsx      | ❌ CLOSED            | NOT CONFIRMED              |
| #161 | Using motion.div for interactive element   | MEDIUM   | features/artifacts/components/artifact-panel.tsx      | ❌ CLOSED            | NOT CONFIRMED              |
| #171 | More options button no focus state         | MEDIUM   | features/sidebar/components/chat-item.tsx             | ⚠️ PARTIAL           | Focus states inconsistent  |
| #176 | Input missing autoComplete attribute       | MEDIUM   | features/auth/components/auth-form.tsx                | ✅ CONFIRMED         | Missing autocomplete       |
| #182 | Missing aria-pressed for toggle buttons    | MEDIUM   | components/ai-elements/message-actions.tsx            | ❌ CLOSED            | NOT CONFIRMED              |

## WCAG 2.1 Violations

### 1. Keyboard Accessibility (WCAG 2.1.1)

**Issue #140** - Suggestions lack keyboard activation

```tsx
// No onKeyDown handler
<button onClick={handleClick}>{suggestion}</button>
```

**Fix**:

```tsx
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
```

---

### 2. Focus Visible (WCAG 2.4.7)

**Issues #152, #154, #171** - Missing focus indicators

Interactive elements hidden on hover or lacking focus rings.

**Fix**: Add `focus-visible:ring-2 focus-visible:ring-offset-2` classes.

---

### 3. Name, Role, Value (WCAG 4.1.2)

**Issue #131** - Nested interactive elements

```tsx
// WRONG: Button inside DropdownMenuItem (also interactive)
<DropdownMenuItem>
  <button>Click</button>
</DropdownMenuItem>
```

**Fix**: Use `asChild` or restructure.

**Issue #157** - Missing aria-label on close button

```tsx
// WRONG: Only has X icon
<button><XIcon /></button>

// CORRECT
<button aria-label="Close artifact panel"><XIcon /></button>
```

---

### 4. Info and Relationships (WCAG 1.3.1)

**Issue #134** - Missing aria-selected on dropdown

```tsx
// WRONG
<DropdownMenuItem>Model A</DropdownMenuItem>

// CORRECT
<DropdownMenuItem aria-selected={selected === 'model-a'}>
```

---

### 5. Status Messages (WCAG 4.1.3)

**Issue #128** - Animated content not announced

```tsx
// WRONG: No live region
<motion.div>{greeting}</motion.div>

// CORRECT
<motion.div aria-live="polite">{greeting}</motion.div>
```

---

## Component Audit

| Component              | Issues     | Priority |
| ---------------------- | ---------- | -------- |
| chat-header.tsx        | #131       | HIGH     |
| artifact-close.tsx     | #157       | HIGH     |
| model-selector.tsx     | #134       | MEDIUM   |
| multimodal-input.tsx   | #135       | MEDIUM   |
| suggestions.tsx        | #140       | MEDIUM   |
| message/actions.tsx    | #148, #182 | MEDIUM   |
| attachment-preview.tsx | #152, #154 | MEDIUM   |
| chat-item.tsx          | #171       | MEDIUM   |
| auth-form.tsx          | #176       | MEDIUM   |
| overview.tsx           | #128       | MEDIUM   |
| chat.tsx               | #130       | MEDIUM   |

---

## Screen Reader Impact

| Issue | Screen Reader Effect            |
| ----- | ------------------------------- |
| #128  | Animated greeting not announced |
| #130  | Error states not announced      |
| #134  | Selected model not conveyed     |
| #149  | Avatar role unclear             |
| #157  | Close button has no name        |
| #182  | Vote state not conveyed         |

---

## Recommendations

1. **Audit all interactive elements** for aria-\* attributes
2. **Add keyboard handlers** where onClick is used
3. **Use semantic HTML** (button, link) over div/span
4. **Test with screen readers** (NVDA, VoiceOver)
5. **Add focus indicators** to all interactive elements
