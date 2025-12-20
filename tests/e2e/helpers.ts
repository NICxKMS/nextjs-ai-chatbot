import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export interface UserContext {
  context: BrowserContext;
  page: Page;
}

/**
 * Generate random test user credentials
 */
export function generateRandomTestUser() {
  const timestamp = Date.now();
  const email = `test-${timestamp}@playwright.test`;
  const password = `TestPass${timestamp}!`;

  return { email, password };
}

/**
 * Create an authenticated browser context with a registered user
 */
export async function createAuthenticatedContext({
  browser,
  name,
}: {
  browser: Browser;
  name: string;
}): Promise<UserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();

  const { email, password } = generateRandomTestUser();

  // Register a new user
  await page.goto("/register");
  await page.getByPlaceholder("user@acme.com").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  // Wait for successful registration
  await expect(page).toHaveURL("/");

  return { context, page };
}

/**
 * Wait for network idle state
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Clear all cookies and local storage
 */
export async function clearBrowserState(context: BrowserContext) {
  await context.clearCookies();
}
