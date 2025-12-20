# Subtask: Implement Chat API Route

**Task:** PHASE2-005-chat-api
**Status:** ✅ Complete
**Safe to Interrupt:** ✅ Yes

## What Was Done

Implemented app/api/chat/route.ts with:
- POST handler: Auth, validation, streaming, persistence
- DELETE handler: Auth, ownership check, cascade delete
- AI SDK 5.0: createUIMessageStream + JsonToSseTransformStream
- Custom data parts: data-chatTitle, data-usage
- Error handling: AppError.toResponse()

## Files Changed

- app/api/chat/route.ts (~250 LOC)

## OldApp References

| OldApp File | What Extracted |
|-------------|----------------|
| oldapp/app/(chat)/api/chat/route.ts | Streaming pattern |
| oldapp/app/(chat)/api/chat/schema.ts | Validation schema |

## Verification

- typecheck: PASS ✅
- build: PASS ✅

## Resume Instructions

N/A - Step complete. Proceed to Step 4 (Test).
