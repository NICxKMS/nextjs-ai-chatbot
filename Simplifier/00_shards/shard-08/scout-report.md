# Scout Report: Shard 08 - features/auth

## Metrics Summary

| Files in shard          | 18 |
| Total LOC               | 2107 |
| Exports catalogued      | 37 |
| Cross-shard edges found | 10 |
| Issues flagged          | 6 |
| Critical complexity (>10)| 1 |

---

## File-by-File Inventory

### Entry Points

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `index.ts` | 66 | entry point | 1 | AuthForm, AuthProvider, ProtectedRoute, UseAuthStateReturn, useAuth, useAuthState, login, loginWithRedirect, logout, logoutWithRedirect, register, registerWithRedirect, LoginInput, loginSchema, RegisterInput, ResetPasswordInput, registerSchema, resetPasswordSchema, UpdatePasswordInput, updatePasswordSchema, AppSession, AppSessionUser, AuthContextValue, AuthFormProps, AuthProviderProps, AuthResult, AuthStatus, AuthUser, LoginCredentials, ProtectedRouteProps, RegisterCredentials |

### Type Definitions

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `types.ts` | 138 | type definitions | 1 | AuthStatus, AuthFormProps, AuthProviderProps, ProtectedRouteProps, AuthContextValue, AuthResult, LoginCredentials, RegisterCredentials, AuthUser, AppSession, AppSessionUser (re-export) |

### Components

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `components/auth-provider.tsx` | 473 | domain logic | **12** | AuthProvider, useAuth |
| `components/auth-form.tsx` | 171 | domain logic | 3 | AuthForm |
| `components/protected-route.tsx` | 98 | domain logic | 2 | ProtectedRoute |
| `components/submit-button.tsx` | 81 | utility | 1 | SubmitButton |
| `components/index.ts` | 13 | barrel export | 1 | AuthForm, AuthProvider, useAuth, ProtectedRoute, SubmitButton |

### Server Actions

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `actions/login.action.ts` | 126 | domain logic | 4 | login, loginWithRedirect |
| `actions/logout.action.ts` | 63 | domain logic | 2 | logout, logoutWithRedirect |
| `actions/register.action.ts` | 124 | domain logic | 4 | register, registerWithRedirect |
| `actions/index.ts` | 21 | barrel export | 1 | login, loginWithRedirect, logout, logoutWithRedirect, register, registerWithRedirect |

### Hooks

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `hooks/use-auth.ts` | 121 | domain logic | 2 | UseAuthStateReturn, useAuthState |
| `hooks/use-logout-handler.ts` | 127 | domain logic | 3 | useLogoutHandler |
| `hooks/use-auth.test.ts` | 366 | test | N/A | (none - test file) |
| `hooks/index.ts` | 13 | barrel export | 1 | useAuth, UseAuthStateReturn, useAuthState, useLogoutHandler |

### Schemas

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `schemas/auth.schema.ts` | 104 | type definitions | 1 | loginSchema, LoginInput, registerSchema, RegisterInput, resetPasswordSchema, ResetPasswordInput, updatePasswordSchema, UpdatePasswordInput |
| `schemas/index.ts` | 19 | barrel export | 1 | loginSchema, LoginInput, registerSchema, RegisterInput, resetPasswordSchema, ResetPasswordInput, updatePasswordSchema, UpdatePasswordInput |

---

## Cross-Shard Dependency Edges

### Inbound (external → shard)

None detected - shard is self-contained entry point.

### Outbound (shard → external)

| Source File | Target Module | Import |
|-------------|---------------|--------|
| `types.ts:10` | `@/lib/auth/session` | AppSession, AppSessionUser (type) |
| `auth-provider.tsx:28` | `@/lib/auth/session` | AppSession (type) |
| `auth-provider.tsx:27` | `swr` | useSWRConfig |
| `login.action.ts:15` | `@/lib/auth` | signIn |
| `login.action.ts:16` | `@/lib/utils/validation` | getSafeRedirectUrl |
| `logout.action.ts:12` | `@/lib/auth` | signOut |
| `register.action.ts:17` | `@/lib/data/services/auth.service` | authService |
| `submit-button.tsx:15` | `@/components/icons` | LoaderIcon |
| `submit-button.tsx:16` | `@/components/ui/button` | Button |
| `auth-form.tsx:16` | `@/components/ui/input` | Input |
| `auth-form.tsx:17` | `@/components/ui/label` | Label |

---

## Intra-Shard Pattern Flags

### 1. Duplicate Constants & Types (HIGH PRIORITY)

**Location:** `auth-provider.tsx:35-49` and `use-logout-handler.ts:20-34`

Identical constants and types defined in both files:
- `AUTH_CHANNEL_NAME` 
- `AUTH_STORAGE_KEY`
- `AuthEventType` type
- `AuthEventMessage` interface

**Recommendation:** Extract to shared internal module (e.g., `constants.ts` or `types.ts`).

---

### 2. Duplicate Logout Logic (MEDIUM PRIORITY)

**Locations:**
- `use-auth.ts:96-110` - `signOut` function calls `/api/auth/logout`
- `use-logout-handler.ts:75-125` - logout handler also calls `/api/auth/logout`
- `logout.action.ts:35-52` - server action `logout()` calls `signOut()`

Three separate implementations of logout with different behaviors:
- `useAuthState().signOut` - fetches API, redirects to `/`
- `useLogoutHandler()` - broadcasts to other tabs, calls API, clears session, redirects
- `logout()` server action - server-side signOut via NextAuth

**Recommendation:** Consolidate into single source of truth for logout flow.

---

### 3. Inconsistent Export Coverage (LOW PRIORITY)

**Location:** `components/index.ts:12` vs `index.ts:13`

`SubmitButton` is exported from `components/index.ts` but NOT re-exported from the main barrel `index.ts`. This creates an inconsistency in the public API surface.

---

### 4. Hook Export Pattern Inconsistency (LOW PRIORITY)

**Location:** `hooks/index.ts:10` and `components/auth-provider.tsx:464`

`useAuth` hook is defined in `auth-provider.tsx` (a component file) and re-exported from `hooks/index.ts`. This creates an unusual module dependency where hooks barrel imports from components.

---

### 5. Cyclomatic Complexity Warning

**Location:** `auth-provider.tsx` - Complexity: **12**

The `AuthProvider` component has high complexity due to:
- Multiple useEffect hooks (5 total)
- BroadcastChannel logic with switch statements
- Nested async IIFE
- Multiple state variables (6 useState)

**Recommendation:** Consider extracting cross-tab sync logic to a custom hook.

---

### 6. Potential Unused Type Re-export

**Location:** `types.ts:137`

```typescript
export type { AppSession, AppSessionUser }
```

These types are imported from `@/lib/auth/session` and immediately re-exported. The same types are also exported from `index.ts:53-54`. The barrel file already imports and re-exports them, making this re-export potentially redundant.

---

## Export Inventory Summary

### Public API (from barrel `index.ts`)

**Components (3):**
- AuthForm, AuthProvider, ProtectedRoute

**Hooks (3):**
- useAuth, useAuthState, useLogoutHandler
- Type: UseAuthStateReturn

**Server Actions (6):**
- login, loginWithRedirect, logout, logoutWithRedirect, register, registerWithRedirect

**Schemas (4):**
- loginSchema, registerSchema, resetPasswordSchema, updatePasswordSchema
- Types: LoginInput, RegisterInput, ResetPasswordInput, UpdatePasswordInput

**Types (11):**
- AppSession, AppSessionUser, AuthContextValue, AuthFormProps, AuthProviderProps, AuthResult, AuthStatus, AuthUser, LoginCredentials, ProtectedRouteProps, RegisterCredentials

**Internal Exports (not in barrel):**
- SubmitButton (component-level only)

---

## Dependencies Analysis

### External Dependencies
| Package | Usage |
|---------|-------|
| `next/navigation` | redirect, useRouter |
| `next/form` | Form component |
| `next-auth` | AuthError type |
| `react` | hooks, JSX, ReactNode |
| `react-dom` | useFormStatus |
| `swr` | useSWRConfig |
| `zod` | schema validation |

### Internal Dependencies
| Module | Consumers |
|--------|-----------|
| `@/lib/auth` | login.action, logout.action |
| `@/lib/auth/session` | types, auth-provider, use-auth.test |
| `@/lib/data/services/auth.service` | register.action |
| `@/lib/utils/validation` | login.action |
| `@/components/ui/*` | auth-form, submit-button |
| `@/components/icons` | submit-button |

---

## No Issues Found

- No dead code candidates
- No unused variables detected
- No naming inconsistencies within the shard
- No functions with multiple responsibilities (beyond complexity warning)

---

## Notes

This shard is well-structured with clear separation between:
- Components (UI layer)
- Actions (server-side mutations)
- Hooks (client-side state/logic)
- Schemas (validation)
- Types (shared type definitions)

Main concerns are around duplicated constants/types for cross-tab sync and multiple logout implementations.
