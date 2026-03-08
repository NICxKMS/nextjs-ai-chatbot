# File Upload Pipeline

```
FLOW: File Upload Pipeline
ENTRY: Client sends POST /api/files/upload with FormData containing an image file
STEPS:

  ── CSRF Protection ──

  1. `validateOrigin(request)` (lib/utils/validate-origin.ts)
     - Extract Origin or Referer header
     - Compare against allowed origins set
     → If invalid origin: 403 `forbidden:api:csrf_failed`

  ── Authentication ──

  2. `getAppSession()` (lib/auth/session.ts)
     - Resolve Supabase session → if found, use it
     - Otherwise resolve guest session → JWT verification
     → If no session: 401 `unauthorized:auth:no_session`
     → Both authenticated and guest users can upload files

  ── Rate Limiting ──

  3. `checkUploadRateLimit(session.user.id)`
     a. Build Redis key: `rateLimitKeys.rateLimitUpload(userId)` → `"rate-limit-upload:<userId>"`
     b. `checkRateLimit(key, 10, 3600)` → 10 uploads per hour per user
     c. Redis INCR + EXPIRE (if first in window)
     → If Redis unavailable: allow (graceful degradation)
     → If over limit: 429 `rate_limit:upload:too_many_requests`

  ── FormData Parsing ──

  4. `request.formData()` → parse multipart/form-data
     → If parsing fails: 400 `bad_request:api:invalid_request_body`

  5. Extract file: `formData.get("file")`
     → If not a Blob instance: 400 `bad_request:api:no_file_uploaded`

  ── File Validation ──

  6. Size validation:
     a. File size === 0 → 400 `bad_request:api:no_file_uploaded` ("File is empty")
     b. File size > 5MB (5 * 1024 * 1024) → 400 `bad_request:api:file_too_large`

  7. Type validation:
     - Check `file.type.startsWith("image/")` — only images allowed
     → If not image: 400 `bad_request:api:file_type_unsupported`

  ── Filename Sanitization ──

  8. `sanitizeFilename(rawFilename)` (inline in route file)
     a. Try to read `file.name` (File objects have name, Blob may not)
     b. Fallback: `"upload-${Date.now()}"`
     c. Remove path separators and null bytes: `/[/\\:\x00]/g`
     d. Split into base + extension at last dot
     e. Replace non-alphanumeric chars in base: `/[^a-zA-Z0-9._-]/g` → `_`
     f. Truncate base to fit within 100 chars total (including extension)
     → Returns sanitized filename string

  ── Blob Upload ──

  9. `put(filename, file, { access: "public", contentType })` (@vercel/blob)
     - Uploads the file to Vercel Blob storage
     - `access: "public"` → publicly accessible URL
     - Returns `{ url, pathname }` on success
     → If upload fails: 503 `offline:upload:storage_unavailable`

  ── Response ──

  10. Return JSON response:
      ```json
      {
        "url": "https://...",
        "pathname": "sanitized-filename.jpg",
        "contentType": "image/jpeg"
      }
      ```
      Headers: `Cache-Control: no-store`

BOTTLENECKS:
  - Sequential pipeline: CSRF → Auth (Supabase HTTP) → Rate Limit (Redis HTTP) →
    FormData parsing → File validation → Blob upload
    The auth and rate limit steps could run in parallel.
  - `request.formData()` buffers the entire file into memory before validation.
    A 5MB file is fully read before we check if the user is rate-limited or
    if the file type is wrong. Ideally, auth + rate limit + content-type check
    should happen BEFORE reading the body.
  - Vercel Blob upload is the longest step — network transfer of the file.

WASTE:
  - The file is fully buffered into memory (`request.formData()`) before
    validation. If the file is too large or the wrong type, all that I/O
    is wasted. However, Next.js doesn't easily support streaming validation
    of FormData, so this is a framework limitation.
  - `sanitizeFilename()` handles edge cases (null bytes, path separators) that
    are unlikely with normal browser uploads, but necessary for security.
  - The `contentType` is set to `file.type || "application/octet-stream"` but
    only `image/*` types pass validation — so the fallback to
    "application/octet-stream" can never actually be used (it would fail
    the type check at step 7).

SIMPLIFICATION OPPORTUNITIES:
  - Check `Content-Type` header (multipart/form-data) and `Content-Length` header
    BEFORE parsing FormData — reject oversized or non-multipart requests early
  - Run auth + rate limit in parallel: `Promise.all([getAppSession(), checkRateLimit()])`
    since they're independent. Though session is needed for rate limit key,
    so they'd need to be sequenced differently.
  - Remove the `"application/octet-stream"` fallback since it's unreachable
  - Consider supporting more file types (PDF, etc.) if the app needs non-image
    attachments in the future
  - The 10/hour rate limit is quite generous — consider also adding a daily cap
    or total storage cap per user

EXIT: JSON response with `{ url, pathname, contentType }` on success,
      or error response (400/401/403/429/503)
```

## Validation Chain Summary

| Check | Condition | Error Code | Status |
|-------|-----------|-----------|--------|
| CSRF | No valid Origin/Referer | `forbidden:api:csrf_failed` | 403 |
| Auth | No session | `unauthorized:auth:no_session` | 401 |
| Rate limit | >10 uploads/hour | `rate_limit:upload:too_many_requests` | 429 |
| FormData parse | Invalid multipart | `bad_request:api:invalid_request_body` | 400 |
| File presence | No file in form | `bad_request:api:no_file_uploaded` | 400 |
| File empty | Size = 0 | `bad_request:api:no_file_uploaded` | 400 |
| File too large | Size > 5MB | `bad_request:api:file_too_large` | 400 |
| File type | Not image/* | `bad_request:api:file_type_unsupported` | 400 |
| Blob upload | Storage error | `offline:upload:storage_unavailable` | 503 |

## Key Files
| File | Purpose |
|------|---------|
| `app/api/files/upload/route.ts` | Complete upload route handler |
| `lib/utils/validate-origin.ts` | CSRF validation |
| `lib/auth/session.ts` | `getAppSession()` |
| `lib/cache/rate-limit.ts` | `checkRateLimit()` |
| `lib/cache/keys.ts` | `rateLimitKeys.rateLimitUpload` |
| `@vercel/blob` | External — Blob storage SDK |
