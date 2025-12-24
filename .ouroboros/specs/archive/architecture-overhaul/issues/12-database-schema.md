# 🗄️ Database Schema Issues

**Total**: 8 issues
**High**: 1 | **Medium**: 4 | **Low**: 3

## Summary Table

| #        | Issue                                         | Severity | Location                 | Status       | Verified                                    |
| -------- | --------------------------------------------- | -------- | ------------------------ | ------------ | ------------------------------------------- |
| #247     | Missing index on user.email                   | MEDIUM   | lib/db/schema.ts:31      | ❌ CLOSED    | NOT CONFIRMED (index exists via unique)     |
| #248     | passwordHash length may be insufficient       | LOW      | lib/db/schema.ts:34      | ✅ CONFIRMED | Password hash length tight for future algos |
| #249     | Missing index on vote.messageId               | MEDIUM   | lib/db/schema.ts:96-99   | ✅ CONFIRMED | No index on FK                              |
| #250     | Suggestion FK missing onDelete cascade        | HIGH     | lib/db/schema.ts:143-145 | ⚠️ PARTIAL   | Some cascades missing                       |
| #251     | Redundant primaryKey definition               | LOW      | lib/db/schema.ts:168     | ✅ CONFIRMED | Redundant PK                                |
| #252     | Message parts/attachments typed as just jsonb | MEDIUM   | lib/db/schema.ts:80      | ✅ CONFIRMED | No JSON schema validation                   |
| #253     | Missing index on message.role                 | MEDIUM   | lib/db/schema.ts:78-79   | ❌ CLOSED    | NOT CONFIRMED (composite index covers role) |
| #254     | Document content allows null unexpectedly     | LOW      | lib/db/schema.ts:133     | ✅ CONFIRMED | Content allows null                         |
| #255-257 | Various schema issues                         | -        | -                        | ❌ CLOSED    | NOT AN ISSUE                                |
| #258     | Naming convention inconsistency               | LOW      | lib/db/schema.ts         | ✅ CONFIRMED | Mix of snake_case/camelCase                 |
| #260     | Duplicate of #252                             | -        | -                        | 🔁 DUPLICATE | Same as #252                                |

## Critical: FK Cascade Rules (#250)

Suggestion table foreign key has no onDelete rule - if documents are deleted, orphan suggestions remain.

```typescript
// Current (problematic)
userId: uuid("user_id").references(() => user.id);

// Should be
userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" });
```

## Index Recommendations

| Column         | Operation     | Impact |
| -------------- | ------------- | ------ |
| user.email     | Login lookups | HIGH   |
| vote.messageId | Vote queries  | MEDIUM |
| message.role   | Rate limiting | MEDIUM |
