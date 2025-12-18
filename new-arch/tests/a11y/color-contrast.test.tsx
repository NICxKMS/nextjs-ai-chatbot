import { describe, expect, it } from "vitest";

// Regex pattern for hex color parsing
const HEX_PATTERN = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

// Color contrast utilities
function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.039_28
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

function getContrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): [number, number, number] {
    const result = HEX_PATTERN.exec(hex);
    return result
        ? [
              Number.parseInt(result[1] ?? "0", 16),
              Number.parseInt(result[2] ?? "0", 16),
              Number.parseInt(result[3] ?? "0", 16),
          ]
        : [0, 0, 0];
}

describe("Color Contrast", () => {
    // Design system colors
    const colors = {
        // Light theme
        light: {
            background: "#ffffff",
            foreground: "#0f172a",
            primary: "#2563eb",
            primaryForeground: "#ffffff",
            muted: "#f1f5f9",
            mutedForeground: "#64748b",
        },
        // Dark theme
        dark: {
            background: "#0f172a",
            foreground: "#f8fafc",
            primary: "#3b82f6",
            primaryForeground: "#ffffff",
            muted: "#1e293b",
            mutedForeground: "#94a3b8",
        },
    };

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    const WCAG_AA_NORMAL = 4.5;
    const WCAG_AA_LARGE = 3;

    describe("Light Theme", () => {
        it("foreground on background meets AA", () => {
            const bgL = getLuminance(...hexToRgb(colors.light.background));
            const fgL = getLuminance(...hexToRgb(colors.light.foreground));
            const ratio = getContrastRatio(bgL, fgL);
            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
        });

        it("primary foreground on primary meets AA", () => {
            const bgL = getLuminance(...hexToRgb(colors.light.primary));
            const fgL = getLuminance(
                ...hexToRgb(colors.light.primaryForeground)
            );
            const ratio = getContrastRatio(bgL, fgL);
            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        });

        it("muted foreground on muted meets AA", () => {
            const bgL = getLuminance(...hexToRgb(colors.light.muted));
            const fgL = getLuminance(...hexToRgb(colors.light.mutedForeground));
            const ratio = getContrastRatio(bgL, fgL);
            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        });
    });

    describe("Dark Theme", () => {
        it("foreground on background meets AA", () => {
            const bgL = getLuminance(...hexToRgb(colors.dark.background));
            const fgL = getLuminance(...hexToRgb(colors.dark.foreground));
            const ratio = getContrastRatio(bgL, fgL);
            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
        });

        it("primary foreground on primary meets AA", () => {
            const bgL = getLuminance(...hexToRgb(colors.dark.primary));
            const fgL = getLuminance(
                ...hexToRgb(colors.dark.primaryForeground)
            );
            const ratio = getContrastRatio(bgL, fgL);
            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        });

        it("muted foreground on muted meets AA", () => {
            const bgL = getLuminance(...hexToRgb(colors.dark.muted));
            const fgL = getLuminance(...hexToRgb(colors.dark.mutedForeground));
            const ratio = getContrastRatio(bgL, fgL);
            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        });
    });
});
