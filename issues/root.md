# Issue Tracker - Master Index

**Last Updated:** 2026-02-16T23:59:00Z

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

| Category | Code | Definition |
|----------|------|------------|
| UI Inconsistencies | UI | Visual differences, missing animations, styling discrepancies between old and new implementations |
| Bugs | BUG | Functional errors, incorrect behavior, missing error handling |
| Broken Code | BRK | Incomplete implementations, missing integrations, placeholder code that doesn't work |
| Functional Discrepancies | FNC | Behavioral differences, missing features, changed flows |
| Improvement Only | IMP | Changes that are enhancements in the new app, not issues requiring fixes |

---

## Running Totals

**Total Issues: 274**

### By Severity

| Severity | Count |
|----------|-------|
| Critical | 35 |
| High | 78 |
| Medium | 93 |
| Low | 31 |
| N/A (Improvements / Resolved) | 37 |

### By Category

| Category | Count |
|----------|-------|
| UI Inconsistencies | 9 |
| Bugs | 27 |
| Broken Code | 40 |
| Functional Discrepancies | 153 |
| Improvement Only | 45 |

---

## Phase Index

| Phase | Name | Issue Count | Status | Link |
|-------|------|-------------|--------|------|
| 1 | Page Components | 35 | Not Started | [01-page-components/issues.md](./01-page-components/issues.md) |
| 2 | UI Primitives | 4 | Not Started | [02-ui-primitives/issues.md](./02-ui-primitives/issues.md) |
| 3 | Shared Components | 59 | Not Started | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| 4 | Hooks | 9 | Not Started | [04-hooks/issues.md](./04-hooks/issues.md) |
| 5 | Utilities | 60 | Not Started | [05-utilities/issues.md](./05-utilities/issues.md) |
| 6 | API Routes | 60 | Not Started | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| 7 | State & Context | 5 | Not Started | [07-state-context/issues.md](./07-state-context/issues.md) |
| 8 | Authentication | 16 | Not Started | [08-authentication/issues.md](./08-authentication/issues.md) |
| 9 | Middleware | 14 | Not Started | [09-middleware/issues.md](./09-middleware/issues.md) |
| 10 | Types | 4 | Not Started | [10-types/issues.md](./10-types/issues.md) |
| 11 | Configuration | 8 | Not Started | [11-configuration/issues.md](./11-configuration/issues.md) |

---

## Critical Issues (35)

These issues cause crashes, data loss, or complete feature failure:

| ID | Title | Phase | Link |
|----|-------|-------|------|
| P1-BUG-001 | Vote Fetching Missing User Filter | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-BRK-001 | Missing Confirm Password Field in Register Form | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-BRK-002 | Missing OptimisticChatsProvider | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-BRK-003 | Missing SettingsProvider in Chat Layout | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-001 | Missing Analytics Components | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P3-BRK-001 | Chat Component Missing Core Functionality | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-002 | Messages Component Missing Virtualization | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-003 | Missing Virtualization (GroupedVirtuoso) in SidebarHistory | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-004 | Missing Optimistic Chats Integration in SidebarHistory | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-005 | Missing Chat Title Update Event Listener | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-006 | Missing ArtifactMessages Component | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-007 | Missing Artifact Class Definition | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-008 | Missing MultimodalInput in Artifact Panel | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-009 | Missing Toolbar Component in Artifact Panel | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P4-BUG-001 | Missing Server Persistence in use-chat-visibility | Hooks | [04-hooks/issues.md](./04-hooks/issues.md) |
| P4-BRK-001 | Missing Hook - use-optimistic-chats | Hooks | [04-hooks/issues.md](./04-hooks/issues.md) |
| P5-BRK-001 | Missing `chat-completion.ts` - Core Chat Execution | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-002 | Missing `prompts.ts` - System Prompts | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-003 | Missing `title-generation.ts` - Chat Title Generation | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-004 | Missing `tools/` Directory - AI Tool Definitions | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-BRK-005 | Missing Guest User Cache-Only Data Strategy | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-001 | Missing `fetcher` Function - SWR Data Fetcher | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-002 | Missing `fetchWithErrorHandlers` Function | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-010 | Missing `ChatSDKError` Class - Different Error Architecture | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-017 | Missing File Attachment Validation Utilities | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P6-BRK-001 | Missing AI Execution in Chat POST Route | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-002 | Missing Streaming Response in Chat POST Route | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-003 | Code Handler Uses Placeholder Model String | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-004 | Text Handler Uses Placeholder Model String | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-005 | Sheet Handler Uses Placeholder Model String | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-BRK-006 | GET Returns Single Artifact Instead of Version Array | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P9-FNC-001 | Missing Request Deduplication System | Middleware | [09-middleware/issues.md](./09-middleware/issues.md) |
| P10-BRK-001 | Missing Cache Entity Types | Types | [10-types/issues.md](./10-types/issues.md) |
| P10-FNC-001 | Missing Comprehensive Message Parts Type System | Types | [10-types/issues.md](./10-types/issues.md) |
| P10-FNC-002 | Missing AI Model Catalog Types | Types | [10-types/issues.md](./10-types/issues.md) |

---

## High Priority Issues (78)

These issues significantly degrade user experience or create security concerns:

| ID | Title | Phase | Link |
|----|-------|-------|------|
| P1-FNC-002 | Missing head.tsx with Resource Hints | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-003 | Missing Email Confirmation Flow in Register | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-004 | Different Post-Login Redirect Path | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-005 | Different Post-Registration Redirect Path | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-006 | Missing Pyodide Script for Python Code Execution | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-007 | Missing Notice Toast Handler | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-008 | Missing loading.tsx for Chat Route | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-009 | Missing error.tsx for Chat Route | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-010 | Missing loading.tsx for Chat [id] Route | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P1-FNC-011 | Missing "Go Home" Navigation in Error Boundary | Page Components | [01-page-components/issues.md](./01-page-components/issues.md) |
| P3-BUG-001 | Chat Component Missing fetchWithErrorHandlers | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-002 | Chat Component Missing Data Stream Handlers | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-003 | Messages Component Missing useDataStream Hook | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-004 | Messages Component Missing Auto-Scroll Setting Check | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-005 | Message Component Missing Tool Implementations | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-006 | Missing ChevronUp Icon in Dropdown Trigger | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-007 | Missing SWR Cache Clearing on Logout | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-008 | Missing Supabase Client signOut Call | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-009 | Missing isNewSession Optimization | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-010 | Manual "Load More" Button Instead of Infinite Scroll | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BUG-011 | Missing Chat Deduplication by ID | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-010 | Missing Artifact Type Definitions | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-011 | Missing VersionFooter Component Integration | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-012 | Missing AnimatePresence and Motion Animations | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-013 | Missing useWindowSize Hook in Artifact Panel | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-014 | Missing useSidebar Hook Integration in Artifact Panel | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P3-BRK-015 | Missing Artifact Actions Implementation | Shared Components | [03-shared-components/issues.md](./03-shared-components/issues.md) |
| P4-BUG-002 | Missing Error Handling in use-chat-visibility | Hooks | [04-hooks/issues.md](./04-hooks/issues.md) |
| P5-BUG-001 | Missing Circuit Breaker for Redis Failures | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-003 | Missing `generateUUID` Function | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-004 | Missing `getMostRecentUserMessage` Function | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-011 | Missing `toDatabaseError` Helper Function | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-012 | Missing `mapPostgresCodeToError` Function | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-018 | Missing `constants.ts` - AI Configuration Constants | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-019 | Missing `entitlements.ts` - User Model Entitlements | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-020 | Missing `model-discovery.ts` - Dynamic Model Discovery | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-021 | Missing `model-catalog-types.ts` - Model Metadata Types | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-023 | Missing Reasoning Model Support in providers.ts | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-025 | Missing Cloudflare AI Gateway Support | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-026 | Missing Cloudflare Workers AI Support | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-030 | Missing `requireAuth` and `requireAuthForRoute` Functions | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-031 | Missing `requireRateLimit` and `requireRateLimitForRoute` Functions | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-037 | Missing `saveWithContext` Optimized Batch Operation | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-038 | Missing `deleteAfterTimestamp` for Message Regeneration | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-044 | Different Authentication Provider (Supabase vs NextAuth) | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-048 | Missing `batch.ts` - Batch Operations Module | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-049 | Missing `pagination.ts` - Cursor-Based Pagination | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-055 | Missing `deduplication.ts` - Request Deduplication | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-058 | Missing `rate-limit.ts` - Full Rate Limiting Module | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P5-FNC-062 | Upload Rate Limit Window Changed | Utilities | [05-utilities/issues.md](./05-utilities/issues.md) |
| P6-FNC-001 | Missing DELETE Endpoint for Chat Route | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-002 | Missing Settings Support in Schema | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-003 | Missing File Part Validation in Schema | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-008 | Missing Cursor-Based Pagination | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-011 | Missing Stream Reconnection Logic | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-014 | Missing Timestamp-Based DELETE for Rollback | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-015 | Missing Rate Limiting in Artifact Routes | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-023 | Missing CSRF Protection in Guest POST Route | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-024 | Missing Rate Limiting in Guest Route | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-025 | Missing Open Redirect Protection in Guest GET Route | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-029 | Missing Rate Limiting in File Upload | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-032 | Missing Rate Limiting in History Route | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-036 | Missing Document Ownership Verification in Suggestions | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-040 | HTTP Method Change for Voting | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-043 | Missing Chat Ownership Verification in Votes | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-045 | Missing deleteTrailingMessages Action | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P6-FNC-046 | Missing updateChatVisibility Action | API Routes | [06-api-routes/issues.md](./06-api-routes/issues.md) |
| P7-FNC-001 | Missing Supabase Auth State Change Listener | State & Context | [07-state-context/issues.md](./07-state-context/issues.md) |
| P8-BUG-001 | Guest Session Uses Unsigned Cookies Instead of JWT | Authentication | [08-authentication/issues.md](./08-authentication/issues.md) |
| P8-BUG-002 | Missing CSRF Protection in Guest Route | Authentication | [08-authentication/issues.md](./08-authentication/issues.md) |
| P8-BUG-003 | Missing Open Redirect Protection in Guest GET Handler | Authentication | [08-authentication/issues.md](./08-authentication/issues.md) |
| P8-FNC-003 | Missing Rate Limiting in Auth Guards | Authentication | [08-authentication/issues.md](./08-authentication/issues.md) |
| P8-FNC-005 | Missing Rate Limiting in Guest Route | Authentication | [08-authentication/issues.md](./08-authentication/issues.md) |
| P9-BUG-001 | Missing Fail-Closed Mode for Auth Rate Limiting in Root Middleware | Middleware | [09-middleware/issues.md](./09-middleware/issues.md) |
| P9-FNC-002 | Missing Multiple Rate Limiting Algorithms | Middleware | [09-middleware/issues.md](./09-middleware/issues.md) |
| P9-FNC-005 | Missing In-Flight Request Tracking | Middleware | [09-middleware/issues.md](./09-middleware/issues.md) |
| P9-FNC-009 | Upload Rate Limit Changed from Hourly to Per-Minute | Middleware | [09-middleware/issues.md](./09-middleware/issues.md) |
| P10-FNC-003 | Missing Zod Schema for Message Metadata | Types | [10-types/issues.md](./10-types/issues.md) |

---

## Summary & Trends

### Critical Areas Requiring Immediate Attention

1. **Authentication System** — Registration completely broken due to missing confirmPassword field; Guest sessions use unsigned cookies (security risk)
2. **Chat Core Functionality** — Missing providers (OptimisticChatsProvider, SettingsProvider), broken streaming, missing core chat component functionality
3. **Artifact System** — Multiple missing components (ArtifactMessages, Toolbar, artifact type definitions, class definitions)
4. **Sidebar Performance** — Missing virtualization causing performance issues with large datasets
5. **Security Vulnerabilities** — Vote fetching exposes all votes; Open redirect in guest GET; Missing CSRF in guest POST; Unsigned guest cookies; Missing ownership verification
6. **AI Utilities** — Missing core modules (chat-completion.ts, prompts.ts, title-generation.ts, tools/)
7. **Guest User Experience** — Missing cache-only data strategy for guest users
8. **File Upload** — Missing file validation utilities (security risk)
9. **API Routes** — Missing AI execution, streaming responses, and placeholder model strings in artifact handlers
10. **Rate Limiting** — Missing rate limiting in guest route, auth guards, artifact routes, file upload, history, suggestions, and votes
11. **Type System** — Missing comprehensive message parts types, AI model catalog types, and cache entity types

### Common Patterns

- **Placeholder Code**: Many components have placeholder implementations instead of full functionality
- **Missing Integrations**: Components exist but aren't integrated (MessageEditor, MessageActions, etc.)
- **Provider Gaps**: Missing context providers break optimistic updates and settings persistence
- **Virtualization Removed**: Performance-critical virtualization (Virtuoso) removed from Messages and SidebarHistory
- **Animation Loss**: Framer Motion animations removed throughout, degrading UX polish
- **Missing Core Modules**: Several core utility modules completely missing (AI tools, prompts, file validation)
- **Error Architecture Change**: Different error class structure (`ChatSDKError` → `AppError`) requires migration or adapter
- **Rate Limiting Gaps**: Many API routes missing rate limiting protection
- **Security Vulnerabilities**: Missing CSRF protection, open redirect protection, ownership verification
- **Type Safety Gaps**: Missing message parts type system, cache entity types, and model catalog types

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
| Type Definitions | ~40% | Missing message parts, model catalog, cache entity types |

---

## Priority Action Items

### Must Fix (Critical) — 35 Items

1. **P1-BUG-001** — Add userId filter to vote fetching — Security vulnerability
2. **P1-BRK-001** — Add confirmPassword field to AuthForm — Registration broken
3. **P1-BRK-002** — Add OptimisticChatsProvider — Sidebar UX broken
4. **P1-BRK-003** — Add SettingsProvider — Settings persistence broken
5. **P1-FNC-001** — Add Analytics components — Production monitoring missing
6. **P3-BRK-001** — Complete Chat component core functionality
7. **P3-BRK-002** — Add Virtuoso virtualization to Messages
8. **P3-BRK-003** — Add GroupedVirtuoso virtualization to SidebarHistory
9. **P3-BRK-004** — Integrate optimistic chats in SidebarHistory
10. **P3-BRK-005** — Add chat-title-updated event listener
11. **P3-BRK-006** — Create ArtifactMessages component
12. **P3-BRK-007** — Implement Artifact class/registration system
13. **P3-BRK-008** — Add MultimodalInput to artifact panel
14. **P3-BRK-009** — Add Toolbar to artifact panel
15. **P4-BUG-001** — Add server persistence to use-chat-visibility
16. **P4-BRK-001** — Create use-optimistic-chats hook
17. **P5-BRK-001** — Create `lib/ai/chat-completion.ts` — Core chat execution missing
18. **P5-BRK-002** — Create `lib/ai/prompts.ts` — System prompts missing
19. **P5-BRK-003** — Create `lib/ai/title-generation.ts` — Title generation missing
20. **P5-BRK-004** — Create `lib/ai/tools/` directory — AI tools missing (3 of 4 tools have reduced capabilities)
21. **P5-BRK-005** — Implement guest-aware data strategy in repositories
22. **P5-FNC-001** — Implement `fetcher` function for SWR
23. **P5-FNC-002** — Implement `fetchWithErrorHandlers` function
24. **P5-FNC-010** — Migrate error handling to new `AppError` system or create adapter
25. **P5-FNC-017** — Create file attachment validation utilities module
26. **P6-BRK-001** — Implement AI execution in chat POST route — Chat non-functional
27. **P6-BRK-002** — Implement streaming response in chat POST route — No real-time responses
28. **P6-BRK-003** — Fix code handler placeholder model string — Artifact generation broken
29. **P6-BRK-004** — Fix text handler placeholder model string — Artifact generation broken
30. **P6-BRK-005** — Fix sheet handler placeholder model string — Artifact generation broken
31. **P6-BRK-006** — Fix artifact GET endpoint to return version array — Version history broken
32. **P9-FNC-001** — Migrate request deduplication system — Race conditions not prevented
33. **P10-BRK-001** — Create cache entity types — No type safety for cached data
34. **P10-FNC-001** — Create comprehensive message parts type system — 12 part types missing
35. **P10-FNC-002** — Create AI model catalog types — Reasoning model support missing

### Should Fix (High) — 78 Items

See individual phase files for detailed high-priority items.

### Nice to Have (Medium) — 93 Items

See individual phase files for detailed medium-priority items.

---

## Phase Highlights

### Phase 1 — Page Components (35 issues)

- **Critical (5):** Missing user filter on vote fetching, broken registration form, missing OptimisticChatsProvider, missing SettingsProvider, missing analytics
- **High (10):** Missing loading/error states, email confirmation flow, toast handlers, resource hints

### Phase 2 — UI Primitives (4 issues)

- **Medium (1):** Separator implementation changed
- **Improvements (3):** Card, Skeleton, and DropdownMenu enhancements

### Phase 3 — Shared Components (59 issues)

- **Critical (9):** Missing core Chat functionality, virtualization removed from Messages and SidebarHistory, missing artifact components (ArtifactMessages, Class Definition, MultimodalInput, Toolbar)
- **High (17):** Missing fetchWithErrorHandlers, data stream handlers, tool implementations, SWR cache management, artifact type definitions and integrations

### Phase 4 — Hooks (9 issues)

- **Critical (2):** Missing server persistence in use-chat-visibility, missing use-optimistic-chats hook
- **High (1):** Missing error handling in use-chat-visibility

### Phase 5 — Utilities (60 issues, excluding 15 false positives)

- **Critical (9):** Missing chat-completion.ts, prompts.ts, title-generation.ts, tools/ directory, guest data strategy, fetcher, fetchWithErrorHandlers, ChatSDKError migration, file validation
- **High (22):** Missing circuit breaker, utility functions, AI configuration, API guards, batch operations, pagination, rate limiting modules

### Phase 6 — API Routes (60 issues)

- **Critical (6):** Missing AI execution and streaming in chat POST, placeholder model strings in all 3 artifact handlers, incorrect GET response format
- **High (17):** Missing DELETE endpoint, settings support, cursor-based pagination, stream reconnection, rate limiting across 6 routes, CSRF/redirect protection, ownership verification, missing server actions

### Phase 7 — State & Context (5 issues)

- **High (1):** Missing Supabase auth state change listener for multi-tab sync
- **Medium (2):** Missing artifact auto-visibility logic, suggestion metadata accumulation

### Phase 8 — Authentication (16 issues, including 2 false positives)

- **High (5):** Guest session uses unsigned cookies (security), missing CSRF protection, missing open redirect protection, missing rate limiting in auth guards and guest route
- **Medium (2):** Missing requireResource guard, missing DataContext in AuthResult

### Phase 9 — Middleware (14 issues)

- **Critical (1):** Missing request deduplication system
- **High (4):** Missing fail-closed mode, multiple rate limiting algorithms, in-flight request tracking, upload rate limit window change
- **Improvements (3):** New root middleware architecture, composition system, simplified rate limiter

### Phase 10 — Types (4 issues)

- **Critical (3):** Missing comprehensive message parts type system (415 lines), missing AI model catalog types, missing cache entity types
- **High (1):** Missing Zod schema for message metadata

### Phase 11 — Configuration (8 issues)

- **Medium (1):** Missing instrumentation-client.ts
- **Low (1):** Test script missing PLAYWRIGHT env variable
- **Improvements (6):** Test directory changes, removed deprecated dependencies, Biome migration

---

## Archived Source

The partial comparison document has been archived as [`mismatch.md.archive`](../mismatch.md.archive).
