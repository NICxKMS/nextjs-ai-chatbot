# ADR-003: Constant-Time Comparison for Security

## Status

Accepted

## Date

2024-12-23

## Reference

ARCH-001, SEC-005

## Context

String comparison operations in security-sensitive contexts (token validation, hash comparison, fingerprint checks) are vulnerable to **timing attacks**. Standard string comparison (`===`) returns early on the first mismatched character:

```typescript
// VULNERABLE: Early return reveals information
function unsafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false; // Leaks length
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false; // Leaks position
  }
  return true;
}
```

An attacker can measure response times to:

1. Determine string length
2. Brute-force character-by-character
3. Recover secrets in polynomial time vs. exponential

### Edge Runtime Constraint

The standard Node.js solution (`crypto.timingSafeEqual`) is **not available in Edge Runtime**. The Edge Runtime only supports Web APIs, requiring a custom implementation.

## Decision

Create an **edge-compatible constant-time string comparison utility** in `lib/utils/timing-safe.ts`.

### Implementation

```typescript
/**
 * SEC-005: Constant-time string comparison
 * Always processes all bytes regardless of where strings differ
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  const maxLen = Math.max(aBytes.length, bBytes.length);

  // XOR-based comparison - all bytes compared regardless of early mismatches
  let result = aBytes.length ^ bBytes.length; // Length difference
  for (let i = 0; i < maxLen; i++) {
    const aByte = i < aBytes.length ? aBytes[i]! : 0;
    const bByte = i < bBytes.length ? bBytes[i]! : 0;
    result |= aByte ^ bByte;
  }

  return result === 0;
}
```

### Key Design Decisions

1. **XOR Accumulation**: Differences are OR'd into result, preventing early return
2. **Length Handling**: Length difference is included in result, but full comparison still runs
3. **Zero Padding**: Out-of-bounds access uses 0, ensuring constant iteration count
4. **TextEncoder**: Edge-compatible UTF-8 encoding (Web API)

### Usage Pattern

```typescript
// Hash comparison in fingerprint validation
if (constantTimeEqual(stored.uaHash, current.uaHash)) {
  // Valid fingerprint
}

// Token comparison (where applicable)
if (constantTimeEqual(providedToken, expectedToken)) {
  // Valid token
}
```

## Consequences

### Positive

- **Timing attack resistance** - constant execution time regardless of input
- **Edge-compatible** - uses only Web APIs (TextEncoder, Uint8Array)
- **No dependencies** - pure JavaScript implementation
- **Type safety** - includes optional value wrapper (`constantTimeEqualOptional`)
- **Well-documented** - includes security context and examples

### Negative

- **Performance overhead** - always processes max-length bytes (acceptable for security)
- **Not cryptographically verified** - custom implementation vs. battle-tested library
- **Maintenance burden** - must ensure implementation remains secure

### Neutral

- Requires developer awareness to use in security contexts
- Slightly more verbose than `===` comparison

## Alternatives Considered

### 1. Node.js crypto.timingSafeEqual

```typescript
import { timingSafeEqual } from "crypto";
```

- **Rejected**: Not available in Edge Runtime

### 2. Polyfill Library

- Use `secure-compare` or similar npm package
- **Rejected**: Additional dependency, may not be edge-compatible

### 3. WebAssembly Implementation

- Compile constant-time comparison in Rust/C to WASM
- **Rejected**: Over-engineered for the use case

### 4. Accept Timing Vulnerability

- Document risk, use standard comparison
- **Rejected**: Unacceptable security posture for token validation

## Security Analysis

### Timing Leak Vectors

| Vector             | Mitigation                                     |
| ------------------ | ---------------------------------------------- |
| Length comparison  | Length diff included in result, full loop runs |
| Character position | XOR all bytes, no early return                 |
| Cache timing       | Constant memory access pattern                 |
| Branch prediction  | No conditional branches in hot loop            |

### Limitations

- **JIT Optimization**: JavaScript JIT may introduce subtle timing variations
- **Micro-architectural**: CPU-level timing is beyond our control
- **Network noise**: Usually masks small timing differences

### Recommendation

For highest-security scenarios, combine with:

- Network jitter (random delay)
- Rate limiting
- Fail-closed design

## Related Files

- [lib/utils/timing-safe.ts](../../lib/utils/timing-safe.ts) - Implementation
- [lib/auth/guest.ts](../../lib/auth/guest.ts) - Fingerprint validation usage
- [middleware.ts](../../middleware.ts) - Session token context
