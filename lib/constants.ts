export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
	process.env.PLAYWRIGHT_TEST_BASE_URL ||
		process.env.PLAYWRIGHT ||
		process.env.CI_PLAYWRIGHT
);

// Matches guest IDs in format "guest:{uuid}" as created by session.ts
export const guestRegex =
	/^guest:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
