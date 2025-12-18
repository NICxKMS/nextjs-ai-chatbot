import { configureAxe, toHaveNoViolations } from "jest-axe";
import { expect } from "vitest";

// Extend Vitest expect with axe matchers
expect.extend(toHaveNoViolations);

// Configure axe with rules
export const axe = configureAxe({
    rules: {
        // Disable rules that may conflict with app design
        "color-contrast": { enabled: true },
        "document-title": { enabled: true },
        "html-has-lang": { enabled: true },
        "landmark-one-main": { enabled: true },
        region: { enabled: true },
    },
});

// Re-export using export from syntax
export { toHaveNoViolations } from "jest-axe";
