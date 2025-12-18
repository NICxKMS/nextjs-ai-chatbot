/**
 * Coverage configuration for CI pipelines
 */
export const coverageConfig = {
    // Minimum thresholds for CI
    thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
    },

    // Files to include in coverage
    include: [
        "lib/**/*.ts",
        "components/**/*.tsx",
        "hooks/**/*.ts",
        "app/**/*.ts",
        "app/**/*.tsx",
    ],

    // Files to exclude from coverage
    exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
        "**/mocks/**",
        "**/__mocks__/**",
    ],

    // Coverage reporters
    reporters: {
        local: ["text", "html"],
        ci: ["text", "text-summary", "lcov", "json"],
    },
};

/**
 * Check if coverage meets thresholds
 */
export function checkCoverageThresholds(results: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
}): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    if (results.branches < coverageConfig.thresholds.branches) {
        failures.push(
            `Branches: ${results.branches}% < ${coverageConfig.thresholds.branches}%`
        );
    }
    if (results.functions < coverageConfig.thresholds.functions) {
        failures.push(
            `Functions: ${results.functions}% < ${coverageConfig.thresholds.functions}%`
        );
    }
    if (results.lines < coverageConfig.thresholds.lines) {
        failures.push(
            `Lines: ${results.lines}% < ${coverageConfig.thresholds.lines}%`
        );
    }
    if (results.statements < coverageConfig.thresholds.statements) {
        failures.push(
            `Statements: ${results.statements}% < ${coverageConfig.thresholds.statements}%`
        );
    }

    return {
        passed: failures.length === 0,
        failures,
    };
}
