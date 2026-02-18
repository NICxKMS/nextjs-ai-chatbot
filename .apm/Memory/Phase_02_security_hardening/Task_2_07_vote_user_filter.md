---
agent: Agent_Security
task_ref: Task 2.7
status: Completed
ad_hoc_delegation: false
compatibility_issues: false
important_findings: true
---

# Task Log: Task 2.7 - Fix Vote User Filter

## Summary
Fixed critical security vulnerabilities in the votes API that allowed users to see other users' votes and vote on messages in chats they don't own.

## Details

### Vulnerabilities Identified

1. **GET /api/votes - Information Disclosure**
   - The `voteRepository.findByChatId()` method returned ALL votes for a chat, not filtered by user
   - Any authenticated user could view votes from other users if they knew the chatId

2. **POST /api/votes - Missing Authorization**
   - No chat ownership verification before allowing vote creation
   - No verification that the message belongs to the chat (Issue #9 from old app)
   - Guest users could vote (should require persistent authentication)

### Security Fixes Applied

1. **Added `findByChatIdAndUserId()` method to VoteRepository**
   - New secure method that filters votes by both chatId AND userId
   - Prevents users from seeing other users' votes

2. **Updated GET /api/votes endpoint**
   - Added chat ownership verification before returning votes
   - Returns 404 if chat doesn't exist
   - Returns 403 if user doesn't own the chat
   - Uses new `findByChatIdAndUserId()` method for secure filtering

3. **Updated POST /api/votes endpoint**
   - Added `requireNonGuest()` check to block guest voting
   - Added chat ownership verification
   - Added message-in-chat verification (Issue #9 fix from old app)
   - Returns appropriate error responses for authorization failures

## Output

### Modified Files
- `app/api/votes/route.ts` - Added ownership verification and user filtering
- `lib/data/repositories/vote.repository.ts` - Added `findByChatIdAndUserId()` method

### Key Code Changes

**New VoteRepository method:**
```typescript
async findByChatIdAndUserId(
  chatId: string,
  userId: string,
): Promise<Vote[]> {
  const results = await this.db
    .select()
    .from(vote)
    .where(and(eq(vote.chatId, chatId), eq(vote.userId, userId)))
  return results
}
```

**GET endpoint security pattern:**
```typescript
// Verify chat ownership before returning votes
const chat = await chatRepository.findById(chatId)
if (!chat) throw new NotFoundError("Chat", chatId)
if (chat.userId !== userId) throw new ForbiddenError("You do not have access to this chat")

// Get votes filtered by user ID for security
const votes = await voteRepository.findByChatIdAndUserId(chatId, userId)
```

**POST endpoint security pattern:**
```typescript
// Guest users cannot vote
await requireNonGuest()

// Verify chat ownership
const chat = await chatRepository.findById(chatId)
if (chat.userId !== userId) throw new ForbiddenError("You do not have access to this chat")

// Verify message belongs to chat (Issue #9 fix)
const chatWithMessages = await chatRepository.findWithMessages(chatId, { userId, isGuest: false })
const messageExists = chatWithMessages.messages.some((m) => m.id === messageId)
if (!messageExists) throw new NotFoundError("Message", messageId)
```

## Issues
None

## Important Findings

### Architecture Observation
The old app (`archive/oldapp/app/(chat)/api/vote/route.ts`) had comprehensive security checks using guard functions:
- `requireAuthForRoute()` - Authentication check
- `requireNonGuestForRoute()` - Guest blocking
- `verifyOwnershipForRoute()` - Ownership verification
- Message-in-chat verification (Issue #9 fix)

The new app's initial implementation was missing these critical security layers. This pattern suggests other API routes may have similar security gaps that should be audited.

### Recommendation
Consider auditing all API routes in the new codebase for similar authorization gaps, particularly:
- Missing ownership checks
- Missing guest user restrictions
- Missing resource existence verification

## Next Steps
None - task completed successfully
