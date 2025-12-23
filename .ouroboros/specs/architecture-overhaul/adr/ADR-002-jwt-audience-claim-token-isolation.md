# ADR-002: JWT Audience Claim for Token Isolation

## Status

Accepted

## Date

2024-12-23

## Reference

ARCH-001, SEC-004

## Context

The application uses JWTs for guest session tokens. In a multi-tenant or multi-application environment, JWT tokens signed with the same secret could potentially be reused across applications if:

1. Multiple applications share the same `AUTH_SECRET`
2. Tokens are stolen and presented to a different application
3. Development/staging environments accidentally share secrets

Without audience validation, a valid JWT from one application would be accepted by another, creating a **token confusion vulnerability**.

Example attack scenario:

```
1. Attacker gets guest token from app-dev.example.com
2. Attacker presents token to app-prod.example.com
3. Without audience check, token is accepted
4. Attacker gains unauthorized session
```

## Decision

Add **audience (`aud`) claim validation** to all JWT tokens. Each application instance declares and validates its unique audience.

### Implementation

**Token Creation** (middleware.ts):

```typescript
return new SignJWT({
  sub: `guest:${guestId}`,
  type: "guest",
  fp: { ipHash, uaHash },
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setIssuer(JWT_ISSUER)
  .setAudience(JWT_AUDIENCE) // SEC-004: Audience binding
  .setExpirationTime(`${JWT_EXPIRATION_SECONDS}s`)
  .sign(secret);
```

**Configuration** (lib/auth/constants.ts):

```typescript
/** Default issuer for JWT */
export const JWT_ISSUER = "nextjs-ai-chatbot";

/** SEC-004: JWT audience claim for token binding */
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "nextjs-ai-chatbot";
```

**Token Validation** (token verification functions):

```typescript
const { payload } = await jwtVerify(token, secret, {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE, // Validates aud claim
});
```

### Configuration Guidelines

- Production: Set `JWT_AUDIENCE=myapp.example.com`
- Staging: Set `JWT_AUDIENCE=staging.myapp.example.com`
- Development: Default value works for local dev

## Consequences

### Positive

- **Token isolation** - tokens cannot be used across applications
- **Defense in depth** - additional layer beyond secret validation
- **Environment separation** - dev/staging/prod tokens are distinct
- **Standard compliance** - follows JWT RFC 7519 best practices
- **No performance impact** - audience check is a simple string comparison

### Negative

- **Configuration requirement** - must set `JWT_AUDIENCE` per environment
- **Migration complexity** - existing tokens without audience become invalid
- **Debugging friction** - "invalid audience" errors need documentation

### Neutral

- Environment variable management overhead
- Slightly larger JWT payload (audience string added)

## Alternatives Considered

### 1. Application ID in Subject Claim

- Include app ID in `sub` claim: `guest:appid:nanoid`
- **Rejected**: Pollutes subject semantics, harder to parse

### 2. Custom Claim for Application Binding

- Add custom `app` claim instead of standard `aud`
- **Rejected**: Standard `aud` claim has library support

### 3. Separate Secrets Per Environment

- Different `AUTH_SECRET` for each environment
- **Partial solution**: Secrets may still leak, audience adds defense

### 4. No Audience Claim

- Rely solely on secret rotation and protection
- **Rejected**: Single point of failure

## Security Considerations

### Token Replay

The audience claim prevents cross-application replay but does not prevent same-application replay. Additional protections:

- Short expiration (1 hour for guest tokens)
- Device fingerprint validation
- Rate limiting per session

### Clock Skew

JWT validation includes `exp` and `iat` claims. Standard libraries handle clock skew tolerance (typically 60 seconds).

## Related Files

- [lib/auth/constants.ts](../../lib/auth/constants.ts) - JWT_AUDIENCE constant
- [middleware.ts](../../middleware.ts) - Token creation with audience
- [lib/auth/guest.ts](../../lib/auth/guest.ts) - Token validation
