import path from "node:path";

import { defineConfig } from "vitest/config";

// Load .env so live-database tests find DATABASE_URL (the same way prisma.config.ts does).
import "dotenv/config";

export default defineConfig({
  test: {
    environment: "node",
    // Live-database test files share one database, and the local `prisma dev` server (PGlite)
    // can't serve two concurrent connections ("bind message supplies N parameters..."), so run
    // test files one at a time. The suite is small enough that this costs a couple of seconds.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
