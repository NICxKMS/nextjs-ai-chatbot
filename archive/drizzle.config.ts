import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
    path: ".env.local",
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL environment variable is required. " +
            "Please set it in your .env.local file."
    );
}

export default defineConfig({
    schema: "./lib/db/schema.ts",
    out: "./lib/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: databaseUrl,
    },
});
