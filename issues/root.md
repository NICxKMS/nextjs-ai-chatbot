# Issue Tracking - Master Index

**Last Updated:** 2026-02-15T13:35:00Z

---

## Legend

### Severity Levels

| Level | Definition |
|-------|------------|
| **Critical** | System-breaking issues that prevent core functionality from working. Requires immediate attention. |
| **High** | Significant issues that degrade user experience or create security concerns. Should be addressed soon. |
| **Medium** | Moderate issues that affect functionality or UX but have workarounds. |
| **Low** | Minor issues or cosmetic discrepancies with minimal impact. |

### Category Definitions

| Category | Definition |
|----------|------------|
| **UI Inconsistencies** | Visual differences, missing animations, styling discrepancies between old and new implementations |
| **Bugs** | Functional errors, incorrect behavior, missing error handling |
| **Broken Code** | Incomplete implementations, missing integrations, placeholder code that doesn't work |
| **Functional Discrepancies** | Behavioral differences, missing features, changed flows |
| **Improvement Only** | Changes that are enhancements in the new app, not issues requiring fixes |

---

## Running Totals

| Metric | Count |
|--------|-------|
| **Total Issues** | 275 |
| Critical | 33 |
| High | 68 |
| Medium | 104 |
| Low | 52 |

### Issues by Category

| Category | Count |
|----------|-------|
| UI Inconsistencies | 9 |
| Bugs | 23 |
| Broken Code | 39 |
| Functional Discrepancies | 163 |
| Improvement Only | 22 |

---

## Phase Index

| Phase | Name | Issue Count | Status | Link |
|-------|------|-------------|--------|------|
| 1 | Page Components | 35 | Completed | [01-page-components/issues.md](./01-page-components/issues.md) |
| 2 | UI Primitives | 4 | Completed | [02-ui-primitives/issues.md](./02-ui-primitives/issues.md) |
| 3 | Shared Components | 59 | Completed | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| 4 | Hooks | 9 | Completed | [04-hooks/issues.md](./04-hooks/issues.md) |
| 5 | Utilities | 69 | Completed | [05-utilities/issues.md](./05-utilities/issues.md) |
| 6 | API Routes | 60 | Completed | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| 7 | State & Context | 5 | Completed | [07-state-context/issues.md](./07-state-context/issues.md) |
| 8 | Authentication | 12 | Completed | [08-authentication/issues.md](./08-authentication/issues.md) |
| 9 | Middleware | 10 | Completed | [09-middleware/issues.md](./09-middleware/issues.md) |
| 10 | Types | 4 | Completed | [10-types/issues.md](./10-types/issues.md) |
| 11 | Configuration | 8 | Completed | [11-configuration/issues.md](./11-configuration/issues.md) |

---

## Critical Issues (33)

These issues cause crashes, data loss, or complete feature failure:

| ID | Title | Phase | File |
|----|-------|-------|------|
| P1-BUG-001 | Vote Fetching Missing User Filter | Page Components | [issues/01-page-components/issues.md](./01-page-components/issues.md) |
| P1-BRK-001 | Missing Confirm Password Field in Register Form | Page Components | [issues/01-page-components/issues.md](./01-page-components/issues.md) |
| P1-BRK-002 | Missing OptimisticChatsProvider | Page Components | [issues/01-page-components/issues.md](./01-page-components/issues.md) |
| P1-BRK-003 | Missing SettingsProvider in Chat Layout | Page Components | [issues/01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-001 | Missing Analytics Components | Page Components | [issues/01-page-components/issues.md](./01-page-components/issues.md) |
| P4-BUG-001 | Missing Server Persistence in use-chat-visibility | Hooks | [issues/04-hooks/issues.md](./04-hooks/issues.md) |
| P4-BRK-001 | Missing Hook - use-optimistic-chats | Hooks | [issues/04-hooks/issues.md](./04-hooks/issues.md) |
| P5-BRK-001 | Missing `chat-completion.ts` - Core Chat Execution | Utilities | [issues/05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-002 | Missing `prompts.ts` - System Prompts | Utilities | [issues/05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-003 | Missing `title-generation.ts` - Chat Title Generation | Utilities | [issues/05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-004 | Missing `tools/` Directory - AI Tool Definitions | Utilities | [issues/05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-005 | Missing Guest User Cache-Only Data Strategy | Utilities | [issues/05-utilities/issues.md](./05-utilities/issues.md) |
| P6-BRK-001 | Missing AI Execution in Chat POST Route | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-002 | Missing Streaming Response in Chat POST Route | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-003 | Code Handler Uses Placeholder Model String | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-004 | Text Handler Uses Placeholder Model String | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-005 | Sheet Handler Uses Placeholder Model String | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-006 | GET Returns Single Artifact Instead of Version Array | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P9-FNC-001 | Missing Request Deduplication System | Middleware | [issues/09-middleware/issues.md](./09-middleware/issues.md) |
| P10-FNC-001 | Missing Comprehensive Message Parts Type System | Types | [issues/10-types/issues.md](./10-types/issues.md) |
| P10-FNC-002 | Missing AI Model Catalog Types | Types | [issues/10-types/issues.md](./10-types/issues.md) |
| P10-BRK-001 | Missing Cache Entity Types | Types | [issues/10-types/issues.md](./10-types/issues.md) |

---

## High Priority Issues (68)

These issues significantly degrade user experience or create security concerns:

| ID | Title | Phase | File |
|----|-------|-------|------|
| P3-BUG-001 | Chat Component Missing fetchWithErrorHandlers | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-002 | Chat Component Missing Data Stream Handlers | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-003 | Messages Component Missing useDataStream Hook | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-004 | Messages Component Missing Auto-Scroll Setting Check | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-005 | Message Component Missing Tool Implementations | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-006 | Missing ChevronUp Icon in Dropdown Trigger | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-007 | Missing SWR Cache Clearing on Logout | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-008 | Missing Supabase Client signOut Call | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-009 | Missing isNewSession Optimization | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-010 | Manual "Load More" Button Instead of Infinite Scroll | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-011 | Missing Chat Deduplication by ID | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-001 | Missing Virtuoso Virtualization in Messages | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-002 | Missing Virtuoso Virtualization in SidebarHistory | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-003 | Missing ArtifactMessages Component | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-004 | Missing Artifact Class/Registration System | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-005 | Missing MultimodalInput in Artifact Panel | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-006 | Missing Toolbar in Artifact Panel | Shared Components | [issues/03-shared-components/issues.md](./03-shared-components/issues.md) |
| P4-BUG-002 | Missing Error Handling in use-chat-visibility | Hooks | [issues/04-hooks/issues.md](./04-hooks/issues.md) |
| P5-BUG-001 | Missing Circuit Breaker for Redis Failures | Utilities | [issues/05-utilities/issues.md](./05-utilities/issues.md) |
| P6-FNC-001 | Missing DELETE Endpoint for Chat Route | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-002 | Missing Settings Support in Schema | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-003 | Missing File Part Validation in Schema | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-004 | Missing Cursor-Based Pagination in Messages | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-005 | Missing Stream Reconnection Logic | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-006 | Missing Rate Limiting in Artifact Routes | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-007 | Missing CSRF Protection in Guest POST | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-008 | Missing Open Redirect Protection in Guest GET | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-009 | Missing Ownership Verification in Artifact Routes | API Routes | [issues/06-api-routes/issues.md](./06-api-routes/issues.md) |
| P7-FNC-001 | Missing Supabase Auth State Change Listener | State & Context | [issues/07-state-context/issues.md](./07-state-context/issues.md) |
| P8-FNC-001 | Missing Auth Client Module | Authentication | [issues/08-authentication/issues.md](./08-authentication/issues.md) |
| P8-FNC-002 | Guest Session Uses Unsigned Cookies Instead of JWT | Authentication | [issues/08-authentication/issues.md](./08-authentication/issues.md) |
| P8-FNC-003 | Missing Rate Limiting in Auth Guards | Authentication | [issues/08-authentication/issues.md](./08-authentication/issues.md) |
| P8-FNC-004 | Missing CSRF Protection in Guest Route POST | Authentication | [issues/08-authentication/issues.md](./08-authentication/issues.md) |
| P8-FNC-005 | Missing Open Redirect Protection in Guest GET | Authentication | [issues/08-authentication/issues.md](./08-authentication/issues.md) |
| P9-FNC-002 | Missing Multiple Rate Limiting Algorithms | Middleware | [issues/09-middleware/issues.md](./09-middleware/issues.md) |
| P9-FNC-005 | Missing In-Flight Request Tracking | Middleware | [issues/09-middleware/issues.md](./09-middleware/issues.md) |
| P9-FNC-008 | Missing Fail-Closed Mode for Auth Rate Limiting | Middleware | [issues/09-middleware/issues.md](./09-middleware/issues.md) |
| P9-FNC-010 | Upload Rate Limit Changed from Hourly to Per-Minute | Middleware | [issues/09-middleware/issues.md](./09-middleware/issues.md) |
| P10-FNC-003 | Missing Zod Schema for Message Metadata | Types | [issues/10-types/issues.md](./10-types/issues.md) |

---

## Summary & Trends

### Critical Areas Requiring Immediate Attention

1. **Authentication System** - Registration completely broken due to missing confirmPassword field; Guest sessions use unsigned cookies (security risk)
2. **Chat Core Functionality** - Missing providers (OptimisticChatsProvider, SettingsProvider), broken streaming
3. **Artifact System** - Multiple missing components (ArtifactMessages, Toolbar, artifact type definitions)
4. **Sidebar Performance** - Missing virtualization causing performance issues with large datasets
5. **Security Vulnerabilities** - Vote fetching exposes all votes; Open redirect in guest GET; Missing CSRF in guest POST; Unsigned guest cookies
6. **AI Utilities** - Missing core modules (chat-completion.ts, prompts.ts, title-generation.ts, tools/)
7. **Guest User Experience** - Missing cache-only data strategy for guest users
8. **File Upload** - Missing file validation utilities (security risk)
9. **API Routes** - Missing AI execution, streaming responses, and placeholder model strings in artifact handlers
10. **Rate Limiting** - Missing rate limiting in guest route and auth guards

### Common Patterns

- **Placeholder Code**: Many components have placeholder implementations instead of full functionality
- **Missing Integrations**: Components exist but aren't integrated (MessageEditor, MessageActions, etc.)
- **Provider Gaps**: Missing context providers break optimistic updates and settings persistence
- **Virtualization Removed**: Performance-critical virtualization (Virtuoso) removed from Messages and SidebarHistory
- **Animation Loss**: Framer Motion animations removed throughout, degrading UX polish
- **Missing Core Modules**: Several core utility modules completely missing (AI tools, prompts, file validation)
- **Error Architecture Change**: Different error class structure requires migration or adapter
- **Rate Limiting Gaps**: Many API routes missing rate limiting protection
- **Security Vulnerabilities**: Missing CSRF protection, open redirect protection, ownership verification

### Migration Completeness by Area

| Area | Completeness | Notes |
|------|--------------|-------|
| Page Components | ~60% | Missing loading/error states, providers |
| UI Primitives | ~95% | Minor accessibility concerns |
| Chat Components | ~40% | Major functionality gaps |
| Sidebar Components | ~50% | Missing virtualization, optimistic updates |
| Artifact Components | ~30% | Core features missing |
| Hooks | ~70% | Missing use-optimistic-chats |
| Core Utilities | ~50% | Missing fetcher, message utils, file validation |
| AI Utilities | ~30% | Missing chat-completion, prompts, tools |
| API Utilities | ~60% | Missing route-specific guards |
| Data Layer | ~70% | Missing guest strategy, batch operations |
| Cache Layer | ~75% | Missing circuit breaker, ZSET optimization |
| Auth Utilities | ~80% | Different provider (NextAuth vs Supabase) |
| Database Layer | ~65% | Missing batch operations, pagination |
| Middleware Layer | ~50% | Missing deduplication, edge rate limiting |
| Rate Limit Module | ~60% | Different API, missing algorithms |
| API Routes | ~40% | Missing AI execution, streaming, rate limiting |
| Server Actions | ~50% | Missing trailing messages delete, visibility update |

---

## Priority Action Items

### Must Fix (Critical) - 33 Items

1. Add confirmPassword field to AuthForm - Registration broken
2. Add userId filter to vote fetching - Security vulnerability
3. Add OptimisticChatsProvider - Sidebar UX broken
4. Add SettingsProvider - Settings persistence broken
5. Add Analytics components - Production monitoring missing
6. Complete Chat component implementation
7. Add Virtuoso virtualization to Messages
8. Add Virtuoso virtualization to SidebarHistory
9. Integrate optimistic chats in SidebarHistory
10. Add chat-title-updated event listener
11. Create ArtifactMessages component
12. Implement Artifact class/registration system
13. Add MultimodalInput to artifact panel
14. Add Toolbar to artifact panel
15. Create `lib/ai/chat-completion.ts` - Core chat execution missing
16. Create `lib/ai/prompts.ts` - System prompts missing
17. Create `lib/ai/title-generation.ts` - Title generation missing
18. Create `lib/ai/tools/` directory - AI tools missing
19. Implement `fetcher` function for SWR
20. Implement `fetchWithErrorHandlers` function
21. Implement `convertToUIMessages` function
22. Create file validation utilities module
23. Implement guest-aware data strategy in repositories
24. Migrate error handling to new `AppError` system or create adapter
25. Add circuit breaker for Redis failures
26. Create `lib/utils/message.ts` with message utilities
27. Implement AI execution in chat POST route - Chat non-functional
28. Implement streaming response in chat POST route - No real-time responses
29. Fix code handler placeholder model string - Artifact generation broken
30. Fix text handler placeholder model string - Artifact generation broken
31. Fix sheet handler placeholder model string - Artifact generation broken
32. Fix artifact GET endpoint to return version array - Version history broken
33. Migrate request deduplication system - Race conditions not prevented

### Should Fix (High) - 68 Items

See individual phase files for detailed high-priority items.

### Nice to Have (Medium) - 104 Items

See individual phase files for detailed medium-priority items.

---

## Phase 8 Highlights (Authentication)

### High Severity (5 issues)
- Guest session uses unsigned cookies instead of JWT - Security vulnerability
- Missing CSRF protection in guest route POST - CSRF vulnerability
- Missing rate limiting in guest route - No abuse protection
- Missing open redirect protection in guest GET - Open redirect vulnerability (CWE-601)
- Missing rate limiting integration in auth guards - No programmatic rate control

### Medium Severity (4 issues)
- Missing auth client module for client-side operations
- Missing `requireResource` guard function
- Missing `ForRoute` guard variants for API routes
- Missing DataContext in AuthResult return type

### Low Severity (3 issues)
- Missing logging in guest route
- Missing maxDuration configuration
- Different error types used (architectural decision)

### Improvement Only (3 issues)
- NEW: Higher-order guard functions (`withAuth`, `withOwnership`)
- NEW: Chat-specific authorization functions
- NEW: Session context helper for repository pattern

---

## Phase 6 Highlights (API Routes)

### Broken Code (6 issues)
- Missing AI execution in chat POST route - Chat completely non-functional
- Missing streaming response in chat POST route - No real-time AI responses
- Code handler uses placeholder model string - Artifact generation broken
- Text handler uses placeholder model string - Artifact generation broken
- Sheet handler uses placeholder model string - Artifact generation broken
- GET returns single artifact instead of version array - Version history broken

### Functional Discrepancies (50 issues)
- Missing DELETE endpoint for chat route
- Missing settings support in chat schema
- Missing file part validation in schema
- Missing cursor-based pagination in messages
- Missing stream reconnection logic
- Missing rate limiting across multiple routes (artifacts, guest, logout, file upload, history, suggestions, votes)
- Missing CSRF protection in guest POST
- Missing open redirect protection in guest GET
- Missing ownership verification across multiple routes
- Missing guest user handling in suggestions and votes
- HTTP method change for voting (PATCH -> POST)
- Missing deleteTrailingMessages action
- Missing updateChatVisibility action
- Different title generation signature (no AI-based titles)
- Missing centralized AI prompts in handlers

### Bugs (1 issue)
- Incomplete rejectSuggestion implementation

### Improvement Only (3 issues)
- New GET endpoint for votes (enhancement)
- Architectural refactoring of createDocumentHandler
- New image handler (enhancement)

---

## Phase 5 Highlights (Utilities)

### Broken Code (5 issues)
- Missing `chat-completion.ts` - Core chat execution
- Missing `prompts.ts` - System prompts
- Missing `title-generation.ts` - Chat title generation
- Missing `tools/` directory - AI tool definitions
- Missing guest user cache-only data strategy

### Functional Discrepancies (63 issues)
- Missing utility functions (fetcher, generateUUID, message utils)
- Missing error handling helpers (toDatabaseError, visibilityBySurface)
- Missing AI configuration (constants, entitlements, model discovery)
- Missing API guards (rate limit, ownership, resource helpers)
- Missing data layer operations (saveWithContext, deleteAfterTimestamp)
- Missing cache optimizations (ZSET storage, cache warming)
- Auth provider change (Supabase vs NextAuth)
- Missing database utilities (batch operations, pagination)
- Missing middleware (deduplication, edge rate limiting)
- Different rate limiter API

### Bugs (1 issue)
- Missing circuit breaker for Redis failures

---

## Phase 9 Highlights (Middleware)

### Critical (1 issue)
- Missing request deduplication system - Race conditions not prevented

### High (4 issues)
- Missing multiple rate limiting algorithms
- Missing in-flight request tracking
- Missing fail-closed mode for auth rate limiting
- Upload rate limit changed from hourly to per-minute

### Medium (5 issues)
- Missing OpenTelemetry integration in rate limiting
- Missing granular rate limit configuration presets
- Missing response caching for duplicate requests
- Missing request fingerprinting utility
- Missing AUTH_EXCHANGE and AUTH_GUEST rate limiters

### Improvements (3 issues)
- New root middleware architecture
- New middleware composition system
- Simplified rate limiter using @upstash/ratelimit

---

## Phase 10 Highlights (Types)

### Critical (3 issues)
- Missing comprehensive message parts type system
- Missing AI model catalog types
- Missing cache entity types

### High (1 issue)
- Missing Zod schema for message metadata

---

## Archived Source

The partial comparison document has been archived as [`mismatch.md.archive`](../mismatch.md.archive).
