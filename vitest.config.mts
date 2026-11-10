import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Tests run outside Next, which is what server-only guards against; use its no-op build.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Starting an in-memory Postgres and running the migrations can pass the 10 s default on a busy machine.
    hookTimeout: 60_000,
  },
});
