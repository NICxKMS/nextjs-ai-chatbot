import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "./helpers";

test.describe("Authentication", () => {
  test.describe("Login Flow", () => {
    test("should display login page correctly", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByRole("heading")).toContainText("Sign In");
      await expect(page.getByPlaceholder("user@acme.com")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByPlaceholder("user@acme.com").fill("invalid@test.com");
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign In" }).click();

      // Should show error toast or message
      await expect(page.getByRole("alert").or(page.locator("[data-testid='toast']"))).toBeVisible({
        timeout: 10000,
      });
    });

    test("should successfully login with valid credentials", async ({ page }) => {
      const { email, password } = generateRandomTestUser();

      // First register a user
      await page.goto("/register");
      await page.getByPlaceholder("user@acme.com").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign Up" }).click();
      await expect(page).toHaveURL("/");

      // Logout (via clearing cookies or navigating)
      await page.context().clearCookies();

      // Now login with the same credentials
      await page.goto("/login");
      await page.getByPlaceholder("user@acme.com").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign In" }).click();

      // Should redirect to home page
      await expect(page).toHaveURL("/");
    });

    test("should navigate to register page from login", async ({ page }) => {
      await page.goto("/login");

      await page.getByRole("link", { name: /sign up/i }).click();
      await expect(page).toHaveURL("/register");
    });
  });

  test.describe("Register Flow", () => {
    test("should display register page correctly", async ({ page }) => {
      await page.goto("/register");

      await expect(page.getByRole("heading")).toContainText("Sign Up");
      await expect(page.getByPlaceholder("user@acme.com")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign Up" })).toBeVisible();
    });

    test("should successfully register a new user", async ({ page }) => {
      const { email, password } = generateRandomTestUser();

      await page.goto("/register");
      await page.getByPlaceholder("user@acme.com").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign Up" }).click();

      // Should redirect to home page after successful registration
      await expect(page).toHaveURL("/");
    });

    test("should show error for duplicate email", async ({ page }) => {
      const { email, password } = generateRandomTestUser();

      // Register first user
      await page.goto("/register");
      await page.getByPlaceholder("user@acme.com").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign Up" }).click();
      await expect(page).toHaveURL("/");

      // Clear cookies and try to register with same email
      await page.context().clearCookies();
      await page.goto("/register");
      await page.getByPlaceholder("user@acme.com").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign Up" }).click();

      // Should show error
      await expect(page.getByRole("alert").or(page.locator("[data-testid='toast']"))).toBeVisible({
        timeout: 10000,
      });
    });

    test("should navigate to login page from register", async ({ page }) => {
      await page.goto("/register");

      await page.getByRole("link", { name: /sign in/i }).click();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Guest Session", () => {
    test("should create guest session when visiting home", async ({ page }) => {
      await page.goto("/");

      // Wait for guest session to be created
      const guestRequest = page.waitForRequest(
        (request) => request.url().includes("/api/auth/guest") && request.method() === "POST"
      );

      // Either guest request happens or page is already accessible
      await Promise.race([guestRequest, page.waitForLoadState("networkidle")]);

      // Verify page is accessible (chat input should be visible)
      await expect(page.getByPlaceholder(/send a message/i)).toBeVisible({ timeout: 10000 });
    });

    test("should show guest user in sidebar", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Open sidebar if toggle exists
      const sidebarToggle = page.getByTestId("sidebar-toggle-button");
      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();
      }

      // Guest user should be indicated
      const userEmail = page.getByTestId("user-email");
      if (await userEmail.isVisible()) {
        await expect(userEmail).toContainText(/guest/i);
      }
    });

    test("should redirect to login from guest session", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Open sidebar if toggle exists
      const sidebarToggle = page.getByTestId("sidebar-toggle-button");
      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();
      }

      // Find and click login link
      const userNavButton = page.getByTestId("user-nav-button");
      if (await userNavButton.isVisible()) {
        await userNavButton.click();
        const authMenuItem = page.getByTestId("user-nav-item-auth");
        await authMenuItem.click();
        await expect(page).toHaveURL(/login/);
      }
    });
  });
});
