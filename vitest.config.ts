import path from "node:path";

import { defineConfig } from "vitest/config";

// Load .env so live-database tests find DATABASE_URL (the same way prisma.config.ts does).
import "dotenv/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
