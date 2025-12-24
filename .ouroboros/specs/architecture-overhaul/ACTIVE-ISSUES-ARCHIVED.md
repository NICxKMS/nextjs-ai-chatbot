# Active Issues - NewApp Feature Parity

**Created**: 2025-12-22
**Last Updated**: 2025-12-22
**Status**: OPEN - 197 issues requiring fixes
**Priority**: CRITICAL items must be fixed before release

---

## Summary

| #   | Issue                     | Severity    | Est. Lines | Status  |
| --- | ------------------------- | ----------- | ---------- | ------- |
| 1   | Chat Persistence          | 🔴 CRITICAL | ~40        | ⏳ OPEN |
| 2   | Title Format              | 🟠 HIGH     | ~5         | ⏳ OPEN |
| 3   | DELETE Endpoint           | 🟡 MEDIUM   | ~45        | ⏳ OPEN |
| 4   | Pagination                | 🟡 MEDIUM   | ~25        | ⏳ OPEN |
| 5   | Error Format              | 🟡 MEDIUM   | ~30        | ⏳ OPEN |
| 6   | Optimistic Dedup          | 🟢 LOW      | ~10        | ⏳ OPEN |
| 8   | Visibility React          | 🟢 LOW      | ~20        | ⏳ OPEN |
| 9   | DELETE /api/chat          | 🔴 CRITICAL | ~50        | ⏳ OPEN |
| 10  | Server Actions Persist    | 🔴 CRITICAL | ~60        | ⏳ OPEN |
| 11  | Title Generation Export   | 🟠 HIGH     | ~30        | ⏳ OPEN |
| 12  | MIME Type Mismatch        | 🟠 HIGH     | ~20        | ⏳ OPEN |
| 13  | Upload Rate Limiting      | 🟡 MEDIUM   | ~5         | ⏳ OPEN |
| 14  | Vote Ownership Check      | 🟠 HIGH     | ~10        | ⏳ OPEN |
| 15  | messageMetadataSchema     | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 16  | Toolbar any Type          | 🟢 LOW      | ~5         | ⏳ OPEN |
| 17  | OpenTelemetry             | 🟠 HIGH     | ~40        | ⏳ OPEN |
| 18  | Request Context           | 🟠 HIGH     | ~80        | ⏳ OPEN |
| 19  | User System Prompt        | 🔴 CRITICAL | ~30        | ⏳ OPEN |
| 20  | Geo Hints                 | 🟡 MEDIUM   | ~20        | ⏳ OPEN |
| 21  | Title Race Condition      | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 22  | Model Validation Feedback | 🟢 LOW      | ~5         | ⏳ OPEN |
| 23  | AI SDK Telemetry          | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 24  | Vercel Fluid              | 🟡 MEDIUM   | ~20        | ⏳ OPEN |
| 25  | Test Fixtures             | 🟢 LOW      | ~50        | ⏳ OPEN |
| 26  | Batch Upload              | 🟢 LOW      | ~15        | ⏳ OPEN |
| 27  | Stream Table              | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 28  | OpenGraph Image           | 🟡 MEDIUM   | ~1         | ⏳ OPEN |
| 29  | Security Headers          | 🟠 HIGH     | ~20        | ⏳ OPEN |
| 30  | Message Metadata          | 🟢 LOW      | ~3         | ⏳ OPEN |
| 31  | Transient Flag            | 🟠 HIGH     | ~5         | ⏳ OPEN |
| 32  | ModelPart Type            | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 33  | Model Persistence         | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 34  | Suggested Actions         | 🟢 LOW      | ~5         | ⏳ OPEN |
| 35  | Document Handler          | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 36  | Network Retry             | 🟡 MEDIUM   | ~45        | ⏳ OPEN |
| 37  | Regenerate Prop           | 🟠 HIGH     | ~30        | ⏳ OPEN |
| 38  | Version Footer            | 🟢 LOW      | ~5         | ⏳ OPEN |
| 39  | Vercel Analytics          | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 41  | Loading UI Mismatch       | 🟡 MEDIUM   | ~20        | ⏳ OPEN |
| 42  | Metadata Mismatch         | 🟢 LOW      | ~5         | ⏳ OPEN |
| 43  | Upload AbortController    | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 44  | SWRInfinite History Sub   | 🟡 MEDIUM   | ~20        | ⏳ OPEN |
| 45  | UI Timing Constants       | 🟡 MEDIUM   | ~50        | ⏳ OPEN |
| 46  | Framer Motion Version     | 🟢 LOW      | ~5         | ⏳ OPEN |
| 47  | localStorage Key          | 🟡 MEDIUM   | ~5         | ⏳ OPEN |
| 48  | useLocalStorage Hook      | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 49  | Debounced Writes Hook     | 🟢 LOW      | ~5         | ⏳ OPEN |
| 50  | Hydration Flag Missing    | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 51  | Vote Action Not Persisting | 🔴 CRITICAL | ~10       | ⏳ OPEN |
| 52  | Visibility Update Stub    | 🟠 HIGH     | ~5         | ⏳ OPEN |
| 53  | Message Deletion Stub     | 🟠 HIGH     | ~5         | ⏳ OPEN |
| 54  | Env Var Non-null Assert   | 🟠 HIGH     | ~10        | ⏳ OPEN |
| 55  | Unsafe Type Assertion     | 🟡 MEDIUM   | ~5         | ⏳ OPEN |
| 56  | Unbounded Console Output  | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 57  | DB Connection No Validation | 🟠 HIGH   | ~10        | ⏳ OPEN |
| 58  | Silent Error Catch        | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 59  | Visibility Race Condition | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 60  | Missing Index Optimization | 🟡 MEDIUM  | ~5         | ⏳ OPEN |
| 61  | Console Scroll Missing Deps | 🟢 LOW    | ~5         | ⏳ OPEN |
| 62  | Potential XSS Python Output | 🟠 HIGH   | ~15        | ⏳ OPEN |
| 63  | Missing Feature Exports   | 🟢 LOW      | ~10        | ⏳ OPEN |
| 64  | Guest Chat ID Spoofing    | 🟡 MEDIUM   | ~20        | ⏳ OPEN |
| 65  | AUTH_SECRET Runtime Only  | 🟠 HIGH     | ~10        | ⏳ OPEN |
| 66  | Missing /api/settings Route | 🟠 HIGH   | ~50        | ⏳ OPEN |
| 67  | Duplicate SessionContext Type | 🟡 MEDIUM | ~10      | ⏳ OPEN |
| 68  | SessionInfo vs GuestInfo Confusion | 🟡 MEDIUM | ~15 | ⏳ OPEN |
| 69  | Missing MessageReasoning Component | 🟡 MEDIUM | ~30 | ⏳ OPEN |
| 70  | Missing TipTap Suggestions | 🟠 HIGH    | ~100       | ⏳ OPEN |
| 71  | Missing branch.tsx Component | 🟡 MEDIUM | ~50       | ⏳ OPEN |
| 72  | Missing Tool Types Definition | 🟡 MEDIUM | ~20      | ⏳ OPEN |
| 73  | SheetEditor Not Lazy-Loaded | 🟡 MEDIUM | ~10        | ⏳ OPEN |
| 74  | Heavy Library Direct Imports | 🟡 MEDIUM | ~10       | ⏳ OPEN |
| 75  | ARIA Accessibility Error  | 🟡 MEDIUM   | ~5         | ⏳ OPEN |
| 76  | No Tests for API Routes   | 🟠 HIGH     | ~200       | ⏳ OPEN |
| 77  | No Tests for lib/ai/tools | 🟡 MEDIUM   | ~150       | ⏳ OPEN |
| 78  | No Tests for lib/cache-ops | 🟡 MEDIUM  | ~150       | ⏳ OPEN |
| 79  | Missing lib/data Unit Tests | 🟡 MEDIUM | ~100       | ⏳ OPEN |
| 80  | lib/ai Imports from features/ | 🟡 MEDIUM | ~15      | ⏳ OPEN |
| 81  | lib/providers Imports from features | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 82  | lib/data Imports from features | 🟡 MEDIUM | ~10     | ⏳ OPEN |
| 83  | Missing Security Headers (Middleware) | 🔴 CRITICAL | ~30 | ⏳ OPEN |
| 84  | XSS via Unsanitized Code Highlighting | 🔴 CRITICAL | ~20 | ⏳ OPEN |
| 85  | Chat API Unauthenticated Access | 🟠 HIGH | ~15      | ⏳ OPEN |
| 86  | Health Endpoint Exposes State | 🟠 HIGH  | ~20        | ⏳ OPEN |
| 87  | Token Without Additional Binding | 🟠 HIGH | ~30      | ⏳ OPEN |
| 88  | Rate Limiting Fails Open  | 🟠 HIGH     | ~10        | ⏳ OPEN |
| 89  | AUTH_SECRET Runtime Validation | 🟡 MEDIUM | ~10     | ⏳ OPEN |
| 90  | Open Redirect Incomplete  | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 91  | Server Actions Lack CSRF  | 🟡 MEDIUM   | ~20        | ⏳ OPEN |
| 92  | Document Handler Leaks Info | 🟡 MEDIUM | ~10        | ⏳ OPEN |
| 93  | AI Token Usage Logs User ID | 🟡 MEDIUM | ~5         | ⏳ OPEN |
| 94  | JWT Cookie TTL Mismatch   | 🟢 LOW      | ~5         | ⏳ OPEN |
| 95  | IP Extraction No Validation | 🟢 LOW    | ~10        | ⏳ OPEN |
| 96  | No Explicit CORS Config   | 🟢 LOW      | ~15        | ⏳ OPEN |
| 97  | All 31 E2E Tests Failing  | 🔴 CRITICAL | ~100       | ⏳ OPEN |
| 98  | Missing artifact-panel testid | 🟠 HIGH  | ~5         | ⏳ OPEN |
| 99  | Missing artifact-document-preview testid | 🟠 HIGH | ~5 | ⏳ OPEN |
| 100 | Missing toggle-sidebar-button testid | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 101 | Missing visibility-dropdown-item-* testid | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 102 | Missing artifact-version-footer testid | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 103 | Missing toast testid      | 🟢 LOW      | ~5         | ⏳ OPEN |
| 104 | Missing maxDuration Export | 🟠 HIGH    | ~5         | ⏳ OPEN |
| 105 | Next.js Experimental Features No Fallback | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 106 | noUncheckedIndexedAccess Violations | 🟡 MEDIUM | ~20 | ⏳ OPEN |
| 107 | Biome Rules Disabled Untracked | 🟢 LOW  | ~0         | ⏳ OPEN |
| 108 | Missing BLOB_READ_WRITE_TOKEN Docs | 🟠 HIGH | ~5     | ⏳ OPEN |
| 109 | Missing SUPABASE_SERVICE_ROLE_KEY Docs | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 110 | Missing LOG_LEVEL Docs    | 🟢 LOW      | ~5         | ⏳ OPEN |
| 111 | Missing USE_MOCK_AI Docs  | 🟡 MEDIUM   | ~5         | ⏳ OPEN |
| 112 | Missing TOOL/TITLE_MODEL_ID Docs | 🟢 LOW | ~5        | ⏳ OPEN |
| 113 | Missing DEFAULT_CHAT_MODEL_ID Docs | 🟢 LOW | ~5     | ⏳ OPEN |
| 114 | Mobile Detection Header Not Set | 🟠 HIGH | ~15      | ⏳ OPEN |
| 115 | useScreenSize Returns 0 SSR | 🟡 MEDIUM | ~10        | ⏳ OPEN |
| 116 | Hydration Mismatch Artifact | 🟡 MEDIUM | ~15        | ⏳ OPEN |
| 117 | Missing server-only Guard Rate Limit | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 118 | DATABASE_URL Non-null Assert | 🟠 HIGH  | ~10        | ⏳ OPEN |
| 119 | Supabase Client Non-null Assert | 🟠 HIGH | ~10      | ⏳ OPEN |
| 120 | Redis Degradation Inconsistent | 🟡 MEDIUM | ~15     | ⏳ OPEN |
| 121 | Health Check 200 for Degraded | 🟢 LOW  | ~5         | ⏳ OPEN |
| 122 | Blob Token Not Validated  | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 123 | AI Provider Registration Silent | 🟡 MEDIUM | ~10    | ⏳ OPEN |
| 124 | Playwright webServer Health Dependency | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 125 | No Mock AI Provider for E2E | 🟠 HIGH   | ~80        | ⏳ OPEN |
| 126 | Auth Tests Create Real Users | 🟡 MEDIUM | ~30       | ⏳ OPEN |
| 127 | Test Timeout Too Long     | 🟢 LOW      | ~5         | ⏳ OPEN |
| 128 | Missing aria-live Greeting Animation | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 129 | Hardcoded Greeting Text   | 🟢 LOW      | ~5         | ⏳ OPEN |
| 130 | Missing role="alert" Error Fallback | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 131 | Nested Interactive Elements | 🟠 HIGH   | ~10        | ⏳ OPEN |
| 132 | Hardcoded Featured Model IDs | 🟡 MEDIUM | ~15       | ⏳ OPEN |
| 133 | Model Selector Missing Loading State | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 134 | Missing aria-selected Dropdown Items | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 135 | Missing Accessible Name Textarea | 🟡 MEDIUM | ~5    | ⏳ OPEN |
| 136 | Error Context Ignored     | 🟢 LOW      | ~5         | ⏳ OPEN |
| 137 | Hardcoded Weather Sample Data | 🟠 HIGH | ~30        | ⏳ OPEN |
| 138 | Missing Weather Icon Alt Text | 🟡 MEDIUM | ~5       | ⏳ OPEN |
| 139 | Mobile Visibility Button Hidden | 🟡 MEDIUM | ~10    | ⏳ OPEN |
| 140 | Missing Keyboard Activation Suggestions | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 141 | Memo Only Checks Children | 🟢 LOW      | ~5         | ⏳ OPEN |
| 142 | Silent Data Handling No Feedback | 🟢 LOW | ~10      | ⏳ OPEN |
| 143 | handleEdit Empty TODO     | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 144 | Attachments Not Sent (TODO) | 🟠 HIGH   | ~20        | ⏳ OPEN |
| 145 | Missing Max File Size Validation | 🟡 MEDIUM | ~10   | ⏳ OPEN |
| 146 | Inconsistent Header Role  | 🟢 LOW      | ~5         | ⏳ OPEN |
| 147 | handleVote Incomplete     | 🟡 MEDIUM   | ~15        | ⏳ OPEN |
| 148 | Using title Instead of Tooltip | 🟡 MEDIUM | ~10     | ⏳ OPEN |
| 149 | Missing Accessible Name Avatar | 🟡 MEDIUM | ~5      | ⏳ OPEN |
| 150 | TextPartView Unused isStreaming | 🟢 LOW | ~5        | ⏳ OPEN |
| 151 | normalizeMessagePart Drops Unknown | 🟢 LOW | ~5     | ⏳ OPEN |
| 152 | Remove Button Only Visible Hover | 🟡 MEDIUM | ~10   | ⏳ OPEN |
| 153 | Image Missing Error State | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 154 | Missing Focus Visible Styles Input | 🟡 MEDIUM | ~15 | ⏳ OPEN |
| 155 | SWR Fetcher No Error Handling | 🟡 MEDIUM | ~10      | ⏳ OPEN |
| 156 | Artifact SWR No Error Handling | 🟡 MEDIUM | ~10     | ⏳ OPEN |
| 157 | Missing aria-label Close Button | 🟠 HIGH | ~5       | ⏳ OPEN |
| 158 | Generic Error Toast Actions | 🟢 LOW    | ~5         | ⏳ OPEN |
| 159 | No Accessible Name Container | 🟡 MEDIUM | ~5        | ⏳ OPEN |
| 160 | Restore Button Missing Loading | 🟡 MEDIUM | ~10     | ⏳ OPEN |
| 161 | motion.div for Interactive Element | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 162 | randomArr SSR Mismatch    | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 163 | EditorSkeleton Not Animated | 🟢 LOW    | ~5         | ⏳ OPEN |
| 164 | CodeMirror Init Ignores Content | 🟡 MEDIUM | ~15    | ⏳ OPEN |
| 165 | React Imported After Use  | 🟠 HIGH     | ~5         | ⏳ OPEN |
| 166 | Theme Flash on Hydration  | 🟡 MEDIUM   | ~10        | ⏳ OPEN |
| 167 | Hard-coded Min/Max Height | 🟢 LOW      | ~5         | ⏳ OPEN |
| 168 | Hardcoded "Assistant" Title | 🟢 LOW    | ~5         | ⏳ OPEN |
| 169 | GroupedVirtuoso endReached Fires Incorrectly | 🟢 LOW | ~10 | ⏳ OPEN |
| 170 | Visibility Change No Loading State | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 171 | More Options No Focus State | 🟡 MEDIUM | ~5         | ⏳ OPEN |
| 172 | External Avatar URL No Fallback | 🟢 LOW | ~5        | ⏳ OPEN |
| 173 | Duplicate SidebarToggle Components | 🟡 MEDIUM | ~20 | ⏳ OPEN |
| 174 | Generic Fetch Error Document | 🟢 LOW   | ~5         | ⏳ OPEN |
| 175 | Readonly Toast Unhelpful  | 🟢 LOW      | ~5         | ⏳ OPEN |
| 176 | Input Missing autoComplete | 🟡 MEDIUM  | ~5         | ⏳ OPEN |
| 177 | aria-disabled Inconsistent | 🟢 LOW     | ~5         | ⏳ OPEN |
| 178 | Guest Bootstrap Errors Swallowed | 🟡 MEDIUM | ~10   | ⏳ OPEN |
| 179 | isMobile Undefined During Hydration | 🟢 LOW | ~5    | ⏳ OPEN |
| 180 | detectSourceType Too Simplistic | 🟢 LOW | ~10       | ⏳ OPEN |
| 181 | Missing Disabled Prop Propagation | 🟢 LOW | ~5      | ⏳ OPEN |
| 182 | Missing aria-pressed Toggle Buttons | 🟡 MEDIUM | ~5 | ⏳ OPEN |
| 183 | Auto-close Timing Hardcoded | 🟢 LOW    | ~5         | ⏳ OPEN |
| 184 | Button Type Inconsistent  | 🟢 LOW      | ~5         | ⏳ OPEN |
| 185 | SWR Fetcher is Null       | 🟢 LOW      | ~5         | ⏳ OPEN |
| 186 | SWR Key Collision Possible | 🟢 LOW     | ~5         | ⏳ OPEN |
| 187 | Global ARTIFACT_CACHE_KEY Collision | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 188 | Cookie Set Without SameSite | 🟢 LOW    | ~5         | ⏳ OPEN |
| 189 | Optimistic Delete Filter Incorrect | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 190 | Model Registry Resolution No Error Handling | 🟠 HIGH | ~15 | ⏳ OPEN |
| 191 | Async Cloudflare Providers Not in Registry | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 192 | Mutating Global Config Without Lock | 🟢 LOW | ~5    | ⏳ OPEN |
| 193 | Unsafe Double Type Assertion | 🟡 MEDIUM | ~5        | ⏳ OPEN |
| 194 | No Weather API Response Validation | 🟡 MEDIUM | ~15 | ⏳ OPEN |
| 195 | Fire-and-Forget DB Write Suggestions | 🟡 MEDIUM | ~10 | ⏳ OPEN |
| 196 | Create Document Handler Error Corrupts Stream | 🟠 HIGH | ~15 | ⏳ OPEN |
| 197 | Rate Limit Fail-Open Security | 🟠 HIGH | ~10        | ⏳ OPEN |

**Severity Totals:**

- 🔴 CRITICAL: 8 (Issues 1, 9, 10, 19, 51, 83, 84, 97)
- 🟠 HIGH: 35 (Issues 2, 11, 12, 14, 17, 18, 29, 31, 37, 52, 53, 54, 57, 62, 65, 66, 70, 76, 85, 86, 87, 88, 98, 99, 104, 108, 114, 118, 119, 125, 131, 137, 144, 157, 165, 190, 196, 197)
- 🟡 MEDIUM: 105 (Issues 3, 4, 5, 13, 15, 20, 21, 23, 24, 27, 28, 32, 33, 35, 36, 39, 41, 43, 44, 45, 47, 48, 50, 55, 56, 58, 59, 60, 64, 67, 68, 69, 71, 72, 73, 74, 75, 77, 78, 79, 80, 81, 82, 89, 90, 91, 92, 93, 100, 101, 102, 105, 106, 109, 111, 115, 116, 117, 120, 122, 123, 124, 126, 128, 130, 132, 133, 134, 135, 138, 139, 140, 143, 145, 147, 148, 149, 152, 153, 154, 155, 156, 159, 160, 161, 162, 164, 166, 170, 171, 173, 176, 178, 182, 187, 189, 191, 193, 194, 195)
- 🟢 LOW: 49 (Issues 6, 8, 16, 22, 25, 26, 30, 34, 38, 42, 46, 49, 61, 63, 94, 95, 96, 103, 107, 110, 112, 113, 121, 127, 129, 136, 141, 142, 146, 150, 151, 158, 163, 167, 168, 169, 172, 174, 175, 177, 179, 180, 181, 183, 184, 185, 186, 188, 192)

**Total Estimated: ~2700+ lines**

---

## Issue 1: Chat Persistence 🔴 CRITICAL

### Problem

Messages are NEVER saved to database. The `onFinish` callback in `/api/chat` only logs usage data, never calls `saveChat()`.

### Evidence

**File**: `app/api/chat/route.ts` Lines 256-286

```typescript
onFinish: async ({ text, usage }) => {
    // Stream usage data - BUT NO PERSISTENCE!
    if (usage) {
        writer.write({ type: "data-usage", data: {...} });
    }
    console.info("[Chat API] Stream complete:", {...});
    // MISSING: await saveChat({...});
},
```

**OldApp Reference**: `oldapp/app/(chat)/api/chat/route.ts` Line 258-273

### Impact

- ALL conversations lost on page refresh
- Chat history always empty
- Users cannot continue previous conversations

### Fix Required

1. Import data layer: `import { saveChat } from "@/lib/data/cached/chats";`
2. Add `saveChat()` call in `onFinish` callback with:
   - chatId, userId
   - userMessage, assistantMessages
   - modelId, title, visibility
   - usage statistics

### Priority

🔴 **CRITICAL** - Must fix immediately

---

## Issue 2: Title Format Mismatch 🟠 HIGH

### Problem

Backend sends `"data-chat-title"` (kebab-case) but type definition expects `"data-chatTitle"` (camelCase).

### Evidence

**Backend** (`app/api/chat/route.ts` Line 200):

```typescript
writer.write({
  type: "data-chat-title", // SENDS kebab-case
  data: title,
});
```

**Type Definition** (`lib/types/stream.ts` Line 32):

```typescript
type DataChatTitlePart = {
  type: "data-chatTitle"; // EXPECTS camelCase
  data: string;
};
```

### Impact

- Chat titles may not update in real-time
- Type checking silently fails

### Fix Required

Change backend to use `"data-chatTitle"` to match OldApp and type definition.

### Priority

🟠 **HIGH** - Affects UX

---

## Issue 3: Missing DELETE Endpoint 🟡 MEDIUM

### Problem

No endpoint to delete a single chat. Only bulk delete exists at `/api/chat/history`.

### Evidence

**File**: `app/api/chat/route.ts`

- Only exports `POST`
- No `DELETE` export
- No `app/api/chat/[id]/route.ts` exists

### Impact

- Cannot delete individual chats
- UI delete button will fail with 405

### Fix Required

Add DELETE handler to `/api/chat/route.ts` or create `/api/chat/[id]/route.ts`:

```typescript
export async function DELETE(request: Request) {
  const { id } = await request.json();
  // Validate, auth check, delete
}
```

### Priority

🟡 **MEDIUM** - Feature incomplete

---

## Issue 4: Missing Pagination 🟡 MEDIUM

### Problem

History API ignores pagination params and hardcodes `hasMore: false`.

### Evidence

**File**: `app/api/history/route.ts` Lines 27-28

```typescript
return NextResponse.json({
    chats: chats.map(...),
    hasMore: false,     // HARDCODED
    nextCursor: null,   // HARDCODED
});
```

### Impact

- All chats load at once (performance issue)
- Infinite scroll broken
- Users with 100+ chats will experience slow loads

### Fix Required

1. Parse `limit`, `starting_after`, `ending_before` query params
2. Pass to `getUserChatsCached` (needs pagination support)
3. Calculate `hasMore` and `nextCursor` based on results

### Priority

🟡 **MEDIUM** - Performance concern

---

## Issue 5: Inconsistent Error Format 🟡 MEDIUM

### Problem

Three different error response shapes used across API routes.

### Evidence

| Location              | Shape                          |
| --------------------- | ------------------------------ |
| History route         | `{ error: "Unauthorized" }`    |
| AppError.toResponse() | `{ error: { code, message } }` |
| OldApp ChatSDKError   | `{ code, message, cause }`     |

### Impact

- Clients cannot reliably parse errors
- Different error handling needed per endpoint

### Fix Required

Standardize all error responses to use `AppError.toResponse()` format:

```typescript
{ error: { code: "...", message: "..." } }
```

### Priority

🟡 **MEDIUM** - API consistency

---

## Issue 6: Missing Optimistic Deduplication 🟢 LOW

### Problem

`addOptimisticChat` doesn't check for duplicates before adding.

### Evidence

**File**: `features/sidebar/hooks/use-optimistic-chats.ts` Lines 24-26

```typescript
const addOptimisticChat = useCallback((chat: ChatHistoryItem) => {
  setOptimisticChats((prev) => [chat, ...prev]); // NO DEDUP CHECK
}, []);
```

### Impact

- Same chat can appear multiple times in sidebar
- React StrictMode double-invocation can cause duplicates
- No size limit (potential memory leak)

### Fix Required

Add Set-based deduplication like OldApp:

```typescript
const optimisticChatIdsRef = useRef(new Set<string>());
// In addOptimisticChat:
if (optimisticChatIdsRef.current.has(chat.id)) return;
optimisticChatIdsRef.current.add(chat.id);
```

### Priority

🟢 **LOW** - Edge case

---

## Issue 8: useChatVisibility No History Subscription 🟢 LOW

### Problem

Hook doesn't subscribe to history cache changes, only uses local SWR key.

### Evidence

**NewApp** (`features/chat/hooks/use-chat-visibility.ts`):

```typescript
// Only local SWR key - NO history subscription
const { data: localVisibility } = useSWR(`${chatId}-visibility`...);
```

**OldApp** (`hooks/use-chat-visibility.ts`):

```typescript
// Subscribes to history cache for reactive updates
const { data: historyPages } = useSWRInfinite(getChatHistoryPaginationKey...);
```

### Impact

- Visibility changes from other components won't reflect
- Multi-tab scenarios won't sync

### Fix Required

Add `useSWRInfinite` subscription to history cache like OldApp.

### Priority

🟢 **LOW** - Edge case

---

## Issue 9: Missing DELETE /api/chat Endpoint 🔴 CRITICAL

### Problem

No endpoint to delete individual chats. OldApp has DELETE handler at line 413.

### Evidence

- **OldApp**: `oldapp/app/(chat)/api/chat/route.ts` has DELETE handler
- **NewApp**: `app/api/chat/route.ts` only has POST

### Impact

- Can't delete individual chats
- UI delete buttons fail with 405

### Fix Required

Add DELETE handler matching OldApp implementation (~50 lines)

### Priority

🔴 **CRITICAL** - Feature broken

---

## Issue 10: Server Actions Not Persisting Data 🔴 CRITICAL

### Problem

Multiple server actions return success without actually saving data.

### Evidence

- `features/chat/actions/vote.ts`: Returns `{ success: true }` with TODO comment
- `features/chat/actions/visibility.ts`: TODO comment, no actual persistence
- `features/chat/actions/messages.ts`: TODO comment, no actual deletion

### Impact

- Votes are lost on refresh
- Visibility changes don't persist
- Message regeneration broken

### Fix Required

Implement actual DB calls in all 3 action files (~60 lines total)

### Priority

🔴 **CRITICAL** - Data loss

---

## Issue 11: Missing generateTitleFromUserMessage Export 🟠 HIGH

### Problem

OldApp exports `generateTitleFromUserMessage` as server action, NewApp only has private inline function.

### Evidence

- **OldApp**: `oldapp/app/(chat)/actions.ts` exports with rate limiting
- **NewApp**: Only inline `generateTitle` in route, not exported

### Impact

- Components expecting server action will fail
- No rate limiting on title generation

### Fix Required

Add server action export to `features/chat/actions/` (~30 lines)

### Priority

🟠 **HIGH** - Missing public API

---

## Issue 12: File Upload MIME Type Mismatch 🟠 HIGH

### Problem

NewApp MIME types are MORE restrictive than OldApp.

### Missing in NewApp

- Office documents (Excel, Word, PowerPoint)
- ZIP files
- Binary files (application/octet-stream)
- Audio files (audio/\*)
- Video files (video/\*)

### Evidence

- **OldApp**: `oldapp/lib/files.ts` has comprehensive MIME list with prefix matching
- **NewApp**: `app/api/files/upload/route.ts` has limited Set

### Impact

- Users can't upload Office docs, ZIP, audio, video
- Feature regression from OldApp

### Fix Required

Port full MIME list from OldApp (~20 lines)

### Priority

🟠 **HIGH** - Feature regression

---

## Issue 13: Missing Upload Rate Limiting 🟡 MEDIUM

### Problem

File upload endpoint has NO rate limiting.

### Evidence

- **OldApp**: Uses `requireRateLimitForRoute("upload", ...)` - 5 req/hour
- **NewApp**: No rate limit check in upload route

### Impact

- Upload flood attacks possible
- No protection against abuse

### Fix Required

Add `withRateLimit` from middleware (~5 lines)

### Priority

🟡 **MEDIUM** - Security concern

---

## Issue 14: Vote API Missing Ownership Check 🟠 HIGH (SECURITY)

### Problem

Vote endpoint doesn't verify chat ownership.

### Evidence

- **OldApp**: `verifyOwnershipForRoute(chatResource, session, "vote")`
- **NewApp**: Only checks if chat exists, not if user owns it

### Impact

- **SECURITY**: Users can vote on any chat including private ones
- Potential data integrity issues

### Fix Required

Add ownership verification (~10 lines)

### Priority

🟠 **HIGH** - Security vulnerability

---

## Issue 15: Missing messageMetadataSchema 🟡 MEDIUM

### Problem

No Zod schema for message metadata validation.

### Evidence

- **OldApp**: `oldapp/lib/api-types.ts` has `messageMetadataSchema`
- **NewApp**: Not found in lib/types

### Impact

- Message metadata not validated
- Potential runtime errors from malformed data

### Fix Required

Add schema to lib/types (~10 lines)

### Priority

🟡 **MEDIUM** - Type safety

---

## Issue 16: `any` Type in Artifact Toolbar 🟢 LOW

### Problem

Toolbar onClick uses `any` type.

### Evidence

- `features/artifacts/components/toolbar.tsx`: `onClick: (context: any) => void`

### Impact

- Type safety loss
- No autocomplete in IDE

### Fix Required

Define proper ToolbarContext type (~5 lines)

### Priority

🟢 **LOW** - Code quality

---

## Issue 17: Missing OpenTelemetry Instrumentation 🟠 HIGH

### Problem

No OpenTelemetry/Vercel OTEL instrumentation for distributed tracing.

### Evidence

- **OldApp**: Has `instrumentation.ts` with `@vercel/otel`
- **NewApp**: NO instrumentation.ts file exists

### Impact

- No distributed tracing
- No unhandled error logging

### Fix Required

Create `instrumentation.ts` with OTEL registration (~40 lines)

### Priority

🟠 **HIGH** - Observability

---

## Issue 18: Missing Request Context System 🟠 HIGH

### Problem

No AsyncLocalStorage-based request context for log correlation.

### Evidence

- **OldApp**: `oldapp/lib/request-context.ts` with RequestContext type
- **NewApp**: NO request-context.ts

### Impact

- Cannot correlate logs across single request
- No request tracing

### Fix Required

Port `request-context.ts` (~80 lines)

### Priority

🟠 **HIGH** - Debugging/Observability

---

## Issue 19: User System Prompt NOT Sent to API 🔴 CRITICAL

### Problem

User's custom system prompt and sampling settings are completely ignored!

### Evidence

- **OldApp**: Sends `settings.systemPrompt`, `settings.sampling` to API
- **NewApp**: `sendMessage` does NOT include user settings
- API uses hardcoded system prompt

### Impact

- **Settings sheet is non-functional UI decoration**
- User customizations have no effect

### Fix Required

1. Update chat-provider to include settings in sendMessage
2. Update API route to use user systemPrompt/sampling (~30 lines)

### Priority

🔴 **CRITICAL** - Feature completely broken

---

## Issue 20: Missing Geo/Request Hints in System Prompt 🟡 MEDIUM

### Problem

AI has no location context for user.

### Evidence

- **OldApp**: Uses `geolocation()` from @vercel/functions
- **NewApp**: Static system prompt, no geo hints

### Impact

- No location-aware responses
- Less context for AI

### Fix Required

Add geo hints to dynamic system prompt (~20 lines)

### Priority

🟡 **MEDIUM** - UX improvement

---

## Issue 21: Missing Title Update Race Condition Handling 🟡 MEDIUM

### Problem

No check if chat exists before updating title.

### Evidence

- **OldApp**: Checks chat existence before title update
- **NewApp**: Direct title update, no existence check

### Impact

- Potential errors if chat deleted during generation
- Race condition vulnerability

### Fix Required

Add existence check (~10 lines)

### Priority

🟡 **MEDIUM** - Robustness

---

## Issue 22: Missing Dynamic Model Validation Feedback 🟢 LOW

### Problem

Generic error for invalid models instead of specific error code.

### Evidence

- **OldApp**: Returns `bad_request:api:invalid_selected_model`
- **NewApp**: Returns generic validation error

### Impact

- Less informative error messages
- Harder debugging

### Fix Required

Use specific error codes (~5 lines)

### Priority

🟢 **LOW** - Error clarity

---

## Issue 23: Missing experimental_telemetry in streamText 🟡 MEDIUM

### Problem

AI SDK telemetry not enabled.

### Evidence

- **OldApp**: `experimental_telemetry: { isEnabled: true, ... }`
- **NewApp**: NO experimental_telemetry option

### Impact

- No AI operation observability
- Missing performance metrics

### Fix Required

Add experimental_telemetry option (~10 lines)

### Priority

🟡 **MEDIUM** - Observability

---

## Issue 24: Missing Vercel Fluid Compute Optimization 🟡 MEDIUM

### Problem

No optimization for Vercel Fluid Compute.

### Evidence

- **OldApp**: Checks `VERCEL_FLUID` env, optimizes pool
- **NewApp**: NO Fluid Compute detection

### Impact

- Suboptimal scaling in Fluid Compute environment
- Potential resource waste

### Fix Required

Add Fluid detection and optimization (~20 lines)

### Priority

🟡 **MEDIUM** - Performance

---

## Issue 25: Missing Test Fixtures/Helpers 🟢 LOW

### Problem

OldApp test utilities not ported.

### Evidence

- **OldApp**: `createAuthenticatedContext`, route tests
- **NewApp**: Basic mocks only

### Impact

- Less comprehensive testing
- Test code duplication

### Fix Required

Port test helpers (~50 lines)

### Priority

🟢 **LOW** - Testing quality

---

## Issue 26: Batch Upload Concurrency Limit Missing 🟢 LOW

### Problem

No limit on concurrent uploads.

### Evidence

- **OldApp**: `MAX_CONCURRENT_UPLOADS = 3` with batching
- **NewApp**: No batching visible

### Impact

- Potential overwhelm with many files
- Network congestion

### Fix Required

Add batch limiter (~15 lines)

### Priority

🟢 **LOW** - Robustness

---

## Issue 27: Missing Stream Table in Schema 🟡 MEDIUM

### Problem

OldApp has `Stream` table for stream resumption, NewApp doesn't.

### Evidence

- OldApp: `oldapp/lib/db/migrations/0000_init.sql` has Stream table
- NewApp: No Stream table in schema.ts or migrations

### Impact

Stream resumption feature may not work

### Fix Required

Add Stream table if needed (~15 lines)

### Priority

🟡 **MEDIUM** - Feature completeness

---

## Issue 28: Missing OpenGraph Image 🟡 MEDIUM

### Problem

No OpenGraph image for social media previews.

### Evidence

- OldApp: `oldapp/app/(chat)/opengraph-image.png` exists
- NewApp: No opengraph-image.png in app directory

### Impact

Poor social media link previews

### Fix Required

Copy image file (~1 file)

### Priority

🟡 **MEDIUM** - User experience

---

## Issue 29: Missing Security Headers in Middleware 🟠 HIGH

### Problem

No security headers in middleware response.

### Evidence

- Spec requires: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP
- NewApp middleware: Only rate limiting, NO security headers

### Impact

Security vulnerability - clickjacking, MIME sniffing attacks possible

### Fix Required

Add security headers to middleware response (~20 lines)

### Priority

🟠 **HIGH** - Security

---

## Issue 30: Missing Message Metadata Column 🟢 LOW

### Problem

OldApp has `metadata` JSONB column on Message_v2, NewApp doesn't.

### Evidence

- OldApp migration has `metadata jsonb`
- NewApp schema has no metadata field

### Impact

Cannot store message metadata

### Fix Required

Add column if used (~3 lines)

### Priority

🟢 **LOW** - Data completeness

---

## Issue 31: DataStream `transient` Flag Missing 🟠 HIGH

### Problem

OldApp dataStream writes include `transient: true` to prevent persistence, NewApp doesn't.

### Evidence

- **OldApp**: `writer.write({ type: "data-chat-title", data: title, transient: true })`
- **NewApp**: Missing `transient` property in all writes

### Impact

- Stream data may persist unexpectedly in message history

### Fix Required

Add `transient: true` to ephemeral stream writes (~5 lines)

### Priority

🟠 **HIGH** - Data persistence issue

---

## Issue 32: ModelPart Type Missing 🟡 MEDIUM

### Problem

`ModelPart` type not defined in NewApp message part union.

### Evidence

- **OldApp**: `api-types.ts` defines `ModelPart` with provider, id, label
- **NewApp**: `lib/types/stream.ts` has no `ModelPart`

### Impact

- Cannot track which model generated each response

### Fix Required

Add `ModelPart` type definition (~10 lines)

### Priority

🟡 **MEDIUM** - Type completeness

---

## Issue 33: Model Persistence in Messages 🟡 MEDIUM

### Problem

Messages don't include model info part.

### Evidence

- **OldApp**: Adds `{ type: "model", provider, id, label }` to messages
- **NewApp**: Doesn't add model info to messages

### Impact

- No history of which model was used for each message

### Fix Required

Add model part to message assembly (~15 lines)

### Priority

🟡 **MEDIUM** - Feature parity

---

## Issue 34: Suggested Actions Text Mismatch 🟢 LOW

### Problem

Different suggestion text between apps.

### Evidence

- **OldApp**: "What are the advantages of using Next.js?"
- **NewApp**: "Explain quantum computing in simple terms"

### Impact

- Different first-time user experience

### Fix Required

Update suggestion text to match OldApp (~5 lines)

### Priority

🟢 **LOW** - UX consistency

---

## Issue 35: Document Handler Model Param 🟡 MEDIUM

### Problem

NewApp passes `model` to document handlers, OldApp doesn't.

### Evidence

- **OldApp**: `createDocument({ session, dataStream, chatId })`
- **NewApp**: `createDocument({ model, session, dataStream, chatId })`

### Impact

- Need to verify this is intentional improvement

### Fix Required

Review and document or align (~10 lines)

### Priority

🟡 **MEDIUM** - API consistency

---

## Issue 36: No Network Retry Logic 🟡 MEDIUM

### Problem

Network failures cause immediate failure with no retry.

### Evidence

- Neither app implements automatic retry
- `stream.ts` throws immediately on failure
- No exponential backoff

### Impact

- Network glitches require manual retry

### Fix Required

Add retry logic with exponential backoff (~45 lines)

### Priority

🟡 **MEDIUM** - Robustness

---

## Issue 37: Regenerate Prop Threading Incomplete 🟠 HIGH

### Problem

`reload` prop not fully threaded through component tree.

### Evidence

- `reload` obtained from `useChat` in artifact-wrapper
- Passed to message-editor
- Full threading through message list unclear

### Impact

- Regenerate button may not work in all contexts

### Fix Required

Ensure `reload` prop threaded through all message components (~30 lines)

### Priority

🟠 **HIGH** - Feature broken

---

## Issue 38: Version Footer Inline Helper 🟢 LOW

### Problem

`formatDistance` helper defined inline instead of imported.

### Evidence

- **OldApp**: Imports from `@/lib/utils`
- **NewApp**: Defines inline in component

### Impact

- Code duplication risk

### Fix Required

Extract to shared utility (~5 lines)

### Priority

🟢 **LOW** - Code quality

---

## Issue 39: Missing Vercel Analytics & Speed Insights 🟡 MEDIUM

### Problem

No Vercel Analytics or Speed Insights in NewApp.

### Evidence

- **OldApp**: Has `@vercel/analytics` and `@vercel/speed-insights` in layout
- **NewApp**: Neither component exists

### Impact

- No production analytics
- No performance monitoring

### Fix Required

Add Analytics and SpeedInsights components to layout (~10 lines)

### Priority

🟡 **MEDIUM** - Observability

---

## Issue 41: Loading State UI Mismatch 🟡 MEDIUM

### Problem

Different loading UI between apps.

### Evidence

- **OldApp**: Simple centered spinner with text
- **NewApp**: Full skeleton placeholders

### Impact

- Visual difference during loading states

### Fix Required

Decide preferred approach and align (~varies)

### Priority

🟡 **MEDIUM** - UX consistency

---

## Issue 42: Metadata Title/Description Mismatch 🟢 LOW

### Problem

Different app title and description.

### Evidence

- **OldApp**: title="Ai Assistant", description="Ai Assistant using the AI SDK."
- **NewApp**: title="AI Chatbot", description="Next.js AI Chatbot using the AI SDK"

### Impact

- Different branding

### Fix Required

Update metadata if branding alignment needed (~5 lines)

### Priority

🟢 **LOW** - Branding

---

## Issue 43: Missing Upload AbortController 🟡 MEDIUM

### Problem

No AbortController for upload cancellation on unmount.

### Evidence

- **OldApp**: Has AbortController ref and cleanup in useEffect
- **NewApp**: No abort handling

### Impact

- Upload continues after navigation, wastes bandwidth

### Fix Required

Add AbortController pattern (~15 lines)

### Priority

🟡 **MEDIUM** - Resource management

---

## Issue 44: useSWRInfinite History Subscription Missing 🟡 MEDIUM

### Problem

useChatVisibility doesn't subscribe to history cache.

### Evidence

- **OldApp**: Uses useSWRInfinite to subscribe to history
- **NewApp**: Only local SWR key

### Impact

- UI desyncs when visibility updated elsewhere

### Fix Required

Add useSWRInfinite subscription (~20 lines)

### Priority

🟡 **MEDIUM** - State sync

---

## Issue 45: Missing UI Timing Constants 🟡 MEDIUM

### Problem

No centralized UI constants file.

### Evidence

- **OldApp**: Has `lib/constants.ts` with animation, scroll, debounce values
- **NewApp**: Hardcoded values throughout

### Impact

- Inconsistent UX timings, hard to maintain

### Fix Required

Create constants file (~50 lines)

### Priority

🟡 **MEDIUM** - Maintainability

---

## Issue 46: Framer Motion Version Mismatch 🟢 LOW

### Problem

Major version difference in framer-motion.

### Evidence

- **OldApp**: framer-motion ^11.3.19
- **NewApp**: framer-motion ^12.23.26

### Impact

- Possible API changes, animation differences

### Fix Required

Review changelog for breaking changes

### Priority

🟢 **LOW** - Version alignment

---

## Issue 47: localStorage Key Mismatch 🟡 MEDIUM

### Problem

Different localStorage keys for input.

### Evidence

- **OldApp**: key "input"
- **NewApp**: key "chat-input"

### Impact

- Draft input won't persist between app versions

### Fix Required

Align key names (~5 lines)

### Priority

🟡 **MEDIUM** - Data persistence

---

## Issue 48: useLocalStorage Hook Not Used 🟡 MEDIUM

### Problem

Raw localStorage used instead of useLocalStorage.

### Evidence

- **OldApp**: Uses useLocalStorage from usehooks-ts (SSR-safe)
- **NewApp**: Direct localStorage.getItem/setItem

### Impact

- Potential SSR hydration mismatches

### Fix Required

Use useLocalStorage hook (~10 lines)

### Priority

🟡 **MEDIUM** - SSR safety

---

## Issue 49: Debounced Writes Hook Missing 🟢 LOW

### Problem

Hand-rolled debounce instead of useDebounceCallback.

### Evidence

- **OldApp**: useDebounceCallback from usehooks-ts
- **NewApp**: setTimeout/clearTimeout pattern

### Impact

- Less reusable, inline magic number

### Fix Required

Use useDebounceCallback (~5 lines)

### Priority

🟢 **LOW** - Code quality

---

## Issue 50: Hydration Flag Missing for localStorage Init 🟡 MEDIUM

### Problem

No hydration tracking for localStorage initialization.

### Evidence

- **OldApp**: hasHydratedRef tracks initialization
- **NewApp**: Effect runs on every input change

### Impact

- Multiple effect runs, potential flicker

### Fix Required

Add hydration ref pattern (~15 lines)

### Priority

🟡 **MEDIUM** - Performance

---

## Issue 51: Vote Server Action Not Persisting 🔴 CRITICAL

### Problem

`voteOnMessage()` returns `{ success: true }` but never saves to database. Has TODO comment showing implementation was skipped.

### Evidence

**File**: `features/chat/actions/vote.ts`

```typescript
// TODO: Implement actual vote saving
return { success: true }; // NEVER SAVES!
```

### Impact

- All votes lost on refresh
- User voting feedback is meaningless
- Data integrity violation

### Fix Required

Import and call `saveVoteCached()` from data layer:

```typescript
import { saveVoteCached } from "@/lib/data/cached/votes";

export async function voteOnMessage(chatId: string, messageId: string, isUpvote: boolean) {
  await saveVoteCached(chatId, messageId, isUpvote);
  return { success: true };
}
```

### Related Issues

- Issue 10: Server Actions Not Persisting Data

### Priority

🔴 **CRITICAL** - Data loss

---

## Issue 52: Visibility Update Action is Stub 🟠 HIGH

### Problem

`updateChatVisibility()` returns success without updating database. Function `updateChatVisibilityCached` exists but isn't called.

### Evidence

**File**: `features/chat/actions/visibility.ts`

```typescript
export async function updateChatVisibility(chatId: string, visibility: string) {
  // TODO: Implement visibility update
  return { success: true }; // NEVER UPDATES DB!
}
```

### Impact

- Privacy settings don't persist
- Public/private toggle is broken
- Security concern for private chats

### Fix Required

Import and call `updateChatVisibilityCached`:

```typescript
import { updateChatVisibilityCached } from "@/lib/data/cached/chats";

export async function updateChatVisibility(chatId: string, visibility: ChatVisibility) {
  await updateChatVisibilityCached(chatId, visibility);
  return { success: true };
}
```

### Related Issues

- Issue 10: Server Actions Not Persisting Data

### Priority

🟠 **HIGH** - Security/Data persistence

---

## Issue 53: Message Deletion Action is Stub 🟠 HIGH

### Problem

`deleteMessagesAfterTimestamp()` returns success without deleting. Cached function exists but isn't called.

### Evidence

**File**: `features/chat/actions/messages.ts`

```typescript
export async function deleteMessagesAfterTimestamp(chatId: string, timestamp: Date) {
  // TODO: Implement message deletion
  return { success: true }; // NEVER DELETES!
}
```

### Impact

- Message regeneration broken
- Cannot undo/redo messages
- Conversation history management broken

### Fix Required

Call `deleteMessagesFromChatCached`:

```typescript
import { deleteMessagesFromChatCached } from "@/lib/data/cached/messages";

export async function deleteMessagesAfterTimestamp(chatId: string, timestamp: Date) {
  await deleteMessagesFromChatCached(chatId, timestamp);
  return { success: true };
}
```

### Related Issues

- Issue 10: Server Actions Not Persisting Data

### Priority

🟠 **HIGH** - Feature broken

---

## Issue 54: Non-null Assertion on Environment Variables 🟠 HIGH

### Problem

Uses `!` non-null assertions on NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Will crash at runtime if undefined.

### Evidence

**File**: `lib/auth/client.ts`

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

### Impact

- Runtime crash if env vars missing
- Unclear error message for developers
- Build may pass but runtime fails

### Fix Required

Add validation before use:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
```

### Related Issues

- Issue 57: DB Connection Without Error Handling

### Priority

🟠 **HIGH** - Runtime stability

---

## Issue 55: Unsafe Type Assertion in utils 🟡 MEDIUM

### Problem

Using `as unknown[]` cast without runtime validation on message.parts

### Evidence

**File**: `lib/utils/message.ts`

```typescript
const parts = message.parts as unknown[];
// No Array.isArray() check before iteration
```

### Impact

- Runtime error if parts is not an array
- Type safety bypassed
- Potential crash during message processing

### Fix Required

Add `Array.isArray()` guard:

```typescript
const parts = message.parts;
if (!Array.isArray(parts)) {
  return []; // or throw appropriate error
}
```

### Priority

🟡 **MEDIUM** - Type safety

---

## Issue 56: Unbounded Console Output Array 🟡 MEDIUM

### Problem

Console outputs array grows without limit during long sessions.

### Evidence

**File**: `features/artifacts/hooks/use-artifact.ts`

```typescript
setConsoleOutputs((prev) => [...prev, output]);
// No limit on array size!
```

### Impact

- Memory leak during long artifact sessions
- Performance degradation over time
- Browser may become unresponsive

### Fix Required

Add MAX_OUTPUTS limit or auto-cleanup:

```typescript
const MAX_OUTPUTS = 1000;
setConsoleOutputs((prev) => {
  const next = [...prev, output];
  return next.length > MAX_OUTPUTS ? next.slice(-MAX_OUTPUTS) : next;
});
```

### Priority

🟡 **MEDIUM** - Performance/Memory

---

## Issue 57: Database Connection Without Error Handling 🟠 HIGH

### Problem

DATABASE_URL uses `!` assertion without validation, crashes at module load.

### Evidence

**File**: `lib/db/client.ts`

```typescript
const connectionString = process.env.DATABASE_URL!;
// Crashes at import if DATABASE_URL is undefined
```

### Impact

- Unclear error if DATABASE_URL missing
- Module fails to load entirely
- Hard to debug in production

### Fix Required

Add explicit validation with meaningful error:

```typescript
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is required. " +
    "Please check your .env file or environment configuration."
  );
}
```

### Related Issues

- Issue 54: Non-null Assertion on Environment Variables

### Priority

🟠 **HIGH** - Runtime stability

---

## Issue 58: Missing Error Type in Catch Blocks 🟡 MEDIUM

### Problem

Errors caught but ignored without logging.

### Evidence

**Files**: `lib/auth/client.ts`, `lib/db/client.ts`

```typescript
try {
  // operation
} catch (error) {
  // error silently ignored
  return null;
}
```

### Impact

- Silent failures hard to debug
- Production issues go unnoticed
- No error telemetry

### Fix Required

Add error logging:

```typescript
try {
  // operation
} catch (error) {
  console.error("[Module] Operation failed:", error);
  return null;
}
```

### Priority

🟡 **MEDIUM** - Debugging/Observability

---

## Issue 59: Race Condition in Chat Visibility Hook 🟡 MEDIUM

### Problem

Closure captures stale previousVisibility during async operations.

### Evidence

**File**: `features/chat/hooks/use-chat-visibility.ts`

```typescript
const setVisibility = async (newVisibility: ChatVisibility) => {
  const previousVisibility = localVisibility; // Captured in closure
  // ...async operation...
  // previousVisibility may be stale if called rapidly
};
```

### Impact

- Optimistic updates may revert to wrong value
- Rapid visibility toggles produce incorrect state
- UI flickers between states

### Fix Required

Use ref to track current value:

```typescript
const visibilityRef = useRef(localVisibility);
useEffect(() => { visibilityRef.current = localVisibility; }, [localVisibility]);

const setVisibility = async (newVisibility: ChatVisibility) => {
  const previousVisibility = visibilityRef.current;
  // ...
};
```

### Priority

🟡 **MEDIUM** - Race condition

---

## Issue 60: Missing Index Optimization 🟡 MEDIUM

### Problem

deleteMessagesFromChat queries by chatId+createdAt but index ordering may not be optimal.

### Evidence

**File**: `lib/db/schema.ts`

```typescript
// Query: WHERE chatId = ? AND createdAt >= ?
// Index may not cover this efficiently
```

### Impact

- Slow message deletion on large chats
- Full table scan possible
- Database performance degradation

### Fix Required

Verify query plan or add optimized composite index:

```sql
CREATE INDEX idx_messages_chat_created ON messages(chatId, createdAt);
```

### Priority

🟡 **MEDIUM** - Performance

---

## Issue 61: Console Scroll Effect Missing Dependencies 🟢 LOW

### Problem

Auto-scroll only runs once due to empty dependency array.

### Evidence

**File**: `features/artifacts/components/artifact-panel.tsx`

```typescript
useEffect(() => {
  scrollToBottom();
}, []); // Empty deps - only runs on mount!
```

### Impact

- New console outputs don't auto-scroll
- User must manually scroll to see new output
- Poor UX for artifact console

### Fix Required

Add `consoleOutputs.length` to deps:

```typescript
useEffect(() => {
  scrollToBottom();
}, [consoleOutputs.length]);
```

### Priority

🟢 **LOW** - UX improvement

---

## Issue 62: Potential XSS via Python Output 🟠 HIGH

### Problem

Python stdout rendered without sanitization.

### Evidence

**File**: `features/artifacts/hooks/use-artifact.ts`

```typescript
// Python output added directly to console
setConsoleOutputs((prev) => [...prev, { type: "stdout", content: output }]);
// Content rendered without sanitization in artifact-panel
```

### Impact

- **SECURITY**: Malicious Python code could inject HTML/JS
- XSS attack vector through artifact console
- User data exposure possible

### Fix Required

Verify renderer sanitizes output or add sanitization:

```typescript
import DOMPurify from "dompurify";
const sanitizedOutput = DOMPurify.sanitize(output);
```

### Priority

🟠 **HIGH** - Security vulnerability

---

## Issue 63: Missing Feature Index Exports 🟢 LOW

### Problem

Some hooks not re-exported from feature index.

### Evidence

**File**: `features/*/index.ts`

```typescript
// Missing exports like:
// export { useChatVisibility } from './hooks/use-chat-visibility';
```

### Impact

- Inconsistent import paths
- Cannot use feature barrel exports
- Import statements longer than needed

### Fix Required

Add exports to feature index files:

```typescript
// features/chat/index.ts
export { useChatVisibility } from './hooks/use-chat-visibility';
export { useArtifact } from './hooks/use-artifact';
```

### Priority

🟢 **LOW** - Code organization

---

## Issue 64: Guest Chat ID Not Validated 🟡 MEDIUM

### Problem

Guest mode determined by string prefix, could be spoofed.

### Evidence

**File**: API routes checking chatId

```typescript
if (chatId.startsWith("guest-")) {
  // Assume guest mode
}
```

### Impact

- **SECURITY**: Users could spoof guest IDs
- Bypass authentication checks
- Access unauthorized data

### Fix Required

Use proper guest session token validation:

```typescript
import { validateGuestSession } from "@/lib/auth/guest";

const isGuest = await validateGuestSession(request);
if (isGuest && !chatId.startsWith("guest-")) {
  throw new AppError("unauthorized", "Invalid guest chat access");
}
```

### Priority

🟡 **MEDIUM** - Security concern

---

## Issue 65: AUTH_SECRET Validated at Runtime Only 🟠 HIGH

### Problem

AUTH_SECRET only checked when JWT function called, not at startup.

### Evidence

**File**: `lib/auth/jwt.ts`

```typescript
export function signJWT(payload: JWTPayload) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET required"); // Only checked here!
}
```

### Impact

- App starts successfully without AUTH_SECRET
- First auth attempt fails
- Production outage after deployment

### Fix Required

Add startup validation hook:

```typescript
// lib/auth/validate.ts
export function validateAuthConfig() {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET must be set before starting the application");
  }
}

// instrumentation.ts or app initialization
validateAuthConfig();
```

### Priority

🟠 **HIGH** - Runtime stability

---

## Issue 66: Missing /api/settings Route 🟠 HIGH

### Problem

`use-settings.ts` hook calls `/api/settings` endpoint but the route doesn't exist.

### Evidence

**File**: `shared/hooks/use-settings.ts`

```typescript
const { data } = useSWR('/api/settings', fetcher);
// Route doesn't exist!
```

**Missing**: `app/api/settings/route.ts`

### Impact

- Settings page makes 404 requests
- User preferences not loaded
- Console errors on every page load

### Fix Required

Create `app/api/settings/route.ts`:

```typescript
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getUserSettings(session.userId);
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await request.json();
  await updateUserSettings(session.userId, settings);
  return NextResponse.json({ success: true });
}
```

### Priority

🟠 **HIGH** - Feature broken

---

## Issue 67: Duplicate SessionContext Type Definition 🟡 MEDIUM

### Problem

`SessionContext` type is defined in two separate files, causing import confusion.

### Evidence

**File 1**: `lib/auth/types.ts`

```typescript
export type SessionContext = {
  userId: string;
  email: string;
  // ...
};
```

**File 2**: `features/chat/types.ts`

```typescript
export type SessionContext = {
  userId: string;
  // slightly different shape
};
```

### Impact

- Import from wrong file causes type mismatches
- TypeScript may not catch incompatibilities
- Developer confusion about which to use

### Fix Required

Remove duplicate from `features/chat/types.ts` and re-export from `lib/auth/types.ts`:

```typescript
// features/chat/types.ts
export type { SessionContext } from '@/lib/auth/types';
```

### Priority

🟡 **MEDIUM** - Code organization

---

## Issue 68: SessionInfo vs GuestInfo Type Confusion 🟡 MEDIUM

### Problem

`SessionInfo` uses `isGuest: boolean` while `GuestInfo` uses `userType: string`. Manual conversion needed in routes.

### Evidence

**File**: `lib/auth/types.ts`

```typescript
type SessionInfo = {
  userId: string;
  isGuest: boolean; // Boolean flag
};

type GuestInfo = {
  guestId: string;
  userType: 'guest' | 'anonymous'; // String enum
};
```

### Impact

- Type conversions scattered across codebase
- Inconsistent guest detection logic
- Potential bugs when checking guest status

### Fix Required

Unify guest detection approach:

```typescript
type SessionInfo = {
  userId: string;
  userType: 'authenticated' | 'guest' | 'anonymous';
};
// Remove separate GuestInfo, use single type
```

### Priority

🟡 **MEDIUM** - Type consistency

---

## Issue 69: Missing MessageReasoning Component 🟡 MEDIUM

### Problem

OldApp has dedicated reasoning display component, NewApp doesn't.

### Evidence

- **OldApp**: `oldapp/components/elements/reasoning.tsx` exists
- **NewApp**: No dedicated reasoning wrapper component

### Impact

- AI reasoning steps not properly displayed
- Chain-of-thought not visible to users
- Missing collapsible reasoning UI

### Fix Required

Port `reasoning.tsx` component (~30 lines):

```typescript
export function MessageReasoning({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      {/* Reasoning display */}
    </Collapsible>
  );
}
```

### Priority

🟡 **MEDIUM** - Feature parity

---

## Issue 70: Missing TipTap Suggestions Extension 🟠 HIGH

### Problem

OldApp has TipTap suggestions extension for text artifacts, NewApp doesn't have equivalent.

### Evidence

- **OldApp**: `oldapp/artifacts/text/extensions/suggestions.ts`
- **NewApp**: No suggestions extension in artifact editors

### Impact

- Text suggestions in artifacts non-functional
- AI-powered text completion unavailable
- Major feature regression

### Fix Required

Port `suggestions.ts` extension (~100 lines):

```typescript
export const Suggestions = Extension.create({
  name: 'suggestions',
  addProseMirrorPlugins() {
    // Suggestion popup logic
  },
});
```

### Priority

🟠 **HIGH** - Feature broken

---

## Issue 71: Missing branch.tsx Component 🟡 MEDIUM

### Problem

Conversation branching/forking UI completely missing from NewApp.

### Evidence

- **OldApp**: Has branch.tsx for conversation forking
- **NewApp**: No equivalent component

### Impact

- Cannot fork conversations
- Cannot explore alternative AI responses
- Feature regression for power users

### Fix Required

Port branching component (~50 lines)

### Priority

🟡 **MEDIUM** - Feature parity

---

## Issue 72: Missing Tool Types Definition 🟡 MEDIUM

### Problem

OldApp has centralized `ChatTools` type definition, NewApp doesn't.

### Evidence

- **OldApp**: `ChatTools` type with `documentHandler`, `codeRunner`, etc.
- **NewApp**: No central tool types definition

### Impact

- Tool handling not type-safe
- Each component defines own tool types
- Inconsistent tool interfaces

### Fix Required

Add `lib/types/tools.ts`:

```typescript
export type ChatTools = {
  documentHandler: DocumentHandler;
  codeRunner: CodeRunner;
  // ...
};
```

### Priority

🟡 **MEDIUM** - Type safety

---

## Issue 73: SheetEditor Not Lazy-Loaded 🟡 MEDIUM

### Problem

react-data-grid (~95KB) imported directly instead of using dynamic import.

### Evidence

**File**: `features/artifacts/editors/sheet-editor.tsx`

```typescript
import DataGrid from 'react-data-grid';
// Direct import - loads on initial bundle
```

### Impact

- Initial bundle size increased by ~95KB
- Slower first page load
- Users who don't use sheets pay the cost

### Fix Required

Use Next.js dynamic import:

```typescript
import dynamic from 'next/dynamic';
const DataGrid = dynamic(() => import('react-data-grid'), { ssr: false });
```

### Priority

🟡 **MEDIUM** - Performance

---

## Issue 74: Heavy Library Direct Imports 🟡 MEDIUM

### Problem

Same issue as #73 - heavy libraries imported directly instead of lazy.

### Evidence

Multiple heavy imports across artifact editors:
- `react-data-grid` (~95KB)
- `@tiptap/*` (combined ~150KB)
- Chart libraries

### Impact

- Bundle bloat
- Slow initial load
- Poor Core Web Vitals

### Fix Required

Audit all artifact editors and use dynamic imports for heavy deps.

### Priority

🟡 **MEDIUM** - Performance

---

## Issue 75: ARIA Accessibility Error 🟡 MEDIUM

### Problem

Invalid ARIA attribute values in switch component.

### Evidence

**File**: `shared/ui/switch.tsx`

```typescript
<button
  role="switch"
  aria-checked={checked}
  aria-invalid={invalid} // May have invalid value
  // ...
>
```

### Impact

- Accessibility validation fails
- Screen readers may behave unexpectedly
- WCAG compliance issues

### Fix Required

Ensure boolean values for ARIA attributes:

```typescript
aria-checked={checked ? "true" : "false"}
```

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 76: No Tests for API Routes 🟠 HIGH

### Problem

8 API route handlers have zero test coverage.

### Evidence

**Location**: `app/api/`
- `chat/route.ts` - No tests
- `history/route.ts` - No tests
- `document/route.ts` - No tests
- `health/route.ts` - No tests
- Others - No tests

### Impact

- Regressions not caught
- Refactoring risky
- No confidence in API behavior

### Fix Required

Create `tests/api/*.test.ts` for each route (~200 lines total)

### Priority

🟠 **HIGH** - Test coverage

---

## Issue 77: No Tests for lib/ai/tools 🟡 MEDIUM

### Problem

AI tools have no unit tests.

### Evidence

**Files**:
- `lib/ai/tools/create-document.ts` - No tests
- `lib/ai/tools/update-document.ts` - No tests
- Other tools - No tests

### Impact

- AI tool behavior not verified
- Edge cases not covered
- Refactoring risky

### Fix Required

Create `tests/unit/ai/tools/*.test.ts` (~150 lines total)

### Priority

🟡 **MEDIUM** - Test coverage

---

## Issue 78: No Tests for lib/cache-ops 🟡 MEDIUM

### Problem

8 cache operation files have zero test coverage.

### Evidence

**Location**: `lib/cache-ops/`
- All files lack corresponding test files
- Critical caching logic unverified

### Impact

- Cache invalidation bugs possible
- Stale data scenarios not tested
- Cache consistency not verified

### Fix Required

Create `tests/unit/cache-ops/*.test.ts` (~150 lines total)

### Priority

🟡 **MEDIUM** - Test coverage

---

## Issue 79: Missing lib/data Unit Tests 🟡 MEDIUM

### Problem

Only integration tests exist for data layer, no unit tests.

### Evidence

**Location**: `lib/data/`
- Integration tests exist (hit real DB)
- No isolated unit tests with mocked DB

### Impact

- Tests slow to run
- Can't test edge cases easily
- DB required for all tests

### Fix Required

Add unit tests with mocked drizzle client (~100 lines)

### Priority

🟡 **MEDIUM** - Test coverage

---

## Issue 80: lib/ai Imports from features/ 🟡 MEDIUM

### Problem

`lib/ai/tools` imports from `features/artifacts/server`, violating layering.

### Evidence

**File**: `lib/ai/tools/*.ts`

```typescript
import { something } from '@/features/artifacts/server';
// lib should NOT depend on features!
```

### Impact

- Circular dependency risk
- Layer violation
- Harder to test lib in isolation

### Fix Required

Move shared code to `lib/` or create interface in `lib/types/`:

```typescript
// lib/types/artifacts.ts
export interface ArtifactHandler { ... }
```

### Priority

🟡 **MEDIUM** - Architecture

---

## Issue 81: lib/providers Imports from features/chat 🟡 MEDIUM

### Problem

`ModelMetadata` type imported from features into lib.

### Evidence

**File**: `lib/providers/*.ts`

```typescript
import { ModelMetadata } from '@/features/chat/types';
// Should be in lib/types
```

### Impact

- Layer violation
- Type should be in lower layer

### Fix Required

Move `ModelMetadata` to `lib/types/models.ts`

### Priority

🟡 **MEDIUM** - Architecture

---

## Issue 82: lib/data Imports Type from features/artifacts 🟡 MEDIUM

### Problem

`ArtifactKind` type imported from features into lib.

### Evidence

**File**: `lib/data/*.ts`

```typescript
import { ArtifactKind } from '@/features/artifacts/types';
// Layer violation
```

### Impact

- Features should depend on lib, not reverse
- Circular dependency risk

### Fix Required

Move `ArtifactKind` to `lib/types/artifacts.ts`

### Priority

🟡 **MEDIUM** - Architecture

---

## Issue 83: Missing Security Headers in Middleware 🔴 CRITICAL

### Problem

Middleware doesn't set security headers.

### Evidence

**File**: `middleware.ts`

```typescript
// Missing headers:
// - X-Frame-Options
// - X-Content-Type-Options
// - Content-Security-Policy
// - Referrer-Policy
```

### Impact

- **SECURITY**: Clickjacking attacks possible
- **SECURITY**: MIME sniffing attacks possible
- **SECURITY**: No CSP protection

### Fix Required

Add security headers to middleware:

```typescript
const response = NextResponse.next();
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Content-Security-Policy', "default-src 'self'; ...");
return response;
```

### Priority

🔴 **CRITICAL** - Security vulnerability

---

## Issue 84: XSS via Unsanitized Code Highlighting 🔴 CRITICAL

### Problem

Code block uses `dangerouslySetInnerHTML` without DOMPurify sanitization.

### Evidence

**File**: `components/ai-elements/code-block.tsx`

```typescript
<pre
  dangerouslySetInnerHTML={{ __html: highlightedCode }}
  // NO SANITIZATION!
/>
```

### Impact

- **SECURITY**: Malicious code can inject scripts
- **SECURITY**: XSS attack vector
- User data at risk

### Fix Required

Add DOMPurify sanitization:

```typescript
import DOMPurify from 'dompurify';

<pre
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(highlightedCode, {
      ALLOWED_TAGS: ['span', 'code'],
      ALLOWED_ATTR: ['class'],
    })
  }}
/>
```

### Priority

🔴 **CRITICAL** - Security vulnerability

---

## Issue 85: Chat API Allows Unauthenticated Access 🟠 HIGH

### Problem

Chat API doesn't require session, allowing AI abuse.

### Evidence

**File**: `app/api/chat/route.ts`

```typescript
export async function POST(request: Request) {
  // No session check at start!
  // AI calls proceed without auth
}
```

### Impact

- **SECURITY**: AI abuse vector
- Cost exposure from unauthorized usage
- No rate limiting per user

### Fix Required

Require at minimum guest session:

```typescript
const session = await getSession(request);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Priority

🟠 **HIGH** - Security/Cost

---

## Issue 86: Health Endpoint Exposes Internal State 🟠 HIGH

### Problem

Health endpoint publicly exposes DB latency, cache status, env info.

### Evidence

**File**: `app/api/health/route.ts`

```typescript
return NextResponse.json({
  status: 'healthy',
  database: { latency: 45, status: 'connected' },
  cache: { status: 'connected', hitRate: 0.85 },
  environment: process.env.NODE_ENV,
  // Too much info!
});
```

### Impact

- **SECURITY**: Information disclosure
- Attackers learn infrastructure details
- Timing attacks possible

### Fix Required

Return minimal public info:

```typescript
// Public endpoint
return NextResponse.json({ status: 'healthy' });

// Admin-only endpoint with details
if (isAdmin(session)) {
  return NextResponse.json({ status: 'healthy', ...details });
}
```

### Priority

🟠 **HIGH** - Security

---

## Issue 87: Token Stored Without Additional Binding 🟠 HIGH

### Problem

Stolen token = full session hijack. No additional binding.

### Evidence

**File**: `app/api/auth/exchange/route.ts`

```typescript
// Token stored without:
// - IP binding
// - Device fingerprint
// - Token rotation
```

### Impact

- **SECURITY**: Token theft = full access
- No defense against session hijacking
- No token rotation

### Fix Required

Consider additional binding:

```typescript
// Option 1: Token rotation
// Option 2: IP binding (with fallback)
// Option 3: Device fingerprinting
```

### Priority

🟠 **HIGH** - Security

---

## Issue 88: Rate Limiting Fails Open 🟠 HIGH

### Problem

Rate limiter configured with `failOpen: true` - Redis down = no limits.

### Evidence

**File**: `lib/middleware/rate-limit.ts`

```typescript
const rateLimiter = new RateLimiter({
  failOpen: true, // Dangerous default!
});
```

### Impact

- **SECURITY**: Redis outage = no rate limiting
- DDoS protection bypassed
- Cost exposure during outages

### Fix Required

Change to fail closed with fallback:

```typescript
const rateLimiter = new RateLimiter({
  failOpen: false,
  fallback: inMemoryRateLimiter, // Local fallback
});
```

### Priority

🟠 **HIGH** - Security

---

## Issue 89: AUTH_SECRET Runtime Validation (Security Context) 🟡 MEDIUM

### Problem

AUTH_SECRET only validated at runtime, not startup. Same as #65 but security-focused.

### Evidence

**File**: `lib/auth/jwt.ts`

```typescript
// Validated only when first JWT signed
if (!process.env.AUTH_SECRET) throw new Error(...);
```

### Impact

- App runs without auth configured
- First auth attempt fails
- Security misconfiguration not caught early

### Fix Required

Validate at startup in `instrumentation.ts`:

```typescript
export function register() {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET required at startup");
  }
}
```

### Related Issues

- Issue 65: AUTH_SECRET Runtime Only

### Priority

🟡 **MEDIUM** - Security configuration

---

## Issue 90: Open Redirect Protection Incomplete 🟡 MEDIUM

### Problem

Redirect validation doesn't handle URL-encoded variants.

### Evidence

**File**: `lib/auth/guards.ts`

```typescript
function isValidRedirect(url: string) {
  // Doesn't handle:
  // - /%2F (encoded slash)
  // - //evil.com
  // - javascript: URLs
}
```

### Impact

- **SECURITY**: Open redirect possible via encoding
- Phishing attacks via encoded URLs
- OAuth flow hijacking

### Fix Required

Use URL parsing with strict allowlist:

```typescript
function isValidRedirect(url: string): boolean {
  try {
    const parsed = new URL(url, process.env.NEXT_PUBLIC_APP_URL);
    const allowed = [process.env.NEXT_PUBLIC_APP_URL];
    return allowed.some(a => parsed.origin === new URL(a).origin);
  } catch {
    return false;
  }
}
```

### Priority

🟡 **MEDIUM** - Security

---

## Issue 91: Server Actions Lack Explicit CSRF Verification 🟡 MEDIUM

### Problem

Server actions rely only on Next.js implicit CSRF protection.

### Evidence

**Files**: `features/chat/actions/*.ts`

```typescript
"use server";
export async function someAction() {
  // No explicit Origin header check
  // Relies entirely on Next.js
}
```

### Impact

- Defense in depth lacking
- Framework bug = vulnerability
- No explicit verification logged

### Fix Required

Add explicit Origin check:

```typescript
import { headers } from 'next/headers';

export async function someAction() {
  const origin = headers().get('origin');
  if (origin !== process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("Invalid origin");
  }
  // ...
}
```

### Priority

🟡 **MEDIUM** - Security defense in depth

---

## Issue 92: Document Handler Error Messages Leak Info 🟡 MEDIUM

### Problem

Error messages reveal document existence and internal kind.

### Evidence

**File**: `lib/ai/tools/update-document.ts`

```typescript
if (!document) {
  throw new Error(`Document ${id} not found`); // Reveals ID
}
if (document.kind !== expectedKind) {
  throw new Error(`Document is ${document.kind}, expected ${expectedKind}`); // Reveals kind
}
```

### Impact

- **SECURITY**: Information disclosure
- Attackers can enumerate documents
- Internal structure exposed

### Fix Required

Return generic errors:

```typescript
if (!document || document.kind !== expectedKind) {
  throw new Error("Unable to process request");
}
```

### Priority

🟡 **MEDIUM** - Security

---

## Issue 93: AI Token Usage Logged with User ID 🟡 MEDIUM

### Problem

Token usage logs include userId which may be PII under GDPR.

### Evidence

**File**: `app/api/chat/route.ts`

```typescript
console.info("[Chat API] Usage:", {
  userId, // PII!
  tokens: usage.totalTokens,
});
```

### Impact

- GDPR compliance concern
- PII in logs
- User tracking in server logs

### Fix Required

Hash or truncate userId in logs:

```typescript
console.info("[Chat API] Usage:", {
  userIdHash: hashUserId(userId).slice(0, 8),
  tokens: usage.totalTokens,
});
```

### Priority

🟡 **MEDIUM** - Privacy/GDPR

---

## Issue 94: JWT Cookie TTL vs Token Expiry Mismatch 🟢 LOW

### Problem

Cookie TTL (7 days) doesn't match JWT expiry (1 hour).

### Evidence

**File**: `lib/auth/constants.ts`

```typescript
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
export const JWT_EXPIRY = '1h'; // 1 hour
```

### Impact

- Cookie persists after token expires
- May cause confusion
- Token refresh behavior unclear

### Fix Required

Either align values or document intention:

```typescript
// Option 1: Align
export const COOKIE_MAX_AGE = 60 * 60; // 1 hour

// Option 2: Document
/** Cookie persists for refresh flow, token expires hourly */
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
```

### Priority

🟢 **LOW** - Configuration clarity

---

## Issue 95: IP Extraction Uses x-forwarded-for Without Validation 🟢 LOW

### Problem

Trusts x-forwarded-for header which can be spoofed.

### Evidence

**File**: `lib/middleware/rate-limit.ts`

```typescript
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] 
  ?? request.ip 
  ?? 'unknown';
// No validation of trusted proxy
```

### Impact

- Rate limit bypass via spoofed header
- Only issue if not behind trusted proxy
- Vercel handles this, but self-hosted may not

### Fix Required

Document deployment requirements or add proxy validation:

```typescript
// Document: "Deploy behind Vercel or trusted reverse proxy"
// OR
const trustedProxies = ['10.0.0.0/8', ...];
const ip = validateProxyChain(request, trustedProxies);
```

### Priority

🟢 **LOW** - Deployment documentation

---

## Issue 96: No Explicit CORS Configuration 🟢 LOW

### Problem

No explicit CORS headers, relies on Next.js defaults.

### Evidence

Project-wide - no `Access-Control-*` headers set in middleware or routes.

### Impact

- Cross-origin requests may behave unexpectedly
- API integrations may fail
- Mobile apps may have issues

### Fix Required

Add explicit CORS in middleware:

```typescript
// middleware.ts
if (request.method === 'OPTIONS') {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

### Priority

🟢 **LOW** - API configuration

---

## Issue 97: All 31 E2E Tests Failing 🔴 CRITICAL

### Problem

All E2E tests fail due to missing mock AI provider.

### Evidence

**File**: `test-results/results.json`

All 31 tests timeout waiting for AI responses. Tests attempt real AI API calls.

### Impact

- **Verification phase BLOCKED**
- Cannot validate feature parity
- CI/CD pipeline broken

### Fix Required

1. Create mock AI provider in `tests/__mocks__/ai-provider.ts`
2. Add `USE_MOCK_AI` environment variable check
3. Configure Playwright to use mock provider

### Priority

🔴 **CRITICAL** - Verification blocked

---

## Issue 98: Missing `data-testid="artifact-panel"` 🟠 HIGH

### Problem

Tests expect `artifact-panel` testid but implementation uses `artifact-code`.

### Evidence

**File**: `features/artifacts/components/artifact.tsx`

Tests search for `data-testid="artifact-panel"` but component has different testid.

### Impact

- All artifact E2E tests fail with element not found

### Fix Required

Add `data-testid="artifact-panel"` to artifact panel wrapper component (~5 lines)

### Priority

🟠 **HIGH** - E2E tests broken

---

## Issue 99: Missing `data-testid="artifact-document-preview"` 🟠 HIGH

### Problem

Document preview testid not present in new implementation.

### Evidence

E2E tests in `tests/e2e/` expect `artifact-document-preview` but not found in `features/`.

### Impact

- Document preview E2E tests fail

### Fix Required

Add testid to document preview component (~5 lines)

### Priority

🟠 **HIGH** - E2E tests broken

---

## Issue 100: Missing `data-testid="toggle-sidebar-button"` 🟡 MEDIUM

### Problem

Sidebar toggle button missing testid.

### Evidence

**File**: `features/sidebar/components/sidebar-toggle.tsx`

E2E tests expect `toggle-sidebar-button` testid.

### Impact

- Sidebar toggle E2E tests fail

### Fix Required

Add `data-testid="toggle-sidebar-button"` to toggle button (~5 lines)

### Priority

🟡 **MEDIUM** - E2E tests broken

---

## Issue 101: Missing `data-testid="visibility-dropdown-item-*"` Pattern 🟡 MEDIUM

### Problem

Visibility selector dropdown items missing testid pattern.

### Evidence

**File**: `features/chat/components/visibility-selector.tsx`

E2E tests expect `visibility-dropdown-item-public`, `visibility-dropdown-item-private` etc.

### Impact

- Visibility selector E2E tests fail

### Fix Required

Add `data-testid="visibility-dropdown-item-${value}"` to each dropdown item (~10 lines)

### Priority

🟡 **MEDIUM** - E2E tests broken

---

## Issue 102: Missing `data-testid="artifact-version-footer"` 🟡 MEDIUM

### Problem

Artifact version footer missing testid.

### Evidence

**File**: `features/artifacts/components/artifact-panel.tsx`

E2E tests expect `artifact-version-footer` for version navigation tests.

### Impact

- Version E2E tests fail

### Fix Required

Add testid to version footer component (~5 lines)

### Priority

🟡 **MEDIUM** - E2E tests broken

---

## Issue 103: Missing `data-testid="toast"` 🟢 LOW

### Problem

Toast component missing testid for error display verification.

### Evidence

**File**: `shared/ui/toast.tsx`

Auth error E2E tests expect to find toast by testid.

### Impact

- Auth error E2E tests fail

### Fix Required

Add `data-testid="toast"` to toast component (~5 lines)

### Priority

🟢 **LOW** - E2E tests incomplete

---

## Issue 104: Missing `maxDuration` Export in Chat Route 🟠 HIGH

### Problem

AI timeout 55s but no `maxDuration` export causes Vercel default 10s timeout.

### Evidence

**File**: `app/api/chat/route.ts`

AI SDK configured for 55s timeout but route lacks:

```typescript
export const maxDuration = 60;
```

### Impact

- **Vercel terminates at default 10s serverless timeout**
- Long AI responses fail in production

### Fix Required

Add `export const maxDuration = 60;` to route file (~5 lines)

### Priority

🟠 **HIGH** - Production breaking

---

## Issue 105: Next.js Experimental Features Without Fallbacks 🟡 MEDIUM

### Problem

Config uses experimental features without version checks.

### Evidence

**File**: `next.config.ts`

```typescript
experimental: {
  serverComponentsHmrCache: true,
  viewTransition: true,
}
```

No version checks or fallbacks provided.

### Impact

- May break on older Next.js versions

### Fix Required

Add version detection or fallback handling (~10 lines)

### Priority

🟡 **MEDIUM** - Compatibility

---

## Issue 106: `noUncheckedIndexedAccess` Violations 🟡 MEDIUM

### Problem

TypeScript config enables `noUncheckedIndexedAccess` but code uses unsafe index access.

### Evidence

Multiple files use `MODEL_REGISTRY[modelId]` without undefined checks.

### Impact

- TypeScript should error but doesn't
- Potential runtime undefined errors

### Fix Required

Add proper undefined checks after indexed access (~20 lines)

### Priority

🟡 **MEDIUM** - Type safety

---

## Issue 107: Biome Rules Disabled Without Tracking 🟢 LOW

### Problem

14+ Biome rules disabled with "Needs more work to fix" comment.

### Evidence

**File**: `biome.jsonc`

Many rules disabled without tracking when they should be re-enabled.

### Impact

- Technical debt accumulates
- Code quality degrades over time

### Fix Required

Create tracking issue for each disabled rule (~0 lines, documentation)

### Priority

🟢 **LOW** - Technical debt

---

## Issue 108: Missing `BLOB_READ_WRITE_TOKEN` in .env.example 🟠 HIGH

### Problem

Code uses `BLOB_READ_WRITE_TOKEN` but not documented in .env.example.

### Evidence

**File**: `.env.example` missing entry

Code in file upload routes requires this token.

### Impact

- **File upload fails without it**
- Developer confusion during setup

### Fix Required

Add to .env.example with comment (~5 lines)

### Priority

🟠 **HIGH** - Setup broken

---

## Issue 109: Missing `SUPABASE_SERVICE_ROLE_KEY` Documentation 🟡 MEDIUM

### Problem

Code checks for service role key but only anon key documented.

### Evidence

**File**: `.env.example`

Code expects `SUPABASE_SERVICE_ROLE_KEY` for admin operations.

### Impact

- Admin features may fail

### Fix Required

Add to .env.example (~5 lines)

### Priority

🟡 **MEDIUM** - Documentation

---

## Issue 110: Missing `LOG_LEVEL` in .env.example 🟢 LOW

### Problem

Logger uses `LOG_LEVEL` but not documented.

### Evidence

**File**: `lib/errors/logger.ts`

Uses `process.env.LOG_LEVEL` for log filtering.

### Impact

- Developers unaware of logging configuration

### Fix Required

Add to .env.example (~5 lines)

### Priority

🟢 **LOW** - Documentation

---

## Issue 111: Missing `USE_MOCK_AI` in .env.example 🟡 MEDIUM

### Problem

Mock AI mode not documented.

### Evidence

**File**: `lib/ai/providers.ts`

E2E tests need mock mode but no documentation.

### Impact

- E2E tests can't enable mock mode easily

### Fix Required

Add to .env.example with usage instructions (~5 lines)

### Priority

🟡 **MEDIUM** - Testing support

---

## Issue 112: Missing `TOOL_MODEL_ID` and `TITLE_MODEL_ID` in .env.example 🟢 LOW

### Problem

Tool and title model configuration not documented.

### Evidence

**Files**: `lib/ai/models.ts`, `lib/ai/prompts/system.ts`

These environment variables are used but not in .env.example.

### Impact

- Developers may not know about model customization

### Fix Required

Add both to .env.example (~5 lines)

### Priority

🟢 **LOW** - Documentation

---

## Issue 113: Missing `DEFAULT_CHAT_MODEL_ID` in .env.example 🟢 LOW

### Problem

Default model configuration not documented.

### Evidence

**File**: `lib/ai/models.ts`

Uses `DEFAULT_CHAT_MODEL_ID` but not documented.

### Impact

- Developers unaware of default model config

### Fix Required

Add to .env.example (~5 lines)

### Priority

🟢 **LOW** - Documentation

---

## Issue 114: Mobile Detection Header Not Set by Middleware 🟠 HIGH

### Problem

Layout reads `x-device-type` header but middleware doesn't set it.

### Evidence

**Files**: `app/(chat)/layout.tsx`, `middleware.ts`

Layout expects header:
```typescript
const deviceType = headers().get('x-device-type');
```

But middleware never sets this header.

### Impact

- **`isMobile` always false on server**
- Mobile layout never renders on SSR

### Fix Required

Add device detection and header setting in middleware (~15 lines)

### Priority

🟠 **HIGH** - Mobile UX broken

---

## Issue 115: `useScreenSize` Returns 0 During SSR 🟡 MEDIUM

### Problem

Hook returns zero dimensions during SSR.

### Evidence

**File**: `shared/hooks/use-mobile.ts`

Returns `{ width: 0, height: 0 }` via `safeDimensions` during SSR.

### Impact

- Layout calculations incorrect on first render
- Potential layout shift

### Fix Required

Use sensible defaults or skip SSR calculations (~10 lines)

### Priority

🟡 **MEDIUM** - UX issue

---

## Issue 116: Potential Hydration Mismatch in Artifact Component 🟡 MEDIUM

### Problem

`useMotionValue(0)` may cause different values server vs client.

### Evidence

**File**: `features/artifacts/components/artifact.tsx`

Uses Framer Motion values that differ between server/client.

### Impact

- Potential hydration mismatch warnings
- Animation glitches on initial render

### Fix Required

Use `useIsClient` guard or `suppressHydrationWarning` (~15 lines)

### Priority

🟡 **MEDIUM** - UX issue

---

## Issue 117: Missing `server-only` Guard on Rate Limit Module 🟡 MEDIUM

### Problem

Rate limit module uses Redis/env vars but no server-only guard.

### Evidence

**File**: `lib/middleware/rate-limit.ts`

Uses server resources but can be accidentally imported client-side.

### Impact

- Potential client bundle pollution
- Runtime errors if imported client-side

### Fix Required

Add `import "server-only";` at top of file (~5 lines)

### Priority

🟡 **MEDIUM** - Build safety

---

## Issue 118: Non-null Assertion on DATABASE_URL Without Validation 🟠 HIGH

### Problem

Database connection uses non-null assertion without validation.

### Evidence

**File**: `lib/db/client.ts`

```typescript
postgres(process.env.DATABASE_URL!)
```

### Impact

- **Crashes without meaningful error** if env missing
- Difficult debugging in deployment

### Fix Required

Add validation with clear error message (~10 lines)

### Priority

🟠 **HIGH** - DX issue

---

## Issue 119: Supabase Client Non-null Assertions 🟠 HIGH

### Problem

Supabase client uses non-null assertions without validation.

### Evidence

**File**: `lib/auth/client.ts`

```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL!
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

### Impact

- **Silent crash if env missing**
- No actionable error message

### Fix Required

Add validation with clear error messages (~10 lines)

### Priority

🟠 **HIGH** - DX issue

---

## Issue 120: Redis Graceful Degradation Not Used Consistently 🟡 MEDIUM

### Problem

`createRedisClient()` returns null if not configured but callers don't check.

### Evidence

Multiple rate limit usages assume Redis is available.

### Impact

- Features may fail silently without Redis
- Inconsistent behavior

### Fix Required

Add null checks at all call sites (~15 lines)

### Priority

🟡 **MEDIUM** - Robustness

---

## Issue 121: Health Check Returns 200 for "degraded" Status 🟢 LOW

### Problem

Only "unhealthy" returns 503, "degraded" returns 200.

### Evidence

**File**: `app/api/health/route.ts`

Degraded status (e.g., Redis down) still returns 200 OK.

### Impact

- May fool health monitors
- Load balancers may route to degraded instances

### Fix Required

Return 503 for degraded status too (~5 lines)

### Priority

🟢 **LOW** - Operations

---

## Issue 122: Vercel Blob Token Not Validated Before Use 🟡 MEDIUM

### Problem

Token check at line 99 but import may fail earlier.

### Evidence

**File**: `app/api/files/upload/route.ts`

Validation happens after potential failures.

### Impact

- Confusing error messages
- Potential partial execution

### Fix Required

Move validation to start of handler (~10 lines)

### Priority

🟡 **MEDIUM** - Error handling

---

## Issue 123: AI Provider Registration Silent Failures 🟡 MEDIUM

### Problem

Providers only register if API key exists, no logging.

### Evidence

**File**: `lib/ai/providers.ts`

Silent skip when API key missing.

### Impact

- **Hard to debug missing providers**
- No visibility into which providers loaded

### Fix Required

Add info-level logging for registered/skipped providers (~10 lines)

### Priority

🟡 **MEDIUM** - Debugging

---

## Issue 124: Playwright `webServer` Points to Health Endpoint That May Fail 🟡 MEDIUM

### Problem

Playwright uses `/api/health` which requires DATABASE_URL.

### Evidence

**File**: `playwright.config.ts`

Health check may fail if database not configured.

### Impact

- E2E tests can't start without full environment

### Fix Required

Create simpler ping endpoint or handle gracefully (~5 lines)

### Priority

🟡 **MEDIUM** - Testing setup

---

## Issue 125: No Mock AI Provider for E2E Tests 🟠 HIGH

### Problem

All E2E tests send real AI requests.

### Evidence

**Directory**: `tests/e2e/`

No mock provider configured, tests use real APIs.

### Impact

- **Tests are slow, flaky, require API keys**
- CI requires real API credentials
- Tests may hit rate limits

### Fix Required

Implement mock AI provider with deterministic responses (~80 lines)

### Priority

🟠 **HIGH** - Testing infrastructure

---

## Issue 126: Auth Tests Create Real Users 🟡 MEDIUM

### Problem

Auth tests register real users in Supabase without cleanup.

### Evidence

**File**: `tests/e2e/auth.spec.ts`

Tests create actual users, no afterAll cleanup.

### Impact

- Pollutes test database
- May hit user limits
- Tests not idempotent

### Fix Required

Add cleanup in afterAll or use test-specific Supabase project (~30 lines)

### Priority

🟡 **MEDIUM** - Test hygiene

---

## Issue 127: Test Timeout Too Long 🟢 LOW

### Problem

60s timeout per test, 30s for AI responses.

### Evidence

**File**: `playwright.config.ts`

Long timeouts configured.

### Impact

- **CI will be very slow**
- Failing tests take long to report

### Fix Required

Reduce timeouts, especially with mock provider (~5 lines)

### Priority

🟢 **LOW** - CI performance

---

## UI Component Issues (#128-#184)

### Accessibility Issues

---

## Issue 128: Missing aria-live Greeting Animation 🟡 MEDIUM

### Problem

Animated greeting in overview has no `aria-live` region for screen readers.

### Evidence

**File**: `features/chat/components/overview.tsx` Lines 7-23

Greeting animates in character-by-character but screen readers won't announce it.

### Impact

- Screen reader users miss greeting animation
- Accessibility compliance issue

### Fix Required

Add `aria-live="polite"` to greeting container (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 129: Hardcoded Greeting Text 🟢 LOW

### Problem

Greeting text "Hello there!" is hardcoded, not internationalized.

### Evidence

**File**: `features/chat/components/overview.tsx` Line 14

```typescript
const greeting = "Hello there!"; // HARDCODED
```

### Impact

- No i18n support
- Cannot customize greeting

### Fix Required

Move to constants or i18n system (~5 lines)

### Priority

🟢 **LOW** - i18n concern

---

## Issue 130: Missing role="alert" Error Fallback 🟡 MEDIUM

### Problem

Error fallback component lacks `role="alert"` for screen readers.

### Evidence

**File**: `features/chat/components/chat.tsx` Lines 52-56

Error state not announced to assistive technology.

### Impact

- Screen readers won't announce errors
- Accessibility compliance issue

### Fix Required

Add `role="alert"` to error container (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 131: Nested Interactive Elements 🟠 HIGH

### Problem

Button nested inside DropdownMenuItem creates invalid HTML and accessibility issues.

### Evidence

**File**: `features/chat/components/chat-header.tsx` Lines 141-148

```typescript
<DropdownMenuItem>
  <button>...</button> // NESTED INTERACTIVE
</DropdownMenuItem>
```

### Impact

- Invalid HTML (button in button)
- Screen reader confusion
- Click handler conflicts

### Fix Required

Use `asChild` prop or restructure component (~10 lines)

### Priority

🟠 **HIGH** - Accessibility violation

---

## Issue 132: Hardcoded Featured Model IDs 🟡 MEDIUM

### Problem

Featured and "new" model IDs are hardcoded in component.

### Evidence

**File**: `features/chat/components/model-selector.tsx` Lines 33-50

```typescript
const featuredModels = ["gpt-4o", "claude-3"]; // HARDCODED
const newModels = ["gpt-4o-mini"];
```

### Impact

- Difficult to update model lists
- No config-driven approach

### Fix Required

Move to config or environment variables (~15 lines)

### Priority

🟡 **MEDIUM** - Maintainability

---

## Issue 133: Model Selector Missing Loading State 🟡 MEDIUM

### Problem

No loading indicator when refreshing model list.

### Evidence

**File**: `features/chat/components/model-selector.tsx` Lines 296-310

Refresh triggers but no visual feedback during fetch.

### Impact

- Users unsure if action worked
- Poor UX during slow connections

### Fix Required

Add loading spinner during model refresh (~10 lines)

### Priority

🟡 **MEDIUM** - UX

---

## Issue 134: Missing aria-selected Dropdown Items 🟡 MEDIUM

### Problem

Dropdown items lack `aria-selected` for current selection.

### Evidence

**File**: `features/chat/components/model-selector.tsx` Lines 68-75

Selected model not indicated to assistive technology.

### Impact

- Screen readers can't identify current selection

### Fix Required

Add `aria-selected={isSelected}` to items (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 135: Missing Accessible Name Textarea 🟡 MEDIUM

### Problem

Chat input textarea lacks accessible name.

### Evidence

**File**: `features/chat/components/multimodal-input.tsx` Lines 143-146

No `aria-label` or associated label element.

### Impact

- Screen readers announce as "edit text" only

### Fix Required

Add `aria-label="Message input"` (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 136: Error Context Ignored 🟢 LOW

### Problem

Error context from streaming is logged but not surfaced to UI.

### Evidence

**File**: `features/chat/components/multimodal-input.tsx` Lines 114-117

```typescript
onError: (error) => {
  console.error(error); // LOGGED BUT NOT DISPLAYED
}
```

### Impact

- Users see generic error, not specific message

### Fix Required

Pass error to toast or error display (~5 lines)

### Priority

🟢 **LOW** - Error UX

---

## Issue 137: Hardcoded Weather Sample Data 🟠 HIGH

### Problem

Weather component falls back to hardcoded sample data as default.

### Evidence

**File**: `features/chat/components/tools/weather.tsx` Lines 157-229

Extensive hardcoded weather data used when no data provided.

### Impact

- **Shows fake data to users**
- Misleading weather information

### Fix Required

Show error/loading state instead of fake data (~30 lines)

### Priority

🟠 **HIGH** - Data integrity

---

## Issue 138: Missing Weather Icon Alt Text 🟡 MEDIUM

### Problem

Weather icons lack descriptive alt text.

### Evidence

**File**: `features/chat/components/tools/weather.tsx` Line 265

Weather condition icons have no alt text.

### Impact

- Screen readers can't describe weather conditions

### Fix Required

Add meaningful alt text based on weather condition (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 139: Mobile Visibility Button Hidden 🟡 MEDIUM

### Problem

Visibility selector button hidden on mobile with no alternative.

### Evidence

**File**: `features/chat/components/visibility-selector.tsx` Lines 109-112

```typescript
className="hidden md:flex" // NO MOBILE ALTERNATIVE
```

### Impact

- Mobile users cannot change chat visibility

### Fix Required

Add mobile-friendly alternative (dropdown or modal) (~10 lines)

### Priority

🟡 **MEDIUM** - Mobile UX

---

## Issue 140: Missing Keyboard Activation Suggestions 🟡 MEDIUM

### Problem

Suggestion buttons lack `onKeyDown` handler for keyboard activation.

### Evidence

**File**: `features/chat/components/suggestions.tsx` Lines 84-86

Only click handler, no keyboard support.

### Impact

- Keyboard users can't activate suggestions

### Fix Required

Add `onKeyDown` for Enter/Space activation (~10 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

### Error Handling Issues

---

## Issue 141: Memo Only Checks Children 🟢 LOW

### Problem

MessageParts memo only checks children, missing other props.

### Evidence

**File**: `features/chat/components/message/parts.tsx` Lines 55-65

Custom comparison only looks at children array.

### Impact

- Potential unnecessary re-renders or stale renders

### Fix Required

Include all relevant props in memo comparison (~5 lines)

### Priority

🟢 **LOW** - Performance

---

## Issue 142: Silent Data Handling No Feedback 🟢 LOW

### Problem

Chat data handling silently processes without user feedback.

### Evidence

**File**: `features/chat/components/chat.tsx` Lines 175-186

Data processed in background with no indication.

### Impact

- Users unaware of background operations

### Fix Required

Add subtle loading indicators (~10 lines)

### Priority

🟢 **LOW** - UX

---

## Issue 143: handleEdit Empty TODO 🟡 MEDIUM

### Problem

Edit message handler is an empty TODO.

### Evidence

**File**: `features/chat/components/message/user-message.tsx` Lines 72-75

```typescript
const handleEdit = () => {
  // TODO: Implement edit functionality
};
```

### Impact

- Edit button does nothing
- Feature incomplete

### Fix Required

Implement edit functionality or remove button (~15 lines)

### Priority

🟡 **MEDIUM** - Feature incomplete

---

## Issue 144: Attachments Not Sent with Message 🟠 HIGH

### Problem

File attachments are collected but not included when sending message.

### Evidence

**File**: `features/chat/components/multimodal-input.tsx` Lines 193-197

```typescript
// TODO: Include attachments in message
```

### Impact

- **File uploads are completely broken**
- Users think files are attached but they're not sent

### Fix Required

Include attachments in message submission (~20 lines)

### Priority

🟠 **HIGH** - Feature broken

---

## Issue 145: Missing Max File Size Validation 🟡 MEDIUM

### Problem

No client-side validation for maximum file size.

### Evidence

**File**: `features/chat/components/multimodal-input.tsx` Line 248

File size not checked before upload.

### Impact

- Large files may fail at server
- Poor error UX

### Fix Required

Add file size validation before upload (~10 lines)

### Priority

🟡 **MEDIUM** - Validation

---

## Issue 146: Inconsistent Header Role 🟢 LOW

### Problem

Chat header uses inconsistent semantic role.

### Evidence

**File**: `features/chat/components/chat-header.tsx` Line 51

Header element without proper landmark role.

### Impact

- Inconsistent navigation for assistive technology

### Fix Required

Add `role="banner"` or use `<header>` (~5 lines)

### Priority

🟢 **LOW** - Semantics

---

## Issue 147: handleVote Incomplete 🟡 MEDIUM

### Problem

Vote handler implementation is incomplete.

### Evidence

**File**: `features/chat/components/message/message-item.tsx` Lines 139-144

Vote function exists but doesn't fully persist.

### Impact

- Votes may not persist correctly

### Fix Required

Complete vote implementation with proper persistence (~15 lines)

### Priority

🟡 **MEDIUM** - Feature incomplete

---

## Issue 148: Using title Instead of Tooltip 🟡 MEDIUM

### Problem

Actions use `title` attribute instead of Tooltip component.

### Evidence

**File**: `features/chat/components/message/actions.tsx` Lines 62-63

```typescript
<button title="Copy"> // USING TITLE, NOT TOOLTIP
```

### Impact

- Inconsistent tooltip behavior
- Poor mobile experience (title doesn't work)

### Fix Required

Replace with Tooltip component (~10 lines)

### Priority

🟡 **MEDIUM** - UX consistency

---

## Issue 149: Missing Accessible Name Avatar 🟡 MEDIUM

### Problem

Avatar component lacks accessible name.

### Evidence

**File**: `features/chat/components/message/avatar.tsx` Lines 44-56

No `aria-label` or alt text for avatar images.

### Impact

- Screen readers announce "image" without context

### Fix Required

Add `aria-label` with user/assistant role (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 150: TextPartView Unused isStreaming 🟢 LOW

### Problem

`isStreaming` parameter is defined but never used.

### Evidence

**File**: `features/chat/components/message/parts.tsx` Lines 189-198

```typescript
function TextPartView({ isStreaming }) {
  // isStreaming never used
}
```

### Impact

- Dead code
- No streaming-specific behavior

### Fix Required

Use or remove the parameter (~5 lines)

### Priority

🟢 **LOW** - Code quality

---

## Issue 151: normalizeMessagePart Drops Unknown 🟢 LOW

### Problem

Unknown message part types are silently dropped.

### Evidence

**File**: `features/chat/components/message/parts.tsx` Lines 34-45

Unknown types return null without logging.

### Impact

- New part types silently fail
- Debugging difficult

### Fix Required

Add warning for unknown types (~5 lines)

### Priority

🟢 **LOW** - Debugging

---

## Issue 152: Remove Button Only Visible Hover 🟡 MEDIUM

### Problem

Attachment remove button only appears on hover.

### Evidence

**File**: `features/chat/components/input/attachment-preview.tsx` Lines 70-74

```typescript
className="opacity-0 group-hover:opacity-100" // HOVER ONLY
```

### Impact

- Touch devices can't remove attachments
- Keyboard users can't see button

### Fix Required

Make visible on focus or always visible (~10 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 153: Image Missing Error State 🟡 MEDIUM

### Problem

Image preview has no error state for failed loads.

### Evidence

**File**: `features/chat/components/input/attachment-preview.tsx` Lines 46-53

No `onError` handler for image.

### Impact

- Broken images show nothing
- No user feedback

### Fix Required

Add error state with fallback icon (~10 lines)

### Priority

🟡 **MEDIUM** - Error handling

---

## Issue 154: Missing Focus Visible Styles Input 🟡 MEDIUM

### Problem

Input components lack visible focus indicators.

### Evidence

**File**: `features/chat/components/input/*.tsx`

Multiple input components missing `focus-visible` styles.

### Impact

- Keyboard users can't see focus
- Accessibility compliance issue

### Fix Required

Add `focus-visible:ring-2` styles (~15 lines total)

### Priority

🟡 **MEDIUM** - Accessibility

---

### Artifact Component Issues

---

## Issue 155: SWR Fetcher No Error Handling 🟡 MEDIUM

### Problem

SWR fetcher doesn't handle errors.

### Evidence

**File**: `features/artifacts/components/artifact.tsx` (general pattern)

Fetcher assumes success.

### Impact

- Errors may cause silent failures

### Fix Required

Add error handling to fetcher (~10 lines)

### Priority

🟡 **MEDIUM** - Error handling

---

## Issue 156: Artifact SWR No Error Handling 🟡 MEDIUM

### Problem

Artifact SWR fetch has no error handling.

### Evidence

**File**: `features/artifacts/components/artifact.tsx` Lines 39-41

```typescript
fetcher: () => fetch(...) // NO ERROR HANDLING
```

### Impact

- Failed fetches silently fail

### Fix Required

Add try/catch and error state (~10 lines)

### Priority

🟡 **MEDIUM** - Error handling

---

## Issue 157: Missing aria-label Close Button 🟠 HIGH

### Problem

Artifact close button lacks accessible label.

### Evidence

**File**: `features/artifacts/components/artifact-close.tsx` Lines 11-28

```typescript
<button> // NO aria-label
  <XIcon />
</button>
```

### Impact

- Screen readers announce "button" only
- Accessibility violation

### Fix Required

Add `aria-label="Close artifact panel"` (~5 lines)

### Priority

🟠 **HIGH** - Accessibility violation

---

## Issue 158: Generic Error Toast Actions 🟢 LOW

### Problem

Error toast shows generic message without context.

### Evidence

**File**: `features/artifacts/components/actions.tsx` Lines 73-76

```typescript
toast.error("Something went wrong"); // GENERIC
```

### Impact

- Users don't know what failed

### Fix Required

Include specific error context (~5 lines)

### Priority

🟢 **LOW** - Error UX

---

## Issue 159: No Accessible Name Container 🟡 MEDIUM

### Problem

Artifact messages container lacks accessible name.

### Evidence

**File**: `features/artifacts/components/artifact-messages.tsx` Lines 60-61

Container has no `aria-label` or landmark role.

### Impact

- Screen readers can't identify region

### Fix Required

Add `aria-label="Artifact history"` or role (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 160: Restore Button Missing Loading 🟡 MEDIUM

### Problem

Restore version button has no loading feedback.

### Evidence

**File**: `features/artifacts/components/artifact-panel.tsx` Lines 72-98

Restore action triggers but no visual feedback.

### Impact

- Users click multiple times
- Uncertain state

### Fix Required

Add loading state during restore (~10 lines)

### Priority

🟡 **MEDIUM** - UX

---

## Issue 161: motion.div for Interactive Element 🟡 MEDIUM

### Problem

Using `motion.div` for interactive/clickable element.

### Evidence

**File**: `features/artifacts/components/artifact-panel.tsx` Lines 96-106

```typescript
<motion.div onClick={...}> // DIV WITH CLICK
```

### Impact

- Not focusable by keyboard
- No button semantics

### Fix Required

Use `motion.button` instead (~10 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 162: randomArr SSR Mismatch 🟡 MEDIUM

### Problem

Random array generation causes SSR hydration mismatch.

### Evidence

**File**: `features/artifacts/components/artifact-panel.tsx` Line 127

Random values differ between server and client.

### Impact

- Hydration warnings
- Visual flash

### Fix Required

Use seeded random or client-only rendering (~10 lines)

### Priority

🟡 **MEDIUM** - Hydration

---

### Editor Issues

---

## Issue 163: EditorSkeleton Not Animated 🟢 LOW

### Problem

Editor skeleton loader is static, not animated.

### Evidence

**File**: `features/artifacts/editors/loader.tsx` Lines 66-74

Skeleton has no pulse/shimmer animation.

### Impact

- Looks broken rather than loading

### Fix Required

Add `animate-pulse` class (~5 lines)

### Priority

🟢 **LOW** - UX polish

---

## Issue 164: CodeMirror Init Ignores Content 🟡 MEDIUM

### Problem

CodeMirror initialization doesn't update when content prop changes.

### Evidence

**File**: `features/artifacts/editors/code-editor.tsx` Lines 117-120

Content only set on mount, not on prop change.

### Impact

- Switching artifacts shows stale content

### Fix Required

Add effect to sync content changes (~15 lines)

### Priority

🟡 **MEDIUM** - State sync

---

## Issue 165: React Imported After Use 🟠 HIGH

### Problem

React is imported after it's used in the file.

### Evidence

**File**: `features/artifacts/editors/text-editor.tsx` Lines 104-105

Import order issue can cause runtime errors.

### Impact

- Potential undefined reference errors

### Fix Required

Move import to top of file (~5 lines)

### Priority

🟠 **HIGH** - Runtime error

---

## Issue 166: Theme Flash on Hydration 🟡 MEDIUM

### Problem

Editor theme flashes during hydration.

### Evidence

**File**: `features/artifacts/editors/text-editor.tsx` Lines 137-144

Theme loaded client-side causes flash.

### Impact

- Visible theme flash on load

### Fix Required

Server-render with correct theme or fade in (~10 lines)

### Priority

🟡 **MEDIUM** - UX polish

---

## Issue 167: Hard-coded Min/Max Height 🟢 LOW

### Problem

Sheet editor has hard-coded min/max height values.

### Evidence

**File**: `features/artifacts/editors/sheet-editor.tsx` Lines 93-94

```typescript
minHeight: 400, maxHeight: 600 // HARDCODED
```

### Impact

- Not responsive to container
- May not fit all viewports

### Fix Required

Use CSS or dynamic calculation (~5 lines)

### Priority

🟢 **LOW** - Responsiveness

---

### Sidebar Issues

---

## Issue 168: Hardcoded "Assistant" Title 🟢 LOW

### Problem

App sidebar title "Assistant" is hardcoded.

### Evidence

**File**: `features/sidebar/components/app-sidebar.tsx` Lines 105-106

```typescript
<span>Assistant</span> // HARDCODED
```

### Impact

- No customization possible
- No i18n support

### Fix Required

Move to config or i18n (~5 lines)

### Priority

🟢 **LOW** - i18n

---

## Issue 169: GroupedVirtuoso endReached Fires Incorrectly 🟢 LOW

### Problem

GroupedVirtuoso `endReached` callback fires incorrectly.

### Evidence

**File**: `features/sidebar/components/chat-history.tsx` Lines 59-62

May fire on initial load or during scroll.

### Impact

- Unnecessary API calls
- Potential infinite loops

### Fix Required

Add debounce or check conditions (~10 lines)

### Priority

🟢 **LOW** - Performance

---

## Issue 170: Visibility Change No Loading State 🟡 MEDIUM

### Problem

Chat visibility change has no loading feedback.

### Evidence

**File**: `features/sidebar/components/chat-item.tsx` Lines 62-66

Action triggers but no visual feedback.

### Impact

- Users unsure if action worked

### Fix Required

Add loading indicator during update (~10 lines)

### Priority

🟡 **MEDIUM** - UX

---

## Issue 171: More Options No Focus State 🟡 MEDIUM

### Problem

"More options" button has no visible focus state.

### Evidence

**File**: `features/sidebar/components/chat-item.tsx` Lines 103-106

Button lacks `focus-visible` styles.

### Impact

- Keyboard users can't see focus

### Fix Required

Add `focus-visible:ring-2` styles (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 172: External Avatar URL No Fallback 🟢 LOW

### Problem

External avatar URL has no fallback if load fails.

### Evidence

**File**: `features/sidebar/components/sidebar-user-nav.tsx` Line 132

```typescript
<Image src={externalUrl} /> // NO FALLBACK
```

### Impact

- Broken avatar shows empty

### Fix Required

Add `onError` fallback to initials (~5 lines)

### Priority

🟢 **LOW** - Error handling

---

## Issue 173: Duplicate SidebarToggle Components 🟡 MEDIUM

### Problem

SidebarToggle defined in multiple files.

### Evidence

**Files**: 
- `features/sidebar/components/sidebar-toggle.tsx`
- `features/sidebar/components/toggle.tsx` Lines 36-49

Two similar components exist.

### Impact

- Maintenance burden
- Potential inconsistency

### Fix Required

Consolidate to single component (~20 lines)

### Priority

🟡 **MEDIUM** - DRY violation

---

### Document/Auth Issues

---

## Issue 174: Generic Fetch Error Document 🟢 LOW

### Problem

Document viewer shows generic fetch error.

### Evidence

**File**: `features/documents/components/document-viewer.tsx` Lines 87-95

```typescript
toast.error("Failed to load document"); // GENERIC
```

### Impact

- Users don't know specific failure

### Fix Required

Include error details (~5 lines)

### Priority

🟢 **LOW** - Error UX

---

## Issue 175: Readonly Toast Unhelpful 🟢 LOW

### Problem

Readonly mode toast doesn't explain why.

### Evidence

**File**: `features/documents/components/document-viewer.tsx` Lines 129-132

```typescript
toast.info("Read-only mode"); // NO EXPLANATION
```

### Impact

- Users don't understand why they can't edit

### Fix Required

Add context to toast message (~5 lines)

### Priority

🟢 **LOW** - UX

---

## Issue 176: Input Missing autoComplete 🟡 MEDIUM

### Problem

Auth form inputs lack autoComplete attribute.

### Evidence

**File**: `features/auth/components/auth-form.tsx` Lines 17-34

```typescript
<input type="email" /> // NO autoComplete
<input type="password" />
```

### Impact

- Password managers may not work correctly
- Poor autofill experience

### Fix Required

Add appropriate `autoComplete` values (~5 lines)

### Priority

🟡 **MEDIUM** - UX/Security

---

## Issue 177: aria-disabled Inconsistent 🟢 LOW

### Problem

Submit button `aria-disabled` inconsistent with actual disabled state.

### Evidence

**File**: `features/auth/components/submit-button.tsx` Lines 83-89

State mismatch between visual and accessible state.

### Impact

- Screen readers may announce wrong state

### Fix Required

Sync `aria-disabled` with disabled prop (~5 lines)

### Priority

🟢 **LOW** - Accessibility

---

## Issue 178: Guest Bootstrap Errors Swallowed 🟡 MEDIUM

### Problem

Guest bootstrap silently swallows errors.

### Evidence

**File**: `features/auth/components/guest-bootstrap.tsx` Lines 46-50

```typescript
catch (error) {
  console.error(error); // SWALLOWED
}
```

### Impact

- Silent failures during guest init
- No user feedback

### Fix Required

Surface errors to user (~10 lines)

### Priority

🟡 **MEDIUM** - Error handling

---

### Shared Components/Hooks Issues

---

## Issue 179: isMobile Undefined During Hydration 🟢 LOW

### Problem

`isMobile` can be undefined during SSR/hydration.

### Evidence

**File**: `shared/hooks/use-mobile.ts` Lines 29-30

Returns undefined before client-side detection.

### Impact

- Hydration mismatch possible
- Components may flash

### Fix Required

Default to false or delay render (~5 lines)

### Priority

🟢 **LOW** - Hydration

---

## Issue 180: detectSourceType Too Simplistic 🟢 LOW

### Problem

Source type detection is too simplistic.

### Evidence

**File**: `shared/components/ai/source-link.tsx` Lines 108-117

Basic string matching for source types.

### Impact

- May misidentify sources

### Fix Required

Improve detection logic (~10 lines)

### Priority

🟢 **LOW** - Accuracy

---

## Issue 181: Missing Disabled Prop Propagation 🟢 LOW

### Problem

Disabled prop not propagated to child components.

### Evidence

**File**: `shared/components/ai/message-actions-enhanced.tsx` Lines 91-98

Disabled state not passed down.

### Impact

- Actions remain clickable when should be disabled

### Fix Required

Propagate disabled to children (~5 lines)

### Priority

🟢 **LOW** - State consistency

---

## Issue 182: Missing aria-pressed Toggle Buttons 🟡 MEDIUM

### Problem

Toggle buttons lack `aria-pressed` state.

### Evidence

**File**: `components/ai-elements/message-actions.tsx` Lines 102-103

```typescript
<button onClick={toggle}> // NO aria-pressed
```

### Impact

- Screen readers can't identify toggle state

### Fix Required

Add `aria-pressed={isToggled}` (~5 lines)

### Priority

🟡 **MEDIUM** - Accessibility

---

## Issue 183: Auto-close Timing Hardcoded 🟢 LOW

### Problem

Auto-close timing for copy feedback is hardcoded.

### Evidence

**File**: `components/ai-elements/image-copy-button.tsx` Lines 70-78

```typescript
setTimeout(() => {...}, 2000); // HARDCODED
```

### Impact

- Not configurable
- May be too fast/slow

### Fix Required

Move to constant or prop (~5 lines)

### Priority

🟢 **LOW** - Configurability

---

## Issue 184: Button Type Inconsistent 🟢 LOW

### Problem

Suggestion button type attribute is inconsistent.

### Evidence

**File**: `components/ai-elements/suggestion.tsx` Lines 34-41

Some buttons lack `type="button"`.

### Impact

- May trigger form submission

### Fix Required

Add `type="button"` consistently (~5 lines)

### Priority

🟢 **LOW** - Form behavior

---

## Hook Issues (#185-#189)

---

## Issue 185: SWR Fetcher is Null 🟢 LOW

### Problem

SWR fetcher is explicitly set to null.

### Evidence

**File**: `features/chat/hooks/use-messages.ts` Lines 68-70

```typescript
fetcher: null // WHY NULL?
```

### Impact

- SWR won't fetch automatically
- May cause issues if expected to work

### Fix Required

Remove or document reason (~5 lines)

### Priority

🟢 **LOW** - Code clarity

---

## Issue 186: SWR Key Collision Possible 🟢 LOW

### Problem

SWR key may collide between different contexts.

### Evidence

**File**: `features/chat/hooks/use-messages.ts` Lines 65-68

Key format could match unintentionally.

### Impact

- Cached data from wrong context

### Fix Required

Add namespace to key (~5 lines)

### Priority

🟢 **LOW** - Cache correctness

---

## Issue 187: Global ARTIFACT_CACHE_KEY Collision 🟡 MEDIUM

### Problem

Global artifact cache key can collide between sessions.

### Evidence

**File**: `features/artifacts/hooks/use-artifact.ts` Lines 43-44

```typescript
const ARTIFACT_CACHE_KEY = "artifact"; // GLOBAL
```

### Impact

- Artifacts from different chats may conflict

### Fix Required

Include chat ID in cache key (~10 lines)

### Priority

🟡 **MEDIUM** - Cache correctness

---

## Issue 188: Cookie Set Without SameSite 🟢 LOW

### Problem

Sidebar cookie set without SameSite attribute.

### Evidence

**File**: `features/sidebar/hooks/use-sidebar.ts` Lines 30-32

```typescript
document.cookie = `sidebar=...`; // NO SameSite
```

### Impact

- Browser may reject cookie
- Security warning

### Fix Required

Add `SameSite=Lax` (~5 lines)

### Priority

🟢 **LOW** - Security/Compatibility

---

## Issue 189: Optimistic Delete Filter Incorrect 🟡 MEDIUM

### Problem

Optimistic chat delete filter may be incorrect.

### Evidence

**File**: `features/sidebar/hooks/use-optimistic-chats.tsx` Lines 49-55

Filter condition may not properly exclude deleted chats.

### Impact

- Deleted chats may reappear

### Fix Required

Fix filter logic (~10 lines)

### Priority

🟡 **MEDIUM** - Data consistency

---

## Lib/ Infrastructure Issues (#190-#197)

---

## Issue 190: Model Registry Resolution No Error Handling 🟠 HIGH

### Problem

Model registry resolution has no error handling.

### Evidence

**File**: `lib/ai/providers.ts`

Missing try/catch around registry resolution.

### Impact

- **Invalid model crashes entire request**
- No fallback behavior

### Fix Required

Add error handling with fallback (~15 lines)

### Priority

🟠 **HIGH** - Reliability

---

## Issue 191: Async Cloudflare Providers Not in Registry 🟡 MEDIUM

### Problem

Asynchronously loaded Cloudflare providers not added to registry.

### Evidence

**File**: `lib/ai/providers.ts`

Async providers may not be available when needed.

### Impact

- Cloudflare models may fail silently

### Fix Required

Await and register properly (~10 lines)

### Priority

🟡 **MEDIUM** - Provider support

---

## Issue 192: Mutating Global Config Without Lock 🟢 LOW

### Problem

Mock AI mutates global config without synchronization.

### Evidence

**File**: `lib/ai/mock.ts`

Global state modified without lock.

### Impact

- Potential race conditions in tests

### Fix Required

Use proper state isolation (~5 lines)

### Priority

🟢 **LOW** - Test reliability

---

## Issue 193: Unsafe Double Type Assertion 🟡 MEDIUM

### Problem

Using unsafe `as unknown as` double assertion.

### Evidence

**File**: `lib/ai/mock.ts`

```typescript
return value as unknown as ExpectedType; // UNSAFE
```

### Impact

- Type safety bypassed
- Runtime errors possible

### Fix Required

Use proper type guards (~5 lines)

### Priority

🟡 **MEDIUM** - Type safety

---

## Issue 194: No Weather API Response Validation 🟡 MEDIUM

### Problem

Weather API response not validated before use.

### Evidence

**File**: `lib/ai/tools/get-weather.ts`

API response used directly without schema validation.

### Impact

- Invalid data causes runtime errors
- No graceful handling of API changes

### Fix Required

Add Zod schema validation (~15 lines)

### Priority

🟡 **MEDIUM** - Reliability

---

## Issue 195: Fire-and-Forget DB Write Suggestions 🟡 MEDIUM

### Problem

Suggestion DB writes are fire-and-forget with no error handling.

### Evidence

**File**: `lib/ai/tools/request-suggestions.ts`

```typescript
saveSuggestions(...); // NO AWAIT, NO CATCH
```

### Impact

- Failed writes silently lost
- No retry logic

### Fix Required

Add await and error handling (~10 lines)

### Priority

🟡 **MEDIUM** - Data persistence

---

## Issue 196: Create Document Handler Error Corrupts Stream 🟠 HIGH

### Problem

Error in document creation handler leaves stream in corrupted state.

### Evidence

**File**: `lib/ai/tools/create-document.ts`

Handler throws without properly closing stream.

### Impact

- **Stream left in inconsistent state**
- Client receives partial/corrupt response

### Fix Required

Wrap in try/finally to ensure stream cleanup (~15 lines)

### Priority

🟠 **HIGH** - Stream integrity

---

## Issue 197: Rate Limit Fail-Open Security 🟠 HIGH

### Problem

Rate limiting fails open when Redis is unavailable.

### Evidence

**File**: `lib/cache-ops/quota.ts`

When Redis connection fails, requests are allowed through.

### Impact

- **Security bypass when cache down**
- DoS protection disabled
- Quota bypass possible

### Fix Required

Fail closed or use fallback rate limiting (~10 lines)

### Priority

🟠 **HIGH** - Security

---

## Fix Order Recommendation

1. **Phase 1 - Critical** (Day 1)

   - Issue 1: Chat Persistence
   - Issue 2: Title Format
   - Issue 9: DELETE /api/chat
   - Issue 10: Server Actions Persist
   - Issue 19: User System Prompt
   - Issue 51: Vote Action Not Persisting
   - Issue 83: Missing Security Headers (Middleware)
   - Issue 84: XSS via Unsanitized Code Highlighting
   - Issue 97: All 31 E2E Tests Failing (NEW!)

2. **Phase 2 - High/Security** (Day 2-3)

   - Issue 11: Title Generation Export
   - Issue 12: MIME Type Mismatch
   - Issue 14: Vote Ownership Check (SECURITY)
   - Issue 17: OpenTelemetry Instrumentation
   - Issue 18: Request Context System
   - Issue 29: Security Headers
   - Issue 31: Transient Flag
   - Issue 37: Regenerate Prop Threading
   - Issue 52: Visibility Update Stub
   - Issue 53: Message Deletion Stub
   - Issue 54: Env Var Non-null Assert
   - Issue 57: DB Connection No Validation
   - Issue 62: Potential XSS Python Output
   - Issue 65: AUTH_SECRET Runtime Only
   - Issue 66: Missing /api/settings Route
   - Issue 70: Missing TipTap Suggestions
   - Issue 76: No Tests for API Routes
   - Issue 85: Chat API Unauthenticated Access
   - Issue 86: Health Endpoint Exposes State
   - Issue 87: Token Without Additional Binding
   - Issue 88: Rate Limiting Fails Open
   - Issue 98: Missing artifact-panel testid (NEW!)
   - Issue 99: Missing artifact-document-preview testid (NEW!)
   - Issue 104: Missing maxDuration Export (NEW!)
   - Issue 108: Missing BLOB_READ_WRITE_TOKEN Docs (NEW!)
   - Issue 114: Mobile Detection Header Not Set (NEW!)
   - Issue 118: DATABASE_URL Non-null Assert (NEW!)
   - Issue 119: Supabase Client Non-null Assert (NEW!)
   - Issue 125: No Mock AI Provider for E2E (NEW!)
   - Issue 131: Nested Interactive Elements (NEW!)
   - Issue 137: Hardcoded Weather Sample Data (NEW!)
   - Issue 144: Attachments Not Sent (TODO) (NEW!)
   - Issue 157: Missing aria-label Close Button (NEW!)
   - Issue 165: React Imported After Use (NEW!)
   - Issue 190: Model Registry Resolution No Error Handling (NEW!)
   - Issue 196: Create Document Handler Error Corrupts Stream (NEW!)
   - Issue 197: Rate Limit Fail-Open Security (NEW!)

3. **Phase 3 - Medium** (Day 4-6)

   - Issue 3: DELETE Endpoint
   - Issue 4: Pagination
   - Issue 5: Error Format
   - Issue 13: Upload Rate Limiting
   - Issue 15: messageMetadataSchema
   - Issue 20: Geo Hints
   - Issue 21: Title Race Condition
   - Issue 23: AI SDK Telemetry
   - Issue 24: Vercel Fluid Compute
   - Issue 27: Stream Table
   - Issue 28: OpenGraph Image
   - Issue 32: ModelPart Type
   - Issue 33: Model Persistence
   - Issue 35: Document Handler
   - Issue 36: Network Retry
   - Issue 39: Vercel Analytics
   - Issue 41: Loading UI Mismatch
   - Issue 55: Unsafe Type Assertion
   - Issue 56: Unbounded Console Output
   - Issue 58: Silent Error Catch
   - Issue 59: Visibility Race Condition
   - Issue 60: Missing Index Optimization
   - Issue 64: Guest Chat ID Spoofing
   - Issue 67: Duplicate SessionContext Type
   - Issue 68: SessionInfo vs GuestInfo Confusion
   - Issue 69: Missing MessageReasoning Component
   - Issue 71: Missing branch.tsx Component
   - Issue 72: Missing Tool Types Definition
   - Issue 73: SheetEditor Not Lazy-Loaded
   - Issue 74: Heavy Library Direct Imports
   - Issue 75: ARIA Accessibility Error
   - Issue 77: No Tests for lib/ai/tools
   - Issue 78: No Tests for lib/cache-ops
   - Issue 79: Missing lib/data Unit Tests
   - Issue 80: lib/ai Imports from features/
   - Issue 81: lib/providers Imports from features
   - Issue 82: lib/data Imports from features
   - Issue 89: AUTH_SECRET Runtime Validation
   - Issue 90: Open Redirect Incomplete
   - Issue 91: Server Actions Lack CSRF
   - Issue 92: Document Handler Leaks Info
   - Issue 93: AI Token Usage Logs User ID
   - Issue 100: Missing toggle-sidebar-button testid (NEW!)
   - Issue 101: Missing visibility-dropdown-item-* testid (NEW!)
   - Issue 102: Missing artifact-version-footer testid (NEW!)
   - Issue 105: Next.js Experimental Features No Fallback (NEW!)
   - Issue 106: noUncheckedIndexedAccess Violations (NEW!)
   - Issue 109: Missing SUPABASE_SERVICE_ROLE_KEY Docs (NEW!)
   - Issue 111: Missing USE_MOCK_AI Docs (NEW!)
   - Issue 115: useScreenSize Returns 0 SSR (NEW!)
   - Issue 116: Hydration Mismatch Artifact (NEW!)
   - Issue 117: Missing server-only Guard Rate Limit (NEW!)
   - Issue 120: Redis Degradation Inconsistent (NEW!)
   - Issue 122: Blob Token Not Validated (NEW!)
   - Issue 123: AI Provider Registration Silent (NEW!)
   - Issue 124: Playwright webServer Health Dependency (NEW!)
   - Issue 126: Auth Tests Create Real Users (NEW!)
   - Issue 128: Missing aria-live Greeting Animation (NEW!)
   - Issue 130: Missing role="alert" Error Fallback (NEW!)
   - Issue 132: Hardcoded Featured Model IDs (NEW!)
   - Issue 133: Model Selector Missing Loading State (NEW!)
   - Issue 134: Missing aria-selected Dropdown Items (NEW!)
   - Issue 135: Missing Accessible Name Textarea (NEW!)
   - Issue 138: Missing Weather Icon Alt Text (NEW!)
   - Issue 139: Mobile Visibility Button Hidden (NEW!)
   - Issue 140: Missing Keyboard Activation Suggestions (NEW!)
   - Issue 143: handleEdit Empty TODO (NEW!)
   - Issue 145: Missing Max File Size Validation (NEW!)
   - Issue 147: handleVote Incomplete (NEW!)
   - Issue 148: Using title Instead of Tooltip (NEW!)
   - Issue 149: Missing Accessible Name Avatar (NEW!)
   - Issue 152: Remove Button Only Visible Hover (NEW!)
   - Issue 153: Image Missing Error State (NEW!)
   - Issue 154: Missing Focus Visible Styles Input (NEW!)
   - Issue 155: SWR Fetcher No Error Handling (NEW!)
   - Issue 156: Artifact SWR No Error Handling (NEW!)
   - Issue 159: No Accessible Name Container (NEW!)
   - Issue 160: Restore Button Missing Loading (NEW!)
   - Issue 161: motion.div for Interactive Element (NEW!)
   - Issue 162: randomArr SSR Mismatch (NEW!)
   - Issue 164: CodeMirror Init Ignores Content (NEW!)
   - Issue 166: Theme Flash on Hydration (NEW!)
   - Issue 170: Visibility Change No Loading State (NEW!)
   - Issue 171: More Options No Focus State (NEW!)
   - Issue 173: Duplicate SidebarToggle Components (NEW!)
   - Issue 176: Input Missing autoComplete (NEW!)
   - Issue 178: Guest Bootstrap Errors Swallowed (NEW!)
   - Issue 182: Missing aria-pressed Toggle Buttons (NEW!)
   - Issue 187: Global ARTIFACT_CACHE_KEY Collision (NEW!)
   - Issue 189: Optimistic Delete Filter Incorrect (NEW!)
   - Issue 191: Async Cloudflare Providers Not in Registry (NEW!)
   - Issue 193: Unsafe Double Type Assertion (NEW!)
   - Issue 194: No Weather API Response Validation (NEW!)
   - Issue 195: Fire-and-Forget DB Write Suggestions (NEW!)

4. **Phase 4 - Low** (Day 7)
   - Issue 6: Optimistic Dedup
   - Issue 8: Visibility Reactivity
   - Issue 16: Toolbar any Type
   - Issue 22: Model Validation Feedback
   - Issue 25: Test Fixtures
   - Issue 26: Batch Upload
   - Issue 30: Message Metadata
   - Issue 34: Suggested Actions
   - Issue 38: Version Footer
   - Issue 42: Metadata Mismatch
   - Issue 43: Upload AbortController
   - Issue 44: SWRInfinite History Sub
   - Issue 45: UI Timing Constants
   - Issue 46: Framer Motion Version
   - Issue 47: localStorage Key
   - Issue 48: useLocalStorage Hook
   - Issue 49: Debounced Writes Hook
   - Issue 50: Hydration Flag Missing
   - Issue 61: Console Scroll Missing Deps
   - Issue 63: Missing Feature Exports
   - Issue 94: JWT Cookie TTL Mismatch
   - Issue 95: IP Extraction No Validation
   - Issue 96: No Explicit CORS Config
   - Issue 103: Missing toast testid (NEW!)
   - Issue 107: Biome Rules Disabled Untracked (NEW!)
   - Issue 110: Missing LOG_LEVEL Docs (NEW!)
   - Issue 112: Missing TOOL/TITLE_MODEL_ID Docs (NEW!)
   - Issue 113: Missing DEFAULT_CHAT_MODEL_ID Docs (NEW!)
   - Issue 121: Health Check 200 for Degraded (NEW!)
   - Issue 127: Test Timeout Too Long (NEW!)
   - Issue 129: Hardcoded Greeting Text (NEW!)
   - Issue 136: Error Context Ignored (NEW!)
   - Issue 141: Memo Only Checks Children (NEW!)
   - Issue 142: Silent Data Handling No Feedback (NEW!)
   - Issue 146: Inconsistent Header Role (NEW!)
   - Issue 150: TextPartView Unused isStreaming (NEW!)
   - Issue 151: normalizeMessagePart Drops Unknown (NEW!)
   - Issue 158: Generic Error Toast Actions (NEW!)
   - Issue 163: EditorSkeleton Not Animated (NEW!)
   - Issue 167: Hard-coded Min/Max Height (NEW!)
   - Issue 168: Hardcoded "Assistant" Title (NEW!)
   - Issue 169: GroupedVirtuoso endReached Fires Incorrectly (NEW!)
   - Issue 172: External Avatar URL No Fallback (NEW!)
   - Issue 174: Generic Fetch Error Document (NEW!)
   - Issue 175: Readonly Toast Unhelpful (NEW!)
   - Issue 177: aria-disabled Inconsistent (NEW!)
   - Issue 179: isMobile Undefined During Hydration (NEW!)
   - Issue 180: detectSourceType Too Simplistic (NEW!)
   - Issue 181: Missing Disabled Prop Propagation (NEW!)
   - Issue 183: Auto-close Timing Hardcoded (NEW!)
   - Issue 184: Button Type Inconsistent (NEW!)
   - Issue 185: SWR Fetcher is Null (NEW!)
   - Issue 186: SWR Key Collision Possible (NEW!)
   - Issue 188: Cookie Set Without SameSite (NEW!)
   - Issue 192: Mutating Global Config Without Lock (NEW!)

---

## References

- OldApp chat route: `oldapp/app/(chat)/api/chat/route.ts`
- OldApp history route: `oldapp/app/(chat)/api/history/route.ts`
- OldApp errors: `oldapp/lib/errors.ts`
- OldApp hooks: `oldapp/hooks/`
- Feature Parity Report: `.ouroboros/specs/FEATURE-PARITY-REPORT.md`
