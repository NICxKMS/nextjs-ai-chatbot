/**
 * NextAuth.js API Route Handler
 *
 * Catch-all route for NextAuth.js v5 authentication endpoints.
 * Handles all authentication flows including credentials login.
 *
 * @see https://authjs.dev/getting-started/installation
 */

import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
