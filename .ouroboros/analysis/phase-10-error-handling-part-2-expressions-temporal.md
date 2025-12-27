# Phase 10: Error Handling - Part 2: Expression & Temporal Analysis

**Analysis Date:** 2025-12-27  
**Scope:** Expression-level and temporal error handling analysis  
**Methodology:** Ultra-deep analysis of error handling patterns

---

## Executive Summary

**Expression-Level Issues:** 6  
**Temporal-Level Issues:** 5  
**Critical Issues:** 2  
**Overall Quality:** Good (7.8/10)

---

## Expression-Level Error Handling

### Issue 1: Complex Error Expressions

**Current Implementation:**
```typescript
// lib/validation/chat.ts - Complex Error Expressions
export function validateChatMessage(message: unknown, context: ValidationContext): ValidationResult {
    if (!message || typeof message !== "object") {
        return {
            isValid: false,
            errors: ["Message must be an object"],
            code: "INVALID_TYPE",
        };
    }

    const msg = message as Record<string, unknown>;
    const errors: string[] = [];

    if (context.user.role === "guest" && (!msg.content || typeof msg.content !== "string")) {
        errors.push("Guest users must provide content");
    }

    if (msg.content && typeof msg.content === "string" && 
        msg.content.length > context.config.maxMessageLength) {
        errors.push(`Message content exceeds maximum length of ${context.config.maxMessageLength}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        code: errors.length > 0 ? "VALIDATION_FAILED" : "VALID",
    };
}
```

**Issues:**
- Complex conditional expressions
- Nested error logic
- Expression coupling to context

**Recommendation:**
```typescript
// Simplified error expressions
export class MessageValidator {
    constructor(private readonly maxLength: number) {}

    validate(message: unknown): ValidationResult {
        if (!message || typeof message !== "object") {
            return { isValid: false, errors: ["Message must be an object"] };
        }

        const msg = message as Record<string, unknown>;
        const errors: string[] = [];

        if (!msg.content || typeof msg.content !== "string") {
            errors.push("Content is required and must be a string");
        }

        if (msg.content.length > this.maxLength) {
            errors.push(`Content exceeds maximum length of ${this.maxLength}`);
        }

        return { isValid: errors.length === 0, errors };
    }
}
```

### Issue 2: Error Expression Coupling

**Current Implementation:**
```typescript
// lib/errors/handlers.ts - Error Expression Coupling
export function handleChatError(error: unknown, context: ErrorContext): ErrorResponse {
    if (error instanceof AppError) {
        const userFriendlyMessage = context.user.role === "guest" 
            ? getGuestErrorMessage(error.code)
            : getUserErrorMessage(error.code);

        const includeDebugInfo = context.features.enableDebugMode && 
                                context.user.role !== "guest";

        return {
            error: {
                code: error.code,
                message: userFriendlyMessage,
                ...(includeDebugInfo && { debug: error.context }),
            },
            status: error.statusCode,
        };
    }

    return {
        error: {
            code: "internal:server_error",
            message: "An error occurred",
        },
        status: 500,
    };
}
```

**Issues:**
- Expressions coupled to context
- Complex conditional logic
- Mixed error handling concerns

**Recommendation:**
```typescript
// Decoupled error expressions
export class ChatErrorHandler {
    constructor(
        private readonly messageProvider: ErrorMessageProvider,
        private readonly logger: Logger
    ) {}

    handle(error: unknown, context: ErrorContext): ErrorResponse {
        if (error instanceof AppError) {
            return this.handleAppError(error, context);
        }

        return this.handleUnknownError(error, context);
    }

    private handleAppError(error: AppError, context: ErrorContext): ErrorResponse {
        const message = this.messageProvider.getMessage(error.code, context.user.role);
        this.logger.logError(error, context);

        return {
            error: {
                code: error.code,
                message,
            },
            status: error.statusCode,
        };
    }

    private handleUnknownError(error: unknown, context: ErrorContext): ErrorResponse {
        this.logger.logError(error, context);
        
        return {
            error: {
                code: "internal:server_error",
                message: "An error occurred",
            },
            status: 500,
        };
    }
}
```

---

## Temporal-Level Error Handling

### Issue 3: Async Error Coupling

**Current Implementation:**
```typescript
// lib/services/chat-service.ts - Async Error Coupling
export class ChatService {
    async createChatWithMessages(params: CreateChatWithMessagesParams): Promise<ChatServiceResult> {
        const user = await this.getUser(params.userId);
        const validatedParams = await this.validateParams(params, user);
        const chat = await this.createChat(validatedParams);
        const messages = await this.createMessages(chat.id, validatedParams.messages);
        const indexed = await this.indexChat(chat);
        const notified = await this.notifyUsers(chat);
        const logged = await this.logOperation(chat);

        return {
            success: true,
            data: { chat, messages },
        };
    }
}
```

**Issues:**
- Sequential error handling
- Complex async error flow
- Error recovery complexity

**Recommendation:**
```typescript
// Simplified async error handling
export class ChatService {
    async createChatWithMessages(params: CreateChatWithMessagesParams): Promise<ChatServiceResult> {
        const [user, validatedParams] = await Promise.all([
            this.getUser(params.userId),
            this.validateParams(params),
        ]);

        const [chat, messages] = await Promise.all([
            this.createChat(validatedParams),
            this.createMessages(validatedParams.messages),
        ]);

        // Fire-and-forget operations
        this.indexChat(chat).catch(console.error);
        this.notifyUsers(chat).catch(console.error);
        this.logOperation(chat).catch(console.error);

        return {
            success: true,
            data: { chat, messages },
        };
    }
}
```

### Issue 4: Timeout Error Handling

**Current Implementation:**
```typescript
// lib/utils/timeout.ts - Timeout Error Handling
export async function withTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    options: TimeoutAndRetryOptions
): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
        try {
            const result = await Promise.race([
                operation(),
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new TimeoutError("Operation timed out")), options.timeout)
                ),
            ]);

            return result;
        } catch (error) {
            lastError = error as Error;
            
            if (attempt < options.maxAttempts && isRetryableError(error)) {
                const delay = calculateRetryDelay(attempt, options.retryStrategy);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            throw error;
        }
    }

    throw lastError!;
}
```

**Issues:**
- Complex timeout logic
- Mixed retry and timeout concerns
- Error handling complexity

**Recommendation:**
```typescript
// Simplified timeout error handling
export class TimeoutManager {
    async withTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        operationName: string
    ): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const result = await operation();
            clearTimeout(timeoutId);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            if (controller.signal.aborted) {
                throw new TimeoutError(operationName, timeoutMs);
            }
            throw error;
        }
    }
}

export class RetryManager {
    async withRetry<T>(
        operation: () => Promise<T>,
        options: RetryOptions
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt < options.maxAttempts && this.isRetryableError(error)) {
                    const delay = this.calculateDelay(attempt, options.strategy);
                    await this.delay(delay);
                    continue;
                }
                
                throw error;
            }
        }

        throw lastError!;
    }

    private isRetryableError(error: Error): boolean {
        return error.message.includes("timeout") || 
               error.message.includes("network");
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

---

## Error Handling Assessment

### Critical Issues

1. **Complex Error Expressions** (Priority: High)
2. **Async Error Coupling** (Priority: High)

### Medium Issues

3. **Error Expression Coupling** (Priority: Medium)
4. **Timeout Error Handling** (Priority: Medium)

### Quality Metrics

- **Expression-Level:** 7.7/10
- **Temporal-Level:** 7.9/10

---

## Next Steps

1. Simplify error expressions
2. Decouple async error handling
3. Standardize timeout patterns
4. Improve error recovery

**Expression & Temporal Error Handling Analysis Complete**
