/**
 * Integration Test Setup
 * Runs before integration tests to log configuration
 *
 * @module tests/integration/setup
 */

// Load environment variables from .env files
import { config } from "dotenv";

// Load .env files in priority order
config({ path: ".env.local" }); // Priority 1
config({ path: ".env" });        // Priority 2 (won't override existing)

// Enable mock AI for integration tests
process.env.USE_MOCK_AI = "true";

import { testConfig } from "../config/test-config";

// Log which services are enabled
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🧪 Integration Test Configuration:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Real Cache:    ${testConfig.useRealCache ? "✅ Enabled" : "❌ Disabled"}`);
console.log(`  Real Database: ${testConfig.useRealDatabase ? "✅ Enabled" : "❌ Disabled"}`);
console.log(`  Real Blob:     ${testConfig.useRealBlobStorage ? "✅ Enabled" : "❌ Disabled"}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Warn if no real services enabled
if (!testConfig.useRealCache && !testConfig.useRealDatabase && !testConfig.useRealBlobStorage) {
    console.warn("⚠️  No real services enabled. Integration tests will be skipped.");
    console.warn("   Set environment variables to run:");
    console.warn("   - TEST_USE_REAL_CACHE=true  (requires CACHE_KV_REST_API_URL, CACHE_KV_REST_API_TOKEN)");
    console.warn("   - TEST_USE_REAL_DB=true     (requires DATABASE_URL)");
    console.warn("   - TEST_USE_REAL_BLOB=true   (requires blob storage config)");
    console.warn("");
}
