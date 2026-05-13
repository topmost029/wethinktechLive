// Vercel-ready config: keeps the Lovable preset for dev/preview but disables
// the Cloudflare build plugin so production builds produce a standard Vite SSR
// bundle that Vercel's Node runtime can consume via /api/index.ts.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
});
