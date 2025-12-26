# PHASE 3 — Single Responsibility & Multi-Concern Violations

**Analysis Date:** 2025-01-27  
**Scope:** Complete codebase  
**Method:** Function analysis, concern identification, responsibility mapping

---

## EXECUTIVE SUMMARY

**Total Violations Found:** 12  
**High Priority Refactors:** 8  
**Estimated Complexity Reduction:** ~35% per affected function  
**Estimated LOC Reduction:** ~400 lines (after extraction)

---

## 1. API ROUTE HANDLERS - MULTI-CONCERN VIOLATIONS

### Pattern: Routes Mixing 6+ Concerns

**Violation:** API route handlers are doing orchestration, validation, authentication, business logic, data access, error handling, and response formatting all in one function.

#### Instance 1: `app/api/vote/route.ts::PATCH` (123 lines)

**Concerns Mixed:**
1. **Rate Limiting** (lines 42-64) - Infrastructure concern
2. **Authentication** (lines 66-71) - Security concern
3. **Authorization** (lines 73-78) - Business rule concern
4. **Request Parsing** (lines 80-94) - I/O concern
5. **Validation** (lines 84-90) - Validation concern
6. **Business Logic** (lines 98-111) - Domain concern
7. **Data Access** (lines 99, 105, 114) - Persistence concern
8. **Error Handling** (lines 100-102, 109-111, 115-120) - Error concern
9. **Response Formatting** (line 122) - Presentation concern

**Current Structure:**
```typescript
export async function PATCH(request: Request): Promise<Response> {
    // 0. Rate limiting (infrastructure)
    // 1. Authentication (security)
    // 2. Authorization (business rule)
    // 3. Parse and validate request body (I/O + validation)
    // 4. Verify chat exists and user owns it (business logic + data)
    // 5. Verify message exists in chat (business logic + data)
    // 6. Save vote (data access)
    // 7. Return response (presentation)
}
```

**Responsibility Split:**
1. **Extract rate limiting** → Middleware wrapper
2. **Extract authentication** → Already has helper, but should be middleware
3. **Extract request parsing** → Helper function (exists but not used)
4. **Extract business logic** → Service layer method
5. **Extract data access** → Already in data layer, but accessed directly
6. **Extract error handling** → Error handler wrapper
7. **Route handler** → Thin orchestrator only

**Refactor Example:**
```typescript
// app/api/vote/handlers/validate-vote-request.ts
export async function validateVoteRequest(
    request: Request
): Promise<ValidatedVoteRequest> {
    // Authentication
    const authResult = await requireAuthForRoute("vote");
    if (isAuthResponse(authResult)) {
        throw authResult; // Let error handler catch
    }
    
    // Parse and validate body
    const body = await parseAndValidateJsonBody(request, voteRequestSchema);
    
    // Authorization
    if (authResult.session.user.type === "guest") {
        throw forbiddenError("vote", {
            reason: "Guest users cannot vote on messages",
        });
    }
    
    return {
        ...authResult,
        body,
    };
}

// lib/services/vote-service.ts
export const VoteService = {
    async submitVote(
        params: { chatId: string; messageId: string; type: "up" | "down" },
        ctx: DataContext
    ): Promise<VoteServiceResult<Vote>> {
        // Business logic: verify chat exists and user owns it
        const chat = await getChatCached(params.chatId, ctx);
        if (!chat) {
            return { success: false, error: "Chat not found", code: "resource:not_found:chat" };
        }
        
        // Business logic: verify message exists
        const chatWithMessages = await getChatWithMessagesCached(params.chatId, ctx);
        const messageExists = chatWithMessages?.messages.some(
            (m) => m.id === params.messageId
        );
        if (!messageExists) {
            return { success: false, error: "Message not found", code: "resource:not_found:message" };
        }
        
        // Data access
        const vote = await saveVoteCached(params.chatId, params.messageId, params.type, ctx);
        if (!vote) {
            return { success: false, error: "Failed to save vote", code: "internal:database" };
        }
        
        return { success: true, data: vote };
    },
};

// app/api/vote/route.ts (refactored)
export async function PATCH(request: Request): Promise<Response> {
    try {
        // Rate limiting (middleware - to be extracted)
        const rateResult = await checkRateLimitForRequest(request, "vote", "standard");
        if (!rateResult.success) {
            return rateResult.response;
        }
        
        // Validation (extracted)
        const validated = await validateVoteRequest(request);
        
        // Business logic (extracted to service)
        const result = await VoteService.submitVote(
            {
                chatId: validated.body.chatId,
                messageId: validated.body.messageId,
                type: validated.body.type,
            },
            validated.ctx
        );
        
        if (!result.success) {
            return handleServiceError(result);
        }
        
        // Response formatting
        return Response.json({ success: true, messageId: result.data.messageId, type: result.data.type });
    } catch (error) {
        return handleError(error);
    }
}
```

**Impact:**
- Route handler: 123 lines → ~30 lines (75% reduction)
- Testability: Each concern can be tested independently
- Reusability: Service logic can be reused in Server Actions
- Maintainability: Changes to business logic don't affect route structure

---

#### Instance 2: `app/api/document/route.ts::POST` (108 lines)

**Concerns Mixed:**
1. **Parameter Extraction** (lines 94-95) - I/O concern
2. **Parameter Validation** (lines 97-112) - Validation concern
3. **Authentication** (lines 114-122) - Security concern
4. **Request Parsing** (lines 130-149) - I/O + validation concern
5. **Business Logic** (lines 153-185) - Domain concern
6. **Data Access** (lines 154, 188) - Persistence concern
7. **Error Handling** (multiple locations) - Error concern
8. **Response Formatting** (line 199) - Presentation concern

**Responsibility Split:**
1. **Extract parameter validation** → Helper function
2. **Extract authentication** → Middleware
3. **Extract request parsing** → Helper function
4. **Extract business logic** → Service layer (DocumentService already exists!)
5. **Route handler** → Thin orchestrator

**Note:** `DocumentService` already exists but the route doesn't use it! This is a missed opportunity.

**Refactor Example:**
```typescript
// app/api/document/route.ts (refactored)
export async function POST(request: Request): Promise<Response> {
    try {
        // Parameter validation (extracted)
        const id = await getUUIDParam(request, "id");
        
        // Authentication (middleware)
        const authResult = await requireAuthForRoute("document");
        if (isAuthResponse(authResult)) {
            return authResult;
        }
        
        // Request parsing (extracted)
        const body = await parseAndValidateJsonBody(request, documentPostSchema);
        
        // Business logic (use existing service!)
        const result = await DocumentService.appendVersion(
            { id, ...body },
            authResult.ctx
        );
        
        if (!result.success) {
            return handleServiceError(result);
        }
        
        return Response.json(result.data);
    } catch (error) {
        return handleError(error);
    }
}
```

**Impact:**
- Route handler: 108 lines → ~25 lines (77% reduction)
- Uses existing DocumentService (was not being used!)
- Consistent with other routes

---

#### Instance 3: `app/api/files/upload/route.ts::POST` (102 lines)

**Concerns Mixed:**
1. **Authentication** (lines 93-98) - Security concern
2. **Configuration Check** (lines 100-106) - Infrastructure concern
3. **Request Validation** (lines 108-125) - Validation concern
4. **File Validation** (lines 127-147) - Validation concern
5. **File Processing** (lines 149-157) - Business logic concern
6. **External Service Call** (lines 158-178) - I/O concern
7. **Error Handling** (lines 179-192) - Error concern
8. **Response Formatting** (lines 173-178) - Presentation concern

**Responsibility Split:**
1. **Extract authentication** → Middleware
2. **Extract configuration check** → Service initialization check
3. **Extract file validation** → Validation service
4. **Extract file processing** → FileService
5. **Route handler** → Thin orchestrator

**Refactor Example:**
```typescript
// lib/services/file-service.ts
export const FileService = {
    async uploadFile(
        file: Blob,
        options: { filename?: string },
        ctx: DataContext
    ): Promise<FileServiceResult<UploadedFile>> {
        // Validate file
        const validation = validateFileUpload(file);
        if (!validation.valid) {
            return { success: false, error: validation.error!, code: validation.code! };
        }
        
        // Process filename
        const filename = options.filename 
            ? sanitizeFilename(options.filename)
            : `upload-${randomUUID()}`;
        
        // Upload to blob storage
        try {
            const blob = await put(filename, file, {
                access: "public",
                contentType: file.type || "application/octet-stream",
                token: process.env.BLOB_READ_WRITE_TOKEN!,
            });
            
            return {
                success: true,
                data: {
                    url: blob.url,
                    pathname: blob.pathname,
                    contentType: file.type || "application/octet-stream",
                    filename,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: "File upload failed",
                code: "external:service_unavailable",
            };
        }
    },
};

// app/api/files/upload/route.ts (refactored)
export async function POST(request: Request): Promise<Response> {
    try {
        // Authentication
        const authResult = await requireAuthForRoute("api");
        if (isAuthResponse(authResult)) {
            return authResult;
        }
        
        // Configuration check
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return new AppError({
                code: "internal:configuration",
                message: "File storage is not configured",
            }).toResponse();
        }
        
        // Parse form data
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof Blob)) {
            return validationError("No file uploaded").toResponse();
        }
        
        // Business logic (extracted to service)
        const result = await FileService.uploadFile(
            file,
            { filename: (file as File).name },
            authResult.ctx
        );
        
        if (!result.success) {
            return handleServiceError(result);
        }
        
        return Response.json(result.data);
    } catch (error) {
        return handleError(error);
    }
}
```

**Impact:**
- Route handler: 102 lines → ~35 lines (66% reduction)
- File upload logic reusable in Server Actions
- Better testability

---

## 2. SERVICE LAYER - MIXING VALIDATION AND BUSINESS LOGIC

### Pattern: Services Doing Validation + Business Logic + Data Access

#### Instance 1: `lib/services/auth-service.ts::migrateGuestToAuthUser`

**Concerns Mixed:**
1. **Input Validation** (lines 62-87) - Validation concern
2. **Business Logic** (line 90) - Domain concern
3. **Error Handling** (lines 92-122) - Error concern
4. **Logging** (lines 93, 107) - Observability concern

**Current Structure:**
```typescript
async migrateGuestToAuthUser(params: MigrateGuestParams): Promise<...> {
    // Validate inputs (validation concern)
    if (!guestId || typeof guestId !== "string") { ... }
    if (!authUserId || typeof authUserId !== "string") { ... }
    const uuidRegex = /^...$/i; // Validation logic inline
    if (!uuidRegex.test(authUserId)) { ... }
    
    // Perform migration (business logic + data access)
    const result = await migrateGuestData(guestId, authUserId);
    
    // Handle result (error handling + logging)
    if (result.success) { logger.info(...) } else { logger.error(...) }
    return result;
}
```

**Responsibility Split:**
1. **Extract validation** → Validation function or Zod schema
2. **Service method** → Business logic only
3. **Error handling** → Result type handles this

**Refactor Example:**
```typescript
// lib/services/auth-service.ts (refactored)
async migrateGuestToAuthUser(
    params: MigrateGuestParams
): Promise<AuthServiceResult<MigrationResult>> {
    // Validation (extracted)
    const validation = validateMigrationParams(params);
    if (!validation.valid) {
        return {
            success: false,
            error: validation.error!,
            code: validation.code!,
        };
    }
    
    // Business logic only
    const result = await migrateGuestData(
        validation.data.guestId,
        validation.data.authUserId
    );
    
    // Logging (extracted to data layer or middleware)
    if (result.success) {
        logger.info("[SEC-003] Guest data migrated", {
            guestId: validation.data.guestId,
            authUserId: validation.data.authUserId,
        });
    }
    
    return result;
}

// lib/services/validators.ts
export function validateMigrationParams(
    params: unknown
): ValidationResult<MigrateGuestParams> {
    // Use Zod schema
    const result = migrateGuestParamsSchema.safeParse(params);
    if (!result.success) {
        return {
            valid: false,
            error: formatZodErrors(result.error.errors),
            code: "validation:invalid_input",
        };
    }
    
    // Additional business validation
    if (!isValidUUID(result.data.authUserId)) {
        return {
            valid: false,
            error: "Auth user ID must be a valid UUID",
            code: "validation:invalid_uuid",
        };
    }
    
    return { valid: true, data: result.data };
}
```

**Impact:**
- Service method: ~60 lines → ~25 lines (58% reduction)
- Validation reusable
- Better testability

---

#### Instance 2: `lib/services/chat-service.ts::create`

**Concerns Mixed:**
1. **Configuration Access** (line 100) - Infrastructure concern
2. **Input Validation** (lines 104-111) - Validation concern
3. **Business Logic** (lines 101-102) - Domain concern
4. **Data Access** (lines 113-120) - Persistence concern
5. **Error Handling** (lines 123-136) - Error concern

**Current Structure:**
```typescript
async create(params: CreateChatParams, ctx: DataContext): Promise<...> {
    try {
        const config = getChatConfig(); // Infrastructure
        const id = params.id ?? crypto.randomUUID(); // Business logic
        const title = params.title ?? "New Chat"; // Business logic
        
        // Validation
        if (title.length > config.titleMaxLength) { ... }
        
        // Data access
        const chat = await createChatCached({ ... }, ctx);
        
        return { success: true, data: chat };
    } catch (error) {
        // Error handling
        if (error instanceof AppError) { ... }
        return { success: false, ... };
    }
}
```

**Responsibility Split:**
1. **Extract validation** → Validation function
2. **Extract business logic** → Pure function
3. **Service method** → Orchestration only

**Refactor Example:**
```typescript
// lib/services/chat-service.ts (refactored)
async create(
    params: CreateChatParams,
    ctx: DataContext
): Promise<ChatServiceResult<Chat>> {
    // Validation (extracted)
    const validation = validateCreateChatParams(params);
    if (!validation.valid) {
        return {
            success: false,
            error: validation.error!,
            code: validation.code!,
        };
    }
    
    // Business logic (extracted)
    const chatData = prepareChatData(validation.data);
    
    // Data access
    try {
        const chat = await createChatCached(chatData, ctx);
        return { success: true, data: chat };
    } catch (error) {
        return handleServiceError(error, "create");
    }
}

// lib/services/chat-helpers.ts
export function prepareChatData(
    params: ValidatedCreateChatParams
): CreateChatData {
    return {
        id: params.id ?? crypto.randomUUID(),
        title: params.title ?? "New Chat",
        visibility: params.visibility ?? "private",
    };
}
```

**Impact:**
- Service method: ~40 lines → ~20 lines (50% reduction)
- Business logic testable in isolation
- Validation reusable

---

## 3. ERROR HANDLING MIXED WITH BUSINESS LOGIC

### Pattern: Error Handling Scattered Throughout Business Logic

**Violation:** Error handling (try-catch, error mapping, logging) is mixed with business logic in service methods.

**Instances:**
- `lib/services/chat-service.ts` - Every method has try-catch
- `lib/services/document-service.ts` - Every method has try-catch
- `lib/services/auth-service.ts` - Error handling inline

**Consolidation Strategy:**
1. Create service error handler wrapper
2. Use Result types consistently
3. Extract error mapping to utility

**Refactor Example:**
```typescript
// lib/services/error-handler.ts
export function handleServiceError<T>(
    error: unknown,
    operation: string
): ServiceResult<T> {
    if (error instanceof AppError) {
        return {
            success: false,
            error: error.message,
            code: error.code,
        };
    }
    
    logger.error(`[Service] ${operation} failed`, { error });
    return {
        success: false,
        error: `Failed to ${operation}`,
        code: "internal:unknown",
    };
}

// Usage in services
async create(...): Promise<ChatServiceResult<Chat>> {
    const validation = validateCreateChatParams(params);
    if (!validation.valid) {
        return mapValidationError(validation);
    }
    
    try {
        const chat = await createChatCached(...);
        return { success: true, data: chat };
    } catch (error) {
        return handleServiceError(error, "create chat");
    }
}
```

**Impact:**
- Consistent error handling
- Reduced duplication
- Better error logging

---

## 4. VALIDATION LOGIC SCATTERED

### Pattern: Validation Logic Inline in Multiple Layers

**Violation:** Validation logic appears in:
- API routes (parameter validation)
- Service methods (input validation)
- Data layer (sometimes)

**Consolidation Strategy:**
1. Create validation layer/module
2. Use Zod schemas consistently
3. Extract validation functions

**Refactor Example:**
```typescript
// lib/validation/api-params.ts
export async function getUUIDParam(
    request: Request,
    paramName: string
): Promise<string> {
    const url = new URL(request.url);
    const value = url.searchParams.get(paramName);
    
    if (!value) {
        throw validationError(`Missing required parameter: ${paramName}`);
    }
    
    if (!isValidUUID(value)) {
        throw validationError(`Invalid UUID format for parameter: ${paramName}`);
    }
    
    return value;
}

// lib/validation/schemas.ts
export const createChatParamsSchema = z.object({
    id: z.string().uuid().optional(),
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    visibility: z.enum(["public", "private"]).optional(),
});

export function validateCreateChatParams(
    params: unknown
): ValidationResult<z.infer<typeof createChatParamsSchema>> {
    const result = createChatParamsSchema.safeParse(params);
    if (!result.success) {
        return {
            valid: false,
            error: formatZodErrors(result.error.errors),
            code: "validation:invalid_input",
        };
    }
    return { valid: true, data: result.data };
}
```

**Impact:**
- Centralized validation
- Reusable validation functions
- Consistent error messages

---

## SUMMARY STATISTICS

| Category | Instances | Avg LOC Before | Avg LOC After | Reduction |
|----------|-----------|----------------|---------------|-----------|
| API Route Handlers | 3 | 111 lines | 30 lines | 73% |
| Service Methods | 2 | 50 lines | 22 lines | 56% |
| Error Handling | Multiple | N/A | N/A | Consolidation |
| Validation Logic | Multiple | N/A | N/A | Centralization |
| **TOTAL** | **12+** | **~400 lines** | **~150 lines** | **~62%** |

---

## REFACTOR PRIORITY

### High Priority (Immediate Impact)
1. **API Route Handlers** - Extract to service layer (3 routes)
2. **Service Validation** - Extract validation layer (all services)
3. **Error Handling** - Create error handler utilities

### Medium Priority (Quality Improvement)
4. **Business Logic Extraction** - Pure functions from services
5. **Configuration Access** - Dependency injection pattern

### Low Priority (Nice to Have)
6. **Logging Extraction** - Centralized logging middleware

---

## EXTRACTION PLAN

### Step 1: Create Service Layer for Vote
- [ ] Create `lib/services/vote-service.ts`
- [ ] Extract business logic from route
- [ ] Update route to use service

### Step 2: Create Validation Layer
- [ ] Create `lib/validation/` directory
- [ ] Extract parameter validation helpers
- [ ] Extract request body validation helpers
- [ ] Create Zod schemas for all inputs

### Step 3: Create Error Handler Utilities
- [ ] Create `lib/services/error-handler.ts`
- [ ] Extract error mapping logic
- [ ] Update all services to use handler

### Step 4: Refactor API Routes
- [ ] Refactor `app/api/vote/route.ts`
- [ ] Refactor `app/api/document/route.ts`
- [ ] Refactor `app/api/files/upload/route.ts`

### Step 5: Refactor Services
- [ ] Extract validation from `auth-service.ts`
- [ ] Extract validation from `chat-service.ts`
- [ ] Extract validation from `document-service.ts`

---

## NEXT STEPS

After Phase 3 completion, proceed to:
- **Phase 4:** Fragmented Logic Across Files
- Continue sequential analysis as per plan.md

---

**Analysis Complete for Phase 3**

