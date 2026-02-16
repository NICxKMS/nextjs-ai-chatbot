import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

import { defineConfig } from "drizzle-kit"

export default defineConfig({
	schema: "./lib/db/schema.ts",
	out: "./drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "",
	},
	verbose: true,
	strict: true,
})
