# Contributing to AI Assistant v6

Thank you for your interest in contributing to AI Assistant v6! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Commit Message Format](#commit-message-format)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database (Supabase recommended)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nextjs-ai-chatbot

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Available Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Next.js dev server with HMR |
| `pnpm build` | Run migrations + production build |
| `pnpm typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `pnpm lint` | Biome lint check |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Auto-format code |
| `pnpm test:unit` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed database with sample data |

## Commit Message Format

This project follows the **Conventional Commits** specification. All commit messages must adhere to this format.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(chat): add message reactions` |
| `fix` | Bug fix | `fix(auth): resolve session timeout issue` |
| `docs` | Documentation only | `docs: update API documentation` |
| `style` | Code style (formatting, etc.) | `style: format imports` |
| `refactor` | Code refactoring | `refactor(cache): simplify invalidation logic` |
| `perf` | Performance improvement | `perf: optimize message rendering` |
| `test` | Adding or updating tests | `test(chat): add unit tests for useChat` |
| `build` | Build system or dependencies | `build: upgrade Next.js to 16.1` |
| `ci` | CI/CD configuration | `ci: add GitHub Actions workflow` |
| `chore` | Maintenance tasks | `chore: update .gitignore` |
| `revert` | Revert a previous commit | `revert: undo feat(chat): add reactions` |

### Rules

1. **Subject must start with a lowercase letter**
2. **Subject must not end with a period**
3. **Subject maximum length: 72 characters**
4. **Use imperative mood** ("add feature" not "added feature")
5. **Body and footer must have leading blank lines**

### Examples

#### Simple commit
```
feat(chat): add streaming response support
```

#### Commit with scope and body
```
fix(auth): resolve guest session expiration

Guest sessions were expiring prematurely due to incorrect JWT
validation. This fix adjusts the token expiration check to
account for clock skew.

Closes #123
```

#### Breaking change
```
feat(api)!: change chat endpoint response format

BREAKING CHANGE: The chat API now returns messages in a
different structure. See the migration guide for details.
```

## Code Style

This project uses **Biome** for linting and formatting (not ESLint/Prettier).

### Key Style Rules

- **TypeScript strict mode** — no `any` unless explicitly justified
- **Single quotes** for strings
- **Trailing commas** in multiline structures
- **No semicolons** (configured in Biome)
- **2-space indentation**

### Running Linting

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

## Pull Request Process

1. **Create a feature branch** from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Write/update tests** for new functionality

4. **Run validation** before submitting
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test:unit
   ```

5. **Commit your changes** following the commit message format

6. **Push and create a pull request**
   - Provide a clear description of changes
   - Reference any related issues
   - Ensure CI passes

7. **Address review feedback** promptly

### PR Title Format

PR titles should follow the same Conventional Commits format:
```
feat(chat): add message reactions
```

---

## Questions?

If you have questions, feel free to open an issue for discussion.
