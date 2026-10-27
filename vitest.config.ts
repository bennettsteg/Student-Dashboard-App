import path from "node:path";

import { defineConfig } from "vitest/config";

// Load .env so live-database tests find DATABASE_URL (the same way prisma.config.ts does).
import "dotenv/config";

export default defineConfig({
  test: {
    environment: "node",
    // Live-database test files share one database; `prisma dev`'s local server (PGlite)
    // also can't take concurrent connections, so run files one at a time.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
