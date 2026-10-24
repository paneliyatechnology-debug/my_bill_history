import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 20000,
    env: {
      SKIP_EMAIL_OTP: "true",
    },
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
