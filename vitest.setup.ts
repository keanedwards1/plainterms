import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library only auto-cleans when Vitest globals are on; they're off here.
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});
