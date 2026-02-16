# Database Migrations & Seeding

This directory contains Drizzle ORM migration files and seed scripts for the v6 database schema.

## Directory Structure

```
drizzle/
├── migrations/           # Auto-generated migration files
│   ├── 0000_*.sql       # Initial schema migration
│   └── meta/            # Migration metadata
├── seed.ts              # Development seed script
└── README.md            # This file
```

## Migration Commands

### Generate Migrations

After modifying the schema in `lib/db/schema.ts`, generate a new migration:

```bash
pnpm db:generate
```

This command:
- Reads the schema from `lib/db/schema.ts`
- Compares with the current migration state
- Generates a new SQL migration file in `drizzle/migrations/`

**⚠️ IMPORTANT**: Do NOT create manual migration SQL files. Drizzle ORM auto-generates them from the schema file.

### Run Migrations

Apply pending migrations to your database:

```bash
pnpm db:migrate
```

This executes the migration script at `lib/db/migrate.ts`.

### Other Database Commands

| Command | Description |
|---------|-------------|
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm db:push` | Push schema directly to database (no migration) |
| `pnpm db:pull` | Pull schema from database to code |
| `pnpm db:check` | Check migration status |
| `pnpm db:up` | Apply pending migrations |

## Seeding

### Run Seed Script

Populate the database with sample data for development:

```bash
pnpm db:seed
```

### Seed Data Contents

The seed script creates:

- **2 Test Users**
  - `admin@test.com`
  - `user@test.com`

- **5 Sample Chats** with messages
  - "Getting Started with AI" (public)
  - "Code Review Discussion" (private)
  - "Project Planning" (private)
  - "Learning TypeScript" (public)
  - "API Design Questions" (private)

- **3 Sample Artifacts**
  - Text artifact (README)
  - Code artifact (React component)
  - Image artifact (diagram reference)

### Seed Behavior

- The seed script checks for existing data before inserting
- If users already exist, the seed operation is skipped
- To re-seed, manually clear the database first

## Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `User` | User accounts with email/password authentication |
| `Chat` | Chat conversations with visibility settings |
| `Message_v2` | Messages within chats with structured parts |
| `Vote_v2` | Message votes (upvotes/downvotes) |
| `Artifact` | Versioned content (renamed from Document in v5) |
| `Suggestion` | AI-generated artifact modification suggestions |

### Key Changes from v5 to v6

1. **Document → Artifact**: The `Document` table has been renamed to `Artifact`
2. **Enum renamed**: `document_kind` enum is now `artifact_kind`
3. **Foreign keys updated**: Suggestion table now references `artifact_id` instead of `document_id`

### Indexes

The schema includes the following indexes for performance:

- `chat_user_created_idx` - User's chats sorted by creation date
- `message_chat_created_idx` - Messages by chat, sorted by date
- `message_chat_created_role_idx` - Composite index for rate limiting queries
- `artifact_user_idx` - Artifacts by user
- `artifact_chat_idx` - Artifacts by chat
- `suggestion_artifact_idx` - Suggestions by artifact

## Environment Variables

Ensure these environment variables are set:

```env
DATABASE_URL=postgresql://user:password@host:port/database
# or
POSTGRES_URL=postgresql://user:password@host:port/database
```

## Migration Order

When setting up a fresh database:

1. Ensure environment variables are configured
2. Run `pnpm db:migrate` to create tables
3. Run `pnpm db:seed` to populate sample data (optional)

## Troubleshooting

### Migration Conflicts

If you encounter migration conflicts:

1. Check the migration files in `drizzle/migrations/`
2. Ensure the database is in sync with the expected state
3. Use `pnpm db:push` for development (bypasses migrations)

### Connection Issues

If migrations fail to connect:

1. Verify `DATABASE_URL` or `POSTGRES_URL` is set correctly
2. Ensure the database exists and is accessible
3. Check network connectivity and firewall rules

### Schema Drift

If the database schema differs from the code:

1. Use `pnpm db:pull` to introspect the database
2. Compare with `lib/db/schema.ts`
3. Generate a migration to reconcile differences
