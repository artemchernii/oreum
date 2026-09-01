import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests only, and deliberately few.
 *
 * Almost every bug this project has actually hit was integration or config —
 * the proxy matcher swallowing the cron, the PKCE verifier, the framework
 * preset serving 404s. None would have been caught by a unit test, and
 * chasing coverage would mostly produce tests of React that churn.
 *
 * So this covers pure logic with real bug surface: date arithmetic, the
 * change-percent math, and the message parsing that decides when a backfill
 * stops. Anything needing a database or a browser is verified for real
 * instead — see the Verification sections in the PRs.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
