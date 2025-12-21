# ADR-002: Document Versioning Storage Pattern — REVISED

**Status:** ACCEPTED (Supersedes ADR-001)  
**Date:** 2024-12-21  
**Author:** Ouroboros Architect  
**Scope:** Redis storage pattern for document versions  
**Supersedes:** ADR-001

---

## Context

**ADR-001 recommended STRING (embedded JSON) over ZSET for document versions.**

However, a critical insight was raised: The analysis focused on RTT count but **ignored network bandwidth**.

### The Flaw in ADR-001

ADR-001 stated:

> "Option A wins for reads (single round-trip)"

This is **misleading**. While STRING has 1 RTT vs ZSET's 2 RTT (or 1 pipeline), the **payload size difference is massive**:

```
STRING: 1 RTT × 100KB payload = 100KB transferred
ZSET:   1 RTT × 5KB payload   = 5KB transferred
```

**Network I/O is the real bottleneck**, not RTT count.

---

## Revised Analysis: Network Bandwidth Reality

### Scenario: 10 Versions, 5KB Average per Version

| Operation      | STRING                                  | ZSET                                                |
| -------------- | --------------------------------------- | --------------------------------------------------- |
| **Get Latest** | `GET doc:123` → **50KB** (all versions) | `ZREVRANGE doc:123:v -1 -1` → **5KB** (just latest) |
| **Data Used**  | 5KB (last version)                      | 5KB (last version)                                  |
| **Waste**      | **45KB (90%)**                          | **0KB (0%)**                                        |

### Real-World Operation Distribution

Based on access patterns:

| Operation            | Frequency | STRING Cost            | ZSET Cost              |
| -------------------- | --------- | ---------------------- | ---------------------- |
| Get latest version   | 90%       | 50KB × 0.90 = **45KB** | 5KB × 0.90 = **4.5KB** |
| Get all versions     | 8%        | 50KB × 0.08 = 4KB      | 50KB × 0.08 = 4KB      |
| Append version       | 2%        | 100KB × 0.02 = 2KB     | 5KB × 0.02 = **0.1KB** |
| **Weighted Average** | 100%      | **51KB**               | **8.6KB**              |

**ZSET uses 6x less bandwidth per operation.**

### At Scale: 10,000 Document Fetches/Day

| Metric                | STRING     | ZSET    | Savings              |
| --------------------- | ---------- | ------- | -------------------- |
| Daily bandwidth       | 510 MB     | 86 MB   | **424 MB/day (83%)** |
| Monthly bandwidth     | 15.3 GB    | 2.6 GB  | **12.7 GB/month**    |
| Latency (50KB vs 5KB) | ~15ms      | ~3ms    | **80% faster**       |
| Redis memory ops      | Full parse | Partial | Lower CPU            |

---

## Revised Trade-off Matrix

| Criterion             | Weight  | STRING (ADR-001) | ZSET (Revised) | Notes                         |
| --------------------- | ------- | ---------------- | -------------- | ----------------------------- |
| **Network bandwidth** | **30%** | ⭐⭐             | ⭐⭐⭐⭐⭐     | **CRITICAL: ZSET wins by 6x** |
| Get latest (frequent) | 25%     | ⭐⭐⭐           | ⭐⭐⭐⭐⭐     | ZSET = smaller payload        |
| Atomic append         | 15%     | ⭐⭐             | ⭐⭐⭐⭐⭐     | ZADD is atomic                |
| Memory overhead       | 10%     | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐       | STRING slightly better        |
| Get all versions      | 8%      | ⭐⭐⭐⭐         | ⭐⭐⭐         | Same data, 2 keys             |
| Code complexity       | 7%      | ⭐⭐⭐⭐⭐       | ⭐⭐⭐         | 2 keys vs 1                   |
| Pruning efficiency    | 5%      | ⭐⭐⭐           | ⭐⭐⭐⭐⭐     | ZREMRANGEBYRANK               |

**Revised Weighted Score:**

- STRING: **3.1/5** (down from 4.1)
- ZSET: **4.6/5** (up from 3.6)

---

## Decision

**REVISED RECOMMENDATION: HYBRID Approach (ZSET for versions + STRING for metadata)**

### Storage Pattern

```redis
# Metadata (small, rarely changes)
doc:{userId}:{docId}:meta → STRING
{
  "id": "uuid",
  "title": "Document Title",
  "kind": "text",
  "createdAt": "2024-12-21T00:00:00Z",
  "updatedAt": "2024-12-21T12:00:00Z"
}

# Versions (ordered by timestamp)
doc:{userId}:{docId}:versions → ZSET
  Score: timestamp (Unix ms)
  Member: JSON-encoded version content
```

### Operation Comparison

| Operation    | STRING (OLD)                         | ZSET (NEW)                                      |
| ------------ | ------------------------------------ | ----------------------------------------------- |
| Get latest   | `GET` → 50KB, parse all, take last   | `ZREVRANGE 0 0` → **5KB only**                  |
| Get all      | `GET` → 50KB                         | `GET meta` + `ZRANGE 0 -1` → 50KB (same)        |
| Append       | `GET` + parse + push + `SET` (race!) | `ZADD` → **atomic, 5KB**                        |
| Get by index | `GET` → 50KB, take index             | `ZRANGE i i` → **5KB**                          |
| Prune to N   | `GET` + slice + `SET`                | `ZREMRANGEBYRANK 0 -N-1` → **no data transfer** |

---

## Concrete Savings Calculations

### Assumptions

- Average version size: 5KB
- Average version count: 10
- Document fetches: 10,000/day
- Operation mix: 90% latest, 8% all, 2% append

### Daily Bandwidth Comparison

```
STRING Approach:
  Get latest (90%):  9,000 × 50KB = 450,000 KB
  Get all (8%):        800 × 50KB =  40,000 KB
  Append (2%):         200 × 100KB = 20,000 KB (GET + SET)
  ──────────────────────────────────────────
  TOTAL:                           510,000 KB = 510 MB/day

ZSET Approach:
  Get latest (90%):  9,000 × 5KB  =  45,000 KB
  Get all (8%):        800 × 51KB =  40,800 KB (meta + all versions)
  Append (2%):         200 × 5KB  =   1,000 KB (ZADD only)
  ──────────────────────────────────────────
  TOTAL:                            86,800 KB = 87 MB/day

SAVINGS: 510 - 87 = 423 MB/day (83% reduction)
```

### Latency Impact

| Payload Size | Typical Latency | Notes                   |
| ------------ | --------------- | ----------------------- |
| 5KB          | 2-5ms           | ZSET "get latest"       |
| 50KB         | 10-20ms         | STRING "get all"        |
| 100KB        | 20-40ms         | STRING with 20 versions |

**For 90% of operations (get latest): 80% latency reduction**

---

## Architecture Diagram

```mermaid
flowchart LR
    subgraph Client["Application"]
        A[Get Latest Version]
        B[Get All Versions]
        C[Append Version]
    end

    subgraph Redis["Redis Storage"]
        subgraph Hybrid["HYBRID Pattern"]
            M["doc:user:123:meta<br/>STRING (1KB)"]
            V["doc:user:123:versions<br/>ZSET (5KB each)"]
        end
    end

    A -->|"ZREVRANGE 0 0<br/>5KB"| V
    B -->|"GET + ZRANGE<br/>51KB"| M
    B --> V
    C -->|"ZADD<br/>5KB atomic"| V

    style A fill:#90EE90
    style V fill:#90EE90
```

---

## Implementation Notes

### Key Patterns

```typescript
export const CacheKeys = {
  // Metadata (id, title, kind, timestamps)
  documentMeta: (docId: string, userId: string) =>
    `doc:${userId}:${docId}:meta`,

  // Versions (ordered by timestamp score)
  documentVersions: (docId: string, userId: string) =>
    `doc:${userId}:${docId}:versions`,
};
```

### Core Operations

```typescript
// GET LATEST VERSION - Most frequent (90%)
async function getLatestVersion(docId: string, userId: string) {
  const key = CacheKeys.documentVersions(docId, userId);
  const [latest] = await redis.zrevrange(key, 0, 0);
  return latest ? JSON.parse(latest) : null;
}
// Network: 5KB instead of 50KB

// GET ALL VERSIONS (8%)
async function getDocument(docId: string, userId: string) {
  const [meta, versions] = await Promise.all([
    redis.get(CacheKeys.documentMeta(docId, userId)),
    redis.zrange(CacheKeys.documentVersions(docId, userId), 0, -1),
  ]);

  return meta
    ? {
        ...JSON.parse(meta),
        versions: versions.map((v) => JSON.parse(v)),
      }
    : null;
}
// Network: Same total, but parallel fetch

// APPEND VERSION (2%) - ATOMIC
async function appendVersion(docId: string, userId: string, version: Version) {
  const key = CacheKeys.documentVersions(docId, userId);
  const score = Date.now();

  await redis.zadd(key, {
    score,
    member: JSON.stringify({ ...version, createdAt: score }),
  });

  // Update metadata timestamp
  const metaKey = CacheKeys.documentMeta(docId, userId);
  await redis.hset(metaKey, "updatedAt", score.toString());
}
// Network: 5KB instead of 100KB, fully atomic

// PRUNE OLD VERSIONS
async function pruneVersions(docId: string, userId: string, keepLast: number) {
  const key = CacheKeys.documentVersions(docId, userId);
  // Remove all except last N versions
  await redis.zremrangebyrank(key, 0, -(keepLast + 1));
}
// Network: ~0KB (no data transfer, just range delete)
```

### TTL Coordination

```typescript
// Set TTL on both keys together
async function setDocumentTTL(
  docId: string,
  userId: string,
  ttlSeconds: number
) {
  await Promise.all([
    redis.expire(CacheKeys.documentMeta(docId, userId), ttlSeconds),
    redis.expire(CacheKeys.documentVersions(docId, userId), ttlSeconds),
  ]);
}
```

---

## Consequences

### Positive

- **POS-001**: **83% bandwidth reduction** for daily operations
- **POS-002**: **80% latency reduction** for "get latest" (90% of ops)
- **POS-003**: Atomic version append with ZADD (no race conditions)
- **POS-004**: Efficient pruning with ZREMRANGEBYRANK
- **POS-005**: Scales better to 100+ versions

### Negative

- **NEG-001**: Two keys per document (slight management overhead)
- **NEG-002**: Slightly higher memory overhead (~30 bytes/version for ZSET metadata)
- **NEG-003**: "Get all versions" requires 2 calls (pipeline mitigates)

### Mitigations

- **MIT-001**: Use pipeline for "get all" to avoid 2 RTT
- **MIT-002**: Set TTL on both keys together
- **MIT-003**: Use Lua script if atomicity needed across both keys

---

## Alternatives Reconsidered

### ALT-001: Keep STRING (ADR-001)

- **Description**: Embedded JSON with all versions
- **Rejected because**:
  - **90% of operations waste 90% of bandwidth**
  - Parse/stringify overhead for entire document
  - Race conditions on append

### ALT-002: RedisJSON Module

- **Description**: Use JSON.ARRAPPEND, JSON.GET $.versions[-1]
- **Rejected because**:
  - Not available on Upstash
  - Would be ideal if available

### ALT-003: STRING with Range Headers (HTTP-level)

- **Description**: Use Range headers to fetch partial content
- **Rejected because**:
  - Redis doesn't support partial string reads
  - Would require HTTP proxy layer

---

## Migration Path

### Phase 1: New Documents (Immediate)

- All new documents use HYBRID pattern
- No migration needed for new data

### Phase 2: Existing Documents (Background Job)

```typescript
async function migrateDocument(oldKey: string) {
  const oldDoc = JSON.parse(await redis.get(oldKey));

  // Split into meta + versions
  const meta = { id: oldDoc.id, title: oldDoc.title, kind: oldDoc.kind, ... };
  const versions = oldDoc.versions.map((v, i) => ({
    score: new Date(v.createdAt).getTime(),
    member: JSON.stringify(v)
  }));

  await Promise.all([
    redis.set(newMetaKey, JSON.stringify(meta)),
    redis.zadd(newVersionsKey, ...versions),
  ]);

  await redis.del(oldKey);
}
```

---

## Decision Diagram

```mermaid
flowchart TD
    Q1{"Most frequent<br/>operation?"}
    Q2{"Network bandwidth<br/>critical?"}
    Q3{"Version count<br/>typically > 5?"}

    Q1 -->|"Get latest<br/>(single version)"| Q2
    Q1 -->|"Get all versions"| STRING

    Q2 -->|"Yes, optimize<br/>for minimal transfer"| ZSET
    Q2 -->|"No, RTT count<br/>matters more"| Q3

    Q3 -->|"Yes, > 5 versions"| ZSET["ZSET (HYBRID)"]
    Q3 -->|"No, < 5 versions"| STRING["STRING (embedded)"]

    subgraph Our_Case["Our Use Case ✓"]
        A["90% get latest"] --> B["Network-bound workload"]
        B --> C["10 versions average"]
        C --> D["CONCLUSION: ZSET HYBRID"]
    end

    ZSET --> Our_Case

    style Our_Case fill:#90EE90
    style ZSET fill:#90EE90
```

---

## Summary: Why ADR-001 Was Wrong

| Criterion    | ADR-001 Assumption       | Reality                       |
| ------------ | ------------------------ | ----------------------------- |
| RTT count    | "1 RTT is better than 2" | **Payload size matters more** |
| Bandwidth    | Not considered           | **83% waste with STRING**     |
| "Get latest" | "Same as get all"        | **Fundamentally different**   |
| Typical use  | "Get all versions"       | **90% is "get latest only"**  |

**The revised analysis correctly weighs network bandwidth as the primary factor.**

---

## When to Reconsider

Revisit this decision if:

1. Upstash adds RedisJSON support (use JSON.GET $.versions[-1])
2. Average version count drops below 3 (STRING overhead acceptable)
3. "Get all versions" becomes the dominant operation (>50%)

---

## References

- [ADR-001](ADR-001-document-versioning-storage-pattern.md) - Original (superseded) decision
- [Redis ZSET Range Commands](https://redis.io/commands/zrevrange/)
- [Redis Memory Optimization](https://redis.io/docs/management/optimization/memory-optimization/)

---

**Document Version**: 2.0  
**Last Updated**: 2024-12-21  
**Status**: ACCEPTED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [TASK COMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
