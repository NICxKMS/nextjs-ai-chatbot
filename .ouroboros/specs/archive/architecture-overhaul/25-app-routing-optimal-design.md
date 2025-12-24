# P3.6: App Routing Optimal Design

**Status:** Proposed  
**Date:** 2024-12-17  
**Author:** Ouroboros Architect

---

## Purpose

Define the optimal App Router architecture for Next.js 16 with Turbopack, establishing patterns for route groups, layouts, loading states, and error boundaries.

## Requirements

| ID | Requirement |
|----|-------------|
| REQ-R01 | Route groups organize routes without affecting URL structure |
| REQ-R02 | Layouts share UI efficiently across related routes |
| REQ-R03 | Loading states provide immediate visual feedback |
| REQ-R04 | Error boundaries isolate failures per route segment |
| REQ-R05 | Parallel routes enable independent loading when applicable |

---

## Current Architecture Analysis

### Route Structure
```
app/
├── layout.tsx              # Root: Providers, fonts, analytics
├── global-error.tsx        # Root error boundary
├── (auth)/                 # Auth route group
│   ├── login/
│   └── register/
├── (chat)/                 # Chat route group
│   ├── layout.tsx          # Chat-specific layout (sidebar)
│   ├── loading.tsx         # Segment-level loading
│   ├── error.tsx           # Segment-level error
│   ├── page.tsx            # Root chat page
│   ├── chat/[id]/          # Dynamic chat routes
│   └── api/                # Route handlers
└── api/                    # Standalone API routes
```

### Strengths
- **POS-001**: Route groups `(auth)`, `(chat)` cleanly separate concerns
- **POS-002**: Nested layouts prevent provider re-mounting
- **POS-003**: Loading/error files at route group level provide good UX
- **POS-004**: Server Components for layouts optimize hydration

### Issues
- **NEG-001**: No parallel routes for sidebar/main content independence
- **NEG-002**: Missing not-found.tsx at route group level
- **NEG-003**: No explicit route segment config exports

---

## Design Decision

### Option 1: Enhanced Current Pattern (SELECTED)
Improve existing structure with missing pieces.

### Option 2: Parallel Routes
Use `@sidebar` and `@main` parallel routes.
- **Rejected**: Over-engineering for current sidebar toggle behavior. Parallel routes better suit truly independent data fetching.

### Option 3: Intercepting Routes
Add intercepting routes for modals.
- **Rejected**: No current modal-based navigation requirements.

---

## Architecture

### Route Configuration Pattern

```typescript
// app/(chat)/layout.tsx - Current (GOOD)
export default async function Layout({ children }) {
  const headersList = await headers();
  const isMobile = headersList.get("x-device-type") === "mobile";
  return <ChatLayoutClient initialIsMobile={isMobile}>{children}</ChatLayoutClient>;
}
```

### Recommended Additions

```
app/
├── (chat)/
│   ├── not-found.tsx       # ADD: Chat-specific 404
│   └── chat/
│       └── [id]/
│           ├── page.tsx
│           ├── loading.tsx # ADD: Per-chat loading
│           └── error.tsx   # ADD: Per-chat error
```

### Route Segment Config

```typescript
// app/(chat)/chat/[id]/page.tsx
export const dynamic = 'force-dynamic';    // Real-time chat data
export const revalidate = 0;               // No ISR caching

// app/(auth)/login/page.tsx
export const dynamic = 'force-static';     // Static auth forms
```

### Loading State Hierarchy

```mermaid
graph TD
    A[Root Layout] --> B{Route Group}
    B --> C[(chat) loading.tsx]
    B --> D[(auth) loading.tsx]
    C --> E[/chat/[id] loading.tsx]
    
    style C fill:#4CAF50
    style E fill:#8BC34A
```

**Priority**: Most specific loading.tsx wins.

---

## Consequences

### Positive
- **POS-001**: Granular loading states per route segment
- **POS-002**: Isolated error recovery without full page refresh
- **POS-003**: TypeScript-first route config validation

### Negative
- **NEG-001**: More files to maintain
- **NEG-002**: Must ensure consistent styling across loading states

---

## Implementation Notes

1. **Add not-found.tsx** to `(chat)` route group
2. **Add per-chat loading.tsx** to `chat/[id]/` for better perceived performance
3. **Export route segment configs** explicitly for documentation
4. **Use generateStaticParams** for any prerenderable dynamic routes

## Dependencies

- Next.js 16.x App Router
- React 19 Suspense boundaries
- next/navigation for client-side routing
