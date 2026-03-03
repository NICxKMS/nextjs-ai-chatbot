import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

/**
 * Programmatic migration runner.
 *
 * Creates a dedicated single-connection client (max: 1) rather than reusing
 * the shared pool from client.ts. This ensures sequential migration execution
 * and clean process exit after completion.
 *
 * Usage: `tsx lib/db/migrate.ts`
 */
async function runMigrations() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is not set")
	}

	const connection = postgres(process.env.DATABASE_URL, { max: 1 })
	const db = drizzle(connection)

	console.info("[migrate] Running migrations...")

	const start = Date.now()
	await migrate(db, { migrationsFolder: "./lib/db/migrations" })
	const elapsed = Date.now() - start

	console.info(`[migrate] Migrations completed in ${elapsed}ms`)

	await connection.end()
	process.exit(0)
}

runMigrations().catch((error: unknown) => {
	console.error("[migrate] Migration failed:", error)
	process.exit(1)
})
