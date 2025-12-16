# Project Context

**Last Updated**: 2024-12-16

## Project Overview

| Attribute        | Value                             |
| ---------------- | --------------------------------- |
| **Project Type** | Next.js 16 AI Chat Application    |
| **Framework**    | Next.js 16 (App Router)           |
| **UI Library**   | React 19                          |
| **Build Tool**   | Turbopack                         |
| **Deployment**   | Vercel                            |
| **Database**     | Drizzle ORM (PostgreSQL/Supabase) |
| **Styling**      | Tailwind CSS                      |
| **Testing**      | Playwright (E2E)                  |

## Tech Stack Details

### Frontend

- Next.js 16 with App Router
- React 19 with Server Components
- Tailwind CSS for styling
- Radix UI primitives (via shadcn/ui)
- CodeMirror for code editing

### Backend

- Next.js API Routes
- Vercel AI SDK for streaming
- Drizzle ORM for database
- NextAuth for authentication

### Infrastructure

- Vercel for hosting
- Supabase for database
- Turbopack for development builds

## Current State

| Aspect             | Status                             |
| ------------------ | ---------------------------------- |
| **Audit**          | ✅ Complete                        |
| **Implementation** | 🔴 Starting                        |
| **Active Spec**    | `implementation-plan.md`           |
| **Current Phase**  | Phase 0 (Critical Hydration Fixes) |

## Issue Summary

| Priority  | Count  |
| --------- | ------ |
| CRITICAL  | 6      |
| HIGH      | 16     |
| MEDIUM    | 38     |
| LOW       | 16     |
| **Total** | **76** |

## Key Technical Concerns

1. **Hydration Mismatches**: Mobile detection using `window` in useState initializers
2. **Performance**: Messages and sidebar need virtualization for large datasets
3. **Bundle Size**: Multiple areas need code splitting and lazy loading
4. **State Management**: Several components have complex state that could be simplified

## Active Documents

| Document                                        | Purpose                               |
| ----------------------------------------------- | ------------------------------------- |
| `.ouroboros/specs/implementation-plan.md`       | Master implementation plan (37 tasks) |
| `.ouroboros/specs/final-validation.md`          | Validated coverage report             |
| `.ouroboros/context/implementation-progress.md` | Task completion tracker               |
| `.ouroboros/exports/github-issues.md`           | GitHub issue templates                |

## Repository Structure

```
nextjs-ai-chatbot/
├── app/           # Next.js App Router pages
├── components/    # React components (72 client, 10 server)
├── lib/           # Utilities, API, database
├── hooks/         # Custom React hooks
├── artifacts/     # Artifact system (code, image, sheet, text)
├── tests/         # Playwright E2E tests
└── docs/          # Project documentation
```

## Notes

- All Request APIs are properly awaited (Next.js 16 compatible)
- Authentication uses NextAuth with custom providers
- Real-time streaming via Vercel AI SDK
- Artifact system supports code, images, sheets, and text documents
