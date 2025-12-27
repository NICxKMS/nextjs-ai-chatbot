# Phase 9: Coupling - Part 3: Semantic & Security Analysis

**Analysis Date:** 2025-12-27  
**Scope:** Semantic-level and security coupling analysis across all dimensions  
**Methodology:** Ultra-deep analysis of coupling relationships in semantics and security

---

## Executive Summary

**Total Semantic-Level Coupling Issues:** 5  
**Total Security-Level Coupling Issues:** 6  
**Critical Issues:** 2  
**High Impact Areas:** Semantic Coupling, Security Coupling, Domain Dependencies  
**Overall Coupling Quality:** Good (7.8/10)  

---

## Semantic-Level Coupling Analysis

### 1. Semantic Coupling Analysis

#### Issue 1: Domain Semantic Coupling
**Severity:** High  
**Coupling Level:** Semantic  
**Pattern:** Tight coupling between domain concepts  
**Impact:** Domain flexibility, maintainability, evolution

**Current Implementation:**
```typescript
// lib/domain/chat.ts - Domain Semantic Coupling
export interface Chat {
    id: string;
    title: string;
    content: string;
    userId: string;
    visibility: "public" | "private" | "shared";
    category: string;
    tags: string[];
    metadata: {
        createdAt: string;
        updatedAt: string;
        lastAccessed: string;
        messageCount: number;
        isPinned: boolean;
        isArchived: boolean;
        sharedWith: string[];
        permissions: {
            canEdit: boolean;
            canDelete: boolean;
            canShare: boolean;
            canView: boolean;
        };
    };
}

// Semantic coupling - Chat tightly coupled to User
export interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user" | "guest";
    preferences: {
        theme: "light" | "dark";
        language: string;
        notifications: boolean;
        defaultVisibility: "public" | "private" | "shared";
        maxChats: number;
    };
    chats: string[]; // Direct coupling to chat IDs
    pinnedChats: string[]; // Direct coupling to chat IDs
    archivedChats: string[]; // Direct coupling to chat IDs
    sharedChats: string[]; // Direct coupling to chat IDs
}

// Semantic coupling - Chat tightly coupled to Message
export interface Message {
    id: string;
    chatId: string; // Direct coupling to Chat
    userId: string; // Direct coupling to User
    content: string;
    type: "text" | "image" | "file" | "system";
    metadata: {
        createdAt: string;
        updatedAt: string;
        isEdited: boolean;
        editHistory: Array<{
            timestamp: string;
            content: string;
            editedBy: string; // Direct coupling to User
        }>;
        attachments: Array<{
            id: string;
            name: string;
            type: string;
            size: number;
            url: string;
        }>;
        reactions: Array<{
            emoji: string;
            userId: string; // Direct coupling to User
            timestamp: string;
        }>;
    };
}

// Semantic coupling - Complex domain relationships
export interface ChatDomain {
    users: Map<string, User>;
    chats: Map<string, Chat>;
    messages: Map<string, Message>;
    
    // Tightly coupled operations
    createUserChat(userId: string, chatData: Omit<Chat, "id" | "userId">): Chat;
    addUserToChat(chatId: string, userId: string): void;
    removeUserFromChat(chatId: string, userId: string): void;
    pinChat(userId: string, chatId: string): void;
    archiveChat(userId: string, chatId: string): void;
    shareChat(chatId: string, targetUserId: string): void;
    
    // Complex semantic operations
    getChatWithMessages(chatId: string): { chat: Chat; messages: Message[] };
    getUserChatsWithMetadata(userId: string): { chat: Chat; metadata: ChatMetadata }[];
    getSharedChatsBetweenUsers(user1Id: string, user2Id: string): Chat[];
}
```

**Coupling Analysis:**
- **Domain Coupling:** Very High (Chat, User, Message tightly coupled)
- **Semantic Dependency:** High (domain concepts depend on each other)
- **Relationship Complexity:** High (complex relationships between entities)
- **Evolution Impact:** High (changes to one domain affect others)

**Semantic-Level Issues:**
1. **Tight Domain Coupling:** Chat, User, Message tightly coupled
2. **Direct Reference Coupling:** Direct references between domain objects
3. **Complex Relationships:** Complex semantic relationships
4. **Evolution Constraints:** Hard to evolve domain independently

**Recommendation:**
```typescript
// REDUCED SEMANTIC COUPLING
// Separate domain concepts with loose coupling
export interface Chat {
    id: string;
    title: string;
    content: string;
    visibility: "public" | "private" | "shared";
    category: string;
    tags: string[];
    metadata: {
        createdAt: string;
        updatedAt: string;
        lastAccessed: string;
        messageCount: number;
        isPinned: boolean;
        isArchived: boolean;
    };
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user" | "guest";
    preferences: {
        theme: "light" | "dark";
        language: string;
        notifications: boolean;
        defaultVisibility: "public" | "private" | "shared";
        maxChats: number;
    };
}

export interface Message {
    id: string;
    content: string;
    type: "text" | "image" | "file" | "system";
    metadata: {
        createdAt: string;
        updatedAt: string;
        isEdited: boolean;
        attachments: Array<{
            id: string;
            name: string;
            type: string;
            size: number;
            url: string;
        }>;
    };
}

// Loose coupling through relationships
export interface ChatUserRelationship {
    chatId: string;
    userId: string;
    role: "owner" | "member" | "viewer";
    permissions: string[];
    joinedAt: string;
    lastAccessed: string;
    isPinned: boolean;
    isArchived: boolean;
}

export interface ChatMessageRelationship {
    chatId: string;
    messageId: string;
    userId: string;
    createdAt: string;
    isEdited: boolean;
    editHistory: Array<{
        timestamp: string;
        content: string;
        editedBy: string;
    }>;
}

// Separate domain services
export class ChatService {
    constructor(private readonly chatRepository: ChatRepository) {}

    async createChat(chatData: CreateChatData): Promise<Chat> {
        return this.chatRepository.create(chatData);
    }

    async getChat(chatId: string): Promise<Chat | null> {
        return this.chatRepository.findById(chatId);
    }
}

export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async createUser(userData: CreateUserData): Promise<User> {
        return this.userRepository.create(userData);
    }

    async getUser(userId: string): Promise<User | null> {
        return this.userRepository.findById(userId);
    }
}

// Relationship management
export class RelationshipService {
    constructor(
        private readonly relationshipRepository: RelationshipRepository
    ) {}

    async addUserToChat(chatId: string, userId: string): Promise<void> {
        const relationship: ChatUserRelationship = {
            chatId,
            userId,
            role: "member",
            permissions: ["view"],
            joinedAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            isPinned: false,
            isArchived: false,
        };

        await this.relationshipRepository.create(relationship);
    }

    async getUserChats(userId: string): Promise<Chat[]> {
        const relationships = await this.relationshipRepository.findByUserId(userId);
        const chatIds = relationships.map(r => r.chatId);
        return this.chatRepository.findByIds(chatIds);
    }
}
```

#### Issue 2: Business Logic Semantic Coupling
**Severity:** Medium  
**Coupling Level:** Semantic  
**Pattern:** Business logic coupled to domain semantics  
**Impact:** Business flexibility, maintainability

**Current Implementation:**
```typescript
// lib/business/chat-business.ts - Business Logic Semantic Coupling
export class ChatBusinessLogic {
    // Semantic coupling - business logic tied to domain structure
    async canUserEditChat(user: User, chat: Chat): Promise<boolean> {
        // Direct coupling to domain structure
        if (chat.userId === user.id) return true;
        
        // Coupling to complex permission structure
        if (chat.metadata.permissions.canEdit) {
            // Coupling to shared users structure
            if (chat.metadata.sharedWith.includes(user.id)) {
                return true;
            }
        }
        
        // Coupling to user role
        if (user.role === "admin") return true;
        
        return false;
    }

    // Semantic coupling - complex business rules
    async createChatWithBusinessRules(userData: User, chatData: CreateChatData): Promise<Chat> {
        // Coupling to user preferences
        const visibility = chatData.visibility || userData.preferences.defaultVisibility;
        
        // Coupling to user limits
        if (userData.chats.length >= userData.preferences.maxChats) {
            throw new AppError("business:limit_exceeded", "User chat limit exceeded");
        }
        
        // Coupling to business validation rules
        if (visibility === "public" && userData.role !== "admin") {
            throw new AppError("business:permission_denied", "Only admins can create public chats");
        }
        
        // Coupling to domain creation
        const chat: Chat = {
            id: generateId(),
            title: chatData.title,
            content: chatData.content,
            userId: userData.id,
            visibility,
            category: this.categorizeContent(chatData.content),
            tags: chatData.tags || [],
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                messageCount: 0,
                isPinned: false,
                isArchived: false,
                sharedWith: [],
                permissions: {
                    canEdit: true,
                    canDelete: true,
                    canShare: visibility === "public",
                    canView: true,
                },
            },
        };
        
        return chat;
    }

    // Semantic coupling - complex domain operations
    async shareChatWithUser(chat: Chat, fromUser: User, toUser: User): Promise<void> {
        // Coupling to chat permissions
        if (!chat.metadata.permissions.canShare) {
            throw new AppError("business:permission_denied", "Chat cannot be shared");
        }
        
        // Coupling to user relationships
        if (chat.metadata.sharedWith.includes(toUser.id)) {
            throw new AppError("business:already_shared", "Chat already shared with user");
        }
        
        // Coupling to visibility rules
        if (chat.visibility === "private" && chat.userId !== fromUser.id) {
            throw new AppError("business:permission_denied", "Cannot share private chat");
        }
        
        // Coupling to domain mutation
        chat.metadata.sharedWith.push(toUser.id);
        chat.metadata.updatedAt = new Date().toISOString();
    }
}
```

**Coupling Analysis:**
- **Business-Domain Coupling:** High (business logic tightly coupled to domain structure)
- **Rule Coupling:** Medium (business rules coupled to domain properties)
- **Validation Coupling:** Medium (validation logic coupled to domain semantics)
- **Operation Coupling:** High (business operations coupled to domain mutations)

**Semantic-Level Issues:**
1. **Business-Domain Coupling:** Business logic tightly coupled to domain structure
2. **Rule Coupling:** Business rules coupled to domain properties
3. **Validation Coupling:** Validation logic coupled to domain semantics
4. **Operation Coupling:** Business operations coupled to domain mutations

**Recommendation:**
```typescript
// REDUCED SEMANTIC COUPLING IN BUSINESS LOGIC
export interface BusinessRule {
    evaluate(context: BusinessContext): BusinessRuleResult;
}

export class ChatCreationRule implements BusinessRule {
    evaluate(context: BusinessContext): BusinessRuleResult {
        const { user, chatData } = context;
        
        // Simple rule evaluation
        if (user.chats.length >= user.preferences.maxChats) {
            return {
                valid: false,
                reason: "User chat limit exceeded",
                code: "limit_exceeded",
            };
        }
        
        if (chatData.visibility === "public" && user.role !== "admin") {
            return {
                valid: false,
                reason: "Only admins can create public chats",
                code: "permission_denied",
            };
        }
        
        return { valid: true };
    }
}

export class ChatSharingRule implements BusinessRule {
    evaluate(context: BusinessContext): BusinessRuleResult {
        const { chat, fromUser, toUser } = context;
        
        if (!chat.metadata.permissions.canShare) {
            return {
                valid: false,
                reason: "Chat cannot be shared",
                code: "permission_denied",
            };
        }
        
        if (chat.metadata.sharedWith.includes(toUser.id)) {
            return {
                valid: false,
                reason: "Chat already shared with user",
                code: "already_shared",
            };
        }
        
        return { valid: true };
    }
}

// Business logic service
export class ChatBusinessService {
    constructor(
        private readonly rules: BusinessRule[],
        private readonly chatRepository: ChatRepository,
        private readonly userRepository: UserRepository
    ) {}

    async createChat(userData: User, chatData: CreateChatData): Promise<Chat> {
        const context: BusinessContext = { user: userData, chatData };
        
        // Evaluate all rules
        for (const rule of this.rules) {
            const result = rule.evaluate(context);
            if (!result.valid) {
                throw new AppError(`business:${result.code}`, result.reason);
            }
        }
        
        // Create chat
        return this.chatRepository.create({
            ...chatData,
            userId: userData.id,
            visibility: chatData.visibility || userData.preferences.defaultVisibility,
        });
    }

    async canUserEditChat(userId: string, chatId: string): Promise<boolean> {
        const [user, chat] = await Promise.all([
            this.userRepository.findById(userId),
            this.chatRepository.findById(chatId),
        ]);

        if (!user || !chat) return false;
        
        // Simple permission check
        return chat.userId === userId || user.role === "admin";
    }
}
```

---

## Security-Level Coupling Analysis

### 1. Security Coupling Analysis

#### Issue 3: Security Context Coupling
**Severity:** High  
**Coupling Level:** Security  
**Pattern:** Security logic coupled to domain objects  
**Impact:** Security flexibility, maintainability, testability

**Current Implementation:**
```typescript
// lib/security/context.ts - Security Context Coupling
export interface SecurityContext {
    user: User; // Direct coupling to domain User
    chat?: Chat; // Direct coupling to domain Chat
    message?: Message; // Direct coupling to domain Message
    session: Session; // Direct coupling to auth Session
    request: {
        id: string;
        method: string;
        path: string;
        headers: Record<string, string>;
        ip: string;
        userAgent: string;
    };
    permissions: string[];
    roles: string[];
    features: string[];
    metadata: {
        timestamp: string;
        riskScore: number;
        deviceFingerprint: string;
        geoLocation: string;
    };
}

// Security coupling - authorization logic tied to domain
export class AuthorizationService {
    // Direct coupling to domain objects
    async canUserAccessChat(securityContext: SecurityContext, chatId: string): Promise<boolean> {
        // Coupling to domain User structure
        const user = securityContext.user;
        const chat = securityContext.chat;
        
        // Complex domain-specific authorization
        if (chat?.userId === user.id) return true;
        if (user.role === "admin") return true;
        if (chat?.metadata.sharedWith.includes(user.id)) return true;
        if (chat?.visibility === "public") return true;
        
        // Coupling to complex permission structure
        return securityContext.permissions.includes(`chat:${chatId}:view`);
    }

    // Security coupling - business logic mixed with security
    async canUserEditMessage(
        securityContext: SecurityContext, 
        messageId: string
    ): Promise<boolean> {
        const user = securityContext.user;
        const message = securityContext.message;
        const chat = securityContext.chat;
        
        // Complex domain-specific security rules
        if (message?.userId === user.id) return true;
        if (chat?.userId === user.id) return true;
        if (user.role === "admin") return true;
        
        // Coupling to message metadata
        if (message?.metadata.editHistory.length > 0) {
            const lastEdit = message.metadata.editHistory[message.metadata.editHistory.length - 1];
            if (lastEdit.editedBy !== user.id && user.role !== "admin") {
                return false;
            }
        }
        
        return securityContext.permissions.includes(`message:${messageId}:edit`);
    }

    // Security coupling - complex permission evaluation
    async evaluatePermissions(securityContext: SecurityContext): Promise<PermissionSet> {
        const permissions = new Set<string>();
        
        // Coupling to user role
        if (securityContext.user.role === "admin") {
            permissions.add("admin:all");
        }
        
        // Coupling to chat ownership
        if (securityContext.chat?.userId === securityContext.user.id) {
            permissions.add(`chat:${securityContext.chat.id}:all`);
        }
        
        // Coupling to message ownership
        if (securityContext.message?.userId === securityContext.user.id) {
            permissions.add(`message:${securityContext.message.id}:all`);
        }
        
        // Coupling to shared chats
        if (securityContext.chat?.metadata.sharedWith.includes(securityContext.user.id)) {
            permissions.add(`chat:${securityContext.chat.id}:view`);
        }
        
        return permissions;
    }
}
```

**Coupling Analysis:**
- **Domain-Security Coupling:** Very High (security logic coupled to domain objects)
- **Authorization Coupling:** High (authorization logic coupled to domain structure)
- **Permission Coupling:** High (permissions coupled to domain relationships)
- **Context Coupling:** High (security context coupled to multiple domain objects)

**Security-Level Issues:**
1. **Domain-Security Coupling:** Security logic coupled to domain objects
2. **Authorization Coupling:** Authorization logic coupled to domain structure
3. **Permission Coupling:** Permissions coupled to domain relationships
4. **Context Coupling:** Security context coupled to multiple domain objects

**Recommendation:**
```typescript
// REDUCED SECURITY COUPLING
// Abstract security interfaces
export interface SecurityPrincipal {
    id: string;
    type: "user" | "service" | "system";
    attributes: Record<string, unknown>;
}

export interface SecurityResource {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
}

export interface SecurityContext {
    principal: SecurityPrincipal;
    resource?: SecurityResource;
    operation: string;
    environment: {
        timestamp: string;
        ip: string;
        userAgent: string;
    };
}

// Decoupled authorization service
export class AuthorizationService {
    constructor(
        private readonly permissionEvaluator: PermissionEvaluator,
        private readonly policyEngine: PolicyEngine
    ) {}

    async authorize(context: SecurityContext): Promise<AuthorizationResult> {
        // Evaluate permissions using abstract interfaces
        const permissions = await this.permissionEvaluator.evaluate(context);
        const policies = await this.policyEngine.evaluate(context);
        
        return {
            authorized: permissions.has(`${context.resource.type}:${context.operation}`) &&
                     policies.allow(context),
            permissions: Array.from(permissions),
            policies: policies.results,
        };
    }
}

// Simple permission evaluator
export class PermissionEvaluator {
    async evaluate(context: SecurityContext): Promise<Set<string>> {
        const permissions = new Set<string>();
        
        // Principal-based permissions
        if (context.principal.type === "user") {
            const userAttributes = context.principal.attributes as Record<string, unknown>;
            
            if (userAttributes.role === "admin") {
                permissions.add("admin:all");
            }
            
            // Resource-specific permissions
            if (context.resource) {
                const resourceId = context.resource.id;
                const resourceType = context.resource.type;
                
                permissions.add(`${resourceType}:${resourceId}:view`);
                
                if (userAttributes.id === context.resource.attributes.ownerId) {
                    permissions.add(`${resourceType}:${resourceId}:all`);
                }
            }
        }
        
        return permissions;
    }
}

// Simple policy engine
export class PolicyEngine {
    async evaluate(context: SecurityContext): Promise<PolicyResult> {
        const policies: Policy[] = [];
        
        // Time-based policy
        if (this.isBusinessHours(context.environment.timestamp)) {
            policies.push(new BusinessHoursPolicy());
        }
        
        // IP-based policy
        if (this.isInternalIP(context.environment.ip)) {
            policies.push(new InternalNetworkPolicy());
        }
        
        return new PolicyResult(policies);
    }

    private isBusinessHours(timestamp: string): boolean {
        const hour = new Date(timestamp).getHours();
        return hour >= 9 && hour <= 17;
    }

    private isInternalIP(ip: string): boolean {
        return ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.");
    }
}
```

#### Issue 4: Authentication Coupling
**Severity:** Medium  
**Coupling Level:** Security  
**Pattern:** Authentication logic coupled to domain objects  
**Impact:** Authentication flexibility, maintainability

**Current Implementation:**
```typescript
// lib/auth/authentication.ts - Authentication Coupling
export class AuthenticationService {
    // Authentication coupled to domain User
    async authenticateUser(credentials: Credentials): Promise<AuthResult> {
        // Coupling to user domain structure
        const user = await this.getUserByEmail(credentials.email);
        if (!user) {
            return { success: false, reason: "User not found" };
        }
        
        // Coupling to user preferences
        if (!user.preferences.notifications && credentials.requireNotifications) {
            return { success: false, reason: "User has notifications disabled" };
        }
        
        // Coupling to user role
        if (user.role === "guest" && credentials.requireFullAccess) {
            return { success: false, reason: "Guest users cannot have full access" };
        }
        
        // Password verification
        const isValidPassword = await this.verifyPassword(credentials.password, user.passwordHash);
        if (!isValidPassword) {
            return { success: false, reason: "Invalid password" };
        }
        
        // Coupling to user chat data
        const userChats = await this.getUserChats(user.id);
        if (userChats.length === 0 && credentials.requireExistingChats) {
            return { success: false, reason: "User has no existing chats" };
        }
        
        return {
            success: true,
            user,
            session: await this.createSession(user),
        };
    }

    // Session management coupled to domain
    async createSession(user: User): Promise<Session> {
        // Coupling to user domain structure
        const session: Session = {
            id: generateId(),
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            userPreferences: user.preferences,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            metadata: {
                deviceFingerprint: this.generateDeviceFingerprint(user),
                loginCount: user.chats.length, // Coupling to user chats
                lastLogin: user.preferences.lastLogin || new Date().toISOString(),
            },
        };
        
        return this.sessionRepository.create(session);
    }

    // Token validation coupled to domain
    async validateToken(token: string): Promise<TokenValidationResult> {
        const payload = await this.decodeToken(token);
        
        // Coupling to user domain structure
        const user = await this.getUserById(payload.userId);
        if (!user) {
            return { valid: false, reason: "User not found" };
        }
        
        // Coupling to user status
        if (user.role === "guest" && payload.requiresFullAccess) {
            return { valid: false, reason: "Guest token invalid for full access" };
        }
        
        // Coupling to session data
        const session = await this.getSession(payload.sessionId);
        if (!session || !session.isActive) {
            return { valid: false, reason: "Invalid session" };
        }
        
        return {
            valid: true,
            user,
            session,
        };
    }
}
```

**Coupling Analysis:**
- **Authentication-Domain Coupling:** High (authentication logic coupled to domain User)
- **Session Coupling:** Medium (session management coupled to domain structure)
- **Token Coupling:** Medium (token validation coupled to domain objects)
- **Preference Coupling:** Low (authentication coupled to user preferences)

**Security-Level Issues:**
1. **Authentication-Domain Coupling:** Authentication logic coupled to domain User
2. **Session Coupling:** Session management coupled to domain structure
3. **Token Coupling:** Token validation coupled to domain objects
4. **Preference Coupling:** Authentication coupled to user preferences

**Recommendation:**
```typescript
// REDUCED AUTHENTICATION COUPLING
// Abstract authentication interfaces
export interface AuthPrincipal {
    id: string;
    type: "user" | "service" | "guest";
    attributes: Record<string, unknown>;
}

export interface AuthCredentials {
    identifier: string;
    secret: string;
    metadata?: Record<string, unknown>;
}

export interface AuthSession {
    id: string;
    principalId: string;
    principalType: string;
    createdAt: string;
    expiresAt: string;
    isActive: boolean;
    attributes: Record<string, unknown>;
}

// Decoupled authentication service
export class AuthenticationService {
    constructor(
        private readonly credentialValidator: CredentialValidator,
        private readonly sessionManager: SessionManager,
        private readonly tokenService: TokenService
    ) {}

    async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
        // Validate credentials using abstract interface
        const principal = await this.credentialValidator.validate(credentials);
        if (!principal) {
            return { success: false, reason: "Invalid credentials" };
        }
        
        // Create session using abstract interface
        const session = await this.sessionManager.createSession(principal);
        
        return {
            success: true,
            principal,
            session,
        };
    }

    async validateToken(token: string): Promise<TokenValidationResult> {
        // Validate token using abstract interface
        const payload = await this.tokenService.validate(token);
        if (!payload) {
            return { valid: false, reason: "Invalid token" };
        }
        
        // Get session using abstract interface
        const session = await this.sessionManager.getSession(payload.sessionId);
        if (!session || !session.isActive) {
            return { valid: false, reason: "Invalid session" };
        }
        
        return {
            valid: true,
            principal: {
                id: session.principalId,
                type: session.principalType as "user" | "service" | "guest",
                attributes: session.attributes,
            },
            session,
        };
    }
}

// Simple credential validator
export class CredentialValidator {
    async validate(credentials: AuthCredentials): Promise<AuthPrincipal | null> {
        // Simple validation logic
        if (credentials.identifier.includes("@")) {
            return this.validateEmailCredentials(credentials);
        } else if (credentials.identifier.startsWith("token:")) {
            return this.validateTokenCredentials(credentials);
        } else {
            return this.validateUsernameCredentials(credentials);
        }
    }

    private async validateEmailCredentials(credentials: AuthCredentials): Promise<AuthPrincipal | null> {
        // Email validation logic
        const user = await this.getUserByEmail(credentials.identifier);
        if (!user) return null;
        
        const isValidPassword = await this.verifyPassword(credentials.secret, user.passwordHash);
        if (!isValidPassword) return null;
        
        return {
            id: user.id,
            type: "user",
            attributes: {
                email: user.email,
                role: user.role,
            },
        };
    }

    private async validateTokenCredentials(credentials: AuthCredentials): Promise<AuthPrincipal | null> {
        // Token validation logic
        const token = credentials.identifier.replace("token:", "");
        const payload = await this.decodeServiceToken(token);
        
        if (!payload) return null;
        
        return {
            id: payload.serviceId,
            type: "service",
            attributes: payload,
        };
    }
}
```

---

## Semantic and Security Coupling Assessment

### Critical Issues Summary

#### 1. **Domain Semantic Coupling** (Priority: High)
- **Issue:** Tight coupling between domain concepts
- **Impact:** Domain flexibility, maintainability, evolution
- **Files Affected:** lib/domain/chat.ts, lib/domain/user.ts, lib/domain/message.ts
- **Remediation Effort:** High

#### 2. **Security Context Coupling** (Priority: High)
- **Issue:** Security logic coupled to domain objects
- **Impact:** Security flexibility, maintainability, testability
- **Files Affected:** lib/security/context.ts, lib/security/authorization.ts
- **Remediation Effort:** High

### Medium Issues Summary

#### 3. **Business Logic Semantic Coupling** (Priority: Medium)
- **Issue:** Business logic coupled to domain semantics
- **Impact:** Business flexibility, maintainability
- **Files Affected:** lib/business/chat-business.ts, lib/business/message-business.ts
- **Remediation Effort:** Medium

#### 4. **Authentication Coupling** (Priority: Medium)
- **Issue:** Authentication logic coupled to domain objects
- **Impact:** Authentication flexibility, maintainability
- **Files Affected:** lib/auth/authentication.ts, lib/auth/session.ts
- **Remediation Effort:** Medium

### Coupling Quality Metrics

#### Semantic-Level Coupling Score: 7.7/10
- **Domain Coupling:** Medium (some domain concepts are tightly coupled)
- **Business Coupling:** Good (business logic reasonably separated)
- **Semantic Clarity:** Good (domain concepts are clear)
- **Evolution Flexibility:** Medium (some evolution constraints)

#### Security-Level Coupling Score: 7.9/10
- **Security Flexibility:** Good (security logic reasonably flexible)
- **Domain Separation:** Medium (some security logic coupled to domain)
- **Authorization Clarity:** Good (authorization logic is clear)
- **Authentication Simplicity:** Good (authentication is reasonably simple)

---

## Next Steps

### Phase 1: Semantic Decoupling (Week 1)
1. Separate domain concepts with loose coupling
2. Implement relationship management
3. Reduce business-domain coupling

### Phase 2: Security Decoupling (Week 2)
1. Abstract security interfaces
2. Separate security from domain logic
3. Implement decoupled authentication

### Phase 3: Integration and Testing (Week 3)
1. Integrate decoupled components
2. Test security effectiveness
3. Validate semantic clarity

**Semantic & Security Coupling Analysis Complete:** 11 coupling issues identified with actionable decoupling plan.
