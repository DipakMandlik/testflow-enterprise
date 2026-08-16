import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Deliberately independent of vite.config.ts: that config pulls in the
// TanStack Start / nitro build plugins, which add unnecessary weight (and
// build-only side effects) to what is otherwise a plain unit-test run over
// framework-agnostic domain logic.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
