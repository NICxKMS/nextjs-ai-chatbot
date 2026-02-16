/**
 * Database Migration Script
 *
 * Runs Drizzle ORM migrations against the database.
 * Called during build process to ensure database schema is up to date.
 *
 * @module lib/db/migrate
 */

import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

import { logDebug, logError, logInfo } from "@/lib/log"

// Load environment variables from .env.local
config({
	path: ".env.local",
})

/**
 * Runs database migrations
 */
const runMigrate = async () => {
	const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

	if (!databaseUrl) {
		logError("DATABASE_URL or POSTGRES_URL is not defined")
		throw new Error("DATABASE_URL or POSTGRES_URL is not defined")
	}

	logDebug("Connecting to database for migration")

	const connection = postgres(databaseUrl, { max: 1 })
	const db = drizzle(connection)

	logInfo("Running migrations...")

	const start = Date.now()
	await migrate(db, { migrationsFolder: "./drizzle/migrations" })
	const end = Date.now()

	logInfo("Migrations completed", { durationMs: end - start })

	await connection.end()
	process.exit(0)
}

runMigrate().catch((err) => {
	logError("Migration failed", err)
	process.exit(1)
})
