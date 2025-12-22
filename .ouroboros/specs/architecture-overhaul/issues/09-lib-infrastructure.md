# 📚 Lib Infrastructure Issues

**Total**: 8 issues
**High**: 3 | **Medium**: 5

## Summary Table

| #    | Issue                                       | Severity | File                                | Status    | Verified                      |
| ---- | ------------------------------------------- | -------- | ----------------------------------- | --------- | ----------------------------- |
| #190 | Missing error handling for model resolution | HIGH     | lib/ai/providers.ts                 | 🔴 OPEN   | ✅ CONFIRMED                  |
| #191 | Async Cloudflare providers not in registry  | MEDIUM   | lib/ai/providers.ts                 | 🔴 OPEN   | ✅ CONFIRMED                  |
| #192 | Mutating global config without lock         | LOW      | lib/ai/mock.ts                      | 🔴 OPEN   | ✅ CONFIRMED                  |
| #193 | Unsafe double type assertion                | MEDIUM   | lib/ai/mock.ts                      | ⚠️ CLOSED | ❌ NOT CONFIRMED (file gone)  |
| #194 | No response validation from external API    | MEDIUM   | lib/ai/tools/get-weather.ts         | 🔴 OPEN   | ✅ CONFIRMED                  |
| #195 | Fire-and-forget DB write                    | MEDIUM   | lib/ai/tools/request-suggestions.ts | ⚠️ CLOSED | ❌ NOT CONFIRMED (uses await) |
| #196 | Missing handler error corrupts stream       | HIGH     | lib/ai/tools/create-document.ts     | 🔴 OPEN   | ✅ CONFIRMED                  |
| #197 | Quota fail-open security                    | HIGH     | lib/cache-ops/quota.ts              | 🔴 OPEN   | ✅ CONFIRMED                  |

## Issue #190 - Model Resolution Error

**File**: lib/ai/providers.ts

```typescript
// No try-catch - throws if model not found
const model = providerRegistry.languageModel(
  resolvedId as `${string}:${string}`
);
```

**Fix**:

```typescript
try {
  const model = providerRegistry.languageModel(resolvedId);
  return model;
} catch (error) {
  throw new AppError({
    code: "MODEL_NOT_FOUND",
    message: `Model ${resolvedId} not available`,
  });
}
```

## Issue #196 - Stream Corruption

**File**: lib/ai/tools/create-document.ts

No error handling for `onCreateDocument` callback - stream left in inconsistent state on failure.

## Issue #197 - Quota Bypass

**File**: lib/cache-ops/quota.ts

When Redis unavailable, quota returns `allowed: true` - rate limits bypassed.
