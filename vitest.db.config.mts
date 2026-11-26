import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests that run against a real database (DATABASE_URL). Run after `pnpm db:migrate && pnpm db:seed`: `pnpm test:db`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // server-only throws outside a React Server bundle; these tests call the server code directly.
      "server-only": path.resolve(__dirname, "tests/db/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    setupFiles: ["dotenv/config"],
    fileParallelism: false,
    testTimeout: 60_000,
  },
});
