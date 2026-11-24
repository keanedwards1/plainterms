import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit and component tests for the Next.js app (src/**). Browser flows live in
// e2e/ (Playwright). The Lambdas keep their own node:test suite.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
  },
});
