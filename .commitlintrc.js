/**
 * Commitlint Configuration
 * Enforces Conventional Commits specification
 * @see https://conventionalcommits.org/
 */

/** @type {import('@commitlint/types').UserConfig} */
const config = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// Type must be one of the allowed types
		"type-enum": [
			2,
			"always",
			[
				"feat", // New feature
				"fix", // Bug fix
				"docs", // Documentation only
				"style", // Code style (formatting, semicolons, etc.)
				"refactor", // Code refactoring
				"perf", // Performance improvement
				"test", // Adding or updating tests
				"build", // Build system or dependencies
				"ci", // CI/CD configuration
				"chore", // Maintenance tasks
				"revert", // Revert a previous commit
			],
		],
		// Subject must not end with a period
		"subject-full-stop": [2, "never", "."],
		// Subject must start with a lowercase letter
		"subject-case": [2, "always", "lower-case"],
		// Subject must not be empty
		"subject-empty": [2, "never"],
		// Type must not be empty
		"type-empty": [2, "never"],
		// Subject must have a maximum length of 72 characters
		"header-max-length": [2, "always", 72],
		// Body must have a leading blank line
		"body-leading-blank": [2, "always"],
		// Footer must have a leading blank line
		"footer-leading-blank": [2, "always"],
	},
}

module.exports = config
