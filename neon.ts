import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    buckets: {
      apks: { access: "public_read" },
    },
  },
});
