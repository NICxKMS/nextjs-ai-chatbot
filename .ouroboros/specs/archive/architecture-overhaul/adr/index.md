# Architecture Decision Records - Auth/Session Implementation

> **Reference**: ARCH-001  
> **Date**: 2024-12-23  
> **Scope**: Session management, authentication, caching, and security optimizations

## Overview

This directory contains Architecture Decision Records (ADRs) documenting key technical decisions made during the auth/session implementation overhaul. Each ADR follows a standard format capturing context, decision, consequences, and alternatives considered.

## ADR Index

| ADR                                                        | Title                                  | Status   | Category     |
| ---------------------------------------------------------- | -------------------------------------- | -------- | ------------ |
| [ADR-001](ADR-001-edge-middleware-session-creation.md)     | Edge Middleware Session Creation       | Accepted | Performance  |
| [ADR-002](ADR-002-jwt-audience-claim-token-isolation.md)   | JWT Audience Claim for Token Isolation | Accepted | Security     |
| [ADR-003](ADR-003-constant-time-comparison-security.md)    | Constant-Time Comparison for Security  | Accepted | Security     |
| [ADR-004](ADR-004-guest-to-auth-data-migration.md)         | Guest-to-Auth Data Migration           | Accepted | Data         |
| [ADR-005](ADR-005-centralized-rate-limit-configuration.md) | Centralized Rate Limit Configuration   | Accepted | Architecture |
| [ADR-006](ADR-006-session-cache-strategy.md)               | Session Cache Strategy (30s TTL)       | Accepted | Performance  |
| [ADR-007](ADR-007-cache-prewarming-strategy.md)            | Cache Prewarming Strategy              | Accepted | Performance  |
| [ADR-008](ADR-008-ppr-session-handling.md)                 | PPR-Compatible Session Handling        | Accepted | Performance  |

## Category Summary

### Performance (PERF)

- **ADR-001**: Eliminated 100-200ms client-side waterfall by moving guest session creation to edge middleware
- **ADR-006**: Reduced Supabase calls by 95% with Redis session cache (30s TTL)
- **ADR-007**: Eliminated cold-start latency with proactive cache prewarming after auth
- **ADR-008**: PPR-compatible session handling using `connection()` pattern

### Security (SEC)

- **ADR-002**: Added JWT audience claim to prevent token confusion across applications
- **ADR-003**: Implemented edge-compatible constant-time comparison to prevent timing attacks

### Architecture (CLN)

- **ADR-005**: Consolidated rate limit configuration into single source of truth

### Data (SEC)

- **ADR-004**: Atomic migration of guest data to authenticated user on sign-up

## Key Files Reference

| File                                  | Related ADRs     | Purpose                                     |
| ------------------------------------- | ---------------- | ------------------------------------------- |
| `middleware.ts`                       | ADR-001, ADR-002 | Edge middleware with guest session creation |
| `lib/auth/constants.ts`               | ADR-002          | JWT configuration including audience        |
| `lib/utils/timing-safe.ts`            | ADR-003          | Constant-time string comparison             |
| `lib/data/migrate-guest.ts`           | ADR-004          | Guest-to-auth migration logic               |
| `lib/middleware/rate-limit-config.ts` | ADR-005          | Centralized rate limit configuration        |
| `lib/auth/session-cache.ts`           | ADR-006          | Redis session validation cache              |
| `lib/cache-ops/prewarm.ts`            | ADR-007          | Cache prewarming utilities                  |
| `lib/auth/session.ts`                 | ADR-008          | PPR-compatible session functions            |
| `app/(chat)/layout.tsx`               | ADR-008          | Chat layout with connection() pattern       |

## Issue/Ticket References

| Issue    | ADRs    | Description                     |
| -------- | ------- | ------------------------------- |
| PERF-001 | ADR-001 | Guest session creation at edge  |
| SEC-003  | ADR-004 | Guest-to-auth session migration |
| SEC-004  | ADR-002 | JWT audience claim              |
| SEC-005  | ADR-003 | Constant-time comparison        |
| NET-002  | ADR-006 | Session validation caching      |
| CLN-003  | ADR-005 | Rate limit consolidation        |
| PPR-001  | ADR-008 | PPR-compatible session handling |
| PERF-004 | ADR-007 | Cache prewarming                |

## Decision Log

| Date       | ADR     | Decision                                        |
| ---------- | ------- | ----------------------------------------------- |
| 2024-12-23 | ADR-001 | Move guest session creation to edge middleware  |
| 2024-12-23 | ADR-002 | Add JWT audience claim validation               |
| 2024-12-23 | ADR-003 | Create edge-compatible constant-time comparison |
| 2024-12-23 | ADR-004 | Implement atomic guest data migration           |
| 2024-12-23 | ADR-005 | Centralize rate limit configuration             |
| 2024-12-23 | ADR-006 | Implement 30s TTL Redis session cache           |
| 2024-12-23 | ADR-007 | Add cache prewarming after auth                 |
| 2025-12-23 | ADR-008 | Use connection() for PPR-compatible sessions    |

## How to Add New ADRs

1. Copy the template from any existing ADR
2. Number sequentially (ADR-008, ADR-009, etc.)
3. Use descriptive filename: `ADR-XXX-short-title.md`
4. Update this index file
5. Link related files and issues

## ADR Template

```markdown
# ADR-XXX: [Title]

## Status

Proposed | Accepted | Deprecated | Superseded

## Date

YYYY-MM-DD

## Reference

ARCH-001, [ISSUE-ID]

## Context

[What is the issue that we're seeing that is motivating this decision?]

## Decision

[What is the change that we're proposing/doing?]

## Consequences

### Positive

- [Benefit 1]

### Negative

- [Trade-off 1]

## Alternatives Considered

[What other options were evaluated?]

## Related Files

- [file.ts](path/to/file.ts) - Description
```
