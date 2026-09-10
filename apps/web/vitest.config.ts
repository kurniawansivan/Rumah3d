import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors the "@/*" -> "./src/*" path alias in tsconfig.json.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Playwright E2E specs live under ./e2e and run via playwright.config.ts,
    // not Vitest — excluded here so the two runners never pick up each
    // other's test files.
    exclude: ["**/node_modules/**", "**/.next/**", "**/e2e/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/e2e/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
      // Matches the repo-wide coverage floor in CLAUDE.md §9 (ADR-0010).
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
