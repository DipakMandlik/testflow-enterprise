import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// Some sandboxes pre-install a Chromium build pinned to a different
// Playwright version than this project depends on, at a fixed path outside
// Playwright's own cache. Use it only when present (e.g. local dev
// containers) — everywhere else, including CI, fall back to the browser
// Playwright installs itself (`playwright install`) at its default location.
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const sandboxChromiumPath = existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev -- --port 4173 --strictPort --host 127.0.0.1",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(sandboxChromiumPath ? { launchOptions: { executablePath: sandboxChromiumPath } } : {}),
      },
    },
  ],
});
