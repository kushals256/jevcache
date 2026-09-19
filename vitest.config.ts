import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: { NODE_OPTIONS: "--experimental-sqlite" },
  },
});
