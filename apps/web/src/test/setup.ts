import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL's own auto-cleanup only registers when `afterEach` is a vitest
// global (test.globals), which this project doesn't enable — so register
// it explicitly instead of leaving DOM/state to leak between test files.
afterEach(() => {
  cleanup();
});
