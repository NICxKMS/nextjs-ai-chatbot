/**
 * V5 Architecture Structure Validator
 *
 * Validates that the project directory structure matches
 * the v5 OPTIMAL architecture specification.
 *
 * Run: pnpm validate:structure
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

const REQUIRED_DIRECTORIES = [
	"src/types",
	"src/errors",
	"src/services",
	"shared/components/ai",
	"shared/hooks",
	"shared/constants",
	"lib/cache",
	"lib/data/repositories",
];

const REQUIRED_BARREL_EXPORTS = [
	"src/types/index.ts",
	"src/errors/index.ts",
	"src/services/index.ts",
	"shared/components/index.ts",
	"shared/hooks/index.ts",
	"shared/constants/index.ts",
	"lib/cache/index.ts",
	"lib/data/index.ts",
];

const REQUIRED_CONFIG_FILES = ["tsconfig.json", ".eslintrc.boundaries.js"];

function validateStructure(): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const rootDir = process.cwd();

	console.log("🔍 Validating v5 architecture structure...\n");

	// Check required directories
	console.log("📁 Checking directories...");
	for (const dir of REQUIRED_DIRECTORIES) {
		const fullPath = path.join(rootDir, dir);
		if (!fs.existsSync(fullPath)) {
			errors.push(`Missing directory: ${dir}`);
		} else {
			console.log(`  ✅ ${dir}`);
		}
	}

	// Check barrel exports
	console.log("\n📦 Checking barrel exports...");
	for (const file of REQUIRED_BARREL_EXPORTS) {
		const fullPath = path.join(rootDir, file);
		if (!fs.existsSync(fullPath)) {
			errors.push(`Missing barrel export: ${file}`);
		} else {
			console.log(`  ✅ ${file}`);
		}
	}

	// Check config files
	console.log("\n⚙️ Checking config files...");
	for (const file of REQUIRED_CONFIG_FILES) {
		const fullPath = path.join(rootDir, file);
		if (!fs.existsSync(fullPath)) {
			errors.push(`Missing config file: ${file}`);
		} else {
			console.log(`  ✅ ${file}`);
		}
	}

	// Check tsconfig paths
	console.log("\n🔗 Checking TypeScript path aliases...");
	const tsconfigPath = path.join(rootDir, "tsconfig.json");
	if (fs.existsSync(tsconfigPath)) {
		try {
			const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
			const paths = tsconfig.compilerOptions?.paths || {};

			const requiredPaths = [
				"@/src/*",
				"@/shared/*",
				"@/lib/*",
				"@/features/*",
			];
			for (const reqPath of requiredPaths) {
				if (paths[reqPath]) {
					console.log(`  ✅ ${reqPath}`);
				} else {
					warnings.push(`Missing path alias: ${reqPath}`);
				}
			}
		} catch {
			errors.push("Failed to parse tsconfig.json");
		}
	}

	// Print summary
	console.log("\n" + "─".repeat(50));

	if (errors.length === 0 && warnings.length === 0) {
		console.log("✅ All validations passed!\n");
	} else {
		if (errors.length > 0) {
			console.log(`\n❌ Errors (${errors.length}):`);
			errors.forEach((e) => console.log(`   - ${e}`));
		}
		if (warnings.length > 0) {
			console.log(`\n⚠️ Warnings (${warnings.length}):`);
			warnings.forEach((w) => console.log(`   - ${w}`));
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

// Run validation
const result = validateStructure();
process.exit(result.valid ? 0 : 1);
