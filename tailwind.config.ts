import type { Config } from "tailwindcss"

const config: Config = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./features/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./lib/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-geist-sans)"],
				mono: ["var(--font-geist-mono)"],
			},
			animation: {
				accordion: "accordion 200ms ease-out",
				spin: "spin 1s linear infinite",
				pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
			},
			keyframes: {
				accordion: {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
			},
		},
	},
	plugins: [],
}

export default config
