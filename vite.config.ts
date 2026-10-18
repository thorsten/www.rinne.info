import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { contentPlugin } from "./plugins/content.ts";
import { htaccessPlugin } from "./plugins/htaccess.ts";

export default defineConfig({
  plugins: [tailwindcss(), contentPlugin(), htaccessPlugin()],
  publicDir: "static",
  build: {
    outDir: "public",
    emptyOutDir: true,
    // keep fonts as files so the CSP needs no data: in font-src and they stay cacheable
    assetsInlineLimit: 0,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        datenschutz: resolve(import.meta.dirname, "datenschutzerklaerung.html"),
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 9090,
    open: true,
  },
});
