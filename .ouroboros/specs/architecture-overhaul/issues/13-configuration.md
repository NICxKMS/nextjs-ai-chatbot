# ⚙️ Configuration Issues

**Total**: 15 issues
**High**: 1 | **Medium**: 5 | **Low**: 9

## Summary Table

| #    | Issue                                           | Severity | File              | Status    | Verified                        |
| ---- | ----------------------------------------------- | -------- | ----------------- | --------- | ------------------------------- |
| #261 | Experimental features not in experimental block | MEDIUM   | next.config.ts    | ⚠️ CLOSED | ❌ NOT CONFIRMED                |
| #262 | Source maps disabled affects debugging          | LOW      | next.config.ts    | 🔴 OPEN   | ✅ CONFIRMED (intentional)      |
| #265 | Missing security headers in config              | MEDIUM   | next.config.ts    | 🔴 OPEN   | ✅ CONFIRMED                    |
| #266 | Tests excluded from compilation                 | LOW      | tsconfig.json     | 🔴 OPEN   | ✅ CONFIRMED (intentional)      |
| #270 | noExplicitAny disabled                          | MEDIUM   | biome.jsonc       | 🔴 OPEN   | ✅ CONFIRMED (tech debt)        |
| #272 | noEmptyBlockStatements disabled                 | MEDIUM   | biome.jsonc       | 🔴 OPEN   | ✅ CONFIRMED (design choice)    |
| #274 | noShadow disabled                               | MEDIUM   | biome.jsonc       | 🔴 OPEN   | ✅ CONFIRMED (intentional)      |
| #276 | DATABASE_URL non-null assertion                 | HIGH     | drizzle.config.ts | 🔴 OPEN   | ✅ CONFIRMED (needs validation) |
| #279 | Coverage exclude incomplete                     | MEDIUM   | vitest.config.ts  | 🔴 OPEN   | ✅ CONFIRMED (incomplete)       |

## Critical: drizzle.config.ts (#276)

```typescript
// Crashes if DATABASE_URL not set
url: process.env.DATABASE_URL!,
```

Should validate:

```typescript
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL required for migrations");
}
```
