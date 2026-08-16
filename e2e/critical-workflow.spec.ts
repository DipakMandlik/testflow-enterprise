import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceFile = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/evidence.txt",
);

async function login(page: Page, employeeId: string) {
  // Navigating to the same URL Playwright is already on can hang this
  // Chromium build (see logout(), which always lands back on "/"), so
  // only issue a real navigation the first time.
  if (!page.url().endsWith("/")) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // The app is client-rendered; wait for hydration so the form's submit
    // handler is attached before interacting (otherwise the click falls
    // through to a native form GET submission).
    await page.waitForLoadState("networkidle");
  }
  await page.getByLabel("Employee ID").fill(employeeId);
  await page.getByLabel("Password").fill("tata@2026");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/otp$/);
  // The OTP slots auto-submit once all six digits are entered; retry the
  // fill if a slot drops a keystroke rather than depend on precise timing.
  await expect(async () => {
    await page.getByLabel("Verification code").fill("123456");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}

async function logout(page: Page) {
  await page
    .getByRole("button", { name: /Priya Sharma|Rajesh Kumar|Anita Desai|Admin User/ })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Tata Electronics TMS — critical workflow", () => {
  test("tester executes and submits, reviewer sends back, tester revises, reviewer approves, manager sees it", async ({
    page,
  }) => {
    // ---- Tester: login -> OTP -> dashboard ----
    await login(page, "TE-1001");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // ---- My Tests -> open TC-AUTH-001, start execution ----
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "My Tests" })
      .click();
    await expect(page).toHaveURL(/\/my-tests$/);
    await page.getByRole("link", { name: "TC-AUTH-001" }).click();
    await expect(page).toHaveURL(/\/tests\/tc-auth-001$/);
    await page.getByRole("link", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/\/executions\/exec-1$/);
    await page.getByRole("button", { name: "Start execution" }).click();

    // ---- Execute all 7 steps; step 3 fails and requires evidence ----
    const stepCount = 7;
    for (let i = 1; i <= stepCount; i++) {
      if (i > 1) await page.getByRole("button", { name: "Save & continue" }).click();
      await expect(page.getByRole("heading", { name: `Step ${i} of ${stepCount}` })).toBeVisible();

      if (i === 3) {
        await page.getByRole("button", { name: "failed", exact: true }).click();
        await page
          .getByLabel("Actual result")
          .fill("OTP rejected as invalid, matching the expected error copy.");
        await page
          .getByLabel(/Failure description/)
          .fill("Confirmed the invalid-OTP path shows the correct error.");
        await page.locator('input[type="file"]').setInputFiles(evidenceFile);
        await expect(page.getByText("evidence.txt").first()).toBeVisible();
      } else {
        await page.getByRole("button", { name: "passed", exact: true }).click();
        await page.getByLabel("Actual result").fill(`Step ${i} behaved exactly as specified.`);
      }
    }

    // ---- Submit for review ----
    await page.getByRole("button", { name: "Submit for review" }).click();
    await page.getByRole("button", { name: "Confirm submission" }).click();
    await expect(page).toHaveURL(/\/my-tests$/);

    await logout(page);

    // ---- Reviewer: pending review -> inspect -> send back ----
    await login(page, "TE-2001");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Review Queue" })
      .click();
    await expect(page).toHaveURL(/\/reviews$/);
    await page.getByRole("link", { name: "Review", exact: true }).first().click();
    await expect(page.getByText("OTP rejected as invalid")).toBeVisible();
    await page
      .getByPlaceholder("Review comment (required when requesting a revision)")
      .fill(
        "Please double check the invalid-OTP error copy against the latest spec before we accept this.",
      );
    await page.getByRole("button", { name: "Send back for revision" }).click();
    await expect(page).toHaveURL(/\/reviews$/);

    await logout(page);

    // ---- Tester: revision required -> fix -> resubmit ----
    await login(page, "TE-1001");
    await expect(page.getByText("Revision Required").first()).toBeVisible();
    await page.getByRole("link", { name: "Revise" }).first().click();
    await expect(page).toHaveURL(/\/executions\/exec-1$/);
    await page.getByRole("button", { name: "Resume for revision" }).click();

    // Jump to the previously-failed step and confirm it's still there.
    await page.getByRole("button", { name: /^3/ }).click();
    await expect(page.getByLabel("Actual result")).toHaveValue(/OTP rejected as invalid/);
    await page.getByRole("button", { name: "Submit for review" }).click();
    await page.getByRole("button", { name: "Confirm submission" }).click();

    await logout(page);

    // ---- Reviewer: approve the resubmission ----
    await login(page, "TE-2001");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Review Queue" })
      .click();
    await page.getByRole("link", { name: "Review", exact: true }).first().click();
    await page
      .getByPlaceholder("Review comment (required when requesting a revision)")
      .fill("Confirmed. Approved.");
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page).toHaveURL(/\/reviews$/);

    await logout(page);

    // ---- Manager: metrics reflect the completed execution ----
    await login(page, "TE-3001");
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();
    const completedMetric = page.locator("text=Completed").locator("..").getByText(/^\d+$/);
    await expect(completedMetric.first()).toBeVisible();
  });
});
