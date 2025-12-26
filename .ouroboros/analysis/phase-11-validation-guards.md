# PHASE 11 — Validation, Guards & Preconditions Duplication

**Analysis Date:** 2025-01-27  
**Scope:** Complete codebase  
**Method:** Validation pattern analysis, guard duplication detection

---

## EXECUTIVE SUMMARY

**Total Validation/Guard Duplications Found:** 6  
**Conditional Checks:** 784 across 194 files  
**Validation Patterns:** 3 different approaches  
**Estimated LOC Reduction:** ~150 lines (after consolidation)  
**Overall Assessment:** ⚠️ **MEDIUM** - Validation is functional but has some duplication

---

## 1. GUEST USER RESTRICTION DUPLICATION

### Pattern: Guest User Checks Repeated Across Routes

**Violation:** Guest user restrictions checked in multiple route handlers.

#### Instance 1: `app/api/vote/route.ts`

**Code:**
```typescript
// 2. Guest users cannot vote (requires persistence)
if (session.user.type === "guest") {
    return forbiddenError("vote", {
        reason: "Guest users cannot vote on messages",
    }).toResponse();
}
```

**Lines:** 73-78

#### Instance 2: `app/api/chat/handlers/validate-request.ts`

**Code:**
```typescript
// Guest restrictions
if (session.user.type === "guest" && ...) {
    // Guest-specific validation
}
```

**Analysis:** Guest restrictions appear in multiple places

**Consolidation Strategy:**
- Use `requireRegularUser()` guard from `lib/auth/guards.ts`
- Already exists but not consistently used

**Impact:**
- LOC reduction: ~20 lines
- Consistent guest restrictions

---

## 2. OWNERSHIP VERIFICATION DUPLICATION

### Pattern: Resource Ownership Checks Repeated

**Violation:** Ownership verification logic appears in multiple routes.

#### Instance 1: `app/api/vote/route.ts`

**Code:**
```typescript
// Verify chat exists and user owns it
const chat = await ChatService.get(chatId, ctx);
if (!chat || chat.userId !== session.user.id) {
    return notFoundError("chat").toResponse();
}
```

**Lines:** 98-101

#### Instance 2: `app/api/document/route.ts`

**Similar Pattern:**
- Verify document exists
- Verify user owns document

**Consolidation Strategy:**
- Use `verifyOwnership()` guard from `lib/auth/guards.ts`
- Already exists but not consistently used

**Impact:**
- LOC reduction: ~30 lines
- Consistent ownership verification

---

## 3. UUID VALIDATION DUPLICATION

### Pattern: UUID Validation Repeated (Already Identified in Phase 1)

**Violation:** UUID validation appears in 6 locations.

**Status:** ✅ **Already documented in Phase 1**

**Consolidation:** Centralize in `lib/utils/uuid.ts`

---

## 4. REQUEST PARSING DUPLICATION

### Pattern: Request Body Parsing Repeated (Already Identified in Phase 1)

**Violation:** Request parsing appears in 4 locations.

**Status:** ✅ **Already documented in Phase 1**

**Consolidation:** Create request parsing utilities

---

## 5. VALIDATION PATTERN INCONSISTENCIES

### Pattern: Multiple Validation Approaches

**Violation:** Validation implemented using different patterns.

#### Pattern 1: Zod Schemas
- `app/api/vote/route.ts` - `voteRequestSchema.safeParse()`
- `app/api/chat/handlers/validate-request.ts` - `chatRequestSchema.safeParse()`
- `app/api/document/route.ts` - `documentPostSchema.safeParse()`

**Usage:** API routes ✅

#### Pattern 2: Custom Validators
- `lib/services/document-service.ts` - `validateTitle()`, `validateContent()`
- `lib/utils/form-helpers.ts` - `required()`, `email()`, `minLength()`

**Usage:** Services and forms ⚠️

#### Pattern 3: Inline Validation
- `lib/services/auth-service.ts` - Inline `if (!guestId)` checks
- `lib/services/chat-service.ts` - Inline `if (title.length > max)` checks

**Issues:**
1. **Inconsistent validation approach** - Zod in routes, custom in services, inline in some places
2. **No validation layer** - Validation logic scattered (see Phase 4)

**Consolidation Strategy:**
1. **Use Zod consistently** - Convert all validation to Zod schemas
2. **Create validation layer** - Centralize all validation (see Phase 4)
3. **Remove inline validation** - Extract to validation functions

**Impact:**
- Consistent validation patterns
- Better error messages
- Reusable validation logic

---

## 6. GUARD ORDERING INCONSISTENCIES

### Pattern: Different Guard Ordering Across Routes

**Violation:** Guards applied in different orders across routes.

#### Instance 1: `app/api/vote/route.ts`

**Order:**
1. Rate limiting
2. Authentication
3. Guest restriction
4. Request parsing
5. Validation
6. Ownership verification

#### Instance 2: `app/api/document/route.ts`

**Order:**
1. Authentication
2. Request parsing
3. Validation
4. Ownership verification

**Issues:**
1. **Inconsistent ordering** - Rate limiting sometimes first, sometimes not
2. **No standard pattern** - Each route orders guards differently

**Consolidation Strategy:**
1. **Define standard guard order**:
   - Rate limiting (infrastructure)
   - Authentication (security)
   - Authorization (business rules)
   - Request parsing (I/O)
   - Validation (data quality)
   - Business logic (domain)
2. **Create guard middleware** - Apply guards in standard order

**Impact:**
- Consistent guard ordering
- Better security
- Easier to audit

---

## SUMMARY STATISTICS

| Category | Instances | Duplication Level | Priority |
|----------|-----------|-------------------|----------|
| Guest User Checks | 3+ locations | ⚠️ Medium | MEDIUM |
| Ownership Verification | 3+ locations | ⚠️ Medium | MEDIUM |
| UUID Validation | 6 locations | ⚠️ High | HIGH (Phase 1) |
| Request Parsing | 4 locations | ⚠️ High | HIGH (Phase 1) |
| Validation Patterns | 3 approaches | ⚠️ Medium | MEDIUM |
| Guard Ordering | Inconsistent | ⚠️ Low | LOW |
| **TOTAL** | **6** | - | - |

---

## CONSOLIDATION PRIORITY

### High Priority (Already Addressed)
1. **UUID Validation** - Phase 1 consolidation
2. **Request Parsing** - Phase 1 consolidation

### Medium Priority (Needs Attention)
3. **Guest User Checks** - Use `requireRegularUser()` consistently
4. **Ownership Verification** - Use `verifyOwnership()` consistently
5. **Validation Patterns** - Consolidate to Zod + validation layer

### Low Priority (Nice to Have)
6. **Guard Ordering** - Standardize guard order

---

## ENTRY-POINT ENFORCEMENT STRATEGY

### Recommended Guard Order

1. **Rate Limiting** (Infrastructure)
   - Prevents abuse
   - Applied first to save resources

2. **Authentication** (Security)
   - Verify user identity
   - Required for most operations

3. **Authorization** (Business Rules)
   - Guest restrictions
   - Feature flags
   - Permissions

4. **Request Parsing** (I/O)
   - Parse request body
   - Extract parameters

5. **Validation** (Data Quality)
   - Zod schema validation
   - Business rule validation

6. **Business Logic** (Domain)
   - Ownership verification
   - Resource existence
   - Domain-specific rules

---

## MIGRATION PATH

### Step 1: Use Existing Guards
- [ ] Replace guest checks with `requireRegularUser()`
- [ ] Replace ownership checks with `verifyOwnership()`
- [ ] Update all routes

### Step 2: Consolidate Validation
- [ ] Create validation layer (see Phase 4)
- [ ] Convert all validation to Zod
- [ ] Remove inline validation

### Step 3: Standardize Guard Order
- [ ] Document standard guard order
- [ ] Create guard middleware
- [ ] Update all routes

---

## NEXT STEPS

After Phase 11 completion, proceed to:
- **Phase 12:** State & Side-Effect Management
- Continue sequential analysis as per plan.md

---

**Analysis Complete for Phase 11**


