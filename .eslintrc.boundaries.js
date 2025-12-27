module.exports = {
	plugins: ["boundaries"],
	settings: {
		"boundaries/elements": [
			{ type: "app", pattern: "app/**" },
			{ type: "features", pattern: "features/**" },
			{ type: "shared", pattern: "shared/**" },
			{ type: "lib", pattern: "lib/**" },
			{ type: "src", pattern: "src/**" },
		],
		"boundaries/ignore": ["**/*.test.ts", "**/*.spec.ts"],
	},
	rules: {
		"boundaries/element-types": [
			2,
			{
				default: "disallow",
				rules: [
					{ from: "app", allow: ["features", "shared", "lib", "src"] },
					{ from: "features", allow: ["shared", "lib", "src"] },
					{ from: "shared", allow: ["lib", "src"] },
					{ from: "lib", allow: ["src"] },
					{ from: "src", allow: [] },
				],
			},
		],
		"boundaries/no-unknown-files": 2,
		"boundaries/no-unknown": 2,
	},
};
