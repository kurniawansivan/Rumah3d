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
    setupFiles: ["./src/test/setup.ts"],
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
        // Boilerplate with no branching logic of its own — exercised
        // implicitly by every other test that renders through them, not
        // worth a dedicated test. Everything with real logic (forms, the
        // BFF route, the store, the viewer) is still held to the floor.
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/app/providers.tsx",
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
