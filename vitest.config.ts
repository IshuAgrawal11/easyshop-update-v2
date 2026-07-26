import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    env: {
      JWT_SECRET: "test-only-secret-do-not-use-in-prod",
      MONGODB_URI: "mongodb://localhost:27017/easyshop-test",
    },
  },
});
