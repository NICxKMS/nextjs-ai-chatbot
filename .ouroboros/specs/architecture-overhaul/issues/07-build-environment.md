# 🔧 Build & Environment Issues

**Total**: 17 issues
**High**: 5 | **Medium**: 8 | **Low**: 4

## Summary Table

| #    | Issue                                         | Severity | File                                       | Status    | Verified                       |
| ---- | --------------------------------------------- | -------- | ------------------------------------------ | --------- | ------------------------------ |
| #104 | Missing maxDuration export in chat route      | HIGH     | app/api/chat/route.ts                      | 🔴 OPEN   | ✅ CONFIRMED                   |
| #105 | Experimental features without fallbacks       | MEDIUM   | next.config.ts                             | ⚠️ CLOSED | ❌ NOT CONFIRMED (progressive) |
| #106 | noUncheckedIndexedAccess unsafe access        | MEDIUM   | tsconfig.json                              | ⚠️ CLOSED | ❌ NOT CONFIRMED (enabled)     |
| #107 | Biome rules disabled without tracking         | LOW      | biome.jsonc                                | 🔴 OPEN   | ✅ CONFIRMED                   |
| #108 | Missing BLOB_READ_WRITE_TOKEN in .env.example | HIGH     | .env.example                               | ⚠️ CLOSED | ❌ NOT CONFIRMED (documented)  |
| #109 | Missing SUPABASE_SERVICE_ROLE_KEY docs        | MEDIUM   | .env.example                               | 🔴 OPEN   | ✅ CONFIRMED                   |
| #110 | Missing LOG_LEVEL in .env.example             | LOW      | .env.example                               | 🔴 OPEN   | ✅ CONFIRMED                   |
| #111 | Missing USE_MOCK_AI in .env.example           | MEDIUM   | .env.example                               | 🔴 OPEN   | ✅ CONFIRMED                   |
| #112 | Missing TOOL_MODEL_ID, TITLE_MODEL_ID         | LOW      | .env.example                               | 🔴 OPEN   | ✅ CONFIRMED                   |
| #113 | Missing DEFAULT_CHAT_MODEL_ID                 | LOW      | .env.example                               | 🔴 OPEN   | ✅ CONFIRMED                   |
| #114 | Mobile detection header not set               | HIGH     | middleware.ts                              | 🔴 OPEN   | ✅ CONFIRMED                   |
| #115 | useScreenSize returns 0 during SSR            | MEDIUM   | shared/hooks/use-mobile.ts                 | 🔴 OPEN   | ✅ CONFIRMED                   |
| #116 | Hydration mismatch in Artifact                | MEDIUM   | features/artifacts/components/artifact.tsx | ⚠️ CLOSED | ❌ NOT CONFIRMED (has guard)   |
| #117 | Missing server-only guard                     | MEDIUM   | lib/middleware/rate-limit.ts               | ⚠️ CLOSED | ❌ NOT CONFIRMED (intentional) |
| #118 | Non-null assertion on DATABASE_URL            | HIGH     | lib/db/client.ts                           | 🔴 OPEN   | ✅ CONFIRMED                   |
| #119 | Supabase client non-null assertions           | HIGH     | lib/auth/client.ts                         | 🔴 OPEN   | ✅ CONFIRMED                   |

## Critical: maxDuration (#104)

Vercel serverless functions default to 10s timeout. Chat API needs 60s for AI responses.

**Fix**:

```typescript
// app/api/chat/route.ts
export const maxDuration = 60;
```

## Environment Variables Missing from .env.example

| Variable              | Used In     | Required |
| --------------------- | ----------- | -------- |
| BLOB_READ_WRITE_TOKEN | file upload | Yes      |
| USE_MOCK_AI           | testing     | No       |
| LOG_LEVEL             | logging     | No       |
| TOOL_MODEL_ID         | AI tools    | No       |
| TITLE_MODEL_ID        | title gen   | No       |
