import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { logError, logInfo } from "@/lib/log";

config({
	path: ".env.local",
});

const runMigrate = async () => {
	if (!process.env.POSTGRES_URL) {
		throw new Error("POSTGRES_URL is not defined");
	}

	const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
	const db = drizzle(connection);

	logInfo("Running migrations");

	const start = Date.now();
	await migrate(db, { migrationsFolder: "./lib/db/migrations" });
	const end = Date.now();

	logInfo("Migrations completed", { durationMs: end - start });
	process.exit(0);
};

runMigrate().catch((err) => {
	logError("Migration failed", err);
	process.exit(1);
});
