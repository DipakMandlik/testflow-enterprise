import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceFile = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures/evidence.txt",
);

const PASSWORD = "pibythree@2026";

async function login(page: Page, employeeId: string) {
  // Navigating to the same URL Playwright is already on can hang this
  // Chromium build, so only issue a real navigation the first time.
  if (!page.url().endsWith("/")) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // The app is client-rendered; wait for hydration so the form's submit
    // handler is attached before interacting.
    await page.waitForLoadState("networkidle");
  }
  await page.getByLabel("Employee ID").fill(employeeId);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/otp$/);
  // The OTP slots auto-submit once all six digits are entered; retry the
  // fill if a slot drops a keystroke rather than depend on precise timing.
  await expect(async () => {
    await page.getByLabel("Verification code").fill("123456");
    await expect(page).toHaveURL(/\/(dashboard|verify-location)$/, { timeout: 3_000 });
  }).toPass({ timeout: 20_000 });

  // A tester with no verified session for this login is gated to
  // verify-location -> verify-station before reaching the dashboard — the
  // real navigation-guard enforced in AppShell, not a decorative redirect.
  if (page.url().includes("/verify-location")) {
    const comboboxes = page.getByRole("combobox");
    await comboboxes.nth(1).click();
    await page.getByRole("option", { name: "Building A — EQT Line" }).click();
    await page.getByRole("button", { name: "Verify location" }).click();
    await expect(page).toHaveURL(/\/verify-station$/);

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "EQT-01 — EQT Station 1" }).click();
    await page.getByRole("button", { name: "Verify station" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
}

async function logout(page: Page) {
  await page.getByRole("button", { name: /Priya Sharma|Rajesh Kumar|Anita Desai/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
}

async function waitForSave(page: Page) {
  await expect(page.getByRole("status").first()).toHaveText("Saved to this device", {
    timeout: 5_000,
  });
}

async function passCurrentCheck(page: Page, actual: string, opts: { evidence?: boolean } = {}) {
  await page.getByRole("button", { name: "Pass", exact: true }).click();
  await page.getByLabel("Actual result").fill(actual);
  if (opts.evidence) {
    await page.locator('input[type="file"]').setInputFiles(evidenceFile);
    await expect(page.getByText("evidence.txt").first()).toBeVisible();
  }
  await waitForSave(page);
}

async function nextRequiredCheck(page: Page) {
  await page.getByRole("button", { name: /Next required check/ }).click();
}

test.describe("Pibythree Quality Hub — critical workflow", () => {
  test("tester fails a measurement check, quality checker requests a retest, tester retests, quality checker approves, manager sees it completed", async ({
    page,
  }) => {
    // ---- Tester: login -> OTP -> verify location & station -> dashboard ----
    await login(page, "TE-1001");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // ---- My Tests -> open the assigned unit, start the execution ----
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "My Tests" })
      .click();
    await expect(page).toHaveURL(/\/my-tests$/);
    const assignedRow = page.locator("tr", { hasText: "USN-OJAS-000451" });
    await assignedRow.getByRole("link", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/executions\/exec-1$/);
    await page.getByRole("button", { name: "Start execution" }).click();

    // ---- Work through every mandatory check via "Next required check" ----
    await expect(page.getByRole("heading", { name: /CHK-001/ })).toBeVisible();
    await passCurrentCheck(page, "No visible transport damage.", { evidence: true });
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /CHK-002/ })).toBeVisible();
    await passCurrentCheck(page, "USN label matches assignment record.");
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /ACT-001/ })).toBeVisible();
    await passCurrentCheck(page, "Boot logo appeared within spec.");
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /ACT-002/ })).toBeVisible();
    await passCurrentCheck(page, "Activation status reported ACTIVATED.");
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /ACO-001/ })).toBeVisible();
    await passCurrentCheck(page, "Both channels audible and clear.");
    await nextRequiredCheck(page);

    // ---- ACO-002: measurement out of range, auto-computed as failed ----
    await expect(page.getByRole("heading", { name: /ACO-002/ })).toBeVisible();
    await page.getByLabel(/Measured value/).fill("95");
    await page.getByRole("button", { name: "Record measurement" }).click();
    await expect(page.getByLabel("Actual result")).toHaveValue("95 dB");

    await page.getByLabel("Failure category").click();
    await page.getByRole("option", { name: "Acoustic" }).click();
    await page.getByLabel("Severity").click();
    await page.getByRole("option", { name: "medium", exact: true }).click();
    await page
      .getByLabel(/Failure description/)
      .fill("Peak output measured well above the 90 dB acceptance limit during the test.");
    await waitForSave(page);
    await page.locator('input[type="file"]').setInputFiles(evidenceFile);
    await expect(page.getByText("evidence.txt").first()).toBeVisible();
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /CAM-001/ })).toBeVisible();
    await passCurrentCheck(page, "Sharp focus, accurate colour reproduction.", { evidence: true });
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /CAM-002/ })).toBeVisible();
    await passCurrentCheck(page, "Live preview rendered within spec.");
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /CAM-003/ })).toBeVisible();
    await passCurrentCheck(page, "Focus lock achieved within spec on both targets.");
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /BAT-001/ })).toBeVisible();
    await passCurrentCheck(page, "Charging indicator activated within spec.");
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /BAT-002/ })).toBeVisible();
    await page.getByLabel(/Measured value/).fill("4.0");
    await page.getByRole("button", { name: "Record measurement" }).click();
    await expect(page.getByLabel("Actual result")).toHaveValue("4 V");
    await nextRequiredCheck(page);

    await expect(page.getByRole("heading", { name: /CON-001/ })).toBeVisible();
    await passCurrentCheck(page, "Associated with the reference access point within spec.");

    // No mandatory checks remain — the jump button disappears.
    await expect(page.getByRole("button", { name: /Next required check/ })).toHaveCount(0);

    // ---- Submit for review ----
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(
      page.getByRole("dialog").getByText(/has no recorded outcome|requires/),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Confirm submission" }).click();
    await expect(page).toHaveURL(/\/my-tests$/);

    await logout(page);

    // ---- Quality Checker: inspect the failure, see the AI-assisted insight,
    // and request a retest scoped to just the failed check ----
    await login(page, "TE-2001");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Review Queue" })
      .click();
    await expect(page).toHaveURL(/\/reviews$/);
    const pendingRow = page.locator("li", { hasText: "EX-1041" });
    await pendingRow.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(/\/reviews\/exec-1$/);

    await expect(page.getByText("95 dB")).toBeVisible();
    await expect(page.getByText("AI-assisted recommendation")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Flag ACO-002 for retest" })).toBeChecked();

    await page
      .getByPlaceholder(/Review comment/)
      .fill(
        "Speaker output exceeds the acceptance range — please re-measure with the reference SPL meter.",
      );
    await page.getByRole("button", { name: "Request retest" }).click();
    await expect(page).toHaveURL(/\/reviews$/);

    await logout(page);

    // ---- Tester: only the flagged check is editable during the retest round ----
    await login(page, "TE-1001");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "My Tests" })
      .click();
    const retestRow = page.locator("tr", { hasText: "USN-OJAS-000451" });
    await retestRow.getByRole("link", { name: "Resume Retest" }).click();
    await expect(page).toHaveURL(/\/executions\/exec-1$/);
    await page.getByRole("button", { name: "Resume for retest" }).click();

    // The retest round auto-selects the flagged check.
    await expect(page.getByRole("heading", { name: /ACO-002/ })).toBeVisible();
    await page.getByLabel(/Measured value/).fill("75");
    await page.getByRole("button", { name: "Record measurement" }).click();
    await expect(page.getByLabel("Actual result")).toHaveValue("75 dB");

    // A resolved check from the first round is now locked for this round.
    await page.getByRole("button", { name: /CHK-001/ }).click();
    await expect(page.getByText("This check is locked for this retest round")).toBeVisible();

    await page.getByRole("button", { name: "Submit for review" }).click();
    await page.getByRole("button", { name: "Confirm submission" }).click();
    await expect(page).toHaveURL(/\/my-tests$/);

    await logout(page);

    // ---- Quality Checker: approve the retest, completing the execution ----
    await login(page, "TE-2001");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Review Queue" })
      .click();
    const secondReviewRow = page.locator("li", { hasText: "EX-1041" });
    await secondReviewRow.getByRole("link", { name: "Review" }).click();
    await expect(page.getByText("Retest history")).toBeVisible();
    await page
      .getByPlaceholder(/Review comment/)
      .fill("Retest confirms output within range. Approved.");
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page).toHaveURL(/\/reviews$/);

    await logout(page);

    // ---- Manager: the review queue reflects the completed execution ----
    await login(page, "TE-3001");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Review Queue" })
      .click();
    const decidedRow = page.locator("li", { hasText: "EX-1041" });
    await expect(decidedRow.getByText("Completed", { exact: true })).toBeVisible();
  });
});
