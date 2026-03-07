import { resolve } from "node:path"

import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"

const realDbUrl =
	process.env.REAL_DB_TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || ""
const migrationsFolder = resolve(process.cwd(), "lib/db/migrations")

export const REAL_DB_TESTS_ENABLED = process.env.REAL_DB_TESTS === "1"
export const hasRealDbTestConfig = REAL_DB_TESTS_ENABLED && realDbUrl.length > 0

if (hasRealDbTestConfig) {
	process.env.DATABASE_URL = realDbUrl
}

function createDbClient(connection: ReturnType<typeof postgres>) {
	return drizzle(connection, { schema })
}

type RealDbHarness = {
	connection: ReturnType<typeof postgres>
	db: ReturnType<typeof createDbClient>
}

let harnessPromise: Promise<RealDbHarness> | null = null

export function getRealDbSkipReason(): string | null {
	if (!REAL_DB_TESTS_ENABLED) {
		return "REAL_DB_TESTS=1 is not set"
	}

	if (!realDbUrl) {
		return "REAL_DB_TEST_DATABASE_URL or DATABASE_URL is not set"
	}

	return null
}

export async function getRealDbHarness(): Promise<RealDbHarness> {
	const skipReason = getRealDbSkipReason()
	if (skipReason) {
		throw new Error(`Real DB integration tests are disabled: ${skipReason}`)
	}

	if (!harnessPromise) {
		harnessPromise = (async () => {
			const connection = postgres(realDbUrl, {
				max: 1,
				prepare: false,
				connect_timeout: 5,
			})
			const db = createDbClient(connection)

			await connection`select 1`
			await migrate(db, { migrationsFolder })

			return { connection, db }
		})()
	}

	return harnessPromise
}

export async function closeRealDbHarness() {
	if (!harnessPromise) {
		return
	}

	const { connection } = await harnessPromise
	await connection.end()
	if (process.env.REAL_DB_TEST_DATABASE_URL?.trim()) {
		delete process.env.DATABASE_URL
	}

	harnessPromise = null
}
